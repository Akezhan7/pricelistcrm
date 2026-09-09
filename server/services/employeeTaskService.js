const { Op } = require('sequelize');

const EMPLOYEE_TASK_STATUSES = Object.freeze({
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  RETURNED: 'returned',
  DONE: 'done',
  CANCELLED: 'cancelled',
});

const EMPLOYEE_TASK_ACTIONS = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  REASSIGN: 'reassign',
  START: 'start',
  SUBMIT_REVIEW: 'submit_review',
  APPROVE: 'approve',
  RETURN: 'return',
  CANCEL: 'cancel',
});

const EMPLOYEE_TASK_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
});

const ACTION_TRANSITIONS = Object.freeze({
  [EMPLOYEE_TASK_ACTIONS.START]: {
    from: [EMPLOYEE_TASK_STATUSES.NEW, EMPLOYEE_TASK_STATUSES.RETURNED],
    to: EMPLOYEE_TASK_STATUSES.IN_PROGRESS,
    actor: 'assignee',
  },
  [EMPLOYEE_TASK_ACTIONS.SUBMIT_REVIEW]: {
    from: [EMPLOYEE_TASK_STATUSES.IN_PROGRESS],
    to: EMPLOYEE_TASK_STATUSES.REVIEW,
    actor: 'assignee',
  },
  [EMPLOYEE_TASK_ACTIONS.APPROVE]: {
    from: [EMPLOYEE_TASK_STATUSES.REVIEW],
    to: EMPLOYEE_TASK_STATUSES.DONE,
    actor: 'admin',
  },
  [EMPLOYEE_TASK_ACTIONS.RETURN]: {
    from: [EMPLOYEE_TASK_STATUSES.REVIEW],
    to: EMPLOYEE_TASK_STATUSES.RETURNED,
    actor: 'admin',
  },
  [EMPLOYEE_TASK_ACTIONS.CANCEL]: {
    from: [
      EMPLOYEE_TASK_STATUSES.NEW,
      EMPLOYEE_TASK_STATUSES.IN_PROGRESS,
      EMPLOYEE_TASK_STATUSES.REVIEW,
      EMPLOYEE_TASK_STATUSES.RETURNED,
    ],
    to: EMPLOYEE_TASK_STATUSES.CANCELLED,
    actor: 'admin',
  },
});

function createForbiddenError(message = 'Task action is not permitted') {
  const error = new Error(message);
  error.status = 403;
  error.statusCode = 403;
  return error;
}

function isAdmin(user) {
  return user?.role === 'admin';
}

function isAssignee(user, task) {
  return Number(user?.id) === Number(task?.assignedToUserId);
}

function canUseTransition({ user, task, action }) {
  const transition = ACTION_TRANSITIONS[action];
  if (!transition || !transition.from.includes(task?.status)) return false;
  if (transition.actor === 'admin') return isAdmin(user);
  if (transition.actor === 'assignee') return isAssignee(user, task);
  return false;
}

function getAllowedTaskActions({ user, task }) {
  return Object.values(EMPLOYEE_TASK_ACTIONS).filter((action) =>
    action !== EMPLOYEE_TASK_ACTIONS.CREATE && canUseTransition({ user, task, action })
  );
}

function assertTaskTransitionAllowed({ user, task, action }) {
  if (!canUseTransition({ user, task, action })) {
    throw createForbiddenError();
  }
}

function getTaskStatusAfterAction(action) {
  return ACTION_TRANSITIONS[action]?.to || null;
}

function buildTaskHistoryEntry({
  taskId,
  actorId,
  action,
  fromStatus = null,
  toStatus = null,
  comment = null,
  now = new Date(),
}) {
  return {
    taskId: Number(taskId),
    actorId: actorId ? Number(actorId) : null,
    action,
    fromStatus,
    toStatus,
    comment: comment || null,
    createdAt: now,
  };
}

function buildTaskWhere(user, query = {}) {
  const conditions = [];
  const scope = query.scope || 'all';

  if (Array.isArray(query.assignedTaskIds)) {
    conditions.push({ id: { [Op.in]: query.assignedTaskIds } });
    if (user.role === 'admin' && scope === 'created') {
      conditions.push({ createdByUserId: user.id });
    }
  } else if (user.role !== 'admin') {
    conditions.push({ assignedToUserId: user.id });
  } else if (scope === 'assigned') {
    conditions.push({ assignedToUserId: user.id });
  } else if (scope === 'created') {
    conditions.push({ createdByUserId: user.id });
    if (query.assignedToUserId) {
      conditions.push({ assignedToUserId: Number(query.assignedToUserId) });
    }
  } else {
    if (query.assignedToUserId) {
      conditions.push({ assignedToUserId: Number(query.assignedToUserId) });
    }
    if (query.createdByUserId) {
      conditions.push({ createdByUserId: Number(query.createdByUserId) });
    }
  }

  if (query.status) conditions.push({ status: query.status });
  if (query.priority) conditions.push({ priority: query.priority });
  if (query.search?.trim()) {
    const pattern = `%${query.search.trim()}%`;
    conditions.push({
      [Op.or]: [
        { title: { [Op.iLike]: pattern } },
        { description: { [Op.iLike]: pattern } },
      ],
    });
  }
  if (query.overdue === 'true') {
    conditions.push({ dueDate: { [Op.lt]: new Date() } });
    conditions.push({
      status: { [Op.notIn]: [EMPLOYEE_TASK_STATUSES.DONE, EMPLOYEE_TASK_STATUSES.CANCELLED] },
    });
  }

  return conditions.length > 0 ? { [Op.and]: conditions } : {};
}

function buildTaskUpdatePayload(input = {}) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = String(input.title || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const description = String(input.description || '').trim();
    payload.description = description || null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'assignedToUserId')) {
    payload.assignedToUserId = Number(input.assignedToUserId);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'priority')) {
    payload.priority = input.priority;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'dueDate')) {
    payload.dueDate = normalizeTaskDueDate(input.dueDate);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'collaboratorUserIds')) {
    payload.collaboratorUserIds = [...new Set(
      (Array.isArray(input.collaboratorUserIds) ? input.collaboratorUserIds : [])
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )];
  }

  return payload;
}

function normalizeTaskDueDate(value) {
  if (!value) return null;
  const dateOnly = String(value).slice(0, 10);
  const parsed = new Date(`${dateOnly}T23:59:59.999+05:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid task deadline');
  return parsed;
}

function buildTaskCommentEntry({ taskId, authorId, comment }) {
  return {
    taskId: Number(taskId),
    authorId: Number(authorId),
    comment: String(comment || '').trim(),
  };
}

module.exports = {
  EMPLOYEE_TASK_ACTIONS,
  EMPLOYEE_TASK_PRIORITIES,
  EMPLOYEE_TASK_STATUSES,
  assertTaskTransitionAllowed,
  buildTaskCommentEntry,
  buildTaskHistoryEntry,
  buildTaskUpdatePayload,
  buildTaskWhere,
  getAllowedTaskActions,
  getTaskStatusAfterAction,
  normalizeTaskDueDate,
};
