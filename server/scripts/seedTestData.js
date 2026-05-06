/**
 * Скрипт для создания тестовых данных
 * Создаёт 40 товаров и 30 поставщиков для тестирования пагинации
 */

require('dotenv').config();
const sequelize = require('../config/database');
const { Product, Supplier, Market, ProductSupplier } = require('../models/associations');

const productNames = [
  'Маска медицинская', 'Перчатки латексные', 'Антисептик гелевый', 'Респиратор FFP2',
  'Термометр электронный', 'Бинт стерильный', 'Вата медицинская', 'Шприц 5мл',
  'Пластырь бактерицидный', 'Йод раствор', 'Зеленка', 'Перекись водорода',
  'Аспирин таблетки', 'Парацетамол', 'Активированный уголь', 'Но-шпа',
  'Цитрамон', 'Нурофен', 'Супрастин', 'Мезим форте',
  'Линекс капсулы', 'Смекта порошок', 'Корвалол капли', 'Валидол таблетки',
  'Нашатырный спирт', 'Борная кислота', 'Фурацилин таблетки', 'Стрептоцид',
  'Левомеколь мазь', 'Пантенол спрей', 'Бепантен крем', 'Солкосерил гель',
  'Троксевазин гель', 'Финалгон мазь', 'Вольтарен эмульгель', 'Фастум гель',
  'Звездочка бальзам', 'Доктор Мом мазь', 'Називин спрей', 'Пиносол капли',
  'Мукалтин таблетки', 'Бромгексин', 'АЦЦ порошок', 'Амброксол сироп',
  'Грудной сбор №4', 'Ромашка аптечная', 'Шалфей трава', 'Календула цветки',
  'Эхинацея настойка', 'Элеутерококк экстракт'
];

const supplierNames = [
  'ИП Иванов', 'ООО Медснаб', 'ТОО Фармлайн', 'ИП Петров', 'ООО Здоровье',
  'ТОО Аптека плюс', 'ИП Сидоров', 'ООО Витамед', 'ТОО Медтех', 'ИП Смирнов',
  'ООО Фармкомпани', 'ТОО Лекарства', 'ИП Козлов', 'ООО Медикал', 'ТОО Аптечный склад',
  'ИП Новиков', 'ООО Фарминдустрия', 'ТОО Медпром', 'ИП Морозов', 'ООО Здравсервис',
  'ТОО Витафарм', 'ИП Волков', 'ООО Фармацевт', 'ТОО Медцентр', 'ИП Соколов',
  'ООО Аптечная сеть', 'ТОО Фармация', 'ИП Лебедев', 'ООО Медикаменты', 'ТОО Здравмед',
  'ИП Егоров', 'ООО Фармторг', 'ТОО Аптечный мир', 'ИП Павлов'
];

const marketNames = ['Байсат', 'Ялянь', 'Алтын Орда', 'Оптима', 'Евразия'];

const addresses = [
  'мкр. Жулдыз, ул. Толе би 45', 'пр. Абая 120', 'ул. Сатпаева 90',
  'мкр. Самал 1, дом 25', 'ул. Розыбакиева 247', 'пр. Райымбека 348',
  'ул. Макатаева 127', 'пр. Достык 162', 'ул. Богенбай батыра 250',
  'мкр. Мамыр, ул. Момышулы 18'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
  return `+7${randomInt(700, 799)}${randomInt(1000000, 9999999)}`;
}

function randomPrice(min, max) {
  return randomInt(min, max) * 100;
}

async function seedData() {
  try {
    console.log('🌱 Начинаем заполнение базы данных тестовыми данными...\n');

    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено\n');

    // Создаем рынки
    console.log('📍 Создание рынков...');
    const markets = [];
    for (let i = 0; i < marketNames.length; i++) {
      const [market] = await Market.findOrCreate({
        where: { name: marketNames[i] },
        defaults: {
          name: marketNames[i],
          address: addresses[i % addresses.length],
          description: `Крупный оптово-розничный рынок ${marketNames[i]}`
        }
      });
      markets.push(market);
      console.log(`  ✅ ${market.name}`);
    }

    // Создаем поставщиков
    console.log('\n👥 Создание поставщиков...');
    const suppliers = [];
    for (let i = 0; i < 30; i++) {
      const useMarket = Math.random() > 0.3; // 70% на рынке
      const marketId = useMarket ? markets[randomInt(0, markets.length - 1)].id : null;
      
      const supplier = await Supplier.create({
        name: supplierNames[i % supplierNames.length] + (i >= supplierNames.length ? ` ${Math.floor(i / supplierNames.length) + 1}` : ''),
        phone: randomPhone(),
        whatsapp: randomPhone(),
        address: useMarket 
          ? `Ряд ${randomInt(1, 50)}, Контейнер ${randomInt(1, 20)}`
          : addresses[randomInt(0, addresses.length - 1)],
        marketId: marketId,
        row: useMarket ? randomInt(1, 50) : null,
        container: useMarket ? randomInt(1, 20) : null,
        sector: ['Медицина', 'Косметика', 'Гигиена', 'Товары для дома'][randomInt(0, 3)],
        debt: randomInt(0, 100000),
        notes: i % 3 === 0 ? 'Надежный поставщик, работаем давно' : '',
        isActive: true
      });
      suppliers.push(supplier);
      console.log(`  ✅ ${supplier.name} ${useMarket ? `(${markets.find(m => m.id === marketId)?.name})` : '(город)'}`);
    }

    // Создаем товары
    console.log('\n📦 Создание товаров...');
    for (let i = 0; i < 40; i++) {
      const costPrice = randomPrice(50, 500);
      const sellingPrice = Math.round(costPrice * (1 + randomInt(20, 80) / 100));
      
      const product = await Product.create({
        name: productNames[i % productNames.length] + (i >= productNames.length ? ` ${String.fromCharCode(65 + Math.floor(i / productNames.length))}` : ''),
        article: `ART-${String(1000 + i).padStart(4, '0')}`,
        costPrice: costPrice,
        sellingPrice: sellingPrice,
        description: `Качественный товар для медицинских и бытовых нужд`,
        isActive: true
      });

      // Связываем товар с несколькими поставщиками
      const numSuppliers = randomInt(1, 3);
      const usedSuppliers = new Set();
      
      for (let j = 0; j < numSuppliers; j++) {
        const supplierIndex = randomInt(0, suppliers.length - 1);
        if (!usedSuppliers.has(supplierIndex)) {
          usedSuppliers.add(supplierIndex);
          const supplier = suppliers[supplierIndex];
          
          await ProductSupplier.create({
            productId: product.id,
            supplierId: supplier.id,
            supplierPrice: randomPrice(Math.floor(costPrice * 0.8), Math.floor(costPrice * 1.2)),
            quantity: randomInt(0, 100),
            isAvailable: Math.random() > 0.2,
            notes: ''
          });
        }
      }

      console.log(`  ✅ ${product.name} (${product.article}) - ${numSuppliers} поставщик(ов)`);
    }

    console.log('\n✨ Готово! Создано:');
    console.log(`   📍 ${markets.length} рынков`);
    console.log(`   👥 30 поставщиков`);
    console.log(`   📦 40 товаров`);
    console.log('\n💡 Запустите сервер и обновите страницу\n');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Ошибка при заполнении данных:', error);
    console.error(error);
    process.exit(1);
  }
}

// Запускаем скрипт
seedData().then(() => {
  console.log('🎉 Скрипт успешно завершен');
  process.exit(0);
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
