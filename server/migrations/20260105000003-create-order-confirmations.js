const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - создание таблицы order_confirmations
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    // Вспомогательная функция для проверки существования таблицы
    async function tableExists(tableName) {
      const [tables] = await sequelize.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      `);
      return tables && tables.length > 0;
    }

    // Вспомогательная функция для проверки существования индекса
    async function indexExists(indexName) {
      const [results] = await sequelize.query(`
        SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}'
      `);
      return results && results.length > 0;
    }

    // Проверяем существование таблицы
    if (await tableExists('order_confirmations')) {
      console.log('⏭️  Таблица order_confirmations уже существует, пропускаем');
      return;
    }

    await queryInterface.createTable('order_confirmations', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID заявки',
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID товара',
      },
      requested_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Запрошенное количество',
      },
      confirmed_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Подтверждённое количество поставщиком',
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Есть ли товар в наличии у поставщика',
      },
      supplier_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Комментарий поставщика',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    console.log('  ✅ Создана таблица order_confirmations');

    // Создаём индексы с проверкой
    const indexes = [
      { columns: ['order_id'], name: 'order_confirmations_order_id_idx' },
      { columns: ['product_id'], name: 'order_confirmations_product_id_idx' },
      { columns: ['order_id', 'product_id'], name: 'order_confirmations_order_product_idx' },
      { columns: ['is_available'], name: 'order_confirmations_is_available_idx' },
    ];

    for (const idx of indexes) {
      if (await indexExists(idx.name)) {
        console.log(`  ⏭️  Индекс ${idx.name} уже существует`);
      } else {
        await queryInterface.addIndex('order_confirmations', idx.columns, { name: idx.name });
        console.log(`  ✅ Создан индекс ${idx.name}`);
      }
    }

    console.log('✅ Миграция order_confirmations завершена');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'order_confirmations'
    `);

    if (tables && tables.length > 0) {
      await queryInterface.dropTable('order_confirmations');
      console.log('✅ Удалена таблица order_confirmations');
    }
  },
};
