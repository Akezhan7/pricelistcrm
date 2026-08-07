const sequelize = require('../config/database');
const {
  Order,
  OrderItem,
  Product,
  Supplier,
  User,
  WarehouseReceipt,
  WarehouseReceiptItem,
  OrderStatusHistory,
} = require('../models');
const { Op } = require('sequelize');
const { getStockStatus } = require('./productController');
const { assertOrderHasSupplier } = require('../services/orderSupplierPolicyService');
const { canReceiveAtWarehouse } = require('../services/orderStatusPolicyService');
const { recalculateSupplierDebt } = require('./paymentController');

/**
 * Получить список заявок, ожидающих приёмки
 * GET /api/warehouse/pending-receipts
 */
const getPendingReceipts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Обычная очередь склада сохраняет только заявки на этапе сбора.
    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        isActive: true,
        supplierId: { [Op.ne]: null },
        status: {
          [Op.in]: ['Забрана', 'В сборе'],
        },
      },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'phone'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock'],
            },
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['expectedDeliveryDate', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения заявок для приёмки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заявок для приёмки',
      error: error.message,
    });
  }
};

/**
 * Провести приёмку заявки на складе
 * POST /api/warehouse/receive/:orderId
 */
const receiveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, notes } = req.body;

    // items: [{ productId, expectedQuantity, receivedQuantity, notes }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать товары для приёмки',
      });
    }

    const order = await Order.findOne({
      where: { id: orderId, isActive: true },
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
    } catch (error) {
      return res.status(error.statusCode || 409).json({
        success: false,
        message: 'Сначала назначьте поставщика заявке',
        code: error.code,
      });
    }

    if (!canReceiveAtWarehouse(order.status, req.user.role)) {
      return res.status(409).json({
        success: false,
        message: `Заявку в статусе «${order.status}» нельзя принять на склад`,
        code: 'WAREHOUSE_RECEIPT_NOT_ALLOWED',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Определяем тип приёмки (full/partial)
      let hasDiscrepancy = false;
      const receiptItems = [];

      for (const item of items) {
        const orderItem = order.items.find(oi => oi.productId === item.productId);

        if (!orderItem) {
          throw new Error(`Товар с ID ${item.productId} не найден в заявке`);
        }

        const expectedQty = item.expectedQuantity || orderItem.quantity;
        const receivedQty = item.receivedQuantity || 0;
        const discrepancy = expectedQty - receivedQty;

        if (discrepancy !== 0) {
          hasDiscrepancy = true;
        }

        receiptItems.push({
          productId: item.productId,
          expectedQuantity: expectedQty,
          receivedQuantity: receivedQty,
          discrepancy,
          notes: item.notes || '',
        });

        // Обновляем остаток товара с контекстом для логирования
        const product = orderItem.product;
        await product.update(
          {
            currentStock: product.currentStock + receivedQty,
          },
          { 
            transaction,
            // Передаём контекст для хука StockHistory
            userId: req.user.id,
            orderId: order.id,
            changeType: 'receipt',
            reason: `Приёмка товара по заявке ${order.orderNumber}`,
            notes: item.notes || `Принято ${receivedQty} шт${discrepancy !== 0 ? `, расхождение ${discrepancy} шт` : ''}`,
          }
        );

        console.log(`[STOCK UPDATE] Product #${product.id} (${product.name}): ${product.currentStock - receivedQty} + ${receivedQty} = ${product.currentStock}`);
      }

      // Создаём запись приёмки
      const receipt = await WarehouseReceipt.create(
        {
          orderId: order.id,
          receivedBy: req.user.id,
          receiptType: hasDiscrepancy ? 'partial' : 'full',
          receivedAt: new Date(),
          notes: notes || '',
        },
        { transaction }
      );

      // Создаём записи по каждому товару
      for (const item of receiptItems) {
        await WarehouseReceiptItem.create(
          {
            receiptId: receipt.id,
            ...item,
          },
          { transaction }
        );
      }

      // Обновляем статус заявки
      const oldStatus = order.status;
      await order.update(
        { status: 'Принята на складе' },
        { transaction }
      );

      // Логируем изменение статуса
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          oldStatus,
          newStatus: 'Принята на складе',
          changedBy: req.user.id,
          notes: hasDiscrepancy
            ? `Принято с расхождениями. ${notes || ''}`
            : `Принято полностью. ${notes || ''}`,
        },
        { transaction }
      );

      await recalculateSupplierDebt(order.supplierId, { transaction });

      await transaction.commit();

      // Получаем полную информацию о приёмке
      const createdReceipt = await WarehouseReceipt.findByPk(receipt.id, {
        include: [
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: WarehouseReceiptItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock'],
              },
            ],
          },
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'orderNumber', 'status'],
          },
        ],
      });

      res.json({
        success: true,
        message: hasDiscrepancy
          ? 'Приёмка завершена с расхождениями. Остатки обновлены.'
          : 'Приёмка завершена успешно. Остатки обновлены.',
        data: {
          receipt: createdReceipt,
          hasDiscrepancy,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Ошибка приёмки заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка приёмки заявки',
      error: error.message,
    });
  }
};

/**
 * Получить отчёт по текущим остаткам на складе
 * GET /api/warehouse/stock-report
 */
const getStockReport = async (req, res) => {
  try {
    const { categoryId, search, stockStatus, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { internalName: { [Op.like]: `%${search}%` } },
        { article: { [Op.like]: `%${search}%` } },
      ];
    }

    // Фильтр по статусу остатка
    if (stockStatus) {
      switch (stockStatus) {
        case 'critical':
          whereClause.currentStock = 0;
          break;
        case 'low':
          whereClause.currentStock = {
            [Op.gt]: 0,
            [Op.lte]: sequelize.col('min_stock'),
          };
          break;
        case 'medium':
          whereClause.currentStock = {
            [Op.gt]: sequelize.col('min_stock'),
            [Op.lte]: sequelize.literal('min_stock * 2'),
          };
          break;
        case 'good':
          whereClause.currentStock = {
            [Op.gt]: sequelize.literal('min_stock * 2'),
          };
          break;
      }
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'internalName',
        'article',
        'currentStock',
        'minStock',
        'costPrice',
        'sellingPrice',
      ],
      limit: parseInt(limit),
      offset,
      order: [
        [sequelize.literal('CASE WHEN current_stock = 0 THEN 0 ELSE 1 END'), 'ASC'],
        ['currentStock', 'ASC'],
      ],
    });

    // Добавляем статус для каждого товара
    const productsWithStatus = products.map(product => {
      const productData = product.toJSON();
      productData.stockStatus = getStockStatus(product.currentStock, product.minStock);
      productData.deficit = Math.max(0, product.minStock - product.currentStock);
      productData.totalValue = (product.currentStock * parseFloat(product.costPrice)).toFixed(2);
      return productData;
    });

    // Общая статистика
    const totalValue = productsWithStatus.reduce(
      (sum, p) => sum + parseFloat(p.totalValue),
      0
    );

    res.json({
      success: true,
      data: {
        products: productsWithStatus,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
        summary: {
          totalProducts: count,
          totalValue: totalValue.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения отчёта по остаткам:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения отчёта по остаткам',
      error: error.message,
    });
  }
};

/**
 * Получить историю приёмок
 * GET /api/warehouse/receipts
 */
const getReceiptHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo, receiptType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (receiptType) {
      whereClause.receiptType = receiptType;
    }

    if (dateFrom || dateTo) {
      whereClause.receivedAt = {};
      if (dateFrom) {
        whereClause.receivedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.receivedAt[Op.lte] = new Date(dateTo);
      }
    }

    const { count, rows: receipts } = await WarehouseReceipt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'totalAmount'],
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name'],
        },
        {
          model: WarehouseReceiptItem,
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
      limit: parseInt(limit),
      offset,
      order: [['receivedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        receipts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения истории приёмок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории приёмок',
      error: error.message,
    });
  }
};

/**
 * Получить детальную информацию о приёмке
 * GET /api/warehouse/receipts/:id
 */
const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await WarehouseReceipt.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: Supplier,
              as: 'supplier',
            },
          ],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: WarehouseReceiptItem,
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

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Приёмка не найдена',
      });
    }

    res.json({
      success: true,
      data: { receipt },
    });
  } catch (error) {
    console.error('Ошибка получения приёмки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения приёмки',
      error: error.message,
    });
  }
};

module.exports = {
  getPendingReceipts,
  receiveOrder,
  getStockReport,
  getReceiptHistory,
  getReceiptById,
};
