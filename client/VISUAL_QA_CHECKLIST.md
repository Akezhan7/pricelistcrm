# Visual QA Checklist — Plastkrep CRM V2

> **Версия:** Visual V2 (post V12)  
> **Дата:** 7 июня 2026  
> **Breakpoints:** 375px (mobile) · 768px (tablet) · 1280px (desktop)  
> **Связанные документы:** [`VISUAL_REDESIGN_ROADMAP.md`](./VISUAL_REDESIGN_ROADMAP.md) · [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) · [`src/DESIGN_V2.md`](./src/DESIGN_V2.md)

---

## Визуальные критерии (глобально)

- [ ] Шрифт **Inter** на всех экранах (не system UI)
- [ ] Фон приложения — `surface-page` (#FAFAFA), не `gray-50`
- [ ] Заголовки — `text-brand-black`, вторичный текст — `text-text-muted`
- [ ] **Primary CTA** — жёлтый `Button variant="primary"` (max 1 на экран / modal)
- [ ] **Нет** `bg-blue-600` на primary CTA (grep audit)
- [ ] Selected rows/cards — `surface-accent` + жёлтый акцент, не `blue-50/blue-500`
- [ ] Stat cards — нейтральные, без rainbow borders (purple/indigo/teal)
- [ ] Интерактивные элементы — `transition-colors duration-200`
- [ ] Карточки с hover lift — `transition-shadow duration-200`
- [ ] Focus visible — `ring-2 ring-brand-yellow ring-offset-2`
- [ ] Touch targets ≥ 44px на mobile

---

## Маршруты (16) — визуальная проверка

| # | Маршрут | 375px | 768px | 1280px | V2 проверить |
|---|---------|-------|-------|--------|--------------|
| 1 | `/login` | ☐ | ☐ | ☐ | AuthLayout, yellow submit, accent links |
| 2 | `/register` | ☐ | ☐ | ☐ | AuthLayout + info Alert, валидация |
| 3 | `/dashboard` | ☐ | ☐ | ☐ | Split panels, step tabs mobile |
| 4 | `/orders` | ☐ | ☐ | ☐ | StatCard strip, FilterChips, yellow CTA |
| 5 | `/orders/:id` | ☐ | ☐ | ☐ | Status hero, sticky action bar mobile |
| 6 | `/products` | ☐ | ☐ | ☐ | ProductListItem V2, inset search |
| 7 | `/suppliers` | ☐ | ☐ | ☐ | Supplier cards V2, grid spacing |
| 8 | `/suppliers/:id` | ☐ | ☐ | ☐ | Section cards elevated |
| 9 | `/price-list` | ☐ | ☐ | ☐ | PageHeader, yellow PDF, print OK |
| 10 | `/map` | ☐ | ☐ | ☐ | Full bleed, elevated controls |
| 11 | `/stock` | ☐ | ☐ | ☐ | Table V2 / cards mobile |
| 12 | `/categories` | ☐ | ☐ | ☐ | Tree + modals V2 |
| 13 | `/collector/tasks` | ☐ | ☐ | ☐ | Large touch rows |
| 14 | `/warehouse/receipt` | ☐ | ☐ | ☐ | Inset fields, one-hand mobile |
| 15 | `/users` | ☐ | ☐ | ☐ | Table V2 + PageHeader |
| 16 | `/` | ☐ | ☐ | ☐ | Redirect → dashboard |

На каждом breakpoint:

- [ ] Нет визуальных outliers (старый gray-card / blue CTA)
- [ ] PageHeader → filters → content — единый ритм
- [ ] Modals: slide-up desktop, bottom sheet mobile (`< md`)

---

## Ключевые флоу

| Флоу | Шаги | Breakpoints |
|------|------|-------------|
| **Auth** | Login → Dashboard; Register → Dashboard; Logout | 375 / 1280 |
| **Order draft** | Создать черновик → banner accent → restore / discard | 375 / 768 |
| **Create order** | Orders → «Создать» → Modal V2 → line items → submit | 375 / 1280 |
| **Product CRUD** | Products → add/edit modal → image upload | 768 / 1280 |
| **Supplier CRUD** | Suppliers → card → edit/finance → WhatsApp | 375 / 1280 |
| **Payment** | OrderDetails → оплата → PaymentModal V2 | 375 |
| **PDF** | PriceList → yellow PDF button → файл скачивается | 1280 |
| **Warehouse** | Receipt → scan/search → submit | 375 |
| **Price history** | Product → history modal → FilterChip (не blue) | 768 |

---

## App Shell

- [ ] Sidebar V2 — white shell, yellow active, `transition-colors duration-200`
- [ ] Mobile header — logo Plastkrep CRM, hamburger
- [ ] Bottom tab bar (375px) — 4 tabs + «Ещё», `pb-safe`
- [ ] OrderDraftBanner — accent strip, не перекрывает header/tab bar
- [ ] Drawer «Ещё» — slide 250ms

---

## UI Primitives smoke

- [ ] `Button` primary = yellow, secondary = white border
- [ ] `Card` elevated vs inset различимы
- [ ] `Input` / `Select` — inset, focus yellow border
- [ ] `Modal` — анимация входа, FormFooter placement
- [ ] `FilterChip` — active = yellow tint pill
- [ ] `Table` — hover inset, overline headers
- [ ] `Badge` — soft semantic pills
- [ ] `Pagination` — compact, duration-200 transitions

---

## Grep audit (legacy styles)

```bash
# Из client/ — ожидаем 0 на primary CTA:
rg "bg-blue-600" src/

# Допустимо в statusColors / map sectors — не на CTA:
rg "bg-blue-500" src/ --glob "!**/statusColors.ts" --glob "!**/BaysideMap.tsx"
```

- [ ] `bg-blue-600` — 0 в `src/` (кроме DESIGN_V2.md)
- [ ] Rainbow stat inline divs — 0 на list pages
- [ ] `window.confirm` / `alert` — 0 в production

---

## Техническое

- [ ] `npm run build` — без ошибок TypeScript
- [ ] Нет horizontal scroll на 375px (кроме wide tables с `overflow-x-auto`)
- [ ] Lighthouse Accessibility ≥ 90 на Orders, Dashboard (опционально)

---

## Sign-off

| Роль | Имя | Дата | Breakpoints |
|------|-----|------|-------------|
| Dev | | 2026-06-07 | 375 / 768 / 1280 |
| QA | | | 375 / 768 / 1280 |

**Версия Visual V2:** V1–V12 complete · Phase V12 motion polish applied.
