const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  assertTransitionAllowed,
  canPerformLifecycleAction,
  canTransition,
  generateDraftArticle,
  getNextStatusForAction,
} = require('../constants/productLifecycle');

function runLifecycleRulesTest() {
  assert.strictEqual(
    getNextStatusForAction(PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER),
    PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER
  );

  assert.strictEqual(
    canTransition(
      PRODUCT_LIFECYCLE_STATUSES.NEW,
      PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER
    ),
    true
  );

  assert.strictEqual(
    canTransition(
      PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER
    ),
    false
  );

  assert.throws(
    () =>
      assertTransitionAllowed(
        PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
        PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER
      ),
    /not allowed/i
  );

  assert.strictEqual(
    canPerformLifecycleAction({
      user: { id: 10, role: 'admin' },
      product: { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
      action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
    }),
    true
  );

  assert.strictEqual(
    canPerformLifecycleAction({
      user: { id: 11, role: 'designer' },
      product: {
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
        designerId: 99,
      },
      action: PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_CONTENT,
    }),
    false
  );

  assert.strictEqual(
    canPerformLifecycleAction({
      user: { id: 99, role: 'designer' },
      product: {
        lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
        designerId: 99,
      },
      action: PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_CONTENT,
    }),
    true
  );

  assert.strictEqual(generateDraftArticle(new Date('2026-07-06T00:00:00Z'), 7), 'DRAFT-20260706-0007');
}

runLifecycleRulesTest();
console.log('Product lifecycle rules test passed');
