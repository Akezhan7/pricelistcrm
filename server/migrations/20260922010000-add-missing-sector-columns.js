const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - добавление колонок, объявленных в моделях Sector
 * и Row, но отсутствовавших в исходной миграции create-all-tables:
 * sectors.description, sectors.sort_order, rows.notes, rows.sort_order.
 * Из-за этого расхождения sequelize.sync() падал при старте сервера
 * в dev-режиме (попытка создать индекс/вставить запись по несуществующей колонке).
 */
module.exports = {
  async up(queryInterface) {
    const sectors = await queryInterface.describeTable('sectors');

    if (!Object.prototype.hasOwnProperty.call(sectors, 'description')) {
      await queryInterface.addColumn('sectors', 'description', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(sectors, 'sort_order')) {
      await queryInterface.addColumn('sectors', 'sort_order', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    const rows = await queryInterface.describeTable('rows');

    if (!Object.prototype.hasOwnProperty.call(rows, 'notes')) {
      await queryInterface.addColumn('rows', 'notes', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(rows, 'sort_order')) {
      await queryInterface.addColumn('rows', 'sort_order', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const sectors = await queryInterface.describeTable('sectors');

    if (Object.prototype.hasOwnProperty.call(sectors, 'sort_order')) {
      await queryInterface.removeColumn('sectors', 'sort_order');
    }

    if (Object.prototype.hasOwnProperty.call(sectors, 'description')) {
      await queryInterface.removeColumn('sectors', 'description');
    }

    const rows = await queryInterface.describeTable('rows');

    if (Object.prototype.hasOwnProperty.call(rows, 'sort_order')) {
      await queryInterface.removeColumn('rows', 'sort_order');
    }

    if (Object.prototype.hasOwnProperty.call(rows, 'notes')) {
      await queryInterface.removeColumn('rows', 'notes');
    }
  },
};
