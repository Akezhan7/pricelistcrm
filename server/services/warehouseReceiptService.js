function requestError(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function paymentStatus(totalAmount, paidAmount) {
  if (paidAmount <= 0) return 'Не оплачено';
  if (paidAmount >= totalAmount) return 'Оплачено';
  return 'Частично оплачено';
}

function buildWarehouseReceiptPlan({ order, items } = {}) {
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const receivedItems = Array.isArray(items) ? items : [];
  if (orderItems.length === 0 || receivedItems.length !== orderItems.length) {
    throw requestError(400, 'Receipt must contain every order item');
  }

  const orderItemsById = new Map(
    orderItems.map((item) => [Number(item.id), item])
  );
  const seenOrderItemIds = new Set();
  const receiptItems = [];
  const orderItemUpdates = [];
  let totalAmount = 0;
  let hasDiscrepancy = false;

  for (const input of receivedItems) {
    const orderItemId = Number(input.orderItemId);
    if (seenOrderItemIds.has(orderItemId)) {
      throw requestError(400, 'Receipt contains duplicate order item');
    }
    seenOrderItemIds.add(orderItemId);

    const orderItem = orderItemsById.get(orderItemId);
    if (!orderItem || Number(input.productId) !== Number(orderItem.productId)) {
      throw requestError(400, 'Receipt item does not belong to the order');
    }

    const expectedQuantity = Number(orderItem.quantity);
    const receivedQuantity = Number(input.receivedQuantity);
    const priceAtPurchase = Number(orderItem.priceAtPurchase);
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 0) {
      throw requestError(400, 'Received quantity must be a non-negative integer');
    }
    if (!Number.isInteger(expectedQuantity) || expectedQuantity < 0
      || !Number.isFinite(priceAtPurchase) || priceAtPurchase < 0) {
      throw requestError(409, 'Order item data is invalid');
    }

    const discrepancy = expectedQuantity - receivedQuantity;
    const lineTotal = receivedQuantity * priceAtPurchase;
    if (discrepancy !== 0) hasDiscrepancy = true;
    totalAmount += lineTotal;

    receiptItems.push({
      orderItemId,
      productId: Number(orderItem.productId),
      expectedQuantity,
      receivedQuantity,
      discrepancy,
      notes: typeof input.notes === 'string' ? input.notes.trim() : '',
    });
    orderItemUpdates.push({
      id: orderItemId,
      orderedQuantity: expectedQuantity,
      quantity: receivedQuantity,
      totalPrice: lineTotal.toFixed(2),
    });
  }

  const paidAmount = Number(order.paidAmount || 0);
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw requestError(409, 'Order paid amount is invalid');
  }
  if (paidAmount > totalAmount) {
    throw requestError(
      409,
      'Actual order total is lower than the amount already paid',
      'ORDER_RECEIPT_OVERPAYMENT'
    );
  }

  return {
    hasDiscrepancy,
    totalAmount,
    paymentStatus: paymentStatus(totalAmount, paidAmount),
    receiptItems,
    orderItemUpdates,
  };
}

module.exports = { buildWarehouseReceiptPlan };
