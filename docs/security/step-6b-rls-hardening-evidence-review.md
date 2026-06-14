# Step 6B — RLS Hardening Evidence Review

**Branch:** `audit/rls-hardening-evidence-review`  
**Date:** 2026-06-14  
**Scope:** Documentation only — no migrations, no schema changes, no code changes.  
**Author:** Claude (audit agent)

---

## 1. Executive Summary

All 14 focus tables have Row Level Security enabled. The most urgent gap is a cluster of five QC/release tables (migrations 035–040) whose SELECT policies are open to every authenticated user (`USING (true)`), regardless of role. These five tables are safe to restrict in a single Step 6C migration with low regression risk.

A second group of eight tables have write policies that lack `WITH CHECK` constraints or use overly broad `FOR ALL` grants, and an additional consistency gap where older migrations use `EXISTS (SELECT 1 FROM user_roles …)` instead of the SECURITY DEFINER `current_user_role()` function. These require per-table clarification before migration.

Two tables (`projects`, `purchase_orders_to_supplier`) are already hardened to an acceptable standard. Three infrastructure tables (`audit_log`, `customers`, `timeline_events` for admin-only) are acceptable as-is.

**Highest-risk gaps (in priority order):**

| Rank | Table | Gap |
|------|-------|-----|
| 1 | `material_qc_inspections` | SELECT open to all authenticated |
| 2 | `material_ncrs` | SELECT open to all authenticated |
| 3 | `project_qc_inspections` | SELECT open to all authenticated |
| 4 | `project_qc_findings` | SELECT open to all authenticated |
| 5 | `release_notes` | SELECT open to all authenticated |
| 6 | `medical_serial_numbers` | qc_user can DELETE serial records |
| 7 | `factory_records` | viewer/store_user read all factory records regardless of project status |
| 8 | `approved_suppliers` | qc_user UPDATE has no WITH CHECK (can overwrite procurement fields) |

**No production code was changed. No migrations were created or applied.**

---

## 2. SECURITY DEFINER Helper Functions

The following SECURITY DEFINER SQL functions are the canonical role-enforcement primitives. All new Step 6C policies should use them in preference to direct `user_roles` subqueries.

| Function | Defined In | Purpose |
|----------|-----------|---------|
| `public.current_user_role()` | `003_rls_profiles.sql` | Returns the `user_role` enum value for `auth.uid()` — the authoritative source of role for all RLS policies |
| `public.can_read_project(uuid)` | `013_project_rls.sql` | Returns true if current user may read the given project |
| `public.can_write_project(uuid)` | `013_project_rls.sql` | Returns true if current user may write the given project |
| `public.project_has_wo(uuid)` | `014_execution_references.sql` | Used by Saudi factory gate |
| `public.project_has_pn(uuid)` | `014_execution_references.sql` | Used by Dubai AFS gate |

**Consistency gap:** Migrations 015, 019, 021, 024, 025, 029, 030, 031, 034 use direct
`EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'x')` instead of
`current_user_role()`. This is not a security hole because `user_roles` RLS restricts
each user to reading only their own row. However, it is an inconsistency — new policies
added in Step 6C must use `current_user_role()` throughout.

---

## 3. Table-by-Table RLS Evidence Matrix

### Classification Key

| Class | Meaning | Action in Step 6C |
|-------|---------|-------------------|
| **A** | Safe first migration | Implement immediately |
| **B** | Can harden after clarification | Implement after answering noted question |
| **C** | High-risk, defer | Do not touch yet |
| **D** | Already acceptable | Monitor only |
| **E** | Unknown / insufficient evidence | Read additional context |

---

### 3.1 `material_qc_inspections` — Class A

**Migration:** `035_material_qc_inspections.sql`  
**Business purpose:** Records material QC inspection results (pass/fail, rejection reason) for store receipt items. May include medical device inspection data.  
**Sensitive fields:** `inspection_result`, `rejection_reason`, `remarks`, `inspected_by`

**Current RLS state:**

```sql
-- SELECT: ALL authenticated — no role restriction
CREATE POLICY mqc_select ON material_qc_inspections
  FOR SELECT TO authenticated USING (true);  -- ⚠️ OVERLY BROAD

CREATE POLICY mqc_insert ON material_qc_inspections
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','operations_manager','qc_user'));

CREATE POLICY mqc_update ON material_qc_inspections
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','operations_manager','qc_user'));
-- No WITH CHECK on UPDATE — qc_user can modify any field including inspection_result
-- No DELETE policy → blocked by default ✅
```

**Risk if left open:** Any authenticated user (factory worker, AFS, sales rep) reads all QC inspection outcomes across all projects.

**Recommended Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS mqc_select ON public.material_qc_inspections;
CREATE POLICY mqc_select ON public.material_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
    OR (
      public.current_user_role() = 'sales_user'
      AND project_id IN (
        SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
      )
    )
  );

-- Also add WITH CHECK to UPDATE
DROP POLICY IF EXISTS mqc_update ON public.material_qc_inspections;
CREATE POLICY mqc_update ON public.material_qc_inspections
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
```

**Manual test required before applying:**
- Verify factory_user can still read QC records for their projects (needed for production tracking)
- Verify sales_user can read QC results for their own projects
- Verify procurement_user cannot read QC records (no operational need)

---

### 3.2 `material_ncrs` — Class A

**Migration:** `036_material_ncrs.sql`  
**Business purpose:** Non-Conformance Reports for failed material QC inspections. Tracks corrective and preventive actions.  
**Sensitive fields:** `description`, `root_cause_category`, `corrective_action`, `preventive_action`, `severity`

**Current RLS state:**

```sql
CREATE POLICY ncr_select ON material_ncrs
  FOR SELECT TO authenticated USING (true);  -- ⚠️ OVERLY BROAD

CREATE POLICY ncr_insert ON material_ncrs
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','operations_manager','qc_user'));

CREATE POLICY ncr_update ON material_ncrs
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','operations_manager','qc_user'));
-- No WITH CHECK on UPDATE
-- No DELETE → blocked ✅
```

**Recommended Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS ncr_select ON public.material_ncrs;
CREATE POLICY ncr_select ON public.material_ncrs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'viewer'
    )
    OR (
      public.current_user_role() = 'sales_user'
      AND project_id IN (
        SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS ncr_update ON public.material_ncrs;
CREATE POLICY ncr_update ON public.material_ncrs
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
```

---

### 3.3 `project_qc_inspections` — Class A

**Migration:** `037_project_qc_inspections.sql`  
**Business purpose:** Vehicle/project-level QC inspection records (as opposed to material QC). Results gate the readiness_status that feeds the release note gate (migration 076).  
**Sensitive fields:** `inspection_result`, `readiness_status`, `remarks`

**Current RLS state:**

```sql
CREATE POLICY pqc_select ON project_qc_inspections
  FOR SELECT TO authenticated USING (true);  -- ⚠️ OVERLY BROAD

CREATE POLICY pqc_insert ON project_qc_inspections
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','operations_manager','qc_user'));

CREATE POLICY pqc_update ON project_qc_inspections
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','operations_manager','qc_user','factory_user'));
-- factory_user UPDATE has no WITH CHECK — factory worker can overwrite QC result fields
-- No DELETE → blocked ✅
```

**Additional concern:** `factory_user` can UPDATE project QC inspections with no WITH CHECK.
A factory user could theoretically mark a failed inspection as passing.

**Recommended Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS pqc_select ON public.project_qc_inspections;
CREATE POLICY pqc_select ON public.project_qc_inspections
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'afs_user', 'store_user', 'viewer'
    )
    OR (
      public.current_user_role() = 'sales_user'
      AND project_id IN (
        SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
      )
    )
  );

-- factory_user should only update progress/readiness — not inspection_result
-- Requires column-level clarification before implementing WITH CHECK
```

**Clarification needed before Step 6C:** Which fields may factory_user update on project_qc_inspections? If they only update `readiness_status` and `remarks`, a WITH CHECK can be added to prevent them from modifying `inspection_result` or `inspected_by`.

---

### 3.4 `project_qc_findings` — Class A

**Migration:** `038_project_qc_findings.sql`  
**Business purpose:** Individual non-conformance findings within a project QC inspection. Open findings block release note issuance (trigger 076).  
**Sensitive fields:** `description`, `required_action`, `finding_status`, `severity`, `closure_notes`

**Current RLS state:**

```sql
CREATE POLICY fnd_select ON project_qc_findings
  FOR SELECT TO authenticated USING (true);  -- ⚠️ OVERLY BROAD

CREATE POLICY fnd_insert ON project_qc_findings
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','operations_manager','qc_user'));

CREATE POLICY fnd_update ON project_qc_findings
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','operations_manager','qc_user','factory_user'));
-- No WITH CHECK on UPDATE — factory_user can close findings
-- No DELETE → blocked ✅
```

**Recommended Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS fnd_select ON public.project_qc_findings;
CREATE POLICY fnd_select ON public.project_qc_findings
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'afs_user', 'viewer'
    )
    OR (
      public.current_user_role() = 'sales_user'
      AND project_id IN (
        SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
      )
    )
  );

-- factory_user UPDATE: restrict to rework fields only
-- Should be able to set rework_completed_by, rework_completed_at, remarks
-- Should NOT be able to set finding_status = 'closed' or change severity
-- Draft WITH CHECK (requires product owner confirmation of allowed fields):
DROP POLICY IF EXISTS fnd_update ON public.project_qc_findings;
CREATE POLICY fnd_update_qc ON public.project_qc_findings
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));

CREATE POLICY fnd_update_factory ON public.project_qc_findings
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'factory_user'
    AND finding_status IN ('rework_in_progress', 'pending_reinspection')
  )
  WITH CHECK (
    public.current_user_role() = 'factory_user'
    -- factory_user may only mark rework completed, not close/cancel
    AND finding_status IN ('rework_in_progress', 'pending_reinspection')
  );
```

---

### 3.5 `release_notes` — Class A

**Migration:** `040_release_notes.sql`  
**Governance trigger:** `076_release_note_gate.sql` blocks `ready_to_issue`/`issued` when open QC findings exist  
**Business purpose:** Formal release authorization for vehicles/projects. The audit trigger (080) captures changes.  
**Sensitive fields:** `release_status`, `issued_by`, `approved_by`

**Current RLS state:**

```sql
CREATE POLICY rn_select ON release_notes
  FOR SELECT TO authenticated USING (true);  -- ⚠️ OVERLY BROAD

CREATE POLICY rn_insert ON release_notes
  FOR INSERT TO authenticated
  WITH CHECK (current_user_role() IN ('admin','operations_manager','qc_user'));

CREATE POLICY rn_update ON release_notes
  FOR UPDATE TO authenticated
  USING (current_user_role() IN ('admin','operations_manager','qc_user'));
-- No WITH CHECK on UPDATE
-- No DELETE → blocked ✅
-- Trigger 076 blocks ready_to_issue/issued when open findings exist
```

**Recommended Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS rn_select ON public.release_notes;
CREATE POLICY rn_select ON public.release_notes
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'admin', 'operations_manager', 'qc_user',
      'factory_user', 'store_user', 'afs_user', 'viewer'
    )
    OR (
      public.current_user_role() = 'sales_user'
      AND project_id IN (
        SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS rn_update ON public.release_notes;
CREATE POLICY rn_update ON public.release_notes
  FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'qc_user'));
```

---

### 3.6 `medical_serial_numbers` — Class B

**Migration:** `031_medical_serial_numbers.sql`  
**Business purpose:** Tracks individual serial numbers for medical devices. Feeds the medical serial gate trigger (077). Regulatory compliance data — must not be deleted.  
**Sensitive fields:** `serial_number`, `qc_status`, `current_status`, `expiry_date`, `installed_*`

**Current RLS state:**

```sql
-- store/admin/ops/qc_user: FOR ALL — includes DELETE!
CREATE POLICY medical_serials_broad_all ON medical_serial_numbers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('store_user','admin','operations_manager','qc_user'))
  );
-- ⚠️ qc_user can DELETE serial records — compliance risk
-- ⚠️ No WITH CHECK — any of these roles can overwrite serial_number itself

CREATE POLICY medical_serials_factory_select ON medical_serial_numbers
  FOR SELECT USING (role IN ('factory_user','afs_user'));

CREATE POLICY medical_serials_sales_select ON medical_serial_numbers
  FOR SELECT USING (role = 'sales_user' AND own project);

CREATE POLICY medical_serials_viewer_select ON medical_serial_numbers
  FOR SELECT USING (role = 'viewer');
```

**Risk:** qc_user can `DELETE` a medical serial number, removing audit evidence. store_user with broad access could change a serial_number after it has been recorded.

**Clarification needed before B→A:** Should qc_user ever delete serial records? Should store_user be able to change serial_number after initial insert? If no to both, then this is A-class.

**Draft Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS medical_serials_broad_all ON public.medical_serial_numbers;

CREATE POLICY medical_serials_admin_all ON public.medical_serial_numbers
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

CREATE POLICY medical_serials_store_write ON public.medical_serial_numbers
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'store_user');

CREATE POLICY medical_serials_store_update ON public.medical_serial_numbers
  FOR UPDATE
  USING (public.current_user_role() = 'store_user')
  WITH CHECK (public.current_user_role() = 'store_user');
-- Note: store_user deliberately gets no DELETE

CREATE POLICY medical_serials_qc_update ON public.medical_serial_numbers
  FOR UPDATE
  USING (public.current_user_role() = 'qc_user')
  WITH CHECK (
    public.current_user_role() = 'qc_user'
    -- qc_user may only update QC fields
    -- Enforced at application layer; add column-level check once column grants are confirmed
  );
-- Note: qc_user gets SELECT from broad_factory_select; no INSERT or DELETE
```

---

### 3.7 `factory_records` — Class B

**Migration:** `025_factory_records.sql`  
**Business purpose:** Production records (BOQ, GA drawings, progress percentage, WO linkage). Contains non-financial progress data.  
**Sensitive fields:** `progress_percentage`, `production_status`, `expected_completion_date`

**Current RLS state:**

```sql
-- Admin/ops: full access ✅
-- factory_user: FOR ALL with no WITH CHECK
CREATE POLICY factory_user_all ON factory_records FOR ALL USING (role = 'factory_user');
-- ⚠️ factory_user can delete factory records

-- QC: SELECT only ✅

-- Sales: SELECT own projects (uses sales_owner_id correctly) ✅

-- viewer/store_user: SELECT ALL — no project status filter!
CREATE POLICY factory_viewer_select ON factory_records
  FOR SELECT USING (role IN ('viewer','store_user'));
-- ⚠️ viewer and store_user can read ALL factory records even for draft/unapproved projects
```

**Risk:** viewer/store_user can read production data for projects that have not yet been approved. `factory_user` can delete records.

**Clarification needed:** Should viewer/store_user be restricted to approved projects only (consistent with other operational tables)?

**Draft Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS factory_viewer_select ON public.factory_records;
CREATE POLICY factory_viewer_select ON public.factory_records
  FOR SELECT
  USING (
    public.current_user_role() IN ('viewer', 'store_user')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.project_status = 'approved'
    )
  );

DROP POLICY IF EXISTS factory_user_all ON public.factory_records;
CREATE POLICY factory_user_write ON public.factory_records
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'factory_user');
CREATE POLICY factory_user_update ON public.factory_records
  FOR UPDATE
  USING (public.current_user_role() = 'factory_user')
  WITH CHECK (public.current_user_role() = 'factory_user');
-- factory_user gets no DELETE — must request admin to delete
```

---

### 3.8 `approved_suppliers` — Class B

**Migration:** `024_approved_suppliers.sql`  
**Business purpose:** Supplier master data with procurement and QC approval status. Feeds `purchase_orders_to_supplier.supplier_id` FK.  
**Sensitive fields:** `procurement_status`, `qc_status`, `approved_for_medical_items`, `approved_for_critical_items`

**Current RLS state:**

```sql
-- Admin/ops: FOR ALL, no WITH CHECK
CREATE POLICY sup_admin_all ON approved_suppliers FOR ALL USING (role IN ('admin','ops_mgr'));
-- procurement_user: FOR ALL, no WITH CHECK
CREATE POLICY sup_procurement_all ON approved_suppliers FOR ALL USING (role = 'procurement_user');
-- ⚠️ procurement_user can set approved_for_medical_items = true without QC sign-off

-- qc: SELECT + UPDATE (no WITH CHECK)
CREATE POLICY sup_qc_select ON approved_suppliers FOR SELECT USING (role = 'qc_user');
CREATE POLICY sup_qc_update ON approved_suppliers FOR UPDATE USING (role = 'qc_user');
-- ⚠️ qc_user UPDATE has no WITH CHECK — can overwrite supplier_name, payment_terms, etc.

-- Others: see approved/approved_with_conditions only ✅
```

**Risk:** procurement_user can approve medical suppliers without QC sign-off. qc_user can change fields outside their domain.

**Clarification needed:** Which fields should qc_user be allowed to update? Expected: `qc_status`, `qc_remarks`, `quality_rating`.

**Draft Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS sup_procurement_all ON public.approved_suppliers;
CREATE POLICY sup_procurement_write ON public.approved_suppliers
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'procurement_user');
CREATE POLICY sup_procurement_update ON public.approved_suppliers
  FOR UPDATE
  USING (public.current_user_role() = 'procurement_user')
  WITH CHECK (
    public.current_user_role() = 'procurement_user'
    -- procurement cannot self-approve for medical/critical items
    AND approved_for_medical_items = false
    AND approved_for_critical_items = false
  );
-- procurement_user gets no DELETE without admin

DROP POLICY IF EXISTS sup_qc_update ON public.approved_suppliers;
CREATE POLICY sup_qc_update ON public.approved_suppliers
  FOR UPDATE
  USING (public.current_user_role() = 'qc_user')
  WITH CHECK (public.current_user_role() = 'qc_user');
-- Column-level WITH CHECK pending field list confirmation from product owner
```

---

### 3.9 `procurement_requests` — Class B

**Migration:** `019_procurement_requests.sql`  
**Business purpose:** Procurement Requests (PRs) linking project needs to purchase orders.  
**Sensitive fields:** `status`, `pr_number`

**Current RLS state:**

```sql
-- Admin/ops: FOR ALL (subquery pattern, no WITH CHECK)
-- procurement_user: FOR ALL (subquery pattern, no WITH CHECK)
CREATE POLICY pr_procurement_all ON procurement_requests FOR ALL USING (role = 'procurement_user');
-- ⚠️ procurement_user can delete PRs with no restriction

-- sales: SELECT own projects ✅
-- ops_roles: SELECT approved projects ✅
```

**Risk:** procurement_user can delete closed PRs, removing audit evidence.

**Clarification needed:** Are PRs ever legitimately deleted in the workflow, or only cancelled/closed?

**Draft Step 6C action (draft only — not applied):**

```sql
-- Draft only — not applied in this PR
DROP POLICY IF EXISTS pr_procurement_all ON public.procurement_requests;
CREATE POLICY pr_procurement_insert ON public.procurement_requests
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'procurement_user');
CREATE POLICY pr_procurement_update ON public.procurement_requests
  FOR UPDATE
  USING (public.current_user_role() = 'procurement_user'
    AND status NOT IN ('closed', 'cancelled'))
  WITH CHECK (public.current_user_role() = 'procurement_user');
-- No DELETE for procurement_user (cancelled via status only)
```

---

### 3.10 `quotation_requests` — Class B

**Migration:** `015_quotations.sql`, supplemented by `060_cost_protection.sql`  
**Business purpose:** Pre-sales quotation workflow. Contains financial fields (quotation_total_value).  
**Sensitive fields:** `quotation_total_value`, `quotation_status`, `coordinator_remarks`

**Current RLS state:**

```sql
-- Admin/ops: FOR ALL using subquery pattern (no WITH CHECK)
-- sales_user: SELECT own + INSERT + UPDATE own (draft/clarification) ✅
-- coordinator: SELECT all + UPDATE all (no WITH CHECK — fixed partially in 060)
-- viewer: SELECT non-draft ✅
-- Migration 060 added WITH CHECK on coordinator/sales update:
--   prevents reassigning requested_by/created_by
```

**Remaining gap:** `qr_coordinator_update` can transition a quotation to any status including `converted_to_so` or `cancelled` without restriction. There is no WITH CHECK limiting which status transitions are permitted for a coordinator role.

**Clarification needed:** Is a coordinator permitted to independently cancel a quotation? Or should that require admin/ops approval?

---

### 3.11 `store_receipts` and `store_receipt_items` — Class B

**Migrations:** `029_store_receipts.sql`, `030_store_receipt_items.sql`  
**Business purpose:** Records of materials received at the store. Items link to QC inspections.  
**Sensitive fields:** `receipt_number`, `status`, `received_date`, `supplier_name`

**Current RLS state:**

```sql
-- store/admin/ops: FOR ALL (subquery pattern, no WITH CHECK)
-- ⚠️ store_user can modify receipt_number, received_date, status retroactively
-- Other roles: appropriate SELECT policies ✅
```

**Risk:** A store_user could retroactively change a receipt date or supplier name, which is an audit integrity concern.

**Clarification needed:** Should receipt_number be immutable after creation? Should received_date be locked once status moves past `draft`?

---

### 3.12 `material_custody_records` — Class B

**Migration:** `034_material_custody_records.sql`  
**Business purpose:** Tracks temporary custody issuance and acceptance of materials/serials. Has approval workflow (custody_approval_status).  
**Sensitive fields:** `custody_number`, `approval_status`, `approved_by`, `issued_to_user_id`

**Current RLS state:**

```sql
-- store/admin/ops: FOR ALL (subquery pattern, no WITH CHECK)
-- factory/afs: SELECT + UPDATE own (issued_to_user_id = auth.uid())
-- ⚠️ factory/afs UPDATE has no WITH CHECK — can change issued_to_user_id
-- ⚠️ store_user can update approval_status without restriction
```

**Risk:** A store_user could self-approve custody without admin/ops approval. A factory user receiving custody could theoretically reassign it.

---

### 3.13 `timeline_events` — Class B

**Migration:** `005_timeline_events.sql`  
**Business purpose:** Global event timeline (not project-specific). Used for system-wide audit trail display.  
**Sensitive fields:** None — event metadata only.

**Current RLS state:**

```sql
-- admin/ops: SELECT all ✅
-- authenticated: INSERT ✅
-- ⚠️ viewer has NO SELECT access to global timeline
-- ⚠️ No per-project filtering (Phase 1 limitation — acknowledged in original migration)
```

**Note:** `project_timeline_events` (migration 012) has proper per-project filtering. The global `timeline_events` (005) is a Phase 1 table with acknowledged limitations. Low business impact — viewer can access project_timeline_events already.

---

### 3.14 `projects` — Class D (Already Acceptable)

**Migrations:** `009_projects.sql`, `013_project_rls.sql`, `078_so_approval_checks.sql`  
**RLS:** ENABLED, split policies, SECURITY DEFINER helper functions  
**Governance triggers:** `enforce_so_approval_fields` (078), `generate_project_code` (009), audit trigger (080)  

**Current policies:** admin_ops full, sales_user own (draft/revision only), sales_user INSERT, read approved for operational roles. WITH CHECK on all write policies.

**Assessment:** Gold standard for project table RLS. `can_read_project()` and `can_write_project()` SECURITY DEFINER functions provide a stable abstraction for downstream tables.

No action needed in Step 6C.

---

### 3.15 `purchase_orders_to_supplier` — Class D (Already Acceptable)

**Migrations:** `021_purchase_orders.sql`, `061_po_approval_guard.sql`, `060_cost_protection.sql`  
**RLS:** ENABLED  

**Current state after 061:** `po_procurement_all` was DROPPED and replaced with 4 split policies (SELECT/INSERT/UPDATE/DELETE) with proper WITH CHECK. BEFORE UPDATE trigger `enforce_po_approval_authority()` (SECURITY DEFINER) blocks non-admin/ops from approving. SECURITY DEFINER views (`purchase_orders_to_supplier_safe`) mask `purchase_value` for restricted roles.

**Assessment:** Dual-enforced (RLS + trigger). Acceptable. Migration 061 is the gold standard pattern to follow for other tables.

---

### 3.16 `audit_log` — Class D (Already Acceptable)

**Migration:** `004_audit_log.sql`, `080_unified_audit_trigger.sql`  
**RLS:** ENABLED  

```sql
-- admin SELECT only
-- authenticated INSERT only (append-only)
-- No UPDATE/DELETE policy → blocked ✅
```

**Assessment:** Correct append-only security. Admin-only read. `080_unified_audit_trigger.sql` feeds this table from projects and release_notes AFTER triggers (SECURITY DEFINER).

---

### 3.17 `customers` — Class D (Already Acceptable)

**Migration:** `079_customer_master_data.sql`  
**RLS:** ENABLED  

```sql
-- SELECT: all authenticated (needed for dropdowns) ✅
-- INSERT: admin/ops/sales_user/sales_coordinator (broader insert for new customer creation)
-- UPDATE: admin/ops only ✅
-- DELETE: no policy → blocked ✅
```

**Assessment:** Reasonable for a reference data table. Sales/coordinator can add new customers during SO/quotation creation, but only admin/ops can modify or delete. Acceptable.

---

## 4. RLS Enablement Summary

| Table | RLS Enabled | Migration | Class |
|-------|-------------|-----------|-------|
| `profiles` | ✅ | 003 | D |
| `user_roles` | ✅ | 003 | D |
| `audit_log` | ✅ | 004 | D |
| `timeline_events` | ✅ | 005 | B |
| `vehicle_types` / master data | ✅ | 006 | D |
| `projects` | ✅ | 009 | D |
| `project_vehicle_lines` | ✅ | 010 | D |
| `project_documents` | ✅ | 011 | D |
| `project_timeline_events` | ✅ | 012 | D |
| `project_execution_references` | ✅ | 014 | D |
| `quotation_requests` | ✅ | 015 | B |
| `procurement_requests` | ✅ | 019 | B |
| `purchase_orders_to_supplier` | ✅ | 021 + 061 | D |
| `approved_suppliers` | ✅ | 024 | B |
| `factory_records` | ✅ | 025 | B |
| `store_receipts` | ✅ | 029 | B |
| `store_receipt_items` | ✅ | 030 | B |
| `medical_serial_numbers` | ✅ | 031 | B |
| `material_custody_records` | ✅ | 034 | B |
| `material_qc_inspections` | ✅ | 035 | **A** |
| `material_ncrs` | ✅ | 036 | **A** |
| `project_qc_inspections` | ✅ | 037 | **A** |
| `project_qc_findings` | ✅ | 038 | **A** |
| `release_notes` | ✅ | 040 | **A** |
| `hot_projects` | ✅ | 068 | D |
| `project_invoicing_plans` | ✅ | 069 | D |
| `project_invoice_milestones` | ✅ | 069 | D |
| `access_requests` | ✅ | 063 | D |
| `document_templates` | ✅ | 064 | D |
| `notifications` | ✅ | 065 | D |
| `customers` | ✅ | 079 | D |

**All 14 focus tables have RLS enabled. Zero tables in scope are missing RLS entirely.**

---

## 5. Governance Triggers In Place (Defense-in-Depth)

| Trigger | Table | Migration | What It Enforces |
|---------|-------|-----------|------------------|
| `enforce_so_approval_fields` | `projects` | 078 | Blocks approval without location/medical selection |
| `enforce_po_approval_authority` | `purchase_orders_to_supplier` | 061 | Blocks non-admin/ops from approving POs; auto-sets approved_by |
| `enforce_release_note_gate` | `release_notes` | 076 | Blocks issuance when open QC findings exist |
| `enforce_medical_serial_gate` | `store_receipt_items` | 077 | Blocks QC acceptance without serial when serial_required |
| `append_audit_log` | `projects`, `release_notes` | 080 | AFTER trigger capturing before/after JSON into audit_log |
| `compute_line_total` | `project_vehicle_lines` | 010 | Auto-computes line_total from quantity × unit_value |
| `set_po_approval_required` | `purchase_orders_to_supplier` | 021 | Auto-sets approval_required when purchase_value > 10,000 |

---

## 6. Highest-Risk Gaps (Priority Order)

1. **QC SELECT open to all authenticated** (tables 035–040, 5 tables): Any authenticated user reads all inspection, NCR, finding, and release note records. Class A — safe to fix.

2. **`medical_serial_numbers` qc_user DELETE**: Medical device serial numbers are compliance records and must never be deleted by QC personnel. Class B pending confirmation.

3. **`factory_records` viewer/store_user read all**: viewer and store_user can read factory production data for draft/unapproved projects — inconsistent with operational tables. Class B.

4. **`approved_suppliers` procurement_user can self-approve medical suppliers**: No WITH CHECK prevents procurement_user from setting `approved_for_medical_items = true` without QC sign-off. Class B.

5. **`material_custody_records` store_user unrestricted write**: No WITH CHECK prevents store_user from updating `approval_status` or `approved_by` without admin/ops. Class B.

6. **`project_qc_inspections` factory_user UPDATE no WITH CHECK**: Factory user can modify inspection_result with no restriction. Class A (restriction) + clarification needed.

---

## 7. Policy Pattern Inconsistency

| Pattern | Correct (newer) | Inconsistent (older) | Tables with inconsistency |
|---------|----------------|----------------------|--------------------------|
| Role check | `public.current_user_role()` | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = '…')` | 015, 019, 021*, 024, 025, 029, 030, 031, 034 |

\* 021 original policies use subquery; 061 replacement policies use `current_user_role()`.

**Impact:** The subquery pattern is functionally correct because `user_roles` RLS restricts each user to their own row. But `current_user_role()` is preferred for performance (SECURITY DEFINER, cached) and consistency. All policies added or replaced in Step 6C **must** use `current_user_role()`.

---

## 8. Manual Role Test Plan for Step 6C

Before applying any Class A migration, execute these manual tests against a staging environment:

### QC Table SELECT Restriction Tests

| Test | Role | Table | Expected result |
|------|------|-------|-----------------|
| Sales user reads own project QC | `sales_user` | `material_qc_inspections` | Sees rows for own project only |
| Sales user reads other project QC | `sales_user` | `material_qc_inspections` | Zero rows returned |
| Factory user reads QC inspections | `factory_user` | `material_qc_inspections` | All rows (factory needs QC to track rework) |
| Procurement user reads QC | `procurement_user` | `material_qc_inspections` | Zero rows (no operational need) |
| Sales coordinator reads QC | `sales_coordinator` | `material_qc_inspections` | Zero rows (no operational need) |
| Viewer reads QC | `viewer` | `material_qc_inspections` | All rows |
| Store user reads NCRs | `store_user` | `material_ncrs` | All rows (needed for receiving decisions) |
| Sales user reads release notes own project | `sales_user` | `release_notes` | Own project only |
| Factory user reads all release notes | `factory_user` | `release_notes` | All rows |

### Regression Tests (Existing Approved Routes)

| Test | Expected |
|------|----------|
| QC user can create new inspection | INSERT succeeds |
| QC user can update inspection_result | UPDATE succeeds |
| Factory user can update readiness_status | UPDATE succeeds |
| Admin can update any field | All operations succeed |
| Unauthenticated user cannot read any table | RLS blocks all |

---

## 9. Rollback Considerations

Each Step 6C migration for Class A tables should be structured as:

```sql
-- Forward
DROP POLICY IF EXISTS <old_broad_policy> ON public.<table>;
CREATE POLICY <new_role_based_policy> ...;

-- Rollback (append at bottom, commented out)
-- DROP POLICY IF EXISTS <new_role_based_policy> ON public.<table>;
-- CREATE POLICY <old_broad_policy> ON public.<table>
--   FOR SELECT TO authenticated USING (true);
```

Because the old policies are `FOR SELECT USING (true)` and new ones are more restrictive,
rolling back means re-creating the broad policy. No data is at risk during rollback —
only read access temporarily broadens.

The only irreversible Step 6C change would be adding `WITH CHECK` to write policies,
which could break an application INSERT/UPDATE if the check is wrong. Each write policy
change must be tested in staging before production deployment.

---

## 10. Step 6C Recommended Implementation Prompt

```
Step 6C — RLS Hardening: QC Table SELECT Restriction

Branch: migrations/rls-6c-qc-select-restriction

Implement the following changes (Class A only):
1. Replace SELECT USING (true) on these 5 tables with role-based SELECT policies:
   - material_qc_inspections (migration 035)
   - material_ncrs (migration 036)
   - project_qc_inspections (migration 037)
   - project_qc_findings (038)
   - release_notes (migration 040)

2. For each table, use this role set for SELECT:
   - admin, operations_manager, qc_user: all rows
   - factory_user, store_user, afs_user: all rows (need operational visibility)
   - viewer: all rows (read-only management dashboard)
   - sales_user: own project rows only (JOIN on projects WHERE sales_owner_id = auth.uid())
   - procurement_user, sales_coordinator: no access (no operational need)

3. Also add WITH CHECK to the UPDATE policies on all 5 tables using the same
   role list as the existing INSERT policies (admin/ops/qc_user).

4. For project_qc_findings: split the factory_user UPDATE into a separate policy
   that allows update only when finding_status IN ('rework_in_progress','pending_reinspection')
   with the same status restriction in WITH CHECK.

5. Use current_user_role() throughout (not user_roles subquery).

6. Each change must be in its own idempotent migration file:
   - 081_qc_select_restriction.sql

7. Run: npm run build && npx tsc --noEmit && npm run lint

8. Test: [see Step 6B manual test plan section 8]

Critical constraints carry over from Step 6B:
- Do NOT change business logic
- Do NOT change UI
- Do NOT touch projects, purchase_orders_to_supplier, audit_log, customers
- Do NOT implement Step 6D (Class B tables) in this PR
```

---

## 11. Out-of-Scope Tables (Not Reviewed in This Step)

The following tables were not in the focus list and were not audited:

- `quotation_lines`, `quotation_documents`, `quotation_timeline` (016–018)
- `procurement_request_items` (020), `purchase_order_items` (022)
- `raw_material_requests`, `raw_material_request_items` (027–028)
- `vehicle_receipts`, `vehicle_receipt_photos` (032–033)
- `qc_inspection_documents` (039)
- `afs_*` tables (041–048)
- `report_definitions`, `saved_report_views` (049–050)
- `sla_events`, `project_health_scores`, `department_health_scores` (052–054)
- `supplier_scorecards`, `operational_issues`, `capa_records` (055–057)
- `report_snapshots_subscriptions` (066)
- `notification_events`, `notification_preferences`, `notification_escalation_rules` (065)
- `template_fields`, `generated_documents` (064)

These tables are not included in the Step 6C recommendation. A Step 6D audit should cover the quotation subtables, procurement items, and AFS module.

---

## 12. Validation Results

No production code was modified. This document is the only artifact in this PR.

```
Validation run: npm run build && npx tsc --noEmit && npm run lint
Status: see CI
```

---

*This document was produced from direct inspection of all 80 migration files in `supabase/migrations/`. All SQL examples are clearly labeled "Draft only — not applied in this PR."*
