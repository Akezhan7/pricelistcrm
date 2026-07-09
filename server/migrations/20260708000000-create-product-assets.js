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
    if (!(await tableExists(queryInterface, 'product_assets'))) {
      await queryInterface.createTable('product_assets', {
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
        uploaded_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        asset_type: {
          type: DataTypes.STRING(40),
          allowNull: false,
        },
        file_path: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        original_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        mime_type: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        file_size: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        sort_order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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

    await addIndexIfMissing(queryInterface, 'product_assets', ['product_id'], {
      name: 'idx_product_assets_product',
    });
    await addIndexIfMissing(queryInterface, 'product_assets', ['asset_type'], {
      name: 'idx_product_assets_type',
    });
    await addIndexIfMissing(queryInterface, 'product_assets', ['uploaded_by'], {
      name: 'idx_product_assets_uploaded_by',
    });
    await addIndexIfMissing(queryInterface, 'product_assets', ['is_active'], {
      name: 'idx_product_assets_is_active',
    });
    await addIndexIfMissing(queryInterface, 'product_assets', ['product_id', 'asset_type', 'sort_order'], {
      name: 'idx_product_assets_product_type_order',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_assets')) {
      await queryInterface.dropTable('product_assets');
    }
  },
};
