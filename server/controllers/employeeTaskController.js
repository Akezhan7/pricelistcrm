const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { taskAttachmentsDir, removeUploadedFile } = require('../middleware/upload');
const {
  EmployeeTask,
  EmployeeTaskAssignee,
  EmployeeTaskAttachment,
  EmployeeTaskComment,
  EmployeeTaskHistory,
  User,
  sequelize,
} = require('../models');
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
  {
    model: EmployeeTaskAssignee,
    as: 'assignments',
    separate: true,
    order: [['role', 'DESC'], ['id', 'ASC']],
    include: [{ model: User, as: 'user', attributes: USER_ATTRIBUTES }],
  },
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
  {
    model: EmployeeTaskAttachment,
    as: 'attachments',
    separate: true,
    attributes: ['id', 'taskId', 'uploadedByUserId', 'originalName', 'mimeType', 'size', 'createdAt'],
    order: [['createdAt', 'DESC']],
    include: [{ model: User, as: 'uploader', attributes: USER_ATTRIBUTES }],
  },
];

function serializeTask(task, viewer) {
  const plain = task?.toJSON ? task.toJSON() : task;
  if (!plain) return null;
  return {
    ...plain,
    assignees: plain.assignments?.map((assignment) => ({
      ...assignment.user,
      assignmentRole: assignment.role,
    })) || (plain.assignee ? [{ ...plain.assignee, assignmentRole: 'primary' }] : []),
    assignments: undefined,
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
    const assignment = await EmployeeTaskAssignee.findOne({
      where: { taskId, userId: user.id },
      transaction,
    });
    if (!assignment) return null;
  }

  return EmployeeTask.findOne({
    where,
    include: includeHistory ? TASK_DETAIL_INCLUDE : TASK_INCLUDE,
    transaction,
  });
}

async function getAssignedTaskIds(userId) {
  const rows = await EmployeeTaskAssignee.findAll({
    where: { userId },
    attributes: ['taskId'],
    raw: true,
  });
  return rows.map((row) => Number(row.taskId));
}

async function syncTaskAssignments({ taskId, primaryUserId, collaboratorUserIds, transaction }) {
  const collaborators = [...new Set(collaboratorUserIds.map(Number))]
    .filter((id) => id !== Number(primaryUserId));
  await EmployeeTaskAssignee.destroy({ where: { taskId }, transaction });
  await EmployeeTaskAssignee.bulkCreate([
    { taskId, userId: primaryUserId, role: 'primary' },
    ...collaborators.map((userId) => ({ taskId, userId, role: 'collaborator' })),
  ], { transaction });
}

async function getTasks(req, res) {
  if (sendValidationErrors(req, res)) return;

  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    let assignmentUserId = null;
    if (req.user.role !== 'admin') assignmentUserId = req.user.id;
    else if (req.query.scope === 'assigned') assignmentUserId = req.user.id;
    else if (req.query.assignedToUserId) assignmentUserId = Number(req.query.assignedToUserId);
    const assignedTaskIds = assignmentUserId ? await getAssignedTaskIds(assignmentUserId) : null;
    const where = buildTaskWhere(req.user, {
      ...req.query,
      ...(assignedTaskIds ? { assignedTaskIds } : {}),
    });

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
      createdByUserId: req.query.createdByUserId,
      ...(assignedTaskIds ? { assignedTaskIds } : {}),
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
    const collaboratorUserIds = [...new Set((req.body.collaboratorUserIds || []).map(Number))]
      .filter((id) => id !== Number(req.body.assignedToUserId));
    const assigneeIds = [Number(req.body.assignedToUserId), ...collaboratorUserIds];
    const assignees = await User.findAll({
      where: { id: assigneeIds, isActive: true },
      attributes: USER_ATTRIBUTES,
    });

    if (assignees.length !== assigneeIds.length) {
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
        assignedToUserId: req.body.assignedToUserId,
        createdByUserId: req.user.id,
        dueDate: buildTaskUpdatePayload({ dueDate: req.body.dueDate }).dueDate,
      }, { transaction });

      await syncTaskAssignments({
        taskId: task.id,
        primaryUserId: req.body.assignedToUserId,
        collaboratorUserIds,
        transaction,
      });

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
    const collaboratorUserIds = payload.collaboratorUserIds;
    delete payload.collaboratorUserIds;
    if (Object.keys(payload).length === 0 && collaboratorUserIds === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Нет данных для обновления',
      });
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

      if (payload.assignedToUserId || collaboratorUserIds !== undefined) {
        const primaryUserId = payload.assignedToUserId || task.assignedToUserId;
        const currentCollaborators = task.assignments
          ?.filter((item) => item.role === 'collaborator').map((item) => item.userId) || [];
        const nextCollaborators = collaboratorUserIds === undefined ? currentCollaborators : collaboratorUserIds;
        const assigneeIds = [...new Set([primaryUserId, ...nextCollaborators].map(Number))];
        const assignees = await User.findAll({
          where: { id: assigneeIds, isActive: true },
          attributes: ['id'],
          transaction,
        });
        if (assignees.length !== assigneeIds.length) {
          const error = new Error('Ответственный сотрудник не найден или неактивен');
          error.status = 400;
          throw error;
        }
      }

      await task.update(payload, { transaction });
      if (collaboratorUserIds !== undefined || wasReassigned) {
        await syncTaskAssignments({
          taskId: task.id,
          primaryUserId: task.assignedToUserId,
          collaboratorUserIds: collaboratorUserIds || task.assignments
            ?.filter((item) => item.role === 'collaborator').map((item) => item.userId) || [],
          transaction,
        });
      }
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

async function addTaskAttachments(req, res) {
  if (sendValidationErrors(req, res)) {
    (req.files || []).forEach(removeUploadedFile);
    return;
  }
  try {
    const task = await findAccessibleTask({ taskId: req.params.id, user: req.user });
    if (!task) {
      (req.files || []).forEach(removeUploadedFile);
      return res.status(404).json({ success: false, message: 'Задача не найдена' });
    }
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'Выберите хотя бы один файл' });
    }
    const existingCount = await EmployeeTaskAttachment.count({ where: { taskId: task.id } });
    if (existingCount + req.files.length > 10) {
      req.files.forEach(removeUploadedFile);
      return res.status(400).json({ success: false, message: 'К задаче можно прикрепить не больше 10 файлов' });
    }
    const attachments = await EmployeeTaskAttachment.bulkCreate(req.files.map((file) => ({
      taskId: task.id,
      uploadedByUserId: req.user.id,
      originalName: file.originalname.slice(0, 255),
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    })), { returning: true });
    res.status(201).json({
      success: true,
      data: {
        attachments: attachments.map((attachment) => {
          const plain = attachment.toJSON();
          delete plain.storedName;
          return plain;
        }),
      },
    });
  } catch (error) {
    (req.files || []).forEach(removeUploadedFile);
    res.status(500).json({ success: false, message: 'Не удалось загрузить вложения' });
  }
}

async function downloadTaskAttachment(req, res) {
  if (sendValidationErrors(req, res)) return;
  try {
    const task = await findAccessibleTask({ taskId: req.params.id, user: req.user });
    if (!task) return res.status(404).json({ success: false, message: 'Задача не найдена' });
    const attachment = await EmployeeTaskAttachment.findOne({
      where: { id: req.params.attachmentId, taskId: task.id },
    });
    if (!attachment) return res.status(404).json({ success: false, message: 'Файл не найден' });
    const filePath = path.join(taskAttachmentsDir, attachment.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'Файл отсутствует на сервере' });
    return res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error('Ошибка скачивания вложения задачи:', error);
    return res.status(500).json({ success: false, message: 'Не удалось скачать файл' });
  }
}

async function deleteTaskAttachment(req, res) {
  if (sendValidationErrors(req, res)) return;
  try {
    const task = await findAccessibleTask({ taskId: req.params.id, user: req.user });
    if (!task) return res.status(404).json({ success: false, message: 'Задача не найдена' });
    const attachment = await EmployeeTaskAttachment.findOne({
      where: { id: req.params.attachmentId, taskId: task.id },
    });
    if (!attachment) return res.status(404).json({ success: false, message: 'Файл не найден' });
    if (req.user.role !== 'admin' && Number(attachment.uploadedByUserId) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Удалить файл может администратор или автор загрузки' });
    }
    const filePath = path.join(taskAttachmentsDir, attachment.storedName);
    await attachment.destroy();
    removeUploadedFile({ path: filePath });
    return res.json({ success: true, message: 'Вложение удалено' });
  } catch (error) {
    console.error('Ошибка удаления вложения задачи:', error);
    return res.status(500).json({ success: false, message: 'Не удалось удалить файл' });
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
  addTaskAttachments,
  downloadTaskAttachment,
  deleteTaskAttachment,
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
