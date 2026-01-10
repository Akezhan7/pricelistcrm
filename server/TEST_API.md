# ТЕСТИРОВАНИЕ API - ШАГ 2

## ПОДГОТОВКА К ТЕСТИРОВАНИЮ

### 1. Запустить сервер
```bash
cd server
npm run dev
```

### 2. Получить токен авторизации
```bash
# Логин (замените на ваши учетные данные)
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "login": "admin",
  "password": "your_password"
}

# Сохраните токен из ответа
```

**Для всех последующих запросов добавляйте заголовок:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## ТЕСТ 1: КАТЕГОРИИ (CategoryController)

### 1.1. Создать категорию
```bash
POST http://localhost:5000/api/categories
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "name": "Маски",
  "description": "Средства индивидуальной защиты"
}
```

### 1.2. Создать подкатегорию
```bash
POST http://localhost:5000/api/categories
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "name": "Маски медицинские",
  "description": "Одноразовые маски",
  "parentId": 1
}
```

### 1.3. Получить все категории
```bash
GET http://localhost:5000/api/categories
Authorization: Bearer YOUR_TOKEN
```

### 1.4. Получить дерево категорий
```bash
GET http://localhost:5000/api/categories/tree
Authorization: Bearer YOUR_TOKEN
```

### 1.5. Обновить категорию
```bash
PUT http://localhost:5000/api/categories/1
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "name": "СИЗ - Маски",
  "description": "Обновленное описание"
}
```

---

## ТЕСТ 2: ТОВАРЫ С ОСТАТКАМИ (ProductController)

### 2.1. Создать товар с новыми полями
```bash
POST http://localhost:5000/api/products
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "internalName": "Маска черная сварная",
  "kaspiName": "Маска защитная трехслойная",
  "kaspiArticle": "MASK-001",
  "article": "M001",
  "costPrice": 50,
  "sellingPrice": 100,
  "currentStock": 5,
  "minStock": 20,
  "categoryId": 1,
  "isActive": true
}
```

### 2.2. Получить товары с низким остатком
```bash
GET http://localhost:5000/api/products/low-stock
Authorization: Bearer YOUR_TOKEN
```

### 2.3. Получить аналитику остатков
```bash
GET http://localhost:5000/api/products/stock-analytics
Authorization: Bearer YOUR_TOKEN
```

### 2.4. Обновить остаток вручную
```bash
PUT http://localhost:5000/api/products/1/stock
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "currentStock": 15,
  "notes": "Ручная корректировка после инвентаризации"
}
```

---

## ТЕСТ 3: ЗАЯВКИ + WHATSAPP (OrderController)

### 3.1. Создать заявку
```bash
POST http://localhost:5000/api/orders
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "supplierId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 50,
      "price": 50
    }
  ],
  "notes": "Тестовая заявка"
}
```

### 3.2. Получить WhatsApp сообщение
```bash
GET http://localhost:5000/api/orders/1/whatsapp-message
Authorization: Bearer YOUR_TOKEN
```

### 3.3. Отправить в WhatsApp (получить deep link)
```bash
POST http://localhost:5000/api/orders/1/send-whatsapp
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "includeImages": false
}
```

**Ожидаемый результат:**
- Статус заявки изменится на "Отправлена поставщику"
- Вернется WhatsApp deep link вида: `https://wa.me/77001234567?text=...`
- Скопируйте ссылку и откройте в браузере/телефоне - должен открыться WhatsApp

### 3.4. Полное подтверждение от поставщика
```bash
POST http://localhost:5000/api/orders/1/confirm
Authorization: Bearer YOUR_TOKEN
```

### 3.5. Частичное подтверждение
```bash
POST http://localhost:5000/api/orders/2/partial-confirm
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "confirmations": [
    {
      "productId": 1,
      "confirmedQuantity": 30,
      "isAvailable": true,
      "supplierComment": "Есть только 30 шт"
    }
  ]
}
```

### 3.6. Назначить сборщика
```bash
POST http://localhost:5000/api/orders/1/assign-collector
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "collectorId": 2,
  "notes": "Забрать у поставщика завтра до 12:00"
}
```

### 3.7. Отметить как собранное
```bash
PUT http://localhost:5000/api/orders/1/collect
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "notes": "Товар забран, везу на склад"
}
```

---

## ТЕСТ 4: ИНТЕРФЕЙС СБОРЩИКА (CollectorController)

### 4.1. Получить мои задания
```bash
GET http://localhost:5000/api/collector/tasks
Authorization: Bearer YOUR_TOKEN_COLLECTOR

# Фильтры:
GET http://localhost:5000/api/collector/tasks?status=pending
GET http://localhost:5000/api/collector/tasks?status=in_progress
```

### 4.2. Начать выполнение задания
```bash
PUT http://localhost:5000/api/collector/tasks/1/start
Authorization: Bearer YOUR_TOKEN_COLLECTOR
```

### 4.3. Завершить задание
```bash
PUT http://localhost:5000/api/collector/tasks/1/complete
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_COLLECTOR

{
  "notes": "Товар собран и доставлен на склад"
}
```

### 4.4. Добавить заметки
```bash
PUT http://localhost:5000/api/collector/tasks/1/notes
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_COLLECTOR

{
  "notes": "Поставщик просит перезвонить перед приездом"
}
```

### 4.5. Получить статистику
```bash
GET http://localhost:5000/api/collector/stats
Authorization: Bearer YOUR_TOKEN_COLLECTOR
```

---

## ТЕСТ 5: СКЛАД И ПРИЁМКА (WarehouseController)

### 5.1. Получить заявки на приёмку
```bash
GET http://localhost:5000/api/warehouse/pending-receipts
Authorization: Bearer YOUR_TOKEN
```

### 5.2. Провести приёмку ⭐ ВАЖНЫЙ ТЕСТ
```bash
POST http://localhost:5000/api/warehouse/receive/1
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "items": [
    {
      "productId": 1,
      "expectedQuantity": 50,
      "receivedQuantity": 50,
      "notes": "Всё в порядке"
    }
  ],
  "notes": "Приёмка без замечаний"
}
```

**ПОСЛЕ ЭТОГО ЗАПРОСА:**
1. Проверьте `Product.currentStock` - должен увеличиться на 50
2. Проверьте статус заявки - должен быть "Принята на складе"
3. Проверьте `WarehouseReceipt` - должна создаться запись

### 5.3. Приёмка с расхождениями
```bash
POST http://localhost:5000/api/warehouse/receive/2
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "items": [
    {
      "productId": 1,
      "expectedQuantity": 50,
      "receivedQuantity": 45,
      "notes": "Недостача 5 шт"
    }
  ],
  "notes": "Частичная приёмка"
}
```

### 5.4. Отчёт по остаткам
```bash
GET http://localhost:5000/api/warehouse/stock-report
Authorization: Bearer YOUR_TOKEN

# С фильтрами:
GET http://localhost:5000/api/warehouse/stock-report?status=critical
GET http://localhost:5000/api/warehouse/stock-report?categoryId=1
GET http://localhost:5000/api/warehouse/stock-report?minStock=10&maxStock=100
```

### 5.5. История приёмок
```bash
GET http://localhost:5000/api/warehouse/receipts
Authorization: Bearer YOUR_TOKEN

# С датами:
GET http://localhost:5000/api/warehouse/receipts?startDate=2026-01-01&endDate=2026-01-31
```

### 5.6. Детали приёмки
```bash
GET http://localhost:5000/api/warehouse/receipts/1
Authorization: Bearer YOUR_TOKEN
```

---

## ТЕСТ 6: ЭКСПОРТ (ExportController)

### 6.1. Статус готовности к экспорту
```bash
GET http://localhost:5000/api/export/kaspi/status
Authorization: Bearer YOUR_TOKEN
```

**Проверьте:**
- Сколько товаров готово к экспорту
- Сколько товаров БЕЗ kaspiName/kaspiArticle
- Процент готовности

### 6.2. Экспорт в JSON для Kaspi
```bash
GET http://localhost:5000/api/export/kaspi/json
Authorization: Bearer YOUR_TOKEN

# С фильтрами:
GET http://localhost:5000/api/export/kaspi/json?onlyInStock=true
GET http://localhost:5000/api/export/kaspi/json?categoryId=1
```

### 6.3. Экспорт в CSV
```bash
GET http://localhost:5000/api/export/kaspi/csv
Authorization: Bearer YOUR_TOKEN

# Должен скачаться файл kaspi_export_*.csv
```

### 6.4. Экспорт прайс-листа (универсальный)
```bash
GET http://localhost:5000/api/export/price-list?format=json
Authorization: Bearer YOUR_TOKEN

# CSV формат:
GET http://localhost:5000/api/export/price-list?format=csv

# Для конкретного поставщика:
GET http://localhost:5000/api/export/price-list?supplierId=1&format=json
```

---

## ПРОВЕРКА АВТООБНОВЛЕНИЯ ОСТАТКОВ

### Сценарий полного цикла:

1. **Создать товар с минимальным остатком:**
```bash
POST http://localhost:5000/api/products
{
  "internalName": "Тест товар",
  "kaspiName": "Test Product",
  "kaspiArticle": "TEST-001",
  "currentStock": 5,
  "minStock": 20,
  ...
}
```

2. **Проверить, что товар в списке low-stock:**
```bash
GET http://localhost:5000/api/products/low-stock
# Должен вернуться созданный товар
```

3. **Создать заявку на 50 шт:**
```bash
POST http://localhost:5000/api/orders
{
  "items": [{"productId": ID, "quantity": 50}],
  ...
}
```

4. **Отправить в WhatsApp → Подтвердить → Назначить сборщика → Собрать:**
```bash
POST /api/orders/ID/send-whatsapp
POST /api/orders/ID/confirm
POST /api/orders/ID/assign-collector
PUT /api/orders/ID/collect
```

5. **Провести приёмку:**
```bash
POST /api/warehouse/receive/ID
{
  "items": [{
    "productId": ID,
    "expectedQuantity": 50,
    "receivedQuantity": 50
  }]
}
```

6. **ПРОВЕРИТЬ ОСТАТОК:**
```bash
GET http://localhost:5000/api/products/ID
# currentStock должен быть 5 + 50 = 55
```

7. **Проверить аналитику:**
```bash
GET http://localhost:5000/api/products/stock-analytics
# Статус товара должен измениться с "critical/low" на "good"
```

---

## ТЕСТИРОВАНИЕ WHATSAPP DEEP LINKS

### Реальная проверка:

1. Создайте заявку с реальным поставщиком (у которого есть WhatsApp)
2. Отправьте в WhatsApp:
```bash
POST http://localhost:5000/api/orders/1/send-whatsapp
```

3. Скопируйте полученную ссылку (должна быть вида):
```
https://wa.me/77001234567?text=%D0%97%D0%B0%D1%8F%D0%B2%D0%BA%D0%B0...
```

4. Откройте ссылку:
   - **На телефоне:** откроется WhatsApp с готовым сообщением
   - **На компьютере:** откроется WhatsApp Web/Desktop

5. Проверьте, что сообщение читабельное и содержит:
   - Номер заявки
   - Список товаров
   - Итоговую сумму

---

## ПРОВЕРКА ПРАВ ДОСТУПА

### Тест 1: Роль `collector`
```bash
# Логин как сборщик
POST http://localhost:5000/api/auth/login
{
  "login": "collector_login",
  "password": "password"
}

# Должен работать:
GET /api/collector/tasks

# НЕ должен работать (403):
GET /api/categories
GET /api/export/kaspi/json
POST /api/warehouse/receive/1
```

### Тест 2: Роль `warehouse_operator`
```bash
# Должен работать:
GET /api/warehouse/pending-receipts
POST /api/warehouse/receive/1
PUT /api/products/1/stock

# НЕ должен работать (403):
GET /api/collector/tasks
GET /api/export/kaspi/json
```

### Тест 3: Роль `admin`
```bash
# Должен работать ВСЁ:
GET /api/*
POST /api/*
PUT /api/*
DELETE /api/*
```

---

## АВТОМАТИЧЕСКИЕ ТЕСТЫ (ОПЦИОНАЛЬНО)

Создайте файл `tests/step2.test.js`:

```javascript
const request = require('supertest');
const app = require('../index');

describe('Step 2 API Tests', () => {
  let token;
  
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'admin', password: 'password' });
    token = res.body.token;
  });

  test('GET /api/categories - should return categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ... добавьте другие тесты
});
```

---

## БЫСТРАЯ ПРОВЕРКА ВСЕГО

Используйте скрипт `scripts/quickTest.js` (см. ниже)

```bash
node scripts/quickTest.js
```

Он проверит все основные endpoints и выведет отчёт.
