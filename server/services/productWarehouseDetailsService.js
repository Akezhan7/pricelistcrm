const {
  PRODUCT_ACTION_TYPES,
} = require('../constants/productHistory');

function requiredText(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function optionalText(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function optionalNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
}

function buildWarehouseDetailsData({ productId, actor, payload = {} }) {
  return {
    productId: Number(productId),
    sector: requiredText(payload.sector, 'sector'),
    shelf: requiredText(payload.shelf, 'shelf'),
    cell: requiredText(payload.cell, 'cell'),
    weight: optionalNonNegativeNumber(payload.weight, 'weight'),
    length: optionalNonNegativeNumber(payload.length, 'length'),
    width: optionalNonNegativeNumber(payload.width, 'width'),
    height: optionalNonNegativeNumber(payload.height, 'height'),
    notes: optionalText(payload.notes),
    updatedBy: actor.id,
  };
}

function buildWarehouseDetailsUpdatePlan({ product, actor, payload = {}, now = new Date() }) {
  const warehouseDetails = buildWarehouseDetailsData({
    productId: product.id,
    actor,
    payload,
  });

  return {
    warehouseDetails,
    productUpdate: null,
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: PRODUCT_ACTION_TYPES.WAREHOUSE_LOCATION_UPDATED,
      fromStatus: product.lifecycleStatus || null,
      toStatus: product.lifecycleStatus || null,
      message: 'Warehouse location updated',
      metadata: {
        sector: warehouseDetails.sector,
        shelf: warehouseDetails.shelf,
        cell: warehouseDetails.cell,
      },
      createdAt: now,
    },
  };
}

module.exports = {
  buildWarehouseDetailsData,
  buildWarehouseDetailsUpdatePlan,
  optionalNonNegativeNumber,
};
