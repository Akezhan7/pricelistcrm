const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Создаём временный тип ENUM с новыми статусами
    await queryInterface.sequelize.query(`
      CREATE TYPE order_status_new AS ENUM (
        'Создана',
        'Отправлена поставщику',
        'Частично подтверждена',
        'Подтверждена',
        'В сборе',
        'Забрана',
        'Принята на складе',
        'Закрыта'
      );
    `);

    // Мигрируем существующие данные (маппинг старых статусов на новые)
    await queryInterface.sequelize.query(`
      UPDATE orders SET status = CASE
        WHEN status = 'В работе' THEN 'Создана'
        WHEN status = 'На точке' THEN 'Отправлена поставщику'
        WHEN status = 'В пути' THEN 'Забрана'
        WHEN status = 'На складе' THEN 'Принята на складе'
        ELSE 'Создана'
      END::text;
    `);

    // Изменяем тип колонки на новый ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status TYPE order_status_new 
      USING status::text::order_status_new;
    `);

    // Удаляем старый тип ENUM
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS order_status_old CASCADE;
    `);

    // Переименовываем новый тип в стандартное имя
    await queryInterface.sequelize.query(`
      ALTER TYPE order_status_new RENAME TO order_status_old;
    `);

    // Устанавливаем новое значение по умолчанию
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status SET DEFAULT 'Создана';
    `);

    console.log('✅ Обновлены статусы заявок и мигрированы существующие данные');
  },

  async down(queryInterface, Sequelize) {
    // Откат: возвращаем старые статусы
    await queryInterface.sequelize.query(`
      CREATE TYPE order_status_new AS ENUM (
        'В работе',
        'На точке',
        'В пути',
        'На складе'
      );
    `);

    // Обратная миграция данных
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
      END::text;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status TYPE order_status_new 
      USING status::text::order_status_new;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS order_status_old CASCADE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE order_status_new RENAME TO order_status_old;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      ALTER COLUMN status SET DEFAULT 'В работе';
    `);

    console.log('✅ Откачены изменения статусов заявок');
  },
};
