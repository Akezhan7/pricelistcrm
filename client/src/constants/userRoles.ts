export const USER_ROLE_VALUES = [
  'admin',
  'operator',
  'accountant',
  'purchase_manager',
  'warehouse_operator',
  'driver',
  'collector',
  'designer',
  'marketplace_manager',
] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  operator: 'Оператор',
  accountant: 'Бухгалтер',
  purchase_manager: 'Менеджер по закупкам',
  warehouse_operator: 'Оператор склада',
  driver: 'Водитель',
  collector: 'Сборщик',
  designer: 'Дизайнер',
  marketplace_manager: 'Менеджер маркетплейсов',
};
