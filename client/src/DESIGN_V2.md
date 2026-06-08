# Plastkrep CRM — Visual Design Spec V2

> **Для кого:** разработчики, имплементирующие Visual Redesign  
> **Roadmap:** [`../VISUAL_REDESIGN_ROADMAP.md`](../VISUAL_REDESIGN_ROADMAP.md)  
> **Legacy spec:** [`DESIGN.md`](./DESIGN.md) (Phase 0 — superseded для визуала)  
> **Токены:** [`theme/tokens.ts`](./theme/tokens.ts) — обновлять в Phase V1

---

## Суть V2

Phase 0–8 дала структуру (`ui/`, токены). **V2 — визуальный продукт:** типографика, поверхности, плотность, motion. Не миграция цветов — redesign layout и feel.

**Правило:** меняем только presentation (JSX, `className`, CSS). Хуки, API, context logic — не трогаем.

---

## Бренд

| Роль | HEX | Tailwind |
|------|-----|----------|
| Primary accent | `#FBBF24` | `brand-yellow` |
| Primary hover | `#EAB308` | `brand-yellow-hover` |
| Text / headers | `#111111` | `brand-black` |
| Background cards | `#FFFFFF` | `brand-white` |
| Secondary interactive | `#2563eb` | `accent-blue` |
| Page background | `#FAFAFA` | `surface-page` |
| Muted text | `#6B7280` | `text-secondary` |
| Subtle border | `#E8E8EC` | `border-subtle` |

### Правила цвета

- **Жёлтый** — один primary CTA на экран; active nav; selected accent strip. Не для фона карточек.
- **Чёрный** — заголовки, основной текст, metric numbers.
- **Синий** — ссылки, info, вторичные интерактивные элементы. Не primary CTA.
- **Semantic** (success/danger/warning) — только в Badge и иконках статуса. Не rainbow stat card borders.
- **Запрещено:** `bg-blue-600` CTA, `bg-blue-50` selected, purple/indigo/teal в stat cards.

---

## Типографика

**Шрифт:** Inter (400, 500, 600, 700). CRA: `<link>` в `public/index.html`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Scale

| Token | Size / Weight | Tailwind (после V1) | Использование |
|-------|---------------|---------------------|---------------|
| `display` | 36/700 | `text-display` | Редко (auth hero) |
| `page-title` | 28/700 → 22 mobile | `text-page-title` | H1 страницы |
| `section-title` | 18/600 | `text-section-title` | H2 секции, panel header |
| `card-title` | 15/600 | `text-card-title` | Заголовок карточки |
| `body` | 14/400 (15 mobile) | `text-body` | Основной текст |
| `body-medium` | 14/500 | `text-body-medium` | Emphasis |
| `caption` | 12/500 | `text-caption text-secondary` | Meta, даты |
| `overline` | 11/600 uppercase | `text-overline` | Labels, table headers |
| `metric` | 24–32/700 | `text-metric tabular-nums` | Stat numbers |
| `price` | 15/600 | `text-price tabular-nums` | Цены |

**Tracking:** page-title `tracking-tight`; overline `tracking-wider`.

---

## Поверхности

```
surface-page      #FAFAFA   — фон Layout
surface-base      #FFFFFF   — панели
surface-elevated  #FFFFFF + shadow-sm + border-subtle — карточки
surface-inset     #F4F4F5   — search bars, filter zones
surface-accent    #FFFBEB   — selected context, draft banner
```

### Когда что

| Паттерн | Surface |
|---------|---------|
| App background | `surface-page` |
| List panel | `surface-base` + `border-subtle` |
| Entity card | `surface-elevated` |
| Search / filters | `surface-inset` |
| Selected row | `surface-accent` + `border-l-[3px] border-brand-yellow` |
| Modal | `surface-elevated` + `shadow-xl` |

**Shadow:** только elevation (card hover, modal, floating bar). Списки — border-first.

---

## Радиусы и отступы

| Элемент | Radius | Padding |
|---------|--------|---------|
| Card | `12px` (`rounded-xl`) | `p-4` mobile / `p-5` desktop |
| Input | `8px` (`rounded-lg`) | `px-3 py-2.5` |
| Button md | `8px` | `px-4 py-2.5` |
| Badge | pill | `px-2.5 py-0.5` |
| Thumbnail | `10px` | — |
| Modal | `16px` desktop / `0` mobile sheet | — |

**Spacing rhythm:** секции `space-y-6`; внутри карточки `space-y-4`; stack `gap-3`.

---

## Компоненты — quick reference

### Button

| Variant | Стиль |
|---------|-------|
| `primary` | `bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow-hover active:scale-[0.98]` |
| `secondary` | `bg-white border border-subtle hover:bg-surface-inset` |
| `ghost` | `hover:bg-surface-inset text-brand-black` |
| `danger` | `bg-danger text-white` или outline |

Sizes: `sm` (32px), `md` (40px), `lg` (44px min on mobile).

### Card

```tsx
<Card variant="elevated | inset | interactive">
  <CardHeader />
  <CardBody />
</Card>
```

- `interactive`: hover lift + cursor pointer
- Selected: `ring-2 ring-brand-yellow ring-offset-2` или accent strip

### Badge (soft pill)

```
bg-{semantic}-light text-{semantic}-dark rounded-full text-caption font-medium
```

Источник цветов: `theme/statusColors.ts`.

### Input

```
bg-surface-inset border border-transparent
focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20
rounded-lg text-body
```

### Table row

```
min-h-[52px] border-b border-subtle
hover:bg-surface-inset/50
header: text-overline text-secondary
```

### StatCard

```
surface-elevated, p-4, rounded-xl
label: text-overline
value: text-metric text-brand-black
icon: text-secondary (не rainbow)
active filter: ring-2 ring-brand-yellow
```

---

## Паттерны экранов

### Page layout

```
┌─ PageHeader (title + description + actions) ─────────┐
├─ Filter strip (FilterChips / search inset) ────────────┤
├─ Content (table | card grid | split panels) ───────────┤
└─ Pagination ─────────────────────────────────────────┘
```

### Split panel (Dashboard, Products)

**Desktop:** left 1/3 list (inset) | right 2/3 cards (elevated)  
**Mobile:** step tabs `Товары | Поставщики` — одна панель на экран

### List item (Product)

```
[48×48 img]  Title (card-title, truncate)
             article · meta (caption)
             Price (text-price)          [actions]
```

- Selected: `surface-accent border-l-[3px] border-brand-yellow`
- Min height: 64px desktop / 72px mobile

### Supplier card

```
[hero 16:9 img, rounded-t-xl]
Name (card-title)
sector · phone (caption)
─────────────────
price (if context) + Badge
[action row: icon buttons]
```

### Orders mobile card

```
Order #123                    [Badge status]
Client name · date
₸ 125 000                     [chevron →]
```

---

## Навигация

### Desktop sidebar

- BG: `#0A0A0A`
- Item: `rounded-lg px-3 py-2.5 min-h-11`
- Inactive: `text-zinc-400 hover:bg-white/5`
- Active: `bg-brand-yellow text-brand-black font-medium`

### Mobile

- Top header: logo + title (compact)
- **Bottom tab bar:** Главная | Заявки | Товары | Поставщики | Ещё
- `pb-safe`, backdrop-blur, `border-t border-subtle`
- Drawer для редких маршрутов

---

## Motion

| Token | Value |
|-------|-------|
| `duration-fast` | 150ms |
| `duration-normal` | 250ms |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` |

| Element | Animation |
|---------|-----------|
| Button press | `active:scale-[0.98]` |
| Card hover | shadow + `translate-y-[-1px]` 150ms |
| Modal | overlay fade 200ms + content slide-up 250ms |
| Drawer | slide 250ms |
| Mobile modal | bottom sheet slide-up |

**Focus:** `focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2`

---

## Mobile checklist

- [ ] Touch targets ≥ 44×44
- [ ] Primary CTA в thumb zone (bottom bar где уместно)
- [ ] Sticky header на list pages
- [ ] Card-first вместо table на `< md`
- [ ] Sheet modals, не centered box
- [ ] `env(safe-area-inset-*)` на fixed elements
- [ ] Body text 15px на mobile

---

## Миграция с V1 — grep targets

Заменить при редизайне экрана:

| Legacy | V2 |
|--------|-----|
| `bg-gray-50` | `bg-surface-page` |
| `text-gray-900` | `text-brand-black` |
| `text-gray-600` / `text-gray-500` | `text-secondary` |
| `bg-blue-600` | `Button variant="primary"` |
| `bg-blue-50 border-blue-500` | `surface-accent border-brand-yellow` |
| `bg-white rounded-lg shadow` | `Card variant="elevated"` |
| inline stat divs | `StatCard` |
| raw `<button className=...>` | `Button` / `IconButton` |

---

## Файлы-эталоны (после редизайна)

| Паттерн | Эталонный файл |
|---------|----------------|
| List page | `pages/Orders.tsx` (после V7) |
| Split layout | `pages/Dashboard.tsx` (после V6) |
| List item | `ProductListItem.tsx` (после V5) |
| Entity card | `SupplierCards.tsx` (после V6) |
| Modal form | `CreateOrderModal.tsx` (после V9) |
| ui/ primitives | `components/ui/Card.tsx`, `Button.tsx` (после V2) |

---

## Не трогать

- `services/*`, `types/*`, API contracts
- `OrderDraftContext` logic, `orderDraftStorage.ts`
- `pdfGenerator.ts` logic (синхронизировать BRAND colors OK)
- `BaysideMap` map logic (только control styles)
- `ProtectedRoute`, auth flow

---

*Обновлять этот документ при изменении tokens в Phase V1 и primitives в Phase V2.*
