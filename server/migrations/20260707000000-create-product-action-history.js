const { DataTypes } = require('sequelize');

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :tableName
    `,
    { replacements: { tableName } }
  );

  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE indexname = :indexName
    `,
    { replacements: { indexName } }
  );

  return rows.length > 0;
}

async function addIndexIfMissing(queryInterface, tableName, columns, options) {
  if (await indexExists(queryInterface, options.name)) {
    console.log(`Skipping existing index ${options.name}`);
    return;
  }

  await queryInterface.addIndex(tableName, columns, options);
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'product_action_history'))) {
      await queryInterface.createTable('product_action_history', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        actor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        action_type: {
          type: DataTypes.STRING(80),
          allowNull: false,
        },
        from_status: {
          type: DataTypes.STRING(40),
          allowNull: true,
        },
        to_status: {
          type: DataTypes.STRING(40),
          allowNull: true,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
    }

    await addIndexIfMissing(queryInterface, 'product_action_history', ['product_id'], {
      name: 'idx_product_action_history_product',
    });
    await addIndexIfMissing(queryInterface, 'product_action_history', ['actor_id'], {
      name: 'idx_product_action_history_actor',
    });
    await addIndexIfMissing(queryInterface, 'product_action_history', ['action_type'], {
      name: 'idx_product_action_history_action',
    });
    await addIndexIfMissing(queryInterface, 'product_action_history', ['created_at'], {
      name: 'idx_product_action_history_created',
    });
    await addIndexIfMissing(queryInterface, 'product_action_history', ['product_id', 'created_at'], {
      name: 'idx_product_action_history_product_created',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_action_history')) {
      await queryInterface.dropTable('product_action_history');
    }
  },
};
