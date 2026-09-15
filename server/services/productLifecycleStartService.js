const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const { TERMINAL_STATUSES } = require('./orderStatusPolicyService');
const {
  LIFECYCLE_ROUTE_STAGES,
  getLifecycleStageStatus,
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

  if (!product || product.isActive === false) {
    throw new Error('Only active products can be started in lifecycle');
  }

  if (product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.ARCHIVED) {
    throw new Error('Archived product cannot be started in lifecycle');
  }

  const lifecyclePurchase = product.lifecyclePurchase
    || (typeof product.get === 'function' ? product.get('lifecyclePurchase') : null);
  const purchaseOrder = lifecyclePurchase?.order
    || (typeof lifecyclePurchase?.get === 'function' ? lifecyclePurchase.get('order') : null);
  const purchaseFinished = Boolean(
    lifecyclePurchase?.arrivedAt
    || TERMINAL_STATUSES.includes(purchaseOrder?.status)
  );

  if (lifecyclePurchase && !purchaseFinished) {
    const orderReference = purchaseOrder?.orderNumber || `#${lifecyclePurchase.orderId}`;
    throw new Error(
      `У товара есть незавершенная заявка ${orderReference}. Сначала завершите или отмените ее, затем перезапустите цикл.`
    );
  }
}

function isRepeatedLifecycle(product) {
  const route = Array.isArray(product?.lifecycleRoute) ? product.lifecycleRoute : [];

  return Boolean(
    Number(product?.lifecycleRunNumber) > 0
    || product?.lifecycleCompletedAt
    || route.length > 0
    || (product?.lifecycleStartedAt
      && product?.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.NEW)
  );
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
  const repeated = isRepeatedLifecycle(product);
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
      message: repeated ? 'Lifecycle route restarted' : 'Product lifecycle started',
      metadata: {
        lifecycleRunNumber,
        route,
        previousRoute: Array.isArray(product.lifecycleRoute) ? product.lifecycleRoute : [],
        previousRouteIndex: product.lifecycleRouteIndex ?? null,
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
