const assert = require('assert');
const {
  buildOrderItemSyncPlan,
} = require('../services/orderItemSyncService');

function testUpdatesLifecycleLinkedItemInPlaceAndAddsNewItems() {
  const plan = buildOrderItemSyncPlan({
    orderId: 42,
    existingItems: [
      { id: 66, productId: 10, productVariationId: null },
      { id: 67, productId: 11, productVariationId: null },
    ],
    lifecyclePurchases: [
      { id: 5, orderItemId: 66, productId: 10 },
    ],
    incomingItems: [
      {
        id: 66,
        productId: 10,
        quantity: 3,
        priceAtPurchase: 1200,
        notes: 'updated lifecycle row',
      },
      {
        productId: 12,
        quantity: 2,
        priceAtPurchase: 800,
        notes: 'new row',
      },
    ],
  });

  assert.deepStrictEqual(plan.deleteIds, [67]);
  assert.strictEqual(plan.updates.length, 1);
  assert.strictEqual(plan.updates[0].id, 66);
  assert.deepStrictEqual(plan.updates[0].data, {
    productId: 10,
    productVariationId: null,
    quantity: 3,
    priceAtPurchase: 1200,
    totalPrice: '3600.00',
    notes: 'updated lifecycle row',
  });
  assert.deepStrictEqual(plan.lifecyclePurchaseUpdates, [
    {
      id: 5,
      data: {
        quantity: 3,
        purchasePrice: 1200,
        notes: 'updated lifecycle row',
      },
    },
  ]);
  assert.deepStrictEqual(plan.creates, [
    {
      orderId: 42,
      productId: 12,
      productVariationId: null,
      quantity: 2,
      priceAtPurchase: 800,
      totalPrice: '1600.00',
      notes: 'new row',
    },
  ]);
  assert.strictEqual(plan.totalAmount, '5200.00');
}

function testMatchesLifecycleItemByProductWhenClientDoesNotSendOrderItemId() {
  const plan = buildOrderItemSyncPlan({
    orderId: 42,
    existingItems: [{ id: 66, productId: 10, productVariationId: null }],
    lifecyclePurchases: [{ id: 5, orderItemId: 66, productId: 10 }],
    incomingItems: [
      {
        productId: 10,
        quantity: 4,
        priceAtPurchase: 500,
      },
    ],
  });

  assert.deepStrictEqual(plan.deleteIds, []);
  assert.strictEqual(plan.creates.length, 0);
  assert.strictEqual(plan.updates[0].id, 66);
  assert.strictEqual(plan.lifecyclePurchaseUpdates[0].data.quantity, 4);
  assert.strictEqual(plan.totalAmount, '2000.00');
}

function testRejectsLifecycleLinkedItemDeletion() {
  assert.throws(
    () =>
      buildOrderItemSyncPlan({
        orderId: 42,
        existingItems: [{ id: 66, productId: 10, productVariationId: null }],
        lifecyclePurchases: [{ id: 5, orderItemId: 66, productId: 10 }],
        incomingItems: [
          {
            productId: 12,
            quantity: 1,
            priceAtPurchase: 100,
          },
        ],
      }),
    /Cannot delete lifecycle-linked order item/
  );
}

testUpdatesLifecycleLinkedItemInPlaceAndAddsNewItems();
testMatchesLifecycleItemByProductWhenClientDoesNotSendOrderItemId();
testRejectsLifecycleLinkedItemDeletion();

console.log('Order item sync service test passed');
