const { DataTypes } = require('sequelize');

const USER_MANAGER_EMAIL = 'saduov_web@gmail.com';

module.exports = {
  async up(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');

    if (!usersTable.can_manage_users) {
      await queryInterface.addColumn('users', 'can_manage_users', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allows editing, deactivating and deleting CRM users',
      });
    }

    await queryInterface.bulkUpdate(
      'users',
      { can_manage_users: true },
      { email: USER_MANAGER_EMAIL }
    );
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.can_manage_users) {
      await queryInterface.removeColumn('users', 'can_manage_users');
    }
  },
};
