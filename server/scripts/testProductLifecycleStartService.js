const assert = require('assert');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const { buildStartLifecyclePlan } = require('../services/productLifecycleStartService');

function makeLegacyProduct(overrides = {}) {
  return {
    id: 101,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleStartedAt: null,
    lifecycleCompletedAt: null,
    designerId: 44,
    assignedToUserId: 44,
    marketplaceManagerId: 55,
    ...overrides,
  };
}

function testStartAsNew() {
  const now = new Date('2026-07-13T10:00:00Z');
  const plan = buildStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    product: makeLegacyProduct(),
    payload: { targetStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
    now,
  });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
    lifecycleStartedAt: now,
    lifecycleCompletedAt: null,
    assignedToUserId: null,
    designerId: null,
    reviewedByUserId: null,
    kpiWeight: null,
  });
  assert.strictEqual(plan.historyEntry.actionType, 'lifecycle_started');
  assert.strictEqual(plan.historyEntry.fromStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.strictEqual(plan.historyEntry.toStatus, PRODUCT_LIFECYCLE_STATUSES.NEW);
}

function testStartWithDesignerRequiresDesignerId() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 1, role: 'admin' },
        product: makeLegacyProduct(),
        payload: { targetStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER },
      }),
    /designerId is required/
  );
}

function testStartWithDesigner() {
  const now = new Date('2026-07-13T11:00:00Z');
  const plan = buildStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    product: makeLegacyProduct(),
    payload: {
      targetStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      designerId: 25,
    },
    now,
  });

  assert.strictEqual(plan.productUpdate.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER);
  assert.strictEqual(plan.productUpdate.designerId, 25);
  assert.strictEqual(plan.productUpdate.assignedToUserId, 25);
}

function testRejectsActiveLifecycle() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 1, role: 'admin' },
        product: makeLegacyProduct({ lifecycleStartedAt: new Date('2026-07-10T10:00:00Z') }),
        payload: { targetStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
      }),
    /Only legacy catalog products/
  );
}

function testRejectsNonAdmin() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 2, role: 'marketplace_manager' },
        product: makeLegacyProduct(),
        payload: { targetStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
      }),
    /Only admin/
  );
}

testStartAsNew();
testStartWithDesignerRequiresDesignerId();
testStartWithDesigner();
testRejectsActiveLifecycle();
testRejectsNonAdmin();

console.log('Product lifecycle start service test passed');
