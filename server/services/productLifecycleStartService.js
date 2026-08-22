const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');

const STARTABLE_LIFECYCLE_STATUSES = Object.freeze([
  PRODUCT_LIFECYCLE_STATUSES.NEW,
  PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
  PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
]);

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required`);
  }

  return parsed;
}

function normalizeTargetStatus(value) {
  const status = String(value || '').trim();

  if (!STARTABLE_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error('Unsupported lifecycle start status');
  }

  return status;
}

function assertCanStartLifecycle({ actor, product }) {
  if (actor?.role !== 'admin') {
    throw new Error('Only admin can start lifecycle for catalog products');
  }

  if (
    !product
    || product.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.IN_SALE
    || product.lifecycleStartedAt
  ) {
    throw new Error('Only legacy catalog products can be started in lifecycle');
  }
}

function buildStartLifecyclePlan({
  actor,
  product,
  payload = {},
  now = new Date(),
}) {
  assertCanStartLifecycle({ actor, product });

  const targetStatus = normalizeTargetStatus(payload.targetStatus);
  const productUpdate = {
    lifecycleStatus: targetStatus,
    lifecycleStartedAt: now,
    lifecycleCompletedAt: null,
    assignedToUserId: null,
    designerId: null,
    reviewedByUserId: null,
    kpiWeight: null,
  };

  if (targetStatus === PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER) {
    const designerId = toPositiveInteger(payload.designerId, 'designerId');
    productUpdate.designerId = designerId;
    productUpdate.assignedToUserId = designerId;
  }

  if (targetStatus === PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE) {
    productUpdate.marketplaceManagerId = null;
  }

  return {
    productUpdate,
    historyEntry: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'lifecycle_started',
      fromStatus: product.lifecycleStatus,
      toStatus: targetStatus,
      message: 'Legacy catalog product started in lifecycle',
      metadata: {
        targetStatus,
        designerId: productUpdate.designerId,
      },
      createdAt: now,
    },
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
  };
}

module.exports = {
  STARTABLE_LIFECYCLE_STATUSES,
  buildBulkStartLifecyclePlan,
  buildStartLifecyclePlan,
};
