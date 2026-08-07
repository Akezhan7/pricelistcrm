const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Уникальный номер заявки (например, ORD-260521-003)',
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID поставщика',
  },
  expectedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Ожидаемая дата поставки',
  },
  deliveryLocation: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: 'Точка Байсад',
    comment: 'Место доставки',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Общая сумма заявки',
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
    comment: 'Оплаченная сумма',
  },
  status: {
    type: DataTypes.ENUM(
      'Создана',
      'Отправлена поставщику',
      'Частично подтверждена',
      'Подтверждена',
      'Доставка',
      'В сборе',
      'Забрана',
      'Принята на складе',
      'Закрыта',
      'Отменена'
    ),
    allowNull: false,
    defaultValue: 'Создана',
    comment: 'Статус выполнения заявки',
  },
  type: {
    type: DataTypes.ENUM('purchase', 'return'),
    allowNull: false,
    defaultValue: 'purchase',
    comment: 'Тип документа: purchase — заявка на поставку, return — возвратная накладная',
  },
  paymentStatus: {
    type: DataTypes.ENUM('Не оплачено', 'Частично оплачено', 'Оплачено'),
    allowNull: false,
    defaultValue: 'Не оплачено',
    comment: 'Статус оплаты',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Комментарии к заявке',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя, создавшего заявку',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Активна ли заявка (мягкое удаление)',
  },
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['order_number'],
      name: 'orders_order_number_unique',
    },
    {
      fields: ['supplier_id'],
      name: 'orders_supplier_id_idx',
    },
    {
      fields: ['status'],
      name: 'orders_status_idx',
    },
    {
      fields: ['payment_status'],
      name: 'orders_payment_status_idx',
    },
    {
      fields: ['created_by'],
      name: 'orders_created_by_idx',
    },
    {
      fields: ['is_active'],
      name: 'orders_is_active_idx',
    },
    {
      fields: ['expected_delivery_date'],
      name: 'orders_expected_delivery_date_idx',
    },
    {
      fields: ['created_at'],
      name: 'orders_created_at_idx',
    },
    {
      fields: ['type'],
      name: 'orders_type_idx',
    },
  ],
});

module.exports = Order;
