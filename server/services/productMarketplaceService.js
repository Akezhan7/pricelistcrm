const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  createLifecycleActionUpdate,
} = require('./productLifecycleService');
const {
  LIFECYCLE_ROUTE_STAGES,
  buildLifecycleStageCompletionUpdate,
  withLifecycleRunMetadata,
} = require('./productLifecycleRouteService');

const MARKETPLACE_KEYS = Object.freeze({
  KASPI: 'kaspi',
  HALYK: 'halyk',
  FORTE: 'forte',
  OZON: 'ozon',
  WILDBERRIES: 'wildberries',
  OTHER: 'other',
});

const MARKETPLACE_VALUES = Object.freeze(Object.values(MARKETPLACE_KEYS));

const MARKETPLACE_LISTING_STATUSES = Object.freeze({
  NOT_STARTED: 'not_started',
  PLACING: 'placing',
  MODERATION: 'moderation',
  PUBLISHED: 'published',
  IN_SALE: 'in_sale',
  BLOCKED: 'blocked',
  REMOVED: 'removed',
});

const MARKETPLACE_LISTING_STATUS_VALUES = Object.freeze(
  Object.values(MARKETPLACE_LISTING_STATUSES)
);

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeMarketplace(value) {
  const normalized = normalizeNullableString(value) || MARKETPLACE_KEYS.KASPI;

  if (!MARKETPLACE_VALUES.includes(normalized)) {
    throw new Error('Unsupported marketplace');
  }

  return normalized;
}

function normalizeMarketplaceStatus(value) {
  const normalized = normalizeNullableString(value) || MARKETPLACE_LISTING_STATUSES.NOT_STARTED;

  if (!MARKETPLACE_LISTING_STATUS_VALUES.includes(normalized)) {
    throw new Error('Unsupported marketplace status');
  }

  return normalized;
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Marketplace price must be a non-negative number');
  }

  return parsed;
}

function buildMarketplaceListingData({ productId, actor, payload = {} }) {
  if (!productId) {
    throw new Error('productId is required');
  }

  return {
    productId: Number(productId),
    marketplace: normalizeMarketplace(payload.marketplace),
    status: normalizeMarketplaceStatus(payload.status),
    sku: normalizeNullableString(payload.sku),
    productCode: normalizeNullableString(payload.productCode),
    marketplaceName: normalizeNullableString(payload.marketplaceName),
    marketplaceArticle: normalizeNullableString(payload.marketplaceArticle),
    price: normalizePrice(payload.price),
    url: normalizeNullableString(payload.url),
    description: normalizeNullableString(payload.description),
    managedBy: actor?.id ? Number(actor.id) : null,
  };
}

function buildMarketplaceListingUpdate({ actor, payload = {} }) {
  const update = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    update.status = normalizeMarketplaceStatus(payload.status);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'sku')) {
    update.sku = normalizeNullableString(payload.sku);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'productCode')) {
    update.productCode = normalizeNullableString(payload.productCode);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'marketplaceName')) {
    update.marketplaceName = normalizeNullableString(payload.marketplaceName);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'marketplaceArticle')) {
    update.marketplaceArticle = normalizeNullableString(payload.marketplaceArticle);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'price')) {
    update.price = normalizePrice(payload.price);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'url')) {
    update.url = normalizeNullableString(payload.url);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    update.description = normalizeNullableString(payload.description);
  }

  update.managedBy = actor?.id ? Number(actor.id) : null;

  return update;
}

function buildKaspiLegacyProductUpdate(listing) {
  if (!listing || listing.marketplace !== MARKETPLACE_KEYS.KASPI) return {};

  const update = {};
  if (listing.sku !== undefined) update.kaspiArticle = listing.sku || null;
  if (listing.marketplaceName !== undefined) update.kaspiName = listing.marketplaceName || null;
  if (listing.price !== undefined && listing.price !== null) update.sellingPrice = listing.price;

  return update;
}

function buildMarketplaceOwnershipUpdate({ actor, product }) {
  if (!actor?.id || !['admin', 'marketplace_manager'].includes(actor.role)) {
    throw new Error('Marketplace ownership update is not permitted for this role');
  }

  const update = { marketplaceManagerId: Number(actor.id) };
  if ([PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE, PRODUCT_LIFECYCLE_STATUSES.IN_SALE]
    .includes(product?.lifecycleStatus)) {
    update.assignedToUserId = Number(actor.id);
  }

  return update;
}

function assertKaspiPlacementReady(kaspiListing) {
  if (!kaspiListing) {
    throw new Error('Kaspi listing is required before moving product to purchase');
  }

  if (!normalizeNullableString(kaspiListing.sku)) {
    throw new Error('Kaspi SKU is required before moving product to purchase');
  }

  if (!normalizeNullableString(kaspiListing.marketplaceName)) {
    throw new Error('Kaspi marketplace name is required before moving product to purchase');
  }

  const price = Number(kaspiListing.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Kaspi price must be greater than zero before moving product to purchase');
  }

  if (kaspiListing.status !== MARKETPLACE_LISTING_STATUSES.PUBLISHED) {
    throw new Error('Kaspi listing must be published before moving product to purchase');
  }
}

function buildMarketplacePlacementReadyPlan({ actor, product, kaspiListing, now = new Date() }) {
  assertKaspiPlacementReady(kaspiListing);

  const fromStatus = product.lifecycleStatus;
  const productUpdate = createLifecycleActionUpdate({
    action: PRODUCT_LIFECYCLE_ACTIONS.MARK_PLACEMENT_READY,
    actor,
    product,
    now,
  });
  const routeUpdate = buildLifecycleStageCompletionUpdate({
    product,
    completedStage: LIFECYCLE_ROUTE_STAGES.MARKETPLACE,
    now,
  });
  Object.assign(productUpdate, routeUpdate || {});

  return {
    productUpdate,
    historyEntry: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'marketplace_placement_ready',
      fromStatus,
      toStatus: productUpdate.lifecycleStatus,
      message: 'Marketplace placement marked as ready',
      metadata: routeUpdate ? withLifecycleRunMetadata(product, {
        marketplaceListingId: kaspiListing.id,
        marketplace: kaspiListing.marketplace,
        sku: kaspiListing.sku,
      }) : {
        marketplaceListingId: kaspiListing.id,
        marketplace: kaspiListing.marketplace,
        sku: kaspiListing.sku,
      },
      createdAt: now,
    },
  };
}

module.exports = {
  MARKETPLACE_KEYS,
  MARKETPLACE_LISTING_STATUSES,
  MARKETPLACE_LISTING_STATUS_VALUES,
  MARKETPLACE_VALUES,
  assertKaspiPlacementReady,
  buildKaspiLegacyProductUpdate,
  buildMarketplaceListingData,
  buildMarketplaceListingUpdate,
  buildMarketplaceOwnershipUpdate,
  buildMarketplacePlacementReadyPlan,
};
