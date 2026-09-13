const sequelize = require('../config/database');
const {
  Order,
  OrderItem,
  Product,
  Supplier,
  User,
  WarehouseReceipt,
  WarehouseReceiptItem,
  OrderStatusHistory,
  ProductLifecyclePurchase,
  ProductActionHistory,
  StockHistory,
} = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { getStockStatus } = require('./productController');
const { assertOrderHasSupplier } = require('../services/orderSupplierPolicyService');
const { canReceiveAtWarehouse } = require('../services/orderStatusPolicyService');
const { recalculateSupplierDebt } = require('./paymentController');
const {
  buildLifecycleReceiptUpdates,
  buildWarehouseReceiptPlan,
} = require('../services/warehouseReceiptService');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const { buildProductSearchFilter } = require('../services/productListQueryService');

/**
 * Получить список заявок, ожидающих приёмки
 * GET /api/warehouse/pending-receipts
 */
const getPendingReceipts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Обычная очередь склада сохраняет только заявки на этапе сбора.
    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        isActive: true,
        supplierId: { [Op.ne]: null },
        status: {
          [Op.in]: ['Забрана', 'В сборе'],
        },
      },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock'],
            },
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['expectedDeliveryDate', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения заявок для приёмки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заявок для приёмки',
      error: error.message,
    });
  }
};

/**
 * Провести приёмку заявки на складе
 * POST /api/warehouse/receive/:orderId
 */
const receiveOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Проверьте данные приёмки',
      errors: errors.array(),
    });
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const order = await Order.findOne({
      where: { id: req.params.orderId, isActive: true },
      transaction,
      lock: true,
    });
    if (!order) {
      const error = new Error('Заявка не найдена');
      error.statusCode = 404;
      throw error;
    }

    const existingReceipt = await WarehouseReceipt.findOne({
      where: { orderId: order.id },
      transaction,
      lock: true,
    });
    if (existingReceipt) {
      const error = new Error('Приёмка по этой заявке уже проведена');
      error.statusCode = 409;
      error.code = 'ORDER_ALREADY_RECEIVED';
      throw error;
    }

    assertOrderHasSupplier(order);
    if (!canReceiveAtWarehouse(order.status, req.user.role)) {
      const error = new Error(`Заявку в статусе «${order.status}» нельзя принять на склад`);
      error.statusCode = 409;
      error.code = 'WAREHOUSE_RECEIPT_NOT_ALLOWED';
      throw error;
    }

    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id },
      include: [{ model: Product, as: 'product', required: true }],
      transaction,
      order: [['id', 'ASC']],
    });
    const plan = buildWarehouseReceiptPlan({
      order: { ...order.get({ plain: true }), items: orderItems },
      items: req.body.items,
    });
    const now = new Date();
    const receipt = await WarehouseReceipt.create({
      orderId: order.id,
      receivedBy: req.user.id,
      receiptType: plan.hasDiscrepancy ? 'partial' : 'full',
      receivedAt: now,
      notes: req.body.notes || '',
    }, { transaction });

    const lifecyclePurchases = await ProductLifecyclePurchase.findAll({
      where: { orderItemId: { [Op.in]: plan.orderItemUpdates.map((item) => item.id) } },
      transaction,
      lock: true,
    });
    const lifecycleUpdates = buildLifecycleReceiptUpdates({
      lifecyclePurchases,
      receiptItems: plan.receiptItems,
      receiptId: receipt.id,
      receivedAt: now,
      receivedBy: req.user.id,
    });
    const lifecycleUpdateByOrderItemId = new Map(
      lifecycleUpdates.map((update) => [update.orderItemId, update])
    );
    const lifecyclePurchaseById = new Map(
      lifecyclePurchases.map((purchase) => [Number(purchase.id), purchase])
    );
    const orderItemsById = new Map(orderItems.map((item) => [Number(item.id), item]));

    for (const update of plan.orderItemUpdates) {
      const orderItem = orderItemsById.get(update.id);
      const receiptItem = plan.receiptItems.find((item) => item.orderItemId === update.id);
      const product = orderItem.product;
      const oldStock = Number(product.currentStock || 0);
      const lifecycleUpdate = product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.PURCHASE
        ? lifecycleUpdateByOrderItemId.get(update.id)
        : null;

      await orderItem.update({
        orderedQuantity: update.orderedQuantity,
        quantity: update.quantity,
        totalPrice: update.totalPrice,
      }, { transaction });
      await product.update({
        currentStock: oldStock + update.quantity,
        ...(lifecycleUpdate && product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.PURCHASE
          ? {
              lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
              lifecycleCompletedAt: null,
              assignedToUserId: null,
            }
          : {}),
      }, {
        transaction,
        hooks: false,
      });

      if (update.quantity > 0) {
        await StockHistory.create({
          productId: product.id,
          oldStock,
          newStock: oldStock + update.quantity,
          changeAmount: update.quantity,
          changeType: 'receipt',
          userId: req.user.id,
          orderId: order.id,
          reason: `Приёмка товара по заявке ${order.orderNumber}`,
          notes: receiptItem.notes
            || `Принято ${update.quantity} шт, заказано ${update.orderedQuantity} шт`,
        }, { transaction });
      }

      if (lifecycleUpdate) {
        const lifecyclePurchase = lifecyclePurchaseById.get(lifecycleUpdate.purchaseId);
        await lifecyclePurchase.update({
          receivedQuantity: lifecycleUpdate.receivedQuantity,
          warehouseReceiptId: lifecycleUpdate.warehouseReceiptId,
          arrivedAt: lifecycleUpdate.arrivedAt,
          arrivedBy: lifecycleUpdate.arrivedBy,
        }, { transaction });
        await ProductActionHistory.create({
          productId: product.id,
          actorId: req.user.id,
          actionType: 'warehouse_arrival_marked',
          fromStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
          toStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
          message: 'Product received from grouped supplier order',
          metadata: {
            orderId: order.id,
            warehouseReceiptId: receipt.id,
            expectedQuantity: update.orderedQuantity,
            receivedQuantity: lifecycleUpdate.receivedQuantity,
          },
          createdAt: now,
        }, { transaction });
      }
    }

    await WarehouseReceiptItem.bulkCreate(
      plan.receiptItems.map((item) => ({ receiptId: receipt.id, ...item })),
      { transaction }
    );

    const oldStatus = order.status;
    await order.update({
      status: 'Принята на складе',
      totalAmount: plan.totalAmount.toFixed(2),
      paymentStatus: plan.paymentStatus,
    }, { transaction });
    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus,
      newStatus: 'Принята на складе',
      changedBy: req.user.id,
      comment: plan.hasDiscrepancy
        ? `Принято с расхождениями. Итоговая сумма: ${plan.totalAmount.toFixed(2)} ₸. ${req.body.notes || ''}`.trim()
        : `Принято полностью. ${req.body.notes || ''}`.trim(),
      changedAt: now,
    }, { transaction });
    await recalculateSupplierDebt(order.supplierId, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const createdReceipt = await WarehouseReceipt.findByPk(receipt.id, {
      include: [
        { model: User, as: 'receiver', attributes: ['id', 'name', 'email'] },
        {
          model: WarehouseReceiptItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock'],
          }],
        },
        { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'status', 'totalAmount'] },
      ],
    });

    return res.json({
      success: true,
      message: plan.hasDiscrepancy
        ? 'Приёмка завершена. Заявка пересчитана по фактическому количеству.'
        : 'Приёмка завершена успешно.',
      data: { receipt: createdReceipt, hasDiscrepancy: plan.hasDiscrepancy },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    const status = error.statusCode || 500;
    if (status >= 500) console.error('Ошибка приёмки заявки:', error);
    return res.status(status).json({
      success: false,
      message: error.code === 'ORDER_RECEIPT_OVERPAYMENT'
        ? 'Фактическая сумма заявки меньше уже зарегистрированной оплаты. Сначала скорректируйте оплату.'
        : status >= 500
          ? 'Ошибка приёмки заявки'
          : error.message,
      code: error.code,
    });
  }
};

/**
 * Получить отчёт по текущим остаткам на складе
 * GET /api/warehouse/stock-report
 */
const getStockReport = async (req, res) => {
  try {
    const { categoryId, search, stockStatus, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    Object.assign(whereClause, buildProductSearchFilter(search, sequelize));

    // Фильтр по статусу остатка
    if (stockStatus) {
      switch (stockStatus) {
        case 'critical':
          whereClause.currentStock = 0;
          break;
        case 'low':
          whereClause.currentStock = {
            [Op.gt]: 0,
            [Op.lte]: sequelize.col('min_stock'),
          };
          break;
        case 'medium':
          whereClause.currentStock = {
            [Op.gt]: sequelize.col('min_stock'),
            [Op.lte]: sequelize.literal('min_stock * 2'),
          };
          break;
        case 'good':
          whereClause.currentStock = {
            [Op.gt]: sequelize.literal('min_stock * 2'),
          };
          break;
      }
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'internalName',
        'article',
        'currentStock',
        'minStock',
        'costPrice',
        'sellingPrice',
      ],
      limit: parseInt(limit),
      offset,
      order: [
        [sequelize.literal('CASE WHEN current_stock = 0 THEN 0 ELSE 1 END'), 'ASC'],
        ['currentStock', 'ASC'],
      ],
    });

    // Добавляем статус для каждого товара
    const productsWithStatus = products.map(product => {
      const productData = product.toJSON();
      productData.stockStatus = getStockStatus(product.currentStock, product.minStock);
      productData.deficit = Math.max(0, product.minStock - product.currentStock);
      productData.totalValue = (product.currentStock * parseFloat(product.costPrice)).toFixed(2);
      return productData;
    });

    // Общая статистика
    const totalValue = productsWithStatus.reduce(
      (sum, p) => sum + parseFloat(p.totalValue),
      0
    );

    res.json({
      success: true,
      data: {
        products: productsWithStatus,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
        summary: {
          totalProducts: count,
          totalValue: totalValue.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения отчёта по остаткам:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения отчёта по остаткам',
      error: error.message,
    });
  }
};

/**
 * Получить историю приёмок
 * GET /api/warehouse/receipts
 */
const getReceiptHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo, receiptType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (receiptType) {
      whereClause.receiptType = receiptType;
    }

    if (dateFrom || dateTo) {
      whereClause.receivedAt = {};
      if (dateFrom) {
        whereClause.receivedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.receivedAt[Op.lte] = new Date(dateTo);
      }
    }

    const { count, rows: receipts } = await WarehouseReceipt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'totalAmount'],
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name'],
        },
        {
          model: WarehouseReceiptItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'internalName', 'article'],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['receivedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения истории приёмок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории приёмок',
      error: error.message,
    });
  }
};

/**
 * Получить детальную информацию о приёмке
 * GET /api/warehouse/receipts/:id
 */
const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await WarehouseReceipt.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Supplier,
              as: 'supplier',
            },
          ],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: WarehouseReceiptItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
        },
      ],
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Приёмка не найдена',
      });
    }

    res.json({
      success: true,
      data: { receipt },
    });
  } catch (error) {
    console.error('Ошибка получения приёмки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения приёмки',
      error: error.message,
    });
  }
};

module.exports = {
  getPendingReceipts,
  receiveOrder,
  getStockReport,
  getReceiptHistory,
  getReceiptById,
};
