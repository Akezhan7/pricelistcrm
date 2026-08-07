const ORDER_STATUSES = [
  'Создана',
  'Отправлена поставщику',
  'Частично подтверждена',
  'Подтверждена',
  'Доставка',
  'В сборе',
  'Забрана',
  'Принята на складе',
  'Закрыта',
  'Отменена',
];

const WORKING_STATUSES = ORDER_STATUSES.slice(0, 7);
const DEBT_STATUSES = ['Принята на складе', 'Закрыта'];
const TERMINAL_STATUSES = ['Закрыта', 'Отменена'];
const STATUS_MANAGEMENT_ROLES = ['admin', 'purchase_manager'];
const WAREHOUSE_RECEIPT_ROLES = ['admin', 'purchase_manager', 'warehouse_operator'];

function getAvailableStatusTransitions(currentStatus, role) {
  if (!STATUS_MANAGEMENT_ROLES.includes(role) || TERMINAL_STATUSES.includes(currentStatus)) {
    return [];
  }

  if (currentStatus === 'Принята на складе') return ['Закрыта'];

  return [
    ...WORKING_STATUSES.filter((status) => status !== currentStatus),
    'Закрыта',
    'Отменена',
  ];
}

function assertStatusTransitionAllowed(currentStatus, nextStatus, role) {
  if (nextStatus === 'Принята на складе') {
    const error = new Error('Warehouse receipt is required for this status');
    error.code = 'WAREHOUSE_RECEIPT_REQUIRED';
    error.statusCode = 409;
    throw error;
  }

  if (getAvailableStatusTransitions(currentStatus, role).includes(nextStatus)) return;

  const error = new Error(`Status transition from "${currentStatus}" to "${nextStatus}" is not allowed`);
  error.code = 'ORDER_STATUS_TRANSITION_NOT_ALLOWED';
  error.statusCode = 409;
  throw error;
}

function canReceiveAtWarehouse(currentStatus, role) {
  return WAREHOUSE_RECEIPT_ROLES.includes(role) && WORKING_STATUSES.includes(currentStatus);
}

function isDebtStatus(status) {
  return DEBT_STATUSES.includes(status);
}

function assertOrderWorkflowOpen(order) {
  if (!TERMINAL_STATUSES.includes(order?.status)) return;

  const error = new Error('Order workflow is already closed');
  error.code = 'ORDER_WORKFLOW_CLOSED';
  error.statusCode = 409;
  throw error;
}

module.exports = {
  ORDER_STATUSES,
  WORKING_STATUSES,
  DEBT_STATUSES,
  TERMINAL_STATUSES,
  getAvailableStatusTransitions,
  assertStatusTransitionAllowed,
  canReceiveAtWarehouse,
  isDebtStatus,
  assertOrderWorkflowOpen,
};
