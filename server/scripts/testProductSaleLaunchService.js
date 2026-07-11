const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildSaleLaunchCompletionPlan,
  buildSaleLaunchUpdatePlan,
} = require('../services/productSaleLaunchService');

function testCompletesSaleLaunchWithOptionalFlagsDisabled() {
  const now = new Date('2026-07-10T14:00:00Z');
  const plan = buildSaleLaunchCompletionPlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: null,
    },
    kaspiListing: {
      id: 31,
      marketplace: 'kaspi',
      status: 'published',
    },
    actor: { id: 7, role: 'marketplace_manager' },
    payload: {
      advertisingStarted: true,
      promotionStarted: false,
      reviewBonusEnabled: false,
      notes: ' Реклама нужна, остальное позже ',
    },
    now,
  });

  assert.deepStrictEqual(plan.launchFlags, {
    productId: 15,
    advertisingStarted: true,
    promotionStarted: false,
    reviewBonusEnabled: false,
    notes: 'Реклама нужна, остальное позже',
    updatedBy: 7,
    completedBy: 7,
    completedAt: now,
  });
  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleCompletedAt: now,
    marketplaceManagerId: 7,
    assignedToUserId: 7,
  });
  assert.deepStrictEqual(plan.marketplaceListingUpdate, {
    status: 'in_sale',
    managedBy: 7,
  });
  assert.strictEqual(plan.history.actionType, 'sale_launch_completed');
}

function testRejectsRepeatedSaleLaunchCompletion() {
  assert.throws(
    () => buildSaleLaunchCompletionPlan({
      product: {
        id: 15,
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
        lifecycleCompletedAt: new Date('2026-07-10T14:00:00Z'),
      },
      kaspiListing: { id: 31, marketplace: 'kaspi', status: 'in_sale' },
      actor: { id: 7, role: 'marketplace_manager' },
      payload: {
        advertisingStarted: false,
        promotionStarted: false,
        reviewBonusEnabled: false,
      },
    }),
    /already completed/i
  );
}

function testBuildsPostCompletionFlagUpdate() {
  const now = new Date('2026-07-11T09:00:00Z');
  const completedAt = new Date('2026-07-10T14:00:00Z');
  const plan = buildSaleLaunchUpdatePlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: completedAt,
    },
    launchFlags: {
      advertisingStarted: true,
      promotionStarted: false,
      reviewBonusEnabled: false,
      notes: 'Реклама нужна, остальное позже',
      completedAt,
      completedBy: 7,
    },
    actor: { id: 8, role: 'admin' },
    payload: {
      advertisingStarted: true,
      promotionStarted: true,
      reviewBonusEnabled: false,
      notes: 'Акция подключена',
    },
    now,
  });

  assert.deepStrictEqual(plan.launchFlagsUpdate, {
    advertisingStarted: true,
    promotionStarted: true,
    reviewBonusEnabled: false,
    notes: 'Акция подключена',
    updatedBy: 8,
  });
  assert.deepStrictEqual(plan.productUpdate, {
    marketplaceManagerId: 8,
    assignedToUserId: 8,
  });
  assert.deepStrictEqual(plan.changedFields, ['promotionStarted', 'notes']);
  assert.strictEqual(plan.history.actionType, 'sale_flags_updated');
  assert.strictEqual(plan.history.fromStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.strictEqual(plan.history.toStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
}

testCompletesSaleLaunchWithOptionalFlagsDisabled();
testRejectsRepeatedSaleLaunchCompletion();
testBuildsPostCompletionFlagUpdate();

console.log('Product sale launch service test passed');
