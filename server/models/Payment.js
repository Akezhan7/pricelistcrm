const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID поставщика',
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
    comment: 'Сумма платежа',
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Дата платежа',
  },
  paymentMethod: {
    type: DataTypes.ENUM('Наличные', 'Перевод', 'Карта', 'Другое'),
    allowNull: false,
    defaultValue: 'Наличные',
    comment: 'Способ оплаты',
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Комментарий к платежу',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID пользователя, который зарегистрировал платеж',
  },
  relatedOrderIds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Массив ID заявок, которые были оплачены этим платежом',
  },
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      fields: ['supplier_id'],
      name: 'payments_supplier_id_idx',
    },
    {
      fields: ['payment_date'],
      name: 'payments_payment_date_idx',
    },
    {
      fields: ['created_by'],
      name: 'payments_created_by_idx',
    },
    {
      fields: ['payment_method'],
      name: 'payments_payment_method_idx',
    },
    {
      fields: ['supplier_id', 'payment_date'],
      name: 'payments_supplier_date_idx',
    },
  ],
});

module.exports = Payment;
