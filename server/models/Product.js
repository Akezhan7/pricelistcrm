const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200],
    },
  },
  article: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Себестоимость',
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
    comment: 'Цена продажи',
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Путь к изображению товара',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  internalName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      len: [1, 200],
    },
    comment: 'Внутреннее название для сотрудников (маска)',
  },
  kaspiName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      len: [1, 200],
    },
    comment: 'Официальное название для Kaspi',
  },
  kaspiArticle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: [1, 100],
    },
    comment: 'Артикул Kaspi',
  },
  currentStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Текущий остаток на складе',
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Минимальный порог остатков',
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Связь с категорией товара',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  indexes: [
    {
      fields: ['article'],
      unique: true,
      name: 'products_article_unique',
    },
    {
      fields: ['name'],
      name: 'products_name_idx',
    },
    {
      fields: ['is_active'],
      name: 'products_is_active_idx',
    },
    {
      fields: ['cost_price'],
      name: 'products_cost_price_idx',
    },
    {
      fields: ['selling_price'],
      name: 'products_selling_price_idx',
    },
    {
      fields: ['current_stock'],
      name: 'idx_products_current_stock',
    },
    {
      fields: ['min_stock'],
      name: 'idx_products_min_stock',
    },
    {
      fields: ['category_id'],
      name: 'idx_products_category_id',
    },
  ],
  hooks: {
    /**
     * Хук для автоматического логирования изменений остатков
     * Срабатывает после обновления товара
     */
    afterUpdate: async (product, options) => {
      // Проверяем, изменился ли currentStock
      if (product.changed('currentStock')) {
        const oldStock = product._previousDataValues.currentStock || 0;
        const newStock = product.currentStock || 0;
        const changeAmount = newStock - oldStock;

        // Если нет изменений, не логируем
        if (changeAmount === 0) return;

        // Получаем StockHistory через require, чтобы избежать циклической зависимости
        const StockHistory = require('./StockHistory');

        // Определяем тип изменения
        let changeType = 'manual_increase';
        if (changeAmount < 0) {
          changeType = 'manual_decrease';
        }

        // Получаем дополнительные данные из контекста транзакции
        const userId = options.userId || null;
        const orderId = options.orderId || null;
        const reason = options.reason || (changeAmount > 0 ? 'Увеличение остатка' : 'Уменьшение остатка');
        const notes = options.notes || null;
        
        // Если указан явный тип изменения в опциях, используем его
        if (options.changeType) {
          changeType = options.changeType;
        }

        try {
          // Создаём запись в истории
          await StockHistory.create({
            productId: product.id,
            oldStock,
            newStock,
            changeAmount,
            changeType,
            userId,
            orderId,
            reason,
            notes,
          }, {
            transaction: options.transaction,
          });

          console.log(`[STOCK HISTORY] Logged stock change for product #${product.id}: ${oldStock} → ${newStock} (${changeAmount > 0 ? '+' : ''}${changeAmount})`);
        } catch (error) {
          console.error('[STOCK HISTORY ERROR] Failed to log stock change:', error);
          // Не прерываем транзакцию, логирование не критично
        }
      }
    },
  },
});

module.exports = Product;
