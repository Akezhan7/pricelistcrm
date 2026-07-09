const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  MARKETPLACE_KEYS,
  MARKETPLACE_LISTING_STATUSES,
  assertKaspiPlacementReady,
  buildKaspiLegacyProductUpdate,
  buildMarketplaceListingData,
  buildMarketplacePlacementReadyPlan,
} = require('../services/productMarketplaceService');

function testBuildsMarketplaceListingData() {
  const listing = buildMarketplaceListingData({
    productId: 15,
    actor: { id: 7, role: 'marketplace_manager' },
    payload: {
      marketplace: MARKETPLACE_KEYS.KASPI,
      status: MARKETPLACE_LISTING_STATUSES.PUBLISHED,
      sku: ' KSP-001 ',
      marketplaceName: ' Kaspi Product ',
      marketplaceArticle: ' EXT-123 ',
      price: '12990',
      url: ' https://kaspi.kz/product ',
      description: ' Listing description ',
    },
  });

  assert.deepStrictEqual(listing, {
    productId: 15,
    marketplace: MARKETPLACE_KEYS.KASPI,
    status: MARKETPLACE_LISTING_STATUSES.PUBLISHED,
    sku: 'KSP-001',
    marketplaceName: 'Kaspi Product',
    marketplaceArticle: 'EXT-123',
    price: 12990,
    url: 'https://kaspi.kz/product',
    description: 'Listing description',
    managedBy: 7,
  });
}

function testBuildsLegacyProductUpdateForKaspi() {
  const update = buildKaspiLegacyProductUpdate({
    marketplace: MARKETPLACE_KEYS.KASPI,
    sku: 'KSP-002',
    marketplaceName: 'Kaspi Product 2',
    price: 15990,
  });

  assert.deepStrictEqual(update, {
    kaspiArticle: 'KSP-002',
    kaspiName: 'Kaspi Product 2',
    sellingPrice: 15990,
  });
}

function testPlacementRequiresPublishedKaspiListing() {
  assert.throws(
    () => assertKaspiPlacementReady(null),
    /Kaspi listing is required/i
  );

  assert.throws(
    () =>
      assertKaspiPlacementReady({
        marketplace: MARKETPLACE_KEYS.KASPI,
        status: MARKETPLACE_LISTING_STATUSES.PLACING,
        sku: 'KSP-003',
        marketplaceName: 'Kaspi Product 3',
        price: 9990,
      }),
    /published/i
  );

  assert.throws(
    () =>
      assertKaspiPlacementReady({
        marketplace: MARKETPLACE_KEYS.KASPI,
        status: MARKETPLACE_LISTING_STATUSES.PUBLISHED,
        sku: '',
        marketplaceName: 'Kaspi Product 3',
        price: 9990,
      }),
    /SKU/i
  );

  assert.doesNotThrow(() =>
    assertKaspiPlacementReady({
      marketplace: MARKETPLACE_KEYS.KASPI,
      status: MARKETPLACE_LISTING_STATUSES.PUBLISHED,
      sku: 'KSP-003',
      marketplaceName: 'Kaspi Product 3',
      price: 9990,
    })
  );
}

function testBuildsPlacementReadyPlan() {
  const now = new Date('2026-07-09T09:00:00Z');
  const product = {
    id: 20,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
  };
  const listing = {
    id: 30,
    marketplace: MARKETPLACE_KEYS.KASPI,
    status: MARKETPLACE_LISTING_STATUSES.PUBLISHED,
    sku: 'KSP-004',
    marketplaceName: 'Kaspi Product 4',
    price: 19990,
  };

  const plan = buildMarketplacePlacementReadyPlan({
    actor: { id: 8, role: 'marketplace_manager' },
    product,
    kaspiListing: listing,
    now,
  });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    lifecycleCompletedAt: null,
  });
  assert.deepStrictEqual(plan.historyEntry, {
    productId: product.id,
    actorId: 8,
    actionType: 'marketplace_placement_ready',
    fromStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    toStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    message: 'Marketplace placement marked as ready',
    metadata: {
      marketplaceListingId: listing.id,
      marketplace: MARKETPLACE_KEYS.KASPI,
      sku: listing.sku,
    },
    createdAt: now,
  });
}

testBuildsMarketplaceListingData();
testBuildsLegacyProductUpdateForKaspi();
testPlacementRequiresPublishedKaspiListing();
testBuildsPlacementReadyPlan();

console.log('Product marketplace service test passed');
