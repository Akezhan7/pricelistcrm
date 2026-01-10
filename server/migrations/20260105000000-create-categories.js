const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - создание таблицы categories
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем существование таблицы
    const [tables] = await queryInterface.sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'categories'
    `);

    if (tables.length > 0) {
      console.log('⏭️  Таблица categories уже существует, пропускаем');
      return;
    }

    await queryInterface.createTable('categories', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Название категории',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Описание категории',
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID родительской категории для вложенных категорий',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Активна ли категория',
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

    // Создаём индексы
    await queryInterface.addIndex('categories', ['name'], {
      name: 'categories_name_idx',
    });

    await queryInterface.addIndex('categories', ['parent_id'], {
      name: 'categories_parent_id_idx',
    });

    await queryInterface.addIndex('categories', ['is_active'], {
      name: 'categories_is_active_idx',
    });

    console.log('✅ Создана таблица categories');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('categories');
    console.log('✅ Удалена таблица categories');
  },
};
