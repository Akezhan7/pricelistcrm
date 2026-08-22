const { DataTypes } = require('sequelize');

const PRIMARY_ADMIN_EMAIL = 'plastkrepsatu13@gmail.com';

module.exports = {
  async up(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');

    if (!usersTable.can_manage_kpi_weights) {
      await queryInterface.addColumn('users', 'can_manage_kpi_weights', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allows changing KPI weight after product review approval',
      });
    }

    await queryInterface.bulkUpdate(
      'users',
      { can_manage_kpi_weights: true },
      { email: PRIMARY_ADMIN_EMAIL }
    );
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.can_manage_kpi_weights) {
      await queryInterface.removeColumn('users', 'can_manage_kpi_weights');
    }
  },
};
