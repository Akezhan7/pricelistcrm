const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

async function addBooleanColumnIfMissing(queryInterface, tableName, columnName) {
  if (!(await columnExists(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  if (await columnExists(queryInterface, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up(queryInterface) {
    const tableName = 'product_launch_flags';
    if (!(await tableExists(queryInterface, tableName))) return;

    await addBooleanColumnIfMissing(queryInterface, tableName, 'internal_advertising_started');
    await addBooleanColumnIfMissing(queryInterface, tableName, 'external_advertising_started');
    await addBooleanColumnIfMissing(queryInterface, tableName, 'seller_bonus_enabled');

    if (await columnExists(queryInterface, tableName, 'advertising_started')) {
      await queryInterface.sequelize.query(`
        UPDATE product_launch_flags
        SET internal_advertising_started = advertising_started
        WHERE internal_advertising_started = FALSE;
      `);
    }

    await removeColumnIfExists(queryInterface, tableName, 'advertising_started');
    await removeColumnIfExists(queryInterface, tableName, 'promotion_started');
  },

  async down(queryInterface) {
    const tableName = 'product_launch_flags';
    if (!(await tableExists(queryInterface, tableName))) return;

    await addBooleanColumnIfMissing(queryInterface, tableName, 'advertising_started');
    await addBooleanColumnIfMissing(queryInterface, tableName, 'promotion_started');

    if (await columnExists(queryInterface, tableName, 'internal_advertising_started')) {
      await queryInterface.sequelize.query(`
        UPDATE product_launch_flags
        SET advertising_started = internal_advertising_started
        WHERE advertising_started = FALSE;
      `);
    }
    if (await columnExists(queryInterface, tableName, 'seller_bonus_enabled')) {
      await queryInterface.sequelize.query(`
        UPDATE product_launch_flags
        SET promotion_started = seller_bonus_enabled
        WHERE promotion_started = FALSE;
      `);
    }

    await removeColumnIfExists(queryInterface, tableName, 'internal_advertising_started');
    await removeColumnIfExists(queryInterface, tableName, 'external_advertising_started');
    await removeColumnIfExists(queryInterface, tableName, 'seller_bonus_enabled');
  },
};
