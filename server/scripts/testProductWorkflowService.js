const assert = require('assert');
const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  buildProductWorkflowQuery,
  resolveProductWorkflowItem,
} = require('../services/productWorkflowService');

function testAdminWorkflowQuery() {
  const query = buildProductWorkflowQuery({
    user: { id: 1, role: 'admin' },
    filters: {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
      designerId: '25',
      assignedToUserId: '30',
    },
  });

  assert.deepStrictEqual(query.where, {
    isActive: true,
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
    designerId: 25,
    assignedToUserId: 30,
  });
  assert.strictEqual(query.scope, 'admin');
  assert.strictEqual(query.canUseExtendedFilters, true);
}

function testDesignerWorkflowQuery() {
  const query = buildProductWorkflowQuery({
    user: { id: 25, role: 'designer' },
    filters: {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
      designerId: '99',
    },
  });

  assert.deepStrictEqual(query.where, {
    isActive: true,
    designerId: 25,
      lifecycleStatus: [
        PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
        PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
        PRODUCT_LIFECYCLE_STATUSES.REVISION,
      ],
  });
  assert.strictEqual(query.scope, 'designer');
  assert.strictEqual(query.canUseExtendedFilters, false);
}

function testRoleWorkflowQueries() {
  assert.deepStrictEqual(
    buildProductWorkflowQuery({
      user: { id: 3, role: 'marketplace_manager' },
      filters: {},
    }).where,
    {
      isActive: true,
      lifecycleStatus: [PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE],
    }
  );

  const marketplaceItem = resolveProductWorkflowItem({
    product: {
      id: 103,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    },
    user: { id: 3, role: 'marketplace_manager' },
  });

  assert.strictEqual(marketplaceItem.workflow.nextActionKey, 'marketplace_placement');
  assert.strictEqual(marketplaceItem.workflow.nextActionEnabled, true);

  assert.deepStrictEqual(
    buildProductWorkflowQuery({
      user: { id: 4, role: 'purchase_manager' },
      filters: {},
    }).where,
    {
      isActive: true,
      lifecycleStatus: [PRODUCT_LIFECYCLE_STATUSES.PURCHASE],
    }
  );

  assert.deepStrictEqual(
    buildProductWorkflowQuery({
      user: { id: 5, role: 'warehouse_operator' },
      filters: {},
    }).where,
    {
      isActive: true,
      lifecycleStatus: [PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE],
    }
  );
}

function testUnsupportedRoleGetsEmptyQueue() {
  const query = buildProductWorkflowQuery({
    user: { id: 6, role: 'operator' },
    filters: {},
  });

  assert.deepStrictEqual(query.where, {
    isActive: true,
    id: null,
  });
  assert.strictEqual(query.scope, 'empty');
}

function testWorkflowItemNextAction() {
  const assigned = resolveProductWorkflowItem({
    product: {
      id: 101,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      designerId: 25,
    },
    user: { id: 25, role: 'designer' },
  });

  assert.deepStrictEqual(assigned.workflow, {
    nextActionKey: 'upload_content_assets',
    nextActionLabel: 'Загрузить материалы',
    nextActionEnabled: true,
    ownerLabel: 'Дизайнер',
  });

  const review = resolveProductWorkflowItem({
    product: {
      id: 102,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.REVIEW,
    },
    user: { id: 1, role: 'admin' },
  });

  assert.deepStrictEqual(review.workflow, {
    nextActionKey: 'review_content',
    nextActionLabel: 'Проверить карточку',
    nextActionEnabled: true,
    ownerLabel: 'Руководитель',
  });
}

testAdminWorkflowQuery();
testDesignerWorkflowQuery();
testRoleWorkflowQueries();
testUnsupportedRoleGetsEmptyQueue();
testWorkflowItemNextAction();

console.log('Product workflow service test passed');
