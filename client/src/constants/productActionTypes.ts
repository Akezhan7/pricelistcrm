export const PRODUCT_ACTION_TYPE_LABELS: Record<string, string> = {
  product_created: 'Создал товар',
  product_updated: 'Обновил карточку',
  product_archived: 'Архивировал товар',
  designer_assigned: 'Назначил дизайнера',
  designer_transferred: 'Передал карточку другому дизайнеру',
  content_uploaded: 'Загрузил материалы',
  content_asset_deleted: 'Удалил материал',
  content_created: 'Отметил карточку готовой',
  submitted_for_review: 'Отправил на проверку',
  revision_requested: 'Отправил на доработку',
  revision_resubmitted: 'Пересдал после доработки',
  approved: 'Одобрил карточку',
  kpi_weight_updated: 'Изменил вес KPI',
  lifecycle_started: 'Запустил в работу',
  marketplace_updated: 'Обновил данные маркетплейса',
  marketplace_placement_ready: 'Разместил на маркетплейсе',
  supplier_linked: 'Привязал поставщика',
  supplier_updated: 'Обновил поставщика товара',
  supplier_unlinked: 'Отвязал поставщика',
  purchase_marked: 'Отметил закупку',
  warehouse_arrival_marked: 'Отметил поступление на склад',
  warehouse_completed: 'Завершил приёмку на складе',
  warehouse_location_updated: 'Обновил место на складе',
  stock_updated: 'Изменил остаток',
  sale_launch_completed: 'Запустил продажи',
  sale_flags_updated: 'Изменил параметры продаж',
};

export function getProductActionTypeLabel(actionType: string): string {
  return PRODUCT_ACTION_TYPE_LABELS[actionType] || actionType;
}
