# ПЛАН РЕАЛИЗАЦИИ CRM - СИСТЕМА ЗАКУПОК И СКЛАДА

## КОНТЕКСТ ПРОЕКТА

**Стек:** Node.js, Express, PostgreSQL, Sequelize ORM
**Текущий статус:** Базовая CRM готова на 80%
**Цель:** Доработать под полноценную систему управления закупками и складом с интеграцией WhatsApp и Kaspi

---

## ТЕКУЩЕЕ СОСТОЯНИЕ (ЧТО ЕСТЬ)

### Модели БД:
- ✅ **Product** - товары (name, article, costPrice, sellingPrice, image)
- ✅ **Supplier** - поставщики (name, phone, whatsapp, address, debt)
- ✅ **Order** - заявки (orderNumber, status, totalAmount, paidAmount)
- ✅ **OrderItem** - товары в заявке
- ✅ **ProductSupplier** - связь товар↔поставщик (M:M)
- ✅ **ProductVariation** - вариации товаров
- ✅ **User** - пользователи с ролями
- ✅ **OrderStatusHistory** - история статусов
- ✅ **Payment** - оплаты
- ✅ **PriceHistory** - история цен
- ✅ **Sector**, **Row** - секторы и ряды для навигации

### Существующие статусы Order:
- "В работе", "На точке", "В пути", "На складе"

### Роли пользователей:
- admin, operator, accountant, purchase_manager, warehouse_operator, driver

---

## ЧТО НУЖНО ДОБАВИТЬ

### 1. ТОВАРЫ (Product)
**Добавить поля:**
- `internalName` VARCHAR(200) - Внутреннее название (маска для сотрудников)
- `kaspiName` VARCHAR(200) - Официальное название Kaspi
- `kaspiArticle` VARCHAR(100) - Артикул Kaspi
- `currentStock` INTEGER DEFAULT 0 - Текущий остаток на складе
- `minStock` INTEGER DEFAULT 0 - Минимальный порог остатков
- `categoryId` INTEGER - FK к категориям

**Логика:**
- `internalName` - для внутреннего использования ("Маска сварная чёрная")
- `kaspiName` + `kaspiArticle` - для выгрузки в Kaspi (не менять!)
- Поле `name` оставить для обратной совместимости или удалить после миграции

**Индексы:**
- current_stock, min_stock, category_id

### 2. КАТЕГОРИИ (Category) - НОВАЯ МОДЕЛЬ
**Структура:**
- `id` INTEGER PRIMARY KEY
- `name` VARCHAR(100) NOT NULL
- `description` TEXT
- `parentId` INTEGER - для вложенных категорий
- `isActive` BOOLEAN DEFAULT true

**Связи:**
- Category hasMany Products
- Product belongsTo Category
- Category hasMany Category (subcategories)
- Category belongsTo Category (parent)

### 3. СТАТУСЫ ЗАЯВОК (Order.status)
**Новые статусы:**
- 'Создана' - начальный статус
- 'Отправлена поставщику' - отправили в WhatsApp
- 'Частично подтверждена' - поставщик подтвердил не всё
- 'Подтверждена' - поставщик подтвердил
- 'В сборе' - сборщик собирает
- 'Забрана' - товар забран у поставщика
- 'Принята на складе' - приёмка завершена
- 'Закрыта' - архив

**Задача:** Обновить ENUM в БД и модели

### 4. ПОДТВЕРЖДЕНИЕ ЗАЯВОК (OrderConfirmation) - НОВАЯ МОДЕЛЬ
**Структура:**
- `id` INTEGER PRIMARY KEY
- `orderId` INTEGER FK
- `productId` INTEGER FK
- `requestedQuantity` INTEGER - сколько запрашивали
- `confirmedQuantity` INTEGER - сколько подтвердил поставщик
- `isAvailable` BOOLEAN - есть ли в наличии
- `supplierComment` TEXT - комментарий поставщика
- `createdAt` TIMESTAMP

**Связи:**
- OrderConfirmation belongsTo Order
- OrderConfirmation belongsTo Product

**Назначение:** Учёт частичных подтверждений от поставщиков

### 5. ЗАДАНИЯ СБОРЩИКАМ (CollectorTask) - НОВАЯ МОДЕЛЬ
**Структура:**
- `id` INTEGER PRIMARY KEY
- `orderId` INTEGER FK
- `assignedTo` INTEGER FK User - кому назначено
- `status` ENUM('pending', 'in_progress', 'completed')
- `isCollected` BOOLEAN DEFAULT false
- `collectedAt` TIMESTAMP
- `notes` TEXT

**Связи:**
- CollectorTask belongsTo Order
- CollectorTask belongsTo User (collector)

**Назначение:** Управление задачами для сборщиков (Баха, Бауржан и др.)

### 6. ПРИЁМКА (WarehouseReceipt) - НОВАЯ МОДЕЛЬ
**Структура:**
- `id` INTEGER PRIMARY KEY
- `orderId` INTEGER FK
- `receivedBy` INTEGER FK User - кто принял
- `receiptType` ENUM('full', 'partial')
- `receivedAt` TIMESTAMP
- `notes` TEXT

**Связи:**
- WarehouseReceipt belongsTo Order
- WarehouseReceipt belongsTo User (receiver)
- WarehouseReceipt hasMany WarehouseReceiptItem

**Назначение:** Фиксация приёмки товара на складе

### 7. ПРИЁМКА ПОЗИЦИЙ (WarehouseReceiptItem) - НОВАЯ МОДЕЛЬ
**Структура:**
- `id` INTEGER PRIMARY KEY
- `receiptId` INTEGER FK
- `productId` INTEGER FK
- `expectedQuantity` INTEGER - ожидали
- `receivedQuantity` INTEGER - получили
- `discrepancy` INTEGER - расхождение (expected - received)
- `notes` TEXT

**Связи:**
- WarehouseReceiptItem belongsTo WarehouseReceipt
- WarehouseReceiptItem belongsTo Product

**Назначение:** Детализация приёмки по каждому товару

### 8. WHATSAPP ИНТЕГРАЦИЯ
**Требования:**
- Генерация текстового сообщения для заявки
- Формат: номер заявки, список товаров, итоговая сумма
- Deep link: `https://wa.me/{phone}?text={message}`
- Возможность отправки фото товара поставщику
- Функции форматирования и кодирования URL

---

## ПОШАГОВЫЙ ПЛАН РЕАЛИЗАЦИИ

### ШАГ 1: ОБНОВЛЕНИЕ МОДЕЛЕЙ БД ⭐ ПРИОРИТЕТ 1

#### 1.1. Миграция Product
**Задача:** Добавить новые поля в таблицу products
**Поля:**
- internal_name VARCHAR(200)
- kaspi_name VARCHAR(200)
- kaspi_article VARCHAR(100)
- current_stock INTEGER DEFAULT 0
- min_stock INTEGER DEFAULT 0
- category_id INTEGER REFERENCES categories(id)

**Индексы:**
- idx_products_current_stock
- idx_products_min_stock
- idx_products_category

**Миграция данных:** Решить, куда переносить существующее поле `name`

**Файлы:** 
- Создать миграцию в `migrations/`
- Обновить модель `models/Product.js`

#### 1.2. Создание Category
**Задача:** Создать новую модель и таблицу для категорий товаров

**Файлы:**
- Создать модель `models/Category.js`
- Создать миграцию в `migrations/`
- Обновить связи в `models/associations.js`

#### 1.3. Обновление Order.status
**Задача:** Изменить ENUM статусов заявок на новые

**Действия:**
- Удалить старое constraint
- Добавить новое constraint с новыми статусами
- Обновить модель Order.js
- Мигрировать существующие данные (маппинг старых статусов → новые)

**Файлы:**
- Создать миграцию в `migrations/`
- Обновить `models/Order.js`

#### 1.4. Создание OrderConfirmation
**Задача:** Создать модель для учёта подтверждений от поставщиков

**Файлы:**
- Создать модель `models/OrderConfirmation.js`
- Создать миграцию
- Добавить связи в `associations.js`

#### 1.5. Создание CollectorTask
**Задача:** Создать модель для управления заданиями сборщиков

**Файлы:**
- Создать модель `models/CollectorTask.js`
- Создать миграцию
- Добавить связи в `associations.js`

#### 1.6. Создание WarehouseReceipt и WarehouseReceiptItem
**Задача:** Создать модели для приёмки товара на складе

**Файлы:**
- Создать модель `models/WarehouseReceipt.js`
- Создать модель `models/WarehouseReceiptItem.js`
- Создать миграции
- Добавить связи в `associations.js`

#### 1.7. Обновить роли User
**Задача:** Добавить роль `collector` (сборщик) в ENUM

**Файлы:**
- Создать миграцию для обновления роли
- Обновить `models/User.js`

---

### ШАГ 2: КОНТРОЛЛЕРЫ И API ⭐ ПРИОРИТЕТ 2

#### 2.1. CategoryController
**Файл:** `controllers/categoryController.js`

**Endpoints:**
```
GET    /api/categories          - список категорий
POST   /api/categories          - создать категорию
GET    /api/categories/:id      - одна категория
PUT    /api/categories/:id      - обновить
DELETE /api/categories/:id      - удалить
GET    /api/categories/tree     - дерево категорий
```

#### 2.2. Обновить ProductController
**Файл:** `controllers/productController.js`

**Изменения:**
- При создании/обновлении обрабатывать новые поля
- Добавить фильтр по `currentStock` (низкий остаток)
- Добавить endpoint для аналитики остатков

**Новые endpoints:**
```
GET /api/products/low-stock          - товары с низким остатком
GET /api/products/stock-analytics    - аналитика по остаткам
PUЗадача:** Создать CRUD для управления категориями товаров

**Endpoints:**
- GET /api/categories - список всех категорий
- POST /api/categories - создать новую категорию
- GET /api/categories/:id - получить одну категорию
- PUT /api/categories/:id - обновить категорию
- DELETE /api/categories/:id - удалить категорию
- GET /api/categories/tree - получить иерархическое дерево категорий

**Файлы:** `controllers/categoryController.js`, `routes/categories.js`

#### 2.2. Обновить ProductController
**Задача:** Добавить работу с новыми полями и аналитику остатков

**Изменения:**
- Обрабатывать новые поля при создании/обновлении
- Добавить фильтрацию по currentStock
- Реализовать аналитику остатков

**Новые endpoints:**
- GET /api/products/low-stock - товары с низким остатком (currentStock <= minStock)
- GET /api/products/stock-analytics - аналитика по остаткам с цветовой индикацией
- PUT /api/products/:id/stock - обновить остаток вручную

**Файл:** `controllers/productController.js`

#### 2.3. Обновить OrderController
**Задача:** Добавить WhatsApp интеграцию, подтверждения, назначение сборщиков, приёмку

**Новые endpoints:**
- POST /api/orders/:id/send-whatsapp - сформировать WhatsApp сообщение и вернуть deep link
- POST /api/orders/:id/confirm - полное подтверждение заявки поставщиком
- POST /api/orders/:id/partial-confirm - частичное подтверждение с указанием количества
- GET /api/orders/:id/whatsapp-message - получить только текст сообщения
- POST /api/orders/:id/assign-collector - назначить сборщика на заявку
- PUT /api/orders/:id/collect - отметить, что товар собран
- POST /api/orders/:id/receive - провести приёмку товара на складе

**Логика WhatsApp:**
- Формировать читабельный текст: номер заявки, список товаров, итоговая сумма
- Генерировать deep link с закодированным текстом
- Возможность отправки фото товара

**Логика приёмки:**
- Принимать данные: ожидаемое/полученное количество по каждому товару
- Создавать WarehouseReceipt и WarehouseReceiptItem
- Автоматически обновлять Product.currentStock
- Изменять Order.status на "Принята на складе"
- Логировать в OrderStatusHistory

**Файл:** `controllers/orderController.js`

#### 2.4. CollectorController
**Задача:** Создать интерфейс для сборщиков (Баха, Бауржан)

**Endpoints:**
- GET /api/collector/tasks - получить мои задания на сбор
- PUT /api/collector/tasks/:id/start - начать выполнение задания
- PUT /api/collector/tasks/:id/complete - завершить задание (собрал товар)

**Логика:**
- Показывать только задания, назначенные текущему пользователю
- Фильтр по статусам (pending, in_progress, completed)
- Возможность добавить заметки

**Файлы:** `controllers/collectorController.js`, `routes/collector.js`

#### 2.5. WarehouseController
**Задача:** Создать интерфейс для складских операций

**Endpoints:**
- GET /api/warehouse/pending-receipts - список заявок, ожидающих приёмки
- POST /api/warehouse/receive/:orderId - провести приёмку заявки
- GET /api/warehouse/stock-report - отчёт по текущим остаткам

**Логика:**
- Показывать заявки со статусами "Забрана", "В сборе"
- При приёмке сверять ожидаемое и полученное количество
- Автоматически обновлять остатки

**Файлы:** `controllers/warehouseController.js`, `routes/warehouse.js`

#### 2.6. ExportController (для Kaspi/ProfitBot)
**Задача:** Реализовать выгрузку данных для интеграции с ProfitBot и Kaspi

**Endpoints:**
- GET /api/export/kaspi - выгрузка в формате для ProfitBot
- GET /api/export/kaspi/csv - CSV файл
- GET /api/export/kaspi/json - JSON формат

**Требования к выгрузке:**
- Использовать kaspiArticle и kaspiName (НЕ внутренние названия)
- Передавать currentStock и sellingPrice
- Формат уточнить у ProfitBot (CSV/JSON/XML)

**Файлы:** `controllers/exportController.js`, `routes/export.js## 3.3. Автоформирование списка закупа
**Endpoint:** `GET /api/analytics/purchase-suggestions`
```javascript
// Товары где currentStock <= minStock
// Сортировка по критичности
// Группировка по поставщикам
```

#### 3.4. WhatsApp Message Formatter
**Файл:** `utils/whatsappFormatter.js`
```javascript
function formatOrderForWhatsApp(order) {
  let message = `Заявка ${order.orderNumber}\n\n`;
  order.items.forEach((item, i) => {
    message += `${i+1}. ${item.product.internalName} - ${item.quantity} шт\n`;
  });
  Задача:** Реализовать автоматическое обновление currentStock при операциях

**Требования:**
- При приёмке товара: увеличивать currentStock на полученное количество
- При продаже: уменьшать currentStock
- Использовать хуки Sequelize или триггеры БД
- Опционально: логировать все изменения в отдельную таблицу StockHistory

**Места реализации:**
- WarehouseController (приёмка)
- Хуки в моделях

#### 3.2. Цветовая индикация остатков
**Задача:** Реализовать функцию определения статуса остатков

**Логика индикации:**
- Красный (critical) - currentStock = 0
- Жёлтый (low) - currentStock <= minStock
- Оранжевый (medium) - currentStock <= minStock * 2
- Зелёный (good) - currentStock > minStock * 2

**Использование:**
- В аналитике остатков
- В дашборде
- В списке товаров

#### 3.3. Автоформирование списка закупа
**Задача:** Создать endpoint для анализа и формирования списка на закуп

**Требования:**
- Выбирать товары где currentStock <= minStock
- Сортировать по критичности (чем меньше остаток, тем выше)
- Группировать по поставщикам для удобства закупа
- Учитывать связи ProductSupplier

**Endpoint:** GET /api/analytics/purchase-suggestions

**Файл:** `controllers/analyticsController.js` или в ProductController

#### 3.4. WhatsApp Message Formatter
**Задача:** Создать утилиты для форматирования сообщений WhatsApp

**Требования:**
- Функция форматирования заявки в текст
- Функция генерации deep link
- Очистка номера телефона от спецсимволов
- Кодирование текста для URL
- Поддержка отправки ссылки на фото товара

**Формат сообщения:**
- Номер заявки
- Список товаров (внутреннее название + количество)
- Итоговая сумма

**Файл:** `utils/whatsappFormatter.js`

#### 3.5. Отправка фото товара в WhatsApp
**Задача:** Реализовать возможность отправки фото товара поставщику

**Варианты реализации:**
1. Простой: Deep link с текстом и ссылкой на фото в системе
2. Продвинутый: WhatsApp Business API (требует регистрации и платный)

**Требования:**
- Выбрать товар и поставщика
- Сформировать сообщение с ссылкой на изображение
- Вернуть WhatsApp deep link

**Endpoint:** POST /api/products/:id/send-image-whatsapp

---

### ШАГ 4: РОУТЫ ⭐ ПРИОРИТЕТ 4

**Задача:** Создать роуты для новых контроллеров и подключить их

**Создать файлы:**
- `routes/categories.js` - CRUD категорий
- `routes/collector.js` - интерфейс для сборщиков
- `routes/warehouse.js` - складские операции
- `routes/export.js` - экспорт в Kaspi/ProfitBot
- `routes/analytics.js` - аналитика и отчёты
Задача:** Перенести существующие данные в новую структуру

**Скрипт:** `scripts/migrateProductNames.js`

**Действия:**
1. Определить источник Kaspi-названий (Excel файл или текущее поле name)
2. Перенести данные:
   - Если есть Excel: импортировать kaspiName и kaspiArticle оттуда
   - Если нет: name → internalName, kaspiName = name
3. Установить начальные значения:
   - currentStock = 0 (заполнить вручную после миграции)
   - minStock = 0 (заполнить вручную после миграции)
4. Проверить целостность данных
5. Создать отчёт о миграции

**Важно:** Сделать бэкап БД перед миграцией!

---

### ШАГ 6: MIDDLEWARE И ВАЛИДАЦИЯ ⭐ ПРИОРИТЕТ 6

#### 6.1. Проверка прав доступа
**Задача:** Обновить middleware для проверки прав доступа новых ролей

**Изменения в `middleware/checkRole.js`:**
- Добавить проверки для роли `collector`
- Разграничить доступ для `warehouse_operator`
- Настроить права для всех новых endpoints

**Примеры использования:**
- Только сборщики могут обновлять CollectorTask
- Только складские операторы могут проводить приёмку
- Админ имеет доступ ко всему

#### 6.2. Валидация данных
**Задача:** Создать валидаторы для новых полей и endpoints

**Создать валидаторы:**
- `middleware/validators/productValidator.js` - валидация новых полей Product
- `middleware/validators/categoryValidator.js` - валидация Category
- `middleware/validators/orderValidator.js` - обновить для новых endpoints
- `middleware/validators/warehouseValidator.js` - валидация приёмки

**Проверки:**
- Обязательность полей (internalName, kaspiName, kaspiArticle)
- Типы данных (currentStock, minStock - целые числа >= 0)
- Длина строк
- Валидность связей (существование categoryId, supplierId и т.д.)

---

### ШАГ 7: ФРОНТЕНД (ЕСЛИ ЕСТЬ) ⭐ ПРИОРИТЕТ 7

**Задача:** Доработать фронтенд под новый функционал

**Основные изменения:**

1. **Форма товара:**
   - Добавить поля: internalName, kaspiName, kaspiArticle
   - Добавить поля: currentStock, minStock
   - Выбор категории (dropdown)
   - Отображение цветовой индикации остатков

2. **Дашборд остатков:**
   - Таблица товаров с остатками
   - Цветовая индикация (красный/жёлтый/оранжевый/зелёный)
   - Фильтр по статусу остатков
   - Сортировка по критичности

3. **Страница заявки:**
   - Кнопка "Отправить в WhatsApp" (открывает wa.me link)
   - Отображение новых статусов
   - Возможность частичного подтверждения
   - Назначение сборщика

4. **Интерфейс для сборщиков:**
   - Список заданий на день
   - Чекбоксы "Забрал товар"
   - Информация о точке и поставщике
   - Маршрут сбора

5. **Интерфейс приёмки:**
   - Форма сверки: ожидаемое vs полученное
   - Отметка расхождений
   - Кнопки "Принять полностью" / "Принять с расхождениями"
   - Комментарии к позициям

6. **Карточка товара:**
   - Кнопка "Отправить фото поставщику"
   - Выбор поставщика из списка
   - Генерация WhatsApp сообщения с фото
7. ✅ Утилиты (whatsappFormatter.js)
8. ✅ Middleware/валидация

### Этап 3: БИЗНЕС-ЛОГИКА (2-3 дня)
1. ✅ Автообновление остатков (хуки)
2. ✅ Генерация сообщений WhatsApp
3. ✅ Логика приёмки товара
4. ✅ Аналитика остатков
5. ✅ Автоформирование списка закупа

### Этап 4: ИНТЕГРАЦИИ (2-3 дня)
1. ✅ WhatsApp deep links
2. ✅ Экспорт для ProfitBot
3. ✅ Отправка фото товара (если нужно)

### Этап 5: ТЕСТИРОВАНИЕ (2 дня)
1. ✅ Тестирование всех API
2. ✅ Проверка прав доступа
3. ✅ Проверка обновления остатков
4. ✅ Тестирование WhatsApp links

---

## ТЕХНИЧЕСКИЕ ДЕТАЛИ

### База данных
- PostgreSQL 14+
- Sequelize ORM 6.32+
- Миграции через Umzug

### API
- REST API
- JWT авторизация
- Роли и права доступа
- Валидация через express-validator

### WhatsApp
- **Метод 1:** Deep links `wa.me` (бесплатно, требует клиента)
- **Метод 2:** WhatsApp Business API (платно, автоматизация)
- **Библиотека:** `whatsapp-web.js` (неофициальная, может блокироваться)

### ProfitBot
- Нужна документация API от ProfitBot
- Формат данных: уточнить у клиента
- Частота обновления: по требованию или cron

---

## ВОПРОСЫ ДЛЯ УТОЧНЕНИЯ
РАБОТЫ

**Миграции:**
- `npm run db:migrate` - применить миграции
- `npm run db:migrate:status` - статус миграций
- `npm run db:migrate:undo` - откатить последнюю миграцию
- `npm run db:migrate:reset` - откатить всё и применить заново

**Миграция данных:**
- `node scripts/migrateProductNames.js` - перенести данные товаров

**Разработка:**
- `npm run dev` - запустить сервер в режиме разработки
- `npm start` - запустить сервер

**База данных:**
- `npm run backup:create` - создать бэкап БД
- `npm run backup:restore` - восстановить из бэкапа
- `npm run docker:up` - запустить PostgreSQL в Docker
- `npm run docker:down` - остановить Docker контейнеры
5. **Фото товаров:**
   - Достаточно ли ссылки на фото или нужна прямая отправка?
   - Где хранятся фото (на сервере или CDN)?

---

## КОМАНДЫ ДЛЯ ЗАПУСКА

```bash
# 1. Создать и запустить миграции
npm run db:migrate

# 2. Проверить статус миграций
npm run db:migrate:status

# 3. Откатить миграции (если нужно)
npm run db:migrate:undo

# 4. Запустить скрипт миграции данных
node scripts/migrateProductNames.js

# 5. Запустить сервер
npm run dev
```

---

## СТРУКТУРА ФАЙЛОВ ПОСЛЕ ДОРАБОТКИ

```
models/
  Category.js                    ← НОВЫЙ
  OrderConfirmation.js           ← НОВЫЙ
  CollectorTask.js               ← НОВЫЙ
  WarehouseReceipt.js            ← НОВЫЙ
  WarehouseReceiptItem.js        ← НОВЫЙ
  Product.js                     ← ОБНОВИТЬ
  Order.js                       ← ОБНОВИТЬ
  associations.js                ← ОБНОВИТЬ

controllers/
  categoryController.js          ← НОВЫЙ
  collectorController.js         ← НОВЫЙ
  warehouseController.js         ← НОВЫЙ
  exportController.js            ← НОВЫЙ
  productController.js           ← ОБНОВИТЬ
  orderController.js             ← ОБНОВИТЬ

routes/
  c**kaspiName и kaspiArticle** - НЕ МЕНЯТЬ после выгрузки в Kaspi, это ключ синхронизации
2. **Бэкап БД** - обязательно перед каждой миграцией
3. **Остатки** - все изменения логировать, использовать транзакции
4. **Расхождения** - при приёмке всегда проверять expected vs received
5. **WhatsApp** - deep links требуют установленного клиента на устройстве
6. **Миграция данных** - выполнять поэтапно, проверять результат
7. **Права доступа** - строго разграничить по ролям
8. **Статусы заявок** - старые данные нужно смигрировать на новые статусы

---

## ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

**База данных:**
- PostgreSQL 14+
- Sequelize ORM 6.32+
- Миграции через Umzug

**API:**
- REST API
- JWT авторизация
- Роли и права доступа
- Валидация через express-validator

**WhatsApp:**
- Deep links `wa.me` (бесплатно, требует клиента)
- Опционально: WhatsApp Business API (платно, автоматизация)

**ProfitBot/Kaspi:**
- Нужна документация API от ProfitBot
- Уточнить формат данных (CSV/JSON/XML)
- Частота обновления остатков

---

## ВОПРОСЫ ДЛЯ УТОЧНЕНИЯ

**Перед началом разработки выяснить:**

1. **Миграция названий:**
   - Где сейчас хранятся Kaspi-названия?
   - Есть ли Excel файл для импорта?
   - Нужна ли автоматическая миграция?

2. **ProfitBot API:**
   - Есть ли документация API?
   - Какой формат данных принимает?
   - Нужна ли двусторонняя синхронизация?
   - Как часто обновлять остатки?

3. **WhatsApp:**
   - Достаточно ли deep links?
   - Нужна ли автоматическая отправка?
   - Готовы ли использовать WhatsApp Business API?

4. **Остатки:**
   - Как заполнить начальные currentStock?
   - Откуда взять данные?
   - Нужен ли учёт по ячейкам склада?

5. **Фото товаров:**
   - Где хранятся фото (сервер/CDN)?
   - Достаточно ли ссылки или нужна прямая отправка?
   - Все ли товары имеют фото?

---

## ИТОГОВАЯ ОЦЕНКА

**Время разработки:** 2-3 недели
**Сложность:** Средняя-высокая
**Реализуемость:** 100% ✅

**Ключевые риски:**
- Миграция существующих данных
- Интеграция WhatsApp (технически ограничена)
- Синхронизация с ProfitBot (нужна документация)

**Рекомендация:** Реализовывать поэтапно, тестировать каждый этап отдельно

---

## ИНСТРУКЦИЯ ДЛЯ РАЗРАБОТКИ

**Для AI-ассистента в новых чатах:**

1. **Всегда начинать с анализа:**
   - Изучить текущую кодовую базу
   - Найти существующие паттерны
   - Проверить зависимости

2. **Следовать порядку этапов:**
   - Не перепрыгивать этапы
   - Завершать предыдущий перед началом следующего
   - Тестировать после каждого этапа

3. **Искать оптимальные решения:**
   - Не копировать код слепо
   - Адаптировать под текущий стиль проекта
   - Использовать лучшие практики

4. **Коммуникация:**
   - Предлагать варианты реализации
   - Спрашивать при неясностях
   - Предупреждать о потенциальных проблемах

5. **Качество кода:**
   - Добавлять комментарии к сложной логике
   - Обрабатывать ошибки
   - Валидировать входные данные
   - Использовать транзакции для критичных операций

**Этот файл - РУКОВОДСТВО, а не готовый код. Каждую задачу нужно реализовывать с учётом контекста проекта.**

---

## КРИТИЧНЫЕ МОМЕНТЫ

⚠️ **ВАЖНО:**
1. Поле `kaspiName` и `kaspiArticle` НЕ МЕНЯТЬ после выгрузки в Kaspi
2. Все изменения остатков логировать через хуки
3. При приёмке проверять расхождения (expected vs received)
4. WhatsApp deep links требуют установленного клиента на устройстве
5. Миграцию выполнять поэтапно с бэкапами БД

---

## ИТОГОВАЯ ОЦЕНКА

**Время разработки:** 2-3 недели
**Сложность:** Средняя-высокая
**Реализуемость:** 100% ✅

**Ключевые риски:**
- Миграция существующих данных
- Интеграция WhatsApp (ограничена технически)
- Синхронизация с ProfitBot (нужна документация)

**Готово к реализации:** ДА ✅
