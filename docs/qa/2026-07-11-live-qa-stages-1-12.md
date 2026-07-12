# Live QA: этапы 1-12 product lifecycle

Дата: 2026-07-11
Среда: локальный backend `http://localhost:5000/api`, frontend `http://localhost:3000`
Сценарий: `output/playwright/live-qa-stages-1-12.js`
Результат: passed

## Итог

Полный живой прогон стадий 1-12 успешно пройден на реальном UI через Playwright и подтвержден через API/БД.

QA-товар:

- `productId`: 82
- `name`: `QA Full Lifecycle 20260711091319`
- `sku`: `QA-FULL-KASPI-20260711091319`
- финальный статус: `in_sale`
- завершение жизненного цикла: `2026-07-11T09:14:20.314Z`

## Покрытые сценарии

- Админ создает быстрый черновик товара.
- Админ привязывает поставщика и назначает дизайнера.
- Дизайнер загружает материал, отмечает карточку созданной и отправляет на проверку.
- Админ отправляет карточку на доработку с attachment.
- Дизайнер повторно отправляет карточку после доработки.
- Админ approve-ит карточку с KPI-весом `2`.
- Проверены запреты по правам:
  - дизайнер не может approve-ить карточку: `403`;
  - marketplace-роль не может редактировать общую карточку товара: `403`;
  - прямой POST в history не существует: `404`.
- Marketplace manager заполняет Kaspi-данные и передает товар в закуп.
- Purchase manager оформляет первичный закуп и подтверждает частичное поступление `4/5`.
- Warehouse operator заполняет складской паспорт.
- Marketplace manager завершает запуск продаж и редактирует параметры завершенной продажи.
- Админ визуально открывает историю товара и отчет KPI дизайнеров.
- БД-проверка подтверждает итоговое состояние.

## Evidence

JSON-результат:

- `output/playwright/live-qa-stages-1-12-result-20260711091319.json`

Скриншоты:

- `output/playwright/stages-1-12-20260711091319/`
- всего: 34 скриншота

Ключевые скриншоты:

- `01-login-admin.png`
- `02-draft-filled.png`
- `04-designer-assigned.png`
- `08-revision-request-filled.png`
- `14-approve-with-kpi-weight.png`
- `18-kaspi-panel-filled.png`
- `23-arrival-panel-filled.png`
- `26-warehouse-panel-filled.png`
- `31-completed-sale-panel-updated.png`
- `33-history-timeline-modal.png`
- `34-designer-kpi-report.png`

## DB/API verification

База подтвердила:

- `lifecycleStatus`: `in_sale`
- `currentStock`: `4`
- `costPrice`: `1300`
- закуп: `quantity=5`, `receivedQuantity=4`
- приход: `receiptType=partial`
- складская ячейка: `QA-A/03/12`
- Kaspi-статус: `in_sale`
- revision: `1`, resolved: `1`
- assets: `product_photo`, `revision_attachment`
- KPI entry: `designerId=5`, `weight=2`, `reviewedByUserId=1`
- history actions missing: `[]`

API подтвердил:

- `historyEvents`: `19`
- `kpiTotalWeightForDesigner`: `6`
- forbidden designer approve: `403`
- forbidden marketplace card edit: `403`
- forbidden history mutation: `404`

## Замечания по QA-обвязке

В ходе настройки live QA нашел не продуктовый баг, а проблему самого QA-скрипта: часть селекторов была записана в битой кодировке. Скрипт переведен на реальные русские accessible names и более устойчивые DOM-селекторы там, где текстовая привязка не нужна.

Критичных дефектов CRM по пройденным сценариям не найдено.
