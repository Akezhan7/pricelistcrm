const { validationResult } = require('express-validator');
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
  StockHistory,
  Supplier,
  WarehouseReceipt,
  WarehouseReceiptItem,
  sequelize,
} = require('../models');
const { generateOrderNumber } = require('../services/orderNumberService');
const {
  buildLifecycleArrivalPlan,
  buildLifecyclePurchasePlan,
  buildWarehouseCompletionPlan,
} = require('../services/productLifecyclePurchaseService');

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error, context) {
  const status = error.status || (/required|must|not permitted|not allowed/i.test(error.message) ? 400 : 500);
  if (status === 500) console.error(context, error);
  return res.status(status).json({ success: false, message: error.message });
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

    return res.json({ success: true, data: { purchase, warehouseDetails } });
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

async function markProductArrived(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Проверьте данные приемки', errors: errors.array() });
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

    const purchase = await ProductLifecyclePurchase.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    if (!purchase) throw requestError(400, 'Сначала оформите первичный закуп товара');
    if (purchase.arrivedAt) throw requestError(409, 'Поступление этого товара уже подтверждено');

    const order = await Order.findOne({
      where: { id: purchase.orderId, isActive: true },
      transaction,
      lock: true,
    });
    if (!order) throw requestError(409, 'Связанная заявка закупа не найдена');

    const now = new Date();
    const plan = buildLifecycleArrivalPlan({
      product,
      lifecyclePurchase: purchase,
      actor: req.user,
      payload: req.body,
      now,
    });

    const receipt = await WarehouseReceipt.create(plan.receipt, { transaction });
    await WarehouseReceiptItem.create({ ...plan.receiptItem, receiptId: receipt.id }, { transaction });
    await StockHistory.create({
      productId: product.id,
      oldStock: Number(product.currentStock || 0),
      newStock: plan.productUpdate.currentStock,
      changeAmount: plan.receiptItem.receivedQuantity,
      changeType: 'receipt',
      userId: req.user.id,
      orderId: order.id,
      reason: `Приемка первичной партии по заявке ${order.orderNumber}`,
      notes: plan.receiptItem.notes,
    }, { transaction });
    await product.update(plan.productUpdate, { transaction, hooks: false });
    await purchase.update({
      ...plan.purchaseUpdate,
      warehouseReceiptId: receipt.id,
    }, { transaction });

    const oldStatus = order.status;
    await order.update({ status: 'Принята на складе' }, { transaction });
    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus,
      newStatus: 'Принята на складе',
      changedBy: req.user.id,
      comment: plan.receipt.receiptType === 'partial'
        ? 'Первичная партия принята с расхождением'
        : 'Первичная партия принята полностью',
      changedAt: now,
    }, { transaction });
    await ProductActionHistory.create({
      ...plan.history,
      metadata: { ...plan.history.metadata, warehouseReceiptId: receipt.id },
    }, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: 'Поступление подтверждено, товар передан на складской этап',
      data: { purchase, receipt, product },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error marking product arrived:');
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
  markProductPurchased,
};
