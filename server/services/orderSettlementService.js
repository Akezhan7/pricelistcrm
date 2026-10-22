const { DEBT_STATUSES } = require('./orderStatusPolicyService');

const ORDER_SETTLEMENT_TYPES = Object.freeze({
  STANDARD: 'standard',
  CONSIGNMENT: 'consignment',
});

const SETTLEMENT_MANAGEMENT_ROLES = Object.freeze([
  'admin',
  'purchase_manager',
  'accountant',
]);

function inputError(message, statusCode = 400) {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  return error;
}

function normalizeSettlementType(orderType, value) {
  const normalized = value || ORDER_SETTLEMENT_TYPES.STANDARD;
  if (!Object.values(ORDER_SETTLEMENT_TYPES).includes(normalized)) {
    throw inputError('Unknown settlement type');
  }
  if (orderType === 'return' && normalized !== ORDER_SETTLEMENT_TYPES.STANDARD) {
    throw inputError('Consignment settlement is available only for purchase orders');
  }
  return normalized;
}

function calculateOrderDebtContribution(order = {}) {
  if (order.isActive === false || !DEBT_STATUSES.includes(order.status)) return 0;

  const totalAmount = Number(order.totalAmount);
  const paidAmount = Number(order.paidAmount || 0);
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    throw inputError('Order total amount is invalid');
  }
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw inputError('Order paid amount is invalid');
  }

  if (order.type === 'return') return -totalAmount;
  return Math.max(0, totalAmount - paidAmount);
}

function calculateSupplierBalance({ orders = [], payments = [], adjustments = [] } = {}) {
  const orderBalance = orders.reduce((sum, order) => {
    if (order.isActive === false || !DEBT_STATUSES.includes(order.status)) return sum;
    const totalAmount = Number(order.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw inputError('Order total amount is invalid');
    }
    return sum + (order.type === 'return' ? -totalAmount : totalAmount);
  }, 0);

  const paymentBalance = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw inputError('Payment amount is invalid');
    }
    return sum + amount;
  }, 0);

  const adjustmentBalance = adjustments.reduce((sum, adjustment) => {
    const amount = Number(adjustment.amount);
    if (!Number.isFinite(amount)) {
      throw inputError('Adjustment amount is invalid');
    }
    return sum + amount;
  }, 0);

  return Number((orderBalance - paymentBalance + adjustmentBalance).toFixed(2));
}

const MAX_ADJUSTMENT_COMMENT_LENGTH = 1000;

/**
 * Ручная поправка баланса поставщика: пользователь задаёт итоговую сумму,
 * а в журнал пишется разница. Положительный баланс — мы должны поставщику,
 * отрицательный — аванс у поставщика.
 */
function buildBalanceAdjustmentPlan({
  actor,
  supplierId,
  currentBalance,
  targetBalance,
  comment,
} = {}) {
  if (actor?.role !== 'admin' || actor?.canAdjustSupplierBalance !== true) {
    throw inputError('Balance adjustment is not permitted for this user', 403);
  }

  const target = typeof targetBalance === 'string' && targetBalance.trim() === ''
    ? NaN
    : Number(targetBalance);
  if (!Number.isFinite(target)) {
    throw inputError('Target balance is invalid');
  }

  const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
  if (!normalizedComment) {
    throw inputError('Comment is required');
  }
  if (normalizedComment.length > MAX_ADJUSTMENT_COMMENT_LENGTH) {
    throw inputError(`Comment must not exceed ${MAX_ADJUSTMENT_COMMENT_LENGTH} characters`);
  }

  const balanceBefore = Number(Number(currentBalance).toFixed(2));
  const balanceAfter = Number(target.toFixed(2));
  const amount = Number((balanceAfter - balanceBefore).toFixed(2));
  if (amount === 0) {
    throw inputError('Supplier balance already equals this amount');
  }

  return {
    supplierId: Number(supplierId),
    amount,
    balanceBefore,
    balanceAfter,
    comment: normalizedComment,
    createdBy: Number(actor.id),
  };
}

function buildSettlementChange({
  order,
  actor,
  settlementType,
  comment,
} = {}) {
  if (!actor?.id || !SETTLEMENT_MANAGEMENT_ROLES.includes(actor.role)) {
    throw inputError('Settlement change is not permitted for this role', 403);
  }
  if (!order || order.type !== 'purchase') {
    throw inputError('Settlement can be changed only for purchase orders');
  }
  if (!DEBT_STATUSES.includes(order.status)) {
    throw inputError('Settlement can be changed only for a received order');
  }

  const oldSettlementType = normalizeSettlementType(order.type, order.settlementType);
  const newSettlementType = normalizeSettlementType(order.type, settlementType);
  if (oldSettlementType === newSettlementType) {
    throw inputError('The order already has this settlement type');
  }

  const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
  return {
    oldSettlementType,
    newSettlementType,
    changedBy: Number(actor.id),
    comment: normalizedComment || null,
  };
}

module.exports = {
  ORDER_SETTLEMENT_TYPES,
  buildBalanceAdjustmentPlan,
  SETTLEMENT_MANAGEMENT_ROLES,
  buildSettlementChange,
  calculateOrderDebtContribution,
  calculateSupplierBalance,
  normalizeSettlementType,
};
