# Screenshot Run Summary — Real-Auth Baseline

**Date:** 6/23/2026, 9:56:45 AM
**Main SHA:** f9e2f5d
**APP_BASE_URL:** http://localhost:5173
**AUTH_MODE:** REAL_AUTH

## Totals

| Metric | Count |
|--------|-------|
| Accounts configured | 12 |
| Login successes | 0 |
| Login failures | 1 |
| Screenshots captured (OK) | 0 |
| Access restricted (shown) | 0 |
| Errors / failures | 0 |
| Elapsed | 20.8s |

## Account Summary

| Key | Intended Role | Detected Landing | Detected Role | Login | Routes | OK | Restricted | Errors |
|-----|--------------|-----------------|---------------|-------|--------|----|------------|--------|
| admin | admin | — | — | ❌ | 96 | 0 | 0 | 0 |
| stuffs | admin | — | — | — | 0 | 0 | 0 | 0 |
| coo | operations_manager | — | — | — | 0 | 0 | 0 | 0 |
| ops | operations_manager | — | — | — | 0 | 0 | 0 | 0 |
| sales-test | sales_user | — | — | — | 0 | 0 | 0 | 0 |
| testsales | sales_user | — | — | — | 0 | 0 | 0 | 0 |
| procurement | procurement_user | — | — | — | 0 | 0 | 0 | 0 |
| factory | factory_user | — | — | — | 0 | 0 | 0 | 0 |
| store | store_user | — | — | — | 0 | 0 | 0 | 0 |
| qc | qc_user | — | — | — | 0 | 0 | 0 | 0 |
| afs | afs_user | — | — | — | 0 | 0 | 0 | 0 |
| viewer | viewer | — | — | — | 0 | 0 | 0 | 0 |


## Screenshots Per Module

| Module | Captured |
|--------|----------|
| 1. Sales | 0 |
| 2. Sales Coordinator | 0 |
| 3. Projects / Sales Orders | 0 |
| 4. Procurement | 0 |
| 5. Store / Warehouse | 0 |
| 6. Factory / Production | 0 |
| 7. QC / NCR / Release | 0 |
| 8. Dubai / AFS | 0 |
| 9. After Sales | 0 |
| 10. Reports | 0 |
| 11. Control Tower | 0 |
| 12. Admin | 0 |
| 13. Viewer / Management | 0 |
| 14. Shared | 0 |


## Notes

- AUTH_MODE must be REAL_AUTH for this baseline to be valid for role-based Artifact review
- Access-restricted screenshots show the RequireRole 403 panel for the account's role
- Dynamic routes skipped unless SAMPLE_* env vars are set
- Screenshots path: `docs/artifact-context/screenshots/<account>/<module>/<route>.png`
- HTML gallery: `docs/artifact-context/screenshots/index.html`

## Recommended First Module to Improve

**01 — Sales** (first in improvement order)
