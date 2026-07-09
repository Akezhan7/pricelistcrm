const assert = require('assert');

const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  createLifecycleActionUpdate,
  normalizeLifecycleActionSlug,
} = require('../services/productLifecycleService');

function runLifecycleServiceTest() {
  assert.strictEqual(
    normalizeLifecycleActionSlug('assign-designer'),
    PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER
  );

  const assignedAt = new Date('2026-07-07T10:00:00Z');
  const update = createLifecycleActionUpdate({
    action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
    actor: { id: 1, role: 'admin' },
    product: { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
    payload: { designerId: 25 },
    now: assignedAt,
  });

  assert.deepStrictEqual(update, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
    lifecycleStartedAt: assignedAt,
    lifecycleCompletedAt: null,
    designerId: 25,
    assignedToUserId: 25,
  });

  const submittedAt = new Date('2026-07-08T09:00:00Z');
  const submitUpdate = createLifecycleActionUpdate({
    action: 'submit-content',
    actor: { id: 25, role: 'designer' },
    product: {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
      designerId: 25,
    },
    now: submittedAt,
  });

  assert.deepStrictEqual(submitUpdate, {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.CONTENT_CREATED,
    lifecycleCompletedAt: null,
  });

  assert.throws(
    () =>
      createLifecycleActionUpdate({
        action: 'submit-content',
        actor: { id: 26, role: 'designer' },
        product: {
          lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.ASSIGNED_TO_DESIGNER,
          designerId: 25,
        },
      }),
    /assigned designer/i
  );

  assert.throws(
    () =>
      createLifecycleActionUpdate({
        action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
        actor: { id: 2, role: 'purchase_manager' },
        product: { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
        payload: { designerId: 25 },
      }),
    /not permitted/i
  );

  assert.throws(
    () =>
      createLifecycleActionUpdate({
        action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
        actor: { id: 1, role: 'admin' },
        product: { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE },
        payload: { designerId: 25 },
      }),
    /not allowed/i
  );

  assert.throws(
    () =>
      createLifecycleActionUpdate({
        action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
        actor: { id: 1, role: 'admin' },
        product: { lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW },
        payload: {},
      }),
    /designerId is required/i
  );
}

runLifecycleServiceTest();
console.log('Product lifecycle service test passed');
