# Product Designer KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 12 so product review approval credits a designer KPI weight and admins can view a basic period report.

**Architecture:** Keep `Product.kpiWeight` as the product-visible value, but add `ProductDesignerKpiEntry` as the reporting ledger. Approval writes product update, KPI entry, and history in one transaction; the report reads the ledger instead of deriving from mutable product state.

**Tech Stack:** Express, Sequelize, PostgreSQL, React 19, TypeScript, TailwindCSS, existing JWT auth and route conventions.

## Global Constraints

- Main branch only; do not create or depend on `/client` branch.
- No temporary fields, fake backfills, or UI-only business rules.
- Backend validation is authoritative.
- Do not over-test UI details; focus on KPI calculation and critical approval behavior.
- Full browser QA remains scheduled after Stage 13.

---

### Task 1: KPI Service And Tests

**Files:**
- Create: `server/services/productDesignerKpiService.js`
- Create: `server/scripts/testProductDesignerKpiService.js`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `normalizeKpiWeight(value): number`
- Produces: `buildApproveReviewKpiPlan({ actor, product, kpiWeight, now }): { productUpdate, kpiEntry, historyMetadata }`
- Produces: `buildDesignerKpiReport(entries): { summary, designers }`

- [ ] Add failing service tests for valid weights, invalid weights, approval plan, and report grouping.
- [ ] Run `npm.cmd run test:product-designer-kpi` and confirm the missing module failure.
- [ ] Implement the KPI service.
- [ ] Add the package script.
- [ ] Run `npm.cmd run test:product-designer-kpi` and confirm pass.

### Task 2: Backend Persistence And Approval Flow

**Files:**
- Create: `server/models/ProductDesignerKpiEntry.js`
- Create: `server/migrations/20260711000000-create-product-designer-kpi-entries.js`
- Modify: `server/models/index.js`
- Modify: `server/models/associations.js`
- Modify: `server/services/productReviewService.js`
- Modify: `server/controllers/productController.js`
- Modify: `server/routes/products.js`
- Modify: `server/scripts/testProductReviewService.js`

**Interfaces:**
- Consumes: `buildApproveReviewKpiPlan`
- Produces: `ProductDesignerKpiEntry` model and `designerKpiEntry` association

- [ ] Update review service tests to require `kpiWeight` on approval.
- [ ] Run `npm.cmd run test:product-review` and confirm the expected failure.
- [ ] Add the model, migration, associations, and model export.
- [ ] Update approval service/controller/route to validate and persist KPI entry transactionally.
- [ ] Run `npm.cmd run test:product-review` and `npm.cmd run test:product-designer-kpi`.

### Task 3: KPI Report API

**Files:**
- Modify: `server/controllers/analyticsController.js`
- Modify: `server/routes/analytics.js`

**Interfaces:**
- Produces: `GET /api/analytics/designer-kpi`

- [ ] Add report controller using `ProductDesignerKpiEntry` with product and designer includes.
- [ ] Add admin-only analytics route.
- [ ] Reuse `buildDesignerKpiReport` for aggregation.
- [ ] Run focused backend tests and syntax checks.

### Task 4: Frontend Approval And Report UI

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/components/ProductReviewActions.tsx`
- Create: `client/src/pages/DesignerKpiReport.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Sidebar.tsx`
- Modify: `client/src/services/analyticsApi.ts`

**Interfaces:**
- Consumes: `POST /api/products/:id/lifecycle/approve` with `{ kpiWeight }`
- Consumes: `GET /api/analytics/designer-kpi`

- [ ] Add frontend types and analytics API method.
- [ ] Add KPI picker to approval panel.
- [ ] Add admin report page and sidebar route.
- [ ] Run frontend build.

### Task 5: Docs And Final Verification

**Files:**
- Modify: `docs/product-lifecycle-architecture.md`
- Modify: `docs/superpowers/plans/2026-07-06-product-lifecycle-roadmap.md`

**Interfaces:**
- Documents Stage 12 final decision and verification results.

- [ ] Update architecture and roadmap with Stage 12 implementation notes.
- [ ] Run focused backend tests.
- [ ] Run `npm.cmd run build` in `client`.
- [ ] Run `git diff --check`.
