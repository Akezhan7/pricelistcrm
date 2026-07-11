const { Op } = require('sequelize');
const { Order } = require('../models');

const ORDER_NUMBER_TIMEZONE = process.env.ORDER_NUMBER_TIMEZONE || 'Asia/Almaty';

function getOrderDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ORDER_NUMBER_TIMEZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '00';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}${month}${day}`;
}

async function buildNextOrderNumberCandidate(date = new Date()) {
  const prefix = `ORD-${getOrderDateKey(date)}-`;
  const lastOrder = await Order.findOne({
    where: { orderNumber: { [Op.like]: `${prefix}%` } },
    order: [['orderNumber', 'DESC']],
    attributes: ['orderNumber'],
  });

  let nextNumber = 1;
  if (lastOrder?.orderNumber) {
    const lastSequence = Number.parseInt(lastOrder.orderNumber.slice(prefix.length), 10);
    if (!Number.isNaN(lastSequence)) nextNumber = lastSequence + 1;
  }

  if (nextNumber > 999) {
    throw new Error('Превышен лимит номеров заявок за день (999)');
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

async function generateOrderNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await buildNextOrderNumberCandidate();
    const exists = await Order.findOne({
      where: { orderNumber: candidate },
      attributes: ['id'],
    });
    if (!exists) return candidate;
  }

  throw new Error('Не удалось сгенерировать уникальный номер заявки');
}

module.exports = { generateOrderNumber, getOrderDateKey };
