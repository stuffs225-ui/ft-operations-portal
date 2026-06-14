# Step 7C — QuotationNew Two-Step Submission Flow

**Branch:** `fix/quotation-new-two-step-submission`  
**Date:** 2026-06-14  
**Depends on:** Step 7B (migration 087 — quotation document gates, R-001 + R-002)

---

## 1. Problem Summary

Step 7B (migration 087) added a BEFORE UPDATE trigger (`trg_quotation_document_gates`) that enforces R-001:
> A quotation cannot be submitted for processing unless at least one Specification File is attached.

The trigger correctly blocks any **UPDATE** that transitions `quotation_status` to `submitted_by_sales` when no `specification_file` document exists in `quotation_documents`.

However, the original `QuotationNew.tsx` submission flow used a single **INSERT** with `quotation_status = 'submitted_by_sales'`, followed by a separate document insert call. Because BEFORE UPDATE triggers do not fire on INSERT, and a BEFORE INSERT trigger cannot check documents that do not yet exist, R-001 was left at **TIER-3 (UI only)** on the primary submission path.

Step 7C restructures the submission flow into a two-step pattern so that migration 087's trigger enforces R-001 at **TIER-1 (DB level)** on the final status change.

---

## 2. Old Flow

```
handleSave(true):
  1. INSERT quotation_requests { quotation_status: 'submitted_by_sales', submitted_at: now }
  2. INSERT quotation_request_lines
  3. INSERT quotation_documents
  4. UPDATE hot_projects (if linked)
  5. recordQuotationEvent / recordQuotationAuditEntry
  6. navigate('/quotations/:id')
```

**Gap:** Documents were inserted **after** the quotation was already in `submitted_by_sales` status. The migration 087 trigger never fired on the INSERT. A direct API INSERT with `submitted_by_sales` and no documents would succeed, bypassing R-001 entirely.

---

## 3. New Flow

```
handleSave(true):
  Step 1: INSERT quotation_requests { quotation_status: 'draft', submitted_at: null }
          ↓ failure → setErrors, return (no navigation)
  Step 2: INSERT quotation_request_lines
  Step 3: INSERT quotation_documents
          ↓ failure → setErrors with draft code/location, return (draft exists)
  Step 4: UPDATE hot_projects (if linked)
  Step 5: UPDATE quotation_requests SET quotation_status = 'submitted_by_sales', submitted_at = now
          ← migration 087 fires here and enforces R-001
          ↓ trigger blocks → setErrors with governance message, return (draft exists with docs)
  Step 6: recordQuotationEvent / recordQuotationAuditEntry (submission confirmed)
  Step 7: navigate('/quotations/:id')
```

**Draft path (handleSave(false)):** Unchanged — still inserts as `draft` with no additional UPDATE.

---

## 4. Files Changed

| File | Change |
|------|--------|
| `src/pages/QuotationNew.tsx` | Two-step submission flow (see §5) |
| `docs/implementation/step-7c-quotation-new-two-step-submission.md` | This document |

No migrations, no RLS changes, no schema changes, no other app files modified.

---

## 5. Code Changes in QuotationNew.tsx

### 5a. `validate()` — document check updated

**Old check:**
```typescript
if (forSubmit && form.documents.length === 0)
  errs.push('At least one specification document is required to submit.');
```

**New check:**
```typescript
if (forSubmit && !form.documents.some((d) => d.document_type === 'specification_file')) {
  errs.push('At least one Specification File document is required to submit.');
}
```

The new check explicitly requires at least one document of type `specification_file`, matching what migration 087 enforces at the DB level. The old check only required any document to be present. The new check also catches the edge case where the user added documents of other types (e.g., `customer_requirement`) but no `specification_file`.

### 5b. `handleSave()` — two-step submission

- **Step 1 INSERT**: `quotation_status: 'draft'`, `submitted_at: null` (always, even when submitting)
- **Step 3 document INSERT**: Checked for errors. If document INSERT fails, shows specific error message with draft quotation code and returns without navigating.
- **Step 5 status UPDATE** (submit path only): `UPDATE quotation_requests SET quotation_status = 'submitted_by_sales', submitted_at = now`. Migration 087 fires here. If blocked, shows governance error with draft code and returns.
- **Timeline/audit events** (submit path): Moved to after the successful status UPDATE. Events are only recorded when the quotation is actually `submitted_by_sales`.
- **Draft path**: Timeline/audit events recorded after the initial INSERT (unchanged behavior).

---

## 6. How R-001 Is Now Fully Enforced

### TIER-3 (UI) — `validate()` in QuotationNew.tsx
Checks `form.documents.some((d) => d.document_type === 'specification_file')` before any API call. Blocks the flow entirely when no spec file is in the form.

### TIER-1 (DB) — Migration 087, `trg_quotation_document_gates`
The final UPDATE to `submitted_by_sales` now passes through the BEFORE UPDATE trigger. The trigger checks:
```sql
EXISTS (
  SELECT 1
    FROM public.quotation_documents
   WHERE quotation_request_id = NEW.id
     AND document_type = 'specification_file'
)
```
Because Step 3 (document INSERT) happens before Step 5 (status UPDATE), the document rows already exist when the trigger fires. The trigger can now confirm their presence and allow or block the UPDATE.

### Coverage

| Path | Old Coverage | New Coverage |
|------|-------------|-------------|
| `QuotationNew.tsx` Submit button (UI) | TIER-3 (any doc) | TIER-3 (spec file) + TIER-1 (DB trigger on UPDATE) |
| Direct API `INSERT` with `submitted_by_sales` | ~~No enforcement~~ TIER-3 only (bypassable) | Not possible to INSERT as `submitted_by_sales` — the form never inserts as submitted; direct INSERT would land as `submitted_by_sales` but is a separate TIER-3 concern (this PR does not add a BEFORE INSERT trigger — see §9) |
| Direct API `UPDATE` → `submitted_by_sales` | TIER-1 via migration 087 ✅ | TIER-1 via migration 087 ✅ |
| `need_clarification → submitted_by_sales` UPDATE path | TIER-1 via migration 087 ✅ | TIER-1 via migration 087 ✅ |

**R-001 status after Step 7C: Fully closed for the UI submission path.**

The only remaining gap is a hypothetical direct API INSERT with `quotation_status = 'submitted_by_sales'` — which bypasses the QuotationNew.tsx flow entirely. This is a TIER-1 gap at the INSERT level and requires a separate solution (see §10, Step 7D recommendation).

---

## 7. Failure Handling Matrix

| Step | Failure Scenario | Outcome | User Message |
|------|-----------------|---------|-------------|
| Step 1 — Draft INSERT | Supabase error, RLS, network | Nothing created; stay on QuotationNew page | Generic error from `catch` block |
| Step 2 — Lines INSERT | Supabase error | Lines not saved; draft exists; navigate after Step 5 succeeds | No specific message (lines INSERT errors not surfaced — pre-existing behavior) |
| Step 3 — Documents INSERT | Supabase error, RLS, constraint | Draft exists, no documents; stay on QuotationNew page | `"Draft quotation QTN-XXXX was created but documents could not be saved: [reason]. Your draft is accessible in the Quotations list."` |
| Step 4 — Hot project UPDATE | Supabase error | Draft exists with documents; hot project not linked; continue with Step 5 (soft failure) | No message (same as old behavior) |
| Step 5 — Status UPDATE (R-001 trigger block) | Migration 087 raises governance exception | Draft exists with documents in wrong type; stay on QuotationNew page | `"Draft quotation QTN-XXXX was created but submission was blocked by the database: at least one document must have type 'Specification File'."` |
| Step 5 — Status UPDATE (other error) | Supabase error, network | Draft exists with documents; stay on QuotationNew page | `"Draft quotation QTN-XXXX was created but could not be submitted: [reason]. Your draft is accessible in the Quotations list."` |
| Step 6 — Timeline/audit events | Supabase error | Quotation is submitted_by_sales; events not recorded; silent (same as old behavior) | No message (soft failure — same as old behavior) |

---

## 8. Manual Test Scenarios

### T-001 — Submit without any document
**Actor:** sales_user  
**Action:** Fill form, add zero documents, click "Submit to Coordinator"  
**Expected:** UI validation blocks — "At least one Specification File document is required to submit." No API call made.

### T-002 — Submit with only non-specification-file documents
**Actor:** sales_user  
**Action:** Fill form, add a document of type `customer_requirement`, click "Submit to Coordinator"  
**Expected:** UI validation blocks — "At least one Specification File document is required to submit." No API call made. (New behaviour — previously, any document type passed the UI check.)

### T-003 — Submit with specification_file document
**Actor:** sales_user  
**Action:** Fill form, add a document of type `Specification File`, click "Submit to Coordinator"  
**Expected:** Draft INSERT succeeds → doc INSERT succeeds → UPDATE to `submitted_by_sales` succeeds → navigate to quotation detail showing "Submitted" status.

### T-004 — Save as draft (no documents)
**Actor:** sales_user  
**Action:** Fill form, add zero documents, click "Save as Draft"  
**Expected:** INSERT as `draft` succeeds → navigate to quotation detail showing "Draft" status. No validation error (docs not required for draft).

### T-005 — Save as draft (with documents)
**Actor:** sales_user  
**Action:** Fill form, add documents of any type, click "Save as Draft"  
**Expected:** INSERT as `draft` succeeds → doc INSERT succeeds → navigate to quotation detail showing "Draft" status.

### T-006 — Simulate document INSERT failure (DB test)
**Setup:** Temporarily disconnect from Supabase, or test in a controlled env where document INSERT returns an error.  
**Expected:** Quotation draft exists in `quotation_requests` with `quotation_status = 'draft'`. Error shown on QuotationNew page: "Draft quotation QTN-XXXX was created but documents could not be saved." User finds their draft in the Quotations list.

### T-007 — Verify migration 087 blocks direct UPDATE without specification_file (DB bypass test)
**Actor:** Any authenticated user with UPDATE access  
**SQL:**  
```sql
-- First create a draft without documents
-- Then attempt to UPDATE status to submitted_by_sales
UPDATE quotation_requests
   SET quotation_status = 'submitted_by_sales'
 WHERE id = '<draft-id>';
```
**Expected:** Fails with `P0001`: "Governance violation (R-001): Quotation QTN-XXXX cannot be submitted without at least one specification file."

### T-008 — Verify migration 087 allows UPDATE after specification_file insert (DB bypass test)
**Setup:** Draft quotation with a `specification_file` row in `quotation_documents`.  
**SQL:** `UPDATE quotation_requests SET quotation_status = 'submitted_by_sales' WHERE id = '<draft-id>';`  
**Expected:** Succeeds. Status changes to `submitted_by_sales`.

### T-009 — Existing validation still works (customer name required)
**Actor:** sales_user  
**Action:** Leave Customer Name blank, click "Submit to Coordinator"  
**Expected:** UI validation blocks — "Customer / Entity Name is required." (unchanged behavior)

### T-010 — Final status UPDATE blocked by trigger due to doc type mismatch
**Setup:** Remove UI validation temporarily (dev test only), or craft a direct API call: INSERT draft, INSERT a `customer_requirement` document, then UPDATE to `submitted_by_sales`.  
**Expected:** Trigger blocks the UPDATE with R-001 governance error. Draft remains with documents but in wrong type.

---

## 9. Known Assumptions and Limitations

1. **No-file document records:** `QuotationNew.tsx` registers documents by filename only — no actual file upload to Supabase Storage occurs on this page. Documents are metadata records without `storage_path`. This is pre-existing system behavior. The migration 087 trigger checks only row existence, not `storage_path IS NOT NULL`, which is consistent.

2. **Direct INSERT bypass:** A caller using the Supabase client directly can still INSERT a `quotation_requests` row with `quotation_status = 'submitted_by_sales'` and no documents. The BEFORE UPDATE trigger does not fire on INSERT. This path is not addressed by Step 7C. See Step 7D recommendation.

3. **Lines INSERT errors:** Step 2 (line INSERT) errors are not surfaced to the user — same as the old behavior. Fixing this is out of scope for this task.

4. **Hot project link soft failure:** If Step 4 (hot project UPDATE) fails, the submission continues. This is unchanged behavior. The hot project linkage is non-critical to the R-001 gate.

5. **RLS on draft → submitted_by_sales UPDATE:** The `qr_sales_update` policy (migration 060) allows `sales_user` to UPDATE rows where `quotation_status IN ('draft', 'need_clarification')`. The USING clause permits the `draft → submitted_by_sales` update; the WITH CHECK only constrains `requested_by`. This UPDATE path is therefore permitted by RLS and enforced only by migration 087's trigger.

6. **qtnCode extraction:** The draft INSERT response now reads both `id` and `quotation_code` from the returned row. The `quotation_code` is auto-generated by the `set_quotation_code` trigger (migration 015) at INSERT time and is available in the SELECT response.

---

## 10. Rollback Notes

### Application code rollback
Revert `src/pages/QuotationNew.tsx` to the previous commit. The key changes to revert:
1. `validate()`: change `!form.documents.some((d) => d.document_type === 'specification_file')` back to `form.documents.length === 0`
2. `handleSave()`: restore the single-step INSERT with `quotation_status = status` and remove the final UPDATE step

No migration rollback is required for Step 7C — this PR creates no migrations.

If Step 7B (migration 087) is also rolled back, the governance trigger would be removed. R-001 would revert to TIER-3 (UI only).

### If rollback is required for migration 087 (Step 7B):
```sql
DROP TRIGGER IF EXISTS trg_quotation_document_gates ON public.quotation_requests;
DROP FUNCTION IF EXISTS public.enforce_quotation_document_gates();
```

---

## 11. Confirmation: No Schema/RLS/Migration Changes

| Category | Changed? | Details |
|----------|----------|---------|
| `supabase/migrations/` | No | No new migrations created |
| `quotation_requests` table schema | No | No ALTER TABLE |
| `quotation_documents` table schema | No | No ALTER TABLE |
| RLS policies | No | No CREATE/DROP/ALTER POLICY |
| Existing triggers | No | Migrations 086, 087 unchanged |
| Other app pages | No | QuotationDetail.tsx, SalesCoordinator.tsx, etc. unchanged |
| `package.json` | No | No new dependencies |

---

## 12. Recommended Step 7D

### Goal
Close the remaining R-001 INSERT-path gap: a caller using the Supabase API directly can INSERT a `quotation_requests` row with `quotation_status = 'submitted_by_sales'` and no documents. The BEFORE UPDATE trigger in migration 087 does not intercept INSERT.

### Approach
**Option A (preferred): RLS INSERT restriction**  
Modify `qr_sales_insert` (or add a new policy) to restrict `sales_user` INSERTs to `quotation_status IN ('draft')`. This prevents direct INSERT with `submitted_by_sales` status entirely. No trigger needed.

```sql
-- Proposed: restrict INSERT to draft status only
DROP POLICY IF EXISTS qr_sales_insert ON public.quotation_requests;
CREATE POLICY qr_sales_insert ON public.quotation_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
    AND quotation_status = 'draft'
  );
```

This pairs with the Step 7C application change: since `QuotationNew.tsx` now always INSERTs as `draft`, the RLS INSERT restriction would not break any current UI flow.

**Option B: BEFORE INSERT trigger**  
Add a separate BEFORE INSERT trigger on `quotation_requests` that blocks INSERT with `quotation_status = 'submitted_by_sales'`. Simpler logically but slightly more complex to reason about than an RLS policy.

### Why Step 7D is low priority
- The primary submission path (QuotationNew.tsx UI) is now two-step and enforced at TIER-1 via migration 087 on the UPDATE.
- A direct API INSERT bypass requires a valid authenticated `sales_user` JWT, bypassing the Supabase client SDK session — this is an advanced bypass, not a routine UI scenario.
- R-001 is now effectively TIER-1 for all UI-originated submissions.

### Step 7D recommended prompt outline

```
Task: Step 7D — Close R-001 INSERT-path gap

Context:
- Step 7C changed QuotationNew.tsx to always INSERT as 'draft'.
- Migration 087 enforces R-001 on the UPDATE path.
- Remaining gap: a direct API INSERT with quotation_status = 'submitted_by_sales' bypasses R-001.

Objective:
- Restrict the qr_sales_insert RLS policy to only allow INSERT with quotation_status = 'draft'.
- This ensures the INSERT path can never produce a 'submitted_by_sales' row without going through the UPDATE gate.
- No other RLS policies should be modified.
- No schema changes.

Scope:
- One new migration modifying qr_sales_insert on quotation_requests.
- Documentation update.
- No app code changes.

Sign-off test (from governance register R-001):
- Direct INSERT with quotation_status = 'submitted_by_sales' via authenticated sales_user → must fail.
- INSERT with quotation_status = 'draft' → must succeed.
```
