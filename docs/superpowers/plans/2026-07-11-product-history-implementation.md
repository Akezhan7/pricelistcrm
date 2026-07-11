# Product History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 11 unified immutable product history from existing operational sources.

**Architecture:** A focused backend service normalizes action, price, stock, and revision records into one DTO. Missing important actions are recorded transactionally. A reusable React timeline consumes the paginated endpoint.

**Tech Stack:** Node.js, Express, Sequelize, React, TypeScript.

**Status:** Implemented on 2026-07-11. Focused verification passed; full browser QA remains scheduled after Stage 13.

## Global Constraints

- Do not add another history table.
- Do not duplicate price or stock records into `ProductActionHistory`.
- Do not expose history mutation endpoints.
- Keep verification focused; full browser QA is deferred until after Stage 13.

---

### Task 1: Timeline Domain Service

**Files:**
- Create: `server/constants/productHistory.js`
- Create: `server/services/productHistoryService.js`
- Create: `server/scripts/testProductHistoryService.js`
- Modify: `server/package.json`

**Produces:** `normalizeActionEvent`, `normalizePriceEvent`, `normalizeStockEvent`, `mergeProductTimeline`, `buildProductActionEntry`, and `buildProductUpdateDiff`.

- [ ] Write one failing service test with action, price, stock, and revision fixtures.
- [ ] Confirm failure because the history service does not exist.
- [ ] Implement stable event constants, normalizers, merge ordering, pagination, and compact diff building.
- [ ] Run the focused service test until green.

### Task 2: Read-Only History API

**Files:**
- Create: `server/controllers/productHistoryController.js`
- Modify: `server/routes/products.js`
- Modify: `server/constants/productPermissions.js`
- Modify: `server/scripts/testProductPermissions.js`

**Produces:** `GET /api/products/:id/history?page=1&limit=50` and `view_product_history` capability.

- [ ] Add the capability expectation to the existing permission matrix test and confirm it fails.
- [ ] Add the read capability and authenticated read-only route.
- [ ] Query existing sources in parallel with actor and revision attachment associations.
- [ ] Return pagination metadata and no mutation routes.

### Task 3: Fill Important Event Gaps

**Files:**
- Modify: `server/controllers/productController.js`
- Modify: `server/services/productHistoryService.js`

**Produces:** transactional creation, card-edit, asset-delete, supplier, stock, and archive events.

- [ ] Use the event-builder test to define compact changed-field metadata.
- [ ] Record product creation in the existing draft transaction.
- [ ] Make legacy create and product update atomic with their new action entries and existing price history.
- [ ] Record asset deletion, supplier changes, manual stock updates, and archive/delete actions in the same transaction.
- [ ] Avoid writing duplicate price and stock action events.

### Task 4: Timeline UI

**Files:**
- Create: `client/src/components/ProductActionTimeline.tsx`
- Create: `client/src/components/ProductHistoryModal.tsx`
- Modify: `client/src/types/index.ts`
- Modify: `client/src/services/productsApi.ts`
- Modify: `client/src/pages/ProductWorkflowPage.tsx`
- Modify: `client/src/components/ProductList.tsx`

**Produces:** reusable paginated history timeline opened from workflow and catalog cards.

- [ ] Add typed timeline DTO and API method.
- [ ] Render compact date-grouped events with actor, time, transition, details, and revision attachments.
- [ ] Add an icon command only when backend capability contains `view_product_history`.
- [ ] Reuse one modal component in both surfaces.

### Task 5: Documentation And Focused Verification

**Files:**
- Modify: `docs/product-lifecycle-architecture.md`
- Modify: `docs/superpowers/plans/2026-07-06-product-lifecycle-roadmap.md`

- [ ] Record the implemented Stage 11 aggregation decision.
- [ ] Run the product-history, permission, and directly affected lifecycle tests.
- [ ] Run API smoke against a real product.
- [ ] Run frontend production build and `git diff --check`.
- [ ] Do not run the full browser QA checkpoint.
