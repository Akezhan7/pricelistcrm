const assert = require('assert');
const {
  normalizeOptionalSupplierId,
  assertSupplierAllowedForOrderType,
  assertOrderHasSupplier,
} = require('../services/orderSupplierPolicyService');

assert.strictEqual(normalizeOptionalSupplierId(undefined), null);
assert.strictEqual(normalizeOptionalSupplierId(null), null);
assert.strictEqual(normalizeOptionalSupplierId(''), null);
assert.strictEqual(normalizeOptionalSupplierId('12'), 12);
assert.throws(() => normalizeOptionalSupplierId('invalid'), /positive integer/);

assert.doesNotThrow(() => assertSupplierAllowedForOrderType('purchase', null));
assert.throws(
  () => assertSupplierAllowedForOrderType('return', null),
  /Supplier is required for return orders/
);

assert.doesNotThrow(() => assertOrderHasSupplier({ supplierId: 12 }));
assert.throws(
  () => assertOrderHasSupplier({ supplierId: null }),
  (error) => error.code === 'ORDER_SUPPLIER_REQUIRED'
);

console.log('Order supplier policy service test passed');
