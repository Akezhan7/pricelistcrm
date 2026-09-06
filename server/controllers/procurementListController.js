const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Order,
  OrderItem,
  OrderStatusHistory,
  ProcurementList,
  ProcurementListItem,
  Product,
  ProductActionHistory,
  ProductLifecyclePurchase,
  Supplier,
  User,
  sequelize,
} = require('../models');
const {
  PROCUREMENT_LIST_STATUSES,
  buildProcurementListItemData,
  buildProcurementListItemUpdate,
  buildProcurementOrderGroups,
  buildSupplierRecommendation,
} = require('../services/procurementListService');
const { generateOrderNumber } = require('../services/orderNumberService');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');

const USER_ATTRIBUTES = ['id', 'name', 'email', 'role'];
const PRODUCT_ATTRIBUTES = [
  'id',
  'name',
  'internalName',
  'article',
  'image',
  'lifecycleStatus',
];

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: 'Проверьте данные позиции закупочного листа',
    errors: errors.array(),
  });
  return true;
}

function sendError(res, error, fallbackMessage) {
  const status = error.statusCode || error.status || 500;
  if (status >= 500) console.error(fallbackMessage, error);
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallbackMessage : error.message,
  });
}

function currentListInclude() {
  return [
    { model: User, as: 'creator', attributes: USER_ATTRIBUTES },
    {
      model: ProcurementListItem,
      as: 'items',
      separate: true,
      where: { orderItemId: null },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: PRODUCT_ATTRIBUTES,
          include: [{
            model: Supplier,
            as: 'suppliers',
            attributes: ['id', 'name', 'isActive'],
            through: { attributes: ['supplierPrice', 'isPreferred'] },
            where: { isActive: true },
            required: false,
          }],
        },
        {
          model: Supplier,
          as: 'selectedSupplier',
          attributes: ['id', 'name', 'isActive'],
        },
        { model: User, as: 'addedBy', attributes: USER_ATTRIBUTES },
      ],
    },
  ];
}

async function findCurrentList(transaction = null) {
  return ProcurementList.findOne({
    where: { status: PROCUREMENT_LIST_STATUSES.OPEN },
    include: currentListInclude(),
    transaction,
  });
}

async function loadCurrentListData() {
  const [list, suppliers] = await Promise.all([
    findCurrentList(),
    Supplier.findAll({
      where: { isActive: true },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    }),
  ]);

  if (!list || list.items.length === 0) {
    return { list, suppliers };
  }

  const productIds = list.items.map((item) => item.productId);
  const purchases = await OrderItem.findAll({
    where: { productId: { [Op.in]: productIds } },
    attributes: ['id', 'productId', 'priceAtPurchase'],
    include: [{
      model: Order,
      as: 'order',
      attributes: ['id', 'createdAt'],
      required: true,
      where: {
        type: 'purchase',
        isActive: true,
        supplierId: { [Op.ne]: null },
        status: { [Op.in]: ['Принята на складе', 'Закрыта'] },
      },
      include: [{
        model: Supplier,
        as: 'supplier',
        attributes: ['id', 'name', 'isActive'],
        required: true,
        where: { isActive: true },
      }],
    }],
    order: [
      [{ model: Order, as: 'order' }, 'createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  const lastPurchaseByProduct = new Map();
  purchases.forEach((purchase) => {
    if (lastPurchaseByProduct.has(purchase.productId)) return;
    lastPurchaseByProduct.set(purchase.productId, {
      supplier: purchase.order.supplier,
      priceAtPurchase: purchase.priceAtPurchase,
      purchasedAt: purchase.order.createdAt,
    });
  });

  const serializedList = list.toJSON();
  serializedList.items = serializedList.items.map((item) => ({
    ...item,
    supplierRecommendation: buildSupplierRecommendation({
      linkedSuppliers: item.product?.suppliers || [],
      lastPurchase: lastPurchaseByProduct.get(item.productId) || null,
    }),
  }));

  return { list: serializedList, suppliers };
}

async function getOrCreateCurrentList(actorId, transaction) {
  const [list] = await ProcurementList.findOrCreate({
    where: { status: PROCUREMENT_LIST_STATUSES.OPEN },
    defaults: { createdByUserId: actorId },
    transaction,
  });
  return list;
}

async function getSupplierRecommendationForProduct(product, transaction) {
  const lastPurchase = await OrderItem.findOne({
    where: { productId: product.id },
    attributes: ['id', 'priceAtPurchase'],
    include: [{
      model: Order,
      as: 'order',
      attributes: ['id', 'createdAt'],
      required: true,
      where: {
        type: 'purchase',
        isActive: true,
        supplierId: { [Op.ne]: null },
        status: { [Op.in]: ['Принята на складе', 'Закрыта'] },
      },
      include: [{
        model: Supplier,
        as: 'supplier',
        attributes: ['id', 'name', 'isActive'],
        required: true,
        where: { isActive: true },
      }],
    }],
    order: [
      [{ model: Order, as: 'order' }, 'createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    transaction,
  });

  return buildSupplierRecommendation({
    linkedSuppliers: product.suppliers || [],
    lastPurchase: lastPurchase
      ? {
          supplier: lastPurchase.order.supplier,
          priceAtPurchase: lastPurchase.priceAtPurchase,
          purchasedAt: lastPurchase.order.createdAt,
        }
      : null,
  });
}

async function getCurrentList(req, res) {
  try {
    return res.json({ success: true, data: await loadCurrentListData() });
  } catch (error) {
    return sendError(res, error, 'Не удалось загрузить закупочный лист');
  }
}

async function addCurrentListItem(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    await sequelize.transaction(async (transaction) => {
      const product = await Product.findOne({
        where: { id: req.body.productId, isActive: true },
        attributes: PRODUCT_ATTRIBUTES,
        include: [{
          model: Supplier,
          as: 'suppliers',
          attributes: ['id', 'name', 'isActive'],
          through: { attributes: ['supplierPrice', 'isPreferred'] },
          where: { isActive: true },
          required: false,
        }],
        transaction,
      });
      if (!product) {
        const error = new Error('Товар не найден или деактивирован');
        error.statusCode = 404;
        throw error;
      }

      if (req.body.selectedSupplierId) {
        const supplier = await Supplier.findOne({
          where: { id: req.body.selectedSupplierId, isActive: true },
          attributes: ['id'],
          transaction,
        });
        if (!supplier) {
          const error = new Error('Поставщик не найден или деактивирован');
          error.statusCode = 400;
          throw error;
        }
      }

      const list = await getOrCreateCurrentList(req.user.id, transaction);
      const supplierRecommendation = await getSupplierRecommendationForProduct(product, transaction);
      const itemData = buildProcurementListItemData({
        listId: list.id,
        productId: product.id,
        actorId: req.user.id,
        input: req.body,
        supplierRecommendation,
      });
      const existingItem = await ProcurementListItem.findOne({
        where: {
          procurementListId: list.id,
          productId: product.id,
        },
        transaction,
        lock: true,
      });

      if (existingItem) {
        if (existingItem.orderItemId) {
          const error = new Error('Этот товар уже оформлен из текущего закупочного листа');
          error.statusCode = 409;
          throw error;
        }
        const updateInput = existingItem.selectedSupplierId
          ? req.body
          : {
              ...req.body,
              selectedSupplierId: supplierRecommendation.supplier?.id || null,
              purchasePrice: supplierRecommendation.purchasePrice,
            };
        await existingItem.update(buildProcurementListItemUpdate(updateInput), { transaction });
      } else {
        await ProcurementListItem.create(itemData, { transaction });
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Товар добавлен в закупочный лист',
      data: await loadCurrentListData(),
    });
  } catch (error) {
    return sendError(res, error, 'Не удалось добавить товар в закупочный лист');
  }
}

async function updateCurrentListItem(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const update = buildProcurementListItemUpdate(req.body);
    const updated = await sequelize.transaction(async (transaction) => {
      if (update.selectedSupplierId) {
        const supplier = await Supplier.findOne({
          where: { id: update.selectedSupplierId, isActive: true },
          attributes: ['id'],
          transaction,
        });
        if (!supplier) {
          const error = new Error('Поставщик не найден или деактивирован');
          error.statusCode = 400;
          throw error;
        }
      }

      const list = await ProcurementList.findOne({
        where: { status: PROCUREMENT_LIST_STATUSES.OPEN },
        transaction,
        lock: true,
      });
      if (!list) return false;

      const item = await ProcurementListItem.findOne({
        where: {
          id: req.params.itemId,
          procurementListId: list.id,
          orderItemId: null,
        },
        transaction,
        lock: true,
      });
      if (!item) return false;

      const effectiveSupplierId = update.selectedSupplierId === undefined
        ? item.selectedSupplierId
        : update.selectedSupplierId;
      if (
        update.purchasePrice !== null
        && update.purchasePrice !== undefined
        && !effectiveSupplierId
      ) {
        const error = new Error('Сначала выберите поставщика');
        error.statusCode = 400;
        throw error;
      }

      await item.update(update, { transaction });
      return true;
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Позиция открытого закупочного листа не найдена',
      });
    }

    return res.json({
      success: true,
      message: 'Позиция закупочного листа обновлена',
      data: await loadCurrentListData(),
    });
  } catch (error) {
    return sendError(res, error, 'Не удалось обновить позицию закупочного листа');
  }
}

async function deleteCurrentListItem(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const deleted = await sequelize.transaction(async (transaction) => {
      const list = await ProcurementList.findOne({
        where: { status: PROCUREMENT_LIST_STATUSES.OPEN },
        transaction,
        lock: true,
      });
      if (!list) return false;

      const count = await ProcurementListItem.destroy({
        where: {
          id: req.params.itemId,
          procurementListId: list.id,
          orderItemId: null,
        },
        transaction,
      });
      return count > 0;
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Позиция открытого закупочного листа не найдена',
      });
    }

    return res.json({
      success: true,
      message: 'Позиция удалена из закупочного листа',
      data: await loadCurrentListData(),
    });
  } catch (error) {
    return sendError(res, error, 'Не удалось удалить позицию закупочного листа');
  }
}

async function createOrdersFromCurrentList(req, res) {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const list = await ProcurementList.findOne({
      where: { status: PROCUREMENT_LIST_STATUSES.OPEN },
      transaction,
      lock: true,
    });
    if (!list) {
      const error = new Error('Открытый закупочный лист не найден');
      error.statusCode = 404;
      throw error;
    }

    const items = await ProcurementListItem.findAll({
      where: {
        procurementListId: list.id,
        orderItemId: null,
      },
      order: [['id', 'ASC']],
      transaction,
      lock: true,
    });
    const plan = buildProcurementOrderGroups({ items, actor: req.user });
    if (plan.groups.length === 0) {
      const error = new Error(
        'Нет готовых групп: выберите поставщика и укажите цену закупа'
      );
      error.statusCode = 400;
      throw error;
    }

    const supplierIds = plan.groups.map((group) => group.supplierId);
    const productIds = plan.groups.flatMap((group) => (
      group.items.map((item) => item.productId)
    ));
    const [suppliers, products, lifecyclePurchases] = await Promise.all([
      Supplier.findAll({
        where: { id: { [Op.in]: supplierIds }, isActive: true },
        attributes: ['id', 'name'],
        transaction,
      }),
      Product.findAll({
        where: { id: { [Op.in]: productIds }, isActive: true },
        attributes: ['id', 'lifecycleStatus'],
        transaction,
        lock: true,
      }),
      ProductLifecyclePurchase.findAll({
        where: { productId: { [Op.in]: productIds } },
        attributes: ['id', 'productId'],
        transaction,
        lock: true,
      }),
    ]);

    if (suppliers.length !== supplierIds.length) {
      const error = new Error('Один из выбранных поставщиков деактивирован');
      error.statusCode = 400;
      throw error;
    }
    if (products.length !== productIds.length) {
      const error = new Error('Один из товаров не найден или деактивирован');
      error.statusCode = 400;
      throw error;
    }

    const suppliersById = new Map(
      suppliers.map((supplier) => [Number(supplier.id), supplier])
    );
    const productsById = new Map(
      products.map((product) => [Number(product.id), product])
    );
    const lifecyclePurchaseByProductId = new Map(
      lifecyclePurchases.map((purchase) => [Number(purchase.productId), purchase])
    );
    const createdOrders = [];
    const now = new Date();

    for (const group of plan.groups) {
      const orderNumber = await generateOrderNumber({ transaction, date: now });
      const order = await Order.create({
        orderNumber,
        supplierId: group.supplierId,
        type: 'purchase',
        settlementType: 'standard',
        expectedDeliveryDate: null,
        deliveryLocation: 'Точка Байсад',
        totalAmount: group.totalAmount.toFixed(2),
        paidAmount: 0,
        status: 'Создана',
        paymentStatus: 'Не оплачено',
        notes: 'Создано из закупочного листа №' + list.id,
        createdBy: req.user.id,
        isActive: true,
      }, { transaction });

      await OrderStatusHistory.create({
        orderId: order.id,
        oldStatus: null,
        newStatus: 'Создана',
        changedBy: req.user.id,
        comment: 'Заявка создана из закупочного листа',
        changedAt: now,
      }, { transaction });

      for (const plannedItem of group.items) {
        const orderItem = await OrderItem.create({
          orderId: order.id,
          productId: plannedItem.productId,
          productVariationId: null,
          quantity: plannedItem.quantity,
          priceAtPurchase: plannedItem.purchasePrice,
          totalPrice: (
            plannedItem.quantity * plannedItem.purchasePrice
          ).toFixed(2),
          notes: plannedItem.notes,
        }, { transaction });

        const [updatedCount] = await ProcurementListItem.update(
          { orderItemId: orderItem.id },
          {
            where: {
              id: plannedItem.procurementListItemId,
              procurementListId: list.id,
              orderItemId: null,
            },
            transaction,
          }
        );
        if (updatedCount !== 1) {
          const error = new Error('Закупочный лист был изменён во время оформления');
          error.statusCode = 409;
          throw error;
        }

        const product = productsById.get(plannedItem.productId);
        if (
          product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.PURCHASE
          && !lifecyclePurchaseByProductId.has(plannedItem.productId)
        ) {
          const lifecyclePurchase = await ProductLifecyclePurchase.create({
            productId: plannedItem.productId,
            supplierId: group.supplierId,
            orderId: order.id,
            orderItemId: orderItem.id,
            quantity: plannedItem.quantity,
            purchasePrice: plannedItem.purchasePrice,
            purchasedAt: now,
            purchasedBy: req.user.id,
            notes: plannedItem.notes,
          }, { transaction });
          lifecyclePurchaseByProductId.set(plannedItem.productId, lifecyclePurchase);

          await ProductActionHistory.create({
            productId: plannedItem.productId,
            actorId: req.user.id,
            actionType: 'purchase_marked',
            fromStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
            toStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
            message: 'Initial product purchase marked from procurement list',
            metadata: {
              supplierId: group.supplierId,
              quantity: plannedItem.quantity,
              purchasePrice: plannedItem.purchasePrice,
              orderNumber,
              procurementListId: list.id,
            },
            createdAt: now,
          }, { transaction });
        }
      }

      const supplier = suppliersById.get(group.supplierId);
      createdOrders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        supplier: { id: supplier.id, name: supplier.name },
        itemCount: group.items.length,
      });
    }

    const remainingItems = await ProcurementListItem.count({
      where: { procurementListId: list.id, orderItemId: null },
      transaction,
    });
    if (remainingItems === 0) {
      await list.update({
        status: PROCUREMENT_LIST_STATUSES.PROCESSED,
        processedAt: now,
      }, { transaction });
    }

    await transaction.commit();
    transactionFinished = true;

    return res.status(201).json({
      success: true,
      message: 'Заявки поставщикам созданы',
      data: {
        ...await loadCurrentListData(),
        orders: createdOrders,
        blocked: plan.blocked,
      },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Не удалось создать заявки из закупочного листа');
  }
}

module.exports = {
  addCurrentListItem,
  createOrdersFromCurrentList,
  deleteCurrentListItem,
  getCurrentList,
  updateCurrentListItem,
};
