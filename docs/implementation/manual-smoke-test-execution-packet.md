# Manual Smoke-Test Execution Packet

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`

> Practical, executable packet. Log in with the listed role, go to the route, do the action, record
> Pass/Fail + severity. **Read-only — observe; do not mutate production data.**

Severity key: **B** = blocker (go-live stop) · **M** = major · **m** = minor.

---

## A. 15-Minute Minimum Smoke Test (go/no-go gate)

| # | Role | Route | Action | Expected | Sev | Pass/Fail | Notes |
|---|------|-------|--------|----------|-----|-----------|-------|
| 1 | sales_user | `/sales` | Load | Dashboard renders **or** amber "migration pending" banner with projects/pipeline still visible — **no crash/blank** | B | | |
| 2 | admin | `/admin/invoicing-schedule` | Load | Data **or** calm "migration 100 pending" — no crash | B | | |
| 3 | admin | `/admin/sales-targets` | Load | Data **or** calm "migration 99 pending" — no crash | B | | |
| 4 | sales_coordinator | `/sales-coordinator` | Click a KPI tile | Navigates to `/coordinator-queue` on the matching tab/filter | M | | |
| 5 | admin | `/projects` | Load | KPI strip + list render | M | | |
| 6 | procurement_user | `/procurement/purchase-orders?status=pending_approval` | Load | Opens on Pending Approval tab | M | | |
| 7 | store_user | `/store` | Load | Real counts; loading shows `…` not flashing 0 | M | | |
| 8 | factory_user | `/factory` | Load | Real KPIs; no fake "Requirements Missing" | m | | |
| 9 | qc_user | `/qc` | Load | Real KPIs + skeletons | m | | |
| 10 | afs_user | `/dubai-afs` | Load | Real KPIs + PN-gate alert | m | | |
| 11 | afs_user | `/after-sales` | Click "Critical Priority" KPI | Lands on `/after-sales/maintenance?tab=critical` | m | | |
| 12 | operations_manager | `/control-tower` | Load | Cross-module KPIs + exceptions | M | | |
| 13 | viewer | `/management-dashboard` | Load | Read-only KPIs; **no edit/approve/create** actions | B | | |

If any **B** fails → **No-Go**.

---

## B. Full Role Smoke Test

### Admin
| Route | Action | Expected | Sev | Pass/Fail | Notes |
|-------|--------|----------|-----|-----------|-------|
| `/admin-dashboard` | Load | KPIs + quick actions + monitoring | M | | |
| `/admin/users` | Load | User list; roles from `user_roles` | M | | |
| `/admin/invoicing-schedule` | Load | Data or migration-pending | B | | |
| `/admin/sales-targets` | Load | Data or migration-pending | B | | |
| `/reports` | Load | Full report hub | m | | |

### Sales User
| Route | Action | Expected | Sev | Pass/Fail | Notes |
|-------|--------|----------|-----|-----------|-------|
| `/sales` | Load | KPIs + invoicing plan (or migration banner) | B | | |
| `/sales` | Inspect Pending Invoicing | Real value, or "—" + banner if migration 100 absent | M | | |
| `/projects/new` | Open | Wizard opens (do not submit on prod) | M | | |
| `/hot-projects` | Load | Pipeline list | m | | |
| (any) | Check chrome | No admin links/cards | M | | |

### Sales Coordinator
| `/sales-coordinator` | Load | Priority sections + KPI tiles | M | | |
| `/coordinator-queue?tab=mine` | Load | Opens on "Assigned to Me" | m | | |
| `/quotations` | Load | Requests list | m | | |

### Procurement
| `/procurement` | Load | Real KPIs + queues | M | | |
| `/procurement/requests?status=pr_received` | Load | Matching tab | m | | |
| `/procurement/suppliers?status=pending_review` | Load | Matching filter | m | | |
| `/procurement/purchase-orders` | Inspect | >SAR 10k POs show "Needs Approval" (no logic change) | M | | |

### Store / Factory / QC / Dubai-AFS
| `/store`, `/factory`, `/qc`, `/dubai-afs` | Load each | Real KPIs; gate alerts; no fabricated "Clear" | M | | |
| `/store/qc-handoff` | Load | Pending/Accepted/Rejected tabs | m | | |

### After Sales
| `/after-sales` | Load | 6 real KPIs + recent list | m | | |
| `/after-sales/maintenance?tab=completed` | Load | Opens on Completed | m | | |

### Operations Manager
| `/control-tower` | Load | Cross-module KPIs + exceptions + CSV export | M | | |
| (any) | Check | No admin-only config | M | | |

### Viewer
| `/management-dashboard` | Load | Read-only KPIs + links | B | | |
| (any) | Check | No mutation actions, no admin links | B | | |

### Shared
| `/notifications`, `/inbox`, `/templates` | Load | Render | m | | |
| (auth) | Logout | Returns to login | m | | |
| (guard) | Hit a forbidden route | 403 panel, not blank | M | | |
