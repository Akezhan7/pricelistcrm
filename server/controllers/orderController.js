const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, OrderStatusHistory, Product, Supplier, User, Payment } = require('../models');
const { recalculateSupplierDebt } = require('./paymentController');
const { createPriceHistoryRecord } = require('./priceHistoryController');

/**
 * Автоматический расчет статуса оплаты на основе сумм
 * @param {Object} order - объект заявки
 * @returns {string} - статус оплаты
 */
const calculatePaymentStatus = (order) => {
  const totalAmount = parseFloat(order.totalAmount);
  const paidAmount = parseFloat(order.paidAmount);

  if (paidAmount <= 0) {
    return 'Не оплачено';
  } else if (paidAmount >= totalAmount) {
    return 'Оплачено';
  } else {
    return 'Частично оплачено';
  }
};

/**
 * Генерация уникального номера заявки в формате ORD-YYYY-NNNN 
 */
const generateOrderNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  
  // Найти последнюю заявку текущего года
  const lastOrder = await Order.findOne({
    where: {
      orderNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Получить список всех заявок с фильтрацией
 * GET /api/orders
 */
exports.getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      supplierId,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // Построение условий фильтрации
    const where = { isActive: true };

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    if (search) {
      where.orderNumber = {
        [Op.like]: `%${search}%`
      };
    }

    // Фильтрация по датам
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Получение заявок
    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone', 'whatsapp']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Статистика по всем заявкам (не только текущей страницы)
    const stats = await Order.findAll({
      where: { isActive: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'В работе\' THEN 1 END')), 'inProgress'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'На точке\' THEN 1 END')), 'atLocation'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'В пути\' THEN 1 END')), 'inTransit'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'На складе\' THEN 1 END')), 'atWarehouse'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalPaid']
      ],
      raw: true
    });

    const statsResult = stats[0] || {};
    const totalAmount = parseFloat(statsResult.totalAmount || 0);
    const totalPaid = parseFloat(statsResult.totalPaid || 0);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit)
        },
        stats: {
          inProgress: parseInt(statsResult.inProgress || 0),
          atLocation: parseInt(statsResult.atLocation || 0),
          inTransit: parseInt(statsResult.inTransit || 0),
          atWarehouse: parseInt(statsResult.atWarehouse || 0),
          totalAmount: totalAmount.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalDebt: (totalAmount - totalPaid).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения списка заявок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка заявок',
      error: error.message
    });
  }
};

/**
 * Получить детальную информацию о заявке
 * GET /api/orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'address', 'phone', 'whatsapp']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'article', 'image', 'costPrice', 'sellingPrice']
            }
          ]
        },
        {
          model: OrderStatusHistory,
          as: 'statusHistory',
          include: [
            {
              model: User,
              as: 'changer',
              attributes: ['id', 'name']
            }
          ],
          order: [['changedAt', 'ASC']]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Ошибка получения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заявки',
      error: error.message
    });
  }
};

/**
 * Создать новую заявку
 * POST /api/orders
 * Доступ: admin, purchase_manager
 */
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplierId, expectedDeliveryDate, deliveryLocation, notes, items } = req.body;

    // Проверка существования поставщика
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Поставщик не найден',
        errors: [{ field: 'supplierId', message: 'Поставщик не найден' }]
      });
    }

    // Проверка наличия товаров
    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Необходимо добавить хотя бы один товар',
        errors: [{ field: 'items', message: 'Список товаров пуст' }]
      });
    }

    // Проверка существования всех товаров и расчет общей суммы
    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Товар с ID ${item.productId} не найден`,
          errors: [{ field: 'items', message: `Товар с ID ${item.productId} не найден` }]
        });
      }
      totalAmount += parseFloat(item.priceAtPurchase) * parseInt(item.quantity);
    }

    // Генерация номера заявки
    const orderNumber = await generateOrderNumber();

    // Создание заявки
    const order = await Order.create({
      orderNumber,
      supplierId,
      expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryLocation: deliveryLocation || 'Точка Байсад',
      totalAmount: totalAmount.toFixed(2),
      paidAmount: 0,
      status: 'В работе',
      paymentStatus: 'Не оплачено',
      notes,
      createdBy: req.user.id,
      isActive: true
    }, { transaction });

    // Создание товаров в заявке
    const orderItemsData = items.map(item => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      totalPrice: (parseFloat(item.priceAtPurchase) * parseInt(item.quantity)).toFixed(2),
      notes: item.notes || null
    }));

    await OrderItem.bulkCreate(orderItemsData, { transaction });

    // Создание записи в истории статусов
    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus: null,
      newStatus: 'В работе',
      changedBy: req.user.id,
      comment: 'Заявка создана',
      changedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Пересчитать задолженность поставщика
    await recalculateSupplierDebt(supplierId);

    // Получение полной информации о созданной заявке
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'article']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdOrder,
      message: 'Заявка успешно создана'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка создания заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания заявки',
      error: error.message
    });
  }
};

/**
 * Обновить заявку
 * PUT /api/orders/:id
 * Доступ: admin, purchase_manager
 * Ограничение: можно редактировать только если статус = "В работе"
 */
exports.updateOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { expectedDeliveryDate, deliveryLocation, notes, items } = req.body;

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true }
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Проверка, что заявка в статусе "В работе"
    if (order.status !== 'В работе') {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Невозможно редактировать заявку. Текущий статус: ${order.status}`
      });
    }

    // Обновление основной информации
    if (expectedDeliveryDate !== undefined) order.expectedDeliveryDate = expectedDeliveryDate;
    if (deliveryLocation !== undefined) order.deliveryLocation = deliveryLocation;
    if (notes !== undefined) order.notes = notes;

    // Обновление товаров если они переданы
    if (items && items.length > 0) {
      // Удалить старые товары
      await OrderItem.destroy({
        where: { orderId: order.id },
        transaction
      });

      // Проверка существования товаров и расчет новой суммы
      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (!product) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Товар с ID ${item.productId} не найден`
          });
        }
        totalAmount += parseFloat(item.priceAtPurchase) * parseInt(item.quantity);
      }

      // Создать новые товары
      const orderItemsData = items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        totalPrice: (parseFloat(item.priceAtPurchase) * parseInt(item.quantity)).toFixed(2),
        notes: item.notes || null
      }));

      await OrderItem.bulkCreate(orderItemsData, { transaction });

      // Обновить общую сумму заявки
      order.totalAmount = totalAmount.toFixed(2);
    }

    await order.save({ transaction });
    await transaction.commit();

    // Пересчитать задолженность поставщика
    await recalculateSupplierDebt(order.supplierId);

    // Получение обновленной заявки
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'article']
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Заявка успешно обновлена'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка обновления заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления заявки',
      error: error.message
    });
  }
};

/**
 * Изменить статус заявки
 * PATCH /api/orders/:id/status
 * Правила смены статусов и доступа:
 * 1. "В работе" → "На точке" (admin, purchase_manager)
 * 2. "На точке" → "В пути" (admin, purchase_manager, driver)
 * 3. "В пути" → "На складе" (admin, warehouse_operator, driver)
 */
exports.changeOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    // Валидация нового статуса
    const validStatuses = ['В работе', 'На точке', 'В пути', 'На складе'];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус',
        validStatuses
      });
    }

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true }
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    const currentStatus = order.status;

    // Если статус не меняется
    if (currentStatus === status) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Заявка уже имеет этот статус'
      });
    }

    // Определение допустимых переходов статусов
    const statusFlow = {
      'В работе': 'На точке',
      'На точке': 'В пути',
      'В пути': 'На складе'
    };

    // Проверка допустимости перехода
    if (statusFlow[currentStatus] !== status) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Невозможно изменить статус с "${currentStatus}" на "${status}". Допустимый следующий статус: "${statusFlow[currentStatus] || 'нет'}"`
      });
    }

    // Проверка прав доступа на основе перехода
    const userRole = req.user.role;
    let hasPermission = false;

    if (currentStatus === 'В работе' && status === 'На точке') {
      hasPermission = ['admin', 'purchase_manager'].includes(userRole);
    } else if (currentStatus === 'На точке' && status === 'В пути') {
      hasPermission = ['admin', 'purchase_manager', 'driver'].includes(userRole);
    } else if (currentStatus === 'В пути' && status === 'На складе') {
      hasPermission = ['admin', 'warehouse_operator', 'driver'].includes(userRole);
    }

    if (!hasPermission) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: `Недостаточно прав для изменения статуса с "${currentStatus}" на "${status}"`
      });
    }

    // Обновление статуса заявки
    order.status = status;
    await order.save({ transaction });

    // Создание записи в истории
    const statusHistory = await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus: currentStatus,
      newStatus: status,
      changedBy: req.user.id,
      comment: comment || null,
      changedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Получение обновленной заявки
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        order: updatedOrder,
        statusHistory
      },
      message: 'Статус заявки изменен'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка изменения статуса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка изменения статуса',
      error: error.message
    });
  }
};

/**
 * Удалить заявку (мягкое удаление)
 * DELETE /api/orders/:id
 * Доступ: admin
 * Ограничение: можно удалить только если статус = "В работе" и paymentStatus = "Не оплачено"
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Проверка возможности удаления
    if (order.status !== 'В работе' || order.paymentStatus !== 'Не оплачено') {
      return res.status(409).json({
        success: false,
        message: 'Невозможно удалить заявку. Можно удалить только заявки в статусе "В работе" и "Не оплачено"',
        currentStatus: order.status,
        paymentStatus: order.paymentStatus
      });
    }

    const supplierId = order.supplierId;

    // Мягкое удаление
    order.isActive = false;
    await order.save();

    // Пересчитать задолженность поставщика
    await recalculateSupplierDebt(supplierId);

    res.json({
      success: true,
      message: 'Заявка успешно удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления заявки',
      error: error.message
    });
  }
};

/**
 * Обновить оплату заявки
 * PATCH /api/orders/:id/payment
 * Доступ: admin, purchase_manager, accountant
 */
exports.updatePayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { amount, comment } = req.body;

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true }
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Валидация суммы оплаты
    const paymentAmount = parseFloat(amount);
    const currentPaid = parseFloat(order.paidAmount);
    const totalAmount = parseFloat(order.totalAmount);

    if (paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Сумма оплаты должна быть больше нуля',
        errors: [{ field: 'amount', message: 'Сумма должна быть положительной' }]
      });
    }

    // Проверка на превышение общей суммы
    const newPaidAmount = currentPaid + paymentAmount;
    if (newPaidAmount > totalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Сумма оплаты превышает остаток к доплате',
        data: {
          totalAmount: totalAmount.toFixed(2),
          currentPaid: currentPaid.toFixed(2),
          remainingAmount: (totalAmount - currentPaid).toFixed(2),
          attemptedPayment: paymentAmount.toFixed(2)
        }
      });
    }

    // Создание записи о платеже в таблице Payment
    const payment = await Payment.create({
      supplierId: order.supplierId,
      amount: paymentAmount.toFixed(2),
      paymentDate: new Date(),
      paymentMethod: 'Наличные', // По умолчанию, можно добавить поле в запрос
      comment: comment || `Оплата по заявке ${order.orderNumber}`,
      createdBy: req.user.id,
      relatedOrderIds: [order.id]
    }, { transaction });

    // Обновление оплаты
    order.paidAmount = newPaidAmount.toFixed(2);
    
    // Автоматическое обновление статуса оплаты
    const oldPaymentStatus = order.paymentStatus;
    order.paymentStatus = calculatePaymentStatus(order);

    await order.save({ transaction });

    // Создание записи в истории о платеже (всегда, независимо от изменения статуса)
    await OrderStatusHistory.create({
      orderId: order.id,
      oldStatus: order.status, // Статус заявки остается тем же
      newStatus: order.status,
      changedBy: req.user.id,
      comment: `Зарегистрирована оплата: ${paymentAmount.toFixed(2)} тенге. ${oldPaymentStatus !== order.paymentStatus ? `Статус оплаты изменен с "${oldPaymentStatus}" на "${order.paymentStatus}". ` : ''}${comment ? 'Комментарий: ' + comment : ''}`,
      changedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Пересчитать задолженность поставщика
    await recalculateSupplierDebt(order.supplierId);

    // Получение обновленной заявки
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        order: updatedOrder,
        payment: {
          amount: paymentAmount.toFixed(2),
          newPaidAmount: newPaidAmount.toFixed(2),
          remainingAmount: (totalAmount - newPaidAmount).toFixed(2),
          statusChanged: oldPaymentStatus !== order.paymentStatus,
          oldStatus: oldPaymentStatus,
          newStatus: order.paymentStatus
        }
      },
      message: `Оплата в размере ${paymentAmount.toFixed(2)} тенге успешно зарегистрирована`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка обновления оплаты:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка регистрации оплаты',
      error: error.message
    });
  }
};

/**
 * Получить историю платежей по заказу
 * GET /api/orders/:id/payments
 */
exports.getOrderPayments = async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем существование заказа
    const order = await Order.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'orderNumber', 'supplierId', 'totalAmount', 'paidAmount', 'paymentStatus']
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Получаем все платежи связанные с этим заказом
    const payments = await Payment.findAll({
      where: {
        supplierId: order.supplierId,
        relatedOrderIds: {
          [Op.contains]: [parseInt(id)]
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        order,
        payments
      }
    });

  } catch (error) {
    console.error('Ошибка получения истории платежей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории платежей',
      error: error.message
    });
  }
};

/**
 * Обновить базовые цены товаров на основе заявки
 * PATCH /api/orders/:id/update-prices
 * Доступ: admin, purchase_manager
 */
exports.updateProductPricesFromOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { priceUpdates } = req.body; // [{ productId, newCostPrice?, newSellingPrice?, reason }]

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
        },
      ],
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    if (!priceUpdates || priceUpdates.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Не указаны товары для обновления цен',
      });
    }

    const updatedProducts = [];

    for (const update of priceUpdates) {
      const { productId, newCostPrice, newSellingPrice, reason } = update;

      // Найти товар
      const product = await Product.findByPk(productId);
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Товар с ID ${productId} не найден`,
        });
      }

      const oldCostPrice = parseFloat(product.costPrice);
      const oldSellingPrice = parseFloat(product.sellingPrice);
      let priceChanged = false;

      // Обновление себестоимости
      if (newCostPrice !== undefined && parseFloat(newCostPrice) !== oldCostPrice) {
        await createPriceHistoryRecord({
          productId: product.id,
          oldPrice: oldCostPrice,
          newPrice: newCostPrice,
          priceType: 'costPrice',
          changeReason: reason || `Обновление через заявку ${order.orderNumber}`,
          changedBy: req.user.id,
          orderId: order.id,
        });

        product.costPrice = newCostPrice;
        priceChanged = true;
      }

      // Обновление цены продажи
      if (newSellingPrice !== undefined && parseFloat(newSellingPrice) !== oldSellingPrice) {
        await createPriceHistoryRecord({
          productId: product.id,
          oldPrice: oldSellingPrice,
          newPrice: newSellingPrice,
          priceType: 'sellingPrice',
          changeReason: reason || `Обновление через заявку ${order.orderNumber}`,
          changedBy: req.user.id,
          orderId: order.id,
        });

        product.sellingPrice = newSellingPrice;
        priceChanged = true;
      }

      if (priceChanged) {
        await product.save({ transaction });
        updatedProducts.push({
          id: product.id,
          name: product.name,
          article: product.article,
          oldCostPrice,
          newCostPrice: parseFloat(product.costPrice),
          oldSellingPrice,
          newSellingPrice: parseFloat(product.sellingPrice),
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
        },
        updatedProducts,
      },
      message: `Успешно обновлены цены для ${updatedProducts.length} товаров`,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка обновления цен товаров:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления цен товаров',
      error: error.message,
    });
  }
};

