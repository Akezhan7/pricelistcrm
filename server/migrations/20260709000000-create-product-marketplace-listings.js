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
    if (!(await tableExists(queryInterface, 'product_marketplace_listings'))) {
      await queryInterface.createTable('product_marketplace_listings', {
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
        marketplace: {
          type: DataTypes.STRING(40),
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(40),
          allowNull: false,
        },
        sku: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        marketplace_article: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        marketplace_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        price: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: true,
        },
        url: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        managed_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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

    await addIndexIfMissing(queryInterface, 'product_marketplace_listings', ['product_id'], {
      name: 'idx_product_marketplace_listings_product',
    });
    await addIndexIfMissing(queryInterface, 'product_marketplace_listings', ['marketplace'], {
      name: 'idx_product_marketplace_listings_marketplace',
    });
    await addIndexIfMissing(queryInterface, 'product_marketplace_listings', ['status'], {
      name: 'idx_product_marketplace_listings_status',
    });
    await addIndexIfMissing(queryInterface, 'product_marketplace_listings', ['managed_by'], {
      name: 'idx_product_marketplace_listings_managed_by',
    });
    await addIndexIfMissing(queryInterface, 'product_marketplace_listings', ['product_id', 'marketplace'], {
      name: 'uq_product_marketplace_listings_product_marketplace',
      unique: true,
    });

    await queryInterface.sequelize.query(`
      INSERT INTO product_marketplace_listings (
        product_id,
        marketplace,
        status,
        sku,
        marketplace_name,
        price,
        created_at,
        updated_at
      )
      SELECT
        id,
        'kaspi',
        CASE
          WHEN kaspi_article IS NOT NULL
            AND kaspi_article <> ''
            AND kaspi_name IS NOT NULL
            AND kaspi_name <> ''
            AND selling_price IS NOT NULL
            AND selling_price > 0
          THEN 'published'
          ELSE 'placing'
        END,
        NULLIF(kaspi_article, ''),
        NULLIF(kaspi_name, ''),
        selling_price,
        NOW(),
        NOW()
      FROM products
      WHERE (kaspi_article IS NOT NULL AND kaspi_article <> '')
         OR (kaspi_name IS NOT NULL AND kaspi_name <> '')
      ON CONFLICT (product_id, marketplace) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'product_marketplace_listings')) {
      await queryInterface.dropTable('product_marketplace_listings');
    }
  },
};
