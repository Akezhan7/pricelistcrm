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
    message += `*Заявка №${order.orderNumber}*\n\n`;
  }

  // Информация о доставке
  if (order.deliveryLocation) {
    message += `Место доставки: ${order.deliveryLocation}\n`;
  }

  if (order.expectedDeliveryDate) {
    const date = new Date(order.expectedDeliveryDate);
    message += `Ожидаемая дата: ${formatDate(date)}\n`;
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
        message += `   Фото: ${imageUrl}\n`;
      }

      message += '\n';
    });
  }

  // Итоговая сумма
  if (order.totalAmount) {
    message += `*Итого: ${formatCurrency(order.totalAmount)}*\n`;
  }

  // Футер
  if (includeFooter) {
    message += '\n';
    message += 'Пожалуйста, подтвердите наличие и сроки.\n';
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

  message += `\nФото: ${imageUrl}\n`;
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

/**
 * Форматирование списка закупа для отправки поставщику
 * @param {Array} products - Массив товаров для закупки
 * @param {Object} supplier - Объект поставщика
 * @param {Object} options - Дополнительные опции
 * @returns {string} - Отформатированное сообщение
 */
function formatPurchaseListMessage(products, supplier, options = {}) {
  const { includeStockInfo = true, includePrices = true } = options;

  let message = `Здравствуйте, ${supplier?.name || 'Уважаемый партнёр'}!\n\n`;
  message += `📋 *Заявка на закупку*\n\n`;

  if (products && products.length > 0) {
    message += '*Необходимые товары:*\n\n';

    products.forEach((product, index) => {
      const productName = product.internalName || product.name || 'Товар';
      message += `${index + 1}. *${productName}*\n`;
      
      if (product.article) {
        message += `   Артикул: ${product.article}\n`;
      }

      message += `   Количество: ${product.recommendedQuantity || product.quantity} шт\n`;

      if (includeStockInfo) {
        message += `   Текущий остаток: ${product.currentStock || 0} шт\n`;
        if (product.stockStatus) {
          message += `   Статус: ${product.stockStatus.recommendation}\n`;
        }
      }

      if (includePrices && product.selectedSupplier?.supplierPrice) {
        const price = product.selectedSupplier.supplierPrice;
        const totalCost = price * (product.recommendedQuantity || product.quantity);
        message += `   Цена: ${formatCurrency(price)}\n`;
        message += `   Сумма: ${formatCurrency(totalCost)}\n`;
      }

      message += '\n';
    });

    // Подсчитываем итоговую стоимость
    if (includePrices) {
      let totalCost = 0;
      products.forEach(product => {
        if (product.selectedSupplier?.supplierPrice) {
          totalCost += product.selectedSupplier.supplierPrice * (product.recommendedQuantity || product.quantity);
        }
      });

      if (totalCost > 0) {
        message += `💰 *Примерная сумма: ${formatCurrency(totalCost)}*\n\n`;
      }
    }
  }

  message += '✅ Пожалуйста, подтвердите наличие товаров, актуальность цен и сроки поставки.\n';
  message += 'Спасибо!';

  return message;
}

/**
 * Форматирование сообщения с аналитикой остатков для отправки менеджеру
 * @param {Object} analytics - Объект с аналитикой остатков
 * @param {Object} options - Дополнительные опции
 * @returns {string} - Отформатированное сообщение
 */
function formatStockAnalyticsMessage(analytics, options = {}) {
  const { includeDetails = true } = options;

  let message = `📊 *Аналитика остатков товаров*\n\n`;

  if (analytics.summary) {
    message += `*Общая статистика:*\n`;
    message += `📦 Всего товаров: ${analytics.summary.totalProducts || 0}\n`;
    message += `✅ В наличии: ${analytics.summary.good || 0}\n`;
    message += `🟠 Средний остаток: ${analytics.summary.medium || 0}\n`;
    message += `🟡 Низкий остаток: ${analytics.summary.low || 0}\n`;
    message += `🔴 Критический: ${analytics.summary.critical || 0}\n\n`;
  }

  if (includeDetails && analytics.criticalProducts && analytics.criticalProducts.length > 0) {
    message += `⚠️ *Критические товары (требуют СРОЧНОЙ закупки):*\n\n`;
    
    analytics.criticalProducts.slice(0, 10).forEach((product, index) => {
      const productName = product.internalName || product.name || 'Товар';
      message += `${index + 1}. ${productName}\n`;
      message += `   Остаток: ${product.currentStock} / ${product.minStock} шт\n`;
      
      if (product.stockStatus) {
        message += `   ${product.stockStatus.recommendation}\n`;
      }
      
      message += '\n';
    });

    if (analytics.criticalProducts.length > 10) {
      message += `...и ещё ${analytics.criticalProducts.length - 10} товаров\n\n`;
    }
  }

  message += `Дата отчёта: ${formatDate(new Date())}\n`;

  return message;
}

/**
 * Генерация ссылки для быстрой отправки списка закупа в WhatsApp
 * @param {Array} products - Массив товаров
 * @param {Object} supplier - Объект поставщика
 * @param {Object} options - Дополнительные опции
 * @returns {string} - WhatsApp deep link
 */
function generatePurchaseListWhatsAppLink(products, supplier, options = {}) {
  if (!supplier || !supplier.whatsapp) {
    throw new Error('У поставщика не указан WhatsApp');
  }

  const message = formatPurchaseListMessage(products, supplier, options);
  return generateWhatsAppLink(supplier.whatsapp, message);
}

/**
 * Форматирование сводки по остаткам для группы товаров
 * @param {Array} products - Массив товаров с остатками
 * @returns {string} - Краткая сводка
 */
function formatStockSummary(products) {
  if (!products || products.length === 0) {
    return 'Нет данных о товарах';
  }

  const critical = products.filter(p => p.currentStock === 0).length;
  const low = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length;
  const medium = products.filter(p => p.currentStock > p.minStock && p.currentStock <= p.minStock * 2).length;
  const good = products.filter(p => p.currentStock > p.minStock * 2).length;

  let summary = `📦 Товаров: ${products.length}\n`;
  
  if (critical > 0) {
    summary += `🔴 Критичных: ${critical}\n`;
  }
  if (low > 0) {
    summary += `🟡 Низких: ${low}\n`;
  }
  if (medium > 0) {
    summary += `🟠 Средних: ${medium}\n`;
  }
  if (good > 0) {
    summary += `✅ Хороших: ${good}\n`;
  }

  return summary;
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
  formatPurchaseListMessage,
  formatStockAnalyticsMessage,
  generatePurchaseListWhatsAppLink,
  formatStockSummary,
};
