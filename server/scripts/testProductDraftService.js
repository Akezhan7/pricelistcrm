const assert = require('assert');

const { PRODUCT_LIFECYCLE_STATUSES } = require('../constants/productLifecycle');
const {
  buildNewProductLifecycleData,
  buildProductDraftData,
} = require('../services/productDraftService');

function testBuildNewProductLifecycleData() {
  const createdAt = new Date('2026-08-22T12:00:00Z');

  assert.deepStrictEqual(
    buildNewProductLifecycleData({ actorId: 42, now: createdAt }),
    {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
      lifecycleStartedAt: createdAt,
      lifecycleCompletedAt: null,
      assignedToUserId: null,
      designerId: null,
      reviewedByUserId: null,
      kpiWeight: null,
      createdByUserId: 42,
    }
  );
}

function runProductDraftServiceTest() {
  const createdAt = new Date('2026-07-07T12:00:00Z');

  const draft = buildProductDraftData({
    name: 'Test draft product',
    costPrice: '1250.50',
    comment: 'Found at supplier stand',
    imagePath: '/uploads/test.jpg',
    actorId: 42,
    now: createdAt,
    sequence: 9,
  });

  assert.deepStrictEqual(draft, {
    name: 'Test draft product',
    article: 'DRAFT-20260707-0009',
    costPrice: 1250.5,
    sellingPrice: 0,
    image: '/uploads/test.jpg',
    description: null,
    internalName: 'Test draft product',
    currentStock: 0,
    minStock: 0,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
    lifecycleStartedAt: createdAt,
    lifecycleCompletedAt: null,
    assignedToUserId: null,
    designerId: null,
    reviewedByUserId: null,
    kpiWeight: null,
    createdByUserId: 42,
    launchNotes: 'Found at supplier stand',
  });

  assert.throws(
    () =>
      buildProductDraftData({
        name: '',
        costPrice: '100',
        actorId: 42,
        sequence: 1,
      }),
    /name is required/i
  );

  assert.throws(
    () =>
      buildProductDraftData({
        name: 'Draft',
        costPrice: '-1',
        actorId: 42,
        sequence: 1,
      }),
    /costPrice must be a non-negative number/i
  );
}

testBuildNewProductLifecycleData();
runProductDraftServiceTest();
console.log('Product draft service test passed');
