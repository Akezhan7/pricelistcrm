const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - создание таблиц warehouse_receipts и warehouse_receipt_items
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

    // Создаём таблицу warehouse_receipts если не существует
    if (await tableExists('warehouse_receipts')) {
      console.log('⏭️  Таблица warehouse_receipts уже существует, пропускаем');
    } else {
      await queryInterface.createTable('warehouse_receipts', {
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
        received_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'ID пользователя, принявшего товар',
        },
        receipt_type: {
          type: DataTypes.ENUM('full', 'partial'),
          allowNull: false,
          defaultValue: 'full',
          comment: 'Тип приёмки',
        },
        received_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Дата и время приёмки',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Примечания по приёмке',
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
      console.log('  ✅ Создана таблица warehouse_receipts');
    }

    // Создаём таблицу warehouse_receipt_items если не существует
    if (await tableExists('warehouse_receipt_items')) {
      console.log('⏭️  Таблица warehouse_receipt_items уже существует, пропускаем');
    } else {
      await queryInterface.createTable('warehouse_receipt_items', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        receipt_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'warehouse_receipts',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'ID приёмки',
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
        expected_quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Ожидаемое количество',
        },
        received_quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Полученное количество',
        },
        discrepancy: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Расхождение',
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Примечания',
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
      console.log('  ✅ Создана таблица warehouse_receipt_items');
    }

    // Создаём индексы для warehouse_receipts (с проверкой существования)
    const warehouseReceiptsIndexes = [
      { columns: ['order_id'], name: 'warehouse_receipts_order_id_idx' },
      { columns: ['received_by'], name: 'warehouse_receipts_received_by_idx' },
      { columns: ['receipt_type'], name: 'warehouse_receipts_receipt_type_idx' },
      { columns: ['received_at'], name: 'warehouse_receipts_received_at_idx' },
    ];

    for (const idx of warehouseReceiptsIndexes) {
      if (await indexExists(idx.name)) {
        console.log(`  ⏭️  Индекс ${idx.name} уже существует`);
      } else {
        try {
          await queryInterface.addIndex('warehouse_receipts', idx.columns, { name: idx.name });
          console.log(`  ✅ Создан индекс ${idx.name}`);
        } catch (e) {
          console.log(`  ⚠️  Не удалось создать индекс ${idx.name}: ${e.message}`);
        }
      }
    }

    // Создаём индексы для warehouse_receipt_items (с проверкой существования)
    const warehouseReceiptItemsIndexes = [
      { columns: ['receipt_id'], name: 'warehouse_receipt_items_receipt_id_idx' },
      { columns: ['product_id'], name: 'warehouse_receipt_items_product_id_idx' },
      { columns: ['receipt_id', 'product_id'], name: 'warehouse_receipt_items_receipt_product_idx' },
    ];

    for (const idx of warehouseReceiptItemsIndexes) {
      if (await indexExists(idx.name)) {
        console.log(`  ⏭️  Индекс ${idx.name} уже существует`);
      } else {
        try {
          await queryInterface.addIndex('warehouse_receipt_items', idx.columns, { name: idx.name });
          console.log(`  ✅ Создан индекс ${idx.name}`);
        } catch (e) {
          console.log(`  ⚠️  Не удалось создать индекс ${idx.name}: ${e.message}`);
        }
      }
    }

    console.log('✅ Миграция warehouse_receipts завершена');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    // Вспомогательная функция для проверки существования таблицы
    async function tableExists(tableName) {
      const [tables] = await sequelize.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      `);
      return tables && tables.length > 0;
    }

    if (await tableExists('warehouse_receipt_items')) {
      await queryInterface.dropTable('warehouse_receipt_items');
      console.log('  ✅ Удалена таблица warehouse_receipt_items');
    }

    if (await tableExists('warehouse_receipts')) {
      await queryInterface.dropTable('warehouse_receipts');
      console.log('  ✅ Удалена таблица warehouse_receipts');
    }

    console.log('✅ Откат миграции warehouse_receipts завершён');
  },
};
