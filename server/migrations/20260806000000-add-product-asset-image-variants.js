const { DataTypes } = require('sequelize');

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

module.exports = {
  async up(queryInterface) {
    if (!(await columnExists(queryInterface, 'product_assets', 'thumbnail_path'))) {
      await queryInterface.addColumn('product_assets', 'thumbnail_path', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, 'product_assets', 'preview_path'))) {
      await queryInterface.addColumn('product_assets', 'preview_path', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'product_assets', 'preview_path')) {
      await queryInterface.removeColumn('product_assets', 'preview_path');
    }
    if (await columnExists(queryInterface, 'product_assets', 'thumbnail_path')) {
      await queryInterface.removeColumn('product_assets', 'thumbnail_path');
    }
  },
};
