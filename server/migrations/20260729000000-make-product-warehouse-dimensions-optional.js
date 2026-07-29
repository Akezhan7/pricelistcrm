const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

const DIMENSION_COLUMNS = [
  ['weight', DataTypes.DECIMAL(10, 3)],
  ['length', DataTypes.DECIMAL(10, 2)],
  ['width', DataTypes.DECIMAL(10, 2)],
  ['height', DataTypes.DECIMAL(10, 2)],
];

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_warehouse_details'))) return;

    for (const [column, type] of DIMENSION_COLUMNS) {
      await queryInterface.changeColumn('product_warehouse_details', column, {
        type,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_warehouse_details'))) return;

    for (const [column] of DIMENSION_COLUMNS) {
      await queryInterface.sequelize.query(
        `UPDATE product_warehouse_details SET ${column} = 0 WHERE ${column} IS NULL`
      );
    }

    for (const [column, type] of DIMENSION_COLUMNS) {
      await queryInterface.changeColumn('product_warehouse_details', column, {
        type,
        allowNull: false,
      });
    }
  },
};
