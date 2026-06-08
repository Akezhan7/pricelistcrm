# QA Checklist — CRM Frontend

> Breakpoints: **375px** (mobile), **768px** (tablet), **1280px** (desktop)

## Маршруты (16)

| # | Маршрут | Проверить |
|---|---------|-----------|
| 1 | `/login` | Форма, валидация, redirect после входа |
| 2 | `/register` | Регистрация, ошибки API |
| 3 | `/dashboard` | Карточки метрик, loading/empty |
| 4 | `/orders` | Список (таблица ≥ md, карточки < md), фильтры, пагинация |
| 5 | `/orders/:id` | Статус Badge, PDF, WhatsApp, модалки статуса/оплаты |
| 6 | `/products` | Split/tabs, поиск, создание/редактирование товара |
| 7 | `/suppliers` | Карточки поставщиков, создание |
| 8 | `/suppliers/:id` | Каталог, финансы, привязка товаров |
| 9 | `/price-list` | Фильтры, таблица, экспорт PDF |
| 10 | `/map` | BaysideMap, поиск рядов, RowManager |
| 11 | `/stock` | Остатки, inline-модалки |
| 12 | `/categories` | Дерево категорий, CRUD, удаление |
| 13 | `/collector/tasks` | Список задач сборщика |
| 14 | `/warehouse/receipt` | Приёмка, расхождения, confirm |
| 15 | `/users` | Список, создание пользователя (admin) |
| 16 | `/` | Redirect на dashboard для авторизованных |

## Ключевые бизнес-флоу

- [ ] **Login / Logout** — вход, выход, redirect на `/login`
- [ ] **Черновик заявки** — CreateOrderModal → OrderDraftBanner → восстановление / удаление
- [ ] **Создание заявки** — позиции, вариации, сохранение
- [ ] **PDF прайс-лист** — фильтры → скачать PDF (`PriceListPage`)
- [ ] **PDF заявки** — OrderDetails → генерация PDF
- [ ] **Финансы поставщика** — SupplierFinanceModal: платежи, привязка заявок
- [ ] **Привязка товара к поставщику** — LinkProductToSupplierModal
- [ ] **WhatsApp** — отправка из OrderDetails / SendProductImageModal

## Адаптивность

На каждом breakpoint проверить:

- [ ] Sidebar скрыт на 375px; hamburger открывает drawer
- [ ] Нет горизонтального скролла страницы (кроме таблиц с `overflow-x-auto`)
- [ ] Модалки fullscreen на mobile (`ui/Modal`)
- [ ] OrderDraftBanner не перекрывает header
- [ ] Touch targets ≥ 44px на кнопках и IconButton

## Техническое

- [ ] `npm run build` — без ошибок TypeScript
- [ ] Нет `window.confirm` / `alert` в production-коде
- [ ] Toast на ошибках API (не блокирующие alert)
