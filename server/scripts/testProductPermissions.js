const assert = require('assert');

const {
  PRODUCT_PERMISSION_ACTIONS,
  assertProductActionAllowed,
  assertProductFieldsAllowed,
  getProductPermissions,
} = require('../constants/productPermissions');
const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');

function permissionsFor(role, product = {}, id = 10) {
  return getProductPermissions({
    user: { id, role },
    product: {
      id: 100,
      isActive: true,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
      designerId: 10,
      marketplaceManagerId: 20,
      ...product,
    },
  });
}

function testAdminHasFullProductAccess() {
  const permissions = permissionsFor('admin');

  assert.strictEqual(permissions.canEditCard, true);
  assert(permissions.editableFields.includes('name'));
  assert(permissions.editableFields.includes('costPrice'));
  assert(permissions.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_MARKETPLACE));
}

function testDesignerMustBeAssigned() {
  const assigned = permissionsFor('designer', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
  }, 10);
  const foreign = permissionsFor('designer', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
  }, 11);

  assert(assigned.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_ASSETS));
  assert(!foreign.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_ASSETS));
}

function testOperationalRolesStayInTheirArea() {
  const marketplace = permissionsFor('marketplace_manager');
  assert.strictEqual(marketplace.canEditCard, true);
  assert(marketplace.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_MARKETPLACE));
  assert.deepStrictEqual(marketplace.editableFields, []);

  const purchase = permissionsFor('purchase_manager', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
  });
  assert(purchase.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_PURCHASE));
  assert(!purchase.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_MARKETPLACE));

  const warehouse = permissionsFor('warehouse_operator', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
  });
  assert(warehouse.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_WAREHOUSE));

  const accountant = permissionsFor('accountant', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
  });
  assert(!accountant.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.MANAGE_WAREHOUSE));
}

function testWarehouseLocationCanBeEditedOutsideWarehouseStage() {
  const admin = permissionsFor('admin', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
  });
  assert(admin.allowedActions.includes('edit_warehouse_location'));

  const warehouse = permissionsFor('warehouse_operator', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
  });
  assert(warehouse.allowedActions.includes('edit_warehouse_location'));

  const marketplace = permissionsFor('marketplace_manager', {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
  });
  assert(!marketplace.allowedActions.includes('edit_warehouse_location'));
}

function testForbiddenProductFieldsAreRejected() {
  assert.doesNotThrow(() =>
    assertProductFieldsAllowed({
      user: { id: 1, role: 'admin' },
      product: { id: 100, isActive: true },
      fields: ['name', 'costPrice'],
    })
  );

  assert.throws(
    () =>
      assertProductFieldsAllowed({
        user: { id: 20, role: 'marketplace_manager' },
        product: { id: 100, isActive: true },
        fields: ['costPrice'],
      }),
    /not permitted.*costPrice/i
  );
}

function testForbiddenActionsExposeHttp403() {
  assert.throws(
    () =>
      assertProductActionAllowed({
        user: { id: 30, role: 'accountant' },
        product: {
          id: 100,
          isActive: true,
          lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
        },
        action: PRODUCT_PERMISSION_ACTIONS.MANAGE_WAREHOUSE,
      }),
    (error) => error.status === 403 && error.statusCode === 403
  );
}

function testAuthenticatedUsersCanViewImmutableHistory() {
  const permissions = permissionsFor('operator');
  assert(permissions.allowedActions.includes(PRODUCT_PERMISSION_ACTIONS.VIEW_HISTORY));
}

function run() {
  testAdminHasFullProductAccess();
  testDesignerMustBeAssigned();
  testOperationalRolesStayInTheirArea();
  testWarehouseLocationCanBeEditedOutsideWarehouseStage();
  testForbiddenProductFieldsAreRejected();
  testForbiddenActionsExposeHttp403();
  testAuthenticatedUsersCanViewImmutableHistory();
}

run();
console.log('Product permissions test passed');
