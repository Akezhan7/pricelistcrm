# API спецификация для модуля заявок (Этап 2)

## Базовый URL
```
http://localhost:5000/api
```

## Аутентификация
Все endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

---

## Endpoints для заявок

### 1. Получить список заявок
```http
GET /orders
```

**Query параметры:**
- `page` (number, optional) - номер страницы (по умолчанию: 1)
- `limit` (number, optional) - количество на странице (по умолчанию: 20)
- `status` (string, optional) - фильтр по статусу ("В работе", "На точке", "В пути", "На складе")
- `paymentStatus` (string, optional) - фильтр по статусу оплаты
- `supplierId` (number, optional) - фильтр по поставщику
- `dateFrom` (date, optional) - фильтр по дате (от)
- `dateTo` (date, optional) - фильтр по дате (до)
- `search` (string, optional) - поиск по номеру заявки

**Ответ:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "orderNumber": "ORD-2025-0001",
        "supplierId": 5,
        "supplier": {
          "id": 5,
          "name": "ТОО Компания",
          "phone": "+77001234567"
        },
        "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
        "deliveryLocation": "Точка Байсад",
        "totalAmount": "125000.00",
        "paidAmount": "50000.00",
        "status": "В работе",
        "paymentStatus": "Частично оплачено",
        "notes": "Срочная заявка",
        "createdBy": 1,
        "creator": {
          "id": 1,
          "name": "Иван Иванов"
        },
        "isActive": true,
        "createdAt": "2025-10-14T12:00:00.000Z",
        "updatedAt": "2025-10-14T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "pages": 3,
      "limit": 20
    },
    "stats": {
      "inProgress": 15,
      "atLocation": 10,
      "inTransit": 8,
      "atWarehouse": 12,
      "totalAmount": "5600000.00",
      "totalPaid": "3200000.00",
      "totalDebt": "2400000.00"
    }
  }
}
```

**Доступ:** Все роли

---

### 2. Получить детальную информацию о заявке
```http
GET /orders/:id
```

**Параметры URL:**
- `id` (number, required) - ID заявки

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2025-0001",
    "supplierId": 5,
    "supplier": {
      "id": 5,
      "name": "ТОО Компания",
      "address": "Юсуф, 24 ряд",
      "phone": "+77001234567",
      "whatsapp": "+77001234567"
    },
    "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
    "deliveryLocation": "Точка Байсад",
    "totalAmount": "125000.00",
    "paidAmount": "50000.00",
    "status": "В работе",
    "paymentStatus": "Частично оплачено",
    "notes": "Срочная заявка",
    "createdBy": 1,
    "creator": {
      "id": 1,
      "name": "Иван Иванов",
      "email": "ivan@example.com"
    },
    "items": [
      {
        "id": 1,
        "productId": 10,
        "product": {
          "id": 10,
          "name": "Товар А",
          "article": "ART-001",
          "image": "/uploads/products/image.jpg"
        },
        "quantity": 50,
        "priceAtPurchase": "2500.00",
        "totalPrice": "125000.00",
        "notes": null
      }
    ],
    "statusHistory": [
      {
        "id": 1,
        "oldStatus": null,
        "newStatus": "В работе",
        "changedBy": 1,
        "changer": {
          "id": 1,
          "name": "Иван Иванов"
        },
        "comment": "Заявка создана",
        "changedAt": "2025-10-14T12:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2025-10-14T12:00:00.000Z",
    "updatedAt": "2025-10-14T12:00:00.000Z"
  }
}
```

**Доступ:** Все роли

---

### 3. Создать новую заявку
```http
POST /orders
```

**Тело запроса:**
```json
{
  "supplierId": 5,
  "expectedDeliveryDate": "2025-10-20",
  "deliveryLocation": "Точка Байсад",
  "notes": "Срочная заявка",
  "items": [
    {
      "productId": 10,
      "quantity": 50,
      "priceAtPurchase": 2500,
      "notes": "Размер L"
    },
    {
      "productId": 15,
      "quantity": 30,
      "priceAtPurchase": 1200
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2025-0001",
    "supplierId": 5,
    "expectedDeliveryDate": "2025-10-20T00:00:00.000Z",
    "deliveryLocation": "Точка Байсад",
    "totalAmount": "161000.00",
    "paidAmount": "0.00",
    "status": "В работе",
    "paymentStatus": "Не оплачено",
    "notes": "Срочная заявка",
    "createdBy": 1,
    "isActive": true,
    "createdAt": "2025-10-14T12:00:00.000Z",
    "updatedAt": "2025-10-14T12:00:00.000Z"
  },
  "message": "Заявка успешно создана"
}
```

**Валидация:**
- `supplierId` - обязательно, должен существовать
- `items` - обязательно, минимум 1 товар
- `items[].productId` - обязательно, должен существовать
- `items[].quantity` - обязательно, > 0
- `items[].priceAtPurchase` - обязательно, >= 0

**Доступ:** admin, purchase_manager

---

### 4. Обновить заявку
```http
PUT /orders/:id
```

**Параметры URL:**
- `id` (number, required) - ID заявки

**Тело запроса:**
```json
{
  "expectedDeliveryDate": "2025-10-25",
  "deliveryLocation": "Склад Байсад",
  "notes": "Обновленные заметки",
  "items": [
    {
      "id": 1,
      "quantity": 60,
      "priceAtPurchase": 2400
    },
    {
      "productId": 20,
      "quantity": 10,
      "priceAtPurchase": 3000
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "data": { /* обновленная заявка */ },
  "message": "Заявка успешно обновлена"
}
```

**Ограничения:**
- Можно редактировать только если статус = "В работе"
- Нельзя менять поставщика
- Автоматический пересчет totalAmount

**Доступ:** admin, purchase_manager

---

### 5. Изменить статус заявки
```http
PATCH /orders/:id/status
```

**Параметры URL:**
- `id` (number, required) - ID заявки

**Тело запроса:**
```json
{
  "status": "На точке",
  "comment": "Товар прибыл на точку"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "order": { /* обновленная заявка */ },
    "statusHistory": { /* новая запись истории */ }
  },
  "message": "Статус заявки изменен"
}
```

**Правила смены статусов:**
1. "В работе" → "На точке" (admin, purchase_manager)
2. "На точке" → "В пути" (admin, purchase_manager, driver)
3. "В пути" → "На складе" (admin, warehouse_operator, driver)
4. Нельзя вернуться на предыдущий статус

**Доступ:** зависит от статуса (см. правила выше)

---

### 6. Удалить заявку (мягкое удаление)
```http
DELETE /orders/:id
```

**Параметры URL:**
- `id` (number, required) - ID заявки

**Ответ:**
```json
{
  "success": true,
  "message": "Заявка успешно удалена"
}
```

**Ограничения:**
- Можно удалить только если статус = "В работе" и paymentStatus = "Не оплачено"
- Физически не удаляется, только isActive = false

**Доступ:** admin

---

## Коды ошибок

### 400 Bad Request
```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": [
    {
      "field": "supplierId",
      "message": "Поставщик не найден"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Требуется авторизация"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Недостаточно прав для выполнения операции"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Заявка не найдена"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Невозможно изменить статус. Текущий статус: На складе"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Внутренняя ошибка сервера"
}
```

---

## Автогенерация номера заявки

**Формат:** `ORD-YYYY-NNNN`

Где:
- `ORD` - префикс
- `YYYY` - текущий год
- `NNNN` - порядковый номер (4 цифры с ведущими нулями)

**Примеры:**
- ORD-2025-0001
- ORD-2025-0002
- ...
- ORD-2025-9999
- ORD-2026-0001

**Логика:**
```javascript
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  
  // Найти последнюю заявку текущего года
  const lastOrder = await Order.findOne({
    where: {
      orderNumber: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['createdAt', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}
```

---

## Middleware для проверки прав

**Файл:** `server/middleware/checkRole.js`

```javascript
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения операции'
      });
    }
    
    next();
  };
};

module.exports = checkRole;
```

**Использование:**
```javascript
const checkRole = require('../middleware/checkRole');

router.post('/', 
  auth, 
  checkRole(['admin', 'purchase_manager']), 
  createOrder
);
```

---

## Примеры использования

### Создание заявки (JavaScript)
```javascript
const createOrder = async (orderData) => {
  try {
    const response = await axios.post('/api/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка создания заявки:', error.response.data);
    throw error;
  }
};

// Использование
const newOrder = await createOrder({
  supplierId: 5,
  expectedDeliveryDate: '2025-10-20',
  items: [
    { productId: 10, quantity: 50, priceAtPurchase: 2500 }
  ]
});
```

### Смена статуса (JavaScript)
```javascript
const changeOrderStatus = async (orderId, newStatus, comment) => {
  try {
    const response = await axios.patch(
      `/api/orders/${orderId}/status`,
      { status: newStatus, comment },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Ошибка смены статуса:', error.response.data);
    throw error;
  }
};
```

---

## Следующие шаги для реализации

1. ✅ Создать контроллер `server/controllers/orderController.js`
2. ✅ Создать роуты `server/routes/orders.js`
3. ✅ Создать middleware `server/middleware/checkRole.js`
4. ✅ Добавить валидацию с помощью express-validator
5. ✅ Подключить роуты в `server/index.js`
6. ✅ Протестировать все endpoints

**Готово к реализации!** 🚀
