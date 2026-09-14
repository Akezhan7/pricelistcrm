const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const {
  LIFECYCLE_ROUTE_STAGES,
  getLifecycleStageStatus,
  hasActiveLifecycleRoute,
  normalizeLifecycleRoute,
} = require('./productLifecycleRouteService');

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required`);
  }

  return parsed;
}

function normalizeReason(value) {
  if (value === undefined || value === null) return null;
  const reason = String(value).trim();
  return reason || null;
}

function assertCanStartLifecycle({ actor, product }) {
  if (actor?.role !== 'admin') {
    throw new Error('Only admin can start lifecycle for catalog products');
  }

  if (
    !product
    || product.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.IN_SALE
  ) {
    throw new Error('Only products in sale can be started in lifecycle');
  }

  if (hasActiveLifecycleRoute(product)) {
    throw new Error('Product already has an active lifecycle');
  }
}

function buildStartLifecyclePlan({
  actor,
  product,
  payload = {},
  now = new Date(),
}) {
  assertCanStartLifecycle({ actor, product });

  const route = normalizeLifecycleRoute(payload.stages);
  const firstStage = route[0];
  const targetStatus = getLifecycleStageStatus(firstStage);
  const repeated = Boolean(product.lifecycleStartedAt);
  const reason = normalizeReason(payload.reason);
  if (repeated && !reason) {
    throw new Error('reason is required for repeated lifecycle');
  }

  const lifecycleRunNumber = Math.max(Number(product.lifecycleRunNumber) || 0, repeated ? 1 : 0) + 1;
  const productUpdate = {
    lifecycleStatus: targetStatus,
    lifecycleStartedAt: now,
    lifecycleCompletedAt: null,
    lifecycleRunNumber,
    lifecycleRoute: route,
    lifecycleRouteIndex: 0,
    lifecycleRunReason: reason,
    assignedToUserId: null,
    reviewedByUserId: null,
  };

  if (firstStage === LIFECYCLE_ROUTE_STAGES.DESIGN) {
    const designerId = toPositiveInteger(payload.designerId, 'designerId');
    productUpdate.designerId = designerId;
    productUpdate.assignedToUserId = designerId;
    productUpdate.kpiWeight = null;
  }

  if (firstStage === LIFECYCLE_ROUTE_STAGES.MARKETPLACE
    || firstStage === LIFECYCLE_ROUTE_STAGES.SALE_LAUNCH) {
    productUpdate.assignedToUserId = product.marketplaceManagerId || null;
  }

  return {
    productUpdate,
    historyEntry: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'lifecycle_started',
      fromStatus: product.lifecycleStatus,
      toStatus: targetStatus,
      message: repeated ? 'Repeated lifecycle started' : 'Catalog product started in lifecycle',
      metadata: {
        lifecycleRunNumber,
        route,
        reason,
        repeated,
        designerId: productUpdate.designerId,
      },
      createdAt: now,
    },
    resetSaleLaunch: route.includes(LIFECYCLE_ROUTE_STAGES.SALE_LAUNCH),
    resetLifecyclePurchase: repeated && route.includes(LIFECYCLE_ROUTE_STAGES.PURCHASE),
  };
}

function normalizeProductIds(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('productIds must contain at least one product');
  }

  return Array.from(new Set(
    productIds.map((id) => toPositiveInteger(id, 'productIds'))
  ));
}

function buildBulkStartLifecyclePlan({
  actor,
  productIds,
  products,
  payload = {},
  now = new Date(),
}) {
  const normalizedProductIds = normalizeProductIds(productIds);

  if (!Array.isArray(products) || products.length !== normalizedProductIds.length) {
    throw new Error('not all selected products were found');
  }

  const productsById = new Map(products.map((product) => [Number(product.id), product]));
  const orderedProducts = normalizedProductIds.map((productId) => productsById.get(productId));

  if (orderedProducts.some((product) => !product)) {
    throw new Error('not all selected products were found');
  }

  const plans = orderedProducts.map((product) =>
    buildStartLifecyclePlan({ actor, product, payload, now })
  );

  return {
    productIds: normalizedProductIds,
    updates: plans.map((plan, index) => ({
      productId: normalizedProductIds[index],
      update: plan.productUpdate,
    })),
    historyEntries: plans.map((plan) => plan.historyEntry),
    resetSaleLaunchProductIds: plans
      .map((plan, index) => plan.resetSaleLaunch ? normalizedProductIds[index] : null)
      .filter(Boolean),
    resetLifecyclePurchaseProductIds: plans
      .map((plan, index) => plan.resetLifecyclePurchase ? normalizedProductIds[index] : null)
      .filter(Boolean),
  };
}

module.exports = {
  buildBulkStartLifecyclePlan,
  buildStartLifecyclePlan,
};
