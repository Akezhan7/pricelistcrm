# 🚀 Руководство по деплою CRM системы

Это полное руководство по развёртыванию приложения на различных хостинг-платформах.

---

## 📋 Содержание

1. [Подготовка к деплою](#подготовка-к-деплою)
2. [Вариант 1: Railway (рекомендуется)](#вариант-1-railway-рекомендуется)
3. [Вариант 2: Render + Vercel (бесплатно)](#вариант-2-render--vercel-бесплатно)
4. [Вариант 3: Vercel + Neon PostgreSQL](#вариант-3-vercel--neon-postgresql)
5. [Настройка базы данных](#настройка-базы-данных)
6. [Настройка переменных окружения](#настройка-переменных-окружения)
7. [Проверка работоспособности](#проверка-работоспособности)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Подготовка к деплою

### Шаг 1: Генерация сильного JWT секрета

```bash
# В терминале выполните:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Скопируйте результат - это будет ваш `JWT_SECRET` для production.

### Шаг 2: Выбор сильного пароля администратора

Вместо `admin123` используйте сильный пароль (минимум 12 символов, буквы, цифры, спецсимволы).

### Шаг 3: Коммит изменений

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## 🚂 Вариант 1: Railway (рекомендуется)

**Преимущества:**
- ✅ Автоматическое развёртывание из GitHub
- ✅ Встроенная PostgreSQL база данных
- ✅ Бесплатно $5/месяц кредитов
- ✅ Поддержка файлов (uploads)

### Деплой Backend + Frontend вместе

1. **Зарегистрируйтесь на [Railway.app](https://railway.app)**

2. **Создайте новый проект:**
   - "New Project" → "Deploy from GitHub repo"
   - Выберите ваш репозиторий
   - Railway автоматически определит Node.js проект

3. **Добавьте PostgreSQL:**
   - В проекте нажмите "+ New"
   - Выберите "Database" → "Add PostgreSQL"
   - Railway создаст базу данных и сгенерирует `DATABASE_URL`

4. **Настройте переменные окружения:**
   
   Перейдите в настройки сервиса → Variables:

   ```env
   NODE_ENV=production
   PORT=5000
   
   # PostgreSQL (Railway автоматически добавит DATABASE_URL)
   # Либо используйте отдельные переменные:
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   
   # JWT (используйте сгенерированный ключ!)
   JWT_SECRET=ваш-сгенерированный-секрет-32-символа-минимум
   JWT_EXPIRES_IN=7d
   
   # CORS (укажите домен вашего фронтенда)
   CLIENT_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   
   # Загрузка файлов
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=5000000
   
   # Администратор
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=ваш-сильный-пароль
   DEFAULT_ADMIN_NAME=Администратор
   ```

5. **Настройте команды запуска:**
   
   В Settings → Deploy:
   - **Build Command:** `npm run build:full`
   - **Start Command:** `npm start`
   - **Root Directory:** `server`

6. **Инициализация базы данных:**
   
   После первого деплоя выполните в Railway CLI или через Railway Shell:
   ```bash
   npm run init-db
   ```

7. **Получите публичный URL:**
   - Settings → Networking → Generate Domain
   - Ваше приложение будет доступно по адресу `https://your-app.up.railway.app`

8. **Обновите CLIENT_URL:**
   - Скопируйте полученный домен
   - Обновите переменную `CLIENT_URL` на этот домен

---

## 🎨 Вариант 2: Render + Vercel (бесплатно)

**Преимущества:**
- ✅ Полностью бесплатно (с ограничениями)
- ✅ Разделённый деплой frontend и backend
- ✅ Автоматический SSL сертификат

### Шаг 2.1: Деплой Backend на Render

1. **Зарегистрируйтесь на [Render.com](https://render.com)**

2. **Создайте PostgreSQL базу данных:**
   - Dashboard → "New +" → "PostgreSQL"
   - Выберите бесплатный план (Free)
   - Задайте имя: `crm3-db`
   - Скопируйте **Internal Database URL**

3. **Создайте Web Service:**
   - Dashboard → "New +" → "Web Service"
   - Подключите GitHub репозиторий
   - Настройки:
     - **Name:** `crm3-backend`
     - **Root Directory:** `server`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free

4. **Настройте переменные окружения:**
   
   В разделе "Environment":

   ```env
   NODE_ENV=production
   PORT=5000
   
   # PostgreSQL (вставьте Internal Database URL)
   DATABASE_URL=postgresql://user:password@host:5432/crm3_db
   # ИЛИ отдельно:
   DB_HOST=dpg-xxxxx-xxx.oregon-postgres.render.com
   DB_PORT=5432
   DB_NAME=crm3_db
   DB_USER=crm3_user
   DB_PASSWORD=ваш-пароль-от-render
   
   # JWT
   JWT_SECRET=ваш-сгенерированный-секрет-минимум-32-символа
   JWT_EXPIRES_IN=7d
   
   # CORS (укажите после деплоя фронтенда)
   CLIENT_URL=https://your-frontend.vercel.app
   
   # Файлы
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=5000000
   
   # Администратор
   DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
   DEFAULT_ADMIN_PASSWORD=сильный-пароль
   DEFAULT_ADMIN_NAME=Администратор
   ```

5. **Сохраните и задеплойте**

6. **Инициализация БД:**
   - Shell → `npm run init-db`

7. **Получите URL backend:**
   - Например: `https://crm3-backend.onrender.com`

### Шаг 2.2: Деплой Frontend на Vercel

1. **Зарегистрируйтесь на [Vercel.com](https://vercel.com)**

2. **Импортируйте проект:**
   - "Add New" → "Project"
   - Импортируйте из GitHub
   - **Root Directory:** `client`
   - **Framework Preset:** Create React App

3. **Настройте переменные окружения:**
   
   В "Environment Variables":

   ```env
   REACT_APP_API_URL=https://crm3-backend.onrender.com/api
   ```

4. **Deploy**

5. **Обновите CLIENT_URL на Render:**
   - Скопируйте URL Vercel (например: `https://crm3.vercel.app`)
   - Вернитесь в Render → Backend → Environment
   - Обновите `CLIENT_URL=https://crm3.vercel.app`
   - Сохраните и перезапустите сервис

---

## ☁️ Вариант 3: Vercel + Neon PostgreSQL

**Для backend не подойдёт Vercel** (только serverless functions, нет постоянного процесса).

Используйте **Render** или **Railway** для backend.

---

## 🗄️ Настройка базы данных

### Автоматическая инициализация

После деплоя выполните на сервере:

```bash
npm run init-db
```

Это создаст:
- Все таблицы
- Связи между моделями
- Администратора по умолчанию

### Ручная инициализация (если скрипт не работает)

Подключитесь к PostgreSQL и выполните:

```sql
CREATE DATABASE crm3_db;
CREATE USER crm3_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crm3_db TO crm3_user;
```

---

## 🔐 Настройка переменных окружения

### Обязательные переменные для Backend

| Переменная | Описание | Пример |
|------------|----------|--------|
| `NODE_ENV` | Окружение | `production` |
| `PORT` | Порт сервера | `5000` |
| `DB_HOST` | Хост PostgreSQL | `dpg-xxx.oregon-postgres.render.com` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_NAME` | Имя базы данных | `crm3_db` |
| `DB_USER` | Пользователь БД | `crm3_user` |
| `DB_PASSWORD` | Пароль БД | `secure_password` |
| `JWT_SECRET` | JWT секрет (32+ символов) | `a1b2c3d4e5f6...` |
| `CLIENT_URL` | URL фронтенда | `https://your-app.vercel.app` |

### Обязательные переменные для Frontend

| Переменная | Описание | Пример |
|------------|----------|--------|
| `REACT_APP_API_URL` | URL backend API | `https://your-backend.railway.app/api` |

---

## ✅ Проверка работоспособности

### 1. Проверка Backend

```bash
# Health check
curl https://your-backend-url.com/health

# Ожидаемый ответ:
{
  "status": "healthy",
  "timestamp": "2025-10-20T...",
  "uptime": 123.456,
  "environment": "production",
  "database": "connected",
  "version": "1.0.0"
}
```

### 2. Проверка API

```bash
# Проверка базового endpoint
curl https://your-backend-url.com/api

# Тест входа
curl -X POST https://your-backend-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}'
```

### 3. Проверка Frontend

Откройте `https://your-frontend-url.com` в браузере:

- ✅ Страница логина загружается
- ✅ Можно войти с учёткой администратора
- ✅ API запросы работают (проверить в DevTools → Network)
- ✅ Изображения загружаются

---

## 🐛 Troubleshooting

### Проблема: "CORS error"

**Решение:**
- Убедитесь что `CLIENT_URL` в backend точно совпадает с URL фронтенда
- Проверьте что URL указан БЕЗ слеша в конце
- Перезапустите backend после изменения переменных

### Проблема: "Database connection failed"

**Решение:**
- Проверьте что PostgreSQL запущен
- Убедитесь что все `DB_*` переменные заданы правильно
- Проверьте что IP хостинга добавлен в whitelist БД (для облачных БД)
- Попробуйте использовать `DATABASE_URL` вместо отдельных переменных

### Проблема: "Cannot find module"

**Решение:**
```bash
# Очистите кэш и переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Unauthorized" при каждом запросе

**Решение:**
- Проверьте что `JWT_SECRET` одинаковый между перезапусками
- Очистите localStorage в браузере
- Войдите заново

### Проблема: "Health check returns 503"

**Решение:**
- База данных не подключена или недоступна
- Проверьте логи: `Database connection error`
- Проверьте переменные подключения к БД

### Проблема: Файлы (uploads) не сохраняются

**Решение для Render/Railway (ephemeral storage):**

1. **Используйте Cloudinary для изображений:**

   Установите пакет:
   ```bash
   npm install cloudinary multer-storage-cloudinary
   ```

   Обновите `server/middleware/upload.js`:
   ```javascript
   const cloudinary = require('cloudinary').v2;
   const { CloudinaryStorage } = require('multer-storage-cloudinary');

   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
   });

   const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: {
       folder: 'crm3-uploads',
       allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
     },
   });
   ```

   Добавьте переменные окружения:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. **Альтернатива: AWS S3 или Vercel Blob**

---

## 📊 Мониторинг и логи

### Просмотр логов

**Railway:**
```bash
# В Railway dashboard → Deployments → View Logs
```

**Render:**
```bash
# В Render dashboard → Logs
```

### Настройка алертов

Рекомендуется использовать:
- **Sentry.io** - для отслеживания ошибок
- **LogRocket** - для мониторинга фронтенда
- **UptimeRobot** - для проверки доступности

---

## 🔄 Обновление приложения

### Автоматический деплой (рекомендуется)

1. Сделайте изменения в коде
2. Закоммитьте:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
   ```
3. Railway/Render/Vercel автоматически задеплоят новую версию

### Ручной деплой

**Railway CLI:**
```bash
railway up
```

**Render:**
- Dashboard → Manual Deploy → "Deploy latest commit"

---

## 📈 Оптимизация для production

### 1. Включите gzip compression (уже добавлено)

### 2. Настройте CDN для статических файлов

### 3. Включите кэширование

В `server/index.js` можно добавить:
```javascript
app.use('/uploads', express.static('uploads', {
  maxAge: '7d', // Кэш на 7 дней
  etag: true
}));
```

### 4. Минимизируйте логи в production

В `.env`:
```env
DB_LOGGING=false
```

---

## 🎯 Чек-лист перед деплоем

- [ ] Сгенерирован сильный `JWT_SECRET`
- [ ] Изменён пароль администратора
- [ ] Проверены все переменные окружения
- [ ] `NODE_ENV=production` установлен
- [ ] `CLIENT_URL` указывает на фронтенд
- [ ] `REACT_APP_API_URL` указывает на backend
- [ ] PostgreSQL база данных создана
- [ ] Выполнен `npm run init-db`
- [ ] `/health` endpoint возвращает 200
- [ ] Можно войти в систему
- [ ] CORS настроен правильно
- [ ] Загрузка изображений работает

---

## 💡 Рекомендации

1. **Используйте переменные окружения** для всех конфиденциальных данных
2. **Регулярно создавайте бэкапы БД** (Railway и Render делают это автоматически)
3. **Мониторьте логи** на предмет ошибок
4. **Используйте HTTPS** (хостинги предоставляют автоматически)
5. **Настройте домен** вместо стандартных URL хостингов

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте секцию [Troubleshooting](#troubleshooting)
2. Посмотрите логи приложения
3. Проверьте `/health` endpoint
4. Создайте issue в репозитории проекта

---

**Удачного деплоя! 🚀**
