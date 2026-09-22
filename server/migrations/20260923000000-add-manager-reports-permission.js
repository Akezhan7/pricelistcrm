const { DataTypes } = require('sequelize');

const GRANTED_EMAILS = ['plastkrepsatu13@gmail.com', 'saduov_web@gmail.com'];

module.exports = {
  async up(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');

    if (!usersTable.can_view_manager_reports) {
      await queryInterface.addColumn('users', 'can_view_manager_reports', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allows viewing the manager activity analytics report',
      });
    }

    await queryInterface.bulkUpdate(
      'users',
      { can_view_manager_reports: true },
      { email: GRANTED_EMAILS }
    );
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.can_view_manager_reports) {
      await queryInterface.removeColumn('users', 'can_view_manager_reports');
    }
  },
};
