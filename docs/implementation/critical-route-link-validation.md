# Critical Route and Link Validation

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`

Static validation of route definitions (`App.tsx`), deep-link destinations, and the screenshot
manifest. **No route, guard, or permission was changed.**

---

## Results

| Link group | Checked | Result |
|------------|---------|--------|
| Admin commercial routes | `/admin/invoicing-schedule`, `/admin/sales-targets` | ✅ both defined (admin-only) |
| After Sales tab deep-links | `/after-sales/maintenance?tab=open\|in_progress\|critical\|completed\|all` | ✅ route defined; **destination reads `?tab=`** (validated against `TABS`) |
| Procurement status deep-links | `/procurement/purchase-orders?status=`, `/procurement/requests?status=`, `/procurement/suppliers?status=` | ✅ all 3 routes defined; **each destination reads `?status=`** (validated against `STATUS_TABS`) |
| Sales Coordinator deep-links | `?tab=mine`, `?tab=estimation`, `?tab=all`, `?filter=unassigned\|clarification\|ready\|overdue` | ✅ `/coordinator-queue` reads `?tab=` and `?filter=`; **every source value maps to a valid `QueueTab`/`QuickFilter` key** |
| Reports cards | all 14 `/reports/*` targets | ✅ all defined (re-confirmed; no broken links) |
| Screenshot manifest | key pages incl. the 2 admin commercial routes | ✅ present (added in PR #148); manifest parses 98 static / 121 total |

### Source → destination contract (deep-links)

- **After Sales:** `AfterSales.tsx` KPI cards → `AfterSalesMaintenance.tsx` (`searchParams.get('tab')`,
  falls back to `open`). "Parts Waiting" → `?tab=in_progress` (documented correct superset).
- **Procurement:** dashboard KPI cards → `ProcurementPurchaseOrders` / `ProcurementRequests` /
  `ProcurementSuppliers` (`searchParams.get('status')`, validated, falls back to `all`).
- **Sales Coordinator:** `SalesCoordinator.tsx` KPI tiles → `CoordinatorQueue.tsx`
  (`searchParams.get('tab')` + `get('filter')`).

---

## Fixes made

**None required** — no broken links were found. (The only manifest gap, the two admin
commercial-control routes, was already added in PR #148.)

## Remaining risk

- **None at the routing/link layer.** All validated statically.
- Functional rendering of each route (live) is covered by the manual smoke-test packet and the
  screenshot baseline (both require real auth/data not available in the build sandbox).
