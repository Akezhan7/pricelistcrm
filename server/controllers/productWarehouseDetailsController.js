const { validationResult } = require('express-validator');
const {
  Product,
  ProductActionHistory,
  ProductWarehouseDetails,
  sequelize,
} = require('../models');
const {
  buildWarehouseDetailsUpdatePlan,
} = require('../services/productWarehouseDetailsService');

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error, context) {
  const status = error.status
    || (/required|must/i.test(error.message) ? 400 : 500);
  if (status === 500) console.error(context, error);
  return res.status(status).json({ success: false, message: error.message });
}

async function updateProductWarehouseDetails(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Check warehouse location data',
      errors: errors.array(),
    });
  }

  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!product) throw requestError(404, 'Product not found');

    const plan = buildWarehouseDetailsUpdatePlan({
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

    await ProductActionHistory.create(plan.history, { transaction });

    await transaction.commit();
    transactionFinished = true;

    return res.json({
      success: true,
      message: 'Warehouse location updated',
      data: { warehouseDetails },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    return sendError(res, error, 'Error updating product warehouse location:');
  }
}

module.exports = {
  updateProductWarehouseDetails,
};
