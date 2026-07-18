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
    if (!(await tableExists(queryInterface, 'employee_task_comments'))) {
      await queryInterface.createTable('employee_task_comments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        task_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'employee_tasks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        author_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        comment: { type: DataTypes.TEXT, allowNull: false },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      });
    }

    await addIndexIfMissing(queryInterface, 'employee_task_comments', ['task_id', 'created_at'], {
      name: 'idx_employee_task_comments_task_created',
    });
    await addIndexIfMissing(queryInterface, 'employee_task_comments', ['author_id'], {
      name: 'idx_employee_task_comments_author',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'employee_task_comments')) {
      await queryInterface.dropTable('employee_task_comments');
    }
  },
};
