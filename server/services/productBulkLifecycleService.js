const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const {
  createLifecycleActionUpdate,
} = require('./productLifecycleService');

function normalizeProductIds(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('productIds must contain at least one product');
  }

  const normalized = productIds.map((id) => Number(id));
  if (normalized.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('productIds must contain positive integer ids');
  }

  return Array.from(new Set(normalized));
}

function assertActiveDesigner(designer) {
  if (!designer || designer.role !== 'designer' || designer.isActive === false) {
    throw new Error('designer must be an active designer');
  }
}

function buildDesignerAssignedHistoryEntry({
  product,
  actor,
  designer,
  update,
  now,
  bulk,
}) {
  return {
    productId: Number(product.id),
    actorId: actor?.id ? Number(actor.id) : null,
    actionType: 'designer_assigned',
    fromStatus: product.lifecycleStatus || null,
    toStatus: update.lifecycleStatus,
    message: bulk ? 'Designer assigned in bulk' : 'Designer assigned',
    metadata: {
      designerId: Number(designer.id),
      designerName: designer.name || null,
      bulk,
    },
    createdAt: now,
  };
}

function buildBulkAssignDesignerPlan({
  actor,
  designer,
  productIds,
  products,
  now = new Date(),
}) {
  const normalizedProductIds = normalizeProductIds(productIds);
  assertActiveDesigner(designer);

  if (!Array.isArray(products) || products.length !== normalizedProductIds.length) {
    throw new Error('not all selected products were found');
  }

  const productsById = new Map(products.map((product) => [Number(product.id), product]));
  const orderedProducts = normalizedProductIds.map((productId) => productsById.get(productId));

  if (orderedProducts.some((product) => !product)) {
    throw new Error('not all selected products were found');
  }

  const invalidProducts = orderedProducts.filter(
    (product) => product.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.NEW
  );
  if (invalidProducts.length > 0) {
    throw new Error('only products in "new" status can be assigned');
  }

  const updates = orderedProducts.map((product) => ({
    productId: Number(product.id),
    update: createLifecycleActionUpdate({
      action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
      actor,
      product,
      payload: { designerId: designer.id },
      now,
    }),
  }));

  const historyEntries = orderedProducts.map((product, index) =>
    buildDesignerAssignedHistoryEntry({
      product,
      actor,
      designer,
      update: updates[index].update,
      now,
      bulk: true,
    })
  );

  return {
    productIds: normalizedProductIds,
    updates,
    historyEntries,
  };
}

module.exports = {
  buildBulkAssignDesignerPlan,
  buildDesignerAssignedHistoryEntry,
};
