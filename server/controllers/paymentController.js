const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Payment, Order, Supplier, User } = require('../models');
const { DEBT_STATUSES } = require('../services/orderStatusPolicyService');
const { calculateOrderDebtContribution } = require('../services/orderSettlementService');

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
 * Пересчет задолженности поставщика
 * @param {number} supplierId - ID поставщика
 * @returns {Promise<number>} - общая задолженность
 */
const recalculateSupplierDebt = async (supplierId, options = {}) => {
  if (!supplierId) return 0;

  const orders = await Order.findAll({
    where: {
      supplierId,
      isActive: true,
      status: { [Op.in]: DEBT_STATUSES },
    },
    attributes: [
      'type',
      'status',
      'settlementType',
      'totalAmount',
      'paidAmount',
      'isActive',
    ],
    transaction: options.transaction,
  });

  const totalDebt = Math.max(
    0,
    orders.reduce(
      (sum, order) => sum + calculateOrderDebtContribution(order),
      0
    )
  );

  // Обновляем поле debt в таблице поставщиков
  await Supplier.update(
    { debt: totalDebt.toFixed(2) },
    { where: { id: supplierId }, transaction: options.transaction }
  );

  return totalDebt;
};

/**
 * Получить список всех платежей с фильтрацией
 * GET /api/payments
 */
const getPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      supplierId,
      dateFrom,
      dateTo,
      paymentMethod
    } = req.query;

    // Построение условий фильтрации
    const where = {};

    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // Фильтрация по датам
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) {
        where.paymentDate[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.paymentDate[Op.lte] = new Date(dateTo);
      }
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Получение платежей
    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['paymentDate', 'DESC']],
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения списка платежей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка платежей',
      error: error.message
    });
  }
};

/**
 * Получить платежи по конкретному поставщику
 * GET /api/payments/supplier/:supplierId
 */
const getPaymentsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    // Проверка существования поставщика
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден'
      });
    }

    // Получение платежей
    const payments = await Payment.findAll({
      where: { supplierId },
      order: [['paymentDate', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    // Получение неоплаченных и частично оплаченных заявок
    const unpaidOrders = await Order.findAll({
      where: {
        supplierId,
        isActive: true,
        type: 'purchase',
        paymentStatus: {
          [Op.in]: ['Не оплачено', 'Частично оплачено']
        },
        status: { [Op.in]: DEBT_STATUSES },
      },
      attributes: ['id', 'orderNumber', 'totalAmount', 'paidAmount', 'paymentStatus', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Расчет статистики
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalDebt = unpaidOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.totalAmount) - parseFloat(order.paidAmount));
    }, 0);

    res.json({
      success: true,
      data: {
        supplier,
        payments,
        unpaidOrders,
        stats: {
          totalPaid: totalPaid.toFixed(2),
          totalDebt: totalDebt.toFixed(2),
          paymentsCount: payments.length,
          unpaidOrdersCount: unpaidOrders.length
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения платежей поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения платежей поставщика',
      error: error.message
    });
  }
};

/**
 * Создать новый платеж
 * POST /api/payments
 */
const createPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    let { supplierId, amount, paymentDate, paymentMethod, comment, orderIds } = req.body;

    // При multipart/form-data из FormData orderIds может прийти как строка JSON
    if (typeof orderIds === 'string') {
      try {
        orderIds = JSON.parse(orderIds);
      } catch (e) {
        orderIds = [];
      }
    }

    // Чек (файл) сохраняется опционально multer-ом в req.file
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Валидация входных данных
    if (!supplierId || !amount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать поставщика и сумму платежа',
        errors: [
          !supplierId && { field: 'supplierId', message: 'Поставщик обязателен' },
          !amount && { field: 'amount', message: 'Сумма обязательна' }
        ].filter(Boolean)
      });
    }

    // Проверка существования поставщика
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Сумма платежа должна быть больше нуля'
      });
    }

    // Проверка заказов, если они указаны
    let validOrderIds = [];
    if (orderIds && orderIds.length > 0) {
      const orders = await Order.findAll({
        where: {
          id: { [Op.in]: orderIds },
          supplierId,
          isActive: true
        }
      });

      if (orders.length !== orderIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Один или несколько заказов не найдены или не принадлежат указанному поставщику'
        });
      }

      validOrderIds = orders.map(order => order.id);
    }

    // Создание платежа
    const payment = await Payment.create({
      supplierId,
      amount: paymentAmount.toFixed(2),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'Наличные',
      comment: comment || null,
      createdBy: req.user.id,
      relatedOrderIds: validOrderIds,
      receiptUrl
    }, { transaction });

    // Если указаны конкретные заказы, распределяем платеж по ним
    if (validOrderIds.length > 0) {
      const orders = await Order.findAll({
        where: { id: { [Op.in]: validOrderIds } },
        transaction
      });

      let remainingAmount = paymentAmount;

      for (const order of orders) {
        if (remainingAmount <= 0) break;

        const orderTotal = parseFloat(order.totalAmount);
        const orderPaid = parseFloat(order.paidAmount);
        const orderRemaining = orderTotal - orderPaid;

        if (orderRemaining > 0) {
          const paymentForOrder = Math.min(remainingAmount, orderRemaining);
          
          order.paidAmount = (orderPaid + paymentForOrder).toFixed(2);
          order.paymentStatus = calculatePaymentStatus(order);
          
          await order.save({ transaction });
          
          remainingAmount -= paymentForOrder;
        }
      }
    } else {
      // Если заказы не указаны, автоматически распределяем по неоплаченным заказам
      const unpaidOrders = await Order.findAll({
        where: {
          supplierId,
          isActive: true,
          paymentStatus: { [Op.in]: ['Не оплачено', 'Частично оплачено'] },
        },
        order: [['createdAt', 'ASC']], // Сначала старые заказы
        transaction
      });

      let remainingAmount = paymentAmount;
      const processedOrderIds = [];

      for (const order of unpaidOrders) {
        if (remainingAmount <= 0) break;

        const orderTotal = parseFloat(order.totalAmount);
        const orderPaid = parseFloat(order.paidAmount);
        const orderRemaining = orderTotal - orderPaid;

        if (orderRemaining > 0) {
          const paymentForOrder = Math.min(remainingAmount, orderRemaining);
          
          order.paidAmount = (orderPaid + paymentForOrder).toFixed(2);
          order.paymentStatus = calculatePaymentStatus(order);
          
          await order.save({ transaction });
          
          remainingAmount -= paymentForOrder;
          processedOrderIds.push(order.id);
        }
      }

      // Обновляем relatedOrderIds в платеже
      payment.relatedOrderIds = processedOrderIds;
      await payment.save({ transaction });
    }

    // Пересчет задолженности поставщика
    await recalculateSupplierDebt(supplierId, { transaction });

    await transaction.commit();

    // Получение созданного платежа с полной информацией
    const createdPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'debt']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdPayment,
      message: 'Платеж успешно зарегистрирован'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка создания платежа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания платежа',
      error: error.message
    });
  }
};

/**
 * Получить информацию о конкретном платеже
 * GET /api/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
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

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Платеж не найден'
      });
    }

    // Получение связанных заказов
    let relatedOrders = [];
    if (payment.relatedOrderIds && payment.relatedOrderIds.length > 0) {
      relatedOrders = await Order.findAll({
        where: { id: { [Op.in]: payment.relatedOrderIds } },
        attributes: ['id', 'orderNumber', 'totalAmount', 'paidAmount', 'paymentStatus']
      });
    }

    res.json({
      success: true,
      data: {
        payment,
        relatedOrders
      }
    });

  } catch (error) {
    console.error('Ошибка получения платежа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения платежа',
      error: error.message
    });
  }
};

/**
 * Обновить платеж
 * PUT /api/payments/:id
 * Доступ: admin, accountant
 */
const updatePayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, comment } = req.body;

    // Найти платеж
    const payment = await Payment.findByPk(id, { transaction });
    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Платеж не найден'
      });
    }

    const oldAmount = parseFloat(payment.amount);

    // Обновление полей
    if (amount !== undefined) {
      const newAmount = parseFloat(amount);
      if (newAmount <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Сумма платежа должна быть больше нуля'
        });
      }
      payment.amount = newAmount.toFixed(2);
    }

    if (paymentDate !== undefined) {
      payment.paymentDate = new Date(paymentDate);
    }

    if (paymentMethod !== undefined) {
      payment.paymentMethod = paymentMethod;
    }

    if (comment !== undefined) {
      payment.comment = comment;
    }

    await payment.save({ transaction });

    // Если сумма изменилась, нужно пересчитать оплаты заказов
    if (amount !== undefined && oldAmount !== parseFloat(payment.amount)) {
      const supplierId = payment.supplierId;
      
      // Сброс оплат для всех заказов поставщика
      await Order.update(
        { paidAmount: 0, paymentStatus: 'Не оплачено' },
        { 
          where: { supplierId, isActive: true },
          transaction 
        }
      );

      // Пересчет всех платежей для этого поставщика
      const allPayments = await Payment.findAll({
        where: { supplierId },
        order: [['paymentDate', 'ASC']],
        transaction
      });

      for (const pmt of allPayments) {
        // Логика аналогична createPayment - автоматическое распределение
        const unpaidOrders = await Order.findAll({
          where: {
            supplierId,
            isActive: true,
            paymentStatus: { [Op.in]: ['Не оплачено', 'Частично оплачено'] },
          },
          order: [['createdAt', 'ASC']],
          transaction
        });

        let remainingAmount = parseFloat(pmt.amount);
        const processedOrderIds = [];

        for (const order of unpaidOrders) {
          if (remainingAmount <= 0) break;

          const orderTotal = parseFloat(order.totalAmount);
          const orderPaid = parseFloat(order.paidAmount);
          const orderRemaining = orderTotal - orderPaid;

          if (orderRemaining > 0) {
            const paymentForOrder = Math.min(remainingAmount, orderRemaining);
            
            order.paidAmount = (orderPaid + paymentForOrder).toFixed(2);
            order.paymentStatus = calculatePaymentStatus(order);
            
            await order.save({ transaction });
            
            remainingAmount -= paymentForOrder;
            processedOrderIds.push(order.id);
          }
        }

        // Обновляем relatedOrderIds
        pmt.relatedOrderIds = processedOrderIds;
        await pmt.save({ transaction });
      }

      // Пересчет задолженности
      await recalculateSupplierDebt(supplierId, { transaction });
    }

    await transaction.commit();

    // Получение обновленного платежа
    const updatedPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'debt']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedPayment,
      message: 'Платеж успешно обновлен'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка обновления платежа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления платежа',
      error: error.message
    });
  }
};

/**
 * Удалить платеж
 * DELETE /api/payments/:id
 * Доступ: admin
 */
const deletePayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, { transaction });
    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Платеж не найден'
      });
    }

    const supplierId = payment.supplierId;

    // Удаление платежа
    await payment.destroy({ transaction });

    // Пересчет оплат для всех заказов поставщика после удаления платежа
    await Order.update(
      { paidAmount: 0, paymentStatus: 'Не оплачено' },
      { 
        where: { supplierId, isActive: true },
        transaction 
      }
    );

    // Пересчет всех оставшихся платежей
    const remainingPayments = await Payment.findAll({
      where: { supplierId },
      order: [['paymentDate', 'ASC']],
      transaction
    });

    for (const pmt of remainingPayments) {
      const unpaidOrders = await Order.findAll({
        where: {
          supplierId,
          isActive: true,
          paymentStatus: { [Op.in]: ['Не оплачено', 'Частично оплачено'] },
        },
        order: [['createdAt', 'ASC']],
        transaction
      });

      let remainingAmount = parseFloat(pmt.amount);
      const processedOrderIds = [];

      for (const order of unpaidOrders) {
        if (remainingAmount <= 0) break;

        const orderTotal = parseFloat(order.totalAmount);
        const orderPaid = parseFloat(order.paidAmount);
        const orderRemaining = orderTotal - orderPaid;

        if (orderRemaining > 0) {
          const paymentForOrder = Math.min(remainingAmount, orderRemaining);
          
          order.paidAmount = (orderPaid + paymentForOrder).toFixed(2);
          order.paymentStatus = calculatePaymentStatus(order);
          
          await order.save({ transaction });
          
          remainingAmount -= paymentForOrder;
          processedOrderIds.push(order.id);
        }
      }

      pmt.relatedOrderIds = processedOrderIds;
      await pmt.save({ transaction });
    }

    // Пересчет задолженности
    await recalculateSupplierDebt(supplierId, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Платеж успешно удален'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Ошибка удаления платежа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления платежа',
      error: error.message
    });
  }
};

module.exports = {
  getPayments,
  getPaymentsBySupplier,
  createPayment,
  getPaymentById,
  updatePayment,
  deletePayment,
  recalculateSupplierDebt // Экспортируем для использования в других контроллерах
};
