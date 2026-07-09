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

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
        AND column_name = :columnName
    `,
    { replacements: { tableName, columnName } }
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
    if (!(await tableExists(queryInterface, 'product_revision_requests'))) {
      await queryInterface.createTable('product_revision_requests', {
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
        requested_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        assigned_designer_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(40),
          allowNull: false,
        },
        resolved_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
    }

    await addIndexIfMissing(queryInterface, 'product_revision_requests', ['product_id'], {
      name: 'idx_product_revision_requests_product',
    });
    await addIndexIfMissing(queryInterface, 'product_revision_requests', ['requested_by'], {
      name: 'idx_product_revision_requests_requested_by',
    });
    await addIndexIfMissing(queryInterface, 'product_revision_requests', ['assigned_designer_id'], {
      name: 'idx_product_revision_requests_designer',
    });
    await addIndexIfMissing(queryInterface, 'product_revision_requests', ['status'], {
      name: 'idx_product_revision_requests_status',
    });
    await addIndexIfMissing(queryInterface, 'product_revision_requests', ['product_id', 'status', 'created_at'], {
      name: 'idx_product_revision_requests_product_status_created',
    });

    if (
      (await tableExists(queryInterface, 'product_assets')) &&
      !(await columnExists(queryInterface, 'product_assets', 'revision_request_id'))
    ) {
      await queryInterface.addColumn('product_assets', 'revision_request_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'product_revision_requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (await tableExists(queryInterface, 'product_assets')) {
      await addIndexIfMissing(queryInterface, 'product_assets', ['revision_request_id'], {
        name: 'idx_product_assets_revision_request',
      });
    }
  },

  async down(queryInterface) {
    if (
      (await tableExists(queryInterface, 'product_assets')) &&
      (await columnExists(queryInterface, 'product_assets', 'revision_request_id'))
    ) {
      await queryInterface.removeColumn('product_assets', 'revision_request_id');
    }

    if (await tableExists(queryInterface, 'product_revision_requests')) {
      await queryInterface.dropTable('product_revision_requests');
    }
  },
};
