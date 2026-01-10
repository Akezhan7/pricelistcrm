const { CollectorTask, Order, OrderItem, Product, Supplier, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Получить список заданий для текущего сборщика
 * GET /api/collector/tasks
 */
const getMyTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      assignedTo: req.user.id,
    };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: tasks } = await CollectorTask.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'deliveryLocation', 'expectedDeliveryDate', 'status'],
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'name', 'address', 'phone', 'whatsapp'],
            },
            {
              model: OrderItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'internalName', 'article'],
                },
              ],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [
        ['status', 'ASC'], // pending первыми
        ['createdAt', 'ASC'], // старые первыми
      ],
    });

    // Добавляем краткую статистику
    const stats = {
      pending: await CollectorTask.count({
        where: { assignedTo: req.user.id, status: 'pending' },
      }),
      in_progress: await CollectorTask.count({
        where: { assignedTo: req.user.id, status: 'in_progress' },
      }),
      completed: await CollectorTask.count({
        where: { assignedTo: req.user.id, status: 'completed' },
      }),
    };

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('Ошибка получения заданий сборщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заданий сборщика',
      error: error.message,
    });
  }
};

/**
 * Получить детальную информацию о задании
 * GET /api/collector/tasks/:id
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await CollectorTask.findOne({
      where: {
        id,
        assignedTo: req.user.id, // Только свои задания
      },
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'name', 'address', 'phone', 'whatsapp', 'sectorId', 'rowId'],
            },
            {
              model: OrderItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'internalName', 'article', 'image'],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено',
      });
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    console.error('Ошибка получения задания:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения задания',
      error: error.message,
    });
  }
};

/**
 * Начать выполнение задания
 * PUT /api/collector/tasks/:id/start
 */
const startTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await CollectorTask.findOne({
      where: {
        id,
        assignedTo: req.user.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено',
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Задание уже начато или завершено',
      });
    }

    await task.update({
      status: 'in_progress',
    });

    res.json({
      success: true,
      message: 'Задание начато',
      data: { task },
    });
  } catch (error) {
    console.error('Ошибка начала выполнения задания:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка начала выполнения задания',
      error: error.message,
    });
  }
};

/**
 * Завершить выполнение задания (товар собран)
 * PUT /api/collector/tasks/:id/complete
 */
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const task = await CollectorTask.findOne({
      where: {
        id,
        assignedTo: req.user.id,
      },
      include: [
        {
          model: Order,
          as: 'order',
        },
      ],
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено',
      });
    }

    if (task.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Задание уже завершено',
      });
    }

    await task.update({
      status: 'completed',
      isCollected: true,
      collectedAt: new Date(),
      notes: notes || task.notes,
    });

    // Обновляем статус заявки на "Забрана"
    if (task.order) {
      await task.order.update({
        status: 'Забрана',
      });
    }

    res.json({
      success: true,
      message: 'Задание успешно завершено',
      data: { task },
    });
  } catch (error) {
    console.error('Ошибка завершения задания:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка завершения задания',
      error: error.message,
    });
  }
};

/**
 * Добавить заметку к заданию
 * PATCH /api/collector/tasks/:id/notes
 */
const addNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать текст заметки',
      });
    }

    const task = await CollectorTask.findOne({
      where: {
        id,
        assignedTo: req.user.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено',
      });
    }

    await task.update({
      notes: notes,
    });

    res.json({
      success: true,
      message: 'Заметка успешно добавлена',
      data: { task },
    });
  } catch (error) {
    console.error('Ошибка добавления заметки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка добавления заметки',
      error: error.message,
    });
  }
};

/**
 * Получить статистику по заданиям за период
 * GET /api/collector/stats
 */
const getCollectorStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const whereClause = {
      assignedTo: req.user.id,
    };

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const stats = {
      total: await CollectorTask.count({ where: whereClause }),
      pending: await CollectorTask.count({
        where: { ...whereClause, status: 'pending' },
      }),
      in_progress: await CollectorTask.count({
        where: { ...whereClause, status: 'in_progress' },
      }),
      completed: await CollectorTask.count({
        where: { ...whereClause, status: 'completed' },
      }),
      collected: await CollectorTask.count({
        where: { ...whereClause, isCollected: true },
      }),
    };

    // Получаем последние завершённые задания
    const recentCompletedTasks = await CollectorTask.findAll({
      where: { ...whereClause, status: 'completed' },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'deliveryLocation'],
        },
      ],
      limit: 5,
      order: [['collectedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        stats,
        recentCompletedTasks,
      },
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
      error: error.message,
    });
  }
};

module.exports = {
  getMyTasks,
  getTaskById,
  startTask,
  completeTask,
  addNotes,
  getCollectorStats,
};
