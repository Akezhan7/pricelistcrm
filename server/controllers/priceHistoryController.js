const { Op } = require('sequelize');
const { PriceHistory, Product, User, Order } = require('../models');

/**
 * Получить историю цен товара
 * GET /api/products/:productId/price-history
 */
exports.getProductPriceHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { priceType, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    // Проверка существования товара
    const product = await Product.findOne({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Построение условий фильтрации
    const where = { productId };

    if (priceType) {
      where.priceType = priceType;
    }

    if (dateFrom || dateTo) {
      where.changedAt = {};
      if (dateFrom) {
        where.changedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.changedAt[Op.lte] = new Date(dateTo);
      }
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Получение истории
    const { count, rows: history } = await PriceHistory.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'changer',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber'],
          required: false,
        },
      ],
      order: [['changedAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Вычисление статистики
    const stats = {
      totalChanges: count,
      currentCostPrice: parseFloat(product.costPrice),
      currentSellingPrice: parseFloat(product.sellingPrice),
    };

    // Если есть история, добавляем информацию о первых ценах
    if (history.length > 0) {
      const oldestCostPrice = await PriceHistory.findOne({
        where: { productId, priceType: 'costPrice' },
        order: [['changedAt', 'ASC']],
      });

      const oldestSellingPrice = await PriceHistory.findOne({
        where: { productId, priceType: 'sellingPrice' },
        order: [['changedAt', 'ASC']],
      });

      if (oldestCostPrice) {
        stats.firstCostPrice = parseFloat(oldestCostPrice.oldPrice);
        stats.costPriceChange = stats.currentCostPrice - stats.firstCostPrice;
        stats.costPriceChangePercent = (
          (stats.costPriceChange / stats.firstCostPrice) *
          100
        ).toFixed(2);
      }

      if (oldestSellingPrice) {
        stats.firstSellingPrice = parseFloat(oldestSellingPrice.oldPrice);
        stats.sellingPriceChange = stats.currentSellingPrice - stats.firstSellingPrice;
        stats.sellingPriceChangePercent = (
          (stats.sellingPriceChange / stats.firstSellingPrice) *
          100
        ).toFixed(2);
      }
    }

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          article: product.article,
          currentCostPrice: product.costPrice,
          currentSellingPrice: product.sellingPrice,
        },
        history,
        stats,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения истории цен:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории цен',
      error: error.message,
    });
  }
};

/**
 * Получить аналитику по изменениям цен
 * GET /api/price-history/analytics
 */
exports.getPriceAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query;

    const where = {};

    if (dateFrom || dateTo) {
      where.changedAt = {};
      if (dateFrom) {
        where.changedAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.changedAt[Op.lte] = new Date(dateTo);
      }
    }

    // Товары с наибольшим количеством изменений цен
    const mostChangedProducts = await PriceHistory.findAll({
      where,
      attributes: [
        'productId',
        [PriceHistory.sequelize.fn('COUNT', PriceHistory.sequelize.col('id')), 'changeCount'],
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'article', 'costPrice', 'sellingPrice'],
        },
      ],
      group: ['productId', 'product.id'],
      order: [[PriceHistory.sequelize.literal('changeCount'), 'DESC']],
      limit: parseInt(limit),
    });

    // Товары с наибольшим изменением цены (в процентах)
    const biggestPriceChanges = await PriceHistory.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'article', 'costPrice', 'sellingPrice'],
        },
        {
          model: User,
          as: 'changer',
          attributes: ['id', 'name'],
        },
      ],
      order: [['changedAt', 'DESC']],
      limit: parseInt(limit) * 2, // Берем больше для вычисления процентов
    });

    // Вычисляем процент изменения для каждой записи
    const priceChangesWithPercent = biggestPriceChanges
      .map((change) => {
        const oldPrice = parseFloat(change.oldPrice);
        const newPrice = parseFloat(change.newPrice);
        const diff = newPrice - oldPrice;
        const percentChange = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;

        return {
          ...change.toJSON(),
          priceDiff: diff,
          percentChange: percentChange.toFixed(2),
          absPercentChange: Math.abs(percentChange),
        };
      })
      .sort((a, b) => b.absPercentChange - a.absPercentChange)
      .slice(0, parseInt(limit));

    // Недавние изменения цен
    const recentChanges = await PriceHistory.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'article'],
        },
        {
          model: User,
          as: 'changer',
          attributes: ['id', 'name'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber'],
          required: false,
        },
      ],
      order: [['changedAt', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        mostChangedProducts,
        biggestPriceChanges: priceChangesWithPercent,
        recentChanges,
      },
    });
  } catch (error) {
    console.error('Ошибка получения аналитики цен:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения аналитики цен',
      error: error.message,
    });
  }
};

/**
 * Вспомогательная функция для создания записи в истории цен
 * Используется внутри других контроллеров
 */
exports.createPriceHistoryRecord = async (data) => {
  try {
    const {
      productId,
      oldPrice,
      newPrice,
      priceType,
      changeReason,
      changedBy,
      orderId = null,
    } = data;

    // Проверка, действительно ли цена изменилась
    if (parseFloat(oldPrice) === parseFloat(newPrice)) {
      return null; // Цена не изменилась, запись не создаем
    }

    const record = await PriceHistory.create({
      productId,
      oldPrice,
      newPrice,
      priceType,
      changeReason,
      changedBy,
      orderId,
      changedAt: new Date(),
    });

    return record;
  } catch (error) {
    console.error('Ошибка создания записи истории цен:', error);
    throw error;
  }
};

/**
 * Получить историю изменений цен для конкретного заказа
 * GET /api/orders/:orderId/price-changes
 */
exports.getOrderPriceChanges = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Проверка существования заказа
    const order = await Order.findOne({
      where: { id: orderId, isActive: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена',
      });
    }

    // Получение всех изменений цен связанных с этим заказом
    const priceChanges = await PriceHistory.findAll({
      where: { orderId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'article', 'costPrice', 'sellingPrice'],
        },
        {
          model: User,
          as: 'changer',
          attributes: ['id', 'name'],
        },
      ],
      order: [['changedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
        },
        priceChanges,
      },
    });
  } catch (error) {
    console.error('Ошибка получения изменений цен заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения изменений цен заказа',
      error: error.message,
    });
  }
};
