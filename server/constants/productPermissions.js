const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  canPerformLifecycleAction,
} = require('./productLifecycle');

const PRODUCT_PERMISSION_ACTIONS = Object.freeze({
  EDIT_PRODUCT_CARD: 'edit_product_card',
  MANAGE_ASSETS: 'manage_assets',
  MANAGE_MARKETPLACE: 'manage_marketplace',
  MANAGE_PURCHASE: 'manage_purchase',
  MANAGE_WAREHOUSE: 'manage_warehouse',
  MANAGE_SALE_LAUNCH: 'manage_sale_launch',
  MANAGE_SUPPLIERS: 'manage_product_suppliers',
  MANAGE_VARIATIONS: 'manage_product_variations',
  DELETE_PRODUCT: 'delete_product',
  VIEW_HISTORY: 'view_product_history',
});

const ADMIN_PRODUCT_FIELDS = Object.freeze([
  'name',
  'article',
  'internalName',
  'costPrice',
  'sellingPrice',
  'currentStock',
  'minStock',
  'categoryId',
  'description',
  'image',
  'suppliers',
]);

const DESIGNER_ASSET_STATUSES = new Set([
  PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
  PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
  PRODUCT_LIFECYCLE_STATUSES.REVISION,
]);

const RESPONSIBLE_ROLE_LABELS = Object.freeze({
  [PRODUCT_LIFECYCLE_STATUSES.NEW]: 'Руководитель',
  [PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER]: 'Дизайнер',
  [PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED]: 'Дизайнер',
  [PRODUCT_LIFECYCLE_STATUSES.REVIEW]: 'Руководитель',
  [PRODUCT_LIFECYCLE_STATUSES.REVISION]: 'Дизайнер',
  [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE]: 'Менеджер маркетплейсов',
  [PRODUCT_LIFECYCLE_STATUSES.PURCHASE]: 'Менеджер по закупкам',
  [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE]: 'Оператор склада',
  [PRODUCT_LIFECYCLE_STATUSES.IN_SALE]: 'Менеджер маркетплейсов',
  [PRODUCT_LIFECYCLE_STATUSES.ARCHIVED]: 'Администратор',
});

function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}

function isAssignedDesigner(user, product) {
  return hasRole(user, 'designer') && Number(product?.designerId) === Number(user?.id);
}

function getEditableProductFields(user) {
  return hasRole(user, 'admin') ? [...ADMIN_PRODUCT_FIELDS] : [];
}

function getSupportingActions({ user, product }) {
  const actions = [];
  const status = product?.lifecycleStatus;
  const isAdmin = hasRole(user, 'admin');

  actions.push(PRODUCT_PERMISSION_ACTIONS.VIEW_HISTORY);

  if (isAdmin) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.EDIT_PRODUCT_CARD);
    actions.push(PRODUCT_PERMISSION_ACTIONS.DELETE_PRODUCT);
  }

  if (hasRole(user, 'admin', 'purchase_manager')) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_SUPPLIERS);
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_VARIATIONS);
  }

  if (isAdmin || (DESIGNER_ASSET_STATUSES.has(status) && isAssignedDesigner(user, product))) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_ASSETS);
  }

  if (
    [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE, PRODUCT_LIFECYCLE_STATUSES.IN_SALE].includes(status)
    && hasRole(user, 'admin', 'marketplace_manager')
  ) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_MARKETPLACE);
  }

  if (
    status === PRODUCT_LIFECYCLE_STATUSES.PURCHASE
    && hasRole(user, 'admin', 'purchase_manager')
  ) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_PURCHASE);
  }

  if (
    status === PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE
    && hasRole(user, 'admin', 'warehouse_operator')
  ) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_WAREHOUSE);
  }

  if (
    status === PRODUCT_LIFECYCLE_STATUSES.IN_SALE
    && hasRole(user, 'admin', 'marketplace_manager')
  ) {
    actions.push(PRODUCT_PERMISSION_ACTIONS.MANAGE_SALE_LAUNCH);
  }

  return actions;
}

function getProductPermissions({ user, product }) {
  if (!user || !product || product.isActive === false) {
    return {
      allowedActions: [],
      editableFields: [],
      canEditCard: false,
      responsibleRoleLabel: RESPONSIBLE_ROLE_LABELS[product?.lifecycleStatus] || null,
    };
  }

  const lifecycleActions = Object.values(PRODUCT_LIFECYCLE_ACTIONS).filter((action) =>
    canPerformLifecycleAction({ user, product, action })
  );
  const supportingActions = getSupportingActions({ user, product });
  const editableFields = getEditableProductFields(user);

  return {
    allowedActions: [...new Set([...lifecycleActions, ...supportingActions])],
    editableFields,
    canEditCard:
      editableFields.length > 0
      || supportingActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_MARKETPLACE),
    responsibleRoleLabel: RESPONSIBLE_ROLE_LABELS[product.lifecycleStatus] || null,
  };
}

function getProductResponsibility(product) {
  const status = product?.lifecycleStatus;
  const marketplaceOwned = [
    PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
  ].includes(status);
  const user = product?.assignedTo || (marketplaceOwned ? product?.marketplaceManager : null) || null;

  return {
    user,
    roleLabel: RESPONSIBLE_ROLE_LABELS[status] || null,
  };
}

function assertProductActionAllowed({ user, product, action }) {
  const permissions = getProductPermissions({ user, product });
  if (!permissions.allowedActions.includes(action)) {
    const error = new Error(`Action is not permitted: ${action}`);
    error.status = 403;
    error.statusCode = 403;
    throw error;
  }
}

function assertProductFieldsAllowed({ user, product, fields = [] }) {
  const allowedFields = new Set(getProductPermissions({ user, product }).editableFields);
  const forbiddenFields = fields.filter((field) => !allowedFields.has(field));

  if (forbiddenFields.length > 0) {
    const error = new Error(`Product field update is not permitted: ${forbiddenFields.join(', ')}`);
    error.status = 403;
    error.statusCode = 403;
    error.forbiddenFields = forbiddenFields;
    throw error;
  }
}

module.exports = {
  ADMIN_PRODUCT_FIELDS,
  PRODUCT_PERMISSION_ACTIONS,
  RESPONSIBLE_ROLE_LABELS,
  assertProductActionAllowed,
  assertProductFieldsAllowed,
  getProductPermissions,
  getProductResponsibility,
};
