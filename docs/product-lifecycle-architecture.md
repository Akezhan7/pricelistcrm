# Product Lifecycle Architecture

Status: approved for Stage 1 defaults  
Roadmap stage: Stage 0 - architectural audit  
Scope: no application code, no database migration, no UI changes

## Purpose

This document fixes the proposed architecture before CRM implementation starts.

The client's requirement is not just to add fields to products. The CRM must treat each product as a single operational card that moves through a launch lifecycle and is enriched by different employees at different stages.

Current CRM state:

- Product catalog already exists.
- Suppliers already exist.
- Product-supplier links already exist.
- Purchase orders and warehouse receipt flows already exist.
- Users and coarse roles already exist.
- Price and stock history already exist.
- Product file support is currently limited mainly to one image field.

Core architecture decision:

Keep the existing `Product` as the central entity, but add a product lifecycle layer around it. Do not replace current purchase, supplier, warehouse, and price systems. Use them where they fit, and add lifecycle-specific models where the current CRM has no matching concept.

## Non-Negotiable Rules

- Lifecycle status must use stable English keys in the database, not Russian display labels.
- Display labels stay in frontend dictionaries or shared constants.
- Business transitions must be validated on the backend.
- UI buttons can call actions, but they must not be the source of truth.
- Existing products must keep working after migrations.
- Existing purchase and warehouse flows must not be broken by product launch workflow.
- Product files must move to a separate asset model; do not add `image2`, `slide1`, `psdFile` style fields to `Product`.
- New modules must be additive and reversible enough for safe rollout.
- No temporary fields that later need conceptual replacement.

## Recommended Lifecycle Model

Add lifecycle fields directly to `Product` for the current stage and lightweight assignment state.

Reason:

- The lifecycle is a first-class property of a product card.
- Product lists and filters need fast access to current stage.
- The current stage is a summary state, not a historical table.
- Detailed events belong in a separate history table.

Recommended new `Product` fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `lifecycleStatus` | enum/string | Current product lifecycle stage |
| `lifecycleStartedAt` | date nullable | When the product entered launch workflow |
| `lifecycleCompletedAt` | date nullable | When product reached "in sale" |
| `assignedToUserId` | integer nullable | Current responsible employee |
| `designerId` | integer nullable | Designer assigned by manager |
| `marketplaceManagerId` | integer nullable | Marketplace manager, optional in MVP |
| `createdByUserId` | integer nullable | Who created draft product |
| `reviewedByUserId` | integer nullable | Who approved or reviewed content |
| `kpiWeight` | decimal nullable | Designer KPI weight, filled during review |
| `launchNotes` | text nullable | Product launch notes, separate from marketplace description |

Recommended lifecycle statuses:

| Key | Label | Owner |
| --- | --- | --- |
| `new` | Новые товары | Project manager |
| `assigned_to_designer` | Передан дизайнеру | Designer |
| `content_created` | Карточка создана | Designer |
| `review` | Проверка карточки | Project manager |
| `revision` | Доработка | Designer |
| `marketplace` | Размещение на маркетплейсах | Marketplace manager |
| `purchase` | Закуп | Purchase manager |
| `warehouse` | Склад | Warehouse/accounting role |
| `in_sale` | В продаже | Marketplace manager |
| `archived` | Архив | Admin/project manager |

Why include `revision`:

The client's lifecycle table omits it as a main stage, but the process requires returning a product to the designer with comments and attachments. Treating revision as an explicit status makes queues and permissions much cleaner.

## Lifecycle Transitions

Allowed transitions:

| From | Action | To | Required role |
| --- | --- | --- | --- |
| none | create draft product | `new` | project manager/admin |
| `new` | assign designer | `assigned_to_designer` | project manager/admin |
| `assigned_to_designer` | mark content ready | `content_created` | assigned designer/admin |
| `content_created` | submit for review | `review` | assigned designer/admin |
| `review` | approve | `marketplace` | project manager/admin |
| `review` | request revision | `revision` | project manager/admin |
| `revision` | resubmit after revision | `review` | assigned designer/admin |
| `marketplace` | mark Kaspi placement ready | `purchase` | marketplace manager/admin |
| `purchase` | mark purchased | `purchase` | purchase manager/admin |
| `purchase` | mark arrived to warehouse | `warehouse` | purchase manager/admin |
| `warehouse` | complete warehouse details | `in_sale` | warehouse/accounting/admin |
| `in_sale` | update sale flags | `in_sale` | marketplace manager/admin |
| any active | archive | `archived` | admin/project manager |

Notes:

- `purchase` has two internal milestones: purchased and arrived. These should be fields or action history records, not separate lifecycle statuses unless the client later needs separate queues.
- `marketplace` should not move to `purchase` until required Kaspi fields are filled.
- `warehouse` should not move to `in_sale` until storage details are complete enough for operations.

## Role Strategy

Current backend roles:

- `admin`
- `operator`
- `accountant`
- `purchase_manager`
- `warehouse_operator`
- `driver`
- `collector`

Recommended MVP role mapping:

| Client role | Recommended CRM role |
| --- | --- |
| Анас / руководитель | `admin` initially, later `project_manager` |
| Нурхан / Алиша | new `designer` |
| Улшат / Гульнур | new `marketplace_manager` |
| Ерман | `purchase_manager` |
| Учетчик | `warehouse_operator` plus selected finance permission |
| Администратор | `admin` |

Recommended role decision:

Add two new roles in MVP:

- `designer`
- `marketplace_manager`

Defer `project_manager` only if current `admin` is enough for Anas in the first release. If the client wants Anas to be powerful but not a technical admin, add `project_manager` in the same role migration as `designer` and `marketplace_manager`.

Do not overload `operator` for designers or marketplace managers. It will make permissions unclear and will become expensive to unwind.

## Permission Matrix

Backend permissions should be action-based first, field-based second.

| Area | Allowed roles |
| --- | --- |
| Create draft product | `admin`, `project_manager` if added |
| Assign designer | `admin`, `project_manager` if added |
| Upload product content assets | assigned `designer`, `admin` |
| Submit to review | assigned `designer`, `admin` |
| Approve/reject review | `admin`, `project_manager` if added |
| Set KPI weight | `admin`, `project_manager` if added |
| Edit marketplace listing | `marketplace_manager`, `admin` |
| Mark purchased/arrived | `purchase_manager`, `admin` |
| Edit warehouse details | `warehouse_operator`, `admin` |
| Update cost price after arrival | `warehouse_operator`, `purchase_manager`, `admin`, optionally `accountant` |
| Edit patent registration | `admin`, `project_manager` if added |
| Manage users and dictionaries | `admin` |

Field-level restrictions should be implemented in backend update handlers. UI hiding is helpful, but not sufficient.

## New Data Models

### ProductActionHistory

Purpose:

Store immutable lifecycle and important product events.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required |
| `actorId` | integer nullable |
| `actionType` | string/enum required |
| `fromStatus` | string nullable |
| `toStatus` | string nullable |
| `message` | text nullable |
| `metadata` | JSONB nullable |
| `createdAt` | date |

Action examples:

- `product_created`
- `designer_assigned`
- `content_uploaded`
- `submitted_for_review`
- `revision_requested`
- `revision_resubmitted`
- `approved`
- `marketplace_updated`
- `price_changed`
- `purchase_marked`
- `warehouse_completed`
- `sale_started`

### ProductAsset

Purpose:

Store all product files instead of expanding `Product.image`.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required |
| `uploadedBy` | integer nullable |
| `assetType` | enum/string required |
| `filePath` | string required |
| `originalName` | string nullable |
| `mimeType` | string nullable |
| `fileSize` | integer nullable |
| `sortOrder` | integer default 0 |
| `notes` | text nullable |
| `isActive` | boolean default true |
| `createdAt` | date |
| `updatedAt` | date |

Asset types:

- `product_photo`
- `slide_jpg`
- `psd_source`
- `revision_attachment`
- `patent_file`
- `other`

Keep existing `Product.image` during migration as a legacy preview image. Later, set the first active `product_photo` as preview if needed.

### ProductRevisionRequest

Purpose:

Store review comments, attachments, and resolution state.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required |
| `requestedBy` | integer required |
| `assignedDesignerId` | integer nullable |
| `comment` | text required |
| `status` | enum/string required |
| `resolvedAt` | date nullable |
| `createdAt` | date |
| `updatedAt` | date |

Revision statuses:

- `open`
- `resolved`
- `cancelled`

Attachments should be stored through `ProductAsset` with `assetType = revision_attachment` and optional metadata linking to revision request.

### ProductMarketplaceListing

Purpose:

Support Kaspi now and other marketplaces later.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required |
| `marketplace` | string required |
| `status` | string required |
| `sku` | string nullable |
| `marketplaceArticle` | string nullable |
| `marketplaceName` | string nullable |
| `price` | decimal nullable |
| `url` | string nullable |
| `description` | text nullable |
| `managedBy` | integer nullable |
| `createdAt` | date |
| `updatedAt` | date |

Marketplace status keys:

- `not_started`
- `placing`
- `moderation`
- `published`
- `in_sale`
- `blocked`
- `removed`

Kaspi migration:

- Current `Product.kaspiName` maps to `marketplaceName`.
- Current `Product.kaspiArticle` maps to `sku` or `marketplaceArticle`.
- Current `Product.sellingPrice` can initialize `price`.

Need client confirmation whether "Kaspi SKU" equals current `kaspiArticle` or should be a new distinct field.

### ProductWarehouseDetails

Purpose:

Store physical warehouse data for lifecycle launch without overloading stock history.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required unique |
| `sector` | string nullable |
| `shelf` | string nullable |
| `cell` | string nullable |
| `weight` | decimal nullable |
| `length` | decimal nullable |
| `width` | decimal nullable |
| `height` | decimal nullable |
| `updatedBy` | integer nullable |
| `createdAt` | date |
| `updatedAt` | date |

Reason:

Current stock system tracks counts and receipts, but not stable physical passport fields like shelf/cell/dimensions.

### ProductPatentRegistration

Purpose:

Store Kazpatent data as a permanent product block.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required unique |
| `status` | string required |
| `certificateNumber` | string nullable |
| `registeredAt` | date nullable |
| `packageNumber` | string nullable |
| `fileAssetId` | integer nullable |
| `externalUrl` | string nullable |
| `updatedBy` | integer nullable |
| `createdAt` | date |
| `updatedAt` | date |

Registration statuses:

- `not_registered`
- `in_progress`
- `registered`

Future package model:

Add `PatentRegistrationPackage` later only when the client starts batch registration. Do not block MVP on it.

### ProductLaunchFlags

Purpose:

Store final sale-stage checkboxes without bloating `Product`.

Recommended fields:

| Field | Type |
| --- | --- |
| `id` | integer primary key |
| `productId` | integer required unique |
| `advertisingStarted` | boolean default false |
| `promotionStarted` | boolean default false |
| `reviewBonusEnabled` | boolean default false |
| `updatedBy` | integer nullable |
| `createdAt` | date |
| `updatedAt` | date |

This can also be folded into `ProductMarketplaceListing` if flags are per marketplace. For MVP, product-level flags are simpler and match the TЗ wording.

## API Boundary

Recommended route grouping:

- Keep existing `/api/products` for catalog CRUD.
- Add lifecycle actions under `/api/products/:id/lifecycle/...`.
- Add product assets under `/api/products/:id/assets`.
- Add marketplace listings under `/api/products/:id/marketplaces`.
- Add revisions under `/api/products/:id/revisions`.
- Add patent block under `/api/products/:id/patent`.

Recommended action endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/products/drafts` | Fast mobile draft creation |
| `POST` | `/api/products/bulk/assign-designer` | Assign selected new products |
| `POST` | `/api/products/:id/lifecycle/submit-content` | Designer marks content ready |
| `POST` | `/api/products/:id/lifecycle/submit-review` | Designer sends to review |
| `POST` | `/api/products/:id/lifecycle/approve` | Manager approves |
| `POST` | `/api/products/:id/lifecycle/request-revision` | Manager requests revision |
| `POST` | `/api/products/:id/lifecycle/resubmit-revision` | Designer resubmits |
| `POST` | `/api/products/:id/lifecycle/mark-placement-ready` | Marketplace stage complete |
| `POST` | `/api/products/:id/lifecycle/mark-purchased` | Purchase confirmed |
| `POST` | `/api/products/:id/lifecycle/mark-arrived` | Arrival confirmed |
| `POST` | `/api/products/:id/lifecycle/complete-warehouse` | Warehouse details complete |
| `POST` | `/api/products/:id/lifecycle/mark-in-sale` | Launch complete |

Reason for action endpoints:

The TЗ says "one action = one button". Action endpoints encode intent better than a generic "update status" endpoint.

## Frontend Architecture

Recommended new screens/components:

| Component/Page | Purpose |
| --- | --- |
| `ProductWorkflowPage` | Main lifecycle work queue |
| `ProductPassportPage` | Full product card/passport |
| `ProductLifecycleBadge` | Status display |
| `ProductLifecycleActions` | Shows the next allowed action |
| `AssignDesignerModal` | Bulk assign designer |
| `ProductAssetsPanel` | Photos, slides, PSD, files |
| `ProductReviewPanel` | Review, approve, revision request |
| `ProductRevisionModal` | Required comment + file |
| `ProductMarketplacePanel` | Kaspi and future platforms |
| `ProductWarehousePanel` | Sector, shelf, cell, dimensions |
| `ProductPatentPanel` | Kazpatent block |
| `ProductActionTimeline` | History |

Existing product list can stay. Lifecycle workflow should not be forced into the current product CRUD modal. The current modal is useful for catalog editing, but the lifecycle needs a task-oriented UI.

Mobile priority:

- Fast draft product creation.
- Photo upload.
- Supplier selection/creation.
- Comment.
- Save to `new`.

Desktop priority:

- Work queues.
- Review and file inspection.
- Bulk assignment.
- Passport view.

## Migration Strategy

Migration release should be additive.

Recommended order:

1. Add new nullable columns to `products`.
2. Backfill existing active products:
   - `lifecycleStatus = 'in_sale'` for products that already have stock or are already operational.
   - Alternative safer option: `lifecycleStatus = 'legacy'`, but this adds another status to every filter.
3. Add new indexes:
   - `products.lifecycle_status`
   - `products.assigned_to_user_id`
   - `products.designer_id`
   - `products.marketplace_manager_id`
4. Create new tables:
   - `product_action_history`
   - `product_assets`
   - `product_revision_requests`
   - `product_marketplace_listings`
   - `product_warehouse_details`
   - `product_patent_registrations`
   - `product_launch_flags`
5. Backfill `product_marketplace_listings` from current Kaspi fields.
6. Keep old fields until UI no longer depends on them.

Recommended existing product default:

Use `in_sale` for current active products. This avoids old products polluting the "new products" launch queue.

Need confirmation:

If client wants existing products to pass through the new lifecycle retroactively, use `new` or a special `legacy_review` status instead. That is likely more operationally expensive.

## Stage 1 Implementation Slice

After approval, Stage 1 should only implement the minimum backend lifecycle foundation:

- shared lifecycle constants;
- `Product` lifecycle columns;
- migration/backfill;
- transition validator;
- action endpoints for initial transitions;
- minimal type updates;
- minimal product list display of status.

Do not implement yet in Stage 1:

- asset model;
- revision model;
- marketplace model;
- KPI reports;
- patent model;
- full passport page.

This keeps the first code change small and testable.

## Testing Strategy

Stage 0:

- No tests.
- Document review only.

Stage 1:

- Migration status check.
- Backend checks for allowed/blocked lifecycle transitions.
- Basic product list load check.
- Frontend build if UI is touched.

General rule:

Test critical business rules and migration safety. Do not add a separate test for every UI label, input, and visual state.

## Risks

| Risk | Mitigation |
| --- | --- |
| Role confusion with existing `purchase_manager` | Add clear roles for `designer` and `marketplace_manager`; decide separately on `project_manager` |
| Existing products appear in new work queues | Backfill them to `in_sale` by default |
| Kaspi fields duplicated | Backfill to `ProductMarketplaceListing`, keep legacy fields during transition |
| File handling becomes messy | Introduce `ProductAsset` before adding JPG/PSD/revision files |
| Lifecycle conflicts with purchase orders | Keep launch lifecycle separate from regular order lifecycle; integrate later via explicit actions |
| UI becomes too complex | Use task queues and one primary action per stage |
| Backend permissions drift from UI permissions | Enforce all critical permissions in backend action handlers |

## Approved Decisions For Stage 1

Approved by project owner after Stage 0 discussion.

1. Do not add `project_manager` in MVP.
   - `admin` covers Anas/project manager responsibilities for the first implementation slice.
   - Add `project_manager` later only if the client needs a powerful non-admin manager role.

2. Backfill existing active products as `in_sale`.
   - Existing catalog items must not pollute the new "Новые товары" queue.
   - This keeps old products operational after migration.

3. Add a real `designer` role.
   - Do not hardcode Nurхан or Алиша in code.
   - Any active user with `designer` role can be assigned as designer.

4. Add a real `marketplace_manager` role.
   - Do not hardcode Улшат or Гульнур in code.
   - Any active user with `marketplace_manager` role can handle marketplace placement.

5. Treat current `Product.kaspiArticle` as the legacy equivalent of Kaspi SKU.
   - In the new marketplace model, migrate it to `ProductMarketplaceListing.sku`.
   - In UI, display it as "Kaspi SKU".

6. Keep `Product.sellingPrice` as the general/base product price.
   - Store marketplace-specific prices separately in `ProductMarketplaceListing.price`.
   - This keeps the model ready for Kaspi, Halyk, Forte, Ozon, Wildberries, and other platforms.

7. Store warehouse address as structured fields plus notes.
   - Use `sector`, `shelf`, `cell`, `weight`, `length`, `width`, `height`.
   - Add `notes` for real-world exceptions and clarifications.

8. In the first release, purchase is lifecycle marking only.
   - Do not force lifecycle purchase actions to create or use current `Order` records immediately.
   - Integrate with `Order` later during the dedicated purchase/warehouse stage.

9. PSD uploads need a separate larger file limit.
   - Keep smaller limits for ordinary images.
   - Use a dedicated PSD/file upload profile with an initial target limit of 100-200 MB, depending on hosting capacity.

10. Product drafts should not require the manager to manually enter a final article.
    - Generate a temporary unique internal article, for example `DRAFT-20260706-0001`.
    - Allow replacing it later with a normal internal article.

Approved implementation defaults:

- Add roles: `designer`, `marketplace_manager`.
- Defer `project_manager`.
- Backfill existing products as `in_sale`.
- Use stable English lifecycle keys in database.
- Keep `Product` as the central card and add lifecycle fields to it.
- Add separate tables for history, assets, revisions, marketplace listings, warehouse details, patent, and sale flags.
- Start Stage 1 with lifecycle foundation only, not the full product passport.

## Stage 8 Purchase And Warehouse Decision

Implemented on 2026-07-10.

- Lifecycle remains the workflow layer; `Order`, `WarehouseReceipt`, `StockHistory`, and `PriceHistory` remain the operational sources of truth.
- The initial launch purchase uses a dedicated `ProductLifecyclePurchase` bridge and a single-product `Order`. This keeps it distinct from normal replenishment orders and makes receipt completion unambiguous.
- Arrival confirmation creates the warehouse receipt, receipt item, stock history, order status history, lifecycle history, and stock/status updates in one database transaction.
- Stable warehouse passport data lives in `ProductWarehouseDetails`, not in stock history or temporary `Product` fields.
- Sector, shelf, cell, weight, length, width, and height are required before the product can leave `warehouse` for `in_sale`.
- Cost price may be refined during warehouse completion; an actual change always creates a `PriceHistory` record.
- Full browser QA for the path from Kaspi through sale remains a checkpoint after Stage 9.

## Stage 9 Sale Launch Decision

Implemented on 2026-07-10.

- `in_sale` is the final working stage. Entering it after warehouse completion does not by itself complete the launch.
- `Product.lifecycleCompletedAt` is set only when an admin or marketplace manager explicitly completes the sale launch.
- Product-level `ProductLaunchFlags` stores advertising, promotion, review bonus, notes, updater, completer, and completion time.
- All three activity flags may remain false because the client specification says they are enabled when needed. `completedAt` records the manager's explicit decision.
- Sale launch completion updates the Kaspi listing to `in_sale`, product completion time, launch flags, and product action history in one transaction.
- Later flag edits use a separate update endpoint and never restart or move the lifecycle.
- Marketplace managers use separate task and completed-sales views so the active queue stays operationally small.
- Migration backfill treats legacy `in_sale` products as completed and products with `warehouse_completed` history as pending final sale launch.
- Full browser QA Checkpoint 2 passed on 2026-07-10. See `docs/qa/2026-07-10-live-qa-checkpoint-2.md`.




Сейчас: QA Checkpoint 1 подтвердил этапы 1-7. QA Checkpoint 2 выполнен 2026-07-10 и подтвердил этапы 8-9: полный путь от Kaspi до завершенного запуска продаж.
После этапов 10-13: QA Checkpoint 3 — права, история, KPI, Казпатент.
После этапа 14: финальный MVP QA перед показом клиенту.

## Stage 10 Permissions Decision

Approved and implemented on 2026-07-10. Implementation is tracked in `docs/superpowers/plans/2026-07-10-product-permissions-implementation.md`.

- Keep `admin` as the MVP project lead and administrator; do not add `project_manager` yet.
- Use one backend product-permission policy for actions, assignment constraints, and editable fields.
- Treat routes as coarse protection and service/controller policy checks as authoritative protection.
- Return actor-specific capabilities to the frontend so controls do not maintain a second role matrix.
- Reject forbidden submitted fields with `403`; never silently accept or discard them.
- Keep marketplace fields in `ProductMarketplaceListing` and synchronize legacy Kaspi fields through marketplace services only.
- Use `assignedToUserId` only for an explicit current employee and show a responsible role when work belongs to an unassigned role queue.
- Synchronize marketplace ownership between `managedBy`, `marketplaceManagerId`, and the current assignee.
- Public self-registration always creates `operator`; lifecycle and administrative roles can only be assigned through the admin-only user endpoint.
- Keep the full browser QA checkpoint after Stage 13; Stage 10 receives focused permission tests and build verification only.
- Focused permission and affected lifecycle tests pass; API smoke confirms an allowed partial update and a `403` for a forbidden legacy Kaspi field.

## Stage 11 Unified Product History Decision

Approved and implemented on 2026-07-11. Design: `docs/superpowers/specs/2026-07-11-product-history-design.md`.

- `ProductActionHistory` remains the immutable lifecycle and product-card event store.
- `PriceHistory` and `StockHistory` remain operational sources of truth and are not copied into lifecycle history.
- `ProductRevisionRequest` and linked assets enrich revision events with comment, state, and attachments.
- `GET /api/products/:id/history` fetches bounded source windows in parallel, normalizes them into one DTO, merges them newest-first, and returns pagination metadata.
- Authenticated product viewers receive `view_product_history`; no history mutation endpoint exists.
- Future product creation, card edits, asset deletion, supplier changes, manual stock changes, and archive actions now create the appropriate immutable source record.
- Business mutations and their new history records use the same database transaction.
- Existing products are not given fabricated backfill events because the original actor and exact change time cannot be reconstructed reliably.
- `ProductActionTimeline` is reusable from workflow and catalog now and can later be embedded in the product passport.
- API smoke on product `79` returned 15 events from action, price, and stock sources in correct descending order.

## Stage 12 Designer KPI Decision

Approved and implemented on 2026-07-11. Design: `docs/superpowers/specs/2026-07-11-product-designer-kpi-design.md`.

- `Product.kpiWeight` remains the visible product-level KPI value.
- `ProductDesignerKpiEntry` is the reporting ledger and stores product, designer, reviewer, credited weight, and credited date.
- Review approval now requires a KPI weight and credits it to the assigned designer in the same transaction as the lifecycle approval and action history event.
- Preset values are `0.5`, `1`, and `2`; custom positive decimal values are allowed up to `99.99`.
- KPI reports read `ProductDesignerKpiEntry.creditedAt`, not mutable product update timestamps.
- Existing products do not receive fabricated KPI entries because historical designer credit cannot be reconstructed reliably.
- Variation grouping is deferred out of MVP; one approved product card creates one KPI credit.
- Admins can view the basic designer KPI report by period and optional designer filter.
