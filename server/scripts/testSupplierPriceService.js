const assert = require('assert');

const {
  pickMinimumSupplierPrice,
  planSupplierPriceSave,
} = require('../services/supplierPriceService');

function link(supplierPrice, overrides = {}) {
  return { supplierPrice, isAvailable: true, supplier: { isActive: true }, ...overrides };
}

function testPicksLowestPriceAmongAvailableActiveSuppliers() {
  assert.strictEqual(pickMinimumSupplierPrice([link(1300), link('900.50'), link(1100)]), 900.5);

  // Нет в наличии, поставщик отключён или цена не задана — не учитываются
  assert.strictEqual(pickMinimumSupplierPrice([
    link(500, { isAvailable: false }),
    link(400, { supplier: { isActive: false } }),
    link(0),
    link(null),
    link(1200),
  ]), 1200);
}

function testReturnsNullWhenThereIsNothingToCompute() {
  assert.strictEqual(pickMinimumSupplierPrice([]), null);
  assert.strictEqual(pickMinimumSupplierPrice([link(500, { isAvailable: false })]), null);
  assert.strictEqual(pickMinimumSupplierPrice(undefined), null);
}

function testPlansSupplierPriceSave() {
  assert.deepStrictEqual(
    planSupplierPriceSave({ existingLink: null, price: 1300 }),
    { action: 'create', previousPrice: null }
  );
  assert.deepStrictEqual(
    planSupplierPriceSave({ existingLink: { supplierPrice: '400.00' }, price: 500 }),
    { action: 'update', previousPrice: 400 }
  );
  assert.deepStrictEqual(
    planSupplierPriceSave({ existingLink: { supplierPrice: '500.00' }, price: 500 }),
    { action: 'none', previousPrice: 500 }
  );
  assert.throws(
    () => planSupplierPriceSave({ existingLink: null, price: -1 }),
    /price must be a non-negative number/
  );
  assert.throws(
    () => planSupplierPriceSave({ existingLink: null, price: 'abc' }),
    /price must be a non-negative number/
  );
}

testPicksLowestPriceAmongAvailableActiveSuppliers();
testReturnsNullWhenThereIsNothingToCompute();
testPlansSupplierPriceSave();

console.log('Supplier price service test passed');
