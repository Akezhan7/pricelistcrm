const {
  PRODUCT_LIFECYCLE_ACTIONS,
} = require('../constants/productLifecycle');
const {
  createLifecycleActionUpdate,
} = require('./productLifecycleService');
const {
  buildApproveReviewKpiPlan,
} = require('./productDesignerKpiService');
const {
  LIFECYCLE_ROUTE_STAGES,
  buildLifecycleStageCompletionUpdate,
  withLifecycleRunMetadata,
} = require('./productLifecycleRouteService');

const PRODUCT_REVISION_STATUSES = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
});

const PRODUCT_REVISION_STATUS_VALUES = Object.freeze(Object.values(PRODUCT_REVISION_STATUSES));

function normalizeRequiredComment(comment) {
  const normalizedComment = String(comment || '').trim();

  if (!normalizedComment) {
    throw new Error('Revision comment is required');
  }

  return normalizedComment;
}

function buildHistoryEntry({
  product,
  actor,
  actionType,
  fromStatus,
  toStatus,
  message,
  metadata = null,
  now,
}) {
  return {
    productId: product.id,
    actorId: actor.id,
    actionType,
    fromStatus,
    toStatus,
    message,
    metadata,
    createdAt: now,
  };
}

function buildSubmitReviewPlan({ actor, product, now = new Date() }) {
  const fromStatus = product.lifecycleStatus;
  const productUpdate = createLifecycleActionUpdate({
    action: PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_REVIEW,
    actor,
    product,
    now,
  });

  return {
    productUpdate,
    historyEntry: buildHistoryEntry({
      product,
      actor,
      actionType: 'submitted_for_review',
      fromStatus,
      toStatus: productUpdate.lifecycleStatus,
      message: 'Product submitted for review',
      now,
    }),
  };
}

function buildApproveReviewPlan({ actor, product, kpiWeight, now = new Date() }) {
  const fromStatus = product.lifecycleStatus;
  const kpiPlan = buildApproveReviewKpiPlan({
    actor,
    product,
    kpiWeight,
    now,
  });
  const routeUpdate = buildLifecycleStageCompletionUpdate({
    product,
    completedStage: LIFECYCLE_ROUTE_STAGES.DESIGN,
    now,
  });
  const productUpdate = {
    ...createLifecycleActionUpdate({
      action: PRODUCT_LIFECYCLE_ACTIONS.APPROVE,
      actor,
      product,
      now,
    }),
    reviewedByUserId: actor.id,
    assignedToUserId: product.marketplaceManagerId || null,
    ...kpiPlan.productUpdate,
    ...(routeUpdate || {}),
  };
  const kpiEntry = {
    ...kpiPlan.kpiEntry,
    ...((Number(product.lifecycleRunNumber) || 0) > 0
      ? { lifecycleRunNumber: Number(product.lifecycleRunNumber) }
      : {}),
  };
  const historyMetadata = routeUpdate
    ? withLifecycleRunMetadata(product, kpiPlan.historyMetadata)
    : kpiPlan.historyMetadata;

  return {
    productUpdate,
    kpiEntry,
    historyEntry: buildHistoryEntry({
      product,
      actor,
      actionType: 'approved',
      fromStatus,
      toStatus: productUpdate.lifecycleStatus,
      message: 'Product review approved',
      metadata: historyMetadata,
      now,
    }),
  };
}

function buildRequestRevisionPlan({ actor, product, comment, now = new Date() }) {
  const normalizedComment = normalizeRequiredComment(comment);
  const fromStatus = product.lifecycleStatus;
  const productUpdate = {
    ...createLifecycleActionUpdate({
      action: PRODUCT_LIFECYCLE_ACTIONS.REQUEST_REVISION,
      actor,
      product,
      now,
    }),
    assignedToUserId: product.designerId || null,
  };

  return {
    productUpdate,
    revisionRequestData: {
      productId: product.id,
      requestedBy: actor.id,
      assignedDesignerId: product.designerId || null,
      comment: normalizedComment,
      status: PRODUCT_REVISION_STATUSES.OPEN,
    },
    historyEntry: buildHistoryEntry({
      product,
      actor,
      actionType: 'revision_requested',
      fromStatus,
      toStatus: productUpdate.lifecycleStatus,
      message: 'Product revision requested',
      metadata: { comment: normalizedComment },
      now,
    }),
  };
}

function buildResubmitRevisionPlan({ actor, product, openRevisionRequest, now = new Date() }) {
  const fromStatus = product.lifecycleStatus;
  const productUpdate = createLifecycleActionUpdate({
    action: PRODUCT_LIFECYCLE_ACTIONS.RESUBMIT_REVISION,
    actor,
    product,
    now,
  });
  const revisionRequestId = openRevisionRequest?.id || null;

  return {
    productUpdate,
    revisionUpdate: openRevisionRequest
      ? {
          status: PRODUCT_REVISION_STATUSES.RESOLVED,
          resolvedAt: now,
        }
      : null,
    historyEntry: buildHistoryEntry({
      product,
      actor,
      actionType: 'revision_resubmitted',
      fromStatus,
      toStatus: productUpdate.lifecycleStatus,
      message: 'Product revision resubmitted',
      metadata: revisionRequestId ? { revisionRequestId } : null,
      now,
    }),
  };
}

module.exports = {
  PRODUCT_REVISION_STATUSES,
  PRODUCT_REVISION_STATUS_VALUES,
  buildApproveReviewPlan,
  buildRequestRevisionPlan,
  buildResubmitRevisionPlan,
  buildSubmitReviewPlan,
  normalizeRequiredComment,
};
