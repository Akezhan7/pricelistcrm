const {
  PRODUCT_ACTION_MESSAGES,
} = require('../constants/productHistory');

const DETAILED_VALUE_MAX_LENGTH = 200;
const OPERATIONAL_HISTORY_FIELDS = new Set(['costPrice', 'sellingPrice', 'currentStock']);

function toPlain(row) {
  return row?.toJSON ? row.toJSON() : row;
}

function normalizeActor(actor) {
  const plain = toPlain(actor);
  if (!plain) return null;
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    role: plain.role,
  };
}

function normalizeRevision(revision) {
  const plain = toPlain(revision);
  if (!plain) return null;
  return {
    id: plain.id,
    comment: plain.comment,
    status: plain.status,
    resolvedAt: plain.resolvedAt || null,
    attachments: (plain.attachments || []).map((attachmentRow) => {
      const attachment = toPlain(attachmentRow);
      return {
        id: attachment.id,
        originalName: attachment.originalName,
        filePath: attachment.filePath,
        mimeType: attachment.mimeType,
      };
    }),
  };
}

function resolveActionCategory(actionType) {
  if (/content|designer/.test(actionType)) return 'content';
  if (/review|revision|approved/.test(actionType)) return 'review';
  if (/marketplace/.test(actionType)) return 'marketplace';
  if (/purchase/.test(actionType)) return 'purchase';
  if (/warehouse|stock/.test(actionType)) return 'warehouse';
  if (/sale/.test(actionType)) return 'sale';
  if (/supplier/.test(actionType)) return 'supplier';
  return 'product';
}

function normalizeActionEvent(row, revisionById = new Map()) {
  const action = toPlain(row);
  const revisionId = Number(action.metadata?.revisionRequestId) || null;
  return {
    id: `action:${action.id}`,
    source: 'action',
    productId: action.productId,
    actionType: action.actionType,
    category: resolveActionCategory(action.actionType),
    actor: normalizeActor(action.actor),
    occurredAt: action.createdAt,
    fromStatus: action.fromStatus || null,
    toStatus: action.toStatus || null,
    message: action.message || null,
    metadata: action.metadata || null,
    revision: revisionId ? normalizeRevision(revisionById.get(revisionId)) : null,
  };
}

function normalizePriceEvent(row) {
  const price = toPlain(row);
  return {
    id: `price:${price.id}`,
    source: 'price',
    productId: price.productId,
    actionType: price.priceType === 'costPrice' ? 'cost_price_changed' : 'selling_price_changed',
    category: 'price',
    actor: normalizeActor(price.changer),
    occurredAt: price.changedAt,
    fromStatus: null,
    toStatus: null,
    message: price.changeReason || null,
    metadata: {
      priceType: price.priceType,
      oldPrice: Number(price.oldPrice),
      newPrice: Number(price.newPrice),
      orderId: price.orderId || null,
    },
    revision: null,
  };
}

function normalizeStockEvent(row) {
  const stock = toPlain(row);
  return {
    id: `stock:${stock.id}`,
    source: 'stock',
    productId: stock.productId,
    actionType: 'stock_changed',
    category: 'stock',
    actor: normalizeActor(stock.user),
    occurredAt: stock.createdAt,
    fromStatus: null,
    toStatus: null,
    message: stock.reason || stock.notes || null,
    metadata: {
      oldStock: Number(stock.oldStock),
      newStock: Number(stock.newStock),
      changeAmount: Number(stock.changeAmount),
      changeType: stock.changeType,
      orderId: stock.orderId || null,
    },
    revision: null,
  };
}

function mergeProductTimeline({
  actions = [],
  prices = [],
  stocks = [],
  revisions = [],
  page = 1,
  limit = 50,
}) {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const revisionById = new Map(revisions.map((row) => {
    const revision = toPlain(row);
    return [Number(revision.id), revision];
  }));
  const allEvents = [
    ...actions.map((row) => normalizeActionEvent(row, revisionById)),
    ...prices.map(normalizePriceEvent),
    ...stocks.map(normalizeStockEvent),
  ].sort((left, right) => {
    const byTime = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    return byTime || right.id.localeCompare(left.id);
  });
  const offset = (normalizedPage - 1) * normalizedLimit;

  return {
    events: allEvents.slice(offset, offset + normalizedLimit),
    pagination: {
      total: allEvents.length,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages: Math.ceil(allEvents.length / normalizedLimit),
    },
  };
}

function compactHistoryValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const normalized = String(value);
  return normalized.length <= DETAILED_VALUE_MAX_LENGTH ? normalized : undefined;
}

function buildProductUpdateDiff({ before = {}, after = {}, fields = [] }) {
  const changedFields = [];
  const changes = {};

  for (const field of fields) {
    if (OPERATIONAL_HISTORY_FIELDS.has(field) || before[field] === after[field]) continue;
    changedFields.push(field);
    const from = compactHistoryValue(before[field]);
    const to = compactHistoryValue(after[field]);
    if (from !== undefined && to !== undefined) changes[field] = { from, to };
  }

  return { changedFields, changes };
}

function buildProductActionEntry({
  productId,
  actorId = null,
  actionType,
  fromStatus = null,
  toStatus = null,
  message,
  metadata = null,
  now = new Date(),
}) {
  return {
    productId: Number(productId),
    actorId: actorId ? Number(actorId) : null,
    actionType,
    fromStatus,
    toStatus,
    message: message || PRODUCT_ACTION_MESSAGES[actionType] || actionType,
    metadata,
    createdAt: now,
  };
}

module.exports = {
  buildProductActionEntry,
  buildProductUpdateDiff,
  mergeProductTimeline,
  normalizeActionEvent,
  normalizePriceEvent,
  normalizeStockEvent,
};
