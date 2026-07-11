const PRODUCT_LIFECYCLE_STATUSES = Object.freeze({
  NEW: 'new',
  ASSIGNED_TO_DESIGNER: 'assigned_to_designer',
  CONTENT_CREATED: 'content_created',
  REVIEW: 'review',
  REVISION: 'revision',
  MARKETPLACE: 'marketplace',
  PURCHASE: 'purchase',
  WAREHOUSE: 'warehouse',
  IN_SALE: 'in_sale',
  ARCHIVED: 'archived',
});

const PRODUCT_LIFECYCLE_STATUS_VALUES = Object.freeze(Object.values(PRODUCT_LIFECYCLE_STATUSES));

const PRODUCT_LIFECYCLE_STATUS_LABELS = Object.freeze({
  [PRODUCT_LIFECYCLE_STATUSES.NEW]: 'New product',
  [PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER]: 'Assigned to designer',
  [PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED]: 'Content created',
  [PRODUCT_LIFECYCLE_STATUSES.REVIEW]: 'Review',
  [PRODUCT_LIFECYCLE_STATUSES.REVISION]: 'Revision',
  [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE]: 'Marketplace placement',
  [PRODUCT_LIFECYCLE_STATUSES.PURCHASE]: 'Purchase',
  [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]: 'Warehouse',
  [PRODUCT_LIFECYCLE_STATUSES.IN_SALE]: 'In sale',
  [PRODUCT_LIFECYCLE_STATUSES.ARCHIVED]: 'Archived',
});

const PRODUCT_LIFECYCLE_ACTIONS = Object.freeze({
  ASSIGN_DESIGNER: 'assign_designer',
  SUBMIT_CONTENT: 'submit_content',
  SUBMIT_REVIEW: 'submit_review',
  APPROVE: 'approve',
  REQUEST_REVISION: 'request_revision',
  RESUBMIT_REVISION: 'resubmit_revision',
  MARK_PLACEMENT_READY: 'mark_placement_ready',
  MARK_PURCHASED: 'mark_purchased',
  MARK_ARRIVED: 'mark_arrived',
  COMPLETE_WAREHOUSE: 'complete_warehouse',
  COMPLETE_SALE_LAUNCH: 'complete_sale_launch',
  ARCHIVE: 'archive',
});

const PRODUCT_LIFECYCLE_ACTION_CONFIG = Object.freeze({
  [PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.NEW],
    to: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
    roles: ['admin'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_CONTENT]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER],
    to: PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    roles: ['admin', 'designer'],
    requiresAssignedDesigner: true,
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_REVIEW]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED],
    to: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    roles: ['admin', 'designer'],
    requiresAssignedDesigner: true,
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.APPROVE]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.REVIEW],
    to: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    roles: ['admin'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.REQUEST_REVISION]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.REVIEW],
    to: PRODUCT_LIFECYCLE_STATUSES.REVISION,
    roles: ['admin'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.RESUBMIT_REVISION]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.REVISION],
    to: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    roles: ['admin', 'designer'],
    requiresAssignedDesigner: true,
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.MARK_PLACEMENT_READY]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE],
    to: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    roles: ['admin', 'marketplace_manager'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.MARK_PURCHASED]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.PURCHASE],
    to: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    roles: ['admin', 'purchase_manager'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.MARK_ARRIVED]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.PURCHASE],
    to: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
    roles: ['admin', 'purchase_manager'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_WAREHOUSE]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE],
    to: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    roles: ['admin', 'warehouse_operator'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_SALE_LAUNCH]: Object.freeze({
    from: [PRODUCT_LIFECYCLE_STATUSES.IN_SALE],
    to: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    roles: ['admin', 'marketplace_manager'],
  }),
  [PRODUCT_LIFECYCLE_ACTIONS.ARCHIVE]: Object.freeze({
    from: PRODUCT_LIFECYCLE_STATUS_VALUES.filter((status) => status !== PRODUCT_LIFECYCLE_STATUSES.ARCHIVED),
    to: PRODUCT_LIFECYCLE_STATUSES.ARCHIVED,
    roles: ['admin'],
  }),
});

function getLifecycleStatusLabel(status) {
  return PRODUCT_LIFECYCLE_STATUS_LABELS[status] || status;
}

function getLifecycleActionConfig(action) {
  return PRODUCT_LIFECYCLE_ACTION_CONFIG[action] || null;
}

function getNextStatusForAction(action) {
  const config = getLifecycleActionConfig(action);
  return config ? config.to : null;
}

function canTransition(currentStatus, action) {
  const config = getLifecycleActionConfig(action);
  if (!config) return false;

  return config.from.includes(currentStatus);
}

function assertTransitionAllowed(currentStatus, action) {
  if (!canTransition(currentStatus, action)) {
    throw new Error(`Lifecycle action "${action}" is not allowed from status "${currentStatus}"`);
  }
}

function canPerformLifecycleAction({ user, product, action }) {
  if (!user || !product || !action) return false;

  const config = getLifecycleActionConfig(action);
  if (!config || !config.roles.includes(user.role)) return false;

  if (!canTransition(product.lifecycleStatus, action)) return false;

  if (config.requiresAssignedDesigner && user.role === 'designer') {
    return Number(product.designerId) === Number(user.id);
  }

  return true;
}

function generateDraftArticle(date = new Date(), sequence = 1) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const paddedSequence = String(sequence).padStart(4, '0');

  return `DRAFT-${year}${month}${day}-${paddedSequence}`;
}

module.exports = {
  PRODUCT_LIFECYCLE_ACTION_CONFIG,
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  PRODUCT_LIFECYCLE_STATUS_LABELS,
  PRODUCT_LIFECYCLE_STATUS_VALUES,
  assertTransitionAllowed,
  canPerformLifecycleAction,
  canTransition,
  generateDraftArticle,
  getLifecycleActionConfig,
  getLifecycleStatusLabel,
  getNextStatusForAction,
};
