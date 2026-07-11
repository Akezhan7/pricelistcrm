const assert = require('assert');

const {
  buildProductActionEntry,
  buildProductUpdateDiff,
  mergeProductTimeline,
} = require('../services/productHistoryService');

function testMergesSourcesNewestFirstAndEnrichesRevision() {
  const result = mergeProductTimeline({
    actions: [
      {
        id: 1,
        productId: 10,
        actionType: 'revision_requested',
        fromStatus: 'review',
        toStatus: 'revision',
        message: 'Revision requested',
        metadata: { revisionRequestId: 7, comment: 'Исправить фото' },
        createdAt: '2026-07-11T09:00:00.000Z',
        actor: { id: 2, name: 'Руководитель' },
      },
    ],
    prices: [
      {
        id: 2,
        productId: 10,
        priceType: 'costPrice',
        oldPrice: '1000.00',
        newPrice: '1100.00',
        changeReason: 'Уточнение',
        changedAt: '2026-07-11T10:00:00.000Z',
        changer: { id: 3, name: 'Учетчик' },
      },
    ],
    stocks: [
      {
        id: 3,
        productId: 10,
        oldStock: 0,
        newStock: 5,
        changeAmount: 5,
        changeType: 'receipt',
        reason: 'Приход',
        createdAt: '2026-07-11T11:00:00.000Z',
        user: { id: 4, name: 'Склад' },
      },
    ],
    revisions: [
      {
        id: 7,
        comment: 'Исправить фото',
        status: 'open',
        resolvedAt: null,
        attachments: [
          { id: 8, originalName: 'reference.png', filePath: '/uploads/reference.png' },
        ],
      },
    ],
    page: 1,
    limit: 2,
  });

  assert.strictEqual(result.pagination.total, 3);
  assert.strictEqual(result.pagination.totalPages, 2);
  assert.deepStrictEqual(result.events.map((event) => event.id), ['stock:3', 'price:2']);

  const revisionPage = mergeProductTimeline({
    actions: [
      {
        id: 1,
        productId: 10,
        actionType: 'revision_requested',
        fromStatus: 'review',
        toStatus: 'revision',
        message: 'Revision requested',
        metadata: { revisionRequestId: 7, comment: 'Исправить фото' },
        createdAt: '2026-07-11T09:00:00.000Z',
        actor: { id: 2, name: 'Руководитель' },
      },
    ],
    prices: [
      { id: 2, productId: 10, priceType: 'costPrice', oldPrice: 1000, newPrice: 1100, changedAt: '2026-07-11T10:00:00.000Z' },
    ],
    stocks: [
      { id: 3, productId: 10, oldStock: 0, newStock: 5, changeAmount: 5, changeType: 'receipt', createdAt: '2026-07-11T11:00:00.000Z' },
    ],
    revisions: [
      {
        id: 7,
        comment: 'Исправить фото',
        status: 'open',
        attachments: [
          { id: 8, originalName: 'reference.png', filePath: '/uploads/reference.png' },
        ],
      },
    ],
    page: 2,
    limit: 2,
  });

  assert.strictEqual(revisionPage.events[0].revision.status, 'open');
  assert.strictEqual(revisionPage.events[0].revision.attachments[0].originalName, 'reference.png');
}

function testBuildsCompactImmutableActionEntries() {
  const diff = buildProductUpdateDiff({
    before: { name: 'Старое', description: 'A'.repeat(300), costPrice: 1000 },
    after: { name: 'Новое', description: 'B'.repeat(300), costPrice: 1100 },
    fields: ['name', 'description', 'costPrice'],
  });

  assert.deepStrictEqual(diff.changedFields, ['name', 'description']);
  assert.deepStrictEqual(diff.changes.name, { from: 'Старое', to: 'Новое' });
  assert.strictEqual(diff.changes.description, undefined);

  const entry = buildProductActionEntry({
    productId: 10,
    actorId: 2,
    actionType: 'product_updated',
    fromStatus: 'in_sale',
    toStatus: 'in_sale',
    metadata: diff,
    now: new Date('2026-07-11T12:00:00.000Z'),
  });

  assert.strictEqual(entry.message, 'Product card updated');
  assert.strictEqual(entry.createdAt.toISOString(), '2026-07-11T12:00:00.000Z');
  assert.deepStrictEqual(entry.metadata.changedFields, ['name', 'description']);
}

testMergesSourcesNewestFirstAndEnrichesRevision();
testBuildsCompactImmutableActionEntries();

console.log('Product history service test passed');
