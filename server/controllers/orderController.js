const { Op } = require('sequelize');
const sequelize = require('../config/database');
const {
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderSettlementHistory,
  OrderCorrection,
  Product,
  Supplier,
  User,
  Payment,
  ProductVariation,
  OrderConfirmation,
  CollectorTask,
  ProductLifecyclePurchase,
  ProductActionHistory,
  ProcurementList,
  ProcurementListItem,
  WarehouseReceipt,
  StockHistory,
} = require('../models');
const { recalculateSupplierDebt } = require('./paymentController');
const { createPriceHistoryRecord } = require('./priceHistoryController');
const { formatOrderMessage, generateWhatsAppLink } = require('../utils/whatsappFormatter');
const { generateOrderNumber } = require('../services/orderNumberService');
const { buildOrderItemSyncPlan } = require('../services/orderItemSyncService');
const {
  buildOrderEditPolicy,
  buildReceivedOrderCorrectionPlan,
} = require('../services/orderCorrectionService');
const {
  buildSettlementChange,
  normalizeSettlementType,
} = require('../services/orderSettlementService');
const {
  normalizeOptionalSupplierId,
  assertSupplierAllowedForOrderType,
  assertOrderHasSupplier,
} = require('../services/orderSupplierPolicyService');
const {
  ORDER_STATUSES,
  DEBT_STATUSES,
  getAvailableStatusTransitions,
  assertStatusTransitionAllowed,
  canReceiveAtWarehouse,
  assertOrderWorkflowOpen,
} = require('../services/orderStatusPolicyService');
const { removeUploadedFile } = require('../middleware/upload');

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
        // Отмененные заявки
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'Отменена\' THEN 1 END')), 'cancelled'],
        // Финансовые показатели
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalPaid'],
        [sequelize.fn('SUM', sequelize.literal(
          "CASE WHEN status IN ('" + DEBT_STATUSES.join("','") + "') "
          + "THEN CASE WHEN type = 'return' THEN -total_amount "
          + "ELSE total_amount - paid_amount END ELSE 0 END"
        )), 'debtAmount']
      ],
      raw: true
    });

    const statsResult = stats[0] || {};
    const totalAmount = parseFloat(statsResult.totalAmount || 0);
    const totalPaid = parseFloat(statsResult.totalPaid || 0);
    const debtAmount = parseFloat(statsResult.debtAmount || 0);

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
          cancelled: parseInt(statsResult.cancelled || 0),
          // Агрегированные показатели для удобства
          pending: parseInt(statsResult.created || 0) + parseInt(statsResult.sentToSupplier || 0),
          inProgress: parseInt(statsResult.confirmed || 0) + parseInt(statsResult.inCollection || 0) + parseInt(statsResult.collected || 0) + parseInt(statsResult.delivery || 0),
          completed: parseInt(statsResult.received || 0) + parseInt(statsResult.closed || 0),
          // Финансовые показатели
          totalAmount: totalAmount.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          totalDebt: Math.max(0, debtAmount).toFixed(2)
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
        },
        {
          model: OrderSettlementHistory,
          as: 'settlementHistory',
          separate: true,
          order: [['createdAt', 'ASC']],
          include: [{
            model: User,
            as: 'changer',
            attributes: ['id', 'name']
          }]
        },
        {
          model: OrderCorrection,
          as: 'corrections',
          separate: true,
          order: [['createdAt', 'ASC']],
          include: [{
            model: User,
            as: 'changer',
            attributes: ['id', 'name']
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    const documentCounts = await getOrderDocumentCounts(order);
    const orderData = order.toJSON();
    orderData.editPolicy = buildOrderEditPolicy({
      status: order.status,
      ...documentCounts,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: orderData
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
    const {
      supplierId,
      expectedDeliveryDate,
      deliveryLocation,
      notes,
      items,
      type,
      settlementType,
    } = req.body;
    const orderType = type === 'return' ? 'return' : 'purchase';
    let normalizedSupplierId;
    let normalizedSettlementType;

    try {
      normalizedSupplierId = normalizeOptionalSupplierId(supplierId);
      assertSupplierAllowedForOrderType(orderType, normalizedSupplierId);
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: orderType === 'return'
          ? 'Для оформления возврата выберите поставщика'
          : 'Некорректный поставщик',
        errors: [{ field: 'supplierId', message: error.message }],
      });
    }
    try {
      normalizedSettlementType = normalizeSettlementType(orderType, settlementType);
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ field: 'settlementType', message: error.message }],
      });
    }

    // Проверка существования поставщика
    const supplier = normalizedSupplierId
      ? await Supplier.findOne({ where: { id: normalizedSupplierId, isActive: true } })
      : null;
    if (normalizedSupplierId && !supplier) {
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
      supplierId: normalizedSupplierId,
      type: orderType,
      expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryLocation: deliveryLocation || 'Точка Байсад',
      totalAmount: totalAmount.toFixed(2),
      paidAmount: 0,
      status: 'Создана',
      paymentStatus: 'Не оплачено',
      settlementType: normalizedSettlementType,
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
    if (normalizedSupplierId) {
      await recalculateSupplierDebt(normalizedSupplierId);
    }

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
 * До приёмки — обычное редактирование; после приёмки — корректировка администратором.
 */
exports.updateOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const { id } = req.params;
    const {
      supplierId,
      expectedDeliveryDate,
      deliveryLocation,
      notes,
      items,
      settlementType,
      correctionReason,
    } = req.body;

    const order = await Order.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!order) {
      const error = new Error('Заявка не найдена');
      error.statusCode = 404;
      throw error;
    }

    const documentCounts = await getOrderDocumentCounts(order, transaction);
    const editPolicy = buildOrderEditPolicy({
      status: order.status,
      ...documentCounts,
      role: req.user.role,
    });
    if (!editPolicy.canEdit) {
      const error = new Error(editPolicy.reason || 'Заявку нельзя изменить');
      error.statusCode = 409;
      throw error;
    }
    if (
      editPolicy.mode === 'correction'
      && (typeof correctionReason !== 'string' || correctionReason.trim().length < 5)
    ) {
      const error = new Error('Причина корректировки должна содержать минимум 5 символов');
      error.statusCode = 400;
      throw error;
    }

    const existingItems = await OrderItem.findAll({
      where: { orderId: order.id },
      order: [['id', 'ASC']],
      transaction,
      lock: true,
    });
    const beforeData = snapshotOrder(order, existingItems);
    const previousSupplierId = order.supplierId;
    let settlementHistoryData = null;

    if (Object.prototype.hasOwnProperty.call(req.body, 'supplierId')) {
      let normalizedSupplierId;
      try {
        normalizedSupplierId = normalizeOptionalSupplierId(supplierId);
        assertSupplierAllowedForOrderType(order.type, normalizedSupplierId);
      } catch (error) {
        error.statusCode = 400;
        throw error;
      }

      const currentSupplierId = previousSupplierId == null ? null : Number(previousSupplierId);
      if ((editPolicy.mode === 'correction' || order.status !== 'Создана') && normalizedSupplierId !== currentSupplierId) {
        const error = new Error('Поставщика можно изменить только у заявки в статусе «Создана» до приёмки');
        error.statusCode = 409;
        throw error;
      }

      if (normalizedSupplierId) {
        const supplier = await Supplier.findOne({
          where: { id: normalizedSupplierId, isActive: true },
          transaction,
        });
        if (!supplier) {
          const error = new Error('Поставщик не найден');
          error.statusCode = 400;
          throw error;
        }
      }

      order.supplierId = normalizedSupplierId;
    }

    if (expectedDeliveryDate !== undefined) order.expectedDeliveryDate = expectedDeliveryDate;
    if (deliveryLocation !== undefined) order.deliveryLocation = deliveryLocation;
    if (notes !== undefined) order.notes = notes;
    if (Object.prototype.hasOwnProperty.call(req.body, 'settlementType')) {
      let normalizedSettlementType;
      try {
        normalizedSettlementType = normalizeSettlementType(order.type, settlementType);
      } catch (error) {
        error.statusCode = 400;
        throw error;
      }
      if (normalizedSettlementType !== order.settlementType) {
        settlementHistoryData = {
          orderId: order.id,
          oldSettlementType: order.settlementType,
          newSettlementType: normalizedSettlementType,
          changedBy: req.user.id,
          comment: 'Условие расчёта изменено при редактировании заявки',
          createdAt: new Date(),
        };
        order.settlementType = normalizedSettlementType;
      }
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        const error = new Error('В заявке должен остаться хотя бы один товар. Пустую заявку удалите или отмените.');
        error.statusCode = 400;
        throw error;
      }

      const productIds = [...new Set([
        ...existingItems.map((item) => Number(item.productId)),
        ...items.map((item) => Number(item.productId)),
      ])];
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        transaction,
        lock: true,
      });
      if (products.length !== productIds.length) {
        const error = new Error('Один из товаров не найден');
        error.statusCode = 400;
        throw error;
      }
      const productsById = new Map(products.map((product) => [Number(product.id), product]));

      for (const item of items) {
        if (!item.id && !productsById.get(Number(item.productId)).isActive) {
          const error = new Error(`Нельзя добавить деактивированный товар с ID ${item.productId}`);
          error.statusCode = 400;
          throw error;
        }
        if (item.productVariationId) {
          const variation = await ProductVariation.findOne({
            where: {
              id: item.productVariationId,
              productId: item.productId,
              isActive: true
            },
            transaction,
          });
          if (!variation) {
            const error = new Error(`Вариация товара с ID ${item.productVariationId} не найдена`);
            error.statusCode = 400;
            throw error;
          }
        }
      }

      const lifecyclePurchases = await ProductLifecyclePurchase.findAll({
          where: { orderId: order.id },
          transaction,
          lock: true,
      });
      const existingItemsById = new Map(existingItems.map((item) => [Number(item.id), item]));

      if (editPolicy.mode === 'correction') {
        const topLevelChanged = ['expectedDeliveryDate', 'deliveryLocation', 'notes', 'settlementType']
          .some((field) => Object.prototype.hasOwnProperty.call(req.body, field)
            && String(beforeData[field] ?? '') !== String(order[field] ?? ''));
        const correctionPlan = buildReceivedOrderCorrectionPlan({
          reason: correctionReason,
          paidAmount: order.paidAmount,
          existingItems,
          incomingItems: items,
          products,
          allowNoItemChanges: topLevelChanged,
        });

        for (const update of correctionPlan.updates) {
          await existingItemsById.get(Number(update.id)).update(update.data, { transaction });
        }
        for (const create of correctionPlan.creates) {
          await OrderItem.create({ orderId: order.id, ...create.data }, { transaction });
        }
        for (const stockChange of correctionPlan.stockChanges) {
          const product = products.find((item) => Number(item.id) === stockChange.productId);
          await product.update({ currentStock: stockChange.newStock }, { transaction, hooks: false });
          await StockHistory.create({
            productId: stockChange.productId,
            oldStock: stockChange.oldStock,
            newStock: stockChange.newStock,
            changeAmount: stockChange.delta,
            changeType: 'correction',
            userId: req.user.id,
            orderId: order.id,
            reason: `Корректировка заявки ${order.orderNumber}`,
            notes: correctionPlan.reason,
          }, { transaction });
        }
        for (const purchase of lifecyclePurchases) {
          const update = correctionPlan.updates.find((item) => Number(item.id) === Number(purchase.orderItemId));
          if (!update) continue;
          await purchase.update({
            ...(update.data.quantity > 0 ? { quantity: update.data.quantity } : {}),
            receivedQuantity: update.data.quantity,
            purchasePrice: update.data.priceAtPurchase,
            notes: update.data.notes,
          }, { transaction });
        }
        order.totalAmount = correctionPlan.totalAmount;
        order.paymentStatus = correctionPlan.paymentStatus;
      } else {
        const syncPlan = buildOrderItemSyncPlan({
          orderId: order.id,
          existingItems,
          lifecyclePurchases,
          incomingItems: items,
          allowLifecycleRelease: true,
        });

        for (const update of syncPlan.updates) {
          await existingItemsById.get(Number(update.id)).update(update.data, { transaction });
        }

        if (syncPlan.deleteIds.length > 0) {
          await releaseOrderItemLinks({
            order,
            orderItemIds: syncPlan.deleteIds,
            actorId: req.user.id,
            transaction,
          });

          await OrderItem.destroy({
            where: { id: { [Op.in]: syncPlan.deleteIds }, orderId: order.id },
            transaction,
          });
        }

        if (syncPlan.creates.length > 0) {
          await OrderItem.bulkCreate(syncPlan.creates, { transaction });
        }

        for (const update of syncPlan.lifecyclePurchaseUpdates) {
          await ProductLifecyclePurchase.update(update.data, {
            where: { id: update.id, orderId: order.id },
            transaction,
          });
        }

        order.totalAmount = syncPlan.totalAmount;
        order.paymentStatus = calculatePaymentStatus(order);
      }
    }

    await order.save({ transaction });
    if (settlementHistoryData) {
      await OrderSettlementHistory.create(settlementHistoryData, { transaction });
    }

    const finalItems = await OrderItem.findAll({
      where: { orderId: order.id },
      order: [['id', 'ASC']],
      transaction,
    });
    const afterData = snapshotOrder(order, finalItems);
    if (JSON.stringify(beforeData) !== JSON.stringify(afterData)) {
      await OrderCorrection.create({
        orderId: order.id,
        correctionType: editPolicy.mode === 'correction'
          ? 'post_receipt_correction'
          : 'pre_receipt_edit',
        reason: editPolicy.mode === 'correction'
          ? correctionReason.trim()
          : (typeof correctionReason === 'string' && correctionReason.trim()
            ? correctionReason.trim()
            : 'Редактирование заявки до приёмки'),
        beforeData,
        afterData,
        changedBy: req.user.id,
        createdAt: new Date(),
      }, { transaction });
    }

    if (previousSupplierId && Number(previousSupplierId) !== Number(order.supplierId)) {
      await recalculateSupplierDebt(previousSupplierId, { transaction });
    }
    if (order.supplierId) {
      await recalculateSupplierDebt(order.supplierId, { transaction });
    }

    await transaction.commit();
    transactionFinished = true;

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
      message: editPolicy.mode === 'correction'
        ? 'Корректировка заявки сохранена'
        : 'Заявка успешно обновлена'
    });

  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    const status = error.statusCode || 500;
    if (status >= 500) console.error('Ошибка обновления заявки:', error);
    res.status(status).json({
      success: false,
      message: status >= 500 ? 'Ошибка обновления заявки' : error.message,
      code: error.code,
    });
  }
};

const snapshotOrder = (order, items) => ({
  supplierId: order.supplierId == null ? null : Number(order.supplierId),
  expectedDeliveryDate: order.expectedDeliveryDate || null,
  deliveryLocation: order.deliveryLocation || null,
  notes: order.notes || null,
  settlementType: order.settlementType,
  totalAmount: Number(order.totalAmount || 0).toFixed(2),
  paymentStatus: order.paymentStatus,
  items: items.map((item) => ({
    id: Number(item.id),
    productId: Number(item.productId),
    productVariationId: item.productVariationId ? Number(item.productVariationId) : null,
    quantity: Number(item.quantity),
    orderedQuantity: item.orderedQuantity == null ? null : Number(item.orderedQuantity),
    priceAtPurchase: Number(item.priceAtPurchase),
    totalPrice: Number(item.totalPrice).toFixed(2),
    notes: item.notes || null,
  })),
});

const getOrderDocumentCounts = async (order, transaction) => {
  const [receiptCount, paymentCount] = await Promise.all([
    WarehouseReceipt.count({ where: { orderId: order.id }, transaction }),
    Payment.count({
      where: { relatedOrderIds: { [Op.contains]: [Number(order.id)] } },
      transaction,
    }),
  ]);
  return {
    receiptCount,
    paymentCount: Number(order.paidAmount || 0) > 0 ? Math.max(1, paymentCount) : paymentCount,
  };
};

const releaseOrderItemLinks = async ({ order, orderItemIds, actorId, transaction }) => {
  if (orderItemIds.length === 0) return;

  const [linkedProcurementItems, lifecyclePurchases] = await Promise.all([
    ProcurementListItem.findAll({
      where: { orderItemId: { [Op.in]: orderItemIds } },
      transaction,
      lock: true,
    }),
    ProductLifecyclePurchase.findAll({
      where: { orderId: order.id, orderItemId: { [Op.in]: orderItemIds } },
      transaction,
      lock: true,
    }),
  ]);

  let targetList = await ProcurementList.findOne({
    where: { status: 'open' },
    transaction,
    lock: true,
  });
  if (!targetList && linkedProcurementItems.length > 0) {
    targetList = await ProcurementList.findByPk(linkedProcurementItems[0].procurementListId, {
      transaction,
      lock: true,
    });
    if (targetList) await targetList.update({ status: 'open', processedAt: null }, { transaction });
  }

  for (const item of linkedProcurementItems) {
    if (!targetList || Number(item.procurementListId) === Number(targetList.id)) {
      await item.update({ orderItemId: null }, { transaction });
      continue;
    }
    const duplicate = await ProcurementListItem.findOne({
      where: { procurementListId: targetList.id, productId: item.productId },
      transaction,
      lock: true,
    });
    if (duplicate) await item.destroy({ transaction });
    else await item.update({ procurementListId: targetList.id, orderItemId: null }, { transaction });
  }

  for (const purchase of lifecyclePurchases) {
    await purchase.destroy({ transaction });
    await ProductActionHistory.create({
      productId: purchase.productId,
      actorId,
      actionType: 'purchase_order_line_released',
      fromStatus: 'purchase',
      toStatus: 'purchase',
      message: 'Lifecycle purchase released after order line removal',
      metadata: { orderId: order.id, orderItemId: purchase.orderItemId },
      createdAt: new Date(),
    }, { transaction });
  }
};

exports.getOrderStatusOptions = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, isActive: true },
      attributes: ['id', 'status', 'supplierId'],
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }

    const hasSupplier = Boolean(order.supplierId);
    res.json({
      success: true,
      data: {
        currentStatus: order.status,
        availableStatuses: hasSupplier
          ? getAvailableStatusTransitions(order.status, req.user.role)
          : [],
        canReceiveAtWarehouse: hasSupplier && canReceiveAtWarehouse(order.status, req.user.role),
      },
    });
  } catch (error) {
    console.error('Ошибка получения доступных действий заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения доступных действий заявки',
      error: error.message,
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

    if (!ORDER_STATUSES.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Некорректный статус',
        validStatuses: ORDER_STATUSES
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

    try {
      assertOrderHasSupplier(order);
    } catch (error) {
      await transaction.rollback();
      return res.status(error.statusCode || 409).json({
        success: false,
        message: 'Сначала назначьте поставщика заявке',
        code: error.code,
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

    try {
      assertStatusTransitionAllowed(currentStatus, status, req.user.role);
    } catch (error) {
      await transaction.rollback();
      return res.status(error.statusCode || 409).json({
        success: false,
        message: error.code === 'WAREHOUSE_RECEIPT_REQUIRED'
          ? 'Статус «Принята на складе» устанавливается только через складскую приёмку'
          : `Невозможно изменить статус с "${currentStatus}" на "${status}"`,
        code: error.code,
        allowedStatuses: getAvailableStatusTransitions(currentStatus, req.user.role),
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

    await recalculateSupplierDebt(order.supplierId, { transaction });

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
  const transaction = await sequelize.transaction();
  let transactionFinished = false;
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!order) {
      const error = new Error('Заявка не найдена');
      error.statusCode = 404;
      throw error;
    }

    const documentCounts = await getOrderDocumentCounts(order, transaction);
    const editPolicy = buildOrderEditPolicy({
      status: order.status,
      ...documentCounts,
      role: req.user.role,
    });
    if (!editPolicy.canDelete) {
      const error = new Error(documentCounts.receiptCount > 0
        ? 'Заявку с приёмкой нельзя удалить. Используйте корректировку или возврат.'
        : documentCounts.paymentCount > 0
          ? 'Заявку с платежами нельзя удалить. Сначала урегулируйте оплату.'
          : 'Удалить можно только неоплаченную заявку в статусе «Создана»');
      error.statusCode = 409;
      throw error;
    }

    const supplierId = order.supplierId;
    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id },
      attributes: ['id'],
      transaction,
      lock: true,
    });
    await releaseOrderItemLinks({
      order,
      orderItemIds: orderItems.map((item) => Number(item.id)),
      actorId: req.user.id,
      transaction,
    });

    order.isActive = false;
    await order.save({ transaction });

    await recalculateSupplierDebt(supplierId, { transaction });
    await transaction.commit();
    transactionFinished = true;

    res.json({
      success: true,
      message: 'Заявка успешно удалена'
    });

  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    const status = error.statusCode || 500;
    if (status >= 500) console.error('Ошибка удаления заявки:', error);
    res.status(status).json({
      success: false,
      message: status >= 500 ? 'Ошибка удаления заявки' : error.message,
    });
  }
};

/**
 * Изменить условие расчёта принятой заявки
 * PATCH /api/orders/:id/settlement
 */
exports.changeSettlementType = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const order = await Order.findOne({
      where: { id: req.params.id, isActive: true },
      transaction,
      lock: true,
    });
    if (!order) {
      const error = new Error('Заявка не найдена');
      error.statusCode = 404;
      throw error;
    }

    const change = buildSettlementChange({
      order,
      actor: req.user,
      settlementType: req.body.settlementType,
      comment: req.body.comment,
    });

    await order.update(
      { settlementType: change.newSettlementType },
      { transaction }
    );
    const history = await OrderSettlementHistory.create({
      orderId: order.id,
      ...change,
      createdAt: new Date(),
    }, { transaction });
    await recalculateSupplierDebt(order.supplierId, { transaction });

    await transaction.commit();
    transactionFinished = true;

    return res.json({
      success: true,
      message: change.newSettlementType === 'consignment'
        ? 'Заявка отмечена как «Под реализацию»'
        : 'Для заявки выбрана обычная оплата',
      data: { order, history },
    });
  } catch (error) {
    if (!transactionFinished) await transaction.rollback();
    const status = error.statusCode || error.status || 500;
    if (status >= 500) console.error('Ошибка изменения условия расчёта:', error);
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Ошибка изменения условия расчёта' : error.message,
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
  let transactionFinished = false;

  try {
    const { id } = req.params;
    const { amount, comment } = req.body;

    // Найти заявку
    const order = await Order.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!order) {
      await transaction.rollback();
      transactionFinished = true;
      removeUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    try {
      assertOrderHasSupplier(order);
    } catch (error) {
      await transaction.rollback();
      transactionFinished = true;
      removeUploadedFile(req.file);
      return res.status(error.statusCode || 409).json({
        success: false,
        message: 'Сначала назначьте поставщика заявке',
        code: error.code,
      });
    }

    if (order.status === 'Отменена') {
      await transaction.rollback();
      transactionFinished = true;
      removeUploadedFile(req.file);
      return res.status(409).json({
        success: false,
        message: 'Нельзя зарегистрировать оплату по отменённой заявке',
        code: 'CANCELLED_ORDER_PAYMENT_NOT_ALLOWED',
      });
    }

    // Валидация суммы оплаты
    const paymentAmount = parseFloat(amount);
    const currentPaid = parseFloat(order.paidAmount);
    const totalAmount = parseFloat(order.totalAmount);

    if (paymentAmount <= 0) {
      await transaction.rollback();
      transactionFinished = true;
      removeUploadedFile(req.file);
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
      transactionFinished = true;
      removeUploadedFile(req.file);
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
      relatedOrderIds: [order.id],
      receiptUrl: req.file ? `/uploads/${req.file.filename}` : null,
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

    await recalculateSupplierDebt(order.supplierId, { transaction });
    const updatedOrder = await Order.findByPk(order.id, {
      transaction,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone']
        }
      ]
    });
    await transaction.commit();
    transactionFinished = true;

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
          newStatus: order.paymentStatus,
          receiptUrl: payment.receiptUrl,
        }
      },
      message: `Оплата в размере ${paymentAmount.toFixed(2)} тенге успешно зарегистрирована`
    });

  } catch (error) {
    if (!transactionFinished) {
      removeUploadedFile(req.file);
      await transaction.rollback();
    }
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

    try {
      assertOrderWorkflowOpen(order);
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: 'Закрытую или отменённую заявку нельзя повторно отправить поставщику',
        code: error.code,
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

    try {
      assertOrderHasSupplier(order);
      assertOrderWorkflowOpen(order);
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: error.code === 'ORDER_SUPPLIER_REQUIRED'
          ? 'Сначала назначьте поставщика заявке'
          : 'Закрытую или отменённую заявку нельзя подтверждать',
        code: error.code,
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

    try {
      assertOrderHasSupplier(order);
      assertOrderWorkflowOpen(order);
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: error.code === 'ORDER_SUPPLIER_REQUIRED'
          ? 'Сначала назначьте поставщика заявке'
          : 'Закрытую или отменённую заявку нельзя подтверждать',
        code: error.code,
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

    try {
      assertOrderHasSupplier(order);
      assertOrderWorkflowOpen(order);
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: error.code === 'ORDER_SUPPLIER_REQUIRED'
          ? 'Сначала назначьте поставщика заявке'
          : 'Закрытой или отменённой заявке нельзя назначить сборщика',
        code: error.code,
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

    try {
      assertOrderHasSupplier(order);
      assertOrderWorkflowOpen(order);
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: error.code === 'ORDER_SUPPLIER_REQUIRED'
          ? 'Сначала назначьте поставщика заявке'
          : 'Закрытую или отменённую заявку нельзя отметить собранной',
        code: error.code,
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


