# Full-System Smoke Test Checklist

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> Manual checklist for a real-auth pass (locally or via the screenshot baseline). Fill in
> **Result** (Pass/Fail) and **Notes** during execution. Not executed in the build sandbox (no
> seeded auth). Read-only verification only — do not perform destructive actions.

Columns: **Role · Route · Test · Expected · Result · Notes**

---

## Admin

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/login` | Login as admin | Lands on `/admin-dashboard` | | |
| `/admin-dashboard` | Dashboard loads | KPIs + quick actions + monitoring + governance render | | |
| `/admin/users` | User/role access | User list loads; role source = `user_roles` | | |
| `/admin/invoicing-schedule` | Migration-safe load | Data **or** calm "migration 100 pending" notice — **no crash** | | |
| `/admin/sales-targets` | Migration-safe load | Data **or** calm "migration 99 pending" notice — **no crash** | | |
| `/reports` | Reports access | Full role-filtered report hub | | |
| migration-pending pages | No fatal error | Amber notice, dimmed KPIs, disabled actions | | |

## Sales User

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/login` | Login as sales_user | Lands on `/sales` | | |
| `/sales` | KPI cards | 6 commercial KPIs render (⚠ depends on migration 100) | | |
| `/sales` | Invoicing table | Monthly invoicing plan renders from schedule | | |
| `/sales` | Project links | Links resolve to `/projects/:id` | | |
| `/hot-projects` | Pipeline | Hot projects list loads | | |
| `/quotations/new`, `/projects/new` | Allowed | Sales can open create flows | | |
| (any) | No admin controls | No `/admin/*` links or admin cards visible | | |

## Sales Coordinator

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/sales-coordinator` | Dashboard | Priority sections + clickable KPI tiles | | |
| `/sales-coordinator` | KPI deep links | Tiles navigate to `/coordinator-queue?tab=…`/`?filter=…` | | |
| `/coordinator-queue` | Queue tabs | Tabs reflect `?tab=`/`?filter=`; counts correct | | |
| `/quotations` | Requests | Quotation requests list loads | | |
| (flows) | Returned/clarification/estimation | Visible where allowed | | |

## Procurement

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/procurement` | Dashboard | Real-data KPIs + work queues | | |
| `/procurement` | KPI deep links | Cards navigate with `?status=` | | |
| `/procurement/purchase-orders?status=pending_approval` | PO filter | Opens on Pending Approval tab | | |
| `/procurement/requests?status=pr_received` | PR filter | Opens on matching tab | | |
| `/procurement/suppliers?status=pending_review` | Supplier filter | Opens on matching filter | | |
| `/procurement/purchase-orders` | High-value PO | "Needs Approval" badge on >SAR 10k POs; no logic change | | |

## Store

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/store` | Dashboard | Real counts; loading shows `…` not flashing 0 | | |
| `/store` | QC queues | "QC Accepted/Rejected" + "Custody Pending Approval" show real counts | | |
| `/store/qc-handoff` | Handoff | Pending/Accepted/Rejected tabs load | | |
| `/custody`, `/store/serials` | Custody/serials | Load if present | | |

## Factory

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/factory` | Dashboard | Real KPIs + WO-gate alert | | |
| `/factory` | No fake metric | "Requirements Missing" placeholder is gone | | |
| `/factory/requirements` | Requirements | Page loads | | |
| `/factory` | Production queues | Real counts; no fabricated "Clear" | | |

## QC

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/qc` | Dashboard | Real KPIs + loading skeletons | | |
| `/material-qc/ncrs`, `/qc/rework`, `/project-qc/release-notes` | NCR/rework/release | Load; blocked/released status correct | | |

## Dubai / AFS

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/dubai-afs` | Dashboard | Real KPIs + PN-gate alert | | |
| `/dubai-afs` | PN status | Missing-PN alert renders when applicable | | |
| `/dubai-afs/missing-items`, `/dubai-afs/predelivery-reports` | Delivery readiness | Load | | |
| `/afs/pn-gate`, `/afs/ready-for-delivery` | Gates/readiness | Load; no logic change | | |

## After Sales

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/after-sales` | Dashboard | 6 real-data KPI cards + recent list | | |
| `/after-sales` | KPI deep links | Cards navigate to `/after-sales/maintenance?tab=…` | | |
| `/after-sales/maintenance?tab=critical` | Tabs | Opens on Critical tab | | |
| `/after-sales/maintenance` | Parts Waiting | KPI links to In Progress tab (documented superset) | | |

## Operations Manager

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/control-tower` | Control Tower | Cross-module KPIs + critical exceptions | | |
| `/control-tower` | Export | Overdue CSV export works | | |
| (any) | No admin actions | No admin-only configuration available | | |

## Viewer

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/management-dashboard` | Dashboard | Read-only KPIs + visibility/report links | | |
| (any) | Read-only | No edit/approve/delete/create actions | | |
| (any) | No admin links | No `/admin/*` exposure | | |

## Shared

| Route | Test | Expected | Result | Notes |
|-------|------|----------|--------|-------|
| `/notifications` | Notifications | Loads | | |
| `/inbox` | Action inbox | Loads | | |
| `/templates` | Templates | Loads | | |
| (auth) | Logout | Returns to login | | |
| (guard) | Forbidden route | 403 panel (not blank) | | |
| (all) | No blank screens / console errors on key routes | Clean | | |
