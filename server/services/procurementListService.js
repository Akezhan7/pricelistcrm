const PROCUREMENT_LIST_STATUSES = Object.freeze({
  OPEN: 'open',
  PROCESSED: 'processed',
  CANCELLED: 'cancelled',
});

const PROCUREMENT_LIST_ROLES = Object.freeze([
  'admin',
  'purchase_manager',
  'warehouse_operator',
  'collector',
]);

function createInputError(message) {
  const error = new Error(message);
  error.status = 400;
  error.statusCode = 400;
  return error;
}

function assertCanManageProcurementList(user) {
  if (PROCUREMENT_LIST_ROLES.includes(user?.role)) return;

  const error = new Error('Procurement list access is not permitted for this role');
  error.status = 403;
  error.statusCode = 403;
  throw error;
}

function requiredPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createInputError(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function optionalNonNegativeInteger(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createInputError(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function optionalPositiveInteger(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createInputError(fieldName + ' must be a positive integer');
  }
  return parsed;
}

function optionalNonNegativeNumber(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createInputError(fieldName + ' must be a non-negative number');
  }
  return parsed;
}

function optionalNotes(value) {
  if (value === undefined) return undefined;
  const normalized = String(value || '').trim();
  if (normalized.length > 2000) {
    throw createInputError('notes must not exceed 2000 characters');
  }
  return normalized || null;
}

function buildProcurementListItemUpdate(input = {}) {
  const update = {};

  if (Object.prototype.hasOwnProperty.call(input, 'requestedQuantity')) {
    update.requestedQuantity = requiredPositiveInteger(
      input.requestedQuantity,
      'requestedQuantity'
    );
  }
  if (Object.prototype.hasOwnProperty.call(input, 'observedStock')) {
    update.observedStock = optionalNonNegativeInteger(input.observedStock, 'observedStock');
  }
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) {
    update.notes = optionalNotes(input.notes);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'selectedSupplierId')) {
    update.selectedSupplierId = optionalPositiveInteger(
      input.selectedSupplierId,
      'selectedSupplierId'
    );

    if (
      update.selectedSupplierId === null
      || !Object.prototype.hasOwnProperty.call(input, 'purchasePrice')
    ) {
      update.purchasePrice = null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, 'purchasePrice')) {
    update.purchasePrice = optionalNonNegativeNumber(input.purchasePrice, 'purchasePrice');
  }

  if (Object.keys(update).length === 0) {
    throw createInputError('No procurement item fields to update');
  }

  return update;
}

function buildProcurementListItemData({ listId, productId, actorId, input = {} }) {
  const data = {
    procurementListId: requiredPositiveInteger(listId, 'listId'),
    productId: requiredPositiveInteger(productId, 'productId'),
    requestedQuantity: requiredPositiveInteger(input.requestedQuantity, 'requestedQuantity'),
    observedStock: optionalNonNegativeInteger(input.observedStock, 'observedStock') ?? null,
    notes: optionalNotes(input.notes) ?? null,
    addedByUserId: requiredPositiveInteger(actorId, 'actorId'),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'selectedSupplierId')) {
    data.selectedSupplierId = optionalPositiveInteger(
      input.selectedSupplierId,
      'selectedSupplierId'
    );
    data.purchasePrice = optionalNonNegativeNumber(input.purchasePrice, 'purchasePrice') ?? null;
    if (data.purchasePrice !== null && !data.selectedSupplierId) {
      throw createInputError('selectedSupplierId is required when purchasePrice is set');
    }
  }

  return data;
}

function normalizeRecommendedSupplier(supplier) {
  if (!supplier || supplier.isActive === false) return null;
  return {
    id: Number(supplier.id),
    name: supplier.name,
  };
}

function buildSupplierRecommendation({ linkedSuppliers = [], lastPurchase = null } = {}) {
  const lastSupplier = normalizeRecommendedSupplier(lastPurchase?.supplier);
  if (lastSupplier) {
    return {
      source: 'last_successful_purchase',
      supplier: lastSupplier,
      purchasePrice: optionalNonNegativeNumber(
        lastPurchase.priceAtPurchase,
        'priceAtPurchase'
      ) ?? null,
      purchasedAt: lastPurchase.purchasedAt || null,
    };
  }

  const activeLinkedSuppliers = linkedSuppliers.filter(
    (supplier) => supplier?.isActive !== false
  );
  if (activeLinkedSuppliers.length === 1) {
    const supplier = activeLinkedSuppliers[0];
    return {
      source: 'single_linked_supplier',
      supplier: normalizeRecommendedSupplier(supplier),
      purchasePrice: optionalNonNegativeNumber(
        supplier.ProductSupplier?.supplierPrice,
        'supplierPrice'
      ) ?? null,
      purchasedAt: null,
    };
  }

  return {
    source: 'none',
    supplier: null,
    purchasePrice: null,
    purchasedAt: null,
  };
}

function buildProcurementOrderGroups({ items = [], actor } = {}) {
  if (!actor?.id || !['admin', 'purchase_manager'].includes(actor.role)) {
    throw createInputError('Procurement order creation is not permitted for this role');
  }

  const candidatesBySupplier = new Map();
  const blocked = [];

  items.forEach((item) => {
    if (item.orderItemId) return;

    const itemId = requiredPositiveInteger(item.id, 'itemId');
    if (!item.selectedSupplierId) {
      blocked.push({ itemId, supplierId: null, reason: 'supplier_required' });
      return;
    }

    const supplierId = requiredPositiveInteger(item.selectedSupplierId, 'selectedSupplierId');
    const quantity = requiredPositiveInteger(item.requestedQuantity, 'requestedQuantity');
    const purchasePrice = optionalNonNegativeNumber(item.purchasePrice, 'purchasePrice');
    const candidate = {
      procurementListItemId: itemId,
      productId: requiredPositiveInteger(item.productId, 'productId'),
      quantity,
      purchasePrice,
      notes: optionalNotes(item.notes) ?? null,
    };

    if (!candidatesBySupplier.has(supplierId)) {
      candidatesBySupplier.set(supplierId, []);
    }
    candidatesBySupplier.get(supplierId).push(candidate);
  });

  const groups = [];
  candidatesBySupplier.forEach((itemsForSupplier, supplierId) => {
    const missingPriceItem = itemsForSupplier.find((item) => item.purchasePrice === null);
    if (missingPriceItem) {
      itemsForSupplier.forEach((item) => {
        blocked.push({
          itemId: item.procurementListItemId,
          supplierId,
          reason: item.purchasePrice === null
            ? 'purchase_price_required'
            : 'supplier_group_incomplete',
        });
      });
      return;
    }

    groups.push({
      supplierId,
      items: itemsForSupplier,
      totalAmount: itemsForSupplier.reduce(
        (total, item) => total + item.quantity * item.purchasePrice,
        0
      ),
    });
  });

  return { groups, blocked };
}

module.exports = {
  PROCUREMENT_LIST_ROLES,
  PROCUREMENT_LIST_STATUSES,
  assertCanManageProcurementList,
  buildProcurementListItemData,
  buildProcurementListItemUpdate,
  buildProcurementOrderGroups,
  buildSupplierRecommendation,
};
