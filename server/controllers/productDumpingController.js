const { validationResult } = require('express-validator');
const {
  Product,
  ProductActionHistory,
  ProductDumping,
  User,
  sequelize,
} = require('../models');
const {
  buildDumpingConnectPlan,
  buildDumpingUpdatePlan,
} = require('../services/productDumpingService');

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error, context) {
  const status = error.status || error.statusCode || 500;
  if (status === 500) console.error(context, error);
  return res.status(status).json({ success: false, message: error.message });
}

function validationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;

  return res.status(400).json({
    success: false,
    message: 'Проверьте параметры демпинга',
    errors: errors.array(),
  });
}

async function getProductDumping(req, res) {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, isActive: true } });
    if (!product) throw requestError(404, 'Товар не найден');

    const dumping = await ProductDumping.findOne({
      where: { productId: product.id },
      include: [{ model: User, as: 'connector', attributes: ['id', 'name'], required: false }],
    });
    return res.json({ success: true, data: { dumping } });
  } catch (error) {
    return sendError(res, error, 'Error loading product dumping:');
  }
}

async function saveProductDumping(req, res) {
  if (validationErrorResponse(req, res)) return;

  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Товар не найден');

    const dumping = await ProductDumping.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    const plan = buildDumpingUpdatePlan({
      product,
      dumping,
      actor: req.user,
      payload: req.body,
      now: new Date(),
    });

    const saved = dumping
      ? await dumping.update(plan.dumpingUpdate, { transaction })
      : await ProductDumping.create({ productId: product.id, ...plan.dumpingUpdate }, { transaction });
    if (plan.history) await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: plan.history ? 'Параметры демпинга сохранены' : 'Изменений нет',
      data: { dumping: saved },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error saving product dumping:');
  }
}

async function connectProductDumping(req, res) {
  if (validationErrorResponse(req, res)) return;

  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Товар не найден');

    const dumping = await ProductDumping.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    const plan = buildDumpingConnectPlan({
      product,
      dumping,
      actor: req.user,
      payload: req.body,
      now: new Date(),
    });

    const saved = dumping
      ? await dumping.update(plan.dumpingUpdate, { transaction })
      : await ProductDumping.create({ productId: product.id, ...plan.dumpingUpdate }, { transaction });
    if (plan.productUpdate) await product.update(plan.productUpdate, { transaction });
    await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: 'Демпинг подключён',
      data: { dumping: saved, product },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error connecting product dumping:');
  }
}

module.exports = {
  connectProductDumping,
  getProductDumping,
  saveProductDumping,
};
