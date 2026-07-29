const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildWarehouseDetailsUpdatePlan,
} = require('../services/productWarehouseDetailsService');

function testBuildsLocationUpdateWithoutLifecycleTransition() {
  const now = new Date('2026-07-29T08:00:00Z');
  const plan = buildWarehouseDetailsUpdatePlan({
    product: {
      id: 42,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    },
    actor: { id: 1, role: 'admin' },
    payload: {
      sector: ' Main office ',
      shelf: ' A-04 ',
      cell: ' 17 ',
      notes: ' Top shelf ',
    },
    now,
  });

  assert.deepStrictEqual(plan.warehouseDetails, {
    productId: 42,
    sector: 'Main office',
    shelf: 'A-04',
    cell: '17',
    weight: null,
    length: null,
    width: null,
    height: null,
    notes: 'Top shelf',
    updatedBy: 1,
  });
  assert.strictEqual(plan.productUpdate, null);
  assert.strictEqual(plan.history.actionType, 'warehouse_location_updated');
  assert.strictEqual(plan.history.fromStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
  assert.strictEqual(plan.history.toStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
}

function testRejectsInvalidOptionalDimensions() {
  assert.throws(
    () => buildWarehouseDetailsUpdatePlan({
      product: {
        id: 42,
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
      },
      actor: { id: 1, role: 'admin' },
      payload: {
        sector: 'Main',
        shelf: 'A',
        cell: '17',
        weight: '-1',
      },
    }),
    /weight must be a non-negative number/i
  );
}

testBuildsLocationUpdateWithoutLifecycleTransition();
testRejectsInvalidOptionalDimensions();

console.log('Product warehouse details service test passed');
