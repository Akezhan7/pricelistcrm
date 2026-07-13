const assert = require('assert');
const {
  buildBulkLifecyclePurchasePlan,
} = require('../services/productLifecycleBulkPurchaseService');
const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');

function makeProduct({ id, supplierId = 10, supplierPrice = 1000, lifecyclePurchase = null }) {
  return {
    id,
    name: `Product ${id}`,
    article: `P-${id}`,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
    lifecyclePurchase,
    suppliers: [
      {
        id: supplierId,
        ProductSupplier: {
          supplierPrice,
          isAvailable: true,
        },
      },
    ],
  };
}

function run() {
  const now = new Date('2026-07-12T08:00:00Z');
  const actor = { id: 7, role: 'purchase_manager' };
  const products = [
    makeProduct({ id: 101, supplierPrice: 1200 }),
    makeProduct({ id: 102, supplierPrice: 2200 }),
  ];

  const plan = buildBulkLifecyclePurchasePlan({
    products,
    actor,
    orderNumber: 'ORD-0001',
    now,
    payload: {
      supplierId: 10,
      expectedDeliveryDate: '2026-07-20',
      deliveryLocation: 'Main warehouse',
      notes: 'Bulk launch purchase',
      items: [
        { productId: 101, quantity: 2, purchasePrice: 1300, notes: 'First item' },
        { productId: 102, quantity: 3 },
      ],
    },
  });

  assert.strictEqual(plan.order.orderNumber, 'ORD-0001');
  assert.strictEqual(plan.order.supplierId, 10);
  assert.strictEqual(plan.order.totalAmount, 9200);
  assert.strictEqual(plan.orderItems.length, 2);
  assert.deepStrictEqual(plan.orderItems.map((item) => item.productId), [101, 102]);
  assert.strictEqual(plan.orderItems[0].quantity, 2);
  assert.strictEqual(plan.orderItems[0].priceAtPurchase, 1300);
  assert.strictEqual(plan.orderItems[0].totalPrice, 2600);
  assert.strictEqual(plan.orderItems[1].quantity, 3);
  assert.strictEqual(plan.orderItems[1].priceAtPurchase, 2200);
  assert.strictEqual(plan.orderItems[1].totalPrice, 6600);
  assert.strictEqual(plan.purchases.length, 2);
  assert.deepStrictEqual(plan.purchases.map((purchase) => purchase.productId), [101, 102]);
  assert.strictEqual(plan.purchases[0].purchasePrice, 1300);
  assert.strictEqual(plan.purchases[1].purchasePrice, 2200);
  assert.strictEqual(plan.histories.length, 2);
  assert.strictEqual(plan.histories[0].metadata.bulkPurchase, true);

  assert.throws(
    () => buildBulkLifecyclePurchasePlan({
      products: [makeProduct({ id: 103, supplierId: 11 })],
      actor,
      orderNumber: 'ORD-0002',
      payload: {
        supplierId: 10,
        items: [{ productId: 103, quantity: 1, purchasePrice: 500 }],
      },
    }),
    /supplier is not linked/i
  );

  assert.throws(
    () => buildBulkLifecyclePurchasePlan({
      products: [makeProduct({ id: 104, lifecyclePurchase: { id: 99 } })],
      actor,
      orderNumber: 'ORD-0003',
      payload: {
        supplierId: 10,
        items: [{ productId: 104, quantity: 1, purchasePrice: 500 }],
      },
    }),
    /already purchased/i
  );

  console.log('Product lifecycle bulk purchase service test passed');
}

run();
