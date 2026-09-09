const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'employee_task_assignees'))) {
      await queryInterface.createTable('employee_task_assignees', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        task_id: {
          type: DataTypes.INTEGER, allowNull: false,
          references: { model: 'employee_tasks', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
        },
        user_id: {
          type: DataTypes.INTEGER, allowNull: false,
          references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
        },
        role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'collaborator' },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('employee_task_assignees', ['task_id', 'user_id'], {
        unique: true, name: 'uniq_employee_task_assignee',
      });
      await queryInterface.addIndex('employee_task_assignees', ['user_id', 'task_id'], {
        name: 'idx_employee_task_assignee_user',
      });
      await queryInterface.sequelize.query(`
        INSERT INTO employee_task_assignees (task_id, user_id, role, created_at)
        SELECT id, assigned_to_user_id, 'primary', created_at FROM employee_tasks
        ON CONFLICT (task_id, user_id) DO NOTHING
      `);
    }

    if (!(await tableExists(queryInterface, 'employee_task_attachments'))) {
      await queryInterface.createTable('employee_task_attachments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        task_id: {
          type: DataTypes.INTEGER, allowNull: false,
          references: { model: 'employee_tasks', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE',
        },
        uploaded_by_user_id: {
          type: DataTypes.INTEGER, allowNull: false,
          references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
        },
        original_name: { type: DataTypes.STRING(255), allowNull: false },
        stored_name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        mime_type: { type: DataTypes.STRING(120), allowNull: false },
        size: { type: DataTypes.INTEGER, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
      await queryInterface.addIndex('employee_task_attachments', ['task_id', 'created_at'], {
        name: 'idx_employee_task_attachment_task',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'employee_task_attachments')) {
      await queryInterface.dropTable('employee_task_attachments');
    }
    if (await tableExists(queryInterface, 'employee_task_assignees')) {
      await queryInterface.dropTable('employee_task_assignees');
    }
  },
};
