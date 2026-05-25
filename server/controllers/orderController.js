const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Order, OrderItem, OrderStatusHistory, Product, Supplier, User, Payment, ProductVariation, OrderConfirmation, CollectorTask } = require('../models');
const { recalculateSupplierDebt } = require('./paymentController');
const { createPriceHistoryRecord } = require('./priceHistoryController');
const { formatOrderMessage, generateWhatsAppLink } = require('../utils/whatsappFormatter');

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

/** Часовой пояс для даты в номере заявки (можно переопределить в .env) */
const ORDER_NUMBER_TIMEZONE = process.env.ORDER_NUMBER_TIMEZONE || 'Asia/Almaty';

/**
 * Ключ даты для номера: ГГММДД (например 260521)
 */
const getOrderDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ORDER_NUMBER_TIMEZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '00';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';

  return `${year}${month}${day}`;
};

/**
 * Следующий порядковый номер за день: ORD-ГГММДД-NNN (например ORD-260521-003).
 * Возвраты используют тот же формат.
 */
const buildNextOrderNumberCandidate = async () => {
  const dateKey = getOrderDateKey();
  const prefix = `ORD-${dateKey}-`;

  const lastOrder = await Order.findOne({
    where: {
      orderNumber: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['orderNumber', 'DESC']],
    attributes: ['orderNumber'],
  });

  let nextNumber = 1;
  if (lastOrder?.orderNumber) {
    const seqPart = lastOrder.orderNumber.slice(prefix.length);
    const lastSeq = parseInt(seqPart, 10);
    if (!Number.isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }

  if (nextNumber > 999) {
    throw new Error('Превышен лимит номеров заявок за день (999)');
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

const generateOrderNumber = async () => {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = await buildNextOrderNumberCandidate();
    const exists = await Order.findOne({
      where: { orderNumber: candidate },
      attributes: ['id'],
    });
    if (!exists) {
      return candidate;
    }
  }

  throw new Error('Не удалось сгенерировать уникальный номер заявки');
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
      type,
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

    if (type) {
      where.type = type;
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
    // Используем новые статусы системы закупок
    const stats = await Order.findAll({
      where: { isActive: true },
      attributes: [
        // Новые заявки (ещё не отправлены поставщику)
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Создана\' THEN 1 END')), 'created'],
        // Ожидают подтверждения от поставщика
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Отправлена поставщику\' THEN 1 END')), 'sentToSupplier'],
        // Частично или полностью подтверждены
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status IN (\'Частично подтверждена\', \'Подтверждена\') THEN 1 END')), 'confirmed'],
        // На сборе (назначен сборщик)
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'В сборе\' THEN 1 END')), 'inCollection'],
        // Товар забран у поставщика
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Забрана\' THEN 1 END')), 'collected'],
        // В пути / доставка
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Доставка\' THEN 1 END')), 'delivery'],
        // Принято на складе
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Принята на складе\' THEN 1 END')), 'received'],
        // Закрытые заявки
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Закрыта\' THEN 1 END')), 'closed'],
        // Финансовые показатели
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
          // Количество заявок по статусам
          created: parseInt(statsResult.created || 0),
          sentToSupplier: parseInt(statsResult.sentToSupplier || 0),
          confirmed: parseInt(statsResult.confirmed || 0),
          inCollection: parseInt(statsResult.inCollection || 0),
          collected: parseInt(statsResult.collected || 0),
          delivery: parseInt(statsResult.delivery || 0),
          received: parseInt(statsResult.received || 0),
          closed: parseInt(statsResult.closed || 0),
          // Агрегированные показатели для удобства
          pending: parseInt(statsResult.created || 0) + parseInt(statsResult.sentToSupplier || 0),
          inProgress: parseInt(statsResult.confirmed || 0) + parseInt(statsResult.inCollection || 0) + parseInt(statsResult.collected || 0) + parseInt(statsResult.delivery || 0),
          completed: parseInt(statsResult.received || 0) + parseInt(statsResult.closed || 0),
          // Финансовые показатели
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
            },
            {
              model: ProductVariation,
              as: 'variation',
              attributes: ['id', 'name', 'value', 'price', 'costPrice', 'sku']
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
    const { supplierId, expectedDeliveryDate, deliveryLocation, notes, items, type } = req.body;
    const orderType = type === 'return' ? 'return' : 'purchase';

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

    // Проверка существования всех товаров и вариаций, расчет общей суммы
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

      // Если указана вариация, проверить её существование
      if (item.productVariationId) {
        const variation = await ProductVariation.findOne({
          where: {
            id: item.productVariationId,
            productId: item.productId,
            isActive: true
          }
        });
        
        if (!variation) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Вариация товара с ID ${item.productVariationId} не найдена`,
            errors: [{ field: 'items', message: `Вариация товара с ID ${item.productVariationId} не найдена` }]
          });
        }
      }

      totalAmount += parseFloat(item.priceAtPurchase) * parseInt(item.quantity);
    }

    // Генерация номера заявки
    const orderNumber = await generateOrderNumber();

    // Создание заявки
    const order = await Order.create({
      orderNumber,
      supplierId,
      type: orderType,
      expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryLocation: deliveryLocation || 'Точка Байсад',
      totalAmount: totalAmount.toFixed(2),
      paidAmount: 0,
      status: 'Создана',
      paymentStatus: 'Не оплачено',
      notes,
      createdBy: req.user.id,
      isActive: true
    }, { transaction });

    // Создание товаров в заявке
    const orderItemsData = items.map(item => ({
      orderId: order.id,
      productId: item.productId,
      productVariationId: item.productVariationId || null,
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
      newStatus: 'Создана',
      changedBy: req.user.id,
      comment: orderType === 'return' ? 'Возвратная накладная создана' : 'Заявка создана',
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
            },
            {
              model: ProductVariation,
              as: 'variation',
              attributes: ['id', 'name', 'value', 'price', 'sku']
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
 * Ограничение: можно редактировать только если статус = "Создана" или "Отправлена поставщику" или "Частично подтверждена"
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

    // Проверка, что заявку можно редактировать (до того, как товар отправился в доставку/склад)
    const editableStatuses = ['Создана', 'Отправлена поставщику', 'Частично подтверждена', 'Подтверждена'];
    if (!editableStatuses.includes(order.status)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Невозможно редактировать заявку. Текущий статус: ${order.status}. Редактировать можно только заявки в статусах: ${editableStatuses.join(', ')}`
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

      // Проверка существования товаров и вариаций, расчет новой суммы
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

        // Если указана вариация, проверить её существование
        if (item.productVariationId) {
          const variation = await ProductVariation.findOne({
            where: {
              id: item.productVariationId,
              productId: item.productId,
              isActive: true
            }
          });
          
          if (!variation) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Вариация товара с ID ${item.productVariationId} не найдена`
            });
          }
        }

        totalAmount += parseFloat(item.priceAtPurchase) * parseInt(item.quantity);
      }

      // Создать новые товары
      const orderItemsData = items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        productVariationId: item.productVariationId || null,
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
            },
            {
              model: ProductVariation,
              as: 'variation',
              attributes: ['id', 'name', 'value', 'price', 'sku']
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
 * 
 * Граф переходов статусов в системе закупок:
 * 
 * Создана → Отправлена поставщику (через /send-whatsapp или вручную)
 * Отправлена поставщику → Подтверждена | Частично подтверждена (через /confirm или /partial-confirm)
 * Частично подтверждена → Подтверждена (после редактирования) | В сборе (назначен сборщик)
 * Подтверждена → В сборе (через /assign-collector)
 * В сборе → Забрана (сборщик забрал товар)
 * Забрана → Принята на складе (через /warehouse/receive)
 * Принята на складе → Закрыта (архивирование)
 * 
 * Особые переходы (только для admin):
 * - Любой статус → Закрыта (принудительное закрытие)
 * - Любой статус → предыдущий (откат, кроме Закрыта)
 */
exports.changeOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    // Все допустимые статусы в системе
    const validStatuses = [
      'Создана',
      'Отправлена поставщику',
      'Частично подтверждена',
      'Подтверждена',
      'Доставка',
      'В сборе',
      'Забрана',
      'Принята на складе',
      'Закрыта'
    ];

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
    const userRole = req.user.role;

    // Если статус не меняется
    if (currentStatus === status) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Заявка уже имеет этот статус'
      });
    }

    // Определение допустимых переходов статусов
    // Ключ = текущий статус, значение = массив допустимых следующих статусов
    const statusFlow = {
      'Создана': ['Отправлена поставщику', 'Закрыта'],
      'Отправлена поставщику': ['Подтверждена', 'Частично подтверждена', 'Создана', 'Закрыта'],
      'Частично подтверждена': ['Подтверждена', 'В сборе', 'Доставка', 'Отправлена поставщику', 'Закрыта'],
      'Подтверждена': ['В сборе', 'Доставка', 'Частично подтверждена', 'Закрыта'],
      'Доставка': ['Принята на складе', 'Подтверждена', 'Закрыта'],
      'В сборе': ['Забрана', 'Доставка', 'Подтверждена', 'Закрыта'],
      'Забрана': ['Принята на складе', 'Доставка', 'В сборе', 'Закрыта'],
      'Принята на складе': ['Закрыта', 'Забрана', 'Доставка'],
      'Закрыта': [] // Из закрытой заявки нельзя перейти никуда
    };

    // Роли и их права на переходы статусов
    const rolePermissions = {
      'admin': '*', // Все переходы
      'purchase_manager': [
        'Создана → Отправлена поставщику',
        'Отправлена поставщику → Подтверждена',
        'Отправлена поставщику → Частично подтверждена',
        'Отправлена поставщику → Создана',
        'Частично подтверждена → Подтверждена',
        'Частично подтверждена → В сборе',
        'Частично подтверждена → Доставка',
        'Частично подтверждена → Отправлена поставщику',
        'Подтверждена → В сборе',
        'Подтверждена → Доставка',
        'Подтверждена → Частично подтверждена',
        'Доставка → Принята на складе',
        'Доставка → Подтверждена',
      ],
      'warehouse_operator': [
        'Доставка → Принята на складе',
        'Забрана → Принята на складе',
        'Принята на складе → Закрыта',
      ],
      'collector': [
        'В сборе → Забрана',
      ],
      'driver': [
        'В сборе → Забрана',
        'Забрана → Доставка',
        'Доставка → Принята на складе',
        'Забрана → Принята на складе',
      ],
    };

    // Проверка допустимости перехода
    const allowedNextStatuses = statusFlow[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Невозможно изменить статус с "${currentStatus}" на "${status}"`,
        allowedStatuses: allowedNextStatuses
      });
    }

    // Проверка прав доступа
    const transitionKey = `${currentStatus} → ${status}`;
    let hasPermission = false;

    if (rolePermissions[userRole] === '*') {
      // Админ может всё
      hasPermission = true;
    } else if (rolePermissions[userRole]) {
      // Проверяем есть ли этот переход в списке разрешённых для роли
      hasPermission = rolePermissions[userRole].includes(transitionKey);
    }

    if (!hasPermission) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: `Недостаточно прав для изменения статуса с "${currentStatus}" на "${status}"`,
        yourRole: userRole
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
 * Ограничение: можно удалить только если статус = "Создана" и paymentStatus = "Не оплачено"
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
    if (order.status !== 'Создана' || order.paymentStatus !== 'Не оплачено') {
      return res.status(409).json({
        success: false,
        message: 'Невозможно удалить заявку. Можно удалить только заявки в статусе "Создана" и "Не оплачено"',
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

/**
 * Сформировать сообщение WhatsApp для заявки
 * GET /api/orders/:id/whatsapp-message
 */
exports.getWhatsAppMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { useInternalNames = 'true' } = req.query;

    const order = await Order.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'whatsapp'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'internalName', 'kaspiName', 'article', 'image'],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    if (!order.supplier?.whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'У поставщика не указан номер WhatsApp',
      });
    }

    // Формируем сообщение
    const message = formatOrderMessage(order, {
      useInternalNames: useInternalNames === 'true',
      includeHeader: true,
      includeFooter: true,
    });

    res.json({
      success: true,
      data: {
        message,
        supplier: {
          name: order.supplier.name,
          whatsapp: order.supplier.whatsapp,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка генерации WhatsApp сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка генерации WhatsApp сообщения',
      error: error.message,
    });
  }
};

/**
 * Отправить заявку поставщику через WhatsApp (генерация deep link)
 * POST /api/orders/:id/send-whatsapp
 */
exports.sendToWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { useInternalNames = true, customMessage } = req.body;

    const order = await Order.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'whatsapp'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'internalName', 'kaspiName', 'article', 'image'],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    if (!order.supplier?.whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'У поставщика не указан номер WhatsApp',
      });
    }

    // Используем кастомное сообщение или формируем автоматически
    const message = customMessage || formatOrderMessage(order, {
      useInternalNames,
      includeHeader: true,
      includeFooter: true,
    });

    // Генерируем WhatsApp deep link
    const whatsappLink = generateWhatsAppLink(order.supplier.whatsapp, message);

    // Обновляем статус заявки на "Отправлена поставщику"
    const transaction = await sequelize.transaction();
    try {
      const oldStatus = order.status;
      await order.update(
        { status: 'Отправлена поставщику' },
        { transaction }
      );

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus: 'Отправлена поставщику',
          changedBy: req.user.id,
          comment: 'Отправлено в WhatsApp',
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    res.json({
      success: true,
      data: {
        whatsappLink,
        deepLink: whatsappLink, // Для совместимости с фронтендом
        message,
        supplier: {
          id: order.supplier.id,
          name: order.supplier.name,
          whatsapp: order.supplier.whatsapp,
        },
      },
      message: 'WhatsApp ссылка успешно создана. Статус заявки обновлён.',
    });
  } catch (error) {
    console.error('Ошибка отправки в WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отправки в WhatsApp',
      error: error.message,
    });
  }
};

/**
 * Полное подтверждение заявки поставщиком
 * POST /api/orders/:id/confirm
 */
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

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
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Создаём записи подтверждения для всех товаров (полное подтверждение)
      const confirmations = order.items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        requestedQuantity: item.quantity,
        confirmedQuantity: item.quantity,
        isAvailable: true,
        supplierComment: notes || 'Подтверждено полностью',
      }));

      await OrderConfirmation.bulkCreate(confirmations, { transaction });

      // Обновляем статус заявки
      const oldStatus = order.status;
      await order.update(
        { status: 'Подтверждена' },
        { transaction }
      );

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus: 'Подтверждена',
          changedBy: req.user.id,
          comment: notes || 'Заявка полностью подтверждена поставщиком',
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Заявка успешно подтверждена',
        data: { order },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка подтверждения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка подтверждения заявки',
      error: error.message,
    });
  }
};

/**
 * Частичное подтверждение заявки поставщиком
 * POST /api/orders/:id/partial-confirm
 */
exports.partialConfirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    // items: [{ productId, confirmedQuantity, isAvailable, supplierComment }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать товары для подтверждения',
      });
    }

    const order = await Order.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: OrderItem,
          as: 'items',
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Создаём записи подтверждения
      const confirmations = items.map(item => {
        const orderItem = order.items.find(oi => oi.productId === item.productId);
        if (!orderItem) {
          throw new Error(`Товар с ID ${item.productId} не найден в заявке`);
        }

        return {
          orderId: order.id,
          productId: item.productId,
          requestedQuantity: orderItem.quantity,
          confirmedQuantity: item.confirmedQuantity || 0,
          isAvailable: item.isAvailable !== false,
          supplierComment: item.supplierComment || '',
        };
      });

      await OrderConfirmation.bulkCreate(confirmations, { transaction });

      // Определяем новый статус
      const allConfirmed = confirmations.every(
        c => c.confirmedQuantity === c.requestedQuantity && c.isAvailable
      );

      const newStatus = allConfirmed ? 'Подтверждена' : 'Частично подтверждена';

      // Обновляем статус заявки
      const oldStatus = order.status;
      await order.update({ status: newStatus }, { transaction });

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus,
          changedBy: req.user.id,
          comment: notes || 'Заявка частично подтверждена поставщиком',
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Заявка успешно обработана',
        data: {
          order,
          confirmations,
          status: newStatus,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка частичного подтверждения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка частичного подтверждения заявки',
      error: error.message,
    });
  }
};

/**
 * Назначить сборщика на заявку
 * POST /api/orders/:id/assign-collector
 */
exports.assignCollector = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectorId, notes } = req.body;

    if (!collectorId) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать ID сборщика',
      });
    }

    const order = await Order.findOne({
      where: { id, isActive: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    // Проверяем, существует ли пользователь и является ли он сборщиком
    const collector = await User.findByPk(collectorId);
    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Сборщик не найден',
      });
    }

    if (collector.role !== 'collector' && collector.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Указанный пользователь не является сборщиком',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Создаём задание для сборщика
      const task = await CollectorTask.create(
        {
          orderId: order.id,
          assignedTo: collectorId,
          status: 'pending',
          notes: notes || '',
        },
        { transaction }
      );

      // Обновляем статус заявки
      const oldStatus = order.status;
      await order.update({ status: 'В сборе' }, { transaction });

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus: 'В сборе',
          changedBy: req.user.id,
          comment: `Назначен сборщик: ${collector.name}`,
        },
        { transaction }
      );

      await transaction.commit();

      // Получаем полную информацию о задании
      const createdTask = await CollectorTask.findByPk(task.id, {
        include: [
          {
            model: User,
            as: 'collector',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'orderNumber', 'deliveryLocation'],
          },
        ],
      });

      res.json({
        success: true,
        message: 'Сборщик успешно назначен',
        data: { task: createdTask },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка назначения сборщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка назначения сборщика',
      error: error.message,
    });
  }
};

/**
 * Отметить товар как собранный
 * PUT /api/orders/:id/collect
 */
exports.markAsCollected = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const order = await Order.findOne({
      where: { id, isActive: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Обновляем статус заявки
      const oldStatus = order.status;
      await order.update({ status: 'Забрана' }, { transaction });

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus: 'Забрана',
          changedBy: req.user.id,
          comment: notes || 'Товар забран у поставщика',
        },
        { transaction }
      );

      // Обновляем задание сборщика (если есть)
      await CollectorTask.update(
        {
          status: 'completed',
          isCollected: true,
          collectedAt: new Date(),
          notes: notes || '',
        },
        {
          where: { orderId: order.id },
          transaction,
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Товар отмечен как забранный',
        data: { order },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка отметки товара как собранного:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отметки товара как собранного',
      error: error.message,
    });
  }
};


