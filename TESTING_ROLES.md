# ПЛАН ТЕСТИРОВАНИЯ СИСТЕМЫ РОЛЕЙ

## БЫСТРАЯ ПРОВЕРКА (5 минут)

### 1. Проверка меню по ролям

**Тестовые сценарии:**

#### Admin (должен видеть всё):
- ✅ Главная
- ✅ Товары
- ✅ Поставщики
- ✅ Аналитика остатков
- ✅ Заявки
- ✅ Задания сборщиков
- ✅ Приёмка товара
- ✅ Пользователи
- ✅ Настройки

#### Purchase Manager (менеджер по закупкам):
- ✅ Главная
- ✅ Товары (+ может редактировать)
- ✅ Поставщики (+ может редактировать)
- ✅ Аналитика остатков
- ✅ Заявки
- ✅ Задания сборщиков
- ✅ Приёмка товара
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

#### Warehouse Operator (складской оператор):
- ✅ Главная
- ✅ Товары (только просмотр)
- ✅ Поставщики (только просмотр)
- ✅ Аналитика остатков
- ✅ Заявки (только просмотр)
- ❌ Задания сборщиков (не видит)
- ✅ Приёмка товара
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

#### Collector (сборщик):
- ✅ Главная
- ✅ Товары (только просмотр)
- ✅ Поставщики (только просмотр)
- ❌ Аналитика остатков (не видит)
- ❌ Заявки (не видит)
- ✅ Задания сборщиков (только свои)
- ❌ Приёмка товара (не видит)
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

#### Accountant (бухгалтер):
- ✅ Главная
- ✅ Товары (только просмотр)
- ✅ Поставщики (только просмотр)
- ✅ Аналитика остатков
- ✅ Заявки (только просмотр)
- ❌ Задания сборщиков (не видит)
- ❌ Приёмка товара (не видит)
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

#### Operator (оператор):
- ✅ Главная
- ✅ Товары (только просмотр)
- ✅ Поставщики (только просмотр)
- ❌ Аналитика остатков (не видит)
- ✅ Заявки (только просмотр)
- ❌ Задания сборщиков (не видит)
- ❌ Приёмка товара (не видит)
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

#### Driver (водитель):
- ✅ Главная
- ✅ Товары (только просмотр)
- ✅ Поставщики (только просмотр)
- ❌ Аналитика остатков (не видит)
- ❌ Заявки (не видит, или очень ограниченный просмотр)
- ❌ Задания сборщиков (не видит)
- ❌ Приёмка товара (не видит)
- ❌ Пользователи (не видит)
- ❌ Настройки (не видит)

---

### 2. Проверка кнопок редактирования на Dashboard

**Войти как Admin:**
- Перейти на Главную страницу
- ✅ Должна быть видна кнопка "Редактировать" у товаров
- ✅ Должна быть видна кнопка "Редактировать" у поставщиков

**Войти как Purchase Manager:**
- Перейти на Главную страницу
- ✅ Должна быть видна кнопка "Редактировать" у товаров
- ✅ Должна быть видна кнопка "Редактировать" у поставщиков

**Войти как Operator:**
- Перейти на Главную страницу
- ❌ НЕ должно быть кнопки "Редактировать" у товаров
- ❌ НЕ должно быть кнопки "Редактировать" у поставщиков

---

## ПОЛНОЕ ТЕСТИРОВАНИЕ API (20 минут)

### Подготовка:
1. Установить Postman или использовать curl
2. Получить JWT токены для всех ролей
3. Использовать переменные окружения в Postman

---

### 3. Тестирование Products API

#### 3.1. Создание товара

**Admin - должно работать:**
```bash
POST /api/products
Authorization: Bearer {admin_token}
Body: {
  "name": "Test Product",
  "internalName": "Тестовый товар",
  "kaspiName": "Test Product Kaspi",
  "kaspiArticle": "TEST-001",
  "sellingPrice": 1000
}

Ожидаемый результат: 201 Created
```

**Purchase Manager - должно работать:**
```bash
POST /api/products
Authorization: Bearer {purchase_manager_token}
Body: {...}

Ожидаемый результат: 201 Created
```

**Operator - НЕ должно работать:**
```bash
POST /api/products
Authorization: Bearer {operator_token}
Body: {...}

Ожидаемый результат: 403 Forbidden
{
  "success": false,
  "message": "Недостаточно прав для выполнения операции"
}
```

---

#### 3.2. Обновление товара

**Purchase Manager - должно работать:**
```bash
PUT /api/products/1
Authorization: Bearer {purchase_manager_token}
Body: {
  "sellingPrice": 1200
}

Ожидаемый результат: 200 OK
```

**Warehouse Operator - НЕ должно работать:**
```bash
PUT /api/products/1
Authorization: Bearer {warehouse_operator_token}
Body: {
  "sellingPrice": 1200
}

Ожидаемый результат: 403 Forbidden
```

---

#### 3.3. Обновление остатков

**Admin - должно работать:**
```bash
PUT /api/products/1/stock
Authorization: Bearer {admin_token}
Body: {
  "currentStock": 50
}

Ожидаемый результат: 200 OK
```

**Warehouse Operator - должно работать:**
```bash
PUT /api/products/1/stock
Authorization: Bearer {warehouse_operator_token}
Body: {
  "currentStock": 50
}

Ожидаемый результат: 200 OK
```

**Purchase Manager - НЕ должно работать:**
```bash
PUT /api/products/1/stock
Authorization: Bearer {purchase_manager_token}
Body: {
  "currentStock": 50
}

Ожидаемый результат: 403 Forbidden
```

---

### 4. Тестирование Suppliers API

**Purchase Manager - должно работать:**
```bash
POST /api/suppliers
Authorization: Bearer {purchase_manager_token}
Body: {
  "name": "New Supplier",
  "phone": "+77771234567",
  "address": "Almaty"
}

Ожидаемый результат: 201 Created
```

**Accountant - НЕ должно работать:**
```bash
POST /api/suppliers
Authorization: Bearer {accountant_token}
Body: {...}

Ожидаемый результат: 403 Forbidden
```

---

### 5. Тестирование Analytics API

#### 5.1. Доступ разрешён для 4 ролей

**Admin:**
```bash
GET /api/analytics/stock-analytics
Authorization: Bearer {admin_token}

Ожидаемый результат: 200 OK + данные аналитики
```

**Purchase Manager:**
```bash
GET /api/analytics/purchase-suggestions
Authorization: Bearer {purchase_manager_token}

Ожидаемый результат: 200 OK + рекомендации
```

**Accountant:**
```bash
GET /api/analytics/stock-overview
Authorization: Bearer {accountant_token}

Ожидаемый результат: 200 OK + обзор остатков
```

**Warehouse Operator:**
```bash
GET /api/analytics/low-stock
Authorization: Bearer {warehouse_operator_token}

Ожидаемый результат: 200 OK + товары с низким остатком
```

---

#### 5.2. Доступ запрещён для остальных

**Operator - НЕ должно работать:**
```bash
GET /api/analytics/stock-analytics
Authorization: Bearer {operator_token}

Ожидаемый результат: 403 Forbidden
```

**Driver - НЕ должно работать:**
```bash
GET /api/analytics/stock-analytics
Authorization: Bearer {driver_token}

Ожидаемый результат: 403 Forbidden
```

**Collector - НЕ должно работать:**
```bash
GET /api/analytics/stock-analytics
Authorization: Bearer {collector_token}

Ожидаемый результат: 403 Forbidden
```

---

### 6. Тестирование Categories API

**Purchase Manager - должно работать:**
```bash
POST /api/categories
Authorization: Bearer {purchase_manager_token}
Body: {
  "name": "New Category",
  "description": "Test"
}

Ожидаемый результат: 201 Created
```

**Warehouse Operator - НЕ должно работать:**
```bash
POST /api/categories
Authorization: Bearer {warehouse_operator_token}
Body: {...}

Ожидаемый результат: 403 Forbidden
```

---

### 7. Тестирование Warehouse API

**Warehouse Operator - должно работать:**
```bash
GET /api/warehouse/pending-receipts
Authorization: Bearer {warehouse_operator_token}

Ожидаемый результат: 200 OK + список заявок
```

**Collector - НЕ должно работать:**
```bash
POST /api/warehouse/receive/1
Authorization: Bearer {collector_token}
Body: {...}

Ожидаемый результат: 403 Forbidden
```

---

### 8. Тестирование Collector API

**Collector - должно работать:**
```bash
GET /api/collector/tasks
Authorization: Bearer {collector_token}

Ожидаемый результат: 200 OK + только свои задания
```

**Purchase Manager - должно работать:**
```bash
POST /api/collector/tasks
Authorization: Bearer {purchase_manager_token}
Body: {
  "orderId": 1,
  "assignedTo": 5
}

Ожидаемый результат: 201 Created
```

**Operator - НЕ должно работать:**
```bash
GET /api/collector/tasks
Authorization: Bearer {operator_token}

Ожидаемый результат: 403 Forbidden
```

---

## АВТОМАТИЗИРОВАННОЕ ТЕСТИРОВАНИЕ

### Postman Collection

Создать коллекцию с переменными окружения:

```json
{
  "environment": {
    "name": "CRM Testing",
    "values": [
      {
        "key": "base_url",
        "value": "http://localhost:5000/api"
      },
      {
        "key": "admin_token",
        "value": "{{LOGIN_ADMIN_AND_GET_TOKEN}}"
      },
      {
        "key": "purchase_manager_token",
        "value": "{{LOGIN_PM_AND_GET_TOKEN}}"
      },
      {
        "key": "warehouse_operator_token",
        "value": "{{LOGIN_WO_AND_GET_TOKEN}}"
      },
      {
        "key": "collector_token",
        "value": "{{LOGIN_COLLECTOR_AND_GET_TOKEN}}"
      },
      {
        "key": "accountant_token",
        "value": "{{LOGIN_ACCOUNTANT_AND_GET_TOKEN}}"
      },
      {
        "key": "operator_token",
        "value": "{{LOGIN_OPERATOR_AND_GET_TOKEN}}"
      },
      {
        "key": "driver_token",
        "value": "{{LOGIN_DRIVER_AND_GET_TOKEN}}"
      }
    ]
  }
}
```

---

## ПРОВЕРКА РЕЗУЛЬТАТОВ

### Чек-лист успешного тестирования:

- [ ] Меню фильтруется для всех 7 ролей
- [ ] Purchase Manager может редактировать товары и поставщиков
- [ ] Operator НЕ может редактировать товары и поставщиков
- [ ] Admin может создавать товары
- [ ] Purchase Manager может создавать товары
- [ ] Operator НЕ может создавать товары
- [ ] Warehouse Operator может обновлять остатки
- [ ] Purchase Manager НЕ может обновлять остатки
- [ ] Admin может удалять товары
- [ ] Purchase Manager НЕ может удалять товары
- [ ] Analytics доступна только 4 ролям
- [ ] Collector видит только свои задания
- [ ] Warehouse Operator может проводить приёмку

---

## ИЗВЕСТНЫЕ ПРОБЛЕМЫ

### Нет проблем! 🎉

Все исправления применены без ошибок:
```
✅ No errors found.
```

---

## ЛОГИ ДЛЯ МОНИТОРИНГА

### Что проверять в логах:

1. **403 Forbidden** - отказы в доступе (это нормально!)
   ```
   [INFO] User role 'operator' tried to access admin-only route
   [INFO] Access denied - insufficient permissions
   ```

2. **Успешные операции**
   ```
   [INFO] User role 'purchase_manager' created product ID 123
   [INFO] User role 'warehouse_operator' updated stock for product ID 45
   ```

3. **Подозрительная активность** (требует внимания!)
   ```
   [WARN] Multiple failed access attempts from user ID 7
   [WARN] User tried to elevate permissions
   ```

---

## КОНТАКТЫ

Если тесты не проходят:
1. Проверьте ROLE_SYSTEM_FIXES.md - там полная документация
2. Проверьте JWT токены - они могут истечь
3. Проверьте базу данных - роли пользователей должны быть правильно установлены
4. Очистите кэш браузера и перезайдите

---

**Дата:** 2025-01-11  
**Версия:** 1.0.0  
**Готово к тестированию:** ✅ ДА
