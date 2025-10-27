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
    comment: 'Уникальный номер заявки (например, ORD-2025-0001)',
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
    type: DataTypes.ENUM('В работе', 'На точке', 'В пути', 'На складе'),
    allowNull: false,
    defaultValue: 'В работе',
    comment: 'Статус выполнения заявки',
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
  ],
});

module.exports = Order;
