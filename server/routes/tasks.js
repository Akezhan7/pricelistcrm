const express = require('express');
const { body, param, query } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const employeeTaskController = require('../controllers/employeeTaskController');
const {
  EMPLOYEE_TASK_PRIORITIES,
  EMPLOYEE_TASK_STATUSES,
} = require('../services/employeeTaskService');

const router = express.Router();

const statusValues = Object.values(EMPLOYEE_TASK_STATUSES);
const priorityValues = Object.values(EMPLOYEE_TASK_PRIORITIES);

router.use(auth);

router.get(
  '/',
  query('scope').optional().isIn(['all', 'assigned', 'created']),
  query('status').optional().isIn(statusValues),
  query('priority').optional().isIn(priorityValues),
  query('assignedToUserId').optional().isInt({ min: 1 }),
  query('createdByUserId').optional().isInt({ min: 1 }),
  query('search').optional().isString().trim().isLength({ max: 160 }),
  query('overdue').optional().isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  employeeTaskController.getTasks
);

router.post(
  '/',
  requireRole('admin'),
  body('title').trim().isLength({ min: 3, max: 160 }),
  body('description').optional({ nullable: true }).isString().trim(),
  body('assignedToUserId').isInt({ min: 1 }),
  body('priority').optional().isIn(priorityValues),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('comment').optional({ nullable: true }).isString().trim(),
  employeeTaskController.createTask
);

router.get(
  '/:id',
  param('id').isInt({ min: 1 }),
  employeeTaskController.getTaskById
);

router.patch(
  '/:id',
  requireRole('admin'),
  param('id').isInt({ min: 1 }),
  body('title').optional().trim().isLength({ min: 3, max: 160 }),
  body('description').optional({ nullable: true }).isString().trim(),
  body('assignedToUserId').optional().isInt({ min: 1 }),
  body('priority').optional().isIn(priorityValues),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('comment').optional({ nullable: true }).isString().trim(),
  employeeTaskController.updateTask
);

router.post(
  '/:id/comments',
  param('id').isInt({ min: 1 }),
  body('comment').trim().isLength({ min: 1, max: 4000 }),
  employeeTaskController.addTaskComment
);

router.patch(
  '/:id/start',
  param('id').isInt({ min: 1 }),
  employeeTaskController.startTask
);

router.patch(
  '/:id/submit-review',
  param('id').isInt({ min: 1 }),
  body('comment').optional({ nullable: true }).isString().trim(),
  employeeTaskController.submitTaskForReview
);

router.patch(
  '/:id/approve',
  requireRole('admin'),
  param('id').isInt({ min: 1 }),
  body('comment').optional({ nullable: true }).isString().trim(),
  employeeTaskController.approveTask
);

router.patch(
  '/:id/return',
  requireRole('admin'),
  param('id').isInt({ min: 1 }),
  body('comment').trim().isLength({ min: 2, max: 2000 }),
  employeeTaskController.returnTask
);

router.patch(
  '/:id/cancel',
  requireRole('admin'),
  param('id').isInt({ min: 1 }),
  body('comment').optional({ nullable: true }).isString().trim(),
  employeeTaskController.cancelTask
);

module.exports = router;
