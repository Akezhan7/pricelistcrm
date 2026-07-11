# Product Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Stage 10 product permissions on the backend and render the resulting capabilities in product workflow UI.

**Architecture:** A central backend policy owns action and field decisions. Product responses expose per-actor capabilities, while mutation services reject forbidden fields and synchronize explicit responsibility. React renders controls from those capabilities.

**Tech Stack:** Node.js, Express, Sequelize, React, TypeScript.

**Status:** Implemented on 2026-07-10. Focused verification passed; full role-based browser QA remains scheduled after Stage 13.

## Global Constraints

- Work on the current `main` workspace; do not create `/client` or worktree branches.
- Do not rename existing roles or add `project_manager`.
- Do not duplicate marketplace listing data in the generic product editor.
- Add only focused tests; full browser QA is deferred until Stage 13.

---

### Task 1: Central Product Permission Policy

**Files:**
- Create: `server/constants/productPermissions.js`
- Create: `server/scripts/testProductPermissions.js`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `getProductPermissions({ user, product })`, `assertProductActionAllowed(...)`, `assertProductFieldsAllowed(...)`.

- [ ] Write a failing matrix test for admin, assigned designer, foreign designer, marketplace manager, purchase manager, warehouse operator, and accountant.
- [ ] Run `npm.cmd run test:product-permissions` and confirm failure because the policy does not exist.
- [ ] Implement the smallest central policy that passes the matrix.
- [ ] Run the focused policy test again.

### Task 2: Backend Mutation Enforcement And Responsibility

**Files:**
- Modify: `server/controllers/productController.js`
- Modify: `server/services/productLifecycleService.js`
- Modify: `server/services/productReviewService.js`
- Modify: `server/services/productMarketplaceService.js`
- Modify: `server/services/productLifecyclePurchaseService.js`
- Modify: `server/services/productSaleLaunchService.js`
- Modify: `server/routes/products.js`

**Interfaces:**
- Consumes: central permission assertions.
- Produces: field-safe partial product update and consistent responsible employee fields.

- [ ] Add failing policy/service assertions for forbidden generic edits and responsibility changes.
- [ ] Replace broad product update permission with field-level enforcement.
- [ ] Synchronize assignment on lifecycle ownership transitions.
- [ ] Keep marketplace listing as the source of Kaspi data.
- [ ] Run the focused permission and affected lifecycle tests.

### Task 3: Capability-Aware Product Responses

**Files:**
- Modify: `server/controllers/productController.js`
- Modify: `server/services/productWorkflowService.js`

**Interfaces:**
- Produces: `permissions.allowedActions`, `permissions.editableFields`, `permissions.canEditCard`, and responsibility labels on product responses.

- [ ] Attach actor-specific capabilities to product detail and workflow items.
- [ ] Resolve a responsible user first and a responsible role label second.
- [ ] Extend the focused workflow test for capability serialization.

### Task 4: Role-Safe User Management

**Files:**
- Modify: `server/models/User.js`
- Modify: `server/routes/auth.js`
- Modify: `client/src/context/AuthContext.tsx`
- Modify: `client/src/pages/Users.tsx`
- Modify: `client/src/components/Sidebar.tsx`

**Interfaces:**
- Produces: one consistent list and display mapping for all supported roles.

- [ ] Allow `designer` and `marketplace_manager` in backend user validation.
- [ ] Complete missing role labels in navigation and user management.
- [ ] Keep user administration restricted to admin.

### Task 5: Capability-Aware Product Editing UI

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/components/EditProductModal.tsx`
- Modify: `client/src/components/forms/ProductFormFields.tsx`
- Modify: `client/src/hooks/useProductEditor.tsx`
- Modify: `client/src/pages/ProductWorkflowPage.tsx`
- Modify: lifecycle action panels under `client/src/components/`.

**Interfaces:**
- Consumes: backend product permissions.
- Produces: role-specific edit form and workflow edit command.

- [ ] Add permission types and submit only editable fields.
- [ ] Hide or disable fields using backend capabilities.
- [ ] Add the edit command to workflow cards when permitted.
- [ ] Replace duplicated role checks in touched lifecycle panels with backend action capabilities.
- [ ] Run frontend build and focused backend tests; do not run full browser QA.

### Task 6: Documentation And Final Verification

**Files:**
- Modify: `docs/product-lifecycle-architecture.md`
- Modify: `docs/superpowers/plans/2026-07-06-product-lifecycle-roadmap.md`

- [ ] Record the implemented Stage 10 role and permission decisions.
- [ ] Run the focused permission and affected lifecycle tests.
- [ ] Run frontend production build.
- [ ] Run `git diff --check`.
- [ ] Leave QA Checkpoint 3 scheduled after Stage 13.
