# RLS & Security Review — Real Supabase Readiness

**Date:** 2026-05-31
**Scope:** All migration RLS policies + frontend role enforcement.
**Role model:** single role per user, stored in `public.user_roles`, resolved by
`public.current_user_role()` (security-definer, reads `user_roles`).

---

## What was fixed — PR #20 (real-supabase-production-readiness)

| # | Issue | Fix |
|---|---|---|
| 1 | QC/Dubai/AFS policies (035–048) used `auth.jwt() ->> 'role'`, which is never the app role → writes denied, "others" SELECT over-exposed | Replaced with `public.current_user_role()` |
| 2 | Reports/SLA/health/CAPA policies (049–057) queried non-existent `profiles.role` → CREATE POLICY failed | Replaced with `public.current_user_role()` |

After these fixes the **authorization mechanism is consistent** across all
migrations: every policy resolves the role through `current_user_role()`.

## What was fixed — security-hardening-cost-po-approval branch

| # | Gap | Fix | Migration |
|---|---|---|---|
| GAP-01 | Cost columns (`purchase_value`, `unit_price`, `line_total`, `unit_sales_value`, `line_total_value`) returned to restricted roles via API | Dropped `po_ops_roles_select` + `poi_ops_roles_select`; created security-definer masked views (`purchase_orders_to_supplier_safe`, `purchase_order_items_safe`, `project_vehicle_lines_safe`) | 060 |
| GAP-02 | `procurement_user` could self-approve POs via API (no `WITH CHECK` on `po_procurement_all`) | Split `po_procurement_all` into targeted policies; UPDATE policy blocks `approval_status IN ('approved','rejected')`; BEFORE UPDATE trigger double-enforces | 061 |
| GAP-10 (partial) | `qr_coordinator_update` and `qr_sales_update` missing `WITH CHECK` | Added `WITH CHECK` to both; `qr_sales_update` now prevents ownership reassignment | 060 |

---

## ✅ RESOLVED — cost protection now at DB level (was frontend-only)

**RLS is row-level, not column-level.** There is no column masking anywhere, and
the database returns financial columns to roles that should not see them:

| Column | Table | Migration note | Exposed to (via API) |
|---|---|---|---|
| `purchase_value` | `purchase_orders_to_supplier` | `021:90-95` *"application layer hides purchase_value"* | factory, store, qc, afs, viewer, sales |
| `unit_price`, `line_total` | `purchase_order_items` | `022:43-46` — **no project filter at all** | factory, store, qc, afs, viewer, sales |
| `unit_sales_value`, `line_total_value` | `project_vehicle_lines` | `010:74-87` | all approved-project readers |
| `quotation_total_value`, `final_quotation_*` | `quotation_requests`, `quotation_request_lines` | `015/016` | viewer + others on non-draft |

**Impact:** any authenticated user holding one of these roles can read costs
directly through the PostgREST/Supabase API (or the browser network tab),
bypassing the UI's `canSeeCost` guards entirely. The React guards
(`ProjectDetail.tsx`, `ProcurementPODetail.tsx`, etc.) hide the values visually
only — the data is still in the response payload.

### Recommended remediation (safest first)
1. **Security-definer views + revoke base-table SELECT** (recommended):
   create cost-bearing views (e.g. `purchase_orders_public`) that omit cost
   columns, grant SELECT on those to the restricted roles, and `REVOKE SELECT`
   on the cost columns of the base tables. The frontend reads the view for
   restricted roles and the base table for admin/ops.
2. **Column-level `GRANT`/`REVOKE`** on the specific cost columns per role
   (Postgres supports column-level SELECT privileges) combined with RLS — more
   surgical but interacts with PostgREST column selection.
3. **RPC layer:** expose a `security definer` function that returns the
   role-appropriate projection.

This is a deliberate, reviewable change and was **not** auto-applied here because
it touches the read paths of working pages and must be validated end-to-end. It
is the **#1 blocker** for handling cost data with untrusted roles.

---

## ✅ RESOLVED — procurement self-approval now blocked at DB level

`po_procurement_all` (`021:86-88`) is `FOR ALL` with no `WITH CHECK`. The
`set_po_approval_required` trigger only sets a flag; nothing stops a
`procurement_user` from updating their own >10,000 SAR PO to
`approval_status='approved'` with `approved_by = self`. Separation of duties is
currently frontend-only (`Procurement.tsx` approval-queue gating).

### Proposed fix (run after review)
```sql
-- Restrict who may flip approval on high-value POs.
create policy po_approve_admins_only on public.purchase_orders_to_supplier
  for update to authenticated
  using (public.current_user_role() in ('admin','operations_manager'))
  with check (public.current_user_role() in ('admin','operations_manager'));
-- And tighten po_procurement_all with a WITH CHECK that forbids procurement_user
-- from setting approval_status='approved' on rows where approval_required = true.
```

---

## 🟠 HIGH — no route-level role enforcement (frontend)

- `ProtectedRoute.tsx` is an **authentication** gate only; it has no role check.
- `App.tsx` mounts all ~86 routes under one `AppLayout` with no `roles` prop.
- Role gating is **navigation-only** (`Sidebar.tsx` hides links). A user can
  deep-link to any URL (e.g. `/procurement/purchase-orders`) regardless of role.

### Proposed fix
Add an optional `allowedRoles` prop to `ProtectedRoute` (or a small
`<RoleGuard>` wrapper) and apply it to sensitive route groups. Combine with the
DB-level fixes above — the UI guard alone is not a security boundary.

---

## 🟠 HIGH — missing `WITH CHECK` on update policies

| Policy | File | Risk |
|---|---|---|
| `qr_sales_update` | `015:114-119` | sales_user can change `requested_by` (reassign ownership) / push status |
| `sup_qc_update` | `024:71-73` | qc_user can edit any supplier field incl. `procurement_status='approved'` |

Add `WITH CHECK` clauses scoping the mutable columns and preserving ownership.

---

## 🟡 MEDIUM — forgeable audit / timeline

`audit_log` (`004`), `timeline_events` (`005`), `project_timeline_events` (`012`)
accept any authenticated INSERT with client-supplied `actor_*` / `before_*` /
`after_*` fields. A user can write events attributed to someone else.

### Proposed fix
A `BEFORE INSERT` trigger that overwrites `actor_id := auth.uid()` and derives
`actor_role := current_user_role()` server-side, ignoring client-supplied values.

---

## 🟢 LOW

- Over-broad `USING (true)` SELECT on QC + analytics tables (035–040, 052–057)
  lets every authenticated role (incl. viewer) read inspections, NCRs, health
  scores, scorecards. Tighten to project-scoped or role-scoped reads if those
  rows are sensitive.
- `financialVisibility` config in `src/lib/roles.ts` is **dead** (never read);
  cost-visibility role lists are hardcoded and inconsistent across pages
  (`ProjectDetail.tsx:565` admin/ops vs `:569` admin/ops/procurement). Centralize
  into one helper once the DB-level fix lands.
- Dev-mode auth bypass hard-codes `admin` and ships in the bundle
  (`AuthContext.tsx`). Harmless only while env is always configured in prod.

---

## Positives (verified good)

- **No `anon` access** to any protected table; all policies require `auth.uid()`
  / `TO authenticated`.
- **No service-role key** anywhere in `src/` (only the two `VITE_` anon vars).
- **Sales isolation correct:** sales_user sees only own projects/quotations;
  operational roles see only `approved` projects.
- **Viewer is read-only** through all correct policies.
- After this branch's fixes, **all RLS uses one role mechanism**
  (`current_user_role()`), removing the silent-deny / over-expose bugs in 035–057.

See `ROLE_VISIBILITY_MATRIX.md` for the per-role access grid.
