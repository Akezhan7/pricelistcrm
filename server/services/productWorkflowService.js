const {
  PRODUCT_LIFECYCLE_STATUSES,
  PRODUCT_LIFECYCLE_STATUS_VALUES,
} = require('../constants/productLifecycle');
const { Op } = require('sequelize');
const {
  getProductPermissions,
  getProductResponsibility,
} = require('../constants/productPermissions');

const WORKFLOW_STATUS_BY_ROLE = Object.freeze({
  designer: Object.freeze([
    PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
    PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    PRODUCT_LIFECYCLE_STATUSES.REVISION,
  ]),
  marketplace_manager: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE]),
  purchase_manager: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.PURCHASE]),
  warehouse_operator: Object.freeze([PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]),
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
    nextActionEnabled: true,
    ownerLabel: 'Закуп',
  }),
  [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]: Object.freeze({
    nextActionKey: 'complete_warehouse',
    nextActionLabel: 'Заполнить склад',
    nextActionEnabled: true,
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

const WORKFLOW_PERMISSION_ACTIONS = Object.freeze({
  assign_designer: Object.freeze(['assign_designer']),
  upload_content_assets: Object.freeze(['manage_assets']),
  submit_review: Object.freeze(['submit_review']),
  review_content: Object.freeze(['approve', 'request_revision']),
  fix_revision: Object.freeze(['manage_assets', 'resubmit_revision']),
  marketplace_placement: Object.freeze(['manage_marketplace']),
  purchase_product: Object.freeze(['manage_purchase']),
  receive_product: Object.freeze(['manage_purchase']),
  complete_warehouse: Object.freeze(['manage_warehouse']),
  complete_sale_launch: Object.freeze(['manage_sale_launch']),
  manage_sale_launch: Object.freeze(['manage_sale_launch']),
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
      workflowView: 'tasks',
      canUseSalesView: false,
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
      workflowView: 'tasks',
      canUseSalesView: false,
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
      workflowView: 'tasks',
      canUseSalesView: false,
    };
  }

  if (user.role === 'marketplace_manager') {
    const salesView = filters.view === 'sales';

    return {
      where: salesView
        ? {
            ...baseWhere,
            lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
            lifecycleCompletedAt: { [Op.ne]: null },
          }
        : {
            ...baseWhere,
            [Op.or]: [
              { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE },
              {
                lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
                lifecycleCompletedAt: null,
              },
            ],
          },
      scope: 'marketplace_manager',
      workflowView: salesView ? 'sales' : 'tasks',
      canUseExtendedFilters: false,
      canUseSalesView: true,
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
      workflowView: 'tasks',
      canUseSalesView: false,
    };
  }

  return {
    where: { ...baseWhere, id: null },
    scope: 'empty',
    canUseExtendedFilters: false,
    workflowView: 'tasks',
    canUseSalesView: false,
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
  const permissions = getProductPermissions({ user, product: plainProduct });
  let workflow = plainProduct.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.PURCHASE
    && plainProduct.lifecyclePurchase?.purchasedAt
    ? {
        nextActionKey: 'receive_product',
        nextActionLabel: 'Подтвердить поступление',
        nextActionEnabled: true,
        ownerLabel: 'Закуп',
      }
    : resolveWorkflowAction(plainProduct.lifecycleStatus);

  if (plainProduct.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.IN_SALE) {
    workflow = plainProduct.lifecycleCompletedAt || plainProduct.launchFlags?.completedAt
      ? {
          nextActionKey: 'manage_sale_launch',
          nextActionLabel: 'Параметры продаж',
          nextActionEnabled: true,
          ownerLabel: 'Продажи',
        }
      : {
          nextActionKey: 'complete_sale_launch',
          nextActionLabel: 'Настроить продажи',
          nextActionEnabled: true,
          ownerLabel: 'Маркетплейс',
        };
  }

  const requiredActions = WORKFLOW_PERMISSION_ACTIONS[workflow.nextActionKey] || [];
  workflow = {
    ...workflow,
    nextActionEnabled:
      workflow.nextActionEnabled
      && (requiredActions.length === 0
        || requiredActions.some((action) => permissions.allowedActions.includes(action))),
  };

  return {
    ...plainProduct,
    workflow,
    viewerScope: user?.role || 'anonymous',
    permissions,
    responsibility: getProductResponsibility(plainProduct),
  };
}

module.exports = {
  WORKFLOW_ACTION_BY_STATUS,
  WORKFLOW_STATUS_BY_ROLE,
  buildProductWorkflowQuery,
  resolveProductWorkflowItem,
};
