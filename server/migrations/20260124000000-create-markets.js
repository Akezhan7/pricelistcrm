'use strict';

/**
 * Миграция: Создание таблицы markets (Рынки)
 * Добавление поддержки нескольких рынков (Байсат, Ялянь и т.д.)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем существование таблицы
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('markets')) {
      // Создание таблицы markets
      await queryInterface.createTable('markets', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Название рынка (например, "Байсат", "Ялянь")',
        },
        address: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Полный адрес рынка',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Описание, особенности рынка',
        },
        working_hours: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Часы работы (например, "8:00-20:00")',
        },
        contact_phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Контактный телефон администрации рынка',
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Дополнительные заметки',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Активен ли рынок',
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Порядок сортировки в списках',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      // Проверяем и создаем индексы
      const indexes = await queryInterface.showIndex('markets');
      const indexNames = indexes.map(idx => idx.name);

      if (!indexNames.includes('markets_name_unique')) {
        await queryInterface.addIndex('markets', ['name'], {
          unique: true,
          name: 'markets_name_unique',
        });
      }

      if (!indexNames.includes('markets_is_active_idx')) {
        await queryInterface.addIndex('markets', ['is_active'], {
          name: 'markets_is_active_idx',
        });
      }

      if (!indexNames.includes('markets_sort_order_idx')) {
        await queryInterface.addIndex('markets', ['sort_order'], {
          name: 'markets_sort_order_idx',
        });
      }
    } else {
      console.log('⏭️  Таблица markets уже существует, пропускаем');
    }

    // Вставка начальных данных (если их еще нет)
    const existingMarkets = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM markets;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (existingMarkets[0].count === 0) {
      await queryInterface.bulkInsert('markets', [
        {
          name: 'Байсат',
          address: 'Алматы, ул. Байсеитовой',
          description: 'Основной рынок для закупок',
          is_active: true,
          sort_order: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Ялянь',
          description: 'Дополнительный рынок',
          is_active: true,
          sort_order: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      console.log('✅ Добавлены начальные данные рынков');
    } else {
      console.log('⏭️  Данные рынков уже существуют, пропускаем');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('markets');
  },
};
