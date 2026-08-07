function normalizeOptionalSupplierId(value) {
  if (value === undefined || value === null || value === '') return null;

  const supplierId = Number(value);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    throw new Error('supplierId must be a positive integer');
  }

  return supplierId;
}

function assertSupplierAllowedForOrderType(orderType, supplierId) {
  if (orderType === 'return' && !supplierId) {
    const error = new Error('Supplier is required for return orders');
    error.code = 'ORDER_SUPPLIER_REQUIRED';
    throw error;
  }
}

function assertOrderHasSupplier(order) {
  if (order?.supplierId) return;

  const error = new Error('Assign a supplier before continuing with this order');
  error.code = 'ORDER_SUPPLIER_REQUIRED';
  error.statusCode = 409;
  throw error;
}

module.exports = {
  normalizeOptionalSupplierId,
  assertSupplierAllowedForOrderType,
  assertOrderHasSupplier,
};
