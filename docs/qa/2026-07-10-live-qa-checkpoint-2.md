# Live QA Checkpoint 2: Kaspi To Completed Sale Launch

Date: 2026-07-10  
Project: `crm3`  
Scope: live browser QA for the product lifecycle from marketplace placement through purchase, warehouse receipt, warehouse passport, and completed sale launch.

## Summary

Status: passed.

- Run ID: `20260710162235`
- Product ID: `79`
- Product: `QA Checkpoint 2 20260710162235`
- Kaspi SKU: `QA2-KASPI-20260710162235`
- Result JSON: `output/playwright/live-qa-checkpoint-2-result-20260710162235.json`
- Screenshots: `output/playwright/checkpoint-2-20260710162235/01-login-admin.png` through `31-completed-sale-panel-saved.png`
- Browser: Playwright Chromium
- Viewport: `1440 x 1100`

The live scenario completed:

`marketplace -> purchase -> warehouse -> in_sale (pending) -> in_sale (completed)`

## Passed Scenarios

1. Admin created a separate QA product and linked a real supplier.
2. Designer uploaded product content and sent the card to review.
3. Admin approved the card for marketplace placement.
4. Marketplace manager published the Kaspi listing and moved the product to purchase.
5. Purchase manager created an official single-product `Order` from the lifecycle panel.
6. Purchase manager confirmed a partial receipt: 4 of 5 units.
7. Warehouse operator filled sector, shelf, cell, weight, dimensions, cost price, and notes.
8. Marketplace manager completed the sale launch with advertising and review bonus enabled while promotion remained optional.
9. The completed product disappeared from the task queue and appeared in the `В продаже` view.
10. Marketplace manager reopened the completed launch, enabled promotion, and saved the update without restarting lifecycle.

## Database Verification

- Lifecycle status: `in_sale`
- Lifecycle completion time: recorded
- Current stock: `4`
- Cost price: `1300`
- Purchase quantity: `5`
- Received quantity: `4`
- Warehouse receipt type: `partial`
- Warehouse location: `QA-A / 03 / 12`
- Kaspi listing status: `in_sale`
- Advertising, promotion, and review bonus: enabled after the follow-up update
- Stock history: recorded
- Cost price history: recorded
- Missing required lifecycle actions: none

Verified action history:

- `marketplace_placement_ready`
- `purchase_marked`
- `warehouse_arrival_marked`
- `warehouse_completed`
- `sale_launch_completed`
- `sale_flags_updated`

## Visual Review

- Purchase form is readable and shows supplier price context.
- Receipt form clearly shows order, supplier, expected quantity, price, and actual quantity.
- Warehouse passport fits in one modal without overlaps or clipped controls.
- Sale launch panel clearly distinguishes optional flags and explicit completion.
- Completed product is visible in the separate `В продаже` view.
- Completed sale settings remain editable and produce a success notification.
- No browser page errors or console errors were recorded.

## Finding

Low severity, deferred to Stage 10:

- Completed workflow cards display `Ответственный: Не назначен` even though the Kaspi listing has a valid `managedBy` marketplace manager. The workflow and role-specific queue are correct. The generic `assignedToUserId` field does not currently represent the responsible employee after review. This should be resolved with the final role/current-assignee model in Stage 10 instead of patching the label locally.

## QA Harness Note

The first technical attempt (`20260710162135`) stopped because the QA locator matched both the queue-card button and the modal button named `Подтвердить поступление`. This was a test selector issue, not a CRM defect. The selector was scoped to the modal, the incomplete QA product was removed, and the complete scenario was rerun successfully.

## Conclusion

Stages 8-9 are live-tested for desktop workflow and database consistency. No functional blockers were found. Work can proceed to Stage 10, with the generic responsible-person display tracked as part of that stage.
