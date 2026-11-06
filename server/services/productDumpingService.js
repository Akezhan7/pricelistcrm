const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  canPerformLifecycleAction,
} = require('../constants/productLifecycle');
const {
  PRODUCT_PERMISSION_ACTIONS,
  assertProductActionAllowed,
} = require('../constants/productPermissions');
const { PRODUCT_ACTION_TYPES } = require('../constants/productHistory');
const {
  LIFECYCLE_ROUTE_STAGES,
  buildLifecycleStageCompletionUpdate,
  withLifecycleRunMetadata,
} = require('./productLifecycleRouteService');

function inputError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function conflictError(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function normalizeNotes(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function parsePrice(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw inputError(`${fieldName} должна быть больше нуля`);
  }
  return Math.round(parsed * 100) / 100;
}

function toNumberOrNull(value) {
  return value === undefined || value === null ? null : Number(value);
}

/**
 * Merges the payload over the stored record and validates the resulting
 * price corridor. A field absent from the payload keeps its stored value.
 */
function resolveDumpingValues({ dumping, payload }) {
  const has = (field) => Object.prototype.hasOwnProperty.call(payload, field);
  const minPrice = has('minPrice') ? parsePrice(payload.minPrice, 'Минимальная цена') : toNumberOrNull(dumping?.minPrice);
  const maxPrice = has('maxPrice') ? parsePrice(payload.maxPrice, 'Максимальная цена') : toNumberOrNull(dumping?.maxPrice);
  const notes = has('notes') ? normalizeNotes(payload.notes) : normalizeNotes(dumping?.notes);

  if (minPrice === null || maxPrice === null) {
    throw inputError('Укажите минимальную и максимальную цену');
  }
  if (minPrice > maxPrice) {
    throw inputError('Минимальная цена не может быть больше максимальной');
  }

  return { minPrice, maxPrice, notes };
}

function listChangedFields(dumping, values) {
  return [
    ...(toNumberOrNull(dumping?.minPrice) !== values.minPrice ? ['minPrice'] : []),
    ...(toNumberOrNull(dumping?.maxPrice) !== values.maxPrice ? ['maxPrice'] : []),
    ...(normalizeNotes(dumping?.notes) !== values.notes ? ['notes'] : []),
  ];
}

function buildDumpingUpdatePlan({ product, dumping = null, actor, payload = {}, now = new Date() }) {
  assertProductActionAllowed({
    user: actor,
    product,
    action: PRODUCT_PERMISSION_ACTIONS.MANAGE_DUMPING,
  });

  const values = resolveDumpingValues({ dumping, payload });
  const changedFields = listChangedFields(dumping, values);

  return {
    dumpingUpdate: { ...values, updatedBy: actor.id },
    changedFields,
    history: changedFields.length > 0 ? {
      productId: product.id,
      actorId: actor.id,
      actionType: PRODUCT_ACTION_TYPES.DUMPING_UPDATED,
      fromStatus: product.lifecycleStatus,
      toStatus: product.lifecycleStatus,
      message: 'Dumping settings updated',
      metadata: {
        changedFields,
        minPrice: values.minPrice,
        maxPrice: values.maxPrice,
        previousMinPrice: toNumberOrNull(dumping?.minPrice),
        previousMaxPrice: toNumberOrNull(dumping?.maxPrice),
      },
      createdAt: now,
    } : null,
  };
}

/**
 * Marks dumping as connected. On the dumping stage this also finishes the
 * lifecycle run; outside the cycle it only records the connection.
 */
function buildDumpingConnectPlan({ product, dumping = null, actor, payload = {}, now = new Date() }) {
  assertProductActionAllowed({
    user: actor,
    product,
    action: PRODUCT_PERMISSION_ACTIONS.MANAGE_DUMPING,
  });

  const onDumpingStage = product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.DUMPING;
  if (onDumpingStage && !canPerformLifecycleAction({
    user: actor,
    product,
    action: PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_DUMPING,
  })) {
    throw inputError('Подключение демпинга недоступно из текущего статуса');
  }
  if (!onDumpingStage && dumping?.connectedAt) {
    throw conflictError('Демпинг уже подключён');
  }

  const values = resolveDumpingValues({ dumping, payload });
  const changedFields = listChangedFields(dumping, values);

  let productUpdate = null;
  let routeUpdate = null;
  if (onDumpingStage) {
    routeUpdate = buildLifecycleStageCompletionUpdate({
      product,
      completedStage: LIFECYCLE_ROUTE_STAGES.DUMPING,
      now,
    });
    productUpdate = routeUpdate || {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: now,
    };
  }

  const metadata = {
    minPrice: values.minPrice,
    maxPrice: values.maxPrice,
    changedFields,
  };

  return {
    dumpingUpdate: {
      ...values,
      updatedBy: actor.id,
      connectedBy: actor.id,
      connectedAt: now,
    },
    productUpdate,
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: PRODUCT_ACTION_TYPES.DUMPING_CONNECTED,
      fromStatus: product.lifecycleStatus,
      toStatus: productUpdate?.lifecycleStatus || product.lifecycleStatus,
      message: 'Dumping connected and checked',
      metadata: routeUpdate ? withLifecycleRunMetadata(product, metadata) : metadata,
      createdAt: now,
    },
  };
}

module.exports = {
  buildDumpingConnectPlan,
  buildDumpingUpdatePlan,
};
