# Screenshot Run Summary

**Run date:** 6/23/2026, 9:20:37 AM
**Total screenshots captured:** 96 / 96
**Elapsed:** 136.2s

> **Dev Mode:** App ran without Supabase credentials — all 96 routes captured under the `admin` account using the auto-authenticated admin profile. Other accounts were skipped as duplicates. To capture per-role screenshots, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.

## Account Summary

| Key | Label | Role | Routes | Errors | Status |
|-----|-------|------|--------|--------|--------|
| admin | Admin | admin | 96 | 0 | ✅ |
| stuffs | Owner (Stuffs) | admin | 0 | 0 | ⏭ dev mode |
| coo | Operations Manager (COO) | operations_manager | 0 | 0 | ⏭ dev mode |
| ops | Operations Manager (OPS) | operations_manager | 0 | 0 | ⏭ dev mode |
| testsales | Sales User | sales_user | 0 | 0 | ⏭ dev mode |
| sales_test | Sales Test User | sales_user | 0 | 0 | ⏭ dev mode |
| procurement | Procurement User | procurement_user | 0 | 0 | ⏭ dev mode |
| factory | Factory User | factory_user | 0 | 0 | ⏭ dev mode |
| store | Store/Warehouse User | store_user | 0 | 0 | ⏭ dev mode |
| qc | QC User | qc_user | 0 | 0 | ⏭ dev mode |
| afs | AFS (Dubai After-Sales) User | afs_user | 0 | 0 | ⏭ dev mode |
| viewer | Viewer (Management Dashboard) | viewer | 0 | 0 | ⏭ dev mode |

## Notes

- Screenshots are stored under `docs/artifact-context/screenshots/<account-key>/<module>/`
- Auth states are stored under `docs/artifact-context/screenshots/.auth/` (gitignored)
- Dynamic routes (requiring sample IDs) are skipped unless `SAMPLE_*` env vars are set
- Review the visual gallery: `docs/artifact-context/screenshots/index.html`
