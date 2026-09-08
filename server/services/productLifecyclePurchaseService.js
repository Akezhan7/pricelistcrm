const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  canPerformLifecycleAction,
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

function optionalNonNegativeNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
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

function assertLifecycleAction({ actor, product, action }) {
  if (!canPerformLifecycleAction({ user: actor, product, action })) {
    throw new Error(`Lifecycle action "${action}" is not permitted from current status`);
  }
}

function buildLifecyclePurchasePlan({ product, actor, payload = {}, orderNumber, now = new Date() }) {
  assertLifecycleAction({
    actor,
    product,
    action: PRODUCT_LIFECYCLE_ACTIONS.MARK_PURCHASED,
  });

  const supplierId = requiredPositiveInteger(payload.supplierId, 'supplierId');
  const quantity = requiredPositiveInteger(payload.quantity, 'quantity');
  const purchasePrice = requiredNonNegativeNumber(payload.purchasePrice, 'purchasePrice');
  const normalizedOrderNumber = requiredText(orderNumber, 'orderNumber');
  const notes = optionalText(payload.notes);
  const totalAmount = quantity * purchasePrice;

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
      notes,
      createdBy: actor.id,
      isActive: true,
    },
    orderItem: {
      productId: product.id,
      quantity,
      priceAtPurchase: purchasePrice,
      totalPrice: totalAmount,
      notes,
    },
    purchase: {
      productId: product.id,
      supplierId,
      quantity,
      purchasePrice,
      purchasedAt: now,
      purchasedBy: actor.id,
      notes,
    },
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'purchase_marked',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      message: 'Initial product purchase marked',
      metadata: { supplierId, quantity, purchasePrice, orderNumber: normalizedOrderNumber },
      createdAt: now,
    },
  };
}

function buildLifecycleArrivalReconciliationPlan({
  product,
  lifecyclePurchase,
  receipt,
  receiptItem,
  actor,
  now = new Date(),
}) {
  assertLifecycleAction({
    actor,
    product,
    action: PRODUCT_LIFECYCLE_ACTIONS.MARK_ARRIVED,
  });

  if (!lifecyclePurchase?.id || lifecyclePurchase.arrivedAt) {
    throw new Error('Lifecycle purchase must exist and must not be received already');
  }
  const matchesOrderItem = Number(receiptItem?.orderItemId) === Number(lifecyclePurchase.orderItemId);
  const matchesStoredReceipt = lifecyclePurchase.warehouseReceiptId
    && Number(lifecyclePurchase.warehouseReceiptId) === Number(receipt?.id);
  if (
    (!matchesOrderItem && !matchesStoredReceipt)
    || Number(receiptItem?.productId) !== Number(product.id)
  ) {
    throw new Error('Warehouse receipt item is not linked to this lifecycle purchase');
  }

  const receivedQuantity = requiredPositiveInteger(
    receiptItem.receivedQuantity,
    'receivedQuantity'
  );
  const warehouseReceiptId = requiredPositiveInteger(receipt?.id, 'warehouseReceiptId');
  const arrivedBy = requiredPositiveInteger(receipt?.receivedBy, 'receivedBy');
  const arrivedAt = receipt?.receivedAt ? new Date(receipt.receivedAt) : now;

  return {
    productUpdate: {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
      lifecycleCompletedAt: null,
      assignedToUserId: null,
    },
    purchaseUpdate: {
      receivedQuantity,
      warehouseReceiptId,
      arrivedAt,
      arrivedBy,
    },
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'warehouse_arrival_reconciled',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.PURCHASE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
      message: 'Lifecycle arrival restored from warehouse receipt',
      metadata: {
        orderId: lifecyclePurchase.orderId,
        orderItemId: lifecyclePurchase.orderItemId,
        warehouseReceiptId,
        receivedQuantity,
        stockAdjusted: false,
      },
      createdAt: now,
    },
  };
}

function buildWarehouseCompletionPlan({ product, actor, payload = {}, now = new Date() }) {
  assertLifecycleAction({
    actor,
    product,
    action: PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_WAREHOUSE,
  });

  const warehouseDetails = {
    productId: product.id,
    sector: requiredText(payload.sector, 'sector'),
    shelf: requiredText(payload.shelf, 'shelf'),
    cell: requiredText(payload.cell, 'cell'),
    weight: optionalNonNegativeNumber(payload.weight, 'weight'),
    length: optionalNonNegativeNumber(payload.length, 'length'),
    width: optionalNonNegativeNumber(payload.width, 'width'),
    height: optionalNonNegativeNumber(payload.height, 'height'),
    notes: optionalText(payload.notes),
    updatedBy: actor.id,
  };
  const oldCostPrice = Number(product.costPrice);
  const newCostPrice = payload.costPrice === undefined || payload.costPrice === ''
    ? oldCostPrice
    : requiredNonNegativeNumber(payload.costPrice, 'costPrice');
  const priceChanged = oldCostPrice !== newCostPrice;

  return {
    warehouseDetails,
    productUpdate: {
      costPrice: newCostPrice,
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: null,
      assignedToUserId: product.marketplaceManagerId || null,
    },
    priceHistory: priceChanged ? {
      productId: product.id,
      oldPrice: oldCostPrice,
      newPrice: newCostPrice,
      priceType: 'costPrice',
      changeReason: 'Уточнение себестоимости при размещении на складе',
      changedBy: actor.id,
      changedAt: now,
    } : null,
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'warehouse_completed',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.WAREHOUSE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      message: 'Warehouse passport completed',
      metadata: {
        sector: warehouseDetails.sector,
        shelf: warehouseDetails.shelf,
        cell: warehouseDetails.cell,
        costPriceChanged: priceChanged,
      },
      createdAt: now,
    },
  };
}

module.exports = {
  buildLifecycleArrivalReconciliationPlan,
  buildLifecyclePurchasePlan,
  buildWarehouseCompletionPlan,
};
