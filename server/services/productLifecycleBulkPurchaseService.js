const {
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');

function requiredPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required and must be a positive integer`);
  }
  return parsed;
}

function requiredNonNegativeNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} is required and must be a non-negative number`);
  }
  return parsed;
}

function requiredText(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function optionalText(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function normalizeProduct(product) {
  return product?.toJSON ? product.toJSON() : product;
}

function getLinkedSupplier(product, supplierId) {
  return (product.suppliers || []).find((supplier) => Number(supplier.id) === Number(supplierId));
}

function getSupplierPrice(product, supplierId) {
  const linkedSupplier = getLinkedSupplier(product, supplierId);
  if (!linkedSupplier) return null;
  const relation = linkedSupplier.ProductSupplier || linkedSupplier.product_supplier || {};
  return relation.supplierPrice;
}

function buildBulkLifecyclePurchasePlan({
  products = [],
  actor,
  payload = {},
  orderNumber,
  now = new Date(),
}) {
  if (!actor?.id || !['admin', 'purchase_manager'].includes(actor.role)) {
    throw new Error('Bulk lifecycle purchase is not permitted for this role');
  }

  const supplierId = requiredPositiveInteger(payload.supplierId, 'supplierId');
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw new Error('items must contain at least one product');

  const normalizedOrderNumber = requiredText(orderNumber, 'orderNumber');
  const productsById = new Map(products.map((product) => {
    const normalized = normalizeProduct(product);
    return [Number(normalized.id), normalized];
  }));

  const orderItems = [];
  const purchases = [];
  const histories = [];
  let totalAmount = 0;

  items.forEach((item) => {
    const productId = requiredPositiveInteger(item.productId, 'productId');
    const product = productsById.get(productId);
    if (!product) throw new Error(`Product ${productId} was not loaded for bulk purchase`);

    if (product.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.PURCHASE) {
      throw new Error(`Product ${productId} is not ready for purchase`);
    }
    if (product.lifecyclePurchase) {
      throw new Error(`Product ${productId} is already purchased`);
    }
    if (!getLinkedSupplier(product, supplierId)) {
      throw new Error(`Product ${productId} supplier is not linked`);
    }

    const quantity = requiredPositiveInteger(item.quantity, 'quantity');
    const fallbackPrice = getSupplierPrice(product, supplierId);
    const purchasePrice = item.purchasePrice === undefined || item.purchasePrice === null || item.purchasePrice === ''
      ? requiredNonNegativeNumber(fallbackPrice, 'supplierPrice')
      : requiredNonNegativeNumber(item.purchasePrice, 'purchasePrice');
    const notes = optionalText(item.notes) || optionalText(payload.notes);
    const totalPrice = quantity * purchasePrice;
    totalAmount += totalPrice;

    orderItems.push({
      productId,
      quantity,
      priceAtPurchase: purchasePrice,
      totalPrice,
      notes,
    });
    purchases.push({
      productId,
      supplierId,
      quantity,
      purchasePrice,
      purchasedAt: now,
      purchasedBy: actor.id,
      notes,
    });
    histories.push({
      productId,
      actorId: actor.id,
      actionType: 'purchase_marked',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      message: 'Initial product purchase marked in bulk order',
      metadata: {
        supplierId,
        quantity,
        purchasePrice,
        orderNumber: normalizedOrderNumber,
        bulkPurchase: true,
      },
      createdAt: now,
    });
  });

  return {
    order: {
      orderNumber: normalizedOrderNumber,
      supplierId,
      type: 'purchase',
      expectedDeliveryDate: payload.expectedDeliveryDate || null,
      deliveryLocation: optionalText(payload.deliveryLocation) || 'Точка Байсад',
      totalAmount,
      paidAmount: 0,
      status: 'Создана',
      paymentStatus: 'Не оплачено',
      notes: optionalText(payload.notes),
      createdBy: actor.id,
      isActive: true,
    },
    orderItems,
    purchases,
    histories,
  };
}

module.exports = {
  buildBulkLifecyclePurchasePlan,
};
