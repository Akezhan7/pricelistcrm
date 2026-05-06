# CRM — Фронтенд

React + TypeScript фронтенд для CRM-системы управления закупками и складом.

**Стек:** React 18, TypeScript, Tailwind CSS, Axios, React Router v6, Lucide React

---

## Быстрый старт

```bash
npm install
npm run dev
```

Откроется [http://localhost:3000](http://localhost:3000)

**Логин для входа:**
```
Email:  admin@example.com
Пароль: (любой)
```

---

## Режимы запуска

| Команда | Описание |
|---------|----------|
| `npm run dev` | Мок-сервер + фронт одновременно (**рекомендуется**) |
| `npm run mock` | Только мок-сервер на `localhost:5000` |
| `npm start` | Только фронт (нужен реальный бэк на `localhost:5000`) |
| `npm run build` | Продакшн-сборка |

---

## Мок-сервер

Папка `mock-server/` содержит локальный API-сервер на чистом Node.js — без дополнительных зависимостей. Запускается автоматически через `npm run dev`.

**Доступные данные:**
- 5 товаров с категориями, остатками и ценами
- 3 поставщика
- 2 заявки
- 3 пользователя (admin, operator, collector)

Данные находятся в `mock-server/data.js` — редактируй как нужно.

---

## Структура проекта

```
src/
  components/     # Переиспользуемые компоненты
  pages/          # Страницы (роуты)
  services/       # API-клиенты (по одному на ресурс)
  context/        # AuthContext
  types/          # TypeScript типы
  utils/          # api.ts (axios instance), helpers
mock-server/
  index.js        # Mock API сервер
  data.js         # Тестовые данные
```

---

## Подключение к реальному бэку

Прокси настроен в `package.json`:
```json
"proxy": "http://localhost:5000"
```

Запусти реальный бэк на порту `5000`, затем:
```bash
npm start
```

---

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `admin` | Полный доступ |
| `operator` | Заявки, товары, поставщики |
| `accountant` | Финансы, оплаты |
| `purchase_manager` | Закупки |
| `warehouse_operator` | Приёмка склада |
| `collector` | Задания на сбор |
| `driver` | Ограниченный доступ |

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
