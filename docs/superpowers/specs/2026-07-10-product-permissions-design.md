# Product Permissions Design

Date: 2026-07-10  
Scope: roadmap Stage 10

## Goal

Make product lifecycle and product-card permissions authoritative on the backend, expose the same capabilities to the frontend, and keep completed product cards editable without restarting lifecycle.

## Final Role Map

- `admin`: project lead and technical administrator for the MVP; full product access.
- `designer`: content assets and designer transitions only for products assigned to that user.
- `marketplace_manager`: marketplace listing, selling price, marketplace description, Kaspi data, and sale-launch settings.
- `purchase_manager`: supplier links, initial purchase, arrival confirmation, and cost-price refinement.
- `warehouse_operator`: warehouse passport, stock operations, and cost-price refinement.
- `accountant`: finance and analytics access; no ownership of the product warehouse lifecycle stage.
- Other existing roles receive no product-lifecycle write access.

`project_manager` remains deferred. Existing role names are not renamed.

## Permission Architecture

The backend owns one product permission policy. It answers:

- which lifecycle and supporting actions an actor may perform for a product;
- which product-card fields an actor may update;
- whether assignment constraints apply;
- what capabilities the frontend should render.

Routes remain a coarse first barrier. Services and controllers use the central policy for resource-level and field-level checks. The frontend consumes backend capabilities and does not recreate the role matrix.

The general product update endpoint becomes a partial update. It rejects any submitted field outside the actor's allow-list instead of silently ignoring it. Marketplace listing data remains in `ProductMarketplaceListing`; legacy Kaspi fields are synchronized only by marketplace services.

## Current Responsibility

`assignedToUserId` represents an explicitly assigned current employee. When work belongs to a role pool and no employee is assigned, the UI displays the responsible role instead of "not assigned".

- Designer assignment sets `designerId` and `assignedToUserId`.
- Marketplace editing claims the product for the acting manager and synchronizes `marketplaceManagerId`, listing `managedBy`, and `assignedToUserId` where marketplace ownership is current.
- Transitions to purchase and warehouse clear personal assignment because those stages currently use shared role queues.
- Returning to marketplace ownership restores the known marketplace manager when available.

## Product Editing UX

The existing edit modal becomes capability-aware and partial:

- admin sees the complete product-card form;
- marketplace manager sees only marketplace-owned product fields;
- purchase manager sees cost price;
- warehouse operator edits warehouse-owned data through the warehouse panel and cost price where applicable;
- designer continues to use the asset panel.

The workflow card exposes an edit command only when backend capabilities contain editable fields. Completed sale cards remain editable without lifecycle transitions.

## Error Handling

- Missing authentication: `401`.
- Disallowed role, assignment, action, or submitted field: `403`.
- Invalid allowed field value: `400`.
- Lifecycle state conflicts: `409` where the existing action contract supports it.

## Verification Scope

Stage 10 uses focused verification only:

- one policy test covering the critical allow/deny matrix;
- existing lifecycle service tests affected by responsibility synchronization;
- frontend TypeScript/build verification;
- API smoke for one allowed and one forbidden edit when practical.

The full multi-role browser QA is deferred until Stage 13.
