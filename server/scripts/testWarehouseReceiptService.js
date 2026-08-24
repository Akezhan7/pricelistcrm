const assert = require('assert');
const { buildWarehouseReceiptPlan } = require('../services/warehouseReceiptService');

function testUsesActualQuantitiesForFinalOrder() {
  const plan = buildWarehouseReceiptPlan({
    order: {
      totalAmount: 3000,
      paidAmount: 1000,
      items: [
        { id: 11, productId: 101, quantity: 1, priceAtPurchase: 1000 },
        { id: 12, productId: 102, quantity: 2, priceAtPurchase: 1000 },
      ],
    },
    items: [
      { orderItemId: 11, productId: 101, receivedQuantity: 3, notes: '' },
      { orderItemId: 12, productId: 102, receivedQuantity: 5, notes: 'Больше по факту' },
    ],
  });

  assert.strictEqual(plan.hasDiscrepancy, true);
  assert.strictEqual(plan.totalAmount, 8000);
  assert.strictEqual(plan.paymentStatus, 'Частично оплачено');
  assert.deepStrictEqual(plan.orderItemUpdates, [
    { id: 11, orderedQuantity: 1, quantity: 3, totalPrice: '3000.00' },
    { id: 12, orderedQuantity: 2, quantity: 5, totalPrice: '5000.00' },
  ]);
  assert.deepStrictEqual(plan.receiptItems[1], {
    orderItemId: 12,
    productId: 102,
    expectedQuantity: 2,
    receivedQuantity: 5,
    discrepancy: -3,
    notes: 'Больше по факту',
  });
}

function testRejectsIncompleteOrDuplicatedReceipt() {
  const order = {
    paidAmount: 0,
    items: [
      { id: 11, productId: 101, quantity: 1, priceAtPurchase: 1000 },
      { id: 12, productId: 102, quantity: 2, priceAtPurchase: 1000 },
    ],
  };

  assert.throws(() => buildWarehouseReceiptPlan({
    order,
    items: [{ orderItemId: 11, productId: 101, receivedQuantity: 1 }],
  }), /every order item/i);

  assert.throws(() => buildWarehouseReceiptPlan({
    order,
    items: [
      { orderItemId: 11, productId: 101, receivedQuantity: 1 },
      { orderItemId: 11, productId: 101, receivedQuantity: 1 },
    ],
  }), /duplicate/i);
}

function testRejectsUnaccountedOverpayment() {
  assert.throws(() => buildWarehouseReceiptPlan({
    order: {
      paidAmount: 1500,
      items: [{ id: 11, productId: 101, quantity: 2, priceAtPurchase: 1000 }],
    },
    items: [{ orderItemId: 11, productId: 101, receivedQuantity: 1 }],
  }), /already paid/i);
}

testUsesActualQuantitiesForFinalOrder();
testRejectsIncompleteOrDuplicatedReceipt();
testRejectsUnaccountedOverpayment();

console.log('Warehouse receipt service test passed');
