const { DataTypes } = require('sequelize');

/**
 * Идемпотентная миграция - добавление роли collector
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    
    // Проверяем, существует ли уже роль collector в ENUM
    const [existingEnumValues] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_users_role'
      ORDER BY e.enumsortorder;
    `);

    const currentValues = existingEnumValues ? existingEnumValues.map(row => row.enumlabel) : [];
    
    if (currentValues.includes('collector')) {
      console.log('⏭️  Роль collector уже существует, пропускаем');
      return;
    }

    // Добавляем новую роль collector в ENUM
    await sequelize.query(`
      ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'collector';
    `);

    console.log('✅ Добавлена роль collector в ENUM ролей пользователей');
  },

  async down(queryInterface, Sequelize) {
    // Откат ENUM невозможен в PostgreSQL напрямую
    // Нужно создавать новый тип и мигрировать данные
    console.log('⚠️ Откат роли collector требует полной пересборки ENUM типа');
    console.log('⚠️ Если у вас есть пользователи с ролью collector, удалите их вручную');
  },
};
