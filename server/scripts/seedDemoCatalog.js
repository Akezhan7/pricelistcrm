/**
 * Разовый скрипт для наполнения локальной БД базовым демо-набором:
 * категории, поставщики, товары со связями и ценами поставщиков.
 * Товары создаются с дефолтным lifecycleStatus = 'in_sale' (готовый каталог).
 */

require('dotenv').config();
const { sequelize, Category, Supplier, Product, ProductSupplier } = require('../models');

const CATEGORIES = [
  { name: 'Игрушки', description: 'Детские игрушки и развлечения' },
  { name: 'Стройматериалы', description: 'Строительные материалы и инструменты' },
  { name: 'Посуда', description: 'Кухонная посуда и принадлежности' },
  { name: 'Текстиль', description: 'Ткани, одежда, постельное бельё' },
  { name: 'Товары для дома', description: 'Хозяйственные товары и мелочи для дома' },
];

const SUPPLIERS = [
  { name: 'ИП Ахметов', address: 'Рынок Байсад, ряд 12, контейнер 34', phone: '+77011234567', whatsapp: '+77011234567', sector: 'Игрушки' },
  { name: 'ТОО СтройОпт', address: 'Рынок Байсад, ряд 45, контейнер 8', phone: '+77022345678', whatsapp: '+77022345678', sector: 'Стройматериалы' },
  { name: 'ИП Дюсенова', address: 'Рынок Алтын Орда, ряд 7, контейнер 21', phone: '+77033456789', whatsapp: '+77033456789', sector: 'Посуда' },
  { name: 'ООО ТекстильПро', address: 'Рынок Алтын Орда, ряд 19, контейнер 3', phone: '+77044567890', whatsapp: '+77044567890', sector: 'Текстиль' },
  { name: 'ИП Смагулов', address: 'Рынок Байсад, ряд 3, контейнер 15', phone: '+77055678901', whatsapp: '+77055678901', sector: 'Товары для дома' },
  { name: 'ТОО Оптовик KZ', address: 'Рынок Евразия, ряд 22, контейнер 11', phone: '+77066789012', whatsapp: '+77066789012', sector: 'Игрушки' },
];

// [название, категория, себестоимость, цена продажи]
const PRODUCTS = [
  ['Конструктор металлический 120 деталей', 'Игрушки', 2500, 4500],
  ['Кукла в наборе с одеждой', 'Игрушки', 1800, 3400],
  ['Машинка инерционная', 'Игрушки', 900, 1900],
  ['Пазл 500 элементов', 'Игрушки', 1200, 2300],
  ['Шпатель малярный набор 5 шт', 'Стройматериалы', 1500, 2800],
  ['Перфоратор бытовой', 'Стройматериалы', 18000, 27500],
  ['Лента малярная 50м', 'Стройматериалы', 400, 900],
  ['Набор отвёрток 12 предметов', 'Стройматериалы', 2200, 4100],
  ['Сковорода антипригарная 26см', 'Посуда', 3500, 6200],
  ['Набор кастрюль 5 предметов', 'Посуда', 12000, 19900],
  ['Термос из нержавейки 1л', 'Посуда', 2800, 5400],
  ['Набор столовых приборов 24 предмета', 'Посуда', 4200, 7800],
  ['Полотенце банное махровое', 'Текстиль', 1100, 2200],
  ['Комплект постельного белья 2-спальный', 'Текстиль', 5500, 9900],
  ['Плед флисовый 150х200', 'Текстиль', 1900, 3600],
  ['Органайзер для белья складной', 'Товары для дома', 1300, 2600],
  ['Вешалки плечики набор 10 шт', 'Товары для дома', 600, 1300],
  ['Контейнер для хранения 20л', 'Товары для дома', 1700, 3200],
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  await sequelize.authenticate();

  console.log('📁 Категории...');
  const categoryByName = {};
  for (const cat of CATEGORIES) {
    const [category] = await Category.findOrCreate({
      where: { name: cat.name },
      defaults: cat,
    });
    categoryByName[cat.name] = category;
    console.log(`  ✓ ${category.name}`);
  }

  console.log('\n👥 Поставщики...');
  const suppliers = [];
  for (const s of SUPPLIERS) {
    const [supplier] = await Supplier.findOrCreate({
      where: { name: s.name },
      defaults: { ...s, debt: 0, isActive: true },
    });
    suppliers.push(supplier);
    console.log(`  ✓ ${supplier.name}`);
  }

  console.log('\n📦 Товары...');
  let created = 0;
  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const [name, categoryName, costPrice, sellingPrice] = PRODUCTS[i];
    const article = `DEMO-${String(1001 + i)}`;

    const existing = await Product.findOne({ where: { article } });
    if (existing) {
      console.log(`  ⏭️  ${name} уже существует, пропускаем`);
      continue;
    }

    const product = await Product.create({
      name,
      article,
      costPrice,
      sellingPrice,
      categoryId: categoryByName[categoryName]?.id || null,
      description: `${name} — демо-товар для категории «${categoryName}»`,
      currentStock: randomInt(5, 80),
      minStock: 10,
      isActive: true,
    });

    const sectorSuppliers = suppliers.filter((s) => s.sector === categoryName);
    const pool = sectorSuppliers.length > 0 ? sectorSuppliers : suppliers;
    const linkCount = randomInt(1, Math.min(2, pool.length));
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, linkCount);

    for (const [index, supplier] of chosen.entries()) {
      await ProductSupplier.create({
        productId: product.id,
        supplierId: supplier.id,
        supplierPrice: Math.round(costPrice * randomInt(90, 105) / 100),
        quantity: randomInt(10, 150),
        isAvailable: true,
        isPreferred: index === 0,
      });
    }

    created += 1;
    console.log(`  ✓ ${name} (${article}) — ${chosen.length} поставщик(ов)`);
  }

  console.log(`\n✨ Готово: ${Object.keys(categoryByName).length} категорий, ${suppliers.length} поставщиков, ${created} новых товаров.`);
  await sequelize.close();
}

seed().catch((error) => {
  console.error('❌ Ошибка сидинга демо-данных:', error);
  process.exit(1);
});
