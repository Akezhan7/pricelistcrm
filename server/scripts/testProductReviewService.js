const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  PRODUCT_REVISION_STATUSES,
  buildApproveReviewPlan,
  buildRequestRevisionPlan,
  buildResubmitRevisionPlan,
  buildSubmitReviewPlan,
} = require('../services/productReviewService');

const admin = { id: 1, role: 'admin' };
const designer = { id: 25, role: 'designer' };

function testSubmitReviewPlan() {
  const now = new Date('2026-07-08T08:00:00Z');
  const product = {
    id: 101,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    designerId: designer.id,
  };

  const plan = buildSubmitReviewPlan({ actor: designer, product, now });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    lifecycleCompletedAt: null,
  });
  assert.deepStrictEqual(plan.historyEntry, {
    productId: product.id,
    actorId: designer.id,
    actionType: 'submitted_for_review',
    fromStatus: PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    toStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    message: 'Product submitted for review',
    metadata: null,
    createdAt: now,
  });
}

function testApproveReviewPlan() {
  const now = new Date('2026-07-08T09:00:00Z');
  const product = {
    id: 102,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    assignedToUserId: designer.id,
  };

  const plan = buildApproveReviewPlan({ actor: admin, product, now });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    lifecycleCompletedAt: null,
    reviewedByUserId: admin.id,
    assignedToUserId: null,
  });
  assert.strictEqual(plan.historyEntry.actionType, 'approved');
  assert.strictEqual(plan.historyEntry.fromStatus, PRODUCT_LIFECYCLE_STATUSES.REVIEW);
  assert.strictEqual(plan.historyEntry.toStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
}

function testRequestRevisionRequiresComment() {
  assert.throws(
    () =>
      buildRequestRevisionPlan({
        actor: admin,
        product: {
          id: 103,
          lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
          designerId: designer.id,
        },
        comment: '   ',
      }),
    /comment is required/i
  );
}

function testRequestRevisionPlan() {
  const now = new Date('2026-07-08T10:00:00Z');
  const product = {
    id: 104,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    designerId: designer.id,
    assignedToUserId: null,
  };

  const plan = buildRequestRevisionPlan({
    actor: admin,
    product,
    comment: 'Need clearer front photo',
    now,
  });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVISION,
    lifecycleCompletedAt: null,
    assignedToUserId: designer.id,
  });
  assert.deepStrictEqual(plan.revisionRequestData, {
    productId: product.id,
    requestedBy: admin.id,
    assignedDesignerId: designer.id,
    comment: 'Need clearer front photo',
    status: PRODUCT_REVISION_STATUSES.OPEN,
  });
  assert.strictEqual(plan.historyEntry.actionType, 'revision_requested');
  assert.strictEqual(plan.historyEntry.metadata.comment, 'Need clearer front photo');
}

function testResubmitRevisionPlan() {
  const now = new Date('2026-07-08T11:00:00Z');
  const product = {
    id: 105,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVISION,
    designerId: designer.id,
  };
  const openRevisionRequest = {
    id: 77,
    status: PRODUCT_REVISION_STATUSES.OPEN,
  };

  const plan = buildResubmitRevisionPlan({
    actor: designer,
    product,
    openRevisionRequest,
    now,
  });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    lifecycleCompletedAt: null,
  });
  assert.deepStrictEqual(plan.revisionUpdate, {
    status: PRODUCT_REVISION_STATUSES.RESOLVED,
    resolvedAt: now,
  });
  assert.strictEqual(plan.historyEntry.actionType, 'revision_resubmitted');
  assert.strictEqual(plan.historyEntry.metadata.revisionRequestId, openRevisionRequest.id);
}

testSubmitReviewPlan();
testApproveReviewPlan();
testRequestRevisionRequiresComment();
testRequestRevisionPlan();
testResubmitRevisionPlan();

console.log('Product review service test passed');
