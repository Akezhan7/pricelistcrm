function toPlain(row) {
  return row?.toJSON ? row.toJSON() : row;
}

function normalizeActor(actorId, actor) {
  return actor
    ? { id: actor.id, name: actor.name, email: actor.email }
    : { id: Number(actorId), name: 'Неизвестный пользователь', email: null };
}

/**
 * Строит отчёт активности по каждому менеджеру: разбивку действий с товарами
 * по типам (из ProductActionHistory) и количество оформленных заявок на закупку.
 */
function buildManagerActivityReport({ historyRows = [], orderCountByUser = {} }) {
  const managerMap = new Map();

  const ensureManager = (actorId, actor) => {
    if (!managerMap.has(actorId)) {
      managerMap.set(actorId, {
        manager: normalizeActor(actorId, actor),
        totalActions: 0,
        actionBreakdown: new Map(),
        ordersCreated: 0,
      });
    }
    return managerMap.get(actorId);
  };

  historyRows.forEach((row) => {
    const entry = toPlain(row);
    const actorId = Number(entry.actorId);
    if (!Number.isInteger(actorId) || actorId <= 0) return;

    const group = ensureManager(actorId, entry.actor);
    group.totalActions += 1;
    group.actionBreakdown.set(
      entry.actionType,
      (group.actionBreakdown.get(entry.actionType) || 0) + 1
    );
  });

  Object.entries(orderCountByUser).forEach(([userId, count]) => {
    const actorId = Number(userId);
    if (!Number.isInteger(actorId) || actorId <= 0 || !count) return;

    const group = ensureManager(actorId, null);
    group.ordersCreated = count;
  });

  const managers = Array.from(managerMap.values())
    .map((group) => ({
      manager: group.manager,
      totalActions: group.totalActions,
      ordersCreated: group.ordersCreated,
      actionBreakdown: Array.from(group.actionBreakdown.entries())
        .map(([actionType, count]) => ({ actionType, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) =>
      (b.totalActions + b.ordersCreated) - (a.totalActions + a.ordersCreated)
      || a.manager.name.localeCompare(b.manager.name)
    );

  return {
    summary: {
      totalActions: historyRows.length,
      totalOrders: Object.values(orderCountByUser).reduce((sum, count) => sum + count, 0),
      managerCount: managers.length,
    },
    managers,
  };
}

module.exports = {
  buildManagerActivityReport,
};
