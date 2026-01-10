const express = require('express');
const { body, param, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const collectorController = require('../controllers/collectorController');

const router = express.Router();

// Все маршруты доступны только для сборщиков и админов
router.use(auth);
router.use(checkRole(['collector', 'admin']));

// GET /api/collector/tasks - Получить список заданий
router.get('/tasks', collectorController.getMyTasks);

// GET /api/collector/tasks/:id - Получить детальную информацию о задании
router.get('/tasks/:id', collectorController.getTaskById);

// PUT /api/collector/tasks/:id/start - Начать выполнение задания
router.put('/tasks/:id/start', collectorController.startTask);

// PUT /api/collector/tasks/:id/complete - Завершить задание
router.put(
  '/tasks/:id/complete',
  body('notes').optional().isString().trim(),
  collectorController.completeTask
);

// PATCH /api/collector/tasks/:id/notes - Добавить заметку
router.patch(
  '/tasks/:id/notes',
  body('notes').notEmpty().isString().trim(),
  collectorController.addNotes
);

// GET /api/collector/stats - Получить статистику
router.get('/stats', collectorController.getCollectorStats);

module.exports = router;
