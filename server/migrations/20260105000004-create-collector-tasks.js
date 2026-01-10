const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - создание таблицы collector_tasks
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
    if (await tableExists('collector_tasks')) {
      console.log('⏭️  Таблица collector_tasks уже существует, пропускаем');
      return;
    }

    await queryInterface.createTable('collector_tasks', {
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
        comment: 'ID заявки на сбор',
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID пользователя-сборщика',
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Статус задания',
      },
      is_collected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Товар собран и забран',
      },
      collected_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Дата и время сбора товара',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Заметки сборщика',
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
    console.log('  ✅ Создана таблица collector_tasks');

    // Создаём индексы с проверкой
    const indexes = [
      { columns: ['order_id'], name: 'collector_tasks_order_id_idx' },
      { columns: ['assigned_to'], name: 'collector_tasks_assigned_to_idx' },
      { columns: ['status'], name: 'collector_tasks_status_idx' },
      { columns: ['is_collected'], name: 'collector_tasks_is_collected_idx' },
      { columns: ['assigned_to', 'status'], name: 'collector_tasks_user_status_idx' },
    ];

    for (const idx of indexes) {
      if (await indexExists(idx.name)) {
        console.log(`  ⏭️  Индекс ${idx.name} уже существует`);
      } else {
        await queryInterface.addIndex('collector_tasks', idx.columns, { name: idx.name });
        console.log(`  ✅ Создан индекс ${idx.name}`);
      }
    }

    console.log('✅ Миграция collector_tasks завершена');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'collector_tasks'
    `);

    if (tables && tables.length > 0) {
      await queryInterface.dropTable('collector_tasks');
      console.log('✅ Удалена таблица collector_tasks');
    }
  },
};
