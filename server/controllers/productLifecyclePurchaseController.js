const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Order,
  OrderItem,
  OrderStatusHistory,
  PriceHistory,
  Product,
  ProductActionHistory,
  ProductLifecyclePurchase,
  ProductSupplier,
  ProductWarehouseDetails,
  Supplier,
  WarehouseReceipt,
  WarehouseReceiptItem,
  sequelize,
} = require('../models');
const { generateOrderNumber } = require('../services/orderNumberService');
const {
  buildLifecycleArrivalReconciliationPlan,
  buildLifecyclePurchasePlan,
  buildWarehouseCompletionPlan,
} = require('../services/productLifecyclePurchaseService');
const {
  buildBulkLifecyclePurchasePlan,
} = require('../services/productLifecycleBulkPurchaseService');

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error, context) {
  const status = error.status
    || (/already purchased|already confirmed/i.test(error.message) ? 409 : null)
    || (/required|must|not permitted|not allowed|not ready|not linked|not loaded/i.test(error.message) ? 400 : 500);
  if (status === 500) console.error(context, error);
  return res.status(status).json({ success: false, message: error.message });
}

function buildArrivalReceiptItemWhere(productId, purchase) {
  const receiptLinks = [{ orderItemId: purchase.orderItemId }];
  if (purchase.warehouseReceiptId) {
    receiptLinks.push({ receiptId: purchase.warehouseReceiptId });
  }

  return {
    productId,
    receivedQuantity: { [Op.gt]: 0 },
    [Op.or]: receiptLinks,
  };
}

async function getLifecycleOperations(req, res) {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, isActive: true } });
    if (!product) throw requestError(404, 'Товар не найден');

    const [purchase, warehouseDetails] = await Promise.all([
      ProductLifecyclePurchase.findOne({
        where: { productId: product.id },
        include: [
          { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
          { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'status'] },
        ],
      }),
      ProductWarehouseDetails.findOne({ where: { productId: product.id } }),
    ]);

    let arrivalRecovery = null;
    if (purchase && !purchase.arrivedAt && product.lifecycleStatus === 'purchase') {
      const receiptItems = await WarehouseReceiptItem.findAll({
        where: buildArrivalReceiptItemWhere(product.id, purchase),
        include: [{ model: WarehouseReceipt, as: 'receipt', required: true }],
        order: [['id', 'DESC']],
      });

      if (receiptItems.length === 1) {
        const receiptItem = receiptItems[0];
        arrivalRecovery = {
          status: 'available',
          receiptId: receiptItem.receiptId,
          receivedQuantity: receiptItem.receivedQuantity,
          receivedAt: receiptItem.receipt.receivedAt,
        };
      } else if (receiptItems.length > 1) {
        arrivalRecovery = {
          status: 'ambiguous',
          message: 'Найдено несколько документов приёмки для одной позиции. Требуется проверка администратором.',
        };
      }
    }

    return res.json({ success: true, data: { purchase, warehouseDetails, arrivalRecovery } });
  } catch (error) {
    return sendError(res, error, 'Error loading lifecycle purchase operations:');
  }
}

async function markProductPurchased(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Проверьте данные закупа', errors: errors.array() });
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Товар не найден');

    const existingPurchase = await ProductLifecyclePurchase.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    if (existingPurchase) throw requestError(409, 'Первичный закуп этого товара уже оформлен');

    const supplier = await Supplier.findOne({
      where: { id: req.body.supplierId, isActive: true },
      transaction,
    });
    if (!supplier) throw requestError(400, 'Поставщик не найден');

    const productSupplier = await ProductSupplier.findOne({
      where: { productId: product.id, supplierId: supplier.id },
      transaction,
    });
    if (!productSupplier) throw requestError(400, 'Поставщик не привязан к этому товару');

    const orderNumber = await generateOrderNumber();
    const now = new Date();
    const plan = buildLifecyclePurchasePlan({
      product,
      actor: req.user,
      payload: req.body,
      orderNumber,
      now,
    });

    const order = await Order.create(plan.order, { transaction });
    const orderItem = await OrderItem.create({ ...plan.orderItem, orderId: order.id }, { transaction });
    const purchase = await ProductLifecyclePurchase.create({
      ...plan.purchase,
      orderId: order.id,
      orderItemId: orderItem.id,
    }, { transaction });

    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus: null,
      newStatus: 'Создана',
      changedBy: req.user.id,
      comment: 'Заявка создана при первичном запуске товара',
      changedAt: now,
    }, { transaction });
    await ProductActionHistory.create({
      ...plan.history,
      metadata: { ...plan.history.metadata, orderId: order.id, orderItemId: orderItem.id },
    }, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.status(201).json({
      success: true,
      message: 'Первичный закуп оформлен',
      data: { purchase, order },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error marking product purchased:');
  }
}

async function markProductsPurchasedBulk(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Проверьте данные закупа', errors: errors.array() });
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const productIds = [...new Set((req.body.items || []).map((item) => Number(item.productId)))];
    const supplierId = Number(req.body.supplierId);

    const supplier = await Supplier.findOne({
      where: { id: supplierId, isActive: true },
      transaction,
    });
    if (!supplier) throw requestError(400, 'Поставщик не найден');

    const [products, linkedRows, existingPurchases] = await Promise.all([
      Product.findAll({
        where: { id: productIds, isActive: true },
        transaction,
        lock: true,
      }),
      ProductSupplier.findAll({
        where: { productId: productIds, supplierId },
        transaction,
      }),
      ProductLifecyclePurchase.findAll({
        where: { productId: productIds },
        transaction,
        lock: true,
      }),
    ]);

    if (products.length !== productIds.length) {
      throw requestError(400, 'Один или несколько товаров не найдены');
    }

    const linkedRowsByProductId = new Map(linkedRows.map((row) => [Number(row.productId), row]));
    const purchasesByProductId = new Map(existingPurchases.map((purchase) => [Number(purchase.productId), purchase]));
    const productsForPlan = products.map((product) => {
      const plainProduct = product.toJSON ? product.toJSON() : product;
      const linkedRow = linkedRowsByProductId.get(Number(plainProduct.id));

      return {
        ...plainProduct,
        suppliers: linkedRow ? [{
          id: supplierId,
          name: supplier.name,
          ProductSupplier: {
            supplierPrice: linkedRow.supplierPrice,
            quantity: linkedRow.quantity,
            isAvailable: linkedRow.isAvailable,
            notes: linkedRow.notes,
          },
        }] : [],
        lifecyclePurchase: purchasesByProductId.get(Number(plainProduct.id)) || null,
      };
    });

    const orderNumber = await generateOrderNumber();
    const now = new Date();
    const plan = buildBulkLifecyclePurchasePlan({
      products: productsForPlan,
      actor: req.user,
      payload: req.body,
      orderNumber,
      now,
    });

    const order = await Order.create(plan.order, { transaction });
    const purchases = [];
    for (let index = 0; index < plan.orderItems.length; index += 1) {
      const orderItem = await OrderItem.create({
        ...plan.orderItems[index],
        orderId: order.id,
      }, { transaction });
      const purchase = await ProductLifecyclePurchase.create({
        ...plan.purchases[index],
        orderId: order.id,
        orderItemId: orderItem.id,
      }, { transaction });
      purchases.push(purchase);
      plan.histories[index].metadata = {
        ...plan.histories[index].metadata,
        orderId: order.id,
        orderItemId: orderItem.id,
      };
    }

    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus: null,
      newStatus: 'Создана',
      changedBy: req.user.id,
      comment: 'Заявка создана пакетным lifecycle-закупом',
      changedAt: now,
    }, { transaction });
    await ProductActionHistory.bulkCreate(plan.histories, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.status(201).json({
      success: true,
      message: 'Пакетный закуп оформлен',
      data: { purchases, order },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error marking products purchased in bulk:');
  }
}

async function markProductArrived(req, res) {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, isActive: true } });
    if (!product) throw requestError(404, 'Товар не найден');

    const purchase = await ProductLifecyclePurchase.findOne({
      where: { productId: product.id },
      include: [{ model: Order, as: 'order', attributes: ['id', 'orderNumber', 'status'] }],
    });
    if (!purchase) throw requestError(400, 'Сначала оформите первичный закуп товара');
    if (purchase.arrivedAt) throw requestError(409, 'Поступление этого товара уже подтверждено');
    return res.status(409).json({
      success: false,
      code: 'ORDER_RECEIPT_REQUIRED',
      message: 'Поступление проводится через приёмку всей связанной заявки',
      data: {
        orderId: purchase.orderId,
        orderItemId: purchase.orderItemId,
        receiptPath: `/warehouse/receipt?orderId=${purchase.orderId}&orderItemId=${purchase.orderItemId}`,
      },
    });
  } catch (error) {
    return sendError(res, error, 'Error marking product arrived:');
  }
}

async function reconcileProductArrival(req, res) {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Товар не найден');

    const purchase = await ProductLifecyclePurchase.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    if (!purchase) throw requestError(409, 'У товара нет связанного первичного закупа');
    if (purchase.arrivedAt) {
      await transaction.commit();
      transactionFinished = true;
      return res.json({ success: true, message: 'Связь с приёмкой уже восстановлена', data: { purchase, product } });
    }

    const receiptItems = await WarehouseReceiptItem.findAll({
      where: buildArrivalReceiptItemWhere(product.id, purchase),
      include: [{ model: WarehouseReceipt, as: 'receipt', required: true }],
      transaction,
      lock: true,
    });
    if (receiptItems.length === 0) {
      throw requestError(409, 'Для этой позиции нет подтверждённого поступления с количеством больше нуля');
    }
    if (receiptItems.length > 1) {
      throw requestError(409, 'Найдено несколько документов приёмки. Автоматическое восстановление небезопасно');
    }

    const receiptItem = receiptItems[0];
    const plan = buildLifecycleArrivalReconciliationPlan({
      product,
      lifecyclePurchase: purchase,
      receipt: receiptItem.receipt,
      receiptItem,
      actor: req.user,
      now: new Date(),
    });
    await product.update(plan.productUpdate, { transaction, hooks: false });
    await purchase.update(plan.purchaseUpdate, { transaction });
    await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: 'Этап склада восстановлен по существующему документу приёмки',
      data: { purchase, product },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error reconciling product arrival:');
  }
}

async function completeProductWarehouse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Проверьте складские данные', errors: errors.array() });
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Товар не найден');

    const plan = buildWarehouseCompletionPlan({
      product,
      actor: req.user,
      payload: req.body,
      now: new Date(),
    });
    const existingDetails = await ProductWarehouseDetails.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    const warehouseDetails = existingDetails
      ? await existingDetails.update(plan.warehouseDetails, { transaction })
      : await ProductWarehouseDetails.create(plan.warehouseDetails, { transaction });

    if (plan.priceHistory) {
      await PriceHistory.create(plan.priceHistory, { transaction });
    }
    await product.update(plan.productUpdate, { transaction });
    await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: 'Складской паспорт заполнен, товар переведен в продажу',
      data: { product, warehouseDetails },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error completing product warehouse passport:');
  }
}

module.exports = {
  completeProductWarehouse,
  getLifecycleOperations,
  markProductArrived,
  reconcileProductArrival,
  markProductPurchased,
  markProductsPurchasedBulk,
};
