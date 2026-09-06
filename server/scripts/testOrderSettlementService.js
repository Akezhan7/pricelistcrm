const assert = require('assert');

const {
  ORDER_SETTLEMENT_TYPES,
  buildSettlementChange,
  calculateOrderDebtContribution,
  calculateSupplierBalance,
  normalizeSettlementType,
} = require('../services/orderSettlementService');

function testDebtContribution() {
  assert.strictEqual(calculateOrderDebtContribution({
    type: 'purchase',
    status: 'Создана',
    totalAmount: 1000,
    paidAmount: 0,
    settlementType: ORDER_SETTLEMENT_TYPES.CONSIGNMENT,
    isActive: true,
  }), 0);

  assert.strictEqual(calculateOrderDebtContribution({
    type: 'purchase',
    status: 'Принята на складе',
    totalAmount: 1000,
    paidAmount: 0,
    settlementType: ORDER_SETTLEMENT_TYPES.CONSIGNMENT,
    isActive: true,
  }), 1000);

  assert.strictEqual(calculateOrderDebtContribution({
    type: 'purchase',
    status: 'Закрыта',
    totalAmount: 1000,
    paidAmount: 350,
    settlementType: ORDER_SETTLEMENT_TYPES.CONSIGNMENT,
    isActive: true,
  }), 650);

  assert.strictEqual(calculateOrderDebtContribution({
    type: 'purchase',
    status: 'Закрыта',
    totalAmount: 1000,
    paidAmount: 1000,
    settlementType: ORDER_SETTLEMENT_TYPES.STANDARD,
    isActive: true,
  }), 0);

  assert.strictEqual(calculateOrderDebtContribution({
    type: 'purchase',
    status: 'Отменена',
    totalAmount: 1000,
    paidAmount: 0,
    settlementType: ORDER_SETTLEMENT_TYPES.CONSIGNMENT,
    isActive: true,
  }), 0);

  assert.strictEqual(calculateOrderDebtContribution({
    type: 'return',
    status: 'Закрыта',
    totalAmount: 200,
    paidAmount: 0,
    settlementType: ORDER_SETTLEMENT_TYPES.STANDARD,
    isActive: true,
  }), -200);
}

function testSignedSupplierBalanceIncludesUnallocatedAdvance() {
  assert.strictEqual(calculateSupplierBalance({
    orders: [
      { type: 'purchase', status: 'Закрыта', totalAmount: 4950, isActive: true },
    ],
    payments: [{ amount: 100000 }],
  }), -95050);

  assert.strictEqual(calculateSupplierBalance({
    orders: [
      { type: 'purchase', status: 'Закрыта', totalAmount: 120000, isActive: true },
      { type: 'return', status: 'Закрыта', totalAmount: 5000, isActive: true },
    ],
    payments: [{ amount: 15000 }],
  }), 100000);
}

function testSettlementValidation() {
  assert.strictEqual(
    normalizeSettlementType('purchase', 'consignment'),
    ORDER_SETTLEMENT_TYPES.CONSIGNMENT
  );
  assert.throws(
    () => normalizeSettlementType('return', 'consignment'),
    /purchase orders/
  );

  assert.deepStrictEqual(
    buildSettlementChange({
      order: {
        type: 'purchase',
        status: 'Принята на складе',
        settlementType: 'standard',
      },
      actor: { id: 5, role: 'accountant' },
      settlementType: 'consignment',
      comment: '  Оплата после реализации  ',
    }),
    {
      oldSettlementType: 'standard',
      newSettlementType: 'consignment',
      changedBy: 5,
      comment: 'Оплата после реализации',
    }
  );

  assert.throws(
    () => buildSettlementChange({
      order: { type: 'purchase', status: 'Доставка', settlementType: 'standard' },
      actor: { id: 1, role: 'admin' },
      settlementType: 'consignment',
    }),
    /received order/
  );
}

testDebtContribution();
testSignedSupplierBalanceIncludesUnallocatedAdvance();
testSettlementValidation();
console.log('Order settlement service test passed');
