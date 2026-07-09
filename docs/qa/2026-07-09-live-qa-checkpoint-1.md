# Live QA Checkpoint 1: Product Lifecycle stages 1-7

Date: 2026-07-09
Project: `crm3`
Scope: live browser QA for implemented product lifecycle stages up to marketplace/Kaspi and transition to purchase.

## Summary

Status: passed after fixing one critical role middleware bug.

Final Playwright run:

- Run ID: `20260709150911`
- Product: `QA Lifecycle 20260709150911`
- Kaspi SKU: `QA-KASPI-20260709150911`
- Result JSON: `output/playwright/live-qa-result-20260709150911.json`
- Screenshots: `output/playwright/01-login-admin.png` through `output/playwright/29-purchase-workflow-final.png`

The live scenario successfully reached `purchase`:

`new -> assigned_to_designer -> content_created -> review -> revision -> review -> marketplace -> purchase`

## Environment

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000/api`
- Database: local PostgreSQL `crm3_db`
- Browser automation: Playwright Chromium

QA users used:

- `admin@example.com`
- `qa_designer@example.com`
- `qa_marketplace@example.com`
- `qa_purchase@example.com`

## Passed live scenarios

1. Admin login.
2. Admin creates a quick product draft from the UI.
3. Admin filters new products, selects the draft, and assigns it to `QA Designer`.
4. Designer sees the product in the personal workflow queue.
5. Designer opens product materials.
6. Designer uploads:
   - product photo;
   - JPG slide;
   - PSD source placeholder.
7. Designer marks content as created.
8. Designer sends content to review.
9. Admin sees the product in review.
10. Admin requests revision with a comment and attachment.
11. Designer sees revision and resubmits.
12. Admin approves the card.
13. Marketplace manager sees the product in marketplace queue.
14. Kaspi panel blocks purchase transition until required fields are ready.
15. Marketplace manager fills status, SKU, Kaspi name, price, saves, and moves product to purchase.
16. Purchase manager sees the product in purchase queue.

## Critical issue found and fixed

### `requireRole` ignored extra role arguments

Observed during live QA:

- Designer could see assigned product and open materials.
- Designer upload requests returned `403 Forbidden`.
- Product had correct `designerId`, but `/api/products/:id/assets` rejected the request.

Root cause:

- Routes use calls like `requireRole('admin', 'designer')`.
- Middleware accepted only the first parameter, so only `admin` was allowed.
- This affected all multi-role routes, not only product assets.

Fix applied:

- `server/middleware/auth.js` now supports both:
  - `requireRole('admin', 'designer')`
  - `requireRole(['admin', 'designer'])`

Regression coverage:

- Added `server/scripts/testAuthMiddleware.js`
- Added npm script `test:auth-middleware`

## Visual review notes

Checked screenshots:

- `11-assets-after-uploads.png`: materials modal shows photo, PSD, JPG groups and uploaded files.
- `17-revision-request-filled.png`: revision modal supports comment and attachment.
- `27-kaspi-panel-filled.png`: Kaspi panel is readable, required fields are clear, purchase button becomes available.
- `29-purchase-workflow-final.png`: purchase manager sees the product after marketplace transition.

No visual blockers found in stages 1-7.

Minor note for a later stage:

- On purchase queue the product shows `Ответственный: Не назначен`. This is acceptable for now because stage 8 purchase ownership/actions are not implemented yet, but should be addressed when implementing purchase/warehouse lifecycle.

## Verification commands

Backend:

```powershell
cd D:\Works\Freelance\PriceList\crm3\server
npm.cmd run test:auth-middleware
npm.cmd run test:workflow
npm.cmd run test:product-assets
npm.cmd run test:product-review
npm.cmd run test:product-marketplace
npm.cmd run test:lifecycle-service
npm.cmd run test:lifecycle
```

Frontend:

```powershell
cd D:\Works\Freelance\PriceList\crm3\client
npm.cmd run build
```

Live QA:

```powershell
cd D:\Works\Freelance\PriceList\crm3
node output\playwright\live-qa-checkpoint.js
```

## Conclusion

Stages 1-7 are ready to be considered live-tested after the role middleware fix.

Recommended next step: continue to stage 8, but keep this Playwright checkpoint as a repeatable smoke test before and after implementing purchase/warehouse logic.
