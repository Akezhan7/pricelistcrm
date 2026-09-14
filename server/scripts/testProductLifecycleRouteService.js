const assert = require('assert');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const {
  LIFECYCLE_ROUTE_STAGES,
  buildLifecycleStageCompletionUpdate,
  normalizeLifecycleRoute,
} = require('../services/productLifecycleRouteService');

function product(overrides = {}) {
  return {
    id: 10,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    lifecycleRoute: [LIFECYCLE_ROUTE_STAGES.DESIGN],
    lifecycleRouteIndex: 0,
    lifecycleRunNumber: 2,
    marketplaceManagerId: 7,
    ...overrides,
  };
}

function testPurchaseIncludesWarehouseAndUsesCanonicalOrder() {
  assert.deepStrictEqual(
    normalizeLifecycleRoute(['sale_launch', 'purchase', 'design']),
    ['design', 'purchase', 'warehouse', 'sale_launch']
  );
}

function testCompletesAfterLastSelectedStage() {
  const now = new Date('2026-09-14T10:00:00Z');
  const update = buildLifecycleStageCompletionUpdate({
    product: product(),
    completedStage: LIFECYCLE_ROUTE_STAGES.DESIGN,
    now,
  });

  assert.deepStrictEqual(update, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleRouteIndex: 1,
    lifecycleCompletedAt: now,
    assignedToUserId: 7,
  });
}

function testAdvancesToNextSelectedStage() {
  const update = buildLifecycleStageCompletionUpdate({
    product: product({ lifecycleRoute: ['design', 'marketplace', 'sale_launch'] }),
    completedStage: LIFECYCLE_ROUTE_STAGES.DESIGN,
  });

  assert.strictEqual(update.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
  assert.strictEqual(update.lifecycleRouteIndex, 1);
  assert.strictEqual(update.lifecycleCompletedAt, null);
}

function testMarketplaceCanAdvanceDirectlyToSaleLaunch() {
  const update = buildLifecycleStageCompletionUpdate({
    product: product({
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
      lifecycleRoute: ['marketplace', 'sale_launch'],
    }),
    completedStage: LIFECYCLE_ROUTE_STAGES.MARKETPLACE,
  });

  assert.strictEqual(update.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.strictEqual(update.lifecycleRouteIndex, 1);
  assert.strictEqual(update.lifecycleCompletedAt, null);
}

testPurchaseIncludesWarehouseAndUsesCanonicalOrder();
testCompletesAfterLastSelectedStage();
testAdvancesToNextSelectedStage();
testMarketplaceCanAdvanceDirectlyToSaleLaunch();

console.log('Product lifecycle route service test passed');
