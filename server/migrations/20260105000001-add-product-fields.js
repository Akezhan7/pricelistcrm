const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - безопасна для повторного запуска
 * Проверяет существование колонок и индексов перед созданием
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Вспомогательная функция для проверки существования колонки
    async function columnExists(table, column) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}'
      `);
      return results.length > 0;
    }

    // Вспомогательная функция для проверки существования индекса
    async function indexExists(indexName) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}'
      `);
      return results.length > 0;
    }

    // Добавляем колонки только если они не существуют
    const columnsToAdd = [
      {
        name: 'internal_name',
        config: {
          type: DataTypes.STRING(200),
          allowNull: true,
          comment: 'Внутреннее название для сотрудников (маска)',
        }
      },
      {
        name: 'kaspi_name',
        config: {
          type: DataTypes.STRING(200),
          allowNull: true,
          comment: 'Официальное название для Kaspi',
        }
      },
      {
        name: 'kaspi_article',
        config: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'Артикул Kaspi',
        }
      },
      {
        name: 'current_stock',
        config: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Текущий остаток на складе',
        }
      },
      {
        name: 'min_stock',
        config: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Минимальный порог остатков',
        }
      },
      {
        name: 'category_id',
        config: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'categories',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Связь с категорией товара',
        }
      },
    ];

    for (const col of columnsToAdd) {
      if (await columnExists('products', col.name)) {
        console.log(`  ⏭️  Колонка ${col.name} уже существует, пропускаем`);
      } else {
        await queryInterface.addColumn('products', col.name, col.config);
        console.log(`  ✅ Добавлена колонка ${col.name}`);
      }
    }

    // Добавляем индексы только если они не существуют
    const indexesToAdd = [
      { columns: ['current_stock'], name: 'idx_products_current_stock' },
      { columns: ['min_stock'], name: 'idx_products_min_stock' },
      { columns: ['category_id'], name: 'idx_products_category_id' },
    ];

    for (const idx of indexesToAdd) {
      if (await indexExists(idx.name)) {
        console.log(`  ⏭️  Индекс ${idx.name} уже существует, пропускаем`);
      } else {
        await queryInterface.addIndex('products', idx.columns, { name: idx.name });
        console.log(`  ✅ Добавлен индекс ${idx.name}`);
      }
    }

    console.log('✅ Обновление таблицы products завершено');
  },

  async down(queryInterface, Sequelize) {
    // Вспомогательная функция для проверки существования колонки
    async function columnExists(table, column) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = '${column}'
      `);
      return results.length > 0;
    }

    // Вспомогательная функция для проверки существования индекса
    async function indexExists(indexName) {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}'
      `);
      return results.length > 0;
    }

    // Удаляем индексы если они существуют
    const indexes = ['idx_products_current_stock', 'idx_products_min_stock', 'idx_products_category_id'];
    for (const idx of indexes) {
      if (await indexExists(idx)) {
        await queryInterface.removeIndex('products', idx);
        console.log(`  ✅ Удалён индекс ${idx}`);
      }
    }

    // Удаляем колонки если они существуют
    const columns = ['internal_name', 'kaspi_name', 'kaspi_article', 'current_stock', 'min_stock', 'category_id'];
    for (const col of columns) {
      if (await columnExists('products', col)) {
        await queryInterface.removeColumn('products', col);
        console.log(`  ✅ Удалена колонка ${col}`);
      }
    }

    console.log('✅ Откат изменений таблицы products завершён');
  },
};
