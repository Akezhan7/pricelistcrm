/**
 * Разовый пересчёт себестоимости: у каждого товара с активным поставщиком «в наличии» и ценой
 * себестоимость становится минимальной ценой поставщиков.
 *
 * По умолчанию только показывает, что изменится. Запись — с флагом --apply.
 * Автором записей в истории цен указывается пользователь из --actor=<id>.
 *
 *   node scripts/syncProductCostPrices.js
 *   node scripts/syncProductCostPrices.js --apply --actor=1
 */
const { Product, ProductSupplier, Supplier, User, sequelize } = require('../models');
const { pickMinimumSupplierPrice, syncProductCostPrices } = require('../services/supplierPriceService');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const actorArg = args.find((arg) => arg.startsWith('--actor='));
const actorId = actorArg ? Number(actorArg.split('=')[1]) : null;

async function run() {
  if (apply && !(actorId > 0)) {
    throw new Error('Для --apply укажите автора изменений: --actor=<id пользователя>');
  }
  if (apply && !(await User.findByPk(actorId))) {
    throw new Error(`Пользователь ${actorId} не найден`);
  }

  const products = await Product.findAll({
    where: { isActive: true },
    attributes: ['id', 'article', 'name', 'costPrice'],
    include: [{
      model: ProductSupplier,
      as: 'productSuppliers',
      attributes: ['supplierPrice', 'isAvailable'],
      include: [{ model: Supplier, as: 'supplier', attributes: ['isActive'] }],
    }],
  });

  const changes = [];
  for (const product of products) {
    const minimum = pickMinimumSupplierPrice(product.productSuppliers);
    if (minimum !== null && minimum !== Number(product.costPrice)) {
      changes.push({ id: product.id, article: product.article, from: Number(product.costPrice), to: minimum });
    }
  }

  console.log(`Товаров к изменению: ${changes.length} из ${products.length}`);
  console.table(changes.slice(0, 50));
  if (changes.length > 50) console.log(`... и ещё ${changes.length - 50}`);

  if (!apply) {
    console.log('Это просмотр. Для записи запустите с --apply --actor=<id>.');
    return;
  }

  await sequelize.transaction(async (transaction) => {
    await syncProductCostPrices({ productIds: changes.map((change) => change.id), actorId, transaction });
  });
  console.log('Себестоимость обновлена.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
