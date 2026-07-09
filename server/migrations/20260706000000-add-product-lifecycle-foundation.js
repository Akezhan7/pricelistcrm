const { DataTypes } = require('sequelize');

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = :tableName
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

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  if (await columnExists(queryInterface, tableName, columnName)) {
    console.log(`Skipping existing column ${tableName}.${columnName}`);
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
}

async function addIndexIfMissing(queryInterface, tableName, columns, options) {
  if (await indexExists(queryInterface, options.name)) {
    console.log(`Skipping existing index ${options.name}`);
    return;
  }

  await queryInterface.addIndex(tableName, columns, options);
}

async function removeIndexIfExists(queryInterface, tableName, indexName) {
  if (!(await indexExists(queryInterface, indexName))) return;

  await queryInterface.removeIndex(tableName, indexName);
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'designer';
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'marketplace_manager';
    `);

    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_status', {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'in_sale',
      comment: 'Product lifecycle status',
    });

    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_started_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When lifecycle processing started',
    });

    await addColumnIfMissing(queryInterface, 'products', 'lifecycle_completed_at', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When product reached sale status',
    });

    const nullableUserReference = {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    await addColumnIfMissing(queryInterface, 'products', 'assigned_to_user_id', {
      ...nullableUserReference,
      comment: 'Current lifecycle assignee',
    });

    await addColumnIfMissing(queryInterface, 'products', 'designer_id', {
      ...nullableUserReference,
      comment: 'Assigned designer',
    });

    await addColumnIfMissing(queryInterface, 'products', 'marketplace_manager_id', {
      ...nullableUserReference,
      comment: 'Assigned marketplace manager',
    });

    await addColumnIfMissing(queryInterface, 'products', 'created_by_user_id', {
      ...nullableUserReference,
      comment: 'User who created the lifecycle product card',
    });

    await addColumnIfMissing(queryInterface, 'products', 'reviewed_by_user_id', {
      ...nullableUserReference,
      comment: 'Last reviewer',
    });

    await addColumnIfMissing(queryInterface, 'products', 'kpi_weight', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Optional KPI weight for lifecycle reporting',
    });

    await addColumnIfMissing(queryInterface, 'products', 'launch_notes', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Lifecycle notes for product launch',
    });

    await queryInterface.sequelize.query(`
      UPDATE products
      SET lifecycle_status = 'in_sale'
      WHERE lifecycle_status IS NULL;
    `);

    await addIndexIfMissing(queryInterface, 'products', ['lifecycle_status'], {
      name: 'idx_products_lifecycle_status',
    });

    await addIndexIfMissing(queryInterface, 'products', ['assigned_to_user_id'], {
      name: 'idx_products_assigned_to_user_id',
    });

    await addIndexIfMissing(queryInterface, 'products', ['designer_id'], {
      name: 'idx_products_designer_id',
    });

    await addIndexIfMissing(queryInterface, 'products', ['marketplace_manager_id'], {
      name: 'idx_products_marketplace_manager_id',
    });
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'products', 'idx_products_marketplace_manager_id');
    await removeIndexIfExists(queryInterface, 'products', 'idx_products_designer_id');
    await removeIndexIfExists(queryInterface, 'products', 'idx_products_assigned_to_user_id');
    await removeIndexIfExists(queryInterface, 'products', 'idx_products_lifecycle_status');

    const columns = [
      'launch_notes',
      'kpi_weight',
      'reviewed_by_user_id',
      'created_by_user_id',
      'marketplace_manager_id',
      'designer_id',
      'assigned_to_user_id',
      'lifecycle_completed_at',
      'lifecycle_started_at',
      'lifecycle_status',
    ];

    for (const column of columns) {
      if (await columnExists(queryInterface, 'products', column)) {
        await queryInterface.removeColumn('products', column);
      }
    }

    console.log('PostgreSQL enum role values designer and marketplace_manager remain in enum_users_role.');
  },
};
