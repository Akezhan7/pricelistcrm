'use strict';

/**
 * Добавляет:
 *  - значение 'Доставка' в enum_orders_status (между 'Подтверждена' и 'Принята на складе')
 *  - колонку orders.type ENUM('purchase','return') NOT NULL DEFAULT 'purchase'
 *
 * Идемпотентна: проверяет наличие значения/колонки перед добавлением.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // ---- 1. Добавляем значение 'Доставка' в enum_orders_status ----
    const [statusRows] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'enum_orders_status'
      ORDER BY e.enumsortorder;
    `);
    const statusValues = statusRows.map((r) => r.enumlabel);

    if (!statusValues.includes('Доставка')) {
      console.log('🔄 Добавляем статус "Доставка" в enum_orders_status...');
      // ADD VALUE IF NOT EXISTS BEFORE — ставим значение перед 'Принята на складе'
      // если такого якорного значения нет — добавляем как обычное.
      const anchor = statusValues.includes('Принята на складе')
        ? `BEFORE 'Принята на складе'`
        : '';
      await sequelize.query(`
        ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS 'Доставка' ${anchor};
      `);
      console.log('  ✅ Статус "Доставка" добавлен');
    } else {
      console.log('  ⏭️  Статус "Доставка" уже существует');
    }

    // ---- 2. Добавляем колонку orders.type ----
    const tableDesc = await queryInterface.describeTable('orders');
    if (!tableDesc.type) {
      console.log('🔄 Добавляем колонку orders.type...');

      // Создаём enum_orders_type (Sequelize создаст автоматически при addColumn,
      // но для надёжности проверим существование)
      const [typeEnumRows] = await sequelize.query(`
        SELECT 1 FROM pg_type WHERE typname = 'enum_orders_type';
      `);
      if (typeEnumRows.length === 0) {
        await sequelize.query(`
          CREATE TYPE "enum_orders_type" AS ENUM ('purchase', 'return');
        `);
      }

      await sequelize.query(`
        ALTER TABLE orders
        ADD COLUMN "type" "enum_orders_type" NOT NULL DEFAULT 'purchase';
      `);

      await queryInterface.addIndex('orders', ['type'], {
        name: 'orders_type_idx',
      });
      console.log('  ✅ Колонка orders.type добавлена');
    } else {
      console.log('  ⏭️  Колонка orders.type уже существует');
    }
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    const tableDesc = await queryInterface.describeTable('orders');
    if (tableDesc.type) {
      try {
        await queryInterface.removeIndex('orders', 'orders_type_idx');
      } catch (e) {
        // индекса может не быть
      }
      await queryInterface.removeColumn('orders', 'type');
      await sequelize.query(`DROP TYPE IF EXISTS "enum_orders_type";`);
      console.log('✅ Колонка orders.type удалена');
    }

    console.log(
      '⚠️  Значение "Доставка" в enum_orders_status оставлено (PostgreSQL не поддерживает удаление значений ENUM)'
    );
  },
};
