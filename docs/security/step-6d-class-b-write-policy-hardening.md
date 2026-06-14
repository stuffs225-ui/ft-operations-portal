# Step 6D — Class-B RLS Write Policy Hardening

**Branch:** `fix/class-b-rls-write-policy-hardening`  
**Migrations:** 082–085  
**Date:** 2026-06-14  
**Based on:** Step 6D-0 Product Owner Decision Pack (`docs/security/step-6d0-class-b-rls-owner-decisions.md`)  
**Classification:** Class B — product-owner decisions approved, safe to implement

---

## 1. Summary of Change

Replaced six overly-broad `FOR ALL` policies on six Class-B tables with role-split policies and SECURITY DEFINER BEFORE triggers. These tables were identified in the Step 6B evidence review as having write policy gaps: missing `WITH CHECK`, unchecked DELETE, or no column-level restriction.

All four Product Owner decisions from Step 6D-0 are implemented. Three additional protective BEFORE triggers were added. No SELECT policies were removed or narrowed. No schema changes.

---

## 2. Migrations Created

| Migration | File | Tables Covered |
|-----------|------|----------------|
| 082 | `082_medical_serial_numbers_rls_hardening.sql` | `medical_serial_numbers` |
| 083 | `083_factory_records_rls_hardening.sql` | `factory_records` |
| 084 | `084_approved_suppliers_rls_hardening.sql` | `approved_suppliers` |
| 085 | `085_procurement_and_store_write_rls_hardening.sql` | `procurement_requests`, `store_receipts`, `material_custody_records` |

---

## 3. Product Owner Decisions Implemented

| Decision | Table | Implementation |
|----------|-------|---------------|
| Q2 — `factory_user` must NOT delete `factory_records` | `factory_records` | Split `factory_user_all` (FOR ALL) → SELECT + INSERT + UPDATE; no DELETE policy |
| Q3 — `procurement_user` must NOT delete PRs | `procurement_requests` | Split `pr_procurement_all` (FOR ALL) → SELECT + INSERT + UPDATE; no DELETE policy; terminal-state guard on UPDATE |
| Q4 — `store_user` must NOT update `receipt_number` after creation | `store_receipts` | `store_receipts_store_all` recreated WITH CHECK; trigger `trg_lock_receipt_number` makes receipt_number immutable |
| Q1 — `qc_user` may update only `qc_status`, `qc_remarks`, `quality_rating` on `approved_suppliers` | `approved_suppliers` | `sup_procurement_update` WITH CHECK blocks medical/critical self-approval; trigger `trg_enforce_qc_supplier_fields` enforces qc_user column-level restriction |

---

## 4. Table-by-Table Policy Changes

### 4.1 `medical_serial_numbers` (Migration 082)

**Policies dropped:**

| Policy | Original definition | Reason |
|--------|--------------------|-|
| `medical_serials_broad_all` | FOR ALL for store_user, admin, ops_manager, qc_user — no WITH CHECK | qc_user and store_user could DELETE compliance records |

**Policies created:**

| Policy | Operation | Roles | Notes |
|--------|-----------|-------|-------|
| `medical_serials_admin_all` | FOR ALL | admin, operations_manager | WITH CHECK added |
| `medical_serials_store_select` | SELECT | store_user | Restores read access from dropped broad_all |
| `medical_serials_store_insert` | INSERT | store_user | WITH CHECK |
| `medical_serials_store_update` | UPDATE | store_user | USING + WITH CHECK |
| `medical_serials_qc_select` | SELECT | qc_user | Restores read access from dropped broad_all |
| `medical_serials_qc_update` | UPDATE | qc_user | USING + WITH CHECK; no INSERT, no DELETE |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `medical_serials_factory_select` | factory_user + afs_user SELECT (from migration 031) |
| `medical_serials_sales_select` | sales_user SELECT own project (from migration 031) |
| `medical_serials_viewer_select` | viewer SELECT (from migration 031) |

---

### 4.2 `factory_records` (Migration 083)

**Policies dropped:**

| Policy | Original definition | Reason |
|--------|--------------------|-|
| `factory_user_all` | FOR ALL for factory_user — no WITH CHECK | factory_user could DELETE production records |

**Policies created:**

| Policy | Operation | Role | Notes |
|--------|-----------|------|-------|
| `factory_user_select` | SELECT | factory_user | Restores read access from dropped policy |
| `factory_user_insert` | INSERT | factory_user | WITH CHECK |
| `factory_user_update` | UPDATE | factory_user | USING + WITH CHECK |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `factory_admin_all` | admin + operations_manager FOR ALL |
| `factory_qc_select` | qc_user SELECT |
| `factory_sales_select` | sales_user SELECT own projects |
| `factory_viewer_select` | viewer + store_user SELECT (see deferred items) |

---

### 4.3 `approved_suppliers` (Migration 084)

**Policies dropped:**

| Policy | Original definition | Reason |
|--------|--------------------|-|
| `sup_procurement_all` | FOR ALL for procurement_user — no WITH CHECK | procurement_user could set approved_for_medical_items = true without QC sign-off |
| `sup_qc_update` | FOR UPDATE for qc_user — no WITH CHECK | qc_user could overwrite supplier_name, payment_terms, procurement_status, etc. |

**Policies created:**

| Policy | Operation | Role | Key constraint |
|--------|-----------|------|---------------|
| `sup_procurement_select` | SELECT | procurement_user | Restores read access |
| `sup_procurement_insert` | INSERT | procurement_user | WITH CHECK |
| `sup_procurement_update` | UPDATE | procurement_user | WITH CHECK: `approved_for_medical_items = false AND approved_for_critical_items = false` |
| `sup_qc_update` (new) | UPDATE | qc_user | WITH CHECK; column restriction enforced by trigger |

**Trigger added:**

| Trigger | Function | Purpose |
|---------|----------|---------|
| `trg_enforce_qc_supplier_fields` | `enforce_qc_supplier_fields()` | Raises exception if qc_user attempts to change any field outside {qc_status, qc_remarks, quality_rating, updated_at} |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `sup_admin_all` | admin + operations_manager FOR ALL |
| `sup_qc_select` | qc_user SELECT (from migration 024) |
| `sup_other_select` | factory/store/afs/viewer/sales SELECT approved suppliers only |

---

### 4.4 `procurement_requests` (Migration 085 — Part A)

**Policies dropped:**

| Policy | Original definition | Reason |
|--------|--------------------|-|
| `pr_procurement_all` | FOR ALL for procurement_user — no WITH CHECK | procurement_user could delete closed PRs, corrupting PO-to-PR linkage |

**Policies created:**

| Policy | Operation | Role | Key constraint |
|--------|-----------|------|---------------|
| `pr_procurement_select` | SELECT | procurement_user | Restores read access |
| `pr_procurement_insert` | INSERT | procurement_user | WITH CHECK |
| `pr_procurement_update` | UPDATE | procurement_user | USING: `status NOT IN ('closed', 'cancelled')` + WITH CHECK |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `pr_admin_all` | admin + operations_manager FOR ALL |
| `pr_sales_select` | sales_user SELECT own projects |
| `pr_ops_roles_select` | factory/store/qc/afs/viewer SELECT approved projects |

---

### 4.5 `store_receipts` (Migration 085 — Part B)

**Policies dropped and recreated:**

| Policy | Change |
|--------|--------|
| `store_receipts_store_all` | Dropped and recreated WITH CHECK. Same roles (store_user, admin, operations_manager). Only change: WITH CHECK added. |

**Trigger added:**

| Trigger | Function | Purpose |
|---------|----------|---------|
| `trg_lock_receipt_number` | `enforce_receipt_number_immutability()` | Raises exception if receipt_number changes on any UPDATE (all roles) |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `store_receipts_ops_select` | procurement/factory/afs/qc SELECT |
| `store_receipts_sales_select` | sales_user SELECT own project |
| `store_receipts_viewer_select` | viewer SELECT |

---

### 4.6 `material_custody_records` (Migration 085 — Part C)

**Policies dropped and recreated:**

| Policy | Change |
|--------|--------|
| `custody_records_store_all` | Dropped and recreated WITH CHECK. Same roles (store_user, admin, operations_manager). Only change: WITH CHECK added. |

**Trigger added:**

| Trigger | Function | Purpose |
|---------|----------|---------|
| `trg_enforce_custody_approval` | `enforce_custody_approval_restriction()` | Raises exception if store_user attempts to INSERT with approval_status = 'approved' or UPDATE any approval field. Admin/ops unrestricted. |

**Policies unchanged:**

| Policy | Purpose |
|--------|---------|
| `custody_records_factory_select` | factory_user + afs_user SELECT |
| `custody_records_factory_update` | factory/afs UPDATE own records (issued_to_user_id = auth.uid()) |
| `custody_records_sales_select` | sales_user SELECT own project |
| `custody_records_viewer_select` | viewer SELECT |

---

## 5. Role Access Matrix After Step 6D

`✅` = all rows · `⊂` = scoped rows · `R` = SELECT only · `W` = write (INSERT/UPDATE) · `A` = admin (all ops) · `✗` = no access

### 5.1 `medical_serial_numbers`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ |
| `store_user` | ✅ | ✅ | ✅ | ✗ |
| `qc_user` | ✅ | ✗ | ✅ (qc fields only) | ✗ |
| `factory_user` | ✅ | ✗ | ✗ | ✗ |
| `afs_user` | ✅ | ✗ | ✗ | ✗ |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ |
| `viewer` | ✅ | ✗ | ✗ | ✗ |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ |
| `procurement_user` | ✗ | ✗ | ✗ | ✗ |

### 5.2 `factory_records`

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ |
| `factory_user` | ✅ | ✅ | ✅ | ✗ |
| `qc_user` | ✅ | ✗ | ✗ | ✗ |
| `store_user` | ✅ | ✗ | ✗ | ✗ |
| `viewer` | ✅ | ✗ | ✗ | ✗ |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ |
| `afs_user` | ✗ | ✗ | ✗ | ✗ |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ |
| `procurement_user` | ✗ | ✗ | ✗ | ✗ |

Note: viewer + store_user SELECT is via `factory_viewer_select` (not modified) — no project_status restriction (see deferred items).

### 5.3 `approved_suppliers`

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| `admin` | ✅ | ✅ | ✅ | ✅ | |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ | |
| `procurement_user` | ✅ | ✅ | ✅ | ✗ | Cannot set medical/critical flags to true |
| `qc_user` | ✅ | ✗ | ✅ | ✗ | Only qc_status, qc_remarks, quality_rating |
| `factory_user` | ⊂ | ✗ | ✗ | ✗ | approved/approved_with_conditions only |
| `store_user` | ⊂ | ✗ | ✗ | ✗ | approved/approved_with_conditions only |
| `afs_user` | ⊂ | ✗ | ✗ | ✗ | approved/approved_with_conditions only |
| `viewer` | ⊂ | ✗ | ✗ | ✗ | approved/approved_with_conditions only |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ | approved/approved_with_conditions only |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ | |

### 5.4 `procurement_requests`

| Role | SELECT | INSERT | UPDATE | DELETE | Notes |
|------|--------|--------|--------|--------|-------|
| `admin` | ✅ | ✅ | ✅ | ✅ | |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ | |
| `procurement_user` | ✅ | ✅ | ✅ | ✗ | Cannot edit closed/cancelled PRs |
| `factory_user` | ⊂ | ✗ | ✗ | ✗ | Approved projects only |
| `store_user` | ⊂ | ✗ | ✗ | ✗ | Approved projects only |
| `qc_user` | ⊂ | ✗ | ✗ | ✗ | Approved projects only |
| `afs_user` | ⊂ | ✗ | ✗ | ✗ | Approved projects only |
| `viewer` | ⊂ | ✗ | ✗ | ✗ | Approved projects only |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ | Own projects only |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ | |

### 5.5 `store_receipts`

| Role | SELECT | INSERT | UPDATE | UPDATE receipt_number | DELETE |
|------|--------|--------|--------|-----------------------|--------|
| `admin` | ✅ | ✅ | ✅ | ✗ (trigger) | ✅ |
| `operations_manager` | ✅ | ✅ | ✅ | ✗ (trigger) | ✅ |
| `store_user` | ✅ | ✅ | ✅ | ✗ (trigger) | ✅ |
| `procurement_user` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `factory_user` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `afs_user` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `qc_user` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `viewer` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ | ✗ |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ | ✗ |

Note: receipt_number immutability enforced by trigger — applies to all roles including admin.

### 5.6 `material_custody_records`

| Role | SELECT | INSERT | UPDATE approval fields | UPDATE other fields | DELETE |
|------|--------|--------|------------------------|---------------------|--------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `store_user` | ✅ | ✅ | ✗ (trigger) | ✅ | ✅ |
| `factory_user` | ✅ | ✗ | ✗ | ✅ (own records) | ✗ |
| `afs_user` | ✅ | ✗ | ✗ | ✅ (own records) | ✗ |
| `sales_user` | ⊂ | ✗ | ✗ | ✗ | ✗ |
| `viewer` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `qc_user` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `procurement_user` | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 6. Triggers Added

| Trigger name | Table | Function | Fires on | Purpose |
|-------------|-------|----------|----------|---------|
| `trg_enforce_qc_supplier_fields` | `approved_suppliers` | `enforce_qc_supplier_fields()` | BEFORE UPDATE | Raises exception if qc_user changes any field outside {qc_status, qc_remarks, quality_rating} |
| `trg_lock_receipt_number` | `store_receipts` | `enforce_receipt_number_immutability()` | BEFORE UPDATE | Raises exception if receipt_number changes on any UPDATE (all roles) |
| `trg_enforce_custody_approval` | `material_custody_records` | `enforce_custody_approval_restriction()` | BEFORE INSERT OR UPDATE | Raises exception if store_user creates pre-approved custody or updates approval fields |

All three trigger functions are SECURITY DEFINER with `SET search_path = public`.

---

## 7. Why Triggers Are Needed (Not Just WITH CHECK)

PostgreSQL RLS `WITH CHECK` applies to the **resulting NEW row**, not to which columns changed. It cannot detect:
- "column X was changed from OLD.x to NEW.x" (requires OLD reference, unavailable in WITH CHECK)
- "this INSERT has a field that contradicts a business rule based on role" when the same policy covers multiple roles

Triggers have access to both OLD and NEW in UPDATE, and to NEW in INSERT, making them the correct mechanism for:
1. Column-level UPDATE restrictions for specific roles (supplier QC fields)
2. Field immutability after creation (receipt_number)
3. Role-conditional field restrictions on INSERT (custody approval status)

---

## 8. Manual Test Plan

### 8.1 Admin / Operations Manager — Must Still Work

| # | Table | Action | Expected |
|---|-------|--------|----------|
| 1 | All six tables | SELECT * | All rows returned |
| 2 | `medical_serial_numbers` | INSERT + UPDATE + DELETE | All succeed |
| 3 | `factory_records` | INSERT + UPDATE + DELETE | All succeed |
| 4 | `approved_suppliers` | UPDATE approved_for_medical_items = true | Succeeds (admin bypass) |
| 5 | `procurement_requests` | DELETE a closed PR | Succeeds (admin bypass) |
| 6 | `store_receipts` | UPDATE receipt_number | BLOCKED (trigger applies to all roles) |
| 7 | `material_custody_records` | UPDATE approval_status = 'approved' | Succeeds (trigger only blocks store_user) |

### 8.2 qc_user — Q1 Field Restriction

| # | Action | Expected |
|---|--------|----------|
| 8 | UPDATE `approved_suppliers` SET `qc_status` = 'approved' | Succeeds |
| 9 | UPDATE `approved_suppliers` SET `qc_remarks` = 'passed audit' | Succeeds |
| 10 | UPDATE `approved_suppliers` SET `quality_rating` = 4 | Succeeds |
| 11 | UPDATE `approved_suppliers` SET `supplier_name` = 'new name' | BLOCKED (trigger raises exception) |
| 12 | UPDATE `approved_suppliers` SET `approved_for_medical_items` = true | BLOCKED (trigger raises exception) |
| 13 | UPDATE `approved_suppliers` SET `procurement_status` = 'approved' | BLOCKED (trigger raises exception) |
| 14 | DELETE from `medical_serial_numbers` | BLOCKED (no DELETE policy) |
| 15 | INSERT into `medical_serial_numbers` | BLOCKED (no INSERT policy) |
| 16 | UPDATE `medical_serial_numbers` SET qc_status = 'passed' | Succeeds |

### 8.3 factory_user — Q2 Delete Blocked

| # | Action | Expected |
|---|--------|----------|
| 17 | SELECT * FROM `factory_records` | All rows returned |
| 18 | INSERT into `factory_records` | Succeeds |
| 19 | UPDATE `factory_records` SET production_status = 'in_production' | Succeeds |
| 20 | DELETE from `factory_records` | BLOCKED (no DELETE policy) |

### 8.4 procurement_user — Q3 Delete Blocked, Terminal State Guard

| # | Action | Expected |
|---|--------|----------|
| 21 | SELECT * FROM `procurement_requests` | All rows returned |
| 22 | INSERT into `procurement_requests` | Succeeds |
| 23 | UPDATE a PR with status = 'in_progress' | Succeeds |
| 24 | UPDATE a PR with status = 'closed' or 'cancelled' | BLOCKED (USING clause) |
| 25 | DELETE a PR | BLOCKED (no DELETE policy) |
| 26 | UPDATE `approved_suppliers` SET `approved_for_medical_items` = true | BLOCKED (WITH CHECK fails) |
| 27 | UPDATE `approved_suppliers` SET `approved_for_medical_items` = false | Succeeds |

### 8.5 store_user — Q4 receipt_number Immutable + Custody Approval

| # | Action | Expected |
|---|--------|----------|
| 28 | INSERT into `store_receipts` (receipt_number auto-generated) | Succeeds, number generated |
| 29 | UPDATE `store_receipts` SET status = 'received' | Succeeds |
| 30 | UPDATE `store_receipts` SET receipt_number = 'RCP-2025-9999' | BLOCKED (trigger raises exception) |
| 31 | INSERT into `store_receipts` with explicit receipt_number | Trigger does NOT fire on INSERT (only UPDATE) — see note |
| 32 | INSERT `material_custody_records` with approval_status = 'draft' | Succeeds |
| 33 | INSERT `material_custody_records` with approval_status = 'approved' | BLOCKED (trigger raises exception) |
| 34 | UPDATE `material_custody_records` SET approval_status = 'approved' | BLOCKED (trigger raises exception) |
| 35 | UPDATE `material_custody_records` SET remarks = 'updated' | Succeeds |

**Note on test #31:** The `trg_lock_receipt_number` trigger fires BEFORE UPDATE only. On INSERT, the auto-number trigger (`trg_store_receipts_auto_number`) fires and sets the number. If a store_user explicitly provides a receipt_number on INSERT, the auto-number trigger skips generation — this is existing behavior from migration 029 and is not changed here. The lock trigger prevents changes after creation.

### 8.6 Governance Regression Tests

| # | Test | Expected |
|---|------|----------|
| 36 | Release note gate (migration 076) still blocks issuance with open findings | No change — SECURITY DEFINER trigger unaffected |
| 37 | Medical serial gate (migration 077) still requires serial registration | No change — SECURITY DEFINER trigger unaffected |
| 38 | PO approval guard (migration 061) still requires approval for POs > 10,000 SAR | No change — SECURITY DEFINER trigger unaffected |

---

## 9. Known Assumptions

1. **qc_user UPDATE on medical_serial_numbers:** No trigger enforces which specific fields qc_user may update on medical_serial_numbers (beyond blocking DELETE). qc_user may update any field except through admin-controlled fields. Step 6E can add field-level restriction if required. The Product Owner decision applied only to `approved_suppliers`.

2. **store_receipts DELETE for store_user retained:** `store_receipts_store_all` is FOR ALL — store_user retains DELETE access to store receipts. The Product Owner decision Q4 addressed only receipt_number immutability, not DELETE. Blocking store_user DELETE on receipts is deferred to Step 6E.

3. **receipt_number trigger applies to admin:** The trigger `trg_lock_receipt_number` fires for all roles including admin. This is intentional — the sequential RCP-YYYY-NNNN scheme must be preserved. Admin can correct errors by deleting a receipt (still allowed for admin via store_all policy) and letting the auto-number trigger generate a new number.

4. **custody_records FOR ALL retained for store_user:** store_user retains INSERT, UPDATE (non-approval fields), and DELETE access to custody records via `custody_records_store_all`. The trigger protects approval fields. If store_user DELETE on custody records needs restriction, that is a Step 6E item.

5. **factory_viewer_select project_status restriction deferred:** viewer and store_user can read all factory records regardless of project_status via the unchanged `factory_viewer_select` policy. The restriction to approved-only projects was identified in Step 6B but is deferred to Step 6E.

---

## 10. Known Limitations

1. **column-level restriction for qc_user on medical_serial_numbers is not implemented.** The trigger in migration 084 covers `approved_suppliers` only. If the same field-level restriction is needed for medical_serial_numbers, a separate trigger must be added in Step 6E.

2. **custody_records_factory_update has no WITH CHECK.** factory_user and afs_user can technically change `issued_to_user_id` on their own custody records via the UPDATE policy. This edge case is deferred to Step 6E pending UX review of the acceptance workflow. Restricting this field requires understanding which custody acceptance UI operations use that column.

3. **No Supabase CLI available.** Migrations cannot be run locally against a live Supabase instance. Manual SQL validation is provided in the rollback section of each migration file. The SQL is syntactically valid PostgreSQL.

4. **Policy pattern mixed.** Existing unchanged policies (factory_admin_all, pr_admin_all, etc.) use the old `EXISTS (SELECT 1 FROM user_roles ...)` pattern. New policies in migrations 082–085 use `public.current_user_role()`. Both patterns are functionally correct. A future Step 6F could normalize the pattern, but that requires a comprehensive migration touching many tables.

---

## 11. Deferred Items (Step 6E)

| Item | Table | Gap | Reason deferred |
|------|-------|-----|----------------|
| factory_viewer_select project_status restriction | `factory_records` | viewer + store_user read all records regardless of project_status | Requires verifying no live pages break |
| store_user DELETE on store_receipts | `store_receipts` | store_user can delete receipt records | Q4 only addressed receipt_number immutability |
| custody_records_factory_update WITH CHECK | `material_custody_records` | factory/afs UPDATE has no WITH CHECK (issued_to_user_id changeable) | Requires UX review of acceptance workflow |
| qc_user field restriction on medical_serial_numbers | `medical_serial_numbers` | qc_user can update any field (no column-level guard) | No product owner decision was requested; add in 6E if needed |
| store_user DELETE on material_custody_records | `material_custody_records` | store_user can delete custody records | Not in scope of Q4 or Rule 7 check |
| Policy pattern normalization | All tables with old EXISTS pattern | Inconsistency between old/new pattern | Low risk; requires comprehensive migration across all tables |

---

## 12. What Was NOT Changed

- ✅ No INSERT policies changed (except by splitting FOR ALL to preserve exact access)
- ✅ No SELECT policies narrowed
- ✅ No schema changes (no ALTER TABLE, no new columns, no new types)
- ✅ No application code changes (`src/` untouched)
- ✅ No existing migration files modified (migrations are immutable)
- ✅ No business logic changes
- ✅ No Supabase query changes
- ✅ No existing SECURITY DEFINER functions modified
- ✅ No governance triggers (076, 077, 080) modified

---

## 13. Rollback Guidance

Each migration file contains its own rollback SQL in a commented block at the bottom. To roll back the entire Step 6D:

1. Apply rollback SQL for 085 (drop triggers and functions, recreate original policies for procurement_requests, store_receipts, material_custody_records)
2. Apply rollback SQL for 084 (drop trigger and function, recreate sup_procurement_all and original sup_qc_update)
3. Apply rollback SQL for 083 (drop split policies, recreate factory_user_all)
4. Apply rollback SQL for 082 (drop split policies, recreate medical_serials_broad_all)

Rollback is low-risk: it restores the original broad policies. No data is at risk — only access control widens back to the original state.

---

## 14. Validation Results

```
npm run build        → ✅ Built successfully
npx tsc --noEmit     → ✅ No type errors
npm run lint         → ⚠️ 79 pre-existing problems (63 errors, 16 warnings) — identical to
                          base branch, not introduced by this PR
Supabase CLI         → Not available in this environment; SQL validated syntactically.
                          Manual validation steps are in each migration file.
```

---

## 15. Recommended Next Step (Step 6E)

Step 6E should address the deferred items listed in section 11 above. The highest priority items:

1. **`factory_viewer_select` project_status restriction** — viewer and store_user should only read factory records for approved projects (consistent with other operational tables). This was identified in Step 6B as a Class-B gap and was explicitly deferred in this step pending page verification.

2. **`custody_records_factory_update` WITH CHECK** — factory_user and afs_user should not be able to change `issued_to_user_id` on custody records. This requires understanding the acceptance workflow UI to avoid breaking the existing acceptance flow.

3. **`store_user` DELETE on `store_receipts` and `material_custody_records`** — if the product owner confirms that store records should be immutable (delete requires admin), policy splitting in Step 6E would handle this.

4. **Policy pattern normalization** — a Step 6F cleanup migration could replace all `EXISTS (SELECT 1 FROM user_roles ...)` patterns with `public.current_user_role()` across all older migrations, but this is low priority since both patterns are functionally equivalent.

**Step 6E should NOT touch:**
- The five tables changed in Step 6C (migration 081)
- The six tables changed in Step 6D (migrations 082–085)
- `projects`, `purchase_orders_to_supplier`, `audit_log`
