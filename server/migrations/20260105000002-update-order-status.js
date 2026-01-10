const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция статусов заявок
 * Проверяет текущее состояние перед выполнением операций
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем, существует ли уже новый тип статусов
    const [existingEnumValues] = await queryInterface.sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_orders_status'
      ORDER BY e.enumsortorder;
    `);

    const currentValues = existingEnumValues.map(row => row.enumlabel);
    const hasNewStatuses = currentValues.includes('Создана') || currentValues.includes('Отправлена поставщику');

    if (hasNewStatuses) {
      console.log('⏭️  Новые статусы уже присутствуют, пропускаем миграцию');
      return;
    }

    console.log('🔄 Текущие статусы:', currentValues.join(', '));
    console.log('🔄 Обновляем статусы заявок...');

    // Добавляем новые значения в существующий ENUM
    const newStatuses = [
      'Создана',
      'Отправлена поставщику', 
      'Частично подтверждена',
      'Подтверждена',
      'В сборе',
      'Забрана',
      'Принята на складе',
      'Закрыта'
    ];

    for (const status of newStatuses) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_orders_status" ADD VALUE IF NOT EXISTS '${status}';
        `);
        console.log(`  ✅ Добавлен статус: ${status}`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`  ⏭️  Статус ${status} уже существует`);
        } else {
          throw e;
        }
      }
    }

    // Мигрируем существующие данные (маппинг старых статусов на новые)
    await queryInterface.sequelize.query(`
      UPDATE orders SET status = CASE
        WHEN status = 'В работе' THEN 'Создана'
        WHEN status = 'На точке' THEN 'Отправлена поставщику'
        WHEN status = 'В пути' THEN 'Забрана'
        WHEN status = 'На складе' THEN 'Принята на складе'
        ELSE status
      END WHERE status IN ('В работе', 'На точке', 'В пути', 'На складе');
    `);

    // Устанавливаем новое значение по умолчанию
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status SET DEFAULT 'Создана';
    `);

    console.log('✅ Обновлены статусы заявок и мигрированы существующие данные');
  },

  async down(queryInterface, Sequelize) {
    // Обратная миграция данных (переводим новые статусы в старые)
    await queryInterface.sequelize.query(`
      UPDATE orders SET status = CASE
        WHEN status = 'Создана' THEN 'В работе'
        WHEN status = 'Отправлена поставщику' THEN 'На точке'
        WHEN status = 'Частично подтверждена' THEN 'На точке'
        WHEN status = 'Подтверждена' THEN 'На точке'
        WHEN status = 'В сборе' THEN 'В пути'
        WHEN status = 'Забрана' THEN 'В пути'
        WHEN status = 'Принята на складе' THEN 'На складе'
        WHEN status = 'Закрыта' THEN 'На складе'
        ELSE 'В работе'
      END;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status SET DEFAULT 'В работе';
    `);

    console.log('✅ Откачены изменения статусов заявок');
    console.log('⚠️  Примечание: новые значения ENUM не удалены (PostgreSQL не поддерживает удаление значений ENUM)');
  },
};
