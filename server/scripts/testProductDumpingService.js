const assert = require('assert');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const { getProductPermissions } = require('../constants/productPermissions');
const {
  buildDumpingConnectPlan,
  buildDumpingUpdatePlan,
} = require('../services/productDumpingService');
const {
  buildLifecycleStageCompletionUpdate,
  normalizeLifecycleRoute,
} = require('../services/productLifecycleRouteService');
const { buildSaleLaunchCompletionPlan } = require('../services/productSaleLaunchService');

const admin = { id: 1, role: 'admin' };
const manager = { id: 2, role: 'marketplace_manager' };
const now = new Date('2026-11-06T10:00:00Z');

function product(overrides = {}) {
  return {
    id: 100,
    isActive: true,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.DUMPING,
    lifecycleRoute: ['sale_launch', 'dumping'],
    lifecycleRouteIndex: 1,
    lifecycleRunNumber: 2,
    marketplaceManagerId: 2,
    ...overrides,
  };
}

function testDumpingIsLastRouteStage() {
  assert.deepStrictEqual(
    normalizeLifecycleRoute(['dumping', 'design', 'sale_launch']),
    ['design', 'sale_launch', 'dumping']
  );
}

function testSaleLaunchMovesProductToDumping() {
  const update = buildLifecycleStageCompletionUpdate({
    product: product({
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleRouteIndex: 0,
    }),
    completedStage: 'sale_launch',
    now,
  });

  assert.strictEqual(update.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.DUMPING);
  assert.strictEqual(update.lifecycleCompletedAt, null);
  assert.strictEqual(update.assignedToUserId, 2);

  const plan = buildSaleLaunchCompletionPlan({
    product: product({
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleRouteIndex: 0,
    }),
    kaspiListing: { id: 5, marketplace: 'kaspi', status: 'published' },
    actor: manager,
    payload: {
      internalAdvertisingStarted: false,
      externalAdvertisingStarted: false,
      reviewBonusEnabled: false,
      sellerBonusEnabled: false,
    },
    now,
  });
  assert.strictEqual(plan.productUpdate.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.DUMPING);
  assert.strictEqual(plan.productUpdate.lifecycleCompletedAt, null);
  assert.strictEqual(plan.history.toStatus, PRODUCT_LIFECYCLE_STATUSES.DUMPING);
}

function testConnectFinishesCycleOnDumpingStage() {
  const plan = buildDumpingConnectPlan({
    product: product(),
    actor: manager,
    payload: { minPrice: '1500', maxPrice: 2300.5, notes: ' ok ' },
    now,
  });

  assert.strictEqual(plan.dumpingUpdate.minPrice, 1500);
  assert.strictEqual(plan.dumpingUpdate.maxPrice, 2300.5);
  assert.strictEqual(plan.dumpingUpdate.notes, 'ok');
  assert.strictEqual(plan.dumpingUpdate.connectedBy, 2);
  assert.strictEqual(plan.dumpingUpdate.connectedAt, now);
  assert.strictEqual(plan.productUpdate.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.strictEqual(plan.productUpdate.lifecycleCompletedAt, now);
  assert.strictEqual(plan.history.actionType, 'dumping_connected');
  assert.strictEqual(plan.history.metadata.lifecycleRunNumber, 2);
}

function testConnectOutsideCycleKeepsStatus() {
  const outside = product({
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleRoute: null,
    lifecycleRouteIndex: null,
  });
  const plan = buildDumpingConnectPlan({
    product: outside,
    dumping: { minPrice: '100.00', maxPrice: '200.00' },
    actor: admin,
    payload: {},
    now,
  });

  assert.strictEqual(plan.productUpdate, null);
  assert.strictEqual(plan.history.toStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);

  assert.throws(
    () => buildDumpingConnectPlan({
      product: outside,
      dumping: { minPrice: 100, maxPrice: 200, connectedAt: now },
      actor: admin,
      payload: {},
    }),
    /уже подключён/
  );
}

function testRejectsInvalidPrices() {
  const base = { product: product(), actor: admin };
  assert.throws(
    () => buildDumpingConnectPlan({ ...base, payload: { minPrice: 300, maxPrice: 200 } }),
    /не может быть больше/
  );
  assert.throws(
    () => buildDumpingConnectPlan({ ...base, payload: { minPrice: 300 } }),
    /Укажите минимальную и максимальную/
  );
  assert.throws(
    () => buildDumpingUpdatePlan({ ...base, payload: { minPrice: 0, maxPrice: 10 } }),
    /больше нуля/
  );
}

function testUpdateRecordsOnlyRealChanges() {
  const dumping = { minPrice: '100.00', maxPrice: '200.00', notes: null };
  const unchanged = buildDumpingUpdatePlan({
    product: product(),
    dumping,
    actor: admin,
    payload: { minPrice: 100, maxPrice: 200 },
    now,
  });
  assert.strictEqual(unchanged.history, null);

  const changed = buildDumpingUpdatePlan({
    product: product(),
    dumping,
    actor: admin,
    payload: { maxPrice: 250 },
    now,
  });
  assert.deepStrictEqual(changed.changedFields, ['maxPrice']);
  assert.strictEqual(changed.history.actionType, 'dumping_updated');
  assert.strictEqual(changed.history.metadata.previousMaxPrice, 200);
}

function testPermissions() {
  const allowed = (user, status) => getProductPermissions({
    user,
    product: product({ lifecycleStatus: status }),
  }).allowedActions;

  assert.ok(allowed(manager, PRODUCT_LIFECYCLE_STATUSES.IN_SALE).includes('manage_dumping'));
  assert.ok(allowed(admin, PRODUCT_LIFECYCLE_STATUSES.DUMPING).includes('complete_dumping'));
  assert.ok(!allowed({ id: 3, role: 'designer' }, PRODUCT_LIFECYCLE_STATUSES.DUMPING).includes('manage_dumping'));
  assert.ok(!allowed(admin, PRODUCT_LIFECYCLE_STATUSES.ARCHIVED).includes('manage_dumping'));
  assert.throws(
    () => buildDumpingUpdatePlan({
      product: product(),
      actor: { id: 3, role: 'purchase_manager' },
      payload: { minPrice: 1, maxPrice: 2 },
    }),
    /not permitted/
  );
}

testDumpingIsLastRouteStage();
testSaleLaunchMovesProductToDumping();
testConnectFinishesCycleOnDumpingStage();
testConnectOutsideCycleKeepsStatus();
testRejectsInvalidPrices();
testUpdateRecordsOnlyRealChanges();
testPermissions();

console.log('product dumping service tests passed');
