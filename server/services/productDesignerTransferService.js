const {
  DESIGNER_TRANSFERABLE_STATUSES,
  PRODUCT_LIFECYCLE_STATUSES,
} = require('../constants/productLifecycle');
const { PRODUCT_ACTION_TYPES } = require('../constants/productHistory');
const {
  assertActiveDesigner,
  normalizeProductIds,
} = require('./productBulkLifecycleService');

const MAX_COMMENT_LENGTH = 1000;

function normalizeComment(value) {
  if (value === undefined || value === null) return null;

  const comment = String(value).trim();
  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`comment must not exceed ${MAX_COMMENT_LENGTH} characters`);
  }

  return comment || null;
}

function assertActorCanTransfer(actor, product) {
  const isAdmin = actor?.role === 'admin';
  const isOwner = actor?.role === 'designer'
    && Number(product.designerId) === Number(actor.id);

  if (!isAdmin && !isOwner) {
    throw new Error('Designer transfer is not permitted for this user');
  }
}

/**
 * Передача карточек между дизайнерами. Статус этапа не меняется — меняется
 * только ответственный дизайнер. KPI начисляется тому, кто на момент
 * одобрения числится дизайнером (designerId), поэтому здесь его не трогаем.
 */
function buildDesignerTransferPlan({
  actor,
  designer,
  productIds,
  products,
  designerNames = {},
  comment,
  now = new Date(),
}) {
  const normalizedProductIds = normalizeProductIds(productIds);
  assertActiveDesigner(designer);
  const normalizedComment = normalizeComment(comment);

  if (!Array.isArray(products) || products.length !== normalizedProductIds.length) {
    throw new Error('not all selected products were found');
  }

  const productsById = new Map(products.map((product) => [Number(product.id), product]));
  const orderedProducts = normalizedProductIds.map((productId) => productsById.get(productId));

  if (orderedProducts.some((product) => !product)) {
    throw new Error('not all selected products were found');
  }

  orderedProducts.forEach((product) => {
    if (product.isActive === false) {
      throw new Error('only active products can be transferred');
    }

    assertActorCanTransfer(actor, product);

    if (
      !product.designerId
      || !DESIGNER_TRANSFERABLE_STATUSES.includes(product.lifecycleStatus)
    ) {
      throw new Error('only products at designer stages can be transferred');
    }

    if (Number(product.designerId) === Number(designer.id)) {
      throw new Error('product is already assigned to this designer');
    }
  });

  const bulk = orderedProducts.length > 1;

  return {
    productIds: normalizedProductIds,
    updates: orderedProducts.map((product) => ({
      productId: Number(product.id),
      update: {
        designerId: Number(designer.id),
        assignedToUserId: Number(designer.id),
      },
    })),
    openRevisionProductIds: orderedProducts
      .filter((product) => product.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.REVISION)
      .map((product) => Number(product.id)),
    historyEntries: orderedProducts.map((product) => ({
      productId: Number(product.id),
      actorId: Number(actor.id),
      actionType: PRODUCT_ACTION_TYPES.DESIGNER_TRANSFERRED,
      fromStatus: product.lifecycleStatus,
      toStatus: product.lifecycleStatus,
      message: bulk ? 'Designer transferred in bulk' : 'Designer transferred',
      metadata: {
        fromDesignerId: Number(product.designerId),
        fromDesignerName: designerNames[Number(product.designerId)] || null,
        toDesignerId: Number(designer.id),
        toDesignerName: designer.name || null,
        comment: normalizedComment,
        bulk,
      },
      createdAt: now,
    })),
  };
}

module.exports = {
  buildDesignerTransferPlan,
};
