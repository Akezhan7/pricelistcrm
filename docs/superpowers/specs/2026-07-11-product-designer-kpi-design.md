# Product Designer KPI Design

Status: approved for Stage 12 implementation
Roadmap stage: Stage 12 - KPI and product card weight
Scope: product review approval, immutable designer KPI credit, basic designer report

## Purpose

Stage 12 gives the project manager a reliable way to credit designer work when a product card is approved.

The KPI value must not be a loose editable number on the product only. A product may later move through marketplace, purchase, warehouse, sale, or even receive card edits. Designer reporting still has to show who earned the KPI, when it was credited, and what weight was approved at that moment.

## Decisions

- Keep `Product.kpiWeight` as the visible current KPI weight on the product card.
- Add a dedicated `ProductDesignerKpiEntry` ledger table for reporting.
- Create the KPI entry transactionally during review approval.
- Require `kpiWeight` when approving a product review.
- Support preset weights `0.5`, `1`, `2` and a custom positive decimal value.
- Credit KPI to `Product.designerId`, not to the current assignee.
- Do not include product variation grouping in MVP.
- Do not fabricate KPI entries for old already-approved products.

## Data Model

`ProductDesignerKpiEntry` stores one credited KPI entry per product:

| Field | Purpose |
| --- | --- |
| `productId` | Product card that was approved |
| `designerId` | Designer credited for the card |
| `reviewedByUserId` | Admin/project lead who approved the card |
| `weight` | KPI weight credited to the designer |
| `creditedAt` | Date/time used by the report period filter |

`productId` is unique for MVP because a product card should be credited once. Later correction can update the entry and preserve the change in product action history.

## API

Review approval:

- `POST /api/products/:id/lifecycle/approve`
- Body: `{ "kpiWeight": 0.5 | 1 | 2 | customPositiveNumber }`
- Admin only, same as current approval.
- Fails if product has no assigned designer.
- Updates `Product.kpiWeight`, creates `ProductDesignerKpiEntry`, and writes product action history in one transaction.

Designer KPI report:

- `GET /api/analytics/designer-kpi?from=YYYY-MM-DD&to=YYYY-MM-DD&designerId=ID`
- Admin only in MVP.
- Returns summary totals plus grouped designer rows and credited product entries.
- Uses `ProductDesignerKpiEntry.creditedAt`, not product update time.

## Frontend

- Add KPI weight picker to `ProductReviewActions`.
- The approve button is disabled until a valid weight exists.
- Add `DesignerKpiReport` page for admin users.
- Add sidebar navigation item for admin users.
- The report uses a simple period filter and optional designer filter.

## Testing

- Service test covers KPI weight normalization, invalid values, approval plan output, and report aggregation.
- Existing review service tests are updated for required `kpiWeight`.
- No full browser QA in this stage. Full QA Checkpoint 3 remains after Stage 13.
