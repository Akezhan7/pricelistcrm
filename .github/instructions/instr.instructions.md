---
applyTo: '**'
---
к# 🤖 AI Project Guide - CRM система управления товарами и поставщиками

## 🎯 Суть проекта
Веб-приложение для управления товарами и поставщиками на оптовом рынке. Позволяет отслеживать товары, цены, поставщиков, местоположение контейнеров и упрощает коммуникацию.

## 🏗️ Архитектура
**Клиент-сервер:**
- **Frontend:** React 19 + TypeScript + TailwindCSS (порт 3000)
- **Backend:** Node.js + Express REST API (порт 5000)
- **БД:** PostgreSQL + Sequelize ORM

## 🛠️ Технологический стек

### Backend
- Express.js, PostgreSQL, Sequelize ORM
- JWT + bcrypt (аутентификация)
- multer (загрузка файлов)
- helmet, cors, rate-limit (безопасность)
- express-validator (валидация)

### Frontend
- React 19, TypeScript, React Router
- TailwindCSS, lucide-react (иконки)
- axios (HTTP клиент)

## 📁 Структура проекта

```
crm3/
├── server/                      # Backend
│   ├── index.js                 # Точка входа Express
│   ├── config/database.js       # Конфигурация Sequelize
│   ├── controllers/             # Контроллеры (auth, product, supplier)
│   ├── middleware/              # Middleware (auth, upload)
│   ├── models/                  # Модели БД (User, Product, Supplier, etc)
│   ├── routes/                  # API маршруты
│   ├── scripts/                 # Скрипты БД (init, recreate)
│   └── uploads/                 # Загруженные изображения
└── client/                      # Frontend
    ├── src/
    │   ├── App.tsx              # Роутинг
    │   ├── pages/               # Страницы (Dashboard, Login, Register)
    │   ├── components/          # Компоненты UI
    │   ├── context/             # AuthContext
    │   ├── services/            # API сервисы
    │   ├── types/               # TypeScript типы
    │   └── utils/               # Утилиты (api, image)
    └── public/
```

## 🗄️ Основные модели БД

### Users
- id, name, email, password (bcrypt), role (admin/operator), isActive

### Products
- id, name, article (unique), costPrice, sellingPrice, image, description, isActive
- **Связи:** belongsToMany Supplier (через ProductSupplier), hasMany ProductVariation

### Suppliers
- id, name, address, phone, whatsapp, containerImage, sector, row, debt, sectorId, rowId, isActive
- **Связи:** belongsToMany Product, belongsTo Sector, belongsTo Row

### ProductSupplier (связь M:N)
- id, productId, supplierId, supplierPrice, quantity, isAvailable, notes
- **Индекс:** UNIQUE(product_id, supplier_id)

### ProductVariation
- id, productId, name, value, price, costPrice, sku (unique), isActive, sortOrder

### Sector / Row (карта рынка)
- Sector: id, name, code, productType, color, icon, position (JSON), rowsCount
- Row: id, sectorId, name, code, totalSpaces, occupiedSpaces, position (JSON)
- **Связи:** Sector hasMany Row (CASCADE DELETE)

## 🔐 Безопасность

### Аутентификация
- JWT токены (срок: 7 дней, localStorage на клиенте)
- Bcrypt хеширование паролей (salt 10)

### Авторизация (роли)
- **admin:** полный доступ (CRUD всех сущностей)
- **operator:** только просмотр и поиск

### Middleware
- `auth.js` - проверка JWT, загрузка user
- `requireRole()` - проверка роли
- helmet, cors, rate-limit (100 req/15min)
- express-validator на всех маршрутах

## 🔄 API Endpoints

### Auth (`/api/auth`)
- POST `/login` - вход (email, password) → JWT
- POST `/register` - регистрация
- GET `/profile` - текущий пользователь (Auth)

### Products (`/api/products`)
- GET `/` - список (Auth, поиск, пагинация)
- GET `/:id` - товар по ID (Auth)
- POST `/` - создание (Admin, + upload)
- PUT `/:id` - обновление (Admin)
- DELETE `/:id` - удаление (Admin, soft delete)

**Поставщики товара:**
- POST `/:productId/suppliers` - добавить поставщика (Admin)
- PUT `/:productId/suppliers/:supplierId` - обновить связь (Admin)
- DELETE `/:productId/suppliers/:supplierId` - удалить связь (Admin)

**Вариации товара:**
- GET `/:productId/variations` - список вариаций (Auth)
- POST `/:productId/variations` - создать вариацию (Admin)
- PUT `/:productId/variations/:variationId` - обновить (Admin)
- DELETE `/:productId/variations/:variationId` - удалить (Admin)

### Suppliers (`/api/suppliers`)
- GET `/` - список (Auth, фильтры)
- GET `/:id` - поставщик по ID (Auth)
- POST `/` - создание (Admin, + upload)
- PUT `/:id` - обновление (Admin)
- DELETE `/:id` - удаление (Admin)

### Sectors/Rows (`/api/sectors`, `/api/rows`)
- Стандартные CRUD для секторов и рядов
- GET `/api/sectors` включает ряды и поставщиков (eager loading)

**Формат ответов:**
```json
{
  "success": true/false,
  "data": {...} / "message": "error"
}
```

## 🎨 UI компоненты

### Основные страницы
- **Dashboard:** главная (список товаров + карточки поставщиков, соотношение 1/3 и 2/3)
- **Login/Register:** аутентификация
- **BaysideMap:** интерактивная карта рынка (секторы, ряды, контейнеры)

### Ключевые компоненты
- **Header:** поиск, кнопки "Карта", "Обновить", профиль, выход
- **ProductList:** список товаров с фото, поиск, кнопки управления (👥 поставщики, ⚙️ вариации, ✏️ редактирование, 🗑️ удаление)
- **SupplierCards:** карточки поставщиков с фото контейнера, телефон, WhatsApp, задолженность, цена товара

### Модальные окна
- CreateProductModal, EditProductModal
- CreateSupplierModal, EditSupplierModal
- ProductSuppliersModal (управление связями товар-поставщик)
- ProductVariationsModal (управление вариациями)
- DeleteConfirmModal

## 🔧 Конфигурация (.env)

```env
# База данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm3_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Сервер
PORT=5000
CLIENT_URL=http://localhost:3000

# Файлы
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5000000

# Администратор
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

## 🚀 Установка и запуск

```bash
# 1. Установка зависимостей
npm run install-deps

# 2. Создать .env с переменными выше

# 3. Запустить PostgreSQL (Docker или локально)
docker-compose up -d  # или установите PostgreSQL вручную

# 4. Инициализация БД (создает таблицы + админа)
npm run init-db

# 5. Запуск (сервер + клиент одновременно)
npm run dev
```

**Доступ:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api
- Админ: admin@example.com / admin123

## 📝 Ключевые особенности

1. **Раздельное управление связями:** товар создается БЕЗ поставщиков, добавляются явно через кнопку 👥
2. **Система вариаций:** один товар → много вариаций (размеры, цвета) с разными ценами
3. **Интерактивная карта:** визуализация рынка Bayside (секторы, ряды, контейнеры, фото)
4. **Быстрая коммуникация:** WhatsApp и телефон из карточек поставщиков
5. **Контроль доступа:** admin/operator роли, защита маршрутов
6. **Автосортировка:** поставщики товара сортируются по цене (от меньшей)

## 🐛 Частые проблемы и решения

### Ошибки БД
- **Sequelize ошибки:** проверить `associations.js` (правильные foreignKey)
- **Индексы:** использовать snake_case (`product_id`, не `productId`) в indexes
- **Op не импортирован:** добавить `const { DataTypes, Op } = require('sequelize');`

### API ошибки
- **401 Unauthorized:** проверить JWT токен в localStorage
- **403 Forbidden:** недостаточно прав (нужна роль admin)
- **404 Not Found:** проверить маршруты в `routes/`
- **500 Server Error:** проверить логи сервера

### Файлы
- **Изображения не загружаются:** проверить `uploads/` директорию и Multer конфигурацию
- **MAX_FILE_SIZE:** по умолчанию 5MB

## 🎯 Основные бизнес-процессы

### Добавление товара с поставщиками
1. Создать товар (без поставщиков)
2. Нажать 👥 "Управление поставщиками"
3. Добавить поставщиков из списка
4. Указать цену, количество, заметки для каждого
5. Сохранить

### Поиск дешевого поставщика
1. Ввести название/артикул в поиск
2. Выбрать товар → показываются ЕГО поставщики
3. Автоматическая сортировка по цене (от меньшей)
4. Связаться через WhatsApp/звонок

### Работа с вариациями
1. Открыть ⚙️ "Управление вариациями"
2. Создать вариации (XL, L, M)
3. Указать цену для каждой
4. Опционально: SKU, порядок сортировки

## 🔍 Важные детали реализации

### Middleware pipeline
```
Request → Rate Limiter → CORS → JSON Parser → Auth → Role Check → Validator → Controller
```

### Мягкое удаление (Soft Delete)
```javascript
// Вместо destroy()
await Product.update({ isActive: false }, { where: { id } });
```

### Axios interceptor (Frontend)
```typescript
// Автоматическое добавление JWT токена
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### AuthContext (React)
Глобальное состояние: `user`, `token`, `login()`, `register()`, `logout()`

### Protected Routes
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```
Перенаправляет на `/login` если не авторизован.
