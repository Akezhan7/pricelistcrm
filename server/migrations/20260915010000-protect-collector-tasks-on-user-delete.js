const { QueryTypes } = require('sequelize');

async function replaceAssignedUserConstraint(queryInterface, onDelete) {
  const [constraint] = await queryInterface.sequelize.query(
    `SELECT tc.constraint_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
     WHERE tc.table_name = 'collector_tasks'
       AND kcu.column_name = 'assigned_to'
       AND tc.constraint_type = 'FOREIGN KEY'`,
    { type: QueryTypes.SELECT }
  );

  if (constraint) {
    await queryInterface.removeConstraint('collector_tasks', constraint.constraint_name);
  }

  await queryInterface.addConstraint('collector_tasks', {
    fields: ['assigned_to'],
    type: 'foreign key',
    name: 'collector_tasks_assigned_to_fkey',
    references: { table: 'users', field: 'id' },
    onDelete,
    onUpdate: 'CASCADE',
  });
}

module.exports = {
  async up(queryInterface) {
    await replaceAssignedUserConstraint(queryInterface, 'RESTRICT');
  },

  async down(queryInterface) {
    await replaceAssignedUserConstraint(queryInterface, 'CASCADE');
  },
};
