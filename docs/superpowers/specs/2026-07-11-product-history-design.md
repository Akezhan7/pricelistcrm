# Product History Design

Date: 2026-07-11  
Scope: roadmap Stage 11

## Goal

Provide one immutable, chronological product timeline that shows who changed a product and what happened across lifecycle, pricing, stock, and review revisions.

## Sources Of Truth

- `ProductActionHistory`: lifecycle and important product-card events.
- `PriceHistory`: selling-price and cost-price changes.
- `StockHistory`: stock movements and corrections.
- `ProductRevisionRequest` with `ProductAsset`: revision comments, state, and attachments.

No new history table is added. Price and stock events are normalized on read and are never duplicated into `ProductActionHistory`.

## Timeline Contract

`GET /api/products/:id/history?page=1&limit=50` returns newest-first immutable events. Each event contains a stable id, source, action type, category, actor, timestamp, lifecycle transition, metadata, and optional revision details.

The service fetches a bounded window from each indexed source in parallel, normalizes the rows, merges them, sorts them by timestamp, and slices the requested page. Limit is capped at 100.

## Missing Events

Add `ProductActionHistory` records for:

- draft and legacy product creation;
- main product-card updates;
- asset deletion;
- product-supplier link, update, and unlink;
- manual stock update;
- product archive/delete.

Card updates store changed field names and compact before/after scalar values. Price changes remain exclusively in `PriceHistory`. Large descriptions and file contents are not copied into metadata.

History writes must use the same database transaction as the related business mutation.

## Access

Authenticated users who can access the product may read history. No create, update, or delete history route is exposed. The Stage 10 capability payload includes `view_product_history` for active products.

## UI

`ProductActionTimeline` is a reusable compact vertical timeline shown in a modal from workflow cards and the product catalog. It groups events by date, displays Russian event labels, actor and time, shows lifecycle transitions and compact details, and loads additional pages on demand.

The component is designed to be embedded later in a full product passport without changing its API contract.

## Verification

- One service test covers normalization, merging, ordering, revision enrichment, and pagination.
- One builder test covers new immutable action records and compact field diffs.
- API smoke reads a real product timeline.
- Frontend production build must pass.
- Full browser QA remains deferred until after Stage 13.
