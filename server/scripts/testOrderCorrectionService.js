const assert = require('assert');
const {
  buildOrderEditPolicy,
  buildReceivedOrderCorrectionPlan,
} = require('../services/orderCorrectionService');

function testEditPolicyUsesDocumentsInsteadOfStatusAlone() {
  assert.deepStrictEqual(
    buildOrderEditPolicy({ status: 'Доставка', receiptCount: 0, paymentCount: 0, role: 'purchase_manager' }),
    {
      mode: 'edit',
      canEdit: true,
      canDelete: false,
      requiresReason: false,
      reason: null,
      hasReceipts: false,
      hasPayments: false,
    }
  );

  assert.strictEqual(
    buildOrderEditPolicy({ status: 'Принята на складе', receiptCount: 1, paymentCount: 1, role: 'admin' }).mode,
    'correction'
  );
  assert.strictEqual(
    buildOrderEditPolicy({ status: 'Принята на складе', receiptCount: 1, paymentCount: 0, role: 'purchase_manager' }).canEdit,
    false
  );
  assert.strictEqual(
    buildOrderEditPolicy({ status: 'Создана', receiptCount: 0, paymentCount: 0, role: 'admin' }).canDelete,
    true
  );
}

function testPriceCorrectionDoesNotChangeStockAndShowsOverpayment() {
  const plan = buildReceivedOrderCorrectionPlan({
    reason: 'Поставщик уточнил итоговую цену',
    paidAmount: 2500,
    existingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 2, priceAtPurchase: 1500, notes: null },
    ],
    incomingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 2, priceAtPurchase: 1000, notes: null },
    ],
    products: [{ id: 100, currentStock: 5 }],
  });

  assert.strictEqual(plan.totalAmount, '2000.00');
  assert.strictEqual(plan.paymentStatus, 'Оплачено');
  assert.strictEqual(plan.overpaymentAmount, '500.00');
  assert.deepStrictEqual(plan.stockChanges, []);
}

function testQuantityCorrectionPostsOnlyStockDeltaAndAllowsExtraProduct() {
  const plan = buildReceivedOrderCorrectionPlan({
    reason: 'Исправлена фактическая приёмка',
    paidAmount: 0,
    existingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 5, priceAtPurchase: 100, notes: null },
      { id: 11, productId: 101, productVariationId: null, quantity: 3, priceAtPurchase: 200, notes: null },
    ],
    incomingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 2, priceAtPurchase: 100, notes: null },
      { productId: 102, productVariationId: null, quantity: 4, priceAtPurchase: 50, notes: 'Добавлено по факту' },
    ],
    products: [
      { id: 100, currentStock: 7 },
      { id: 101, currentStock: 3 },
      { id: 102, currentStock: 1 },
    ],
  });

  assert.deepStrictEqual(plan.stockChanges, [
    { productId: 100, delta: -3, oldStock: 7, newStock: 4 },
    { productId: 101, delta: -3, oldStock: 3, newStock: 0 },
    { productId: 102, delta: 4, oldStock: 1, newStock: 5 },
  ]);
  assert.strictEqual(plan.updates.find((item) => item.id === 11).data.quantity, 0);
  assert.strictEqual(plan.creates[0].data.orderedQuantity, 0);
  assert.strictEqual(plan.totalAmount, '400.00');
}

function testRejectsCorrectionThatWouldMakeStockNegative() {
  assert.throws(() => buildReceivedOrderCorrectionPlan({
    reason: 'Исправление количества',
    paidAmount: 0,
    existingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 5, priceAtPurchase: 100 },
    ],
    incomingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 1, priceAtPurchase: 100 },
    ],
    products: [{ id: 100, currentStock: 2 }],
  }), /Недостаточно остатка/);
}

function testRequiresReasonAndDoesNotReplaceExistingProduct() {
  const input = {
    paidAmount: 0,
    existingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 1, priceAtPurchase: 100 },
    ],
    incomingItems: [
      { id: 10, productId: 101, productVariationId: null, quantity: 1, priceAtPurchase: 100 },
    ],
    products: [{ id: 100, currentStock: 1 }, { id: 101, currentStock: 1 }],
  };

  assert.throws(() => buildReceivedOrderCorrectionPlan({ ...input, reason: '' }), /Причина/);
  assert.throws(
    () => buildReceivedOrderCorrectionPlan({ ...input, reason: 'Замена ошибочной позиции' }),
    /нельзя заменить/
  );
}

function testAllowsDetailsOnlyCorrectionWhenControllerDetectedAChange() {
  const plan = buildReceivedOrderCorrectionPlan({
    reason: 'Уточнён комментарий к поставке',
    paidAmount: 0,
    allowNoItemChanges: true,
    existingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 1, priceAtPurchase: 100, notes: null },
    ],
    incomingItems: [
      { id: 10, productId: 100, productVariationId: null, quantity: 1, priceAtPurchase: 100, notes: null },
    ],
    products: [{ id: 100, currentStock: 1 }],
  });

  assert.deepStrictEqual(plan.stockChanges, []);
  assert.strictEqual(plan.totalAmount, '100.00');
}

testEditPolicyUsesDocumentsInsteadOfStatusAlone();
testPriceCorrectionDoesNotChangeStockAndShowsOverpayment();
testQuantityCorrectionPostsOnlyStockDeltaAndAllowsExtraProduct();
testRejectsCorrectionThatWouldMakeStockNegative();
testRequiresReasonAndDoesNotReplaceExistingProduct();
testAllowsDetailsOnlyCorrectionWhenControllerDetectedAChange();

console.log('Order correction service test passed');
