const assert = require('assert');
const { Op } = require('sequelize');

const {
  EMPLOYEE_TASK_ACTIONS,
  EMPLOYEE_TASK_STATUSES,
  assertTaskTransitionAllowed,
  buildTaskCommentEntry,
  buildTaskHistoryEntry,
  buildTaskUpdatePayload,
  buildTaskWhere,
  getAllowedTaskActions,
} = require('../services/employeeTaskService');

function task(overrides = {}) {
  return {
    id: 100,
    status: EMPLOYEE_TASK_STATUSES.NEW,
    createdByUserId: 1,
    assignedToUserId: 2,
    ...overrides,
  };
}

function user(overrides = {}) {
  return {
    id: 2,
    role: 'designer',
    ...overrides,
  };
}

function testAssigneeCanStartAndSubmitOwnTask() {
  const assignedUser = user({ id: 2, role: 'designer' });

  assert.deepStrictEqual(
    getAllowedTaskActions({ user: assignedUser, task: task({ status: EMPLOYEE_TASK_STATUSES.NEW }) }),
    [EMPLOYEE_TASK_ACTIONS.START]
  );

  assert.deepStrictEqual(
    getAllowedTaskActions({ user: assignedUser, task: task({ status: EMPLOYEE_TASK_STATUSES.IN_PROGRESS }) }),
    [EMPLOYEE_TASK_ACTIONS.SUBMIT_REVIEW]
  );

  assert.doesNotThrow(() =>
    assertTaskTransitionAllowed({
      user: assignedUser,
      task: task({ status: EMPLOYEE_TASK_STATUSES.IN_PROGRESS }),
      action: EMPLOYEE_TASK_ACTIONS.SUBMIT_REVIEW,
    })
  );
}

function testAdminCanReviewCancelAndCreate() {
  const admin = user({ id: 1, role: 'admin' });

  assert.deepStrictEqual(
    getAllowedTaskActions({ user: admin, task: task({ status: EMPLOYEE_TASK_STATUSES.REVIEW }) }),
    [EMPLOYEE_TASK_ACTIONS.APPROVE, EMPLOYEE_TASK_ACTIONS.RETURN, EMPLOYEE_TASK_ACTIONS.CANCEL]
  );

  assert.doesNotThrow(() =>
    assertTaskTransitionAllowed({
      user: admin,
      task: task({ status: EMPLOYEE_TASK_STATUSES.REVIEW }),
      action: EMPLOYEE_TASK_ACTIONS.APPROVE,
    })
  );
}

function testForeignUserCannotMoveTask() {
  assert.throws(
    () =>
      assertTaskTransitionAllowed({
        user: user({ id: 3, role: 'operator' }),
        task: task({ status: EMPLOYEE_TASK_STATUSES.NEW, assignedToUserId: 2 }),
        action: EMPLOYEE_TASK_ACTIONS.START,
      }),
    (error) => error.status === 403 && /not permitted/i.test(error.message)
  );
}

function testCompletedAndCancelledTasksAreClosed() {
  const admin = user({ id: 1, role: 'admin' });
  const assignedUser = user({ id: 2, role: 'designer' });

  assert.deepStrictEqual(
    getAllowedTaskActions({ user: admin, task: task({ status: EMPLOYEE_TASK_STATUSES.DONE }) }),
    []
  );

  assert.throws(
    () =>
      assertTaskTransitionAllowed({
        user: assignedUser,
        task: task({ status: EMPLOYEE_TASK_STATUSES.CANCELLED }),
        action: EMPLOYEE_TASK_ACTIONS.START,
      }),
    (error) => error.status === 403
  );
}

function testHistoryEntryCapturesActorStatusAndComment() {
  const entry = buildTaskHistoryEntry({
    taskId: 100,
    actorId: 1,
    action: EMPLOYEE_TASK_ACTIONS.RETURN,
    fromStatus: EMPLOYEE_TASK_STATUSES.REVIEW,
    toStatus: EMPLOYEE_TASK_STATUSES.RETURNED,
    comment: 'Нужно приложить ссылку на документ',
    now: new Date('2026-07-18T08:00:00.000Z'),
  });

  assert.deepStrictEqual(entry, {
    taskId: 100,
    actorId: 1,
    action: EMPLOYEE_TASK_ACTIONS.RETURN,
    fromStatus: EMPLOYEE_TASK_STATUSES.REVIEW,
    toStatus: EMPLOYEE_TASK_STATUSES.RETURNED,
    comment: 'Нужно приложить ссылку на документ',
    createdAt: new Date('2026-07-18T08:00:00.000Z'),
  });
}

function testAdminAssignedScopeCannotBeOverwrittenByAssigneeFilter() {
  const where = buildTaskWhere(
    user({ id: 1, role: 'admin' }),
    { scope: 'assigned', assignedToUserId: 2 }
  );
  const conditions = where[Op.and];

  assert(conditions.some((condition) => condition.assignedToUserId === 1));
  assert(!conditions.some((condition) => condition.assignedToUserId === 2));
}

function testOverdueFilterComposesWithSelectedStatus() {
  const where = buildTaskWhere(
    user({ id: 1, role: 'admin' }),
    { status: EMPLOYEE_TASK_STATUSES.REVIEW, overdue: 'true' }
  );
  const conditions = where[Op.and];
  const closedStatusFilter = conditions.find((condition) => condition.status?.[Op.notIn]);

  assert(conditions.some((condition) => condition.status === EMPLOYEE_TASK_STATUSES.REVIEW));
  assert(conditions.some((condition) => condition.dueDate?.[Op.lt] instanceof Date));
  assert.deepStrictEqual(
    closedStatusFilter.status[Op.notIn],
    [EMPLOYEE_TASK_STATUSES.DONE, EMPLOYEE_TASK_STATUSES.CANCELLED]
  );
}

function testSearchFilterMatchesTitleAndDescription() {
  const where = buildTaskWhere(
    user({ id: 1, role: 'admin' }),
    { search: 'kaspi sku' }
  );
  const conditions = where[Op.and];
  const searchCondition = conditions.find((condition) => condition[Op.or]);

  assert.deepStrictEqual(searchCondition[Op.or], [
    { title: { [Op.iLike]: '%kaspi sku%' } },
    { description: { [Op.iLike]: '%kaspi sku%' } },
  ]);
}

function testBuildTaskUpdatePayloadAllowsAdminEditableFieldsOnly() {
  const payload = buildTaskUpdatePayload({
    title: '  Новое название  ',
    description: '  Обновленное описание  ',
    assignedToUserId: '5',
    priority: 'urgent',
    dueDate: '2026-08-01',
    status: EMPLOYEE_TASK_STATUSES.DONE,
    createdByUserId: 99,
  });

  assert.deepStrictEqual(payload, {
    title: 'Новое название',
    description: 'Обновленное описание',
    assignedToUserId: 5,
    priority: 'urgent',
    dueDate: '2026-08-01',
  });
}

function testBuildTaskCommentEntryTrimsTextAndCapturesAuthor() {
  const entry = buildTaskCommentEntry({
    taskId: 100,
    authorId: 2,
    comment: '  Готово, проверьте ссылку  ',
  });

  assert.deepStrictEqual(entry, {
    taskId: 100,
    authorId: 2,
    comment: 'Готово, проверьте ссылку',
  });
}

function run() {
  testAssigneeCanStartAndSubmitOwnTask();
  testAdminCanReviewCancelAndCreate();
  testForeignUserCannotMoveTask();
  testCompletedAndCancelledTasksAreClosed();
  testHistoryEntryCapturesActorStatusAndComment();
  testAdminAssignedScopeCannotBeOverwrittenByAssigneeFilter();
  testOverdueFilterComposesWithSelectedStatus();
  testSearchFilterMatchesTitleAndDescription();
  testBuildTaskUpdatePayloadAllowsAdminEditableFieldsOnly();
  testBuildTaskCommentEntryTrimsTextAndCapturesAuthor();
}

run();
console.log('Employee task service test passed');
