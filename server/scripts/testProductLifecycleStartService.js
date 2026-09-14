const assert = require('assert');
const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const {
  buildBulkStartLifecyclePlan,
  buildStartLifecyclePlan,
} = require('../services/productLifecycleStartService');

function makeCatalogProduct(overrides = {}) {
  return {
    id: 101,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleStartedAt: null,
    lifecycleCompletedAt: null,
    designerId: 44,
    assignedToUserId: 44,
    marketplaceManagerId: 55,
    lifecycleRunNumber: 0,
    lifecycleRoute: null,
    lifecycleRouteIndex: null,
    ...overrides,
  };
}

function testStartLegacyProductWithSelectedRoute() {
  const now = new Date('2026-07-13T10:00:00Z');
  const plan = buildStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    product: makeCatalogProduct(),
    payload: { stages: ['marketplace', 'sale_launch'] },
    now,
  });

  assert.strictEqual(plan.productUpdate.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
  assert.deepStrictEqual(plan.productUpdate.lifecycleRoute, ['marketplace', 'sale_launch']);
  assert.strictEqual(plan.productUpdate.lifecycleRouteIndex, 0);
  assert.strictEqual(plan.productUpdate.lifecycleRunNumber, 1);
  assert.strictEqual(plan.historyEntry.actionType, 'lifecycle_started');
  assert.strictEqual(plan.historyEntry.fromStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.strictEqual(plan.historyEntry.toStatus, PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE);
  assert.strictEqual(plan.historyEntry.metadata.lifecycleRunNumber, 1);
}

function testStartWithDesignerRequiresDesignerId() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 1, role: 'admin' },
        product: makeCatalogProduct(),
        payload: { stages: ['design'] },
      }),
    /designerId is required/
  );
}

function testStartWithDesigner() {
  const now = new Date('2026-07-13T11:00:00Z');
  const plan = buildStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    product: makeCatalogProduct(),
    payload: {
      stages: ['design'],
      designerId: 25,
    },
    now,
  });

  assert.strictEqual(plan.productUpdate.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER);
  assert.strictEqual(plan.productUpdate.designerId, 25);
  assert.strictEqual(plan.productUpdate.assignedToUserId, 25);
}

function testRestartsCompletedLifecycleWithReason() {
  const now = new Date('2026-07-13T11:30:00Z');
  const plan = buildStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    product: makeCatalogProduct({
      lifecycleStartedAt: new Date('2026-07-10T10:00:00Z'),
      lifecycleCompletedAt: new Date('2026-07-11T10:00:00Z'),
      lifecycleRunNumber: 1,
    }),
    payload: { stages: ['design'], designerId: 25, reason: 'Добавить недостающие материалы' },
    now,
  });

  assert.strictEqual(plan.productUpdate.lifecycleRunNumber, 2);
  assert.strictEqual(plan.productUpdate.lifecycleRunReason, 'Добавить недостающие материалы');
  assert.strictEqual(plan.historyEntry.metadata.repeated, true);
}

function testRejectsRepeatedLifecycleWithoutReason() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 1, role: 'admin' },
        product: makeCatalogProduct({
          lifecycleStartedAt: new Date('2026-07-10T10:00:00Z'),
          lifecycleCompletedAt: new Date('2026-07-11T10:00:00Z'),
        }),
        payload: { stages: ['design'], designerId: 25 },
      }),
    /reason is required/i
  );
}

function testRejectsActiveLifecycle() {
  assert.throws(
    () => buildStartLifecyclePlan({
      actor: { id: 1, role: 'admin' },
      product: makeCatalogProduct({
        lifecycleStartedAt: new Date('2026-07-10T10:00:00Z'),
        lifecycleCompletedAt: null,
        lifecycleRoute: ['sale_launch'],
        lifecycleRouteIndex: 0,
      }),
      payload: { stages: ['marketplace'], reason: 'Повторное размещение' },
    }),
    /active lifecycle/i
  );
}

function testRejectsNonAdmin() {
  assert.throws(
    () =>
      buildStartLifecyclePlan({
        actor: { id: 2, role: 'marketplace_manager' },
        product: makeCatalogProduct(),
        payload: { stages: ['marketplace'] },
      }),
    /Only admin/
  );
}

function testBuildsBulkLifecyclePlan() {
  const now = new Date('2026-07-13T12:00:00Z');
  const plan = buildBulkStartLifecyclePlan({
    actor: { id: 1, role: 'admin' },
    productIds: [102, 101, 102],
    products: [makeCatalogProduct({ id: 101 }), makeCatalogProduct({ id: 102 })],
    payload: { stages: ['purchase'] },
    now,
  });

  assert.deepStrictEqual(plan.productIds, [102, 101]);
  assert.deepStrictEqual(plan.updates.map((item) => item.productId), [102, 101]);
  assert.strictEqual(plan.historyEntries.length, 2);
  assert.ok(plan.historyEntries.every((entry) => entry.createdAt === now));
  assert.deepStrictEqual(plan.updates[0].update.lifecycleRoute, ['purchase', 'warehouse']);
}

function testRejectsBulkPlanWhenOneProductIsNotLegacy() {
  assert.throws(
    () =>
      buildBulkStartLifecyclePlan({
        actor: { id: 1, role: 'admin' },
        productIds: [101, 102],
        products: [
          makeCatalogProduct({ id: 101 }),
          makeCatalogProduct({ id: 102, lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW }),
        ],
        payload: { stages: ['marketplace'] },
      }),
    /in sale/i
  );
}

testStartLegacyProductWithSelectedRoute();
testStartWithDesignerRequiresDesignerId();
testStartWithDesigner();
testRestartsCompletedLifecycleWithReason();
testRejectsRepeatedLifecycleWithoutReason();
testRejectsActiveLifecycle();
testRejectsNonAdmin();
testBuildsBulkLifecyclePlan();
testRejectsBulkPlanWhenOneProductIsNotLegacy();

console.log('Product lifecycle start service test passed');
