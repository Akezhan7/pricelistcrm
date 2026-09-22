const assert = require('assert');

const { buildManagerActivityReport } = require('../services/managerActivityReportService');

function testGroupsActionsPerManagerAndSortsByActivity() {
  const report = buildManagerActivityReport({
    historyRows: [
      { actorId: 1, actionType: 'product_created', actor: { id: 1, name: 'Айгерим', email: 'a@example.com' } },
      { actorId: 1, actionType: 'product_created', actor: { id: 1, name: 'Айгерим', email: 'a@example.com' } },
      { actorId: 1, actionType: 'submitted_for_review', actor: { id: 1, name: 'Айгерим', email: 'a@example.com' } },
      { actorId: 2, actionType: 'product_created', actor: { id: 2, name: 'Бота', email: 'b@example.com' } },
    ],
    orderCountByUser: { 1: 3 },
  });

  assert.deepStrictEqual(report.summary, {
    totalActions: 4,
    totalOrders: 3,
    managerCount: 2,
  });

  assert.strictEqual(report.managers.length, 2);
  const [first, second] = report.managers;

  // Айгерим активнее (3 действия + 3 заявки) — должна быть первой
  assert.strictEqual(first.manager.name, 'Айгерим');
  assert.strictEqual(first.totalActions, 3);
  assert.strictEqual(first.ordersCreated, 3);
  assert.deepStrictEqual(first.actionBreakdown, [
    { actionType: 'product_created', count: 2 },
    { actionType: 'submitted_for_review', count: 1 },
  ]);

  assert.strictEqual(second.manager.name, 'Бота');
  assert.strictEqual(second.totalActions, 1);
  assert.strictEqual(second.ordersCreated, 0);
}

function testIncludesManagersWithOnlyOrdersAndNoProductHistory() {
  const report = buildManagerActivityReport({
    historyRows: [],
    orderCountByUser: { 5: 2 },
  });

  assert.strictEqual(report.managers.length, 1);
  assert.strictEqual(report.managers[0].manager.name, 'Неизвестный пользователь');
  assert.strictEqual(report.managers[0].ordersCreated, 2);
  assert.strictEqual(report.managers[0].totalActions, 0);
}

function testReturnsEmptyReportWhenNoActivity() {
  const report = buildManagerActivityReport({ historyRows: [], orderCountByUser: {} });

  assert.deepStrictEqual(report.summary, { totalActions: 0, totalOrders: 0, managerCount: 0 });
  assert.deepStrictEqual(report.managers, []);
}

testGroupsActionsPerManagerAndSortsByActivity();
testIncludesManagersWithOnlyOrdersAndNoProductHistory();
testReturnsEmptyReportWhenNoActivity();

console.log('Manager activity report service test passed');
