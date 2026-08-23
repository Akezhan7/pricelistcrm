import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Order } from '../types';
import type { ReconciliationReport } from '../services/suppliersApi';
import { BRAND } from '../theme/tokens';
import getImageUrl from './image';

/** Базовый контейнер PDF: на всю ширину A4, без внешней рамки */
const initPdfContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.boxSizing = 'border-box';
  container.style.padding = '12mm 14mm';
  container.style.backgroundColor = BRAND.white;
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.color = BRAND.black;
  return container;
};

/** Шапка: только русский заголовок, без латинских бейджей */
const pdfHeader = (title: string, rightHtml: string): string => `
  <div style="margin-bottom:18px;padding-bottom:12px;border-bottom:3px solid ${BRAND.yellow};">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:${BRAND.black};line-height:1.3;flex:1;">${title}</h1>
      <div style="text-align:right;flex-shrink:0;font-size:12px;line-height:1.5;">${rightHtml}</div>
    </div>
  </div>
`;

const pdfFooter = (): string => `
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;font-size:10px;color:${BRAND.textMuted};">
    <span>Документ создан автоматически</span>
    <span>Дата печати: ${new Date().toLocaleString('ru-RU')}</span>
  </div>
`;

const pdfInfoTable = (rows: { label: string; value: string }[]): string => `
  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    ${rows
      .map(
        (r) => `
      <tr>
        <td style="padding:5px 12px 5px 0;width:28%;color:${BRAND.textMuted};font-size:11px;vertical-align:top;">${r.label}</td>
        <td style="padding:5px 0;color:${BRAND.black};font-weight:600;vertical-align:top;">${r.value}</td>
      </tr>`
      )
      .join('')}
  </table>
`;

const pdfTableWrap = (thead: string, tbody: string, tfoot = ''): string => `
  <table style="width:100%;border-collapse:collapse;">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
    ${tfoot ? `<tfoot>${tfoot}</tfoot>` : ''}
  </table>
`;

const thStyle = 'padding:10px 8px;font-size:11px;font-weight:700;color:#111;text-align:left;';
const thCenter = `${thStyle}text-align:center;`;
const thRight = `${thStyle}text-align:right;`;

// Форматирование даты
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'Не указана';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Некорректная дата';
  }
};

// Форматирование числа: «1 234,56»
const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return '0,00';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (Number.isNaN(n)) return '0,00';
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Дожидаемся загрузки всех <img> внутри контейнера (включая onerror) перед html2canvas,
 * иначе фото товаров не попадут в PDF.
 */
const waitForImages = (container: HTMLElement): Promise<void> => {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
};

/**
 * Унифицированная процедура: HTML → canvas → многостраничный PDF.
 */
const renderHtmlToPdf = async (
  htmlContainer: HTMLElement,
  filename: string
): Promise<void> => {
  htmlContainer.style.position = 'absolute';
  htmlContainer.style.left = '-9999px';
  htmlContainer.style.top = '0';
  document.body.appendChild(htmlContainer);

  try {
    await waitForImages(htmlContainer);

    const canvas = await html2canvas(htmlContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: BRAND.white,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 portrait width, mm
    const pageHeight = 297; // A4 portrait height, mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    let heightLeft = imgHeight;
    let position = 0;
    while (heightLeft >= pageHeight) {
      position = heightLeft - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    if (htmlContainer.parentNode) {
      htmlContainer.parentNode.removeChild(htmlContainer);
    }
  }
};

// ===== Накладная (заявка / возврат) =====

const createOrderHTML = (order: Order): HTMLElement => {
  const isReturn = order.type === 'return';
  const title = isReturn ? 'ВОЗВРАТНАЯ НАКЛАДНАЯ' : 'ЗАЯВКА НА ПОСТАВКУ ТОВАРА';

  const container = initPdfContainer();

  const itemsHtml =
    order.items
      ?.map((item, index) => {
        const imgSrc = item.product?.image ? getImageUrl(item.product.image) : null;
        const photoCell = imgSrc
          ? `<img src="${imgSrc}" crossorigin="anonymous" style="width:46px;height:46px;object-fit:contain;display:block;margin:0 auto;border:1px solid ${BRAND.border};border-radius:4px;background:${BRAND.white};" />`
          : `<div style="width:46px;height:46px;border:1px dashed ${BRAND.border};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:9px;margin:0 auto;background:${BRAND.zebra};">нет фото</div>`;
        const sum = Number(item.priceAtPurchase) * Number(item.quantity);
        return `
          <tr style="background:${index % 2 === 0 ? BRAND.white : BRAND.zebra};">
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:center;vertical-align:middle;">${index + 1}</td>
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:center;vertical-align:middle;">${photoCell}</td>
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};vertical-align:middle;">
              <div style="font-weight:600;color:${BRAND.black};">${item.product?.name || 'Без названия'}</div>
              ${item.variation ? `<div style="font-size:10px;color:${BRAND.textMuted};font-style:italic;margin-top:3px;">${item.variation.name}: ${item.variation.value}</div>` : ''}
            </td>
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:right;vertical-align:middle;">${formatNumber(item.priceAtPurchase)} ₸</td>
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:center;vertical-align:middle;font-weight:600;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:right;vertical-align:middle;font-weight:600;">${formatNumber(sum)} ₸</td>
          </tr>
        `;
      })
      .join('') || '';

  const managerName = order.creator?.name || 'Не указан';

  const headerRight = `
    <div style="color:${BRAND.textMuted};font-size:11px;">№ документа</div>
    <div style="font-weight:700;color:${BRAND.black};font-size:16px;">${order.orderNumber}</div>
    <div style="margin-top:6px;color:${BRAND.textMuted};">${formatDate(order.createdAt)}</div>
  `;

  const html = `
    ${pdfHeader(title, headerRight)}

    ${pdfInfoTable([
      { label: 'Номер', value: order.orderNumber },
      { label: 'Дата', value: formatDate(order.createdAt) },
      { label: 'Поставщик', value: order.supplier?.name || 'Не указан' },
    ])}

    <h3 style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:${BRAND.black};">
      ${isReturn ? 'Возвращаемые товары' : 'Товары к поставке'}
    </h3>
    ${pdfTableWrap(
      `<tr style="background:${BRAND.yellow};">
        <th style="${thCenter}">№</th>
        <th style="${thCenter}">Фото</th>
        <th style="${thStyle}">Название</th>
        <th style="${thRight}">Цена</th>
        <th style="${thCenter}">Кол-во</th>
        <th style="${thRight}">Сумма</th>
      </tr>`,
      itemsHtml
    )}

    <div style="margin-top:16px;background:${BRAND.yellow};padding:12px 16px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;font-weight:700;color:${BRAND.black};">Итого</span>
      <span style="font-size:20px;font-weight:700;color:${BRAND.black};">${formatNumber(order.totalAmount)} ₸</span>
    </div>
    ${
      Number(order.paidAmount) > 0
        ? `
    <div style="margin-top:8px;display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${BRAND.border};">
      <span style="color:${BRAND.textMuted};">Оплачено</span>
      <span style="font-weight:600;">${formatNumber(order.paidAmount)} ₸</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;">
      <span style="color:${BRAND.textMuted};">Остаток к оплате</span>
      <span style="font-weight:600;">${formatNumber(Number(order.totalAmount) - Number(order.paidAmount))} ₸</span>
    </div>`
        : ''
    }

    ${
      order.notes
        ? `
    <div style="margin-top:16px;padding:12px 14px;background:#FEF9C3;border-left:4px solid ${BRAND.yellow};border-radius:4px;">
      <div style="font-weight:700;font-size:11px;color:${BRAND.textMuted};margin-bottom:4px;">Комментарии</div>
      <div>${order.notes}</div>
    </div>`
        : ''
    }

    <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="font-size:11px;color:${BRAND.textMuted};margin-bottom:4px;">Менеджер</div>
        <div style="font-size:14px;font-weight:600;">${managerName}</div>
      </div>
      <div style="width:40%;max-width:180px;">
        <div style="border-bottom:1px solid ${BRAND.border};height:28px;"></div>
        <div style="font-size:10px;color:${BRAND.textMuted};text-align:center;margin-top:4px;">подпись</div>
      </div>
    </div>

    ${pdfFooter()}
  `;

  container.innerHTML = html;
  return container;
};

export const generateOrderPDF = async (order: Order): Promise<void> => {
  try {
    const isReturn = order.type === 'return';
    const filename = `${isReturn ? 'Возврат' : 'Заявка'}_${order.orderNumber}.pdf`;
    const html = createOrderHTML(order);
    await renderHtmlToPdf(html, filename);
  } catch (error) {
    console.error('Ошибка при генерации PDF накладной:', error);
    throw error;
  }
};

// ===== Сверка с поставщиком =====

const createReconciliationHTML = (data: ReconciliationReport): HTMLElement => {
  const container = initPdfContainer();

  const periodLabel = `${data.period.from ? formatDate(data.period.from) : '—'} — ${data.period.to ? formatDate(data.period.to) : '—'}`;

  const kindLabel: Record<string, string> = {
    purchase: 'Поставка',
    return: 'Возврат',
    payment: 'Оплата',
  };

  const rows =
    data.movements
      .map(
        (m, i) => `
        <tr style="background:${i % 2 === 0 ? BRAND.white : BRAND.zebra};">
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};">${formatDate(m.date)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};">${kindLabel[m.kind] || m.kind}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};font-weight:600;">${m.documentNumber}${m.comment ? `<div style="margin-top:2px;font-size:9px;font-weight:400;color:${BRAND.textMuted};">${m.comment}</div>` : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};text-align:right;">${m.purchase ? formatNumber(m.purchase) : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};text-align:right;color:${BRAND.yellowDark};">${m.returned ? formatNumber(m.returned) : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};text-align:right;color:#059669;">${m.payment ? formatNumber(m.payment) : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid ${BRAND.border};text-align:right;font-weight:600;">${formatNumber(m.balance)} ₸</td>
        </tr>
      `
      )
      .join('') ||
    `<tr><td colspan="7" style="padding:24px;text-align:center;color:${BRAND.textMuted};">За выбранный период движений нет</td></tr>`;

  const infoRows = [
    { label: 'Поставщик', value: data.supplier.name },
    ...(data.supplier.phone ? [{ label: 'Телефон', value: data.supplier.phone }] : []),
  ];

  const headerRight = `
    <div style="color:${BRAND.textMuted};font-size:11px;">Период</div>
    <div style="font-weight:600;color:${BRAND.black};">${periodLabel}</div>
  `;

  const html = `
    ${pdfHeader('АКТ СВЕРКИ', headerRight)}

    ${pdfInfoTable(infoRows)}

    <div style="display:flex;gap:16px;margin-bottom:18px;">
      <div style="flex:1;padding:12px 14px;background:${BRAND.zebra};border-left:4px solid ${BRAND.yellow};border-radius:4px;">
        <div style="font-size:11px;color:${BRAND.textMuted};">Сальдо на начало</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px;">${formatNumber(data.openingBalance)} ₸</div>
      </div>
      <div style="flex:1;padding:12px 14px;background:${BRAND.zebra};border-left:4px solid ${BRAND.yellow};border-radius:4px;">
        <div style="font-size:11px;color:${BRAND.textMuted};">Сальдо на конец</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px;">${formatNumber(data.closingBalance)} ₸</div>
      </div>
    </div>

    ${pdfTableWrap(
      `<tr style="background:${BRAND.yellow};">
        <th style="${thStyle}">Дата</th>
        <th style="${thStyle}">Тип</th>
        <th style="${thStyle}">Документ</th>
        <th style="${thRight}">Поставка</th>
        <th style="${thRight}">Возврат</th>
        <th style="${thRight}">Оплата</th>
        <th style="${thRight}">Баланс</th>
      </tr>`,
      rows,
      `<tr style="background:${BRAND.yellow};font-weight:700;">
        <td colspan="3" style="padding:10px 8px;text-align:right;">Итого</td>
        <td style="padding:10px 8px;text-align:right;">${formatNumber(data.totals.purchase)}</td>
        <td style="padding:10px 8px;text-align:right;">${formatNumber(data.totals.returned)}</td>
        <td style="padding:10px 8px;text-align:right;">${formatNumber(data.totals.payment)}</td>
        <td style="padding:10px 8px;text-align:right;">${formatNumber(data.closingBalance)} ₸</td>
      </tr>`
    )}

    ${pdfFooter()}
  `;

  container.innerHTML = html;
  return container;
};

export const generateReconciliationPDF = async (data: ReconciliationReport): Promise<void> => {
  try {
    const safeName = (data.supplier.name || 'supplier').replace(/[^a-zA-Z0-9а-яёА-ЯЁ_-]+/g, '_');
    const filename = `Сверка_${safeName}_${data.period.from || ''}_${data.period.to || ''}.pdf`;
    const html = createReconciliationHTML(data);
    await renderHtmlToPdf(html, filename);
  } catch (error) {
    console.error('Ошибка при генерации PDF сверки:', error);
    throw error;
  }
};

// ===== Прайс-лист =====

export interface PriceListPdfItem {
  article: string;
  name: string;
  image?: string | null;
  costPrice: number;
  finalPrice: number;
}

export interface PriceListPdfOptions {
  title?: string;
  markupPercent?: number;
  roundedToFive?: boolean;
}

const createPriceListHTML = (
  items: PriceListPdfItem[],
  options: PriceListPdfOptions = {}
): HTMLElement => {
  const { title = 'ПРАЙС-ЛИСТ', markupPercent, roundedToFive } = options;

  const container = initPdfContainer();

  const rows = items
    .map((it, i) => {
      const imgSrc = it.image ? getImageUrl(it.image) : null;
      const photoCell = imgSrc
        ? `<img src="${imgSrc}" crossorigin="anonymous" style="width:46px;height:46px;object-fit:contain;display:block;margin:0 auto;border:1px solid ${BRAND.border};border-radius:4px;background:${BRAND.white};"/>`
        : `<div style="width:46px;height:46px;border:1px dashed ${BRAND.border};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:9px;margin:0 auto;background:${BRAND.zebra};">нет фото</div>`;
      return `
        <tr style="background:${i % 2 === 0 ? BRAND.white : BRAND.zebra};">
          <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:center;vertical-align:middle;">${i + 1}</td>
          <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:center;vertical-align:middle;">${photoCell}</td>
          <td style="padding:8px;border-bottom:1px solid ${BRAND.border};vertical-align:middle;font-size:11px;color:${BRAND.textMuted};">${it.article}</td>
          <td style="padding:8px;border-bottom:1px solid ${BRAND.border};vertical-align:middle;font-weight:600;color:${BRAND.black};">${it.name}</td>
          <td style="padding:8px;border-bottom:1px solid ${BRAND.border};text-align:right;vertical-align:middle;font-weight:700;color:${BRAND.black};">${formatNumber(it.finalPrice)} ₸</td>
        </tr>
      `;
    })
    .join('');

  const settingsLine = [
    typeof markupPercent === 'number' ? `Наценка: ${markupPercent}%` : null,
    roundedToFive ? 'Округление до 5' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const headerRight = `
    <div style="color:${BRAND.textMuted};font-size:11px;">Дата</div>
    <div style="font-weight:600;color:${BRAND.black};">${formatDate(new Date())}</div>
    ${settingsLine ? `<div style="margin-top:6px;font-size:11px;color:${BRAND.textMuted};">${settingsLine}</div>` : ''}
  `;

  const html = `
    ${pdfHeader(title, headerRight)}

    ${pdfTableWrap(
      `<tr style="background:${BRAND.yellow};">
        <th style="${thCenter}">№</th>
        <th style="${thCenter}">Фото</th>
        <th style="${thStyle}">Артикул</th>
        <th style="${thStyle}">Название</th>
        <th style="${thRight}">Цена</th>
      </tr>`,
      rows || `<tr><td colspan="5" style="padding:24px;text-align:center;color:${BRAND.textMuted};">Нет товаров для отображения</td></tr>`
    )}

    ${pdfFooter()}
  `;

  container.innerHTML = html;
  return container;
};

export const generatePriceListPDF = async (
  items: PriceListPdfItem[],
  options?: PriceListPdfOptions
): Promise<void> => {
  try {
    const filename = `Прайс_${new Date().toISOString().slice(0, 10)}.pdf`;
    const html = createPriceListHTML(items, options);
    await renderHtmlToPdf(html, filename);
  } catch (error) {
    console.error('Ошибка при генерации PDF прайс-листа:', error);
    throw error;
  }
};
