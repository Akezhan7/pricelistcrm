const MAX_KPI_WEIGHT = 99.99;
const { PRODUCT_ACTION_TYPES } = require('../constants/productHistory');

function toPlain(row) {
  return row?.toJSON ? row.toJSON() : row;
}

function roundKpiWeight(value) {
  return Math.round(value * 100) / 100;
}

function normalizeKpiWeight(value) {
  if (value === null || value === undefined || value === '') {
    throw new Error('KPI weight is required');
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error('KPI weight must be a valid number');
  }

  if (numberValue <= 0) {
    throw new Error('KPI weight must be greater than zero');
  }

  if (numberValue > MAX_KPI_WEIGHT) {
    throw new Error(`KPI weight must not exceed ${MAX_KPI_WEIGHT}`);
  }

  return roundKpiWeight(numberValue);
}

function buildApproveReviewKpiPlan({ actor, product, kpiWeight, now = new Date() }) {
  if (!product?.designerId) {
    throw new Error('Product designer is required before KPI can be credited');
  }

  const normalizedWeight = normalizeKpiWeight(kpiWeight);

  return {
    productUpdate: {
      kpiWeight: normalizedWeight,
    },
    kpiEntry: {
      productId: product.id,
      designerId: Number(product.designerId),
      reviewedByUserId: actor.id,
      weight: normalizedWeight,
      creditedAt: now,
    },
    historyMetadata: {
      kpiWeight: normalizedWeight,
      designerId: Number(product.designerId),
    },
  };
}

function buildUpdateKpiWeightPlan({
  actor,
  product,
  kpiEntry,
  kpiWeight,
  now = new Date(),
}) {
  if (actor?.role !== 'admin' || actor?.canManageKpiWeights !== true) {
    throw new Error('KPI weight update is not permitted');
  }

  if (!product) {
    throw new Error('Product is required');
  }

  if (!kpiEntry) {
    throw new Error('KPI entry is required before weight can be updated');
  }

  const normalizedWeight = normalizeKpiWeight(kpiWeight);
  const oldWeight = normalizeKpiWeight(kpiEntry.weight);

  return {
    productUpdate: { kpiWeight: normalizedWeight },
    kpiEntryUpdate: { weight: normalizedWeight },
    historyEntry: {
      productId: Number(product.id),
      actorId: Number(actor.id),
      actionType: PRODUCT_ACTION_TYPES.KPI_WEIGHT_UPDATED,
      fromStatus: product.lifecycleStatus || null,
      toStatus: product.lifecycleStatus || null,
      message: 'Product KPI weight updated',
      metadata: {
        oldKpiWeight: oldWeight,
        newKpiWeight: normalizedWeight,
        kpiEntryId: Number(kpiEntry.id),
      },
      createdAt: now,
    },
  };
}

function normalizeEntry(row) {
  const entry = toPlain(row);
  return {
    id: entry.id,
    weight: normalizeKpiWeight(entry.weight),
    creditedAt: entry.creditedAt,
    product: entry.product
      ? {
          id: entry.product.id,
          name: entry.product.name,
          article: entry.product.article,
        }
      : null,
    reviewer: entry.reviewer
      ? {
          id: entry.reviewer.id,
          name: entry.reviewer.name,
        }
      : null,
  };
}

function normalizeDesigner(row) {
  const entry = toPlain(row);
  return entry.designer
    ? {
        id: entry.designer.id,
        name: entry.designer.name,
        email: entry.designer.email,
      }
    : {
        id: Number(entry.designerId),
        name: 'Unknown designer',
        email: null,
      };
}

function buildDesignerKpiReport(entries = []) {
  const designerMap = new Map();

  entries.forEach((row) => {
    const entry = toPlain(row);
    const designerId = Number(entry.designerId);
    if (!designerMap.has(designerId)) {
      designerMap.set(designerId, {
        designer: normalizeDesigner(entry),
        totalCards: 0,
        totalWeight: 0,
        entries: [],
      });
    }

    const group = designerMap.get(designerId);
    const normalizedEntry = normalizeEntry(entry);
    group.totalCards += 1;
    group.totalWeight = roundKpiWeight(group.totalWeight + normalizedEntry.weight);
    group.entries.push(normalizedEntry);
  });

  const designers = Array.from(designerMap.values())
    .map((designer) => ({
      ...designer,
      entries: designer.entries.sort(
        (a, b) => new Date(b.creditedAt).getTime() - new Date(a.creditedAt).getTime()
      ),
    }))
    .sort((a, b) => b.totalWeight - a.totalWeight || a.designer.name.localeCompare(b.designer.name));

  return {
    summary: {
      totalCards: entries.length,
      totalWeight: roundKpiWeight(designers.reduce((sum, row) => sum + row.totalWeight, 0)),
      designerCount: designers.length,
    },
    designers,
  };
}

module.exports = {
  buildApproveReviewKpiPlan,
  buildDesignerKpiReport,
  buildUpdateKpiWeightPlan,
  normalizeKpiWeight,
};
