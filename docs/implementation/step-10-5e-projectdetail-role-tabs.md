# Step 10.5E — ProjectDetail Role-Based Tab Restructure

## Summary

Reduced `ProjectDetail.tsx` from 12 tabs to 6 role-aware tabs.  All existing component logic, Supabase queries, and business rules are preserved. Changes are display-layer only — no route guards, RLS policies, or schema modifications were made.

## Old tab → New tab mapping

| Old tab key   | Old label              | New tab key  | New label          |
|---------------|------------------------|--------------|--------------------|
| `overview`    | Overview               | `overview`   | Overview           |
| `details`     | SO Details             | `commercial` | Commercial         |
| `lines`       | Vehicle Lines          | `commercial` | Commercial         |
| `procurement` | Procurement            | `execution`  | Execution          |
| `factory`     | Factory                | `execution`  | Execution          |
| `store`       | Store                  | `execution`  | Execution          |
| `dubai_afs`   | Dubai / AFS            | `execution`  | Execution          |
| `qc_release`  | QC & Release           | `quality`    | Quality & Release  |
| `documents`   | Documents              | `documents`  | Documents          |
| `approval`    | Approval & Routing     | `overview`   | (section in Overview) |
| `timeline`    | Timeline               | `activity`   | Activity           |
| `audit`       | Audit                  | `activity`   | Activity           |

## Tab role visibility (`TAB_ROLES`)

| Tab          | Roles with access                                                              | Default (no restriction) |
|--------------|--------------------------------------------------------------------------------|--------------------------|
| `overview`   | all roles                                                                      | ✓                        |
| `commercial` | admin, operations_manager, sales_user, sales_coordinator, viewer               |                          |
| `execution`  | admin, operations_manager, procurement_user, factory_user, store_user, afs_user |                         |
| `quality`    | admin, operations_manager, qc_user                                             |                          |
| `documents`  | all roles                                                                      | ✓                        |
| `activity`   | all roles (audit sub-section restricted to canAudit)                           | ✓                        |

`admin` always bypasses all tab restrictions. Roles not listed for a tab simply do not see that tab in the navigation row.

## Key decisions

### Approval content moved into Overview
The old `approval` tab content (approval status card, `RoutingSummaryCard`, `ApprovePanel`) was merged as an "Approval & Routing" section at the bottom of the `overview` panel. Rationale: overview is visible to all roles; `ApprovePanel` already gates its action buttons by `canApprove`; and management users benefit from seeing routing status alongside the project summary.

### SO Details placed in Commercial, not Overview
Adding the full SO Details grid to Overview would have made it very long and duplicated fields already shown in the Project Info cards. Commercial tab = SO Details (full grid) + Vehicle Lines (table). Both sections use the emerald accent colour consistent with the SALES & COMMERCIAL nav group.

### Execution tab groups four departments
Procurement, Factory, Store, and Dubai/AFS are unified under one `execution` tab with h2 section separators. Each sub-section retains its original content unchanged. The Factory sub-section's cross-tab link was updated from `setActiveTab('qc_release')` → `setActiveTab('quality')`.

### Audit remains canAudit-gated inside Activity
`canAudit` was expanded from `admin`-only to `admin || operations_manager` in this step, matching both roles' access to the `/audit-log` page via navigation.

### Safe active tab fallback
A `useEffect` watching `role` resets `activeTab` to `'overview'` if the current tab becomes invisible after role resolution. Since all tab-state is in-memory, there is no URL param to sanitise.

## Files changed

- `src/pages/ProjectDetail.tsx` — 12-tab → 6-tab restructure, all existing logic preserved
- `docs/implementation/step-10-5e-projectdetail-role-tabs.md` — this file

## Governance notes

- No `RequireRole` guards added or removed (route `/projects/:id` has none; restriction is display-layer only).
- No Supabase queries changed.
- No database schema or RLS policy changes.
- `npx tsc --noEmit` passes with zero errors.

## Test checklist

- [ ] All 6 tabs visible to `admin` role
- [ ] `commercial` tab hidden for `factory_user`, `store_user`, `qc_user`, `afs_user`, `procurement_user`
- [ ] `execution` tab hidden for `sales_user`, `sales_coordinator`, `qc_user`, `viewer`
- [ ] `quality` tab hidden for `sales_user`, `sales_coordinator`, `procurement_user`, `factory_user`, `store_user`, `afs_user`, `viewer`
- [ ] `documents` tab visible to all roles
- [ ] `activity` tab visible to all roles; Audit Log section hidden for roles where `canAudit` is false
- [ ] Switching role mid-session resets to `overview` if active tab becomes hidden
- [ ] SO Details grid renders in Commercial tab (all fields present)
- [ ] Vehicle Lines table renders in Commercial tab
- [ ] Procurement PRs and POs render in Execution tab
- [ ] Factory records and RMRs render in Execution tab (Saudi route)
- [ ] Store receipts, vehicle receipts, custody records render in Execution tab
- [ ] Dubai/AFS KPI strip and sub-tables render in Execution tab
- [ ] QC inspections, NCRs, findings, release notes render in Quality tab
- [ ] Document upload/download works in Documents tab
- [ ] Timeline events render in Activity tab
- [ ] Audit Log section renders for `admin` and `operations_manager` in Activity tab
- [ ] "Quality & Release tab" cross-link in Factory section navigates to `quality` tab
- [ ] Approval & Routing section renders at bottom of Overview tab
- [ ] `ApprovePanel` approve/send-back/reject flows work unchanged
- [ ] `WoPnGateCard` renders and WO/PN add form works unchanged
- [ ] Financial columns hidden for roles without `canSeeMoney`
- [ ] `npx tsc --noEmit` zero errors
