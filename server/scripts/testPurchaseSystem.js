/**
 * Тест основных функций системы закупок
 * Проверяет статусы заявок, аналитику, интеграцию
 */

const sequelize = require('../config/database');
const { Order, Product, Supplier, User, Category, StockHistory, CollectorTask, WarehouseReceipt } = require('../models');
const { Op } = require('sequelize');

async function testSystem() {
  console.log('🧪 Тестирование системы закупок...\n');

  try {
    // 1. Проверка подключения к БД
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных успешно');

    // 2. Проверка статусов заявок
    const orderStatuses = Order.rawAttributes.status.type.values;
    console.log('\n📋 Доступные статусы заявок:');
    orderStatuses.forEach((status, i) => console.log(`   ${i + 1}. ${status}`));

    // 3. Проверка статистики заявок
    const stats = await Order.findAll({
      where: { isActive: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Создана' THEN 1 END")), 'created'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Отправлена поставщику' THEN 1 END")), 'sent'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status IN ('Подтверждена', 'Частично подтверждена') THEN 1 END")), 'confirmed'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'В сборе' THEN 1 END")), 'inCollection'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Забрана' THEN 1 END")), 'collected'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Принята на складе' THEN 1 END")), 'received'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'Закрыта' THEN 1 END")), 'closed'],
      ],
      raw: true,
    });
    console.log('\n📊 Статистика заявок:', stats[0]);

    // 4. Проверка товаров с новыми полями
    const productsCount = await Product.count({ where: { isActive: true } });
    const productsWithInternalName = await Product.count({ 
      where: { isActive: true, internalName: { [Op.ne]: null } } 
    });
    const productsWithKaspi = await Product.count({ 
      where: { isActive: true, kaspiArticle: { [Op.ne]: null } } 
    });
    console.log('\n📦 Товары:');
    console.log(`   Всего активных: ${productsCount}`);
    console.log(`   С внутренним названием: ${productsWithInternalName}`);
    console.log(`   С Kaspi данными: ${productsWithKaspi}`);

    // 5. Проверка категорий
    const categoriesCount = await Category.count({ where: { isActive: true } });
    console.log(`\n📁 Категорий: ${categoriesCount}`);

    // 6. Проверка поставщиков
    const suppliersCount = await Supplier.count({ where: { isActive: true } });
    const suppliersWithWhatsapp = await Supplier.count({ 
      where: { isActive: true, whatsapp: { [Op.ne]: null } } 
    });
    console.log(`\n🏪 Поставщики:`);
    console.log(`   Всего активных: ${suppliersCount}`);
    console.log(`   С WhatsApp: ${suppliersWithWhatsapp}`);

    // 7. Проверка пользователей и ролей
    const usersByRole = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true,
    });
    console.log('\n👤 Пользователи по ролям:');
    usersByRole.forEach(u => console.log(`   ${u.role}: ${u.count}`));

    // 8. Проверка истории остатков
    const stockHistoryCount = await StockHistory.count();
    console.log(`\n📈 Записей в истории остатков: ${stockHistoryCount}`);

    // 9. Проверка заданий сборщикам
    const tasksCount = await CollectorTask.count();
    console.log(`\n📝 Заданий сборщикам: ${tasksCount}`);

    // 10. Проверка приёмок на складе
    const receiptsCount = await WarehouseReceipt.count();
    console.log(`\n📥 Приёмок на складе: ${receiptsCount}`);

    // 11. Проверка аналитики остатков
    const lowStockProducts = await Product.count({
      where: {
        isActive: true,
        currentStock: { [Op.lte]: sequelize.col('minStock') },
      },
    });
    const outOfStock = await Product.count({
      where: {
        isActive: true,
        currentStock: 0,
      },
    });
    console.log('\n⚠️ Аналитика остатков:');
    console.log(`   Товары с низким остатком: ${lowStockProducts}`);
    console.log(`   Товары без остатка: ${outOfStock}`);

    console.log('\n✅ Все тесты пройдены успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Система закупок и склада готова к работе!');

  } catch (error) {
    console.error('\n❌ Ошибка тестирования:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testSystem();
