const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildLifecyclePurchasePlan,
  buildLifecycleArrivalReconciliationPlan,
  buildWarehouseCompletionPlan,
} = require('../services/productLifecyclePurchaseService');

function testBuildsLifecyclePurchasePlan() {
  const now = new Date('2026-07-10T08:00:00Z');
  const plan = buildLifecyclePurchasePlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    },
    actor: { id: 7, role: 'purchase_manager' },
    payload: {
      supplierId: '4',
      quantity: '12',
      purchasePrice: '2490.50',
      expectedDeliveryDate: '2026-07-14',
      notes: ' Первая партия ',
    },
    orderNumber: 'ORD-260710-001',
    now,
  });

  assert.deepStrictEqual(plan.order, {
    orderNumber: 'ORD-260710-001',
    supplierId: 4,
    type: 'purchase',
    expectedDeliveryDate: '2026-07-14',
    deliveryLocation: 'Точка Байсад',
    totalAmount: 29886,
    paidAmount: 0,
    status: 'Создана',
    paymentStatus: 'Не оплачено',
    notes: 'Первая партия',
    createdBy: 7,
    isActive: true,
  });
  assert.deepStrictEqual(plan.orderItem, {
    productId: 15,
    quantity: 12,
    priceAtPurchase: 2490.5,
    totalPrice: 29886,
    notes: 'Первая партия',
  });
  assert.strictEqual(plan.purchase.supplierId, 4);
  assert.strictEqual(plan.purchase.purchasedBy, 7);
  assert.strictEqual(plan.purchase.purchasedAt, now);
  assert.strictEqual(plan.history.actionType, 'purchase_marked');
}

function testBuildsWarehouseCompletionPlan() {
  const now = new Date('2026-07-10T12:00:00Z');
  const plan = buildWarehouseCompletionPlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
      costPrice: '2490.50',
      marketplaceManagerId: 20,
    },
    actor: { id: 8, role: 'warehouse_operator' },
    payload: {
      sector: ' A ',
      shelf: ' 03 ',
      cell: ' 12 ',
      weight: '0.45',
      length: '20',
      width: '12.5',
      height: '8',
      costPrice: '2550',
      notes: ' Верхняя полка ',
    },
    now,
  });

  assert.deepStrictEqual(plan.warehouseDetails, {
    productId: 15,
    sector: 'A',
    shelf: '03',
    cell: '12',
    weight: 0.45,
    length: 20,
    width: 12.5,
    height: 8,
    notes: 'Верхняя полка',
    updatedBy: 8,
  });
  assert.deepStrictEqual(plan.productUpdate, {
    costPrice: 2550,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
    lifecycleCompletedAt: null,
    assignedToUserId: 20,
  });
  assert.strictEqual(plan.priceHistory.oldPrice, 2490.5);
  assert.strictEqual(plan.priceHistory.newPrice, 2550);
  assert.strictEqual(plan.history.actionType, 'warehouse_completed');
}

function testWarehouseCompletionRequiresCompletePassport() {
  const plan = buildWarehouseCompletionPlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
      costPrice: 2490,
    },
    actor: { id: 8, role: 'warehouse_operator' },
    payload: {
      sector: 'A',
      shelf: '03',
      cell: '12',
    },
  });

  assert.strictEqual(plan.warehouseDetails.weight, null);
  assert.strictEqual(plan.warehouseDetails.length, null);
  assert.strictEqual(plan.warehouseDetails.width, null);
  assert.strictEqual(plan.warehouseDetails.height, null);
}

function testReconcilesDocumentedArrivalWithoutAddingStockAgain() {
  const receivedAt = new Date('2026-09-08T11:00:00Z');
  const plan = buildLifecycleArrivalReconciliationPlan({
    product: {
      id: 15,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      currentStock: 11,
    },
    lifecyclePurchase: {
      id: 9,
      productId: 15,
      orderId: 22,
      orderItemId: 31,
      arrivedAt: null,
    },
    receipt: { id: 44, receivedAt, receivedBy: 7 },
    receiptItem: {
      orderItemId: 31,
      productId: 15,
      receivedQuantity: 11,
    },
    actor: { id: 8, role: 'admin' },
  });

  assert.deepStrictEqual(plan.productUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
    lifecycleCompletedAt: null,
    assignedToUserId: null,
  });
  assert.deepStrictEqual(plan.purchaseUpdate, {
    receivedQuantity: 11,
    warehouseReceiptId: 44,
    arrivedAt: receivedAt,
    arrivedBy: 7,
  });
  assert.strictEqual(plan.history.metadata.stockAdjusted, false);
  assert.strictEqual(Object.hasOwn(plan.productUpdate, 'currentStock'), false);
}

testBuildsLifecyclePurchasePlan();
testBuildsWarehouseCompletionPlan();
testWarehouseCompletionRequiresCompletePassport();
testReconcilesDocumentedArrivalWithoutAddingStockAgain();

console.log('Product lifecycle purchase service test passed');
