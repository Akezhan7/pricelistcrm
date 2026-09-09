function inputError(message, code = 'ORDER_CORRECTION_INVALID') {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
}

function conflictError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 409;
  return error;
}

function normalizeVariationId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw inputError('Некорректная вариация товара');
  return parsed;
}

function normalizeItem(item, { allowZero = false } = {}) {
  const id = item.id === undefined || item.id === null ? null : Number(item.id);
  const productId = Number(item.productId);
  const quantity = Number(item.quantity);
  const priceAtPurchase = Number(item.priceAtPurchase);

  if (id !== null && (!Number.isInteger(id) || id <= 0)) throw inputError('Некорректная строка заявки');
  if (!Number.isInteger(productId) || productId <= 0) throw inputError('Некорректный товар');
  if (!Number.isInteger(quantity) || quantity < (allowZero ? 0 : 1)) {
    throw inputError(allowZero
      ? 'Количество существующей позиции не может быть отрицательным'
      : 'Количество нового товара должно быть больше нуля');
  }
  if (!Number.isFinite(priceAtPurchase) || priceAtPurchase < 0) {
    throw inputError('Цена закупа не может быть отрицательной');
  }

  return {
    id,
    productId,
    productVariationId: normalizeVariationId(item.productVariationId),
    quantity,
    priceAtPurchase,
    notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : null,
  };
}

function snapshotItem(item) {
  return {
    id: item.id ? Number(item.id) : null,
    productId: Number(item.productId),
    productVariationId: item.productVariationId ? Number(item.productVariationId) : null,
    quantity: Number(item.quantity),
    priceAtPurchase: Number(item.priceAtPurchase),
    totalPrice: (Number(item.quantity) * Number(item.priceAtPurchase)).toFixed(2),
    notes: item.notes || null,
  };
}

function paymentStatus(totalAmount, paidAmount) {
  if (paidAmount <= 0) return 'Не оплачено';
  if (paidAmount >= totalAmount) return 'Оплачено';
  return 'Частично оплачено';
}

function buildOrderEditPolicy({ status, receiptCount = 0, paymentCount = 0, role }) {
  const hasReceipts = Number(receiptCount) > 0;
  const hasPayments = Number(paymentCount) > 0;

  if (status === 'Отменена') {
    return {
      mode: 'blocked', canEdit: false, canDelete: false, requiresReason: false,
      canChangeSupplier: false, supplierChangeRequiresReason: false,
      reason: 'Отменённую заявку нельзя изменять', hasReceipts, hasPayments,
    };
  }

  if (hasReceipts) {
    const canEdit = role === 'admin';
    return {
      mode: canEdit ? 'correction' : 'blocked',
      canEdit,
      canDelete: false,
      canChangeSupplier: false,
      supplierChangeRequiresReason: false,
      requiresReason: canEdit,
      reason: canEdit ? null : 'Корректировать принятую заявку может только администратор',
      hasReceipts,
      hasPayments,
    };
  }

  const canEdit = ['admin', 'purchase_manager'].includes(role);
  const canChangeSupplier = canEdit && !hasPayments;
  return {
    mode: canEdit ? 'edit' : 'blocked',
    canEdit,
    canDelete: canEdit && role === 'admin' && !hasPayments,
    canChangeSupplier,
    supplierChangeRequiresReason: canChangeSupplier && status !== 'Создана',
    requiresReason: false,
    reason: canEdit ? null : 'Недостаточно прав для редактирования заявки',
    hasReceipts,
    hasPayments,
  };
}

function buildReceivedOrderCorrectionPlan({
  reason,
  paidAmount = 0,
  existingItems = [],
  incomingItems = [],
  products = [],
  allowNoItemChanges = false,
}) {
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (normalizedReason.length < 5) {
    throw inputError('Причина корректировки должна содержать минимум 5 символов');
  }
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
    throw inputError('Передайте итоговый состав заявки');
  }

  const existingById = new Map(existingItems.map((item) => [Number(item.id), item]));
  const productsById = new Map(products.map((product) => [Number(product.id), product]));
  const seenIds = new Set();
  const normalizedIncoming = incomingItems.map((item) => {
    const normalized = normalizeItem(item, { allowZero: Boolean(item.id) });
    if (normalized.id !== null) {
      if (seenIds.has(normalized.id)) throw inputError('Строка заявки передана дважды');
      seenIds.add(normalized.id);
      const existing = existingById.get(normalized.id);
      if (!existing) throw inputError(`Строка заявки ${normalized.id} не найдена`);
      const sameProduct = Number(existing.productId) === normalized.productId;
      const sameVariation = (existing.productVariationId ? Number(existing.productVariationId) : null)
        === normalized.productVariationId;
      if (!sameProduct || !sameVariation) {
        throw conflictError(
          'Принятую строку нельзя заменить другим товаром. Обнулите её количество и добавьте новый товар отдельной строкой.',
          'RECEIVED_ORDER_ITEM_REPLACEMENT'
        );
      }
    }
    if (!productsById.has(normalized.productId)) {
      throw inputError(`Товар с ID ${normalized.productId} не найден`);
    }
    return normalized;
  });

  existingItems.forEach((item) => {
    if (!seenIds.has(Number(item.id))) {
      normalizedIncoming.push({ ...normalizeItem(item, { allowZero: true }), quantity: 0 });
    }
  });

  const updates = [];
  const creates = [];
  const stockDeltaByProduct = new Map();
  let totalAmount = 0;

  normalizedIncoming.forEach((item) => {
    totalAmount += item.quantity * item.priceAtPurchase;
    if (item.id !== null) {
      const existing = existingById.get(item.id);
      const delta = item.quantity - Number(existing.quantity);
      stockDeltaByProduct.set(item.productId, (stockDeltaByProduct.get(item.productId) || 0) + delta);
      updates.push({
        id: item.id,
        data: {
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          totalPrice: (item.quantity * item.priceAtPurchase).toFixed(2),
          notes: item.notes,
        },
      });
    } else {
      stockDeltaByProduct.set(item.productId, (stockDeltaByProduct.get(item.productId) || 0) + item.quantity);
      creates.push({
        data: {
          productId: item.productId,
          productVariationId: item.productVariationId,
          orderedQuantity: 0,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          totalPrice: (item.quantity * item.priceAtPurchase).toFixed(2),
          notes: item.notes,
        },
      });
    }
  });

  const stockChanges = [];
  stockDeltaByProduct.forEach((delta, productId) => {
    if (delta === 0) return;
    const product = productsById.get(productId);
    const oldStock = Number(product.currentStock || 0);
    const newStock = oldStock + delta;
    if (newStock < 0) {
      throw conflictError(
        `Недостаточно остатка товара ID ${productId}: доступно ${oldStock}, требуется списать ${Math.abs(delta)}`,
        'ORDER_CORRECTION_INSUFFICIENT_STOCK'
      );
    }
    stockChanges.push({ productId, delta, oldStock, newStock });
  });
  stockChanges.sort((a, b) => a.productId - b.productId);

  const beforeItems = existingItems.map(snapshotItem);
  const afterItems = normalizedIncoming.map(snapshotItem);
  const changed = JSON.stringify(beforeItems) !== JSON.stringify(afterItems);
  if (!changed && !allowNoItemChanges) throw inputError('В заявке нет изменений');

  const normalizedPaidAmount = Number(paidAmount || 0);
  return {
    reason: normalizedReason,
    updates,
    creates,
    stockChanges,
    beforeItems,
    afterItems,
    totalAmount: totalAmount.toFixed(2),
    paymentStatus: paymentStatus(totalAmount, normalizedPaidAmount),
    overpaymentAmount: Math.max(0, normalizedPaidAmount - totalAmount).toFixed(2),
  };
}

module.exports = {
  buildOrderEditPolicy,
  buildReceivedOrderCorrectionPlan,
};
