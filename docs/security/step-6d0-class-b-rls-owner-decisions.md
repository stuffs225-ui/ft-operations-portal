# Step 6D-0 — Class-B RLS Owner Decision Pack

**Branch:** `docs/rls-class-b-decision-pack`  
**Date:** 2026-06-14  
**Scope:** Documentation only — no migrations, no schema changes, no code changes.  
**Depends on:** Step 6C (`docs/security/step-6c-qc-select-rls-restriction.md`)  
**Feeds:** Step 6D — Class-B write policy hardening migrations

---

## 1. Purpose

Step 6C restricted SELECT access on five QC/release tables (Class A — no ambiguity, safe to implement).

Step 6D must harden **write policies** (INSERT, UPDATE, DELETE) on a second group of Class-B tables whose current `FOR ALL` or missing `WITH CHECK` grants are overly broad. Before Step 6D can be implemented, four product-owner decisions are required — they determine the exact `WITH CHECK` constraints and whether DELETE is permitted for specific roles.

This document presents those decisions in a form ready for the product owner to answer. Each question includes:
- What the current database state allows today
- What will break if the wrong decision is made
- The recommended default (conservative / principle of least privilege)
- Exact SQL impact of each answer on the Step 6D migration

**Do NOT implement Step 6D until the product owner answers all four questions.**

---

## 2. Four-Question Decision Summary Table

| # | Question | Affected Table | Affected Policy | Recommended Answer |
|---|----------|---------------|----------------|-------------------|
| Q1 | Which fields may `qc_user` update on `approved_suppliers`? | `approved_suppliers` | `sup_qc_update` | `qc_status`, `qc_remarks`, `quality_rating` only |
| Q2 | Should `factory_user` be able to delete `factory_records`? | `factory_records` | `factory_user_all` | No — cancel via status only |
| Q3 | Should `procurement_user` be able to delete PRs? | `procurement_requests` | `pr_procurement_all` | No — cancel via `status = 'cancelled'` |
| Q4 | Should `store_user` be restricted from updating `receipt_number` after creation? | `store_receipts` | `store_receipts_store_all` | Yes — `receipt_number` should be immutable |

---

## 3. Decision Detail — Q1: Which Fields May `qc_user` Update on `approved_suppliers`?

### 3.1 Current State

Migration `024_approved_suppliers.sql` created the following policy:

```sql
CREATE POLICY sup_qc_update ON approved_suppliers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'qc_user')
);
-- ⚠️ No WITH CHECK — qc_user can overwrite ANY column on ANY supplier row
```

There is also:

```sql
CREATE POLICY sup_procurement_all ON approved_suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);
-- ⚠️ No WITH CHECK — procurement_user can set approved_for_medical_items = true
--    without QC sign-off, bypassing the medical approval workflow
```

### 3.2 The Problem

**Today, `qc_user` can overwrite every column on `approved_suppliers`, including:**

| Column | Controlled by | Risk if qc_user modifies |
|--------|--------------|--------------------------|
| `supplier_name` | procurement_user | Renames a supplier, breaking PO linkage history |
| `payment_terms` | procurement_user | Alters financial terms |
| `procurement_status` | procurement_user / admin | Moves supplier to `approved` without procurement review |
| `approved_for_medical_items` | Should require QC + Procurement | qc_user could self-approve medical item eligibility |
| `approved_for_critical_items` | Should require QC + Procurement | qc_user could self-approve critical item eligibility |
| `qc_status` | qc_user ✅ — correct | This is the field qc_user should own |
| `qc_remarks` | qc_user ✅ — correct | QC assessment notes |
| `quality_rating` | qc_user ✅ — correct | Numeric 1–5 rating |

**`approved_for_medical_items = true` is particularly high-risk.** Medical item approval feeds the medical serial gate (migration 077), which blocks QC sign-off unless serial numbers are registered. A qc_user self-approving a supplier for medical items would compromise this gate's integrity.

### 3.3 `approved_suppliers` Table Schema

```sql
CREATE TABLE IF NOT EXISTS approved_suppliers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name               text NOT NULL,            -- procurement domain
  supplier_category           text,                     -- procurement domain
  contact_person              text,                     -- procurement domain
  email                       text,                     -- procurement domain
  phone                       text,                     -- procurement domain
  materials_supplied          text,                     -- procurement domain
  payment_terms               text,                     -- procurement domain
  procurement_status          supplier_procurement_status NOT NULL DEFAULT 'draft',  -- procurement domain
  qc_status                   supplier_qc_status NOT NULL DEFAULT 'not_assessed',    -- QC domain ✅
  quality_rating              int CHECK (quality_rating BETWEEN 1 AND 5),           -- QC domain ✅
  approved_for_medical_items  boolean NOT NULL DEFAULT false,   -- requires BOTH domains
  approved_for_critical_items boolean NOT NULL DEFAULT false,   -- requires BOTH domains
  remarks                     text,                     -- shared
  procurement_remarks         text,                     -- procurement domain
  qc_remarks                  text,                     -- QC domain ✅
  created_by                  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

### 3.4 Risk Analysis

| Scenario | Risk if too open (current state) | Risk if too restrictive |
|----------|----------------------------------|------------------------|
| qc_user updates `qc_status` | Correct — this is their job | Blocked — breaks QC workflow |
| qc_user updates `procurement_status` | Can mark supplier `approved` without procurement review | No risk from restricting |
| qc_user sets `approved_for_medical_items = true` | Self-approves medical eligibility, bypassing dual-approval intent | No risk from restricting — qc_user can still approve via `qc_status` |
| qc_user changes `supplier_name` | Renames a supplier, corrupting historical records | No risk from restricting |
| qc_user updates `payment_terms` | Alters financial terms outside their domain | No risk from restricting |

### 3.5 Recommended Answer

**qc_user should only be permitted to update these three columns:**
- `qc_status` — QC assessment result (enum: `not_assessed`, `assessed`, `approved`, `approved_with_conditions`, `rejected`)
- `qc_remarks` — QC assessment notes
- `quality_rating` — Numeric 1–5 quality rating

**All other columns on `approved_suppliers` are outside qc_user's domain.** The medical/critical approval flags (`approved_for_medical_items`, `approved_for_critical_items`) require both QC and Procurement sign-off and must remain admin/ops_manager controlled.

Note: PostgreSQL RLS `WITH CHECK` cannot enforce column-level restrictions directly; column-level enforcement requires a `BEFORE UPDATE` trigger or view-based approach. The Step 6D migration will document this constraint and implement the available RLS-layer restriction. Full column-level enforcement is a separate Step 6E item.

### 3.6 Step 6D Migration Impact

**If answer is "yes, restrict to qc_status + qc_remarks + quality_rating" (recommended):**

```sql
-- Step 6D will replace sup_qc_update with:
DROP POLICY IF EXISTS sup_qc_update ON public.approved_suppliers;
CREATE POLICY sup_qc_update ON public.approved_suppliers
  FOR UPDATE
  USING (public.current_user_role() = 'qc_user')
  WITH CHECK (public.current_user_role() = 'qc_user');
-- Column-level restriction (qc_status, qc_remarks, quality_rating) enforced
-- via BEFORE UPDATE trigger in Step 6E (RLS cannot enforce per-column in PostgreSQL)

-- Also replace sup_procurement_all to block medical/critical self-approval:
DROP POLICY IF EXISTS sup_procurement_all ON public.approved_suppliers;
CREATE POLICY sup_procurement_insert ON public.approved_suppliers
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'procurement_user');
CREATE POLICY sup_procurement_update ON public.approved_suppliers
  FOR UPDATE
  USING (public.current_user_role() = 'procurement_user')
  WITH CHECK (
    public.current_user_role() = 'procurement_user'
    AND approved_for_medical_items = false
    AND approved_for_critical_items = false
  );
```

**If answer is "qc_user may update additional fields":** Provide the exact field list. Step 6D will document the approved field list in a comment and add the trigger in Step 6E.

**If answer is "qc_user may update all fields" (not recommended):** Current policy is retained as-is for `qc_user`. The `sup_procurement_all` WITHOUT CHECK gap will still be fixed.

### 3.7 Owner Answer Field

```
Product Owner Answer — Q1:

  qc_user may update (circle or list):
    A. qc_status, qc_remarks, quality_rating ONLY  [RECOMMENDED]
    B. qc_status, qc_remarks, quality_rating + _______________
    C. All fields (current behavior — not recommended)

  approved_for_medical_items should require:
    A. Both QC (qc_status = 'approved') AND Procurement sign-off  [RECOMMENDED]
    B. QC sign-off only
    C. Procurement sign-off only
    D. No restriction (current behavior — not recommended)

  Answered by: _______________  Date: _______________
```

---

## 4. Decision Detail — Q2: Should `factory_user` Be Able to Delete `factory_records`?

### 4.1 Current State

Migration `025_factory_records.sql` created:

```sql
CREATE POLICY factory_user_all ON factory_records FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'factory_user')
);
-- ⚠️ FOR ALL includes DELETE — factory_user can permanently delete production records
-- ⚠️ No WITH CHECK — factory_user can update any field including production_status
```

### 4.2 The Problem

`factory_records` is the authoritative production record for each project vehicle line. It contains:

| Column | Business significance |
|--------|-----------------------|
| `production_status` | Tracks progression through 16 manufacturing statuses |
| `progress_percentage` | Billable progress data fed to management dashboards |
| `expected_completion_date` | SLA commitment tracked in Control Tower |
| `actual_completion_date` | Audit-critical: when was this job actually done? |
| `monthly_update_required` | Compliance flag — triggers SLA events |
| `last_updated_by` / `last_updated_at` | Change accountability |

**If `factory_user` can DELETE:**
- A factory worker could delete a production record to hide a missed deadline or a failed status progression
- The project would appear to have no production record — potentially triggering incorrect WO gate checks
- The audit log (migration 080) captures writes, but if the row is deleted, the historical progression is lost
- `project_id ON DELETE CASCADE` — the production record is only deleted with the project, which is admin-controlled

**Legitimate factory_user operations:**
- Insert new production records (when a WO is created)
- Update production_status, progress_percentage, expected dates, remarks
- Upload BOQ/GA drawing references

There is **no playbook scenario** where a factory_user is expected to permanently delete a production record. Incorrect records should be corrected via UPDATE, not deleted.

### 4.3 Risk Analysis

| Scenario | Risk if DELETE allowed | Risk if DELETE blocked |
|----------|----------------------|----------------------|
| Factory user makes an error creating a record | Can delete and re-create | Must request admin to delete + re-create |
| Factory user wants to hide a late production update | Can delete the record | Cannot delete — admin review required |
| Duplicate records created by mistake | Can self-clean | Admin must clean up |
| Compliance audit: was this project in production? | Record may have been deleted | Record always preserved |

**Verdict:** The operational cost of requiring admin to delete factory records is low. The compliance cost of allowing unchecked deletions is high. The recommendation is to block DELETE for factory_user.

### 4.4 Recommended Answer

**No — `factory_user` should NOT be able to delete `factory_records`.** Incorrect records should be corrected via UPDATE. Deletions (if ever truly necessary) should require `admin` or `operations_manager`.

### 4.5 Step 6D Migration Impact

**If answer is "No, block DELETE" (recommended):**

```sql
-- Step 6D will split factory_user_all into INSERT + UPDATE only:
DROP POLICY IF EXISTS factory_user_all ON public.factory_records;
CREATE POLICY factory_user_insert ON public.factory_records
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'factory_user');
CREATE POLICY factory_user_update ON public.factory_records
  FOR UPDATE
  USING (public.current_user_role() = 'factory_user')
  WITH CHECK (public.current_user_role() = 'factory_user');
-- DELETE is blocked by default (no DELETE policy for factory_user)

-- Also restrict viewer/store_user to approved projects (separate gap in 025):
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
```

**If answer is "Yes, allow DELETE" (not recommended):**

```sql
-- Step 6D will add WITH CHECK to constrain writes but keep DELETE:
DROP POLICY IF EXISTS factory_user_all ON public.factory_records;
CREATE POLICY factory_user_all ON public.factory_records
  FOR ALL
  USING (public.current_user_role() = 'factory_user')
  WITH CHECK (public.current_user_role() = 'factory_user');
```

### 4.6 Owner Answer Field

```
Product Owner Answer — Q2:

  Should factory_user be able to DELETE factory_records?
    A. No — DELETE requires admin/operations_manager  [RECOMMENDED]
    B. Yes — factory_user may delete their own records

  If "No": Should factory_user be able to delete a record they just created in the
  same session (e.g., to correct a data entry mistake)?
    A. No — all deletions require admin
    B. Yes — factory_user may delete records they created (WHERE created_by = auth.uid())

  Answered by: _______________  Date: _______________
```

---

## 5. Decision Detail — Q3: Should `procurement_user` Be Able to Delete PRs?

### 5.1 Current State

Migration `019_procurement_requests.sql` created:

```sql
CREATE POLICY pr_procurement_all ON procurement_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);
-- ⚠️ FOR ALL includes DELETE — procurement_user can permanently delete any PR
-- ⚠️ No WITH CHECK
```

### 5.2 The Problem

`procurement_requests` is the core audit trail linking project material needs to purchase orders. Its status enum already provides for terminal states:

```sql
CREATE TYPE pr_status AS ENUM (
  'draft', 'pr_received', 'in_progress',
  'partially_ordered', 'fully_ordered', 'cancelled', 'closed'
);
```

If `procurement_user` can DELETE a PR:
- A `closed` PR can be erased, hiding the fact that materials were ever ordered for a project
- A `cancelled` PR can be erased, removing the audit trail of why materials were rejected
- The `purchase_orders_to_supplier` table references PRs via `procurement_request_id` FK (`ON DELETE SET NULL`) — deleting a PR would set all linked PO references to NULL, corrupting the PO-to-PR audit chain
- The timeline event system logs PR creation but cannot log deletion of deleted rows

**Legitimate procurement_user operations:**
- Create new PRs (`status = 'draft'`)
- Update status through the workflow (`in_progress`, `partially_ordered`, `fully_ordered`)
- Cancel a PR (`status = 'cancelled'`)

There is **no playbook scenario** where procurement deletes a PR. PRs in error should be set to `cancelled`, preserving the audit trail.

### 5.3 Risk Analysis

| Scenario | Risk if DELETE allowed | Risk if DELETE blocked |
|----------|----------------------|----------------------|
| PR created in error (duplicate) | Can delete | Must cancel + add remarks |
| PR for a cancelled project | Can delete | Must set to `cancelled` |
| PR for a completed project | Can delete, erasing order history | Cannot delete — history preserved |
| PR linked to POs | Delete sets PO.procurement_request_id = NULL | Cannot delete — link preserved |
| Compliance audit: what materials were ordered? | Record may be missing | Record always present |

### 5.4 Recommended Answer

**No — `procurement_user` should NOT be able to delete PRs.** The `cancelled` status already provides the correct mechanism for retiring unwanted PRs. Deletions (if ever necessary) should require `admin`.

The UPDATE policy should additionally restrict updates to PRs that are not in terminal states (`closed`, `cancelled`), preventing retroactive modification of completed procurement history.

### 5.5 Step 6D Migration Impact

**If answer is "No, block DELETE" (recommended):**

```sql
-- Step 6D will split pr_procurement_all into INSERT + UPDATE only:
DROP POLICY IF EXISTS pr_procurement_all ON public.procurement_requests;
CREATE POLICY pr_procurement_insert ON public.procurement_requests
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'procurement_user');
CREATE POLICY pr_procurement_update ON public.procurement_requests
  FOR UPDATE
  USING (
    public.current_user_role() = 'procurement_user'
    AND status NOT IN ('closed', 'cancelled')
  )
  WITH CHECK (public.current_user_role() = 'procurement_user');
-- No DELETE policy for procurement_user — cancelled via status only
```

**If answer is "Yes, allow DELETE for draft/in_progress only":**

```sql
-- Allow DELETE but only for non-terminal, non-linked PRs:
CREATE POLICY pr_procurement_delete ON public.procurement_requests
  FOR DELETE
  USING (
    public.current_user_role() = 'procurement_user'
    AND status IN ('draft', 'pr_received')
  );
```

**If answer is "Yes, allow DELETE for all statuses" (not recommended):** Full DELETE permission retained.

### 5.6 Owner Answer Field

```
Product Owner Answer — Q3:

  Should procurement_user be able to DELETE procurement_requests?
    A. No — PRs should be cancelled (status = 'cancelled'), never deleted  [RECOMMENDED]
    B. Yes, but only draft/pr_received PRs (not yet ordered)
    C. Yes, for all statuses (current behavior — not recommended)

  Should procurement_user be blocked from updating closed/cancelled PRs?
    A. Yes — terminal state PRs should be immutable  [RECOMMENDED]
    B. No — procurement_user may update any PR regardless of status

  Answered by: _______________  Date: _______________
```

---

## 6. Decision Detail — Q4: Should `store_user` Be Restricted from Updating `receipt_number` After Creation?

### 6.1 Current State

Migration `029_store_receipts.sql` created:

```sql
CREATE POLICY store_receipts_store_all ON store_receipts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
       WHERE user_id = auth.uid()
         AND role IN ('store_user', 'admin', 'operations_manager')
    )
  );
-- ⚠️ No WITH CHECK — store_user can update ANY column, including receipt_number
-- ⚠️ store_user can also retroactively change received_date and supplier_name
```

`receipt_number` is auto-generated at insert time by a BEFORE INSERT trigger:

```sql
CREATE TRIGGER trg_store_receipts_auto_number
  BEFORE INSERT ON store_receipts
  FOR EACH ROW EXECUTE FUNCTION store_receipts_auto_number();
-- Generates: RCP-YYYY-NNNN (e.g., RCP-2025-0042)
```

The table also has:
```sql
receipt_number text NOT NULL UNIQUE
```

### 6.2 The Problem

**If `store_user` can UPDATE `receipt_number`:**

| Risk | Consequence |
|------|-------------|
| Receipt number changed to match a paper delivery note | Legitimate operation — but also a forgery vector |
| Sequential number changed post-creation | Breaks the auditable sequential numbering scheme |
| Swap two receipt numbers | Moves material records between deliveries |
| receipt_number changed after QC inspection links it | `material_qc_inspections` links via FK — but the receipt is identified by number in physical records; a number change creates a paper/system mismatch |

**If `store_user` can UPDATE `received_date` or `supplier_name` retroactively:**

| Risk | Consequence |
|------|-------------|
| received_date changed after status = 'accepted' | Hides actual receipt date for SLA tracking |
| supplier_name changed | Corrupts the supplier delivery record |

**Legitimate store_user UPDATE operations:**
- Update `status` (from `draft` → `received` → `pending_material_qc` → etc.)
- Update `remarks`
- Correct `delivery_note_number` before QC inspection begins
- Link to `procurement_request_id` if not set at creation

### 6.3 The `receipt_number` Field Specifically

The question specifically asks about `receipt_number`. This field:
- Is set once by trigger at INSERT
- Is `UNIQUE` — cannot be set to any existing value
- Is the external identifier printed on physical store records
- Is referenced in `material_qc_inspections` conceptually (via `store_receipt_id` FK) but is also used in physical paperwork

**Changing `receipt_number` after creation creates a mismatch between:**
1. The PostgreSQL record (updated number)
2. The physical delivery receipt or QC form (original number)
3. Any audit log entries that captured the original number

### 6.4 Risk Analysis

| Scenario | Risk if receipt_number is mutable | Risk if receipt_number is immutable |
|----------|----------------------------------|-------------------------------------|
| Typo in receipt number at creation | Can self-correct (trigger might not run on UPDATE) | Must request admin to delete + re-insert |
| Number needs to match physical delivery note | Can update to match | Cannot update — must add a note in remarks |
| Auditor checks receipt trail | Number may have changed, mismatch with physical docs | Number is permanent, always matches trigger-generated record |
| Fraudulent receipt renaming | Possible | Blocked |

**Note:** The auto-number trigger only fires on INSERT (when `receipt_number IS NULL`). If store_user updates `receipt_number` on an existing row, the trigger does NOT fire — any text value can be inserted, including values that could break the sequential scheme or duplicate external numbers.

### 6.5 Recommended Answer

**Yes — `store_user` should NOT be able to update `receipt_number` after creation.** The auto-generated `RCP-YYYY-NNNN` format should be immutable once set. Errors in other fields (status, remarks) can be corrected via UPDATE; if a receipt was created with a fundamentally incorrect receipt_number, an admin should delete and re-insert.

Optionally, Step 6D can also lock `received_date` from modification once the receipt status moves past `draft`.

### 6.6 Step 6D Migration Impact

**If answer is "Yes, lock receipt_number" (recommended):**

```sql
-- Step 6D adds a BEFORE UPDATE trigger to block receipt_number changes:
-- (RLS alone cannot enforce column immutability — requires a trigger)
CREATE OR REPLACE FUNCTION public.prevent_receipt_number_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
    RAISE EXCEPTION 'receipt_number is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lock_receipt_number
  BEFORE UPDATE ON public.store_receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_receipt_number_change();

-- Also add WITH CHECK to the store_all policy:
DROP POLICY IF EXISTS store_receipts_store_all ON public.store_receipts;
CREATE POLICY store_receipts_store_all ON public.store_receipts
  FOR ALL
  USING (public.current_user_role() IN ('store_user', 'admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('store_user', 'admin', 'operations_manager'));
```

**If answer is "Yes, lock receipt_number AND received_date after status moves past draft":**

```sql
-- Extend the trigger:
CREATE OR REPLACE FUNCTION public.prevent_receipt_number_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
    RAISE EXCEPTION 'receipt_number is immutable after creation';
  END IF;
  IF OLD.status <> 'draft' AND NEW.received_date IS DISTINCT FROM OLD.received_date THEN
    RAISE EXCEPTION 'received_date is locked after receipt status advances from draft';
  END IF;
  RETURN NEW;
END;
$$;
```

**If answer is "No, store_user may change receipt_number" (not recommended):**

```sql
-- Step 6D still adds WITH CHECK to the store_all policy but does NOT add the trigger:
DROP POLICY IF EXISTS store_receipts_store_all ON public.store_receipts;
CREATE POLICY store_receipts_store_all ON public.store_receipts
  FOR ALL
  USING (public.current_user_role() IN ('store_user', 'admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('store_user', 'admin', 'operations_manager'));
```

### 6.7 Owner Answer Field

```
Product Owner Answer — Q4:

  Should receipt_number be immutable after a store receipt is created?
    A. Yes — receipt_number cannot be changed after INSERT  [RECOMMENDED]
    B. No — store_user may update receipt_number (e.g., to match paper delivery note)

  Should received_date be locked after the receipt status advances past 'draft'?
    A. Yes — received_date is locked when status != 'draft'
    B. No — store_user may update received_date at any time (current behavior)

  Answered by: _______________  Date: _______________
```

---

## 7. Complete Decision Form (for Product Owner Signature)

Copy this section, fill in all answers, and return before Step 6D implementation begins.

```
FT Operations Portal — Step 6D-0 Product Owner Decision Sign-Off
Date: _______________
Answered by: _______________  Role: _______________

────────────────────────────────────────────────────────────────

Q1 — approved_suppliers: Which fields may qc_user update?

  qc_user may update:
    [ ] A. qc_status, qc_remarks, quality_rating ONLY  [RECOMMENDED]
    [ ] B. qc_status, qc_remarks, quality_rating + list: _______________
    [ ] C. All fields (not recommended)

  approved_for_medical_items may be set by:
    [ ] A. admin / operations_manager only  [RECOMMENDED]
    [ ] B. procurement_user (without QC requirement)
    [ ] C. qc_user (without Procurement requirement)
    [ ] D. No restriction (current — not recommended)

────────────────────────────────────────────────────────────────

Q2 — factory_records: May factory_user delete records?

    [ ] A. No — DELETE requires admin/operations_manager  [RECOMMENDED]
    [ ] B. Yes, for records they personally created only
    [ ] C. Yes, for any factory record (current — not recommended)

────────────────────────────────────────────────────────────────

Q3 — procurement_requests: May procurement_user delete PRs?

    [ ] A. No — cancel via status = 'cancelled' only  [RECOMMENDED]
    [ ] B. Yes, but only draft/pr_received PRs
    [ ] C. Yes, for all statuses (current — not recommended)

  May procurement_user update closed/cancelled PRs?
    [ ] A. No — terminal state PRs are immutable  [RECOMMENDED]
    [ ] B. Yes — procurement_user may update any PR

────────────────────────────────────────────────────────────────

Q4 — store_receipts: May store_user update receipt_number after creation?

    [ ] A. No — receipt_number is immutable after INSERT  [RECOMMENDED]
    [ ] B. Yes — store_user may change receipt_number

  May store_user update received_date after status leaves 'draft'?
    [ ] A. No — received_date locks when status != 'draft'
    [ ] B. Yes — received_date may be updated at any time (current)

────────────────────────────────────────────────────────────────

Signature: _______________  Date: _______________
```

---

## 8. Step 6D Scope (After Decision Sign-Off)

Once all four questions are answered, Step 6D implements the following migrations in order:

| Migration | Table | Change | Blocked on Decision |
|-----------|-------|--------|-------------------|
| `082_approved_suppliers_rls.sql` | `approved_suppliers` | Split `sup_procurement_all` (INSERT + UPDATE + WITH CHECK). Replace `sup_qc_update` with column-aware version. | Q1 |
| `083_factory_records_rls.sql` | `factory_records` | Split `factory_user_all` (INSERT + UPDATE, no DELETE). Restrict `factory_viewer_select` to approved projects. | Q2 |
| `084_procurement_requests_rls.sql` | `procurement_requests` | Split `pr_procurement_all` (INSERT + UPDATE, no DELETE). Add status guard on UPDATE. | Q3 |
| `085_store_receipts_rls.sql` | `store_receipts` | Add `WITH CHECK` to `store_receipts_store_all`. Add trigger locking `receipt_number`. | Q4 |

**Step 6D must NOT touch:**
- The five tables changed in Step 6C (migration 081)
- `projects`, `purchase_orders_to_supplier`, `audit_log`, `customers`
- Any migration 001–081 (immutable once applied)

---

## 9. Tables NOT Covered in Step 6D (Deferred)

The following Class-B tables from the Step 6B evidence review are out of scope for Step 6D. They require a separate decision pack (Step 6D-1):

| Table | Gap | Reason Deferred |
|-------|-----|----------------|
| `medical_serial_numbers` | `medical_serials_broad_all` (FOR ALL, qc_user can DELETE serials) | Higher-risk, requires compliance review of medical audit requirements |
| `material_custody_records` | `store_all` (no WITH CHECK, store_user can self-approve custody) | Custody approval workflow needs UX review before DB restriction |
| `store_receipt_items` | `store_item_all` (no WITH CHECK) | Step 6D-1 after `store_receipts` (029) is confirmed |
| `quotation_requests` | `qr_coordinator_update` (no status transition guard) | Separate business rule clarification needed |

---

## 10. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/security/step-6b-rls-hardening-evidence-review.md` | Evidence matrix classifying all 14 tables |
| `docs/security/step-6c-qc-select-rls-restriction.md` | Step 6C implementation record (Class A) |
| `supabase/migrations/019_procurement_requests.sql` | Current PR policy state |
| `supabase/migrations/024_approved_suppliers.sql` | Current supplier policy state |
| `supabase/migrations/025_factory_records.sql` | Current factory policy state |
| `supabase/migrations/029_store_receipts.sql` | Current store receipt policy state |
| `docs/CLAUDE_PROJECT_RULES.md` | Repository rules — migrations are immutable once applied |
| `docs/governance/critical-governance-rules-register.md` | Governance rules (R-001 to R-019) |

---

## 11. Validation Results

```
npm run build        → ✅ Built successfully (6.09s)
npx tsc --noEmit     → ✅ No type errors
npm run lint         → ⚠️ 79 pre-existing problems (63 errors, 16 warnings) — identical to base
                          branch, not introduced by this PR
Supabase CLI         → Not available in this environment; no SQL files added
```

No migrations created. No schema changes. No application code changes. This document is the only file added in this branch.
