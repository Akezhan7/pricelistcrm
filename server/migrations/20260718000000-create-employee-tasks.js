const { DataTypes, QueryTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const rows = await queryInterface.sequelize.query(
    'SELECT indexname FROM pg_indexes WHERE indexname = :indexName',
    { replacements: { indexName }, type: QueryTypes.SELECT }
  );
  return rows.length > 0;
}

async function addIndexIfMissing(queryInterface, tableName, columns, options) {
  if (!(await indexExists(queryInterface, options.name))) {
    await queryInterface.addIndex(tableName, columns, options);
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'employee_tasks'))) {
      await queryInterface.createTable('employee_tasks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        title: { type: DataTypes.STRING(160), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        status: {
          type: DataTypes.ENUM('new', 'in_progress', 'review', 'returned', 'done', 'cancelled'),
          allowNull: false,
          defaultValue: 'new',
        },
        priority: {
          type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
          allowNull: false,
          defaultValue: 'normal',
        },
        created_by_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        assigned_to_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        due_date: { type: DataTypes.DATE, allowNull: true },
        submitted_at: { type: DataTypes.DATE, allowNull: true },
        completed_at: { type: DataTypes.DATE, allowNull: true },
        cancelled_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    if (!(await tableExists(queryInterface, 'employee_task_history'))) {
      await queryInterface.createTable('employee_task_history', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        task_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'employee_tasks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        actor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        action: { type: DataTypes.STRING(60), allowNull: false },
        from_status: { type: DataTypes.STRING(40), allowNull: true },
        to_status: { type: DataTypes.STRING(40), allowNull: true },
        comment: { type: DataTypes.TEXT, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await addIndexIfMissing(queryInterface, 'employee_tasks', ['assigned_to_user_id', 'status'], {
      name: 'idx_employee_tasks_assignee_status',
    });
    await addIndexIfMissing(queryInterface, 'employee_tasks', ['created_by_user_id'], {
      name: 'idx_employee_tasks_creator',
    });
    await addIndexIfMissing(queryInterface, 'employee_tasks', ['status'], {
      name: 'idx_employee_tasks_status',
    });
    await addIndexIfMissing(queryInterface, 'employee_tasks', ['due_date'], {
      name: 'idx_employee_tasks_due_date',
    });
    await addIndexIfMissing(queryInterface, 'employee_task_history', ['task_id', 'created_at'], {
      name: 'idx_employee_task_history_task_created',
    });
    await addIndexIfMissing(queryInterface, 'employee_task_history', ['actor_id'], {
      name: 'idx_employee_task_history_actor',
    });
    await addIndexIfMissing(queryInterface, 'employee_task_history', ['action'], {
      name: 'idx_employee_task_history_action',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'employee_task_history')) {
      await queryInterface.dropTable('employee_task_history');
    }
    if (await tableExists(queryInterface, 'employee_tasks')) {
      await queryInterface.dropTable('employee_tasks');
    }
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_employee_task_history_action;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_employee_tasks_priority;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_employee_tasks_status;');
  },
};
