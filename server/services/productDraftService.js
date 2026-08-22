const {
  PRODUCT_LIFECYCLE_STATUSES,
  generateDraftArticle,
} = require('../constants/productLifecycle');

function normalizeDraftName(name) {
  const normalized = String(name || '').trim();

  if (!normalized) {
    throw new Error('name is required');
  }

  if (normalized.length > 200) {
    throw new Error('name must not exceed 200 characters');
  }

  return normalized;
}

function normalizeMoney(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  return parsed;
}

function buildNewProductLifecycleData({ actorId, now = new Date() }) {
  return {
    lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.NEW,
    lifecycleStartedAt: now,
    lifecycleCompletedAt: null,
    assignedToUserId: null,
    designerId: null,
    reviewedByUserId: null,
    kpiWeight: null,
    createdByUserId: actorId,
  };
}

function buildProductDraftData({
  name,
  costPrice,
  comment,
  imagePath = null,
  actorId,
  now = new Date(),
  sequence,
}) {
  const normalizedName = normalizeDraftName(name);
  const normalizedCostPrice = normalizeMoney(costPrice, 'costPrice');

  return {
    name: normalizedName,
    article: generateDraftArticle(now, sequence),
    costPrice: normalizedCostPrice,
    sellingPrice: 0,
    image: imagePath,
    description: null,
    internalName: normalizedName,
    currentStock: 0,
    minStock: 0,
    ...buildNewProductLifecycleData({ actorId, now }),
    launchNotes: comment ? String(comment).trim() || null : null,
  };
}

module.exports = {
  buildNewProductLifecycleData,
  buildProductDraftData,
};
