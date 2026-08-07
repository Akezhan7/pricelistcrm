const assert = require('assert');
const {
  ORDER_STATUSES,
  DEBT_STATUSES,
  getAvailableStatusTransitions,
  assertStatusTransitionAllowed,
  canReceiveAtWarehouse,
  assertOrderWorkflowOpen,
} = require('../services/orderStatusPolicyService');

assert(ORDER_STATUSES.includes('Отменена'));
assert.deepStrictEqual(DEBT_STATUSES, ['Принята на складе', 'Закрыта']);

const purchaseManagerTransitions = getAvailableStatusTransitions('Создана', 'purchase_manager');
assert(purchaseManagerTransitions.includes('Подтверждена'));
assert(purchaseManagerTransitions.includes('Доставка'));
assert(purchaseManagerTransitions.includes('Закрыта'));
assert(purchaseManagerTransitions.includes('Отменена'));
assert(!purchaseManagerTransitions.includes('Принята на складе'));

assert.deepStrictEqual(getAvailableStatusTransitions('Принята на складе', 'admin'), ['Закрыта']);
assert.deepStrictEqual(getAvailableStatusTransitions('Закрыта', 'admin'), []);
assert.deepStrictEqual(getAvailableStatusTransitions('Отменена', 'admin'), []);

assert.doesNotThrow(() => assertStatusTransitionAllowed('Создана', 'Доставка', 'admin'));
assert.throws(
  () => assertStatusTransitionAllowed('Забрана', 'Принята на складе', 'admin'),
  (error) => error.code === 'WAREHOUSE_RECEIPT_REQUIRED'
);

assert.strictEqual(canReceiveAtWarehouse('Создана', 'purchase_manager'), true);
assert.strictEqual(canReceiveAtWarehouse('Забрана', 'warehouse_operator'), true);
assert.strictEqual(canReceiveAtWarehouse('Принята на складе', 'admin'), false);
assert.strictEqual(canReceiveAtWarehouse('Отменена', 'admin'), false);
assert.strictEqual(canReceiveAtWarehouse('Забрана', 'accountant'), false);
assert.doesNotThrow(() => assertOrderWorkflowOpen({ status: 'Доставка' }));
assert.throws(
  () => assertOrderWorkflowOpen({ status: 'Отменена' }),
  (error) => error.code === 'ORDER_WORKFLOW_CLOSED'
);

console.log('Order status policy service test passed');
