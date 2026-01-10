'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_histories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID товара',
      },
      old_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Старый остаток',
      },
      new_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Новый остаток',
      },
      change_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Величина изменения (может быть отрицательной)',
      },
      change_type: {
        type: Sequelize.ENUM(
          'receipt',
          'sale',
          'manual_increase',
          'manual_decrease',
          'correction',
          'return',
          'write_off'
        ),
        allowNull: false,
        defaultValue: 'manual_increase',
        comment: 'Тип операции изменения остатка',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID пользователя, выполнившего операцию',
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID заявки (если изменение связано с заявкой)',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Причина изменения остатка',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Дополнительные заметки',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Создаём индексы
    await queryInterface.addIndex('stock_histories', ['product_id'], {
      name: 'idx_stock_history_product',
      unique: false,
      concurrently: false,
    }).catch(err => {
      if (err.original && err.original.code !== '42P07') throw err;
      console.log('Index idx_stock_history_product already exists, skipping');
    });

    await queryInterface.addIndex('stock_histories', ['user_id'], {
      name: 'idx_stock_history_user',
      unique: false,
      concurrently: false,
    }).catch(err => {
      if (err.original && err.original.code !== '42P07') throw err;
      console.log('Index idx_stock_history_user already exists, skipping');
    });

    await queryInterface.addIndex('stock_histories', ['order_id'], {
      name: 'idx_stock_history_order',
      unique: false,
      concurrently: false,
    }).catch(err => {
      if (err.original && err.original.code !== '42P07') throw err;
      console.log('Index idx_stock_history_order already exists, skipping');
    });

    await queryInterface.addIndex('stock_histories', ['change_type'], {
      name: 'idx_stock_history_type',
      unique: false,
      concurrently: false,
    }).catch(err => {
      if (err.original && err.original.code !== '42P07') throw err;
      console.log('Index idx_stock_history_type already exists, skipping');
    });

    await queryInterface.addIndex('stock_histories', ['created_at'], {
      name: 'idx_stock_history_created',
      unique: false,
      concurrently: false,
    }).catch(err => {
      if (err.original && err.original.code !== '42P07') throw err;
      console.log('Index idx_stock_history_created already exists, skipping');
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_histories');
  },
};
