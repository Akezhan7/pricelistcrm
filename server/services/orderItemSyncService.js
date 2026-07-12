function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function toNonNegativeNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
}

function toNullablePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  return toPositiveInteger(value, 'productVariationId');
}

function normalizeOrderItem({ item, orderId }) {
  const quantity = toPositiveInteger(item.quantity, 'quantity');
  const priceAtPurchase = toNonNegativeNumber(item.priceAtPurchase, 'priceAtPurchase');
  const productId = toPositiveInteger(item.productId, 'productId');
  const productVariationId = toNullablePositiveInteger(item.productVariationId);

  return {
    id: item.id ? toPositiveInteger(item.id, 'id') : null,
    data: {
      ...(orderId ? { orderId } : {}),
      productId,
      productVariationId,
      quantity,
      priceAtPurchase,
      totalPrice: (quantity * priceAtPurchase).toFixed(2),
      notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : null,
    },
  };
}

function buildLifecycleMatchKey(item) {
  return `${Number(item.productId)}:${item.productVariationId ? Number(item.productVariationId) : 'main'}`;
}

function buildOrderItemSyncPlan({
  orderId,
  existingItems = [],
  lifecyclePurchases = [],
  incomingItems = [],
}) {
  const existingById = new Map(existingItems.map((item) => [Number(item.id), item]));
  const lifecycleByOrderItemId = new Map(
    lifecyclePurchases.map((purchase) => [Number(purchase.orderItemId), purchase])
  );
  const lifecycleByProductKey = new Map();
  lifecyclePurchases.forEach((purchase) => {
    const existingItem = existingById.get(Number(purchase.orderItemId));
    if (existingItem) lifecycleByProductKey.set(buildLifecycleMatchKey(existingItem), purchase);
  });

  const updates = [];
  const creates = [];
  const lifecyclePurchaseUpdates = [];
  const touchedExistingIds = new Set();
  const usedLifecyclePurchaseIds = new Set();
  let totalAmount = 0;

  incomingItems.forEach((item) => {
    const normalized = normalizeOrderItem({ item, orderId });
    totalAmount += Number(normalized.data.totalPrice);

    let targetId = normalized.id;
    let lifecyclePurchase = targetId ? lifecycleByOrderItemId.get(targetId) : null;

    if (!targetId) {
      const matchedPurchase = lifecycleByProductKey.get(buildLifecycleMatchKey(normalized.data));
      if (matchedPurchase && !usedLifecyclePurchaseIds.has(Number(matchedPurchase.id))) {
        lifecyclePurchase = matchedPurchase;
        targetId = Number(matchedPurchase.orderItemId);
      }
    }

    if (targetId && existingById.has(Number(targetId))) {
      const existingItem = existingById.get(Number(targetId));
      const protectedPurchase = lifecyclePurchase || lifecycleByOrderItemId.get(Number(targetId));

      if (
        protectedPurchase
        && (
          Number(existingItem.productId) !== Number(normalized.data.productId)
          || (existingItem.productVariationId ? Number(existingItem.productVariationId) : null)
            !== (normalized.data.productVariationId ? Number(normalized.data.productVariationId) : null)
        )
      ) {
        throw new Error('Cannot change product for lifecycle-linked order item');
      }

      updates.push({
        id: Number(targetId),
        data: {
          productId: normalized.data.productId,
          productVariationId: normalized.data.productVariationId,
          quantity: normalized.data.quantity,
          priceAtPurchase: normalized.data.priceAtPurchase,
          totalPrice: normalized.data.totalPrice,
          notes: normalized.data.notes,
        },
      });
      touchedExistingIds.add(Number(targetId));

      if (protectedPurchase) {
        usedLifecyclePurchaseIds.add(Number(protectedPurchase.id));
        lifecyclePurchaseUpdates.push({
          id: Number(protectedPurchase.id),
          data: {
            quantity: normalized.data.quantity,
            purchasePrice: normalized.data.priceAtPurchase,
            notes: normalized.data.notes,
          },
        });
      }
      return;
    }

    creates.push(normalized.data);
  });

  const deleteIds = [];
  existingItems.forEach((item) => {
    const itemId = Number(item.id);
    if (touchedExistingIds.has(itemId)) return;
    if (lifecycleByOrderItemId.has(itemId)) {
      throw new Error('Cannot delete lifecycle-linked order item');
    }
    deleteIds.push(itemId);
  });

  return {
    updates,
    creates,
    deleteIds,
    lifecyclePurchaseUpdates,
    totalAmount: totalAmount.toFixed(2),
  };
}

module.exports = {
  buildOrderItemSyncPlan,
};
