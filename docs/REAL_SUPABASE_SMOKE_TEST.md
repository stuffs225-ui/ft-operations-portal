# Real Supabase Smoke Test

Run on a real Supabase project after migrations + role assignment. Goal: confirm
auth, RBAC, the real write paths, security, empty-DB rendering, and data-quality
flags. Check the dev banner is **absent** (proves real mode).

---

## 1. Auth
- [ ] Log in as real admin → lands on Dashboard, no dev banner.
- [ ] Log out → returns to login.
- [ ] Invalid password → error shown, no session.
- [ ] User with no `user_roles` row → can log in but sees only own profile / is denied protected data.
- [ ] Viewer logs in → read-only navigation.

## 2. Roles (navigation + direct-URL access)
For each of admin, operations_manager, sales_user, sales_coordinator,
procurement_user, factory_user, store_user, qc_user, afs_user, viewer:
- [ ] Sidebar shows only the role's sections.
- [ ] Direct-URL to a hidden page — note result. *(Today not blocked at route
      level — see `RLS_SECURITY_REVIEW.md`; DB RLS still governs data.)*

## 3. Workflow (use the modules with REAL write paths first)
Real, end-to-end persisted paths:
- [ ] Create a quotation (sales_user) → persists; reload shows it.
- [ ] Return / revise a quotation.
- [ ] Create an SO / project; submit for approval.
- [ ] Approve & route (admin) → status changes persist.
- [ ] Add WO (Saudi) / PN (Dubai) via WO/PN Gate → persists.
- [ ] Create a PR (procurement) → persists.
- [ ] Create a PO to Supplier → persists.
- [ ] High-value PO (>10,000 SAR) shows "Pending Approval"; approve as admin.
- [ ] Create a Factory raw-material request → persists.

Modules with **simulated writes** (verify they read real data, but expect the
"Dev mode / not persisted" behavior on create until wired — see gaps doc):
- [ ] Store receipt / vehicle receiving / custody create.
- [ ] Material QC / Project QC / NCR / Release Note actions.
- [ ] Dubai/AFS follow-up, arrival report, pre-delivery, maintenance request.

## 4. Security (query via API, not just UI)
- [ ] factory_user / store_user / qc_user / afs_user / viewer / sales_user query
      `purchase_orders_to_supplier` directly via the API →
      confirm **0 rows** returned (SELECT policy dropped in migration 060).
- [ ] Same roles query `purchase_orders_to_supplier_safe` →
      confirm rows returned for approved projects but `purchase_value` is **NULL**.
- [ ] Same roles query `purchase_order_items_safe` →
      confirm `unit_price` and `line_total` are **NULL**.
- [ ] `procurement_user` attempts to set `approval_status = 'approved'` via API →
      confirm blocked (0 rows updated or trigger exception).
- [ ] viewer attempts any INSERT/UPDATE/DELETE via API → denied.
- [ ] sales_user queries `projects` → only own rows.
- [ ] factory_user queries another module's tables → confirm RLS scope.
- [ ] Unauthenticated request to any table → denied.

## 5. Empty database
- [ ] Every list page (Projects, Quotations, Procurement, Factory, Store, QC,
      Dubai/AFS, Issues, CAPA) renders an empty state — no crash, no infinite spinner.
- [ ] Reports / Control Tower render (note: still mock data even in real mode —
      documented gap).

## 6. Data quality / governance flags
- [ ] Saudi project without WO → factory execution blocked / flagged.
- [ ] Dubai project without PN → follow-up blocked / banner shown.
- [ ] Dubai ETA change without reason → blocked.
- [ ] Medical item without serial → flagged.
- [ ] Open NCR / open findings / incomplete rework → Release Note blocked.
- [ ] Open missing items → pre-delivery readiness blocked.
- [ ] Maintenance closure without resolution notes → blocked.

## Pass criteria
- Auth + the real write paths (sections 3 top half) work end-to-end.
- RLS denies viewer writes, scopes sales reads, blocks anon.
- Empty DB renders gracefully.
- Known gaps (cost exposure, simulated writes, mock reports) are understood and
  tracked in `PRODUCTION_READINESS_GAPS.md`.
