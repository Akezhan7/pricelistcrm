'use strict';

/**
 * Начальная миграция - создание всех таблиц базы данных
 * Эта миграция создает полную структуру БД с нуля
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Создание таблицы Users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'operator', 'accountant', 'purchase_manager', 'warehouse_operator', 'driver'),
        allowNull: false,
        defaultValue: 'operator',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 2. Создание таблицы Sectors
    await queryInterface.createTable('sectors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      product_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      position: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      rows_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 3. Создание таблицы Rows
    await queryInterface.createTable('rows', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sector_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sectors',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      total_spaces: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      occupied_spaces: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      position: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 4. Создание таблицы Products
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      article: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      selling_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 5. Создание таблицы Suppliers
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      whatsapp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      container_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sector: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      row: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      container: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      map_position: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      debt: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      sector_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sectors',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      row_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'rows',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 6. Создание таблицы ProductSupplier (связь M:N)
    await queryInterface.createTable('product_suppliers', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      supplier_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // 7. Создание таблицы ProductVariations
    await queryInterface.createTable('product_variations', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cost_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    // 8. Создание таблицы Orders
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      expected_delivery_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivery_location: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: 'Точка Байсад',
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paid_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('В работе', 'На точке', 'В пути', 'На складе'),
        allowNull: false,
        defaultValue: 'В работе',
      },
      payment_status: {
        type: Sequelize.ENUM('Не оплачено', 'Частично оплачено', 'Оплачено'),
        allowNull: false,
        defaultValue: 'Не оплачено',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // 9. Создание таблицы OrderItems
    await queryInterface.createTable('order_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      product_variation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'product_variations',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price_at_purchase: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      total_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    // 10. Создание таблицы OrderStatusHistory
    await queryInterface.createTable('order_status_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      old_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      new_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 11. Создание таблицы Payments
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      payment_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      payment_method: {
        type: Sequelize.ENUM('Наличные', 'Перевод', 'Карта', 'Другое'),
        allowNull: false,
        defaultValue: 'Наличные',
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      related_order_ids: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
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

    // 12. Создание таблицы PriceHistory
    await queryInterface.createTable('price_history', {
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      old_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      new_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      price_type: {
        type: Sequelize.ENUM('costPrice', 'sellingPrice'),
        allowNull: false,
        defaultValue: 'sellingPrice',
      },
      change_reason: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Создание индексов для оптимизации производительности
    console.log('Создание индексов...');

    // Users
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
    await queryInterface.addIndex('users', ['role'], { name: 'users_role_idx' });
    await queryInterface.addIndex('users', ['is_active'], { name: 'users_is_active_idx' });

    // Sectors
    await queryInterface.addIndex('sectors', ['code'], { unique: true, name: 'sectors_code_unique' });
    await queryInterface.addIndex('sectors', ['is_active'], { name: 'sectors_is_active_idx' });

    // Rows
    await queryInterface.addIndex('rows', ['sector_id'], { name: 'rows_sector_id_idx' });
    await queryInterface.addIndex('rows', ['is_active'], { name: 'rows_is_active_idx' });

    // Products
    await queryInterface.addIndex('products', ['article'], { unique: true, name: 'products_article_unique' });
    await queryInterface.addIndex('products', ['name'], { name: 'products_name_idx' });
    await queryInterface.addIndex('products', ['is_active'], { name: 'products_is_active_idx' });
    await queryInterface.addIndex('products', ['cost_price'], { name: 'products_cost_price_idx' });
    await queryInterface.addIndex('products', ['selling_price'], { name: 'products_selling_price_idx' });

    // Suppliers
    await queryInterface.addIndex('suppliers', ['name'], { name: 'suppliers_name_idx' });
    await queryInterface.addIndex('suppliers', ['phone'], { name: 'suppliers_phone_idx' });
    await queryInterface.addIndex('suppliers', ['sector_id'], { name: 'suppliers_sector_id_idx' });
    await queryInterface.addIndex('suppliers', ['row_id'], { name: 'suppliers_row_id_idx' });
    await queryInterface.addIndex('suppliers', ['is_active'], { name: 'suppliers_is_active_idx' });
    await queryInterface.addIndex('suppliers', ['debt'], { name: 'suppliers_debt_idx' });

    // ProductSupplier
    await queryInterface.addIndex('product_suppliers', ['product_id', 'supplier_id'], { 
      unique: true, 
      name: 'product_suppliers_product_supplier_unique' 
    });
    await queryInterface.addIndex('product_suppliers', ['product_id'], { name: 'product_suppliers_product_id_idx' });
    await queryInterface.addIndex('product_suppliers', ['supplier_id'], { name: 'product_suppliers_supplier_id_idx' });

    // ProductVariations
    await queryInterface.addIndex('product_variations', ['product_id'], { name: 'product_variations_product_id_idx' });
    await queryInterface.addIndex('product_variations', ['sku'], { unique: true, name: 'product_variations_sku_unique' });
    await queryInterface.addIndex('product_variations', ['is_active'], { name: 'product_variations_is_active_idx' });

    // Orders
    await queryInterface.addIndex('orders', ['order_number'], { unique: true, name: 'orders_order_number_unique' });
    await queryInterface.addIndex('orders', ['supplier_id'], { name: 'orders_supplier_id_idx' });
    await queryInterface.addIndex('orders', ['status'], { name: 'orders_status_idx' });
    await queryInterface.addIndex('orders', ['payment_status'], { name: 'orders_payment_status_idx' });
    await queryInterface.addIndex('orders', ['created_by'], { name: 'orders_created_by_idx' });
    await queryInterface.addIndex('orders', ['is_active'], { name: 'orders_is_active_idx' });
    await queryInterface.addIndex('orders', ['expected_delivery_date'], { name: 'orders_expected_delivery_date_idx' });
    await queryInterface.addIndex('orders', ['created_at'], { name: 'orders_created_at_idx' });

    // OrderItems
    await queryInterface.addIndex('order_items', ['order_id'], { name: 'order_items_order_id_idx' });
    await queryInterface.addIndex('order_items', ['product_id'], { name: 'order_items_product_id_idx' });
    await queryInterface.addIndex('order_items', ['product_variation_id'], { name: 'order_items_product_variation_id_idx' });
    await queryInterface.addIndex('order_items', ['order_id', 'product_id'], { name: 'order_items_order_product_idx' });

    // OrderStatusHistory
    await queryInterface.addIndex('order_status_history', ['order_id'], { name: 'order_status_history_order_id_idx' });
    await queryInterface.addIndex('order_status_history', ['changed_by'], { name: 'order_status_history_changed_by_idx' });
    await queryInterface.addIndex('order_status_history', ['changed_at'], { name: 'order_status_history_changed_at_idx' });
    await queryInterface.addIndex('order_status_history', ['order_id', 'changed_at'], { name: 'order_status_history_order_time_idx' });

    // Payments
    await queryInterface.addIndex('payments', ['supplier_id'], { name: 'payments_supplier_id_idx' });
    await queryInterface.addIndex('payments', ['payment_date'], { name: 'payments_payment_date_idx' });
    await queryInterface.addIndex('payments', ['created_by'], { name: 'payments_created_by_idx' });
    await queryInterface.addIndex('payments', ['payment_method'], { name: 'payments_payment_method_idx' });
    await queryInterface.addIndex('payments', ['supplier_id', 'payment_date'], { name: 'payments_supplier_date_idx' });

    // PriceHistory
    await queryInterface.addIndex('price_history', ['product_id'], { name: 'price_history_product_id_idx' });
    await queryInterface.addIndex('price_history', ['changed_by'], { name: 'price_history_changed_by_idx' });
    await queryInterface.addIndex('price_history', ['changed_at'], { name: 'price_history_changed_at_idx' });
    await queryInterface.addIndex('price_history', ['order_id'], { name: 'price_history_order_id_idx' });
    await queryInterface.addIndex('price_history', ['product_id', 'changed_at'], { name: 'price_history_product_time_idx' });
    await queryInterface.addIndex('price_history', ['price_type'], { name: 'price_history_price_type_idx' });

    console.log('✅ Все таблицы и индексы успешно созданы');
  },

  async down(queryInterface, Sequelize) {
    // Удаление таблиц в обратном порядке (с учетом внешних ключей)
    await queryInterface.dropTable('price_history');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('order_status_history');
    await queryInterface.dropTable('order_items');
    await queryInterface.dropTable('orders');
    await queryInterface.dropTable('product_variations');
    await queryInterface.dropTable('product_suppliers');
    await queryInterface.dropTable('suppliers');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('rows');
    await queryInterface.dropTable('sectors');
    await queryInterface.dropTable('users');

    console.log('✅ Все таблицы удалены');
  }
};
