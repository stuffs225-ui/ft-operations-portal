# Role-by-Role Test Plan

**Date:** 2026-06-01
**Pre-condition:** Admin smoke test (`ADMIN_SMOKE_TEST_RESULTS.md`) must pass manually in the browser before any role users are created.
**Branch:** prelaunch-reports-templates-access-notifications
**Migrations applied:** 001–066

> **DO NOT create any role users until the admin has manually verified the smoke test checklist in `ADMIN_SMOKE_TEST_RESULTS.md`.**

---

## 1. Overview and Pre-conditions

### What this plan covers
This document provides a step-by-step test scenario for each of the 9 non-admin roles in the FT Operations Portal. Each role is tested by:
1. Creating a Supabase Auth user
2. Assigning the role via SQL
3. Logging in and verifying sidebar visibility
4. Attempting a representative write action (allowed and blocked)
5. Verifying cost column masking where applicable
6. Confirming all critical security cases

### Stack architecture
- **Auth:** Supabase email+password auth. Role stored in `public.user_roles`.
- **Role resolution:** `public.current_user_role()` — reads `user_roles` table; returns first role for the user.
- **Nav enforcement:** cosmetic (sidebar `roles[]` filter in `src/data/navigation.ts`). **DB RLS is the authoritative guard.**
- **Cost protection:** security-definer views (`purchase_orders_to_supplier_safe`, `purchase_order_items_safe`, `project_vehicle_lines_safe`) from migration 060.
- **PO approval guard:** BEFORE UPDATE trigger `enforce_po_approval_authority` from migration 061.
- **Project isolation:** `can_read_project()` / `can_write_project()` helpers from migration 013.

### Pre-conditions
- [ ] Admin smoke test passed manually (all checklist items in `ADMIN_SMOKE_TEST_RESULTS.md` confirmed)
- [ ] At least one approved project exists in the DB (needed for operational role read tests)
- [ ] At least one draft project with `created_by = <sales_user_uuid>` (for sales_user isolation test)
- [ ] At least one Purchase Order exists in `submitted_for_approval` status (for PO approval trigger test)
- [ ] Build is clean (`npm run build` zero TypeScript errors)

### Navigation source of truth
Navigation items are defined in `src/data/navigation.ts` with `roles[]` arrays. Items with no `roles` array are visible to all authenticated users (Dashboard, Projects/SO).

---

## 2. Per-Role Test Matrix

### Role: `operations_manager`

| Category | Details |
|----------|---------|
| **Visible nav sections** | ALL — same as admin except: no Settings, no Admin/Users, no Audit Log |
| **Visible items** | Quotations, Sales Workspace, Sales Coordinator, Projects/SO, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Material Custody, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, After Sales, Control Tower, Reports, Document Templates, Notifications, Access Requests, Notification Rules, Report Subscriptions |
| **Hidden items** | Settings (`roles: ['admin']`), Admin/Users (`roles: ['admin']`), Audit Log (`roles: ['admin']`) |
| **Write actions allowed** | Everything admin can do except: cannot access Settings or manage users |
| **Write actions blocked** | Settings page mutations, user role assignments (no access to Admin/Users) |
| **Cost visibility** | Full — `purchase_value`, `unit_price`, `line_total`, `unit_sales_value`, `line_total_value` all returned real (not NULL) by safe views |
| **End-to-end test scenario** | 1. Log in as ops_manager. 2. Confirm sidebar missing Settings/Admin-Users/Audit-Log. 3. Navigate to Admin Approvals — confirm pending projects visible. 4. Approve one submitted project. 5. Navigate to Procurement → Purchase Orders. 6. Approve a PO in `submitted_for_approval` status. 7. Confirm `approved_by` set to ops_manager UUID in `purchase_orders_to_supplier` table. |

---

### Role: `sales_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | SALES: Quotations, Sales Workspace, After Sales. PROJECTS: Projects/SO. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Quotations, Sales Workspace, Projects/SO, After Sales, Reports, Document Templates, Notifications |
| **Hidden items** | Sales Coordinator, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Material Custody, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, Control Tower, Access Requests (admin/ops only), Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Create new projects (own only). Edit own quotation requests in draft/need_clarification status. Create after-sales maintenance requests. |
| **Write actions blocked** | Cannot approve projects (no access to Admin Approvals). Cannot approve/reject POs (trigger blocks + no procurement access). Cannot edit other users' projects (RLS: can_write_project checks created_by = auth.uid() AND status in draft/sent_back). |
| **Cost visibility** | `unit_sales_value` and `line_total_value`: visible ONLY for own projects (safe view CASE checks created_by = auth.uid()). `purchase_value`, `unit_price`, `line_total`: NULL (not procurement role). |
| **Critical RLS check** | `sales_user` can only read own draft projects + all approved projects. Cannot see other sales_users' draft projects. |
| **End-to-end test scenario** | 1. Log in as sales_user_A. 2. Go to Projects — confirm only own drafts + all approved projects listed. 3. Create a new project (SO-SALES-001). 4. Confirm navigation to project detail. 5. In SQL Editor: `SELECT id FROM projects WHERE created_by = '<sales_user_A_uuid>' AND project_status = 'draft'` — should return the new project. 6. Log in as sales_user_B (different user). 7. Go to Projects — confirm SO-SALES-001 (draft by A) is NOT visible. 8. In API/SQL: attempt to read it directly — RLS should deny. |

---

### Role: `sales_coordinator`

| Category | Details |
|----------|---------|
| **Visible nav sections** | SALES: Quotations, Sales Coordinator. PROJECTS: Projects/SO. MANAGEMENT: Reports, Notifications |
| **Visible items** | Quotations, Sales Coordinator, Projects/SO, Reports, Notifications |
| **Hidden items** | Sales Workspace, After Sales, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Material Custody, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, Control Tower, Document Templates (not in `roles[]`), Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Update quotation requests (coordinator role allowed by `qr_coordinator_update` policy — WITH CHECK added in migration 060). |
| **Write actions blocked** | Cannot create projects. Cannot approve anything. Cannot write to any operational table. |
| **Cost visibility** | All cost columns NULL — not in admin/ops/procurement role. Cannot see PO values, vehicle line sales values. |
| **End-to-end test scenario** | 1. Log in as sales_coordinator. 2. Confirm sidebar shows Quotations and Sales Coordinator but NOT Sales Workspace. 3. Navigate to Quotations — confirm list of open quotations visible (approved projects only). 4. Open one quotation and update status or add a note. 5. Attempt to reassign `requested_by` to a different user via API PATCH — WITH CHECK should block (RLS violation). |

---

### Role: `procurement_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO. OPERATIONS: Procurement. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Projects/SO, Procurement, Reports, Document Templates, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, After Sales, Admin Approvals, WO/PN Gate, Factory, Store, Material Custody, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, Control Tower, Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Create procurement requests. Create purchase orders (draft). Update PO status to pending_approval. Delete own PO drafts. |
| **Write actions blocked** | Cannot set `approval_status = 'approved'` or `'rejected'` on any PO — blocked by both RLS WITH CHECK AND the BEFORE UPDATE trigger (migration 061). |
| **Cost visibility** | Full cost visibility — `purchase_value`, `unit_price`, `line_total` returned real by safe views. `unit_sales_value` / `line_total_value` on vehicle lines: NULL (not admin/ops/sales_user). |
| **Critical security check** | Self-approval is double-blocked: RLS WITH CHECK + trigger `enforce_po_approval_authority`. |
| **End-to-end test scenario** | 1. Log in as procurement_user. 2. Navigate to Procurement → Purchase Orders. 3. Create a new PO for an approved project. 4. Submit for approval. 5. Attempt to approve own PO via API: `PATCH /rest/v1/purchase_orders_to_supplier?id=eq.<uuid>` with body `{"approval_status":"approved"}`. 6. Confirm error: `"Only admin or operations_manager may approve or reject a Purchase Order."`. 7. Log out. 8. Log in as admin. 9. Approve the PO. Confirm `approved_by` = admin UUID. |

---

### Role: `factory_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO, WO/PN Gate. OPERATIONS: Factory, Material Custody. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Projects/SO, WO/PN Gate, Factory/Production, Material Custody, Reports, Document Templates, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, After Sales, Admin Approvals, Procurement, Store, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, Control Tower, Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Update factory records. Create raw material requests. Update material custody records. |
| **Write actions blocked** | Cannot approve projects. Cannot create/approve POs. Zero access to procurement, QC, AFS tables (RLS). |
| **Cost visibility** | `purchase_value` → NULL (via `purchase_orders_to_supplier_safe` CASE). `unit_price`, `line_total` → NULL (via `purchase_order_items_safe`). `unit_sales_value`, `line_total_value` → NULL (not admin/ops/sales_user). Can see vehicle type and quantity only. |
| **End-to-end test scenario** | 1. Log in as factory_user. 2. Navigate to WO/PN Gate. 3. Navigate to Factory → Projects. 4. Open an approved project's factory workspace. 5. In SQL Editor: `SELECT purchase_value FROM purchase_orders_to_supplier_safe WHERE project_id = '<approved_project_id>'` — confirm `purchase_value` returns NULL. 6. Attempt to navigate to `/procurement` directly (deep-link). 7. Confirm Procurement page renders but shows empty list (RLS denies all rows for factory_user). |

---

### Role: `store_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO. OPERATIONS: Store, Material Custody, Vehicle Receiving. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Projects/SO, Store/Warehouse, Material Custody, Vehicle Receiving, Reports, Document Templates, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, After Sales, Admin Approvals, WO/PN Gate, Procurement, Factory, Material QC, Project QC, Dubai/AFS, Control Tower, Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Create/update store receipts. Receive vehicle shipments. Manage material custody transfers. |
| **Write actions blocked** | Cannot create/approve POs. Cannot access procurement or factory records. |
| **Cost visibility** | `purchase_value` → NULL. `unit_price`, `line_total` → NULL. `unit_sales_value`, `line_total_value` → NULL. |
| **End-to-end test scenario** | 1. Log in as store_user. 2. Navigate to Store → Receipts. 3. Create a store receipt (simulated — GAP-03 applies; write is mocked). 4. In SQL: `SELECT unit_price FROM purchase_order_items_safe WHERE purchase_order_id IN (SELECT id FROM purchase_orders_to_supplier_safe WHERE project_id = '<approved_project_id>')` — confirm NULL. 5. Attempt deep-link to `/procurement` — confirm empty list (RLS). |

---

### Role: `qc_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO. QUALITY: Material QC, Project/Vehicle QC. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Projects/SO, Material QC, Project/Vehicle QC, Reports, Document Templates, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, After Sales, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Material Custody, Vehicle Receiving, Dubai/AFS, Control Tower, Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Create/update material QC inspections. Create/update project QC inspections and findings. Create NCRs and release notes. Upload to `qc-documents` bucket (when wired). |
| **Write actions blocked** | Cannot create/approve POs. Cannot access procurement or store records. |
| **Cost visibility** | `purchase_value` → NULL. `unit_price`, `line_total` → NULL. `unit_sales_value`, `line_total_value` → NULL. |
| **End-to-end test scenario** | 1. Log in as qc_user. 2. Navigate to Material QC → Inspections. 3. Open a material QC inspection for an approved project. 4. Create a QC finding (simulated — GAP-03 applies). 5. In SQL: `SELECT purchase_value FROM purchase_orders_to_supplier_safe` — confirm all rows return NULL for purchase_value. 6. Navigate to Dubai/AFS directly — confirm page is accessible via deep-link but data is empty/mocked (QC user has no AFS nav item but no server-side route guard). |

---

### Role: `afs_user`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO. OPERATIONS: Material Custody. DUBAI/AFS: Dubai/AFS, After Sales. MANAGEMENT: Reports, Document Templates, Notifications |
| **Visible items** | Projects/SO, Material Custody, Dubai/AFS, After Sales, Reports, Document Templates, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Vehicle Receiving, Material QC, Project QC, Control Tower, Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | Create/update Dubai project follow-ups, AFS arrival/pre-delivery reports, condition reports. Create/update after-sales maintenance requests. Upload to `afs-attachments` bucket (when wired). |
| **Write actions blocked** | Cannot create/approve POs. Cannot access procurement or factory records. |
| **Cost visibility** | `purchase_value` → NULL. `unit_price`, `line_total` → NULL. `unit_sales_value`, `line_total_value` → NULL. |
| **End-to-end test scenario** | 1. Log in as afs_user. 2. Navigate to Dubai/AFS. 3. Open an AFS project (approved). 4. Create an arrival report (simulated — GAP-03). 5. Navigate to After Sales → create a maintenance request. 6. In SQL: confirm AFS user cannot see any rows from `procurement_requests` (RLS SELECT policy requires `procurement_user` role). |

---

### Role: `viewer`

| Category | Details |
|----------|---------|
| **Visible nav sections** | PROJECTS: Projects/SO. MANAGEMENT: Control Tower, Reports, Notifications |
| **Visible items** | Projects/SO, Control Tower, Reports, Notifications |
| **Hidden items** | Quotations, Sales Workspace, Sales Coordinator, After Sales, Admin Approvals, WO/PN Gate, Procurement, Factory, Store, Material Custody, Vehicle Receiving, Material QC, Project QC, Dubai/AFS, Document Templates (no viewer role in templates roles[]), Access Requests, Notification Rules, Report Subscriptions, Settings, Admin/Users, Audit Log |
| **Write actions allowed** | NONE. Zero INSERT/UPDATE/DELETE access to any table (RLS has no write policies for viewer). |
| **Write actions blocked** | All inserts/updates blocked. Attempting to POST to any table returns RLS violation. |
| **Cost visibility** | `purchase_value` → NULL. `unit_price`, `line_total` → NULL. `unit_sales_value`, `line_total_value` → NULL. Can only read approved projects' vehicle type/quantity. |
| **End-to-end test scenario** | 1. Log in as viewer. 2. Confirm sidebar shows only Projects/SO, Control Tower, Reports, Notifications. 3. Navigate to Control Tower — confirm renders (mock data). 4. Navigate to Reports — confirm renders (mock data). 5. In SQL: `INSERT INTO projects (so_number, customer_name, customer_delivery_date, created_by) VALUES ('SO-VIEWER-TEST', 'Test', '2026-12-31', auth.uid())` — confirm RLS violation / permission denied. 6. Confirm viewer can see approved projects in Projects list but not drafts from other users. |

---

## 3. Critical Security Test Cases

These are mandatory tests that must pass before any real data entry begins.

### CST-01: sales_user draft project isolation
- **Setup:** Create two sales users (sales_A, sales_B). Each creates one draft project.
- **Test:** Log in as sales_B. Confirm sales_A's draft project is NOT visible in Projects list.
- **Verification SQL (run as sales_B's JWT):** `SELECT id FROM projects WHERE project_status = 'draft' AND created_by != auth.uid()` — should return 0 rows.
- **Expected:** 0 rows. RLS policy `proj_sales_select` allows `created_by = auth.uid()` OR `project_status = 'approved'` only.

### CST-02: factory/store/qc/afs purchase_value = NULL
- **Setup:** Have at least one approved project with a PO.
- **Test (for each restricted role):** `SELECT purchase_value FROM purchase_orders_to_supplier_safe WHERE project_id = '<approved_project_id>'`
- **Expected:** NULL for factory_user, store_user, qc_user, afs_user, viewer. Real value for admin, operations_manager, procurement_user.

### CST-03: factory/store/qc/afs vehicle line sales value = NULL
- **Test:** `SELECT unit_sales_value, line_total_value FROM project_vehicle_lines_safe WHERE project_id = '<approved_project_id>'`
- **Expected:** NULL for factory_user, store_user, qc_user, afs_user, viewer, sales_coordinator. Real values for admin, operations_manager, and sales_user (own projects only).

### CST-04: viewer zero write access
- **Test:** Attempt as viewer: `INSERT INTO projects (...)` — should fail with RLS violation.
- **Test:** Attempt as viewer: `UPDATE projects SET notes = 'hacked' WHERE id = '<any_id>'` — should fail.
- **Expected:** Both fail with `new row violates row-level security policy` or permission denied.

### CST-05: procurement_user cannot self-approve PO (RLS layer)
- **Setup:** procurement_user submits a PO (approval_status = 'pending').
- **Test:** procurement_user PATCH: `{"approval_status": "approved"}` via Supabase REST API.
- **Expected:** RLS WITH CHECK failure (approval_status NOT IN ('approved','rejected') violated).

### CST-06: procurement_user cannot self-approve PO (trigger layer)
- **Test:** As a DB superuser, temporarily disable the RLS policy, then attempt the same PATCH as procurement_user.
- **Expected:** BEFORE UPDATE trigger raises exception: `"Only admin or operations_manager may approve or reject a Purchase Order."` — confirms belt-and-suspenders.
- **Alternative:** Confirm trigger function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'enforce_po_approval_authority'`.

### CST-07: admin can approve any PO
- **Setup:** Same PO in pending status.
- **Test:** Log in as admin. Navigate to Admin Approvals → approve the PO.
- **Expected:** `approval_status = 'approved'`, `approved_by = <admin_uuid>`, `approved_at` set (trigger auto-fills if NULL).

### CST-08: operations_manager can approve any PO
- **Test:** Same as CST-07 but logged in as operations_manager.
- **Expected:** Same outcome. Trigger allows ops_manager explicitly in `NOT IN ('admin', 'operations_manager')` guard.

---

## 4. Recommended User Creation Order

Create and test roles in this order to build a realistic data state:

1. **operations_manager** — broadest non-admin access; use to approve initial test projects
2. **sales_user** (×2) — create sales_A and sales_B for CST-01 isolation test
3. **procurement_user** — needs approved projects to exist; test PO creation + self-approval block
4. **factory_user** — needs approved projects + POs to test cost masking
5. **store_user** — same pre-conditions as factory_user
6. **qc_user** — needs approved projects with factory records
7. **afs_user** — needs approved projects
8. **sales_coordinator** — needs quotation requests to exist
9. **viewer** — test last; purely read-only; simplest to verify

---

## 5. SQL to Create Each Role's User + Assign Role

**Step 1 — Create user in Supabase Dashboard:**
> Supabase Dashboard → Authentication → Users → Add User → Enter email + temporary password → Create User
> Record the UUID shown in the users table.

**Step 2 — Assign role via SQL Editor:**

Replace `<user_uuid>` with the UUID from Step 1 and `<role_name>` with the target role.

```sql
-- Verify the user exists in profiles (auto-created by trigger on auth.users insert)
SELECT id, full_name, email FROM public.profiles WHERE id = '<user_uuid>';

-- Assign the role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<user_uuid>', '<role_name>')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Verify
SELECT user_id, role FROM public.user_roles WHERE user_id = '<user_uuid>';
```

**Roles available:** `admin`, `operations_manager`, `sales_user`, `sales_coordinator`, `procurement_user`, `factory_user`, `store_user`, `qc_user`, `afs_user`, `viewer`

**Example — creating operations_manager:**
```sql
-- After creating user in Dashboard and getting UUID 'abc123...'
INSERT INTO public.user_roles (user_id, role)
VALUES ('abc123-...', 'operations_manager')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

**Step 3 — Optional: update display name in profiles**
```sql
UPDATE public.profiles
SET full_name = 'Operations Manager Test', department = 'Operations'
WHERE id = '<user_uuid>';
```

**Step 4 — Have user log in and change password**
Provide the user with the temporary password. They log in and change it via the app's account settings or Supabase magic link.

---

## 6. Important Notes

- **Do not create any role users until the admin smoke test passes manually.** Creating users before verifying that auth + RLS + the admin write path work will result in orphaned test data.
- **profiles table:** The `handle_new_user()` trigger (migration 001) auto-creates a `profiles` row when a new auth user is created. Verify the row exists before assigning a role.
- **user_roles unique constraint:** One role per user. Assigning a second role with `ON CONFLICT DO UPDATE` replaces the first.
- **RLS depends on current_user_role():** If `user_roles` row is missing, `current_user_role()` returns NULL and all RLS policies that check role will fail safe (deny access). Always assign the role before testing.
- **Reports pages (GAP-05):** All 15 reports pages use mock data regardless of role. Do not test data accuracy on reports pages — test only that they render without crash.
- **Store/QC/AFS/Factory detail writes (GAP-03):** Create/approve actions on Store receipts, QC inspections, NCRs, release notes, AFS reports, and maintenance requests are currently simulated (setTimeout, no DB write). Do not test these for data persistence — test only that forms submit without crash and show the success toast.
