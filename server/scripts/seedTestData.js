/**
 * Скрипт для создания тестовых данных
 * Создаёт товары, категории и поставщиков для тестирования
 */

require('dotenv').config();
const { sequelize, Product, Category, Supplier, ProductSupplier, User } = require('../models');

async function createTestData() {
  console.log('🌱 Создание тестовых данных...\n');

  try {
    // Подключаемся к БД
    await sequelize.authenticate();
    console.log('✓ Подключение к БД установлено\n');

    // 1. Проверяем/создаём тестового админа
    console.log('👤 Проверка пользователя...');
    let admin = await User.findOne({ where: { email: 'admin@example.com' } });
    
    if (!admin) {
      const bcrypt = require('bcryptjs');
      admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
      });
      console.log('✓ Создан тестовый пользователь: admin@example.com / admin123');
    } else {
      console.log('✓ Пользователь admin@example.com уже существует');
    }

    // 2. Создаём категории
    console.log('\n📁 Создание категорий...');
    const categories = [
      { name: 'Маски и респираторы', description: 'Средства защиты органов дыхания' },
      { name: 'Перчатки', description: 'Защитные перчатки различных типов' },
      { name: 'Очки и щитки', description: 'Защита для глаз и лица' },
      { name: 'Спецодежда', description: 'Защитная одежда' },
    ];

    const createdCategories = [];
    for (const catData of categories) {
      const [category] = await Category.findOrCreate({
        where: { name: catData.name },
        defaults: catData,
      });
      createdCategories.push(category);
      console.log(`  ✓ ${category.name}`);
    }

    // 3. Создаём поставщиков
    console.log('\n👥 Создание поставщиков...');
    const suppliers = [
      { name: 'ООО Безопасность', phone: '+77001234567', whatsapp: '+77001234567', address: 'г. Алматы' },
      { name: 'ТОО СпецОснащение', phone: '+77007654321', whatsapp: '+77007654321', address: 'г. Астана' },
      { name: 'ИП Иванов', phone: '+77009876543', whatsapp: '+77009876543', address: 'г. Шымкент' },
    ];

    const createdSuppliers = [];
    for (const supData of suppliers) {
      const [supplier] = await Supplier.findOrCreate({
        where: { name: supData.name },
        defaults: supData,
      });
      createdSuppliers.push(supplier);
      console.log(`  ✓ ${supplier.name}`);
    }

    // 4. Создаём товары с разными остатками
    console.log('\n📦 Создание товаров...');
    const products = [
      // Критичные (остаток = 0)
      { name: 'Маска сварная чёрная', article: 'MSK-001', costPrice: 500, sellingPrice: 800, currentStock: 0, minStock: 20, categoryId: createdCategories[0].id },
      { name: 'Перчатки резиновые XL', article: 'PER-001', costPrice: 150, sellingPrice: 250, currentStock: 0, minStock: 50, categoryId: createdCategories[1].id },
      
      // Низкие (остаток <= minStock)
      { name: 'Очки защитные прозрачные', article: 'OCH-001', costPrice: 300, sellingPrice: 500, currentStock: 5, minStock: 30, categoryId: createdCategories[2].id },
      { name: 'Респиратор FFP2', article: 'RSP-001', costPrice: 800, sellingPrice: 1200, currentStock: 10, minStock: 25, categoryId: createdCategories[0].id },
      { name: 'Перчатки латексные M', article: 'PER-002', costPrice: 100, sellingPrice: 180, currentStock: 15, minStock: 40, categoryId: createdCategories[1].id },
      
      // Средние (остаток <= minStock * 2)
      { name: 'Комбинезон защитный', article: 'KOM-001', costPrice: 3000, sellingPrice: 4500, currentStock: 30, minStock: 20, categoryId: createdCategories[3].id },
      { name: 'Очки сварщика', article: 'OCH-002', costPrice: 600, sellingPrice: 900, currentStock: 25, minStock: 15, categoryId: createdCategories[2].id },
      
      // Хорошие (остаток > minStock * 2)
      { name: 'Маска медицинская 3-слойная', article: 'MSK-002', costPrice: 30, sellingPrice: 60, currentStock: 500, minStock: 100, categoryId: createdCategories[0].id },
      { name: 'Перчатки х/б с ПВХ', article: 'PER-003', costPrice: 50, sellingPrice: 90, currentStock: 200, minStock: 50, categoryId: createdCategories[1].id },
      { name: 'Каска защитная', article: 'KAS-001', costPrice: 1500, sellingPrice: 2200, currentStock: 80, minStock: 20, categoryId: createdCategories[3].id },
    ];

    for (const prodData of products) {
      const [product] = await Product.findOrCreate({
        where: { article: prodData.article },
        defaults: {
          ...prodData,
          internalName: prodData.name,
          kaspiName: prodData.name,
          kaspiArticle: prodData.article,
        },
      });

      // Привязываем к случайному поставщику
      const randomSupplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
      await ProductSupplier.findOrCreate({
        where: {
          productId: product.id,
          supplierId: randomSupplier.id,
        },
        defaults: {
          supplierPrice: prodData.costPrice,
          quantity: 100,
          isAvailable: true,
        },
      });

      const stockStatus = 
        product.currentStock === 0 ? '🔴 КРИТИЧНО' :
        product.currentStock <= product.minStock ? '🟡 НИЗКИЙ' :
        product.currentStock <= product.minStock * 2 ? '🟠 СРЕДНИЙ' :
        '✅ ХОРОШИЙ';

      console.log(`  ${stockStatus} ${product.article} - ${product.name} (${product.currentStock}/${product.minStock})`);
    }

    console.log('\n✅ Тестовые данные созданы успешно!\n');
    console.log('📊 Статистика:');
    console.log(`  Категорий: ${createdCategories.length}`);
    console.log(`  Поставщиков: ${createdSuppliers.length}`);
    console.log(`  Товаров: ${products.length}`);
    console.log(`  Пользователь: admin@example.com / admin123`);
    console.log('\n🚀 Теперь можно запустить тесты: node scripts/testStep3.js\n');

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createTestData();
