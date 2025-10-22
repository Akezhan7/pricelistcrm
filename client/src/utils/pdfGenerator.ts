import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Order } from '../types';

// Форматирование даты
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'Не указана';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Некорректная дата';
  }
};

// Форматирование числа
const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return '0.00';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Получение статуса на русском
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'В работе': 'В работе',
    'На точке': 'На точке',
    'В пути': 'В пути',
    'На складе': 'На складе'
  };
  return statusMap[status] || status;
};

// Создание HTML для рендеринга
const createOrderHTML = (order: Order): HTMLElement => {
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.padding = '20mm';
  container.style.backgroundColor = '#fff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.color = '#000';

  const html = `
    <div style="margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
      <h1 style="text-align: center; font-size: 22px; margin: 0 0 10px 0; color: #333;">
        ЗАЯВКА НА ПОСТАВКУ ТОВАРА
      </h1>
      <p style="text-align: center; font-size: 14px; margin: 0; color: #666;">
        № ${order.orderNumber} от ${formatDate(order.createdAt)}
      </p>
    </div>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; width: 40%; font-weight: bold; color: #555;">Номер заявки:</td>
          <td style="padding: 5px 0; color: #000;">${order.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Дата создания:</td>
          <td style="padding: 5px 0; color: #000;">${formatDate(order.createdAt)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Поставщик:</td>
          <td style="padding: 5px 0; color: #000;">${order.supplier?.name || 'Не указан'}</td>
        </tr>
        ${order.supplier?.phone ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Телефон:</td>
          <td style="padding: 5px 0; color: #000;">${order.supplier.phone}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Статус:</td>
          <td style="padding: 5px 0; color: #000;">${getStatusText(order.status)}</td>
        </tr>
        ${order.expectedDeliveryDate ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Ожидаемая поставка:</td>
          <td style="padding: 5px 0; color: #000;">${formatDate(order.expectedDeliveryDate)}</td>
        </tr>
        ` : ''}
        ${order.deliveryLocation ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Место доставки:</td>
          <td style="padding: 5px 0; color: #000;">${order.deliveryLocation}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <h3 style="margin: 20px 0 10px 0; color: #333;">Товары:</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #2c3e50; color: #fff;">
          <th style="padding: 10px; text-align: left; width: 5%;">№</th>
          <th style="padding: 10px; text-align: left; width: 15%;">Артикул</th>
          <th style="padding: 10px; text-align: left; width: 35%;">Название</th>
          <th style="padding: 10px; text-align: right; width: 15%;">Цена</th>
          <th style="padding: 10px; text-align: center; width: 10%;">Кол-во</th>
          <th style="padding: 10px; text-align: right; width: 20%;">Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${order.items?.map((item, index) => `
          <tr style="background: ${index % 2 === 0 ? '#fff' : '#f9f9f9'}; border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${index + 1}</td>
            <td style="padding: 10px;">${item.product?.article || 'N/A'}</td>
            <td style="padding: 10px;">
              <div>${item.product?.name || 'Без названия'}</div>
              ${item.variation ? `
                <div style="font-size: 10px; color: #2980b9; font-style: italic; margin-top: 3px;">
                  ${item.variation.name}: ${item.variation.value}
                </div>
              ` : ''}
            </td>
            <td style="padding: 10px; text-align: right;">${formatNumber(item.priceAtPurchase)} ₸</td>
            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right;">${formatNumber(Number(item.priceAtPurchase) * item.quantity)} ₸</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; font-weight: bold; font-size: 16px; color: #2c3e50;">Итого:</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold; font-size: 16px; color: #2c3e50;">
            ${formatNumber(order.totalAmount)} ₸
          </td>
        </tr>
        ${Number(order.paidAmount) > 0 ? `
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Оплачено:</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #000;">
            ${formatNumber(order.paidAmount)} ₸
          </td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-weight: bold; color: #555;">Остаток:</td>
          <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #000;">
            ${formatNumber(Number(order.totalAmount) - Number(order.paidAmount))} ₸
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${order.notes ? `
    <div style="background: #fff9e6; padding: 15px; border-radius: 5px; border-left: 3px solid #f39c12; margin-bottom: 20px;">
      <div style="font-weight: bold; margin-bottom: 5px; color: #f39c12;">Комментарии:</div>
      <div style="color: #333;">${order.notes}</div>
    </div>
    ` : ''}

    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="width: 45%;">
        <div style="font-size: 11px; color: #666; margin-bottom: 30px;">Менеджер:</div>
        <div style="border-bottom: 1px solid #333; margin-bottom: 5px;"></div>
        <div style="font-size: 10px; color: #666;">________________________</div>
      </div>
      <div style="width: 45%;">
        <div style="font-size: 11px; color: #666; margin-bottom: 30px;">Поставщик:</div>
        <div style="border-bottom: 1px solid #333; margin-bottom: 5px;"></div>
        <div style="font-size: 10px; color: #666;">________________________</div>
      </div>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 10px; color: #666;">
      <div>Документ создан автоматически системой управления заказами</div>
      <div style="margin-top: 5px;">Дата печати: ${new Date().toLocaleString('ru-RU')}</div>
    </div>
  `;

  container.innerHTML = html;
  return container;
};

// Основная функция генерации PDF
export const generateOrderPDF = async (order: Order): Promise<void> => {
  try {
    // Создаем HTML контейнер
    const htmlContainer = createOrderHTML(order);
    
    // Временно добавляем в DOM для рендеринга
    htmlContainer.style.position = 'absolute';
    htmlContainer.style.left = '-9999px';
    htmlContainer.style.top = '0';
    document.body.appendChild(htmlContainer);

    // Рендерим в canvas
    const canvas = await html2canvas(htmlContainer, {
      scale: 2, // Увеличиваем качество
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Удаляем временный контейнер
    document.body.removeChild(htmlContainer);

    // Создаем PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Получаем размеры
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Добавляем изображение в PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Если контент больше одной страницы
    let heightLeft = imgHeight;
    let position = 0;
    const pageHeight = 297; // A4 height in mm

    while (heightLeft >= pageHeight) {
      position = heightLeft - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Скачиваем PDF
    pdf.save(`Заявка_${order.orderNumber}.pdf`);
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    throw error;
  }
};
