const assert = require('assert');
const { Op } = require('sequelize');
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
  const marketplaceTasks = buildProductWorkflowQuery({
    user: { id: 3, role: 'marketplace_manager' },
    filters: {},
  });
  assert.strictEqual(marketplaceTasks.scope, 'marketplace_manager');
  assert.deepStrictEqual(marketplaceTasks.where[Op.or], [
    { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE },
    {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: null,
    },
  ]);

  const marketplaceSales = buildProductWorkflowQuery({
    user: { id: 3, role: 'marketplace_manager' },
    filters: { view: 'sales' },
  });
  assert.strictEqual(marketplaceSales.workflowView, 'sales');
  assert.strictEqual(marketplaceSales.where.lifecycleStatus, PRODUCT_LIFECYCLE_STATUSES.IN_SALE);
  assert.deepStrictEqual(marketplaceSales.where.lifecycleCompletedAt, { [Op.ne]: null });

  const purchaseItem = resolveProductWorkflowItem({
    product: {
      id: 104,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      lifecyclePurchase: null,
    },
    user: { id: 4, role: 'purchase_manager' },
  });
  assert.strictEqual(purchaseItem.workflow.nextActionKey, 'purchase_product');
  assert.strictEqual(purchaseItem.workflow.nextActionEnabled, true);

  const purchasedItem = resolveProductWorkflowItem({
    product: {
      id: 105,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      lifecyclePurchase: { id: 9, purchasedAt: '2026-07-10T08:00:00Z' },
    },
    user: { id: 4, role: 'purchase_manager' },
  });
  assert.strictEqual(purchasedItem.workflow.nextActionKey, 'receive_product');
  assert.strictEqual(purchasedItem.workflow.nextActionLabel, 'Подтвердить поступление');
  assert.strictEqual(purchasedItem.workflow.nextActionEnabled, true);

  const marketplaceItem = resolveProductWorkflowItem({
    product: {
      id: 103,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.MARKETPLACE,
    },
    user: { id: 3, role: 'marketplace_manager' },
  });

  assert.strictEqual(marketplaceItem.workflow.nextActionKey, 'marketplace_placement');
  assert.strictEqual(marketplaceItem.workflow.nextActionEnabled, true);
  assert.strictEqual(marketplaceItem.permissions.canEditCard, true);
  assert(marketplaceItem.permissions.allowedActions.includes('manage_marketplace'));
  assert.strictEqual(marketplaceItem.responsibility.roleLabel, 'Менеджер маркетплейсов');

  const pendingSaleItem = resolveProductWorkflowItem({
    product: {
      id: 106,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: null,
      launchFlags: { completedAt: null },
    },
    user: { id: 3, role: 'marketplace_manager' },
  });
  assert.strictEqual(pendingSaleItem.workflow.nextActionKey, 'complete_sale_launch');
  assert.strictEqual(pendingSaleItem.workflow.nextActionLabel, 'Настроить продажи');
  assert.strictEqual(pendingSaleItem.workflow.nextActionEnabled, true);

  const completedSaleItem = resolveProductWorkflowItem({
    product: {
      id: 107,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: '2026-07-10T14:00:00Z',
      launchFlags: { completedAt: '2026-07-10T14:00:00Z' },
    },
    user: { id: 3, role: 'marketplace_manager' },
  });
  assert.strictEqual(completedSaleItem.workflow.nextActionKey, 'manage_sale_launch');
  assert.strictEqual(completedSaleItem.workflow.nextActionEnabled, true);

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
      user: { id: 6, role: 'accountant' },
      filters: {},
    }).where,
    { isActive: true, id: null }
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
