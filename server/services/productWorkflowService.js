const {
  PRODUCT_LIFECYCLE_STATUSES,
  PRODUCT_LIFECYCLE_STATUS_VALUES,
} = require('../constants/productLifecycle');

const WORKFLOW_STATUS_BY_ROLE = Object.freeze({
  designer: Object.freeze([
    PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
    PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    PRODUCT_LIFECYCLE_STATUSES.REVISION,
  ]),
  marketplace_manager: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE]),
  purchase_manager: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.PURCHASE]),
  warehouse_operator: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]),
  accountant: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]),
});

const WORKFLOW_ACTION_BY_STATUS = Object.freeze({
  [PRODUCT_LIFECYCLE_STATUSES.NEW]: Object.freeze({
    nextActionKey: 'assign_designer',
    nextActionLabel: 'Передать дизайнеру',
    nextActionEnabled: true,
    ownerLabel: 'Руководитель',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER]: Object.freeze({
    nextActionKey: 'upload_content_assets',
    nextActionLabel: 'Загрузить материалы',
    nextActionEnabled: true,
    ownerLabel: 'Дизайнер',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED]: Object.freeze({
    nextActionKey: 'submit_review',
    nextActionLabel: 'Передать на проверку',
    nextActionEnabled: true,
    ownerLabel: 'Дизайнер',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.REVIEW]: Object.freeze({
    nextActionKey: 'review_content',
    nextActionLabel: 'Проверить карточку',
    nextActionEnabled: true,
    ownerLabel: 'Руководитель',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.REVISION]: Object.freeze({
    nextActionKey: 'fix_revision',
    nextActionLabel: 'Исправить доработки',
    nextActionEnabled: true,
    ownerLabel: 'Дизайнер',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE]: Object.freeze({
    nextActionKey: 'marketplace_placement',
    nextActionLabel: 'Разместить на Kaspi',
    nextActionEnabled: true,
    ownerLabel: 'Маркетплейс',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.PURCHASE]: Object.freeze({
    nextActionKey: 'purchase_product',
    nextActionLabel: 'Отметить закуп',
    nextActionEnabled: false,
    ownerLabel: 'Закуп',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]: Object.freeze({
    nextActionKey: 'complete_warehouse',
    nextActionLabel: 'Заполнить склад',
    nextActionEnabled: false,
    ownerLabel: 'Склад',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.IN_SALE]: Object.freeze({
    nextActionKey: 'in_sale',
    nextActionLabel: 'В продаже',
    nextActionEnabled: false,
    ownerLabel: 'Продажи',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.ARCHIVED]: Object.freeze({
    nextActionKey: 'archived',
    nextActionLabel: 'В архиве',
    nextActionEnabled: false,
    ownerLabel: 'Архив',
  }),
});

function toPositiveIntegerOrNull(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeLifecycleStatus(status) {
  return PRODUCT_LIFECYCLE_STATUS_VALUES.includes(status) ? status : null;
}

function buildProductWorkflowQuery({ user, filters = {} }) {
  const baseWhere = { isActive: true };

  if (!user) {
    return {
      where: { ...baseWhere, id: null },
      scope: 'empty',
      canUseExtendedFilters: false,
    };
  }

  if (user.role === 'admin') {
    const where = { ...baseWhere };
    const lifecycleStatus = normalizeLifecycleStatus(filters.lifecycleStatus);
    const designerId = toPositiveIntegerOrNull(filters.designerId);
    const assignedToUserId = toPositiveIntegerOrNull(filters.assignedToUserId);
    const marketplaceManagerId = toPositiveIntegerOrNull(filters.marketplaceManagerId);

    if (lifecycleStatus) where.lifecycleStatus = lifecycleStatus;
    if (designerId) where.designerId = designerId;
    if (assignedToUserId) where.assignedToUserId = assignedToUserId;
    if (marketplaceManagerId) where.marketplaceManagerId = marketplaceManagerId;

    return {
      where,
      scope: 'admin',
      canUseExtendedFilters: true,
    };
  }

  if (user.role === 'designer') {
    return {
      where: {
        ...baseWhere,
        designerId: Number(user.id),
        lifecycleStatus: WORKFLOW_STATUS_BY_ROLE.designer,
      },
      scope: 'designer',
      canUseExtendedFilters: false,
    };
  }

  const roleStatuses = WORKFLOW_STATUS_BY_ROLE[user.role];
  if (roleStatuses) {
    return {
      where: {
        ...baseWhere,
        lifecycleStatus: roleStatuses,
      },
      scope: user.role,
      canUseExtendedFilters: false,
    };
  }

  return {
    where: { ...baseWhere, id: null },
    scope: 'empty',
    canUseExtendedFilters: false,
  };
}

function resolveWorkflowAction(status) {
  return WORKFLOW_ACTION_BY_STATUS[status] || {
    nextActionKey: 'unknown',
    nextActionLabel: 'Нет действия',
    nextActionEnabled: false,
    ownerLabel: 'Не определено',
  };
}

function resolveProductWorkflowItem({ product, user }) {
  const plainProduct = product?.toJSON ? product.toJSON() : product;

  return {
    ...plainProduct,
    workflow: resolveWorkflowAction(plainProduct.lifecycleStatus),
    viewerScope: user?.role || 'anonymous',
  };
}

module.exports = {
  WORKFLOW_ACTION_BY_STATUS,
  WORKFLOW_STATUS_BY_ROLE,
  buildProductWorkflowQuery,
  resolveProductWorkflowItem,
};
