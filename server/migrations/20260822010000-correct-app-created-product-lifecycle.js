const MIGRATION_KEY = '20260822010000-correct-app-created-product-lifecycle';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        WITH corrected_products AS (
          UPDATE products
          SET lifecycle_status = 'new',
              lifecycle_started_at = COALESCE(created_at, CURRENT_TIMESTAMP),
              lifecycle_completed_at = NULL,
              assigned_to_user_id = NULL,
              designer_id = NULL,
              reviewed_by_user_id = NULL,
              kpi_weight = NULL
          WHERE lifecycle_status = 'in_sale'
            AND lifecycle_started_at IS NULL
            AND lifecycle_completed_at IS NULL
            AND created_by_user_id IS NOT NULL
            AND assigned_to_user_id IS NULL
            AND designer_id IS NULL
            AND marketplace_manager_id IS NULL
            AND reviewed_by_user_id IS NULL
            AND kpi_weight IS NULL
          RETURNING id
        )
        INSERT INTO product_action_history (
          product_id,
          actor_id,
          action_type,
          from_status,
          to_status,
          message,
          metadata,
          created_at
        )
        SELECT id,
               NULL,
               'lifecycle_status_corrected',
               'in_sale',
               'new',
               'Newly created product moved from legacy catalog to lifecycle queue',
               jsonb_build_object('migration', :migrationKey),
               CURRENT_TIMESTAMP
        FROM corrected_products;
      `, {
        replacements: { migrationKey: MIGRATION_KEY },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        WITH reverted_products AS (
          UPDATE products AS product
          SET lifecycle_status = 'in_sale',
              lifecycle_started_at = NULL
          WHERE product.lifecycle_status = 'new'
            AND product.assigned_to_user_id IS NULL
            AND product.designer_id IS NULL
            AND product.marketplace_manager_id IS NULL
            AND product.reviewed_by_user_id IS NULL
            AND product.kpi_weight IS NULL
            AND EXISTS (
              SELECT 1
              FROM product_action_history AS history
              WHERE history.product_id = product.id
                AND history.action_type = 'lifecycle_status_corrected'
                AND history.metadata->>'migration' = :migrationKey
            )
          RETURNING id
        )
        DELETE FROM product_action_history AS history
        USING reverted_products
        WHERE history.product_id = reverted_products.id
          AND history.action_type = 'lifecycle_status_corrected'
          AND history.metadata->>'migration' = :migrationKey;
      `, {
        replacements: { migrationKey: MIGRATION_KEY },
        transaction,
      });
    });
  },
};
