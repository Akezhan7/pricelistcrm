/**
 * Утилиты для форматирования и генерации сообщений WhatsApp
 */

/**
 * Очистка номера телефона от спецсимволов
 * @param {string} phone - Номер телефона
 * @returns {string} - Очищенный номер
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  // Удаляем все символы кроме цифр и +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // Если начинается с 8, заменяем на +7
  if (cleaned.startsWith('8')) {
    cleaned = '+7' + cleaned.substring(1);
  }
  // Если не начинается с +, добавляем +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Форматирование заявки для отправки в WhatsApp
 * @param {Object} order - Объект заявки
 * @param {string} order.orderNumber - Номер заявки
 * @param {Array} order.items - Список товаров в заявке
 * @param {number} order.totalAmount - Общая сумма
 * @param {string} order.deliveryLocation - Место доставки
 * @param {Date} order.expectedDeliveryDate - Ожидаемая дата доставки
 * @param {Object} options - Дополнительные опции
 * @returns {string} - Отформатированное сообщение
 */
function formatOrderMessage(order, options = {}) {
  const {
    includeHeader = true,
    includeFooter = true,
    useInternalNames = true,
    includeImages = false,
  } = options;

  let message = '';

  // Заголовок
  if (includeHeader) {
    message += `📋 *Заявка №${order.orderNumber}*\n\n`;
  }

  // Информация о доставке
  if (order.deliveryLocation) {
    message += `📍 Место доставки: ${order.deliveryLocation}\n`;
  }

  if (order.expectedDeliveryDate) {
    const date = new Date(order.expectedDeliveryDate);
    message += `📅 Ожидаемая дата: ${formatDate(date)}\n`;
  }

  message += '\n';

  // Список товаров
  message += '*Список товаров:*\n\n';

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      const productName = useInternalNames
        ? (item.product?.internalName || item.product?.name || 'Товар')
        : (item.product?.kaspiName || item.product?.name || 'Товар');

      message += `${index + 1}. *${productName}*\n`;
      message += `   Количество: ${item.quantity} шт\n`;

      if (item.unitPrice) {
        message += `   Цена: ${formatCurrency(item.unitPrice)}\n`;
        message += `   Сумма: ${formatCurrency(item.totalPrice)}\n`;
      }

      // Добавляем ссылку на изображение, если опция включена
      if (includeImages && item.product?.image) {
        const imageUrl = item.product.image.startsWith('http')
          ? item.product.image
          : `${process.env.API_URL || 'http://localhost:5000'}${item.product.image}`;
        message += `   🖼️ ${imageUrl}\n`;
      }

      message += '\n';
    });
  }

  // Итоговая сумма
  if (order.totalAmount) {
    message += `💰 *Итого: ${formatCurrency(order.totalAmount)}*\n`;
  }

  // Футер
  if (includeFooter) {
    message += '\n';
    message += '✅ Пожалуйста, подтвердите наличие и сроки.\n';
    message += 'Спасибо!';
  }

  return message;
}

/**
 * Генерация WhatsApp deep link
 * @param {string} phone - Номер телефона
 * @param {string} message - Текст сообщения
 * @returns {string} - WhatsApp deep link
 */
function generateWhatsAppLink(phone, message) {
  const cleanedPhone = cleanPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
}

/**
 * Форматирование сообщения для отправки фото товара поставщику
 * @param {Object} product - Объект товара
 * @param {string} supplierName - Имя поставщика
 * @param {Object} options - Дополнительные опции
 * @returns {string} - Отформатированное сообщение
 */
function formatProductImageMessage(product, supplierName, options = {}) {
  const { additionalInfo = '' } = options;

  const productName = product.internalName || product.name || 'Товар';
  const imageUrl = product.image?.startsWith('http')
    ? product.image
    : `${process.env.API_URL || 'http://localhost:5000'}${product.image}`;

  let message = `Здравствуйте, ${supplierName}!\n\n`;
  message += `Интересует товар: *${productName}*\n`;

  if (product.article) {
    message += `Артикул: ${product.article}\n`;
  }

  if (additionalInfo) {
    message += `\n${additionalInfo}\n`;
  }

  message += `\n🖼️ Фото: ${imageUrl}\n`;
  message += '\nЕсть в наличии? Какая цена и сроки?';

  return message;
}

/**
 * Форматирование даты в читабельный формат
 * @param {Date} date - Дата
 * @returns {string} - Отформатированная дата
 */
function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Форматирование суммы в валюту
 * @param {number} amount - Сумма
 * @param {string} currency - Валюта (по умолчанию ₸)
 * @returns {string} - Отформатированная сумма
 */
function formatCurrency(amount, currency = '₸') {
  if (!amount && amount !== 0) return '';

  const formatted = new Intl.NumberFormat('ru-KZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${currency}`;
}

/**
 * Генерация короткого сообщения для быстрой связи с поставщиком
 * @param {Object} supplier - Объект поставщика
 * @param {string} message - Текст сообщения
 * @returns {string} - WhatsApp deep link
 */
function quickWhatsAppLink(supplier, message = 'Здравствуйте!') {
  if (!supplier || !supplier.whatsapp) {
    throw new Error('У поставщика не указан WhatsApp');
  }

  return generateWhatsAppLink(supplier.whatsapp, message);
}

/**
 * Форматирование подтверждения заявки от поставщика
 * @param {Object} orderConfirmation - Объект подтверждения
 * @returns {string} - Отформатированное сообщение
 */
function formatOrderConfirmation(orderConfirmation) {
  let message = `✅ *Подтверждение заявки №${orderConfirmation.order?.orderNumber || 'N/A'}*\n\n`;

  if (orderConfirmation.items && orderConfirmation.items.length > 0) {
    message += '*Подтверждённые позиции:*\n\n';

    orderConfirmation.items.forEach((item, index) => {
      const productName = item.product?.internalName || item.product?.name || 'Товар';
      const status = item.isAvailable ? '✅' : '❌';

      message += `${index + 1}. ${status} *${productName}*\n`;
      message += `   Запрошено: ${item.requestedQuantity} шт\n`;
      message += `   Подтверждено: ${item.confirmedQuantity} шт\n`;

      if (item.supplierComment) {
        message += `   💬 ${item.supplierComment}\n`;
      }

      message += '\n';
    });
  }

  return message;
}

module.exports = {
  cleanPhoneNumber,
  formatOrderMessage,
  generateWhatsAppLink,
  formatProductImageMessage,
  formatDate,
  formatCurrency,
  quickWhatsAppLink,
  formatOrderConfirmation,
};
