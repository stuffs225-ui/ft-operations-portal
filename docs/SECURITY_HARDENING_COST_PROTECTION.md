# Security Hardening — Cost Column Protection (GAP-01)

**Date:** 2026-05-31  
**Branch:** security-hardening-cost-po-approval  
**Status:** ✅ Implemented  
**Migration:** `060_cost_protection.sql`

---

## Problem

PostgreSQL row-level security (RLS) is row-level only — it cannot mask individual
columns. When a restricted role (factory_user, store_user, qc_user, afs_user,
viewer, sales_user) had a SELECT row policy on a cost-bearing table, **every
column** was returned in the Supabase REST API response, including financial
figures the UI was visually hiding.

### Exposed columns before this fix

| Column | Table | Exposed to |
|---|---|---|
| `purchase_value` | `purchase_orders_to_supplier` | factory, store, qc, afs, viewer, sales |
| `unit_price` | `purchase_order_items` | factory, store, qc, afs, viewer, sales |
| `line_total` | `purchase_order_items` | factory, store, qc, afs, viewer, sales |
| `unit_sales_value` | `project_vehicle_lines` | all approved-project readers |
| `line_total_value` | `project_vehicle_lines` | all approved-project readers |

---

## Solution

### 1. Drop restricted-role SELECT policies from base tables

`po_ops_roles_select` (migration 021) and `poi_ops_roles_select` (migration 022)
gave restricted roles direct SELECT access to the base tables. These are dropped
in migration 060. Restricted roles now have **zero SELECT access** to the base
tables and must use the safe views.

### 2. Security-definer views with column masking

Three views are created in migration 060:

#### `purchase_orders_to_supplier_safe`
- All non-cost columns returned unchanged.
- `purchase_value` → returns actual value for `admin`, `operations_manager`,
  `procurement_user`; returns `NULL` for all other roles.
- Row-level WHERE clause mirrors the original RLS logic: restricted roles see
  only POs belonging to approved projects.

#### `purchase_order_items_safe`
- `unit_price` and `line_total` masked to `NULL` for restricted roles.
- Row access joined through parent PO → project status check.

#### `project_vehicle_lines_safe`
- `unit_sales_value` and `line_total_value` masked to `NULL` for all roles
  except admin, operations_manager, and the creating sales_user (own project).
- All other vehicle spec columns (type, quantity, description) returned normally.

### 3. How security-definer views work in Supabase

Views created without `security_invoker = true` run as the **view owner**
(the Postgres superuser). This bypasses base-table RLS. Row and column security
is entirely enforced by the view's own WHERE clause and CASE expressions, which
call `public.current_user_role()` and `auth.uid()` to identify the caller.

PostgREST exposes all public-schema views via the REST API. The `authenticated`
role is granted SELECT on each view explicitly.

---

## Frontend impact

`ProjectDetail.tsx` is the only frontend page that queries
`purchase_orders_to_supplier` and is accessible to all project-participant roles.
Its query was updated to use `purchase_orders_to_supplier_safe` (simple `select('*')`
without the now-unnecessary project join, since project data is already loaded on
that page).

Procurement-module pages (`ProcurementPurchaseOrders.tsx`, `ProcurementPODetail.tsx`,
`ProcurementRequestDetail.tsx`, `ProcurementSupplierDetail.tsx`) are UI-guarded to
admin/ops/procurement and continue to query the base table directly. Their FK join
hints remain intact.

---

## GAP-10 partial fix (same migration)

Two quotation UPDATE policies were missing `WITH CHECK` clauses:

- `qr_coordinator_update`: no WITH CHECK — coordinator could push rows to any
  state. Fixed: WITH CHECK mirrors USING (belt-and-suspenders).
- `qr_sales_update`: no WITH CHECK — sales_user could change `requested_by`
  (reassign quotation ownership). Fixed: WITH CHECK enforces
  `requested_by = auth.uid()`.

---

## Smoke test verification

After running migration 060 on a real Supabase project:

```sql
-- 1. Confirm restricted role cannot query base table
-- (Run as factory_user or store_user via API)
SELECT purchase_value FROM purchase_orders_to_supplier LIMIT 1;
-- Expected: 0 rows (no policy → empty, not an error, because RLS is permissive-by-default-to-empty)

-- 2. Confirm restricted role sees NULL cost from view
SELECT purchase_value FROM purchase_orders_to_supplier_safe LIMIT 5;
-- Expected: all purchase_value values are NULL

-- 3. Confirm admin sees actual values from view
SELECT purchase_value FROM purchase_orders_to_supplier_safe LIMIT 5;
-- Expected: actual numeric values

-- 4. Confirm unit_price/line_total masked in items view
SELECT unit_price, line_total FROM purchase_order_items_safe LIMIT 5;
-- As restricted role: NULL, NULL
-- As admin: actual values
```

---

## What remains (not in this PR)

- `quotation_total_value` in `quotation_requests`: viewer can read non-draft
  quotation totals via the API. Low priority (viewer is a trusted internal role).
  Can be addressed with a `quotation_requests_safe` view following the same pattern.
- `financialVisibility` in `src/lib/roles.ts` is still dead code (never read).
  Once all safe views are in place, consolidate role-based cost visibility into
  one helper that checks against the view.
- GAP-13: over-broad `USING (true)` on QC/analytics tables still present.
