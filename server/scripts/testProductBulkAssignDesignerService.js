const assert = require('assert');
const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildBulkAssignDesignerPlan,
} = require('../services/productBulkLifecycleService');

function testBuildsBulkAssignPlan() {
  const now = new Date('2026-07-07T15:00:00Z');
  const actor = { id: 1, role: 'admin', name: 'Admin' };
  const designer = { id: 5, role: 'designer', name: 'Designer', isActive: true };
  const startedAt = new Date('2026-07-07T10:00:00Z');

  const plan = buildBulkAssignDesignerPlan({
    actor,
    designer,
    productIds: [101, 102],
    products: [
      { id: 101, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
      {
        id: 102,
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
        lifecycleStartedAt: startedAt,
      },
    ],
    now,
  });

  assert.deepStrictEqual(plan.productIds, [101, 102]);
  assert.deepStrictEqual(plan.updates, [
    {
      productId: 101,
      update: {
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
        lifecycleStartedAt: now,
        lifecycleCompletedAt: null,
        designerId: 5,
        assignedToUserId: 5,
      },
    },
    {
      productId: 102,
      update: {
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
        lifecycleCompletedAt: null,
        designerId: 5,
        assignedToUserId: 5,
      },
    },
  ]);
  assert.deepStrictEqual(plan.historyEntries, [
    {
      productId: 101,
      actorId: 1,
      actionType: 'designer_assigned',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      message: 'Designer assigned in bulk',
      metadata: { designerId: 5, designerName: 'Designer', bulk: true },
      createdAt: now,
    },
    {
      productId: 102,
      actorId: 1,
      actionType: 'designer_assigned',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      message: 'Designer assigned in bulk',
      metadata: { designerId: 5, designerName: 'Designer', bulk: true },
      createdAt: now,
    },
  ]);
}

function testRejectsInvalidInput() {
  assert.throws(
    () =>
      buildBulkAssignDesignerPlan({
        actor: { id: 1, role: 'admin' },
        designer: { id: 5, role: 'designer', isActive: true },
        productIds: [],
        products: [],
      }),
    /productIds must contain at least one product/i
  );

  assert.throws(
    () =>
      buildBulkAssignDesignerPlan({
        actor: { id: 1, role: 'admin' },
        designer: { id: 5, role: 'operator', isActive: true },
        productIds: [101],
        products: [{ id: 101, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW }],
      }),
    /designer must be an active designer/i
  );

  assert.throws(
    () =>
      buildBulkAssignDesignerPlan({
        actor: { id: 1, role: 'admin' },
        designer: { id: 5, role: 'designer', isActive: true },
        productIds: [101, 102],
        products: [{ id: 101, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW }],
      }),
    /not all selected products were found/i
  );

  assert.throws(
    () =>
      buildBulkAssignDesignerPlan({
        actor: { id: 1, role: 'admin' },
        designer: { id: 5, role: 'designer', isActive: true },
        productIds: [101],
        products: [
          { id: 101, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE },
        ],
      }),
    /only products in "new" status can be assigned/i
  );
}

testBuildsBulkAssignPlan();
testRejectsInvalidInput();

console.log('Product bulk assign designer service test passed');
