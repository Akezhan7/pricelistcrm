const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('procurement_list_items');
    if (!table.remember_supplier_price) {
      await queryInterface.addColumn('procurement_list_items', 'remember_supplier_price', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('procurement_list_items');
    if (table.remember_supplier_price) {
      await queryInterface.removeColumn('procurement_list_items', 'remember_supplier_price');
    }
  },
};
