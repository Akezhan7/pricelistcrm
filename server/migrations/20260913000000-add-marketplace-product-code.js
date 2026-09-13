const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('product_marketplace_listings');
    if (!Object.prototype.hasOwnProperty.call(table, 'product_code')) {
      await queryInterface.addColumn('product_marketplace_listings', 'product_code', {
        type: DataTypes.STRING(120),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('product_marketplace_listings');
    if (Object.prototype.hasOwnProperty.call(table, 'product_code')) {
      await queryInterface.removeColumn('product_marketplace_listings', 'product_code');
    }
  },
};
