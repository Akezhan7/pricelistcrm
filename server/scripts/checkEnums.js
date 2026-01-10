const sequelize = require('../config/database');

async function checkEnums() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключено к БД\n');

    // Проверяем статусы заявок
    const [orderStatuses] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_orders_status'
      ORDER BY e.enumsortorder;
    `);
    console.log('📋 Статусы Order:');
    orderStatuses.forEach(s => console.log(`   - ${s.enumlabel}`));

    // Проверяем роли пользователей
    const [userRoles] = await sequelize.query(`
      SELECT e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_users_role'
      ORDER BY e.enumsortorder;
    `);
    console.log('\n👥 Роли User:');
    userRoles.forEach(r => console.log(`   - ${r.enumlabel}`));

    await sequelize.close();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkEnums();
