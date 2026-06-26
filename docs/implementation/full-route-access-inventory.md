# Full Route Access Inventory

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

Derived from `src/app/App.tsx` (route definitions + `RequireRole` guards), `src/lib/roleMatrix.ts`
(landing routes), `src/data/navigation.ts` (sidebar visibility), and
`tools/screenshots/screenshot-routes.mjs` (route catalogue — **98 static + 23 dynamic = 121
routes**).

**Guard rule:** `admin` always passes every `RequireRole` guard. Role arrays below are the guards
as written in `App.tsx`; `admin` is implied everywhere except where a route is admin-only.

**Legend** — R/M: Read-only or Mutating · Sup: depends on Supabase · Mig: known migration
dependency · States: has empty/loading/error states · Pri: manual-validation priority.

---

## Required-minimum routes (explicit per task)

| Path | Component | Intended roles (guard) | R/M | Sup | Mig dep | States | Recently changed | Pri |
|------|-----------|------------------------|-----|-----|---------|--------|------------------|-----|
| `/sales` | Sales (Dashboard v2) | all roles | R | Yes | **100 (FATAL)**, 068/069/099 | Yes | PR #142 source switch | **High** |
| `/sales-coordinator` | SalesCoordinator | admin, sales_coordinator, ops_mgr | R | Yes | — | Yes | PR #144 redesign | **High** |
| `/projects` | Projects | all roles | R | Yes | 009 | Yes | PR #145 KPI strip | **High** |
| `/projects/new` | ProjectNew | admin, ops_mgr, sales_user | M | Yes | 009/072/073 (code gen) | Yes | — | **High** |
| `/projects/:id` | ProjectDetail | all roles | R/M | Yes | 009/014 | Yes | — | **High** |
| `/hot-projects` | HotProjects | admin, ops_mgr, sales_user, sales_coordinator, viewer | R | Yes | 068 | Yes | — | Medium |
| `/quotations/new` | QuotationNew | all roles | M | Yes | 015/087/088 (gates) | Yes | — | **High** |
| `/quotations` (quotation-requests) | Quotations | all roles | R | Yes | 015 | Yes | — | Medium |
| `/procurement` | Procurement | admin, procurement_user, ops_mgr | R | Yes | 019–024 | Yes | PR #145 | Medium |
| `/procurement/purchase-orders` | ProcurementPurchaseOrders | admin, procurement_user, ops_mgr | R | Yes | 021/061 | Yes | PR #145 `?status=` | **High** |
| `/procurement/requests` | ProcurementRequests | admin, procurement_user, ops_mgr | R | Yes | 019 | Yes | PR #145 `?status=` | Medium |
| `/procurement/suppliers` | ProcurementSuppliers | admin, procurement_user, ops_mgr | R | Yes | 024 | Yes | PR #145 `?status=` | Medium |
| `/store` | Store | admin, store_user, ops_mgr | R | Yes | 029–035 | Yes | PR #146 real counts + loading | **High** |
| `/store/qc-handoff` | StoreQCHandoff | admin, store_user, ops_mgr | R | Yes | 035 | Yes | (reads `?status=`) | Medium |
| `/factory` | Factory | admin, factory_user, ops_mgr | R | Yes | 014/025–028 | Yes | PR #146 removed fake queue | **High** |
| `/factory/requirements` | FactoryRequirements | admin, factory_user, ops_mgr | R/M | Yes | 026 | Yes | — | Medium |
| `/qc` | QC | admin, qc_user, ops_mgr | R | Yes | 035–040 | Yes | — | **High** |
| `/dubai-afs` | DubaiAFS | admin, afs_user, ops_mgr | R | Yes | 041–047 | Yes | — | **High** |
| `/after-sales` | AfterSales | admin, afs_user, ops_mgr | R | Yes | 047 | Yes | PR #147 KPI deep-links | Medium |
| `/after-sales/maintenance` | AfterSalesMaintenance | admin, afs_user, ops_mgr | R/M | Yes | 047 | Yes | PR #147 `?tab=` | Medium |
| `/reports` | Reports | ops_mgr, viewer, all operational, sales_coordinator | R | No (nav hub) | — | Yes (empty state) | — | Medium |
| `/reports/*` | (14 report pages) | role-filtered (see below) | R | Yes | varies | Yes | — | Medium |
| `/control-tower` | ControlTower | ops_mgr, viewer (+admin) | R | Yes | many (cross-module) | Yes | — | **High** |
| `/admin-dashboard` | AdminDashboard | admin only | R | Yes | — | Yes | — | **High** |
| `/admin/invoicing-schedule` | AdminInvoicingSchedule | **admin only** | R/M | Yes | **100 (safe-fallback)** | Yes (migration-pending) | PR #143 | **High** |
| `/admin/sales-targets` | AdminSalesTargets | **admin only** | R/M | Yes | **099 (safe-fallback)** | Yes (migration-pending) | PR #143 | **High** |
| `/management-dashboard` | ManagementDashboard | viewer (+admin) | R (read-only) | Yes | 009/040/068 etc. | Yes | — | **High** |

`/reports/*` role guards (from `App.tsx`): `executive`,`health-scores`,`data-quality`,`sla` →
admin/ops_mgr/viewer; `projects` → +sales_coordinator; `sales` → +sales_user/sales_coordinator;
`procurement`,`suppliers` → +procurement_user; `factory` → +factory_user; `store` → +store_user;
`qc` → +qc_user; `afs` → +afs_user; `issues` → +qc_user/viewer; `capa` → +qc_user.

---

## Shared routes

| Path | Component | Roles | R/M | Pri |
|------|-----------|-------|-----|-----|
| `/` | Root/Landing (redirects to role landing) | all | R | High |
| `/inbox` | Action Inbox | all | R | Medium |
| `/notifications`, `/notifications/settings` | Notifications | all | R/M | Low |
| `/templates`, `/templates/new`, `/templates/generated`, `/templates/:id` | Template Library | all | R/M | Low |
| `/templates/approvals` | Template Approvals | admin, ops_mgr | M | Low |
| unauthorized / 403 | `RequireRole` 403 panel | n/a | R | Medium |

---

## Module route counts (from the screenshot catalogue)

| Module | Static routes | Dynamic routes |
|--------|---------------|----------------|
| Sales | 5 | 1 |
| Sales Coordinator | 5 | 1 |
| Projects / SO | 4 | 2 |
| Procurement | 10 | 3 |
| Store / Warehouse | 13 | 3 |
| Factory / Production | 9 | 1 |
| QC / NCR / Release | 12 | 5 |
| Dubai / AFS | 10 | 3 |
| After Sales | 3 | 1 |
| Reports | 5 (+module report links elsewhere) | 0 |
| Control Tower | 1 | 0 |
| Admin | 10 (incl. 2 commercial-control routes added to manifest this sprint) | 2 |
| Viewer / Management | 1 | 0 |
| Shared | 7 | 1 |
| **Total** | **98** | **23** |

---

## Findings

- **No broken routes found.** All 14 `/reports/*` card links in `Reports.tsx` resolve to defined
  routes (verified). The After Sales `?tab=` and Procurement `?status=` deep-links resolve to
  existing routes that now read those params.
- **Screenshot manifest gap fixed (safe):** `tools/screenshots/screenshot-routes.mjs` was missing
  the two admin commercial-control routes added in PR #143 (`/admin/invoicing-schedule`,
  `/admin/sales-targets`). They were **added** to the Admin module (admin-only) so the screenshot
  baseline covers them. No app route, guard, or behaviour changed.
- **Migration-dependent routes:** `/sales` (migration 100 — fatal, see migration gap audit),
  `/admin/invoicing-schedule` (100 — safe fallback), `/admin/sales-targets` (099 — safe fallback).
- **Route definitions, guards, and `roleMatrix` were NOT changed** in this sprint.
