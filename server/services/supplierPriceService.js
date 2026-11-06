const COST_SYNC_REASON = 'Минимальная цена поставщиков';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSupplierPrice(price) {
  const parsed = toNumber(price);
  if (parsed === null || parsed < 0) {
    throw new Error('price must be a non-negative number');
  }
  return parsed;
}

/**
 * Себестоимость = самая низкая цена среди активных поставщиков, у которых товар в наличии.
 * Нулевые и незаданные цены не учитываются.
 */
function pickMinimumSupplierPrice(links) {
  const prices = (links || [])
    .filter((link) => link.isAvailable !== false && link.supplier?.isActive !== false)
    .map((link) => toNumber(link.supplierPrice))
    .filter((price) => price !== null && price > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}

function planSupplierPriceSave({ existingLink, price }) {
  const normalized = normalizeSupplierPrice(price);
  if (!existingLink) return { action: 'create', previousPrice: null };

  const previousPrice = toNumber(existingLink.supplierPrice);
  return {
    action: previousPrice === normalized ? 'none' : 'update',
    previousPrice,
  };
}

/**
 * Записывает цену поставщика для товара: создаёт связь, если её не было, иначе обновляет цену.
 * Изменение пишется в историю товара.
 */
async function saveSupplierPrice({
  product,
  supplierId,
  price,
  actorId,
  source,
  metadata = {},
  transaction,
  now = new Date(),
}) {
  const { ProductActionHistory, ProductSupplier } = require('../models');
  const { PRODUCT_ACTION_TYPES } = require('../constants/productHistory');

  const normalized = normalizeSupplierPrice(price);
  const [link, created] = await ProductSupplier.findOrCreate({
    where: { productId: product.id, supplierId },
    defaults: {
      supplierPrice: normalized,
      quantity: 0,
      isAvailable: true,
      isPreferred: false,
    },
    transaction,
  });

  const plan = created
    ? { action: 'create', previousPrice: null }
    : planSupplierPriceSave({ existingLink: link, price: normalized });

  if (plan.action === 'update') {
    await link.update({ supplierPrice: normalized }, { transaction });
  }

  if (plan.action !== 'none') {
    await ProductActionHistory.create({
      productId: product.id,
      actorId,
      actionType: plan.action === 'create'
        ? PRODUCT_ACTION_TYPES.SUPPLIER_LINKED
        : PRODUCT_ACTION_TYPES.SUPPLIER_UPDATED,
      fromStatus: product.lifecycleStatus,
      toStatus: product.lifecycleStatus,
      message: plan.action === 'create'
        ? `Supplier linked from ${source}`
        : `Supplier price updated from ${source}`,
      metadata: {
        supplierId,
        supplierPrice: normalized,
        ...(plan.action === 'update' ? { previousSupplierPrice: plan.previousPrice } : {}),
        ...metadata,
      },
      createdAt: now,
    }, { transaction });
  }

  return plan;
}

/**
 * Пересчитывает себестоимость товаров по минимальной цене поставщиков.
 * Если подходящих поставщиков нет — себестоимость не трогаем (её можно задать вручную).
 */
async function syncProductCostPrices({
  productIds,
  actorId,
  transaction,
  orderId = null,
  reason = COST_SYNC_REASON,
  now = new Date(),
}) {
  const { PriceHistory, Product, ProductSupplier, Supplier } = require('../models');

  const ids = Array.from(new Set((productIds || []).map(Number).filter((id) => id > 0)));
  const changes = [];

  for (const productId of ids) {
    const [product, links] = await Promise.all([
      Product.findByPk(productId, { attributes: ['id', 'costPrice'], transaction }),
      ProductSupplier.findAll({
        where: { productId },
        attributes: ['supplierPrice', 'isAvailable'],
        include: [{ model: Supplier, as: 'supplier', attributes: ['isActive'] }],
        transaction,
      }),
    ]);
    if (!product) continue;

    const minimum = pickMinimumSupplierPrice(links);
    const current = toNumber(product.costPrice);
    if (minimum === null || minimum === current) continue;

    await product.update({ costPrice: minimum }, { transaction });
    await PriceHistory.create({
      productId,
      oldPrice: current ?? 0,
      newPrice: minimum,
      priceType: 'costPrice',
      changeReason: reason,
      changedBy: actorId,
      orderId,
      changedAt: now,
    }, { transaction });
    changes.push({ productId, oldPrice: current, newPrice: minimum });
  }

  return changes;
}

/**
 * Себестоимость задаётся автоматически, если у товара есть активный поставщик «в наличии» с ценой.
 */
async function isProductCostPriceLocked(productId, transaction) {
  const { ProductSupplier, Supplier } = require('../models');
  const links = await ProductSupplier.findAll({
    where: { productId },
    attributes: ['supplierPrice', 'isAvailable'],
    include: [{ model: Supplier, as: 'supplier', attributes: ['isActive'] }],
    transaction,
  });
  return pickMinimumSupplierPrice(links) !== null;
}

/**
 * Сохраняет у поставщика цены строк заявки, у которых стоит галочка «запомнить цену»,
 * и пересчитывает себестоимость затронутых товаров. Строки-вариации пропускаются.
 */
async function rememberOrderItemPrices({
  items,
  supplierId,
  actorId,
  source = 'order',
  metadata = {},
  transaction,
  now = new Date(),
}) {
  const { Product } = require('../models');

  const flagged = (items || []).filter(
    (item) => item.rememberSupplierPrice === true && !item.productVariationId
  );
  const productIds = [...new Set(flagged.map((item) => Number(item.productId)))];
  if (productIds.length === 0) return [];

  const products = await Product.findAll({
    where: { id: productIds },
    attributes: ['id', 'lifecycleStatus'],
    transaction,
  });
  const productsById = new Map(products.map((product) => [Number(product.id), product]));

  for (const item of flagged) {
    const product = productsById.get(Number(item.productId));
    if (!product) continue;
    await saveSupplierPrice({
      product,
      supplierId,
      price: item.priceAtPurchase,
      actorId,
      source,
      metadata,
      transaction,
      now,
    });
  }

  return syncProductCostPrices({
    productIds,
    actorId,
    transaction,
    orderId: metadata.orderId ?? null,
    now,
  });
}

module.exports = {
  COST_SYNC_REASON,
  isProductCostPriceLocked,
  pickMinimumSupplierPrice,
  planSupplierPriceSave,
  rememberOrderItemPrices,
  saveSupplierPrice,
  syncProductCostPrices,
};
