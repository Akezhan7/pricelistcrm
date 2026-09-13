const sequelize = require('../config/database');
const {
  Product,
  Category,
  Supplier,
  ProductSupplier,
  StockHistory,
  Order,
  OrderItem,
  User,
  ProductDesignerKpiEntry,
  ProductMarketplaceListing,
} = require('../models');
const { Op } = require('sequelize');
const { getStockStatus } = require('./productController');
const { formatStockAnalyticsMessage, formatStockSummary } = require('../utils/whatsappFormatter');
const { buildDesignerKpiReport } = require('../services/productDesignerKpiService');

function parseDateFilter(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Invalid date filter');
    error.status = 400;
    throw error;
  }
  return parsed;
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDefaultKpiPeriod(now = new Date()) {
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    toExclusive: addUtcDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1),
  };
}

/**
 * Общая аналитика по остаткам товаров
 * GET /api/analytics/stock-overview
 */
const getStockOverview = async (req, res) => {
  try {
    // Получаем все активные товары
    const products = await Product.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock', 'categoryId'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Классифицируем товары по статусу
    const critical = [];
    const low = [];
    const medium = [];
    const good = [];

    products.forEach(product => {
      const stockStatus = getStockStatus(product.currentStock, product.minStock);
      const productData = {
        ...product.toJSON(),
        stockStatus,
      };

      switch (stockStatus.status) {
        case 'critical':
          critical.push(productData);
          break;
        case 'low':
          low.push(productData);
          break;
        case 'medium':
          medium.push(productData);
          break;
        case 'good':
          good.push(productData);
          break;
      }
    });

    // Общая статистика
    const summary = {
      totalProducts: products.length,
      critical: critical.length,
      low: low.length,
      medium: medium.length,
      good: good.length,
      needsPurchase: critical.length + low.length,
    };

    // Процентное соотношение
    const percentages = {
      critical: products.length > 0 ? Math.round((critical.length / products.length) * 100) : 0,
      low: products.length > 0 ? Math.round((low.length / products.length) * 100) : 0,
      medium: products.length > 0 ? Math.round((medium.length / products.length) * 100) : 0,
      good: products.length > 0 ? Math.round((good.length / products.length) * 100) : 0,
    };

    res.json({
      success: true,
      data: {
        summary,
        percentages,
        criticalProducts: critical.slice(0, 20), // Первые 20 критичных
        lowProducts: low.slice(0, 20), // Первые 20 с низким остатком
      },
    });
  } catch (error) {
    console.error('Ошибка получения общей аналитики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения общей аналитики',
      error: error.message,
    });
  }
};

/**
 * Аналитика по категориям
 * GET /api/analytics/by-category
 */
const getStockByCategory = async (req, res) => {
  try {
    // Получаем все категории с товарами
    const categories = await Category.findAll({
      where: { isActive: true },
      include: [
        {
          model: Product,
          as: 'products',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'currentStock', 'minStock'],
        },
      ],
    });

    const categoryStats = categories.map(category => {
      const products = category.products || [];
      
      let critical = 0;
      let low = 0;
      let medium = 0;
      let good = 0;

      products.forEach(product => {
        const status = getStockStatus(product.currentStock, product.minStock);
        
        switch (status.status) {
          case 'critical':
            critical++;
            break;
          case 'low':
            low++;
            break;
          case 'medium':
            medium++;
            break;
          case 'good':
            good++;
            break;
        }
      });

      return {
        categoryId: category.id,
        categoryName: category.name,
        totalProducts: products.length,
        critical,
        low,
        medium,
        good,
        needsPurchase: critical + low,
      };
    });

    // Сортируем по количеству товаров, требующих закупки
    categoryStats.sort((a, b) => b.needsPurchase - a.needsPurchase);

    res.json({
      success: true,
      data: {
        categories: categoryStats,
      },
    });
  } catch (error) {
    console.error('Ошибка получения аналитики по категориям:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения аналитики по категориям',
      error: error.message,
    });
  }
};

/**
 * История изменений остатков для товара
 * GET /api/analytics/stock-history/:productId
 */
const getProductStockHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 50, changeType, dateFrom, dateTo } = req.query;

    const whereClause = {
      productId: parseInt(productId),
    };

    if (changeType) {
      whereClause.changeType = changeType;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = new Date(dateTo);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: history } = await StockHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Получаем информацию о товаре
    const product = await Product.findByPk(productId, {
      attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock'],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Статистика по изменениям
    const stats = {
      totalChanges: count,
      totalIncrease: history.filter(h => h.changeAmount > 0).reduce((sum, h) => sum + h.changeAmount, 0),
      totalDecrease: Math.abs(history.filter(h => h.changeAmount < 0).reduce((sum, h) => sum + h.changeAmount, 0)),
      changesByType: {},
    };

    // Группируем по типам изменений
    history.forEach(item => {
      if (!stats.changesByType[item.changeType]) {
        stats.changesByType[item.changeType] = {
          count: 0,
          totalChange: 0,
        };
      }
      stats.changesByType[item.changeType].count++;
      stats.changesByType[item.changeType].totalChange += item.changeAmount;
    });

    res.json({
      success: true,
      data: {
        product,
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
    console.error('Ошибка получения истории остатков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения истории остатков',
      error: error.message,
    });
  }
};

/**
 * Прогноз потребности в закупке на основе истории
 * GET /api/analytics/purchase-forecast
 */
const getPurchaseForecast = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Получаем историю изменений за указанный период
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const history = await StockHistory.findAll({
      where: {
        createdAt: {
          [Op.gte]: dateFrom,
        },
        changeType: {
          [Op.in]: ['sale', 'manual_decrease', 'write_off'],
        },
      },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'internalName', 'currentStock', 'minStock'],
          where: { isActive: true },
        },
      ],
    });

    // Группируем по товарам и считаем средний расход
    const productConsumption = {};

    history.forEach(item => {
      const productId = item.productId;
      
      if (!productConsumption[productId]) {
        productConsumption[productId] = {
          product: item.product,
          totalConsumed: 0,
          changeCount: 0,
        };
      }

      productConsumption[productId].totalConsumed += Math.abs(item.changeAmount);
      productConsumption[productId].changeCount++;
    });

    // Вычисляем прогноз
    const forecast = Object.values(productConsumption).map(data => {
      const avgDailyConsumption = data.totalConsumed / parseInt(days);
      const daysUntilEmpty = data.product.currentStock / (avgDailyConsumption || 1);
      const recommendedOrder = Math.ceil(avgDailyConsumption * 30); // На месяц вперёд

      return {
        productId: data.product.id,
        productName: data.product.name,
        internalName: data.product.internalName,
        currentStock: data.product.currentStock,
        minStock: data.product.minStock,
        avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
        daysUntilEmpty: Math.round(daysUntilEmpty),
        recommendedOrder,
        urgency: daysUntilEmpty < 7 ? 'critical' : daysUntilEmpty < 14 ? 'high' : daysUntilEmpty < 30 ? 'medium' : 'low',
      };
    });

    // Сортируем по критичности
    forecast.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);

    res.json({
      success: true,
      data: {
        period: `${days} дней`,
        forecast: forecast.slice(0, 50), // Первые 50 товаров
        summary: {
          totalProducts: forecast.length,
          critical: forecast.filter(f => f.urgency === 'critical').length,
          high: forecast.filter(f => f.urgency === 'high').length,
          medium: forecast.filter(f => f.urgency === 'medium').length,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения прогноза закупок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения прогноза закупок',
      error: error.message,
    });
  }
};

/**
 * Топ товаров по изменению остатков
 * GET /api/analytics/top-movers
 */
const getTopMovers = async (req, res) => {
  try {
    const { days = 30, type = 'all' } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const whereClause = {
      createdAt: {
        [Op.gte]: dateFrom,
      },
    };

    if (type === 'increase') {
      whereClause.changeAmount = { [Op.gt]: 0 };
    } else if (type === 'decrease') {
      whereClause.changeAmount = { [Op.lt]: 0 };
    }

    // Получаем историю и группируем по товарам
    const history = await StockHistory.findAll({
      where: whereClause,
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('change_amount')), 'totalChange'],
        [sequelize.fn('COUNT', sequelize.col('StockHistory.id')), 'changeCount'],
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'internalName', 'currentStock', 'minStock'],
        },
      ],
      group: ['StockHistory.product_id', 'product.id'],
      order: [[sequelize.literal('ABS(SUM(change_amount))'), 'DESC']],
      limit: 20,
      subQuery: false,
    });

    const topMovers = history.map(item => {
      const totalChange = item.dataValues.totalChange || item.get('totalChange') || 0;
      const changeCount = item.dataValues.changeCount || item.get('changeCount') || 0;
      
      return {
        productId: item.productId,
        productName: item.product?.name,
        internalName: item.product?.internalName,
        totalChange: parseInt(totalChange),
        changeCount: parseInt(changeCount),
        currentStock: item.product?.currentStock,
        minStock: item.product?.minStock,
      };
    });

    res.json({
      success: true,
      data: {
        period: `${days} дней`,
        type,
        topMovers,
      },
    });
  } catch (error) {
    console.error('Ошибка получения топ товаров:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения топ товаров',
      error: error.message,
    });
  }
};

/**
 * Аналитика остатков (для фронтенда StockDashboard)
 * GET /api/analytics/stock-analytics
 */
const getStockAnalytics = async (req, res) => {
  try {
    const { categoryId, status } = req.query;

    const whereClause = { isActive: true };
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Получаем товары
    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'internalName',
        'article',
        'kaspiName',
        'kaspiArticle',
        'currentStock',
        'minStock',
        'categoryId',
        'image',
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: ProductMarketplaceListing,
          as: 'marketplaceListings',
          attributes: ['id', 'marketplace', 'productCode'],
          required: false,
        },
      ],
    });

    // Классифицируем по статусам
    const analytics = {
      critical: [],
      low: [],
      medium: [],
      good: [],
      statistics: {
        total: products.length,
        critical: 0,
        low: 0,
        medium: 0,
        good: 0,
      },
    };

    products.forEach(product => {
      const stockStatus = getStockStatus(product.currentStock, product.minStock);
      const productData = {
        ...product.toJSON(),
        stockStatus,
      };

      analytics[stockStatus.status].push(productData);
      analytics.statistics[stockStatus.status]++;
    });

    // Фильтрация по статусу если запрошено
    let result = analytics;
    if (status && analytics[status]) {
      result = {
        products: analytics[status],
        statistics: analytics.statistics,
      };
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Ошибка получения аналитики остатков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения аналитики остатков',
      error: error.message,
    });
  }
};

/**
 * Рекомендации для закупки
 * GET /api/analytics/purchase-suggestions
 */
const getPurchaseSuggestions = async (req, res) => {
  try {
    // Получаем товары где остаток <= минимального
    const products = await Product.findAll({
      where: {
        isActive: true,
        currentStock: {
          [Op.lte]: sequelize.col('Product.min_stock'),
        },
      },
      attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock', 'costPrice'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: Supplier,
          as: 'suppliers',
          through: { attributes: [] },
          attributes: ['id', 'name', 'phone', 'whatsapp'],
        },
      ],
      order: [['currentStock', 'ASC']],
    });

    // Группируем по поставщикам
    const bySupplier = {};
    
    products.forEach(product => {
      const stockStatus = getStockStatus(product.currentStock, product.minStock);
      const suggestedQuantity = Math.max(product.minStock * 2 - product.currentStock, 0);
      
      const productData = {
        ...product.toJSON(),
        stockStatus,
        suggestedQuantity,
        estimatedCost: suggestedQuantity * (product.costPrice || 0),
      };

      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach(supplier => {
          if (!bySupplier[supplier.id]) {
            bySupplier[supplier.id] = {
              supplier: {
                id: supplier.id,
                name: supplier.name,
                phone: supplier.phone,
                whatsapp: supplier.whatsapp,
              },
              products: [],
              totalEstimatedCost: 0,
            };
          }
          bySupplier[supplier.id].products.push(productData);
          bySupplier[supplier.id].totalEstimatedCost += productData.estimatedCost;
        });
      }
    });

    res.json({
      success: true,
      data: {
        products,
        bySupplier: Object.values(bySupplier),
        statistics: {
          total: products.length,
          criticalItems: products.filter(p => p.currentStock === 0).length,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения рекомендаций закупки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения рекомендаций закупки',
      error: error.message,
    });
  }
};

/**
 * Товары с низким остатком
 * GET /api/analytics/low-stock
 */
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
        currentStock: {
          [Op.lte]: sequelize.col('minStock'),
        },
      },
      attributes: ['id', 'name', 'internalName', 'article', 'currentStock', 'minStock', 'image'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
      order: [['currentStock', 'ASC']],
    });

    const result = products.map(product => ({
      ...product.toJSON(),
      stockStatus: getStockStatus(product.currentStock, product.minStock),
    }));

    res.json({
      success: true,
      data: {
        products: result,
        count: result.length,
      },
    });
  } catch (error) {
    console.error('Ошибка получения товаров с низким остатком:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения товаров с низким остатком',
      error: error.message,
    });
  }
};

/**
 * Designer KPI report for approved product cards.
 * GET /api/analytics/designer-kpi
 */
const getDesignerKpiReport = async (req, res) => {
  try {
    const defaults = getDefaultKpiPeriod();
    const from = parseDateFilter(req.query.from, defaults.from);
    const toInput = parseDateFilter(req.query.to, addUtcDays(defaults.toExclusive, -1));
    const toExclusive = addUtcDays(toInput, 1);

    if (from >= toExclusive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid KPI report period',
      });
    }

    const where = {
      creditedAt: {
        [Op.gte]: from,
        [Op.lt]: toExclusive,
      },
    };

    if (req.query.designerId) {
      const designerId = Number(req.query.designerId);
      if (!Number.isInteger(designerId) || designerId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'designerId must be a positive integer',
        });
      }
      where.designerId = designerId;
    }

    const entries = await ProductDesignerKpiEntry.findAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'article'],
          required: false,
        },
        {
          model: User,
          as: 'designer',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['creditedAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        period: {
          from: from.toISOString().slice(0, 10),
          to: addUtcDays(toExclusive, -1).toISOString().slice(0, 10),
        },
        ...buildDesignerKpiReport(entries),
      },
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error loading designer KPI report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading designer KPI report',
    });
  }
};

module.exports = {
  getStockOverview,
  getStockByCategory,
  getProductStockHistory,
  getPurchaseForecast,
  getTopMovers,
  getStockAnalytics,
  getPurchaseSuggestions,
  getLowStockProducts,
  getDesignerKpiReport,
};
