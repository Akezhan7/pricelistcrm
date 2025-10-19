# Этап 1: Подготовка базы данных и структуры ✅

## Выполненные задачи

### 1. Созданы новые модели базы данных

#### ✅ Order (Заявка) - `server/models/Order.js`
Модель для управления заявками на поставку товаров.

**Поля:**
- `id` - уникальный идентификатор
- `orderNumber` - уникальный номер заявки (ORD-2025-0001)
- `supplierId` - ID поставщика
- `expectedDeliveryDate` - ожидаемая дата поставки
- `deliveryLocation` - место доставки (по умолчанию "Точка Байсад")
- `totalAmount` - общая сумма заявки
- `paidAmount` - оплаченная сумма
- `status` - статус заявки (В работе, На точке, В пути, На складе)
- `paymentStatus` - статус оплаты (Не оплачено, Частично оплачено, Оплачено)
- `notes` - комментарии
- `createdBy` - ID пользователя, создавшего заявку
- `isActive` - активность (мягкое удаление)

**Индексы:** orderNumber (unique), supplierId, status, paymentStatus, createdBy, isActive, expectedDeliveryDate, createdAt

---

#### ✅ OrderItem (Товары в заявке) - `server/models/OrderItem.js`
Промежуточная таблица для связи заявок с товарами (многие ко многим).

**Поля:**
- `id` - уникальный идентификатор
- `orderId` - ID заявки
- `productId` - ID товара
- `quantity` - количество товара
- `priceAtPurchase` - цена на момент создания заявки
- `totalPrice` - общая стоимость (автоматически рассчитывается)
- `notes` - заметки по товару

**Особенности:**
- Hook `beforeValidate` автоматически рассчитывает `totalPrice`
- Индексы для быстрого поиска по заявкам и товарам

---

#### ✅ OrderStatusHistory (История статусов) - `server/models/OrderStatusHistory.js`
Отслеживание всех изменений статусов заявок.

**Поля:**
- `id` - уникальный идентификатор
- `orderId` - ID заявки
- `oldStatus` - предыдущий статус (null при создании)
- `newStatus` - новый статус
- `changedBy` - ID пользователя, изменившего статус
- `comment` - комментарий к изменению
- `changedAt` - время изменения

**Индексы:** orderId, changedBy, changedAt, композитный (orderId + changedAt)

---

#### ✅ Payment (Платежи) - `server/models/Payment.js`
Регистрация платежей поставщикам.

**Поля:**
- `id` - уникальный идентификатор
- `supplierId` - ID поставщика
- `amount` - сумма платежа
- `paymentDate` - дата платежа
- `paymentMethod` - способ оплаты (Наличные, Перевод, Карта, Другое)
- `comment` - комментарий
- `createdBy` - ID пользователя, зарегистрировавшего платеж
- `relatedOrderIds` - массив ID заявок (JSONB)

**Индексы:** supplierId, paymentDate, createdBy, paymentMethod, композитный (supplierId + paymentDate)

---

#### ✅ PriceHistory (История цен) - `server/models/PriceHistory.js`
Отслеживание изменений цен товаров.

**Поля:**
- `id` - уникальный идентификатор
- `productId` - ID товара
- `oldPrice` - старая цена
- `newPrice` - новая цена
- `priceType` - тип цены (costPrice - себестоимость, sellingPrice - цена продажи)
- `changeReason` - причина изменения
- `changedBy` - ID пользователя
- `orderId` - ID заявки (опционально)
- `changedAt` - время изменения

**Индексы:** productId, changedBy, changedAt, orderId, priceType, композитный (productId + changedAt)

---

### 2. Обновлена модель User

**Расширены роли пользователей:**
- `admin` - администратор (полный доступ)
- `operator` - оператор (базовый уровень)
- **NEW** `accountant` - бухгалтер (финансы, платежи)
- **NEW** `purchase_manager` - менеджер по закупкам (заявки, поставщики)
- **NEW** `warehouse_operator` - оператор склада (статусы на складе)
- **NEW** `driver` - водитель (статусы в пути)

---

### 3. Настроены связи между моделями

Обновлен файл `server/models/associations.js`:

**Связи заявок:**
- Order → Supplier (belongsTo)
- Order → User (createdBy)
- Order → OrderItem (hasMany, CASCADE delete)
- Order → OrderStatusHistory (hasMany, CASCADE delete)
- Order → PriceHistory (hasMany, SET NULL)

**Связи товаров в заявках:**
- OrderItem → Order (belongsTo)
- OrderItem → Product (belongsTo, RESTRICT delete)

**Связи платежей:**
- Payment → Supplier (belongsTo, RESTRICT delete)
- Payment → User (createdBy)

**Связи истории:**
- OrderStatusHistory → Order (belongsTo)
- OrderStatusHistory → User (changedBy)
- PriceHistory → Product (belongsTo, CASCADE delete)
- PriceHistory → User (changedBy)
- PriceHistory → Order (belongsTo, SET NULL)

---

### 4. Обновлен файл экспорта моделей

Файл `server/models/index.js` теперь экспортирует все новые модели:
- Order
- OrderItem
- OrderStatusHistory
- Payment
- PriceHistory

---

### 5. Создан скрипт миграции

**Файл:** `server/scripts/migrateOrders.js`

**Возможности:**
- ✅ Проверяет существующие таблицы
- ✅ Создает только новые таблицы (без потери данных)
- ✅ Обновляет enum для ролей пользователей
- ✅ Выводит детальный лог процесса
- ✅ Безопасная обработка ошибок

**Команда для запуска:**
```bash
npm run migrate-orders
```

Или из корневой директории проекта:
```bash
cd server
node scripts/migrateOrders.js
```

---

## Схема связей базы данных

```
┌─────────────┐
│    User     │
└─────────────┘
      │
      ├─── createdOrders ──────┐
      ├─── statusChanges ──────┤
      ├─── priceChanges ───────┤
      └─── createdPayments ────┤
                               │
┌─────────────┐               │       ┌──────────────────┐
│  Supplier   │◄──────────────┴──────►│      Order       │
└─────────────┘                       └──────────────────┘
      │                                        │
      ├─── payments                            ├─── items (OrderItem)
      ├─── orders                              ├─── statusHistory
      └─── products (через ProductSupplier)    └─── priceChanges
                                                       │
┌─────────────┐                               ┌──────▼───────┐
│   Product   │◄──────────────────────────────┤  OrderItem   │
└─────────────┘                               └──────────────┘
      │
      ├─── priceHistory
      ├─── orderItems
      ├─── suppliers (через ProductSupplier)
      └─── variations (ProductVariation)
```

---

## Следующие шаги (Этап 2)

### Модуль заявок - базовый функционал

1. **Создать контроллер заявок** (`server/controllers/orderController.js`)
   - Список всех заявок с фильтрацией
   - Создание новой заявки
   - Получение детальной информации
   - Редактирование заявки
   - Смена статуса
   - Автоматическая генерация номера заявки

2. **Создать маршруты** (`server/routes/orders.js`)
   - GET `/api/orders` - список заявок
   - GET `/api/orders/:id` - детальная информация
   - POST `/api/orders` - создание заявки
   - PUT `/api/orders/:id` - обновление заявки
   - PATCH `/api/orders/:id/status` - смена статуса
   - DELETE `/api/orders/:id` - мягкое удаление

3. **Создать middleware для проверки прав**
   - Проверка доступа по ролям
   - Валидация данных заявок

4. **Frontend компоненты**
   - Страница списка заявок
   - Форма создания заявки
   - Детальная страница заявки
   - Компонент смены статуса

---

## Инструкции по применению миграции

### Перед запуском миграции:

1. **Убедитесь, что база данных запущена:**
   ```bash
   npm run docker:up
   ```

2. **Проверьте .env файл:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=crm3_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. **Создайте резервную копию (рекомендуется):**
   ```bash
   # Windows (PowerShell)
   $env:PGPASSWORD="your_password"; pg_dump -h localhost -U postgres crm3_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
   
   # Linux/Mac
   PGPASSWORD=your_password pg_dump -h localhost -U postgres crm3_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

### Запуск миграции:

```bash
cd server
npm run migrate-orders
```

### Проверка результатов:

После успешной миграции вы должны увидеть:
```
✅ Миграция успешно завершена!

📊 Итоговая статистика:
  - Всего таблиц: [количество]
  - Таблицы: orders, order_items, order_status_history, payments, price_history, ...
```

### В случае ошибок:

1. Проверьте логи базы данных:
   ```bash
   npm run docker:logs
   ```

2. Проверьте подключение:
   ```bash
   npm run test-connection
   ```

3. Если нужно пересоздать БД с нуля:
   ```bash
   npm run init-db
   ```
   ⚠️ **Внимание:** это удалит все данные!

---

## Проверка миграции

Подключитесь к базе данных и проверьте таблицы:

```sql
-- Проверить список таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Проверить структуру таблицы заявок
\d orders

-- Проверить enum ролей
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role');
```

---

## Статус этапа 1: ✅ ЗАВЕРШЕН

Все задачи Этапа 1 выполнены:
- ✅ Созданы 5 новых моделей
- ✅ Обновлена модель User (добавлены роли)
- ✅ Настроены все связи между моделями
- ✅ Создан безопасный скрипт миграции
- ✅ Обновлены индексы для оптимизации запросов
- ✅ Добавлена команда в package.json

**База данных готова к разработке функционала заявок!**
