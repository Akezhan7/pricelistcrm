# CRM Design System (Phase 0)

> **Source of truth:** [`theme/tokens.ts`](./theme/tokens.ts)  
> Status badge mappings: [`theme/statusColors.ts`](./theme/statusColors.ts)  
> Formatting helpers: [`utils/format.ts`](./utils/format.ts)

## Brand colors

| Token | Class | Usage |
|-------|-------|-------|
| `brand-yellow` | `bg-brand-yellow` | Primary CTA, active nav |
| `brand-yellow-hover` | `hover:bg-brand-yellow-hover` | CTA hover |
| `brand-yellow-dark` | `bg-brand-yellow-dark` | Strong accent / warning |
| `brand-black` | `bg-brand-black` / `text-brand-black` | Sidebar, headings |
| `brand-white` | `bg-brand-white` | Cards, surfaces |
| `accent-blue` | `bg-accent-blue` / `text-accent-blue` | Links, info, legacy primary |
| `surface-muted` | `bg-surface-muted` | Page background |
| `surface-sidebar` | `bg-surface-sidebar` | Sidebar background |
| `text-muted` | `text-text-muted` | Secondary text |
| `border` | `border-border` | Dividers |
| `zebra` | `bg-zebra` | Table row alternation |

### Semantic

| Token | Tailwind | Usage |
|-------|----------|-------|
| success | `bg-success`, `text-success` | Completed, paid |
| danger | `bg-danger`, `text-danger` | Errors, overdue |
| warning | `bg-warning` | Partial, pending |
| info | `bg-info` | Informational badges |

`primary-*` scale maps to `accent-blue` for backward compatibility during migration.

## Typography

System sans-serif stack (see `fontFamily.sans` in tokens):

```
-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif
```

### Scale (convention — adopt in Phase 1+)

| Role | Classes |
|------|---------|
| Page title | `text-3xl font-bold text-brand-black` |
| Section title | `text-xl font-bold text-gray-900` |
| Body | `text-base text-gray-900` |
| Muted | `text-sm text-text-muted` |
| Label | `text-xs font-medium text-gray-500 uppercase tracking-wider` |

## Buttons

Utility classes in `index.css` (prefer `ui/Button` in Phase 1):

| Class | Style |
|-------|-------|
| `.btn-primary` | Yellow CTA — `bg-brand-yellow text-brand-black` |
| `.btn-accent` | Same as primary (explicit brand alias) |
| `.btn-secondary` | Gray secondary |
| `.btn-destructive` | Red destructive |

Inline Tailwind primary pattern:

```
bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow-hover
```

## Spacing

Token aliases: `p-page`, `p-section`, `p-card`, `gap-stack`.

Common layout: `p-4 md:p-6`, section gaps `space-y-6`, card padding `p-6`.

## Radii & shadows

| Token | Class |
|-------|-------|
| card | `rounded-card`, `shadow-card` |
| modal | `rounded-modal`, `shadow-modal` |
| pill | `rounded-pill` |

## Breakpoints

Mobile-first migration strategy (Tailwind defaults):

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Compact grids |
| `md` | 768px | Sidebar visible, tables |
| `lg` | 1024px | Split layouts (2 columns) |
| `xl` | 1280px | Wide dashboards |

## Status badges

Use `statusColors.ts` registry — do not duplicate color maps in pages:

```ts
import { getOrderStatusColor, getPaymentStatusColor } from '../theme/statusColors';
```

## CSS variables

`:root` in `index.css` mirrors key brand tokens for non-Tailwind contexts (print, third-party widgets).
