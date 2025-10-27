require('dotenv').config();
const { sequelize } = require('../models');

async function checkEmail() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Поля в таблице suppliers:\n');
    results.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.data_type}`);
    });
    
    const hasEmail = results.find(c => c.column_name === 'email');
    console.log(hasEmail ? '\n✅ Поле email СУЩЕСТВУЕТ - миграция сработала!' : '\n❌ Поля email НЕТ - миграция не выполнялась');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

checkEmail();
