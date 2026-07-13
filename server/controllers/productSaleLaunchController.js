const { validationResult } = require('express-validator');
const {
  Product,
  ProductActionHistory,
  ProductLaunchFlags,
  ProductMarketplaceListing,
  sequelize,
} = require('../models');
const { MARKETPLACE_KEYS } = require('../services/productMarketplaceService');
const {
  buildSaleLaunchCompletionPlan,
  buildSaleLaunchUpdatePlan,
} = require('../services/productSaleLaunchService');

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error, context) {
  const status = error.status
    || (/required|must|not permitted|only be updated/i.test(error.message) ? 400 : 500);
  if (status === 500) console.error(context, error);
  return res.status(status).json({ success: false, message: error.message });
}

function validationErrorResponse(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;

  return res.status(400).json({
    success: false,
    message: 'Проверьте параметры запуска продаж',
    errors: errors.array(),
  });
}

async function getProductLaunchFlags(req, res) {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, isActive: true } });
    if (!product) throw requestError(404, 'Товар не найден');

    const launchFlags = await ProductLaunchFlags.findOne({ where: { productId: product.id } });
    return res.json({
      success: true,
      data: {
        launchFlags: launchFlags || {
          productId: product.id,
          internalAdvertisingStarted: false,
          externalAdvertisingStarted: false,
          reviewBonusEnabled: false,
          sellerBonusEnabled: false,
          notes: null,
          completedAt: product.lifecycleCompletedAt,
        },
      },
    });
  } catch (error) {
    return sendError(res, error, 'Error loading product launch flags:');
  }
}

async function completeProductSaleLaunch(req, res) {
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

    const [existingFlags, kaspiListing] = await Promise.all([
      ProductLaunchFlags.findOne({
        where: { productId: product.id },
        transaction,
        lock: true,
      }),
      ProductMarketplaceListing.findOne({
        where: { productId: product.id, marketplace: MARKETPLACE_KEYS.KASPI },
        transaction,
        lock: true,
      }),
    ]);
    if (product.lifecycleCompletedAt || existingFlags?.completedAt) {
      throw requestError(409, 'Запуск продаж уже завершен');
    }

    const plan = buildSaleLaunchCompletionPlan({
      product,
      kaspiListing,
      actor: req.user,
      payload: req.body,
      now: new Date(),
    });
    const launchFlags = existingFlags
      ? await existingFlags.update(plan.launchFlags, { transaction })
      : await ProductLaunchFlags.create(plan.launchFlags, { transaction });

    await product.update(plan.productUpdate, { transaction });
    await kaspiListing.update(plan.marketplaceListingUpdate, { transaction });
    await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: 'Запуск продаж завершен',
      data: { product, launchFlags, marketplaceListing: kaspiListing },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error completing product sale launch:');
  }
}

async function updateProductLaunchFlags(req, res) {
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

    const launchFlags = await ProductLaunchFlags.findOne({
      where: { productId: product.id },
      transaction,
      lock: true,
    });
    if (!launchFlags?.completedAt) {
      throw requestError(409, 'Сначала завершите запуск продаж');
    }

    const plan = buildSaleLaunchUpdatePlan({
      product,
      launchFlags,
      actor: req.user,
      payload: req.body,
      now: new Date(),
    });
    await launchFlags.update(plan.launchFlagsUpdate, { transaction });
    await product.update(plan.productUpdate, { transaction });
    if (plan.history) await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;
    return res.json({
      success: true,
      message: plan.history ? 'Параметры продаж обновлены' : 'Изменений нет',
      data: { launchFlags },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error updating product launch flags:');
  }
}

module.exports = {
  completeProductSaleLaunch,
  getProductLaunchFlags,
  updateProductLaunchFlags,
};
