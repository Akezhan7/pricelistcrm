const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем новые поля в таблицу products
    await queryInterface.addColumn('products', 'internal_name', {
      type: DataTypes.STRING(200),
      allowNull: true, // Сначала nullable, чтобы не сломать существующие записи
      comment: 'Внутреннее название для сотрудников (маска)',
    });

    await queryInterface.addColumn('products', 'kaspi_name', {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Официальное название для Kaspi',
    });

    await queryInterface.addColumn('products', 'kaspi_article', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Артикул Kaspi',
    });

    await queryInterface.addColumn('products', 'current_stock', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Текущий остаток на складе',
    });

    await queryInterface.addColumn('products', 'min_stock', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Минимальный порог остатков',
    });

    await queryInterface.addColumn('products', 'category_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Связь с категорией товара',
    });

    // Создаём индексы для оптимизации запросов
    await queryInterface.addIndex('products', ['current_stock'], {
      name: 'idx_products_current_stock',
    });

    await queryInterface.addIndex('products', ['min_stock'], {
      name: 'idx_products_min_stock',
    });

    await queryInterface.addIndex('products', ['category_id'], {
      name: 'idx_products_category_id',
    });

    console.log('✅ Добавлены новые поля в таблицу products');
  },

  async down(queryInterface, Sequelize) {
    // Удаляем индексы
    await queryInterface.removeIndex('products', 'idx_products_current_stock');
    await queryInterface.removeIndex('products', 'idx_products_min_stock');
    await queryInterface.removeIndex('products', 'idx_products_category_id');

    // Удаляем колонки
    await queryInterface.removeColumn('products', 'internal_name');
    await queryInterface.removeColumn('products', 'kaspi_name');
    await queryInterface.removeColumn('products', 'kaspi_article');
    await queryInterface.removeColumn('products', 'current_stock');
    await queryInterface.removeColumn('products', 'min_stock');
    await queryInterface.removeColumn('products', 'category_id');

    console.log('✅ Удалены добавленные поля из таблицы products');
  },
};
