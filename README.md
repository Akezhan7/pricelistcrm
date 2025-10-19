# CRM Система управления товарами и поставщиками

Веб-приложение с русским интерфейсом для внутреннего использования компании по управлению товарами и поставщиками.

## 🚀 Функциональность

### Управление товарами
- ✅ Список всех товаров с поиском по названию и артикулу
- ✅ Создание, редактирование и удаление товаров (для администраторов)
- ✅ Загрузка фотографий товаров
- ✅ Указание себестоимости и цены продажи
- ✅ Связывание товаров с поставщиками

### Управление поставщиками
- ✅ Карточки поставщиков с полной информацией
- ✅ Контактные данные с кнопками WhatsApp и звонка
- ✅ Фотографии контейнеров для ориентации
- ✅ Сортировка по цене (от меньшей к большей)
- ✅ Секторальное деление (игрушки, стройматериалы, посуда и т.д.)

### Система авторизации
- ✅ Регистрация и вход в систему с JWT токенами
- ✅ Роли пользователей: Администратор и Оператор
- ✅ Ограничение доступа в зависимости от роли

### Интерфейс
- ✅ Адаптивный дизайн с использованием TailwindCSS
- ✅ Левая колонка с товарами и поиском
- ✅ Правая часть с карточками поставщиков
- 🚧 Карта Bayside (в разработке)

## 🛠 Технические требования

### Backend
- Node.js + Express
- PostgreSQL база данных с Sequelize ORM
- JWT аутентификация
- Multer для загрузки файлов
- Полная валидация данных

### Frontend
- React с TypeScript
- TailwindCSS для стилизации
- React Router для навигации
- Axios для HTTP запросов
- Lucide React для иконок

## 📦 Установка и запуск

### Локальная разработка

#### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd crm3
```

#### 2. Установка зависимостей
```bash
cd server
npm run install-deps
```
Эта команда установит зависимости как для сервера, так и для клиента.

#### 3. Настройка окружения

**Backend (.env):**
```bash
cd server
cp .env.example .env
```

Обновите переменные в `server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm3_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your-generated-secret-key
CLIENT_URL=http://localhost:3000

DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

**Frontend (.env):**
```bash
cd client
cp .env.example .env
```

В `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

#### 4. Установка PostgreSQL

**Windows:**
1. Скачайте с https://www.postgresql.org/download/windows/
2. Установите и запомните пароль
3. Создайте БД через pgAdmin или SQL Shell

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb crm3_db
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb crm3_db
```

**Docker (самый простой):**
```bash
cd server
docker-compose up -d
```

#### 5. Инициализация базы данных
```bash
cd server
npm run init-db
```

#### 6. Запуск приложения
```bash
cd server
npm run dev
```

Приложение будет доступно:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health check:** http://localhost:5000/health

---

### 🚀 Production деплой

Полное руководство по развёртыванию на хостинге см. в **[DEPLOYMENT.md](./DEPLOYMENT.md)**

**Быстрый старт (Railway):**

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Добавьте PostgreSQL сервис
4. Настройте переменные окружения:
   ```env
   NODE_ENV=production
   JWT_SECRET=<сгенерированный-ключ-32-символа>
   CLIENT_URL=<URL-вашего-фронтенда>
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=<сильный-пароль>
   ```
5. Deploy!

**Другие хостинги:**
- Render.com (бесплатно)
- Vercel (только frontend)
- Heroku

Подробнее: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 👤 Вход в систему

### Администратор по умолчанию
- **Email:** admin@example.com
- **Пароль:** admin123

### Права доступа

**Администратор:**
- Полный доступ ко всем функциям
- Создание, редактирование и удаление товаров
- Создание, редактирование и удаление поставщиков
- Создание новых пользователей

**Оператор:**
- Просмотр товаров и поставщиков
- Поиск и фильтрация
- Связь через WhatsApp/телефон
- Просмотр карты

## 📝 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/register` - Регистрация
- `GET /api/auth/profile` - Получение профиля
- `PUT /api/auth/profile` - Обновление профиля

### Товары
- `GET /api/products` - Список товаров
- `GET /api/products/:id` - Получение товара
- `POST /api/products` - Создание товара (админ)
- `PUT /api/products/:id` - Обновление товара (админ)
- `DELETE /api/products/:id` - Удаление товара (админ)

### Поставщики
- `GET /api/suppliers` - Список поставщиков
- `GET /api/suppliers/:id` - Получение поставщика
- `GET /api/suppliers/sectors` - Список секторов
- `POST /api/suppliers` - Создание поставщика (админ)
- `PUT /api/suppliers/:id` - Обновление поставщика (админ)
- `DELETE /api/suppliers/:id` - Удаление поставщика (админ)

## 📁 Структура проекта

```
crm3/
├── client/                 # React приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── context/        # React контексты
│   │   ├── pages/          # Страницы приложения
│   │   ├── types/          # TypeScript типы
│   │   └── utils/          # Утилиты
├── server/                 # Express сервер
│   ├── controllers/        # Контроллеры API
│   ├── middleware/         # Middleware функции
│   ├── models/             # Модели базы данных
│   ├── routes/             # Маршруты API
│   ├── scripts/            # Скрипты (инициализация, миграция БД)
│   └── config/             # Конфигурация
├── uploads/                # Загруженные файлы
├── .env                    # Переменные окружения (не в Git)
├── .env.example            # Пример конфигурации
├── docker-compose.yml      # Docker конфигурация для PostgreSQL
└── README.md
```

## 🔧 Дополнительные скрипты

```bash
# Production запуск
npm start                    # Запуск только сервера в production режиме

# Разработка
npm run dev                  # Сервер + клиент одновременно
npm run server               # Только сервер (с hot reload)
npm run client               # Только клиент

# Сборка
npm run build                # Сборка клиента для production
npm run build:full           # Установка зависимостей + сборка клиента

# База данных
npm run init-db              # Инициализация БД и создание админа
npm run test-connection      # Проверка подключения к PostgreSQL
npm run migrate              # Миграция из SQLite в PostgreSQL

# Docker (опционально)
npm run docker:up            # Запуск PostgreSQL в Docker
npm run docker:down          # Остановка Docker контейнеров
npm run docker:logs          # Просмотр логов PostgreSQL

# Установка
npm run install-deps         # Установка зависимостей для сервера и клиента
npm run setup                # Полная настройка (установка + init-db)
```

## 📞 Особенности

### Кнопки связи с поставщиками
- **WhatsApp:** Автоматически открывает WhatsApp с номером поставщика
- **Звонок:** Инициирует звонок на телефон поставщика

### Загрузка изображений
- Поддерживаемые форматы: JPEG, PNG, GIF, WebP
- Максимальный размер: 5MB
- Автоматическое изменение размера имени файла
- В production рекомендуется использовать Cloudinary

### Безопасность
- JWT токены с истечением срока действия (7 дней)
- Bcrypt хеширование паролей (salt 10)
- Валидация всех входных данных
- Rate limiting для API (100 req/15min в production)
- Строгий rate limit для аутентификации (5 попыток/15min)
- CORS защита с whitelist доменов
- Helmet для дополнительной безопасности HTTP заголовков
- Compression для оптимизации трафика

### Health Check
- Endpoint `/health` для мониторинга состояния сервиса
- Проверка подключения к базе данных
- Информация о uptime и окружении

### Production Ready
- ✅ Graceful shutdown при SIGTERM/SIGINT
- ✅ Проверка обязательных переменных окружения
- ✅ Автоматический serving клиента в production
- ✅ Оптимизированный CORS для production
- ✅ Улучшенное логирование и обработка ошибок

## 🚧 Планы развития

- [ ] Интерактивная карта Bayside с расположением контейнеров
- [ ] Система уведомлений
- [ ] Экспорт данных в Excel
- [ ] Мобильное приложение
- [ ] Интеграция с внешними системами
- [ ] Аналитика и отчеты

## 🤝 Поддержка

При возникновении проблем или вопросов создайте issue в репозитории проекта.

---

**Автор:** CRM Team  
**Версия:** 1.0.0  
**Лицензия:** MIT
