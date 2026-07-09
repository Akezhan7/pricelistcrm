const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  assertTransitionAllowed,
  getLifecycleActionConfig,
  getNextStatusForAction,
} = require('../constants/productLifecycle');

const LIFECYCLE_ACTION_SLUGS = Object.freeze({
  'assign-designer': PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
  'submit-content': PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_CONTENT,
  'submit-review': PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_REVIEW,
  approve: PRODUCT_LIFECYCLE_ACTIONS.APPROVE,
  'request-revision': PRODUCT_LIFECYCLE_ACTIONS.REQUEST_REVISION,
  'resubmit-revision': PRODUCT_LIFECYCLE_ACTIONS.RESUBMIT_REVISION,
  'mark-placement-ready': PRODUCT_LIFECYCLE_ACTIONS.MARK_PLACEMENT_READY,
  'mark-purchased': PRODUCT_LIFECYCLE_ACTIONS.MARK_PURCHASED,
  'mark-arrived': PRODUCT_LIFECYCLE_ACTIONS.MARK_ARRIVED,
  'complete-warehouse': PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_WAREHOUSE,
  archive: PRODUCT_LIFECYCLE_ACTIONS.ARCHIVE,
});

function normalizeLifecycleActionSlug(slugOrAction) {
  return LIFECYCLE_ACTION_SLUGS[slugOrAction] || slugOrAction;
}

function assertRoleAllowed(actor, action) {
  const config = getLifecycleActionConfig(action);

  if (!config) {
    throw new Error(`Lifecycle action "${action}" is not supported`);
  }

  if (!actor || !config.roles.includes(actor.role)) {
    throw new Error(`Role is not permitted to perform lifecycle action "${action}"`);
  }
}

function assertAssignedDesignerAllowed(actor, product, action) {
  const config = getLifecycleActionConfig(action);

  if (!config?.requiresAssignedDesigner || actor?.role !== 'designer') return;

  if (Number(product.designerId) !== Number(actor.id)) {
    throw new Error('Only the assigned designer can perform this lifecycle action');
  }
}

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required`);
  }

  return parsed;
}

function createLifecycleActionUpdate({ action, actor, product, payload = {}, now = new Date() }) {
  const normalizedAction = normalizeLifecycleActionSlug(action);
  const currentStatus = product.lifecycleStatus;

  assertRoleAllowed(actor, normalizedAction);
  assertTransitionAllowed(currentStatus, normalizedAction);
  assertAssignedDesignerAllowed(actor, product, normalizedAction);

  const nextStatus = getNextStatusForAction(normalizedAction);
  const update = {
    lifecycleStatus: nextStatus,
  };

  if (!product.lifecycleStartedAt && currentStatus === PRODUCT_LIFECYCLE_STATUSES.NEW) {
    update.lifecycleStartedAt = now;
  }

  if (nextStatus === PRODUCT_LIFECYCLE_STATUSES.IN_SALE) {
    update.lifecycleCompletedAt = now;
  } else {
    update.lifecycleCompletedAt = null;
  }

  if (normalizedAction === PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER) {
    const designerId = toPositiveInteger(payload.designerId, 'designerId');
    update.designerId = designerId;
    update.assignedToUserId = designerId;
  }

  return update;
}

module.exports = {
  createLifecycleActionUpdate,
  normalizeLifecycleActionSlug,
};
