const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');

const LIFECYCLE_ROUTE_STAGES = Object.freeze({
  DESIGN: 'design',
  MARKETPLACE: 'marketplace',
  PURCHASE: 'purchase',
  WAREHOUSE: 'warehouse',
  SALE_LAUNCH: 'sale_launch',
});

const LIFECYCLE_ROUTE_ORDER = Object.freeze(Object.values(LIFECYCLE_ROUTE_STAGES));

const STATUS_BY_ROUTE_STAGE = Object.freeze({
  [LIFECYCLE_ROUTE_STAGES.DESIGN]: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
  [LIFECYCLE_ROUTE_STAGES.MARKETPLACE]: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
  [LIFECYCLE_ROUTE_STAGES.PURCHASE]: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
  [LIFECYCLE_ROUTE_STAGES.WAREHOUSE]: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
  [LIFECYCLE_ROUTE_STAGES.SALE_LAUNCH]: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
});

function normalizeLifecycleRoute(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('stages must contain at least one lifecycle stage');
  }

  const selected = new Set(stages.map((stage) => String(stage || '').trim()));
  const unsupported = [...selected].filter((stage) => !LIFECYCLE_ROUTE_ORDER.includes(stage));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported lifecycle stages: ${unsupported.join(', ')}`);
  }

  // A purchase is not complete until the received goods pass the warehouse stage.
  if (selected.has(LIFECYCLE_ROUTE_STAGES.PURCHASE)) {
    selected.add(LIFECYCLE_ROUTE_STAGES.WAREHOUSE);
  }

  return LIFECYCLE_ROUTE_ORDER.filter((stage) => selected.has(stage));
}

function getLifecycleStageStatus(stage) {
  const status = STATUS_BY_ROUTE_STAGE[stage];
  if (!status) throw new Error(`Unsupported lifecycle stage: ${stage}`);
  return status;
}

function hasActiveLifecycleRoute(product) {
  const route = Array.isArray(product?.lifecycleRoute) ? product.lifecycleRoute : [];
  const index = Number(product?.lifecycleRouteIndex);

  if (route.length > 0 && Number.isInteger(index) && index >= 0 && index < route.length) {
    return !product.lifecycleCompletedAt;
  }

  // Compatibility with lifecycle runs created before configurable routes existed.
  return Boolean(product?.lifecycleStartedAt && !product?.lifecycleCompletedAt);
}

function assignmentForStage(product, stage) {
  if (stage === LIFECYCLE_ROUTE_STAGES.DESIGN) return product.designerId || null;
  if (stage === LIFECYCLE_ROUTE_STAGES.MARKETPLACE
    || stage === LIFECYCLE_ROUTE_STAGES.SALE_LAUNCH) {
    return product.marketplaceManagerId || null;
  }
  return null;
}

function buildLifecycleStageCompletionUpdate({ product, completedStage, now = new Date() }) {
  const route = Array.isArray(product?.lifecycleRoute) ? product.lifecycleRoute : [];
  if (route.length === 0) return null;

  const currentIndex = Number(product.lifecycleRouteIndex);
  if (!Number.isInteger(currentIndex) || route[currentIndex] !== completedStage) {
    throw new Error('Lifecycle stage does not match the active route');
  }

  const nextIndex = currentIndex + 1;
  const nextStage = route[nextIndex];
  if (!nextStage) {
    return {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleRouteIndex: nextIndex,
      lifecycleCompletedAt: now,
      assignedToUserId: product.marketplaceManagerId || null,
    };
  }

  return {
    lifecycleStatus: getLifecycleStageStatus(nextStage),
    lifecycleRouteIndex: nextIndex,
    lifecycleCompletedAt: null,
    assignedToUserId: assignmentForStage(product, nextStage),
  };
}

function withLifecycleRunMetadata(product, metadata = {}) {
  return {
    ...metadata,
    lifecycleRunNumber: Number(product?.lifecycleRunNumber) || 1,
  };
}

module.exports = {
  LIFECYCLE_ROUTE_ORDER,
  LIFECYCLE_ROUTE_STAGES,
  buildLifecycleStageCompletionUpdate,
  getLifecycleStageStatus,
  hasActiveLifecycleRoute,
  normalizeLifecycleRoute,
  withLifecycleRunMetadata,
};
