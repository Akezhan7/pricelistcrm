const { validationResult } = require('express-validator');
const { EmployeeTask, EmployeeTaskComment, EmployeeTaskHistory, User, sequelize } = require('../models');
const {
  EMPLOYEE_TASK_ACTIONS,
  EMPLOYEE_TASK_STATUSES,
  assertTaskTransitionAllowed,
  buildTaskCommentEntry,
  buildTaskHistoryEntry,
  buildTaskUpdatePayload,
  buildTaskWhere,
  getAllowedTaskActions,
  getTaskStatusAfterAction,
} = require('../services/employeeTaskService');

const USER_ATTRIBUTES = ['id', 'name', 'email', 'role', 'isActive'];
const TASK_INCLUDE = [
  { model: User, as: 'creator', attributes: USER_ATTRIBUTES },
  { model: User, as: 'assignee', attributes: USER_ATTRIBUTES },
];
const TASK_DETAIL_INCLUDE = [
  ...TASK_INCLUDE,
  {
    model: EmployeeTaskHistory,
    as: 'history',
    include: [{ model: User, as: 'actor', attributes: USER_ATTRIBUTES }],
  },
  {
    model: EmployeeTaskComment,
    as: 'comments',
    include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
  },
];

function serializeTask(task, viewer) {
  const plain = task?.toJSON ? task.toJSON() : task;
  if (!plain) return null;
  return {
    ...plain,
    allowedActions: getAllowedTaskActions({ user: viewer, task: plain }),
    history: plain.history
      ? [...plain.history].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      : undefined,
    comments: plain.comments
      ? [...plain.comments].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
      : undefined,
  };
}

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({
    success: false,
    message: 'Ошибки валидации',
    errors: errors.array(),
  });
  return true;
}

async function findAccessibleTask({ taskId, user, includeHistory = false, transaction = null }) {
  const where = { id: taskId };
  if (user.role !== 'admin') {
    where.assignedToUserId = user.id;
  }

  return EmployeeTask.findOne({
    where,
    include: includeHistory ? TASK_DETAIL_INCLUDE : TASK_INCLUDE,
    transaction,
  });
}

async function getTasks(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const where = buildTaskWhere(req.user, req.query);

    const { count, rows } = await EmployeeTask.findAndCountAll({
      where,
      include: TASK_INCLUDE,
      limit,
      offset,
      order: [
        ['dueDate', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    const baseWhere = buildTaskWhere(req.user, {
      scope: req.query.scope,
      assignedToUserId: req.query.assignedToUserId,
      createdByUserId: req.query.createdByUserId,
    });
    const statsEntries = await Promise.all(
      Object.values(EMPLOYEE_TASK_STATUSES).map(async (status) => [
        status,
        await EmployeeTask.count({ where: { ...baseWhere, status } }),
      ])
    );

    res.json({
      success: true,
      data: {
        tasks: rows.map((task) => serializeTask(task, req.user)),
        stats: Object.fromEntries(statsEntries),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.max(Math.ceil(count / limit), 1),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения задач:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задач',
      error: error.message,
    });
  }
}

async function getTaskById(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const task = await findAccessibleTask({
      taskId: req.params.id,
      user: req.user,
      includeHistory: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задача не найдена',
      });
    }

    res.json({
      success: true,
      data: { task: serializeTask(task, req.user) },
    });
  } catch (error) {
    console.error('Ошибка получения задачи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задачи',
      error: error.message,
    });
  }
}

async function createTask(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const assignee = await User.findOne({
      where: { id: req.body.assignedToUserId, isActive: true },
      attributes: USER_ATTRIBUTES,
    });

    if (!assignee) {
      return res.status(400).json({
        success: false,
        message: 'Ответственный сотрудник не найден или неактивен',
      });
    }

    const created = await sequelize.transaction(async (transaction) => {
      const task = await EmployeeTask.create({
        title: req.body.title,
        description: req.body.description || null,
        priority: req.body.priority || 'normal',
        assignedToUserId: assignee.id,
        createdByUserId: req.user.id,
        dueDate: req.body.dueDate || null,
      }, { transaction });

      await EmployeeTaskHistory.create(buildTaskHistoryEntry({
        taskId: task.id,
        actorId: req.user.id,
        action: EMPLOYEE_TASK_ACTIONS.CREATE,
        fromStatus: null,
        toStatus: EMPLOYEE_TASK_STATUSES.NEW,
        comment: req.body.comment || null,
      }), { transaction });

      return findAccessibleTask({
        taskId: task.id,
        user: req.user,
        includeHistory: true,
        transaction,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Задача создана',
      data: { task: serializeTask(created, req.user) },
    });
  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания задачи',
      error: error.message,
    });
  }
}

async function updateTask(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const payload = buildTaskUpdatePayload(req.body);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Нет данных для обновления',
      });
    }

    if (payload.assignedToUserId) {
      const assignee = await User.findOne({
        where: { id: payload.assignedToUserId, isActive: true },
        attributes: USER_ATTRIBUTES,
      });

      if (!assignee) {
        return res.status(400).json({
          success: false,
          message: 'Ответственный сотрудник не найден или неактивен',
        });
      }
    }

    const updated = await sequelize.transaction(async (transaction) => {
      const task = await findAccessibleTask({
        taskId: req.params.id,
        user: req.user,
        includeHistory: false,
        transaction,
      });

      if (!task) {
        const error = new Error('Задача не найдена');
        error.status = 404;
        throw error;
      }

      const wasReassigned =
        payload.assignedToUserId && Number(payload.assignedToUserId) !== Number(task.assignedToUserId);

      await task.update(payload, { transaction });
      await EmployeeTaskHistory.create(buildTaskHistoryEntry({
        taskId: task.id,
        actorId: req.user.id,
        action: wasReassigned ? EMPLOYEE_TASK_ACTIONS.REASSIGN : EMPLOYEE_TASK_ACTIONS.UPDATE,
        fromStatus: task.status,
        toStatus: task.status,
        comment: req.body.comment || null,
      }), { transaction });

      return findAccessibleTask({
        taskId: task.id,
        user: req.user,
        includeHistory: true,
        transaction,
      });
    });

    res.json({
      success: true,
      message: 'Задача обновлена',
      data: { task: serializeTask(updated, req.user) },
    });
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    console.error('Ошибка редактирования задачи:', error);
    res.status(status).json({
      success: false,
      message: status === 404 ? 'Задача не найдена' : 'Ошибка редактирования задачи',
      error: error.message,
    });
  }
}

async function addTaskComment(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const created = await sequelize.transaction(async (transaction) => {
      const task = await findAccessibleTask({
        taskId: req.params.id,
        user: req.user,
        includeHistory: false,
        transaction,
      });

      if (!task) {
        const error = new Error('Задача не найдена');
        error.status = 404;
        throw error;
      }

      return EmployeeTaskComment.create(buildTaskCommentEntry({
        taskId: task.id,
        authorId: req.user.id,
        comment: req.body.comment,
      }), { transaction });
    });

    const comment = await EmployeeTaskComment.findByPk(created.id, {
      include: [{ model: User, as: 'author', attributes: USER_ATTRIBUTES }],
    });

    res.status(201).json({
      success: true,
      message: 'Комментарий добавлен',
      data: { comment },
    });
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    console.error('Ошибка добавления комментария:', error);
    res.status(status).json({
      success: false,
      message: status === 404 ? 'Задача не найдена' : 'Ошибка добавления комментария',
      error: error.message,
    });
  }
}

async function applyTaskAction(req, res, action) {
  if (sendValidationErrors(req, res)) return;

  try {
    const updated = await sequelize.transaction(async (transaction) => {
      const task = await findAccessibleTask({
        taskId: req.params.id,
        user: req.user,
        includeHistory: false,
        transaction,
      });

      if (!task) {
        const error = new Error('Задача не найдена');
        error.status = 404;
        throw error;
      }

      assertTaskTransitionAllowed({ user: req.user, task, action });

      const fromStatus = task.status;
      const toStatus = getTaskStatusAfterAction(action);
      const updateData = { status: toStatus };

      if (action === EMPLOYEE_TASK_ACTIONS.SUBMIT_REVIEW) updateData.submittedAt = new Date();
      if (action === EMPLOYEE_TASK_ACTIONS.RETURN) updateData.submittedAt = null;
      if (action === EMPLOYEE_TASK_ACTIONS.APPROVE) updateData.completedAt = new Date();
      if (action === EMPLOYEE_TASK_ACTIONS.CANCEL) updateData.cancelledAt = new Date();

      await task.update(updateData, { transaction });
      await EmployeeTaskHistory.create(buildTaskHistoryEntry({
        taskId: task.id,
        actorId: req.user.id,
        action,
        fromStatus,
        toStatus,
        comment: req.body.comment || null,
      }), { transaction });

      return findAccessibleTask({
        taskId: task.id,
        user: req.user,
        includeHistory: true,
        transaction,
      });
    });

    res.json({
      success: true,
      message: 'Задача обновлена',
      data: { task: serializeTask(updated, req.user) },
    });
  } catch (error) {
    const status = error.status || error.statusCode || 500;
    console.error('Ошибка обновления задачи:', error);
    res.status(status).json({
      success: false,
      message: status === 404 ? 'Задача не найдена' : 'Ошибка обновления задачи',
      error: error.message,
    });
  }
}

module.exports = {
  addTaskComment,
  createTask,
  getTaskById,
  getTasks,
  updateTask,
  startTask: (req, res) => applyTaskAction(req, res, EMPLOYEE_TASK_ACTIONS.START),
  submitTaskForReview: (req, res) => applyTaskAction(req, res, EMPLOYEE_TASK_ACTIONS.SUBMIT_REVIEW),
  approveTask: (req, res) => applyTaskAction(req, res, EMPLOYEE_TASK_ACTIONS.APPROVE),
  returnTask: (req, res) => applyTaskAction(req, res, EMPLOYEE_TASK_ACTIONS.RETURN),
  cancelTask: (req, res) => applyTaskAction(req, res, EMPLOYEE_TASK_ACTIONS.CANCEL),
};
