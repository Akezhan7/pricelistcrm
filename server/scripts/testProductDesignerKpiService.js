const assert = require('assert');

const {
  buildApproveReviewKpiPlan,
  buildDesignerKpiReport,
  normalizeKpiWeight,
} = require('../services/productDesignerKpiService');

function testNormalizeKpiWeight() {
  assert.strictEqual(normalizeKpiWeight('0.5'), 0.5);
  assert.strictEqual(normalizeKpiWeight(1), 1);
  assert.strictEqual(normalizeKpiWeight('2'), 2);
  assert.strictEqual(normalizeKpiWeight('1.75'), 1.75);

  assert.throws(() => normalizeKpiWeight(''), /KPI weight is required/i);
  assert.throws(() => normalizeKpiWeight(0), /greater than zero/i);
  assert.throws(() => normalizeKpiWeight(-1), /greater than zero/i);
  assert.throws(() => normalizeKpiWeight('abc'), /valid number/i);
  assert.throws(() => normalizeKpiWeight(1000), /must not exceed/i);
}

function testBuildApproveReviewKpiPlan() {
  const now = new Date('2026-07-11T08:00:00Z');
  const actor = { id: 1, role: 'admin' };
  const product = {
    id: 101,
    designerId: 25,
  };

  const plan = buildApproveReviewKpiPlan({
    actor,
    product,
    kpiWeight: '1.5',
    now,
  });

  assert.deepStrictEqual(plan.productUpdate, { kpiWeight: 1.5 });
  assert.deepStrictEqual(plan.kpiEntry, {
    productId: 101,
    designerId: 25,
    reviewedByUserId: 1,
    weight: 1.5,
    creditedAt: now,
  });
  assert.deepStrictEqual(plan.historyMetadata, {
    kpiWeight: 1.5,
    designerId: 25,
  });
}

function testBuildApproveReviewKpiPlanRequiresDesigner() {
  assert.throws(
    () =>
      buildApproveReviewKpiPlan({
        actor: { id: 1, role: 'admin' },
        product: { id: 102, designerId: null },
        kpiWeight: 1,
      }),
    /designer is required/i
  );
}

function testBuildDesignerKpiReport() {
  const entries = [
    {
      id: 1,
      designerId: 25,
      weight: '1.50',
      creditedAt: new Date('2026-07-01T10:00:00Z'),
      designer: { id: 25, name: 'Designer A', email: 'a@example.com' },
      product: { id: 101, name: 'Product A', article: 'A-1' },
      reviewer: { id: 1, name: 'Admin' },
    },
    {
      id: 2,
      designerId: 25,
      weight: 0.5,
      creditedAt: new Date('2026-07-03T10:00:00Z'),
      designer: { id: 25, name: 'Designer A', email: 'a@example.com' },
      product: { id: 102, name: 'Product B', article: 'B-1' },
      reviewer: { id: 1, name: 'Admin' },
    },
    {
      id: 3,
      designerId: 30,
      weight: 2,
      creditedAt: new Date('2026-07-04T10:00:00Z'),
      designer: { id: 30, name: 'Designer B', email: 'b@example.com' },
      product: { id: 103, name: 'Product C', article: 'C-1' },
      reviewer: null,
    },
  ];

  const report = buildDesignerKpiReport(entries);

  assert.deepStrictEqual(report.summary, {
    totalCards: 3,
    totalWeight: 4,
    designerCount: 2,
  });
  assert.strictEqual(report.designers[0].designer.id, 25);
  assert.strictEqual(report.designers[0].totalCards, 2);
  assert.strictEqual(report.designers[0].totalWeight, 2);
  assert.strictEqual(report.designers[0].entries[0].product.article, 'B-1');
  assert.strictEqual(report.designers[1].designer.id, 30);
  assert.strictEqual(report.designers[1].totalWeight, 2);
}

testNormalizeKpiWeight();
testBuildApproveReviewKpiPlan();
testBuildApproveReviewKpiPlanRequiresDesigner();
testBuildDesignerKpiReport();

console.log('Product designer KPI service test passed');
