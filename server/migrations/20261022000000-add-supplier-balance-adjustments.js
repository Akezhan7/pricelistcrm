const { DataTypes } = require('sequelize');

const GRANTED_EMAILS = ['plastkrepsatu13@gmail.com', 'saduov_web@gmail.com'];
// Статусы заявок, учитываемых в долге (см. DEBT_STATUSES в orderStatusPolicyService).
const DEBT_STATUS_SQL = "('Принята на складе', 'Закрыта')";

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const alreadyExists = await queryInterface.tableExists('supplier_balance_adjustments');

    if (!alreadyExists) {
      await queryInterface.createTable('supplier_balance_adjustments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        supplier_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'suppliers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        balance_before: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        balance_after: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        comment: { type: DataTypes.TEXT, allowNull: false },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('supplier_balance_adjustments', ['supplier_id'], {
        name: 'idx_supplier_balance_adjustments_supplier',
      });

      // До этой миграции баланс можно было переписать вручную через форму поставщика, а следующий
      // пересчёт стирал введённое. Фиксируем текущие значения как стартовую корректировку,
      // чтобы после деплоя ни одна сумма у поставщика не изменилась.
      await sequelize.query(`
        INSERT INTO supplier_balance_adjustments
          (supplier_id, amount, balance_before, balance_after, comment, created_by, created_at, updated_at)
        SELECT id, ROUND(stored - computed, 2), ROUND(computed, 2), ROUND(stored, 2),
               'Перенос ранее введённого значения', NULL, NOW(), NOW()
        FROM (
          SELECT s.id,
                 COALESCE(s.debt, 0) AS stored,
                 COALESCE((
                   SELECT SUM(CASE WHEN o.type = 'return' THEN -o.total_amount ELSE o.total_amount END)
                   FROM orders o
                   WHERE o.supplier_id = s.id AND o.is_active = true AND o.status IN ${DEBT_STATUS_SQL}
                 ), 0) - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.supplier_id = s.id), 0) AS computed
          FROM suppliers s
        ) balances
        WHERE ABS(stored - computed) >= 0.01
      `);
    }

    const usersTable = await queryInterface.describeTable('users');
    if (!usersTable.can_adjust_supplier_balance) {
      await queryInterface.addColumn('users', 'can_adjust_supplier_balance', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allows manually correcting the mutual settlement balance with a supplier',
      });
    }

    await queryInterface.bulkUpdate(
      'users',
      { can_adjust_supplier_balance: true },
      { email: GRANTED_EMAILS }
    );
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable('users');
    if (usersTable.can_adjust_supplier_balance) {
      await queryInterface.removeColumn('users', 'can_adjust_supplier_balance');
    }
    if (await queryInterface.tableExists('supplier_balance_adjustments')) {
      await queryInterface.dropTable('supplier_balance_adjustments');
    }
  },
};
