const assert = require('assert');
const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildDesignerTransferPlan,
} = require('../services/productDesignerTransferService');

const now = new Date('2026-10-07T10:00:00Z');
const targetDesigner = { id: 6, role: 'designer', name: 'Петрова', isActive: true };
const designerNames = { 5: 'Иванова' };

function product(overrides = {}) {
  return {
    id: 101,
    isActive: true,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
    designerId: 5,
    ...overrides,
  };
}

function buildPlan(overrides = {}) {
  return buildDesignerTransferPlan({
    actor: { id: 5, role: 'designer' },
    designer: targetDesigner,
    productIds: [101],
    products: [product()],
    designerNames,
    comment: '  Ухожу в отпуск  ',
    now,
    ...overrides,
  });
}

function testOwnerTransfersCardAndKeepsLifecycleStatus() {
  const plan = buildPlan();

  assert.deepStrictEqual(plan.productIds, [101]);
  assert.deepStrictEqual(plan.updates, [
    { productId: 101, update: { designerId: 6, assignedToUserId: 6 } },
  ]);
  assert.deepStrictEqual(plan.openRevisionProductIds, []);
  assert.deepStrictEqual(plan.historyEntries, [
    {
      productId: 101,
      actorId: 5,
      actionType: 'designer_transferred',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      message: 'Designer transferred',
      metadata: {
        fromDesignerId: 5,
        fromDesignerName: 'Иванова',
        toDesignerId: 6,
        toDesignerName: 'Петрова',
        comment: 'Ухожу в отпуск',
        bulk: false,
      },
      createdAt: now,
    },
  ]);
}

function testBulkTransferMarksRevisionCardsForRevisionRequestUpdate() {
  const plan = buildPlan({
    productIds: [101, 102, 103],
    products: [
      product({ id: 101, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED }),
      product({ id: 102, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVISION }),
      product({ id: 103 }),
    ],
    comment: undefined,
  });

  assert.deepStrictEqual(plan.productIds, [101, 102, 103]);
  assert.strictEqual(plan.updates.length, 3);
  assert.deepStrictEqual(plan.openRevisionProductIds, [102]);
  assert.strictEqual(plan.historyEntries[0].message, 'Designer transferred in bulk');
  assert.strictEqual(plan.historyEntries[0].metadata.bulk, true);
  assert.strictEqual(plan.historyEntries[0].metadata.comment, null);
}

function testAdminCanTransferAnyDesignerCard() {
  const plan = buildPlan({
    actor: { id: 1, role: 'admin' },
    products: [product({ designerId: 7 })],
    designerNames: { 7: 'Сидорова' },
  });

  assert.strictEqual(plan.historyEntries[0].actorId, 1);
  assert.strictEqual(plan.historyEntries[0].metadata.fromDesignerId, 7);
  assert.strictEqual(plan.historyEntries[0].metadata.fromDesignerName, 'Сидорова');
}

function testRejectsActorsWhoAreNotOwnerOrAdmin() {
  assert.throws(
    () => buildPlan({ actor: { id: 9, role: 'designer' } }),
    /not permitted/i
  );
  assert.throws(
    () => buildPlan({ actor: { id: 9, role: 'purchase_manager' } }),
    /not permitted/i
  );
  assert.throws(
    () => buildPlan({ actor: null }),
    /not permitted/i
  );
}

function testRejectsInvalidTargetsAndCards() {
  assert.throws(
    () => buildPlan({ designer: { id: 6, role: 'operator', isActive: true } }),
    /designer must be an active designer/i
  );
  assert.throws(
    () => buildPlan({ designer: { id: 6, role: 'designer', isActive: false } }),
    /designer must be an active designer/i
  );
  assert.throws(
    () => buildPlan({ productIds: [] , products: [] }),
    /productIds must contain at least one product/i
  );
  assert.throws(
    () => buildPlan({ productIds: [101, 102] }),
    /not all selected products were found/i
  );
  assert.throws(
    () => buildPlan({
      products: [product({ lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW })],
    }),
    /only products at designer stages can be transferred/i
  );
  assert.throws(
    () => buildPlan({
      actor: { id: 1, role: 'admin' },
      products: [product({ lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW, designerId: null })],
    }),
    /only products at designer stages can be transferred/i
  );
  assert.throws(
    () => buildPlan({ products: [product({ designerId: 6 })], actor: { id: 6, role: 'designer' } }),
    /already assigned to this designer/i
  );
  assert.throws(
    () => buildPlan({ products: [product({ isActive: false })] }),
    /only active products/i
  );
}

function testRejectsTooLongComment() {
  assert.throws(
    () => buildPlan({ comment: 'x'.repeat(1001) }),
    /comment must not exceed 1000 characters/i
  );
}

testOwnerTransfersCardAndKeepsLifecycleStatus();
testBulkTransferMarksRevisionCardsForRevisionRequestUpdate();
testAdminCanTransferAnyDesignerCard();
testRejectsActorsWhoAreNotOwnerOrAdmin();
testRejectsInvalidTargetsAndCards();
testRejectsTooLongComment();

console.log('Product designer transfer service test passed');
