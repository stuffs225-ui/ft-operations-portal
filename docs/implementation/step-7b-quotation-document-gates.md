# Step 7B — Quotation Required Document Gates

**Branch:** `fix/quotation-document-gates`  
**Date:** 2026-06-14  
**Migration:** `supabase/migrations/087_quotation_required_document_gates.sql`  
**Depends on:** Step 7A (migration 086 — coordinator status transition guard)

---

## 1. Problem Summary

Two governance rules from the FT Operations Portal Playbook v3.2 were enforced only at the UI level (TIER-3) with no DB-level gate:

**R-001:** A quotation cannot be submitted for processing unless at least one Specification File is attached. Enforced only in `QuotationNew.tsx` line 183 (client-side form validation). A direct Supabase API call could bypass this.

**R-002:** A Sales Coordinator cannot return a quotation to Sales without both: (a) a quotation PDF attached, and (b) a quotation number entered. No DB trigger existed — a direct API call could set `quotation_status = 'returned_to_sales'` without either.

Both are identified in the governance register (R-001, R-002) and system audit (B-008, B-009) as required DB-level enforcement.

---

## 2. Current Gap

### R-001 Gap
`qr_sales_update` (migration 060) allows `sales_user` to UPDATE quotation rows where `status IN ('draft', 'need_clarification')`. A direct `UPDATE quotation_requests SET quotation_status = 'submitted_by_sales'` call with no spec file in `quotation_documents` would succeed. No trigger blocked this.

Additionally, `QuotationNew.tsx` creates quotations with `quotation_status = 'submitted_by_sales'` via INSERT — at INSERT time, documents don't yet exist. The UI validates `form.documents.length === 0` client-side, but a direct INSERT API call bypasses this.

### R-002 Gap
`qr_coordinator_update` (migration 060) allows `sales_coordinator` to UPDATE all `quotation_requests` rows. A direct `UPDATE quotation_requests SET quotation_status = 'returned_to_sales'` call without uploading a PDF or entering a quotation number would succeed. No trigger blocked this.

---

## 3. Tables and Storage Inspected

### `quotation_documents` (migration 017)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `quotation_request_id` | uuid NOT NULL | FK → `quotation_requests(id)` ON DELETE CASCADE |
| `document_type` | `quotation_document_type` enum NOT NULL | `specification_file`, `quotation_pdf`, `supporting_document`, `customer_requirement`, `other` |
| `file_name` | text NOT NULL | Always present on any row |
| `storage_path` | text | Nullable — NULL if file upload failed but record was created |
| `status` | text NOT NULL DEFAULT 'uploaded' | No failure state defined |
| `file_size` | bigint | Nullable (migration 075) |
| `mime_type` | text | Nullable (migration 075) |

**Storage bucket:** `quotation-documents` (migration 058, private bucket). Write access: admin, operations_manager, sales_user, sales_coordinator.

### `quotation_requests` (migration 015 + 060)

Relevant fields for these gates:

| Field | Type | Notes |
|-------|------|-------|
| `quotation_status` | `quotation_status` enum NOT NULL | The status being guarded |
| `quotation_code` | text NOT NULL | Used in error messages |
| `quotation_number` | text | Nullable — set by coordinator before returning to sales |

### Document Type Enum Values (migration 017)
`specification_file` | `quotation_pdf` | `supporting_document` | `customer_requirement` | `other`

Note: `QuotationNew.tsx` uses all of `specification_file`, `customer_requirement`, `supporting_document`, `other` — all valid enum values.  
Note: `QuotationDetail.tsx` shows `customer_po` and `customer_contract` as upload options — these are NOT valid enum values and would fail at the DB level if attempted. This is a pre-existing UI inconsistency unrelated to this migration.

---

## 4. R-001 Enforcement — Submission Gate

### Implementation

BEFORE UPDATE trigger `trg_quotation_document_gates` on `quotation_requests`. Fires when `NEW.quotation_status = 'submitted_by_sales'` AND status is changing (`OLD.quotation_status IS DISTINCT FROM 'submitted_by_sales'`).

**Document evidence required:**

```sql
EXISTS (
  SELECT 1
    FROM public.quotation_documents
   WHERE quotation_request_id = NEW.id
     AND document_type = 'specification_file'
)
```

At least one row in `quotation_documents` with `document_type = 'specification_file'` for the quotation being submitted. The `file_name` NOT NULL constraint guarantees any such row has a non-null name. `storage_path` is not checked — see limitations §12.

**Error code:** `P0001` (raise exception, same pattern as migration 086 and 061).

### Structural Limitation — INSERT Path

**`QuotationNew.tsx` cannot be intercepted by this trigger.**

`QuotationNew.tsx` `handleSave(true)` creates the quotation via INSERT with `quotation_status = 'submitted_by_sales'`, then inserts the spec file documents in a separate subsequent API call. Since the documents are not yet present at INSERT time, a BEFORE INSERT trigger would always fail the document check, breaking the legitimate UI flow. A BEFORE UPDATE trigger does not fire on INSERTs.

Coverage map:

| Path | Covered? | Enforcement Tier |
|------|----------|-----------------|
| `QuotationNew.tsx` INSERT direct-submit (primary UI path) | ❌ Not covered | TIER-3 (UI form validation) |
| Direct API INSERT with `submitted_by_sales` (bypass attack) | ❌ Not covered | TIER-3 only |
| API UPDATE `draft → submitted_by_sales` | ✅ Covered | TIER-1 (trigger) |
| API UPDATE `need_clarification → submitted_by_sales` | ✅ Covered | TIER-1 (trigger) |
| Future UI "Submit Draft" path (if added) | ✅ Covered | TIER-1 (trigger) |

**To achieve full TIER-1 enforcement for R-001:** Restructure `QuotationNew.tsx` to use a two-step INSERT flow — create as `'draft'` first, upload spec files, then UPDATE to `'submitted_by_sales'`. This requires an app code change, which is outside the scope of this migration. Recommended for Step 7C or a dedicated Step 7C-pre.

---

## 5. R-002 Enforcement — Return-to-Sales Gate

### Implementation

Same BEFORE UPDATE trigger `trg_quotation_document_gates`. Fires when `NEW.quotation_status = 'returned_to_sales'` AND status is changing.

**Document evidence required:**

1. **Quotation number:**
   ```sql
   NEW.quotation_number IS NOT NULL AND trim(NEW.quotation_number) = ''
   ```
   Checks the quotation number in the UPDATE payload. `handleReturnToSales` in `QuotationDetail.tsx` sends `quotation_number` in the same UPDATE payload — `NEW.quotation_number` reflects this value. If `quotation_number` was set in a prior `handleSaveLineValues` call, `NEW.quotation_number` reflects the existing DB value when not in the UPDATE payload.

2. **Quotation PDF:**
   ```sql
   EXISTS (
     SELECT 1
       FROM public.quotation_documents
      WHERE quotation_request_id = NEW.id
        AND document_type = 'quotation_pdf'
   )
   ```
   Checks for a committed PDF document row in `quotation_documents`. By the time `handleReturnToSales` runs, the coordinator has already called `handleSaveLineValues` (which uploads the PDF and inserts the `quotation_pdf` document row in a prior committed transaction). The trigger's SELECT finds the committed row.

**Error code:** `P0001` (two separate raise exceptions with distinct messages for number vs PDF).

### Coverage

| Path | Covered? | Enforcement Tier |
|------|----------|-----------------|
| Coordinator `handleReturnToSales` UI action | ✅ Covered | TIER-1 (trigger) |
| Direct API UPDATE `quotation_status = 'returned_to_sales'` | ✅ Covered | TIER-1 (trigger) |
| Admin direct UPDATE to `returned_to_sales` without docs | ✅ Covered | TIER-1 (trigger, no admin override) |

R-002 is **fully enforced** at TIER-1. All paths that set `returned_to_sales` go through UPDATE.

---

## 6. Trigger Logic Summary

```
BEFORE UPDATE on quotation_requests
  │
  ├─ quotation_status unchanged?  → PASS (non-status updates always allowed)
  │
  ├─ NEW.quotation_status = 'submitted_by_sales' AND status is changing?
  │   ├─ spec file exists in quotation_documents?  → PASS
  │   └─ no spec file found?  → RAISE EXCEPTION P0001 (R-001)
  │
  ├─ NEW.quotation_status = 'returned_to_sales' AND status is changing?
  │   ├─ quotation_number NULL or blank?  → RAISE EXCEPTION P0001 (R-002a)
  │   ├─ quotation_pdf exists in quotation_documents?  → PASS
  │   └─ no quotation_pdf found?  → RAISE EXCEPTION P0001 (R-002b)
  │
  └─ any other status change  → PASS
```

**Interaction with migration 086 (`trg_quotation_status_transition_guard`):**

Both triggers are BEFORE UPDATE. Alphabetical order:
1. `quotation_updated_at` (sets `updated_at`)
2. `trg_quotation_document_gates` ← this migration (`d` < `s`)
3. `trg_quotation_status_transition_guard` (migration 086)

No overlap: document gate checks `submitted_by_sales` and `returned_to_sales`; coordinator guard checks `converted_to_so`, `cancelled`, `closed_lost`, `converted_to_hot_project`. A coordinator attempting `cancelled` passes through the document gate (no match) then hits the coordinator guard. ✅

---

## 7. Role Impact

**Enforced for ALL roles — no admin/operations_manager override.**

Both R-001 and R-002 are data-completeness rules, not access-control rules. A quotation genuinely cannot be processed without a spec file; it genuinely cannot be returned to sales without a quotation PDF and number. Admin satisfies these gates the same way as any other role: by uploading the document first.

| Role | R-001 Impact | R-002 Impact |
|------|-------------|-------------|
| `admin` | Cannot UPDATE status to `submitted_by_sales` without spec file | Cannot UPDATE status to `returned_to_sales` without PDF + number |
| `operations_manager` | Same as admin | Same as admin |
| `sales_user` | UPDATE path blocked without spec file (INSERT path: UI-level validation only) | N/A — sales_user RLS limits UPDATE to draft/need_clarification status |
| `sales_coordinator` | No direct submit path | Cannot return to sales without PDF + number |
| All other roles | No UPDATE policy on quotation_requests; trigger not reachable | Same |

---

## 8. Manual Test Scenarios

### R-001 Tests

**Test R-001-A — Blocked: UPDATE draft to submitted_by_sales with no spec file**
```typescript
// Authenticated as sales_user, quotation in 'draft', no spec files in quotation_documents
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'submitted_by_sales' })
  .eq('id', draftQuotationId);
// Expected: error.code = 'P0001'
// Expected: error.message includes 'R-001'
// Expected: error.message includes 'specification file'
```

**Test R-001-B — Allowed: UPDATE to submitted_by_sales when spec file exists**
```typescript
// First: insert a spec file document
await supabase.from('quotation_documents').insert({
  quotation_request_id: draftQuotationId,
  document_type: 'specification_file',
  file_name: 'Spec-Document.pdf',
  uploaded_by: userId,
});
// Then: update status
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'submitted_by_sales' })
  .eq('id', draftQuotationId);
// Expected: error = null; update succeeds
```

**Test R-001-C — Allowed: non-status update on draft does not require spec file**
```typescript
// Authenticated as sales_user, quotation in 'draft', no spec files
const { error } = await supabase
  .from('quotation_requests')
  .update({ scope_summary: 'Updated scope.' })
  .eq('id', draftQuotationId);
// Expected: error = null (pass-through; status unchanged)
```

**Test R-001-D — INSERT path (UI): QuotationNew.tsx submit with no spec files**
- Action: Go through QuotationNew.tsx wizard, do not add any documents, click "Submit"
- Expected: UI validation error "At least one specification document is required to submit."
- The INSERT is blocked at TIER-3 (UI) for this path. Note: the trigger does NOT fire.

**Test R-001-E — Resubmission after clarification**
```typescript
// Authenticated as sales_user, quotation in 'need_clarification', no spec files
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'submitted_by_sales' })
  .eq('id', clarificationQuotationId);
// Expected: error.code = 'P0001' (blocked, no spec file)

// Add spec file, then retry:
await supabase.from('quotation_documents').insert({
  quotation_request_id: clarificationQuotationId,
  document_type: 'specification_file', file_name: 'Updated-Spec.pdf', uploaded_by: userId,
});
const { error: error2 } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'submitted_by_sales' })
  .eq('id', clarificationQuotationId);
// Expected: error2 = null
```

---

### R-002 Tests

**Test R-002-A — Blocked: return to sales with no quotation number**
```typescript
// Authenticated as sales_coordinator, quotation has PDF but no quotation_number
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'returned_to_sales', quotation_number: null })
  .eq('id', quotationId);
// Expected: error.code = 'P0001'
// Expected: error.message includes 'R-002' and 'quotation number'
```

**Test R-002-B — Blocked: return to sales with no quotation PDF**
```typescript
// Authenticated as sales_coordinator, quotation has quotation_number but no PDF doc
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'returned_to_sales', quotation_number: 'QT-EST-2025-0088' })
  .eq('id', quotationId);
// Expected: error.code = 'P0001'
// Expected: error.message includes 'R-002' and 'quotation PDF'
```

**Test R-002-C — Allowed: return to sales when both exist**
```typescript
// First: upload PDF doc
await supabase.from('quotation_documents').insert({
  quotation_request_id: quotationId,
  document_type: 'quotation_pdf',
  file_name: 'QuotationPDF.pdf',
  uploaded_by: coordinatorId,
});
// Then: return to sales
const { error } = await supabase
  .from('quotation_requests')
  .update({
    quotation_status: 'returned_to_sales',
    quotation_number: 'QT-EST-2025-0088',
    returned_to_sales_at: new Date().toISOString(),
  })
  .eq('id', quotationId);
// Expected: error = null
```

**Test R-002-D — Allowed: non-status coordinator update does not require PDF/number**
```typescript
// Authenticated as sales_coordinator, no PDF/number present
const { error } = await supabase
  .from('quotation_requests')
  .update({ coordinator_remarks: 'Processing...', estimation_contact: 'est@example.com' })
  .eq('id', quotationId);
// Expected: error = null (pass-through; status unchanged)
```

**Test R-002-E — Step 7A guard still active after 087**
```typescript
// Authenticated as sales_coordinator — forbidden status from migration 086
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'cancelled' })
  .eq('id', quotationId);
// Expected: error.code = 'P0001' (blocked by trg_quotation_status_transition_guard)
```

---

## 9. Rollback Notes

To revert migration 087 only (migration 086 is unaffected):

```sql
-- Step 1: Remove the document gate trigger
DROP TRIGGER IF EXISTS trg_quotation_document_gates ON public.quotation_requests;

-- Step 2: Remove the trigger function
DROP FUNCTION IF EXISTS public.enforce_quotation_document_gates();
```

No data is affected. No schema is modified. Migration 086 (`trg_quotation_status_transition_guard`) continues to function independently after rollback.

---

## 10. Known Assumptions

1. **R-001 spec file type is `specification_file` only.** The `customer_requirement` and `supporting_document` document types are NOT counted as specification files for the R-001 gate. The governance rule says "Specification File" — this maps to the `specification_file` enum value. If `customer_requirement` should also qualify, the trigger can be extended with `AND document_type IN ('specification_file', 'customer_requirement')`.

2. **R-002 PDF check is presence-only, not content-verified.** The gate checks for a row with `document_type = 'quotation_pdf'` in `quotation_documents`. It does NOT check `storage_path IS NOT NULL`. A document row with a NULL `storage_path` (file upload failed but record was created) would still satisfy the gate. This is because the `status` field has no 'failed' value and there is no way to distinguish a completed upload from a failed one at the row level. See limitation §11-C.

3. **Trigger fires under the original caller's identity even when called from SECURITY DEFINER functions.** `auth.uid()` and `current_user_role()` return the original authenticated caller's values. This is consistent with all Step 6D and 7A triggers.

4. **`trim()` handles whitespace-only quotation_number.** `trim(NEW.quotation_number) = ''` catches values like `'   '`. Standard PostgreSQL behavior.

5. **Admin and operations_manager cannot bypass either gate.** Neither gate has a role-based override. Admin must upload the required document before the status change. This is intentional for data integrity.

---

## 11. Known Limitations

### A. R-001 INSERT Path Gap (Structural — Cannot Fix Without App Code Change)

The primary quotation submission path (`QuotationNew.tsx` → direct INSERT with `submitted_by_sales` status) cannot be intercepted by a BEFORE UPDATE trigger. A malicious actor with the Supabase anon key could INSERT a quotation with `submitted_by_sales` status and no documents via direct API call, bypassing R-001.

**Impact:** Medium risk — R-001 is enforced at TIER-3 (UI) for the primary path. The UPDATE path and future re-submission paths are TIER-1 (trigger).

**Full fix:** Restructure `QuotationNew.tsx` to INSERT as `'draft'` first, upload spec files, then UPDATE to `'submitted_by_sales'`. This change is outside this task's scope.

### B. R-001 Does Not Validate That Documents Are Genuinely Specification-Type

Only `document_type = 'specification_file'` counts. A user who uploads any other document type first will still be blocked. This is intentional narrowness. See assumption #1.

### C. R-002 PDF Check Does Not Verify `storage_path`

A `quotation_pdf` document row with `storage_path = NULL` (upload failed, record created) satisfies the gate. The practical risk is low: the coordinator would know the PDF wasn't actually uploaded and would see no download link in the UI. If `storage_path IS NOT NULL` is required, add `AND storage_path IS NOT NULL` to the EXISTS subquery in the trigger.

### D. Policy Pattern Inconsistency (Cosmetic)

This trigger uses `public.current_user_role()` (SECURITY DEFINER helper). The existing `quotation_requests` RLS policies use `EXISTS (SELECT 1 FROM user_roles ...)`. No functional difference. Known cosmetic inconsistency noted in Step 6E deferred item D5.

---

## 12. Confirmation: No App Code Changed

- No TypeScript/TSX files modified.
- No `src/` files modified.
- No `package.json` modified.
- No Supabase Edge Functions created or modified.
- No existing migration files modified.
- The only file created in `supabase/migrations/` is `087_quotation_required_document_gates.sql`.

---

## 13. Recommended Step 7C

Step 7C should address the R-001 INSERT path gap and wire the Sales & Coordinator workflows to live Supabase data.

```
Task title: Step 7C — Quotation Submission Flow Hardening + Live Data Wiring

Context:
Step 7A added migration 086 (coordinator status transition guard).
Step 7B added migration 087 (document gates for R-001 and R-002).
Step 7C has two parts:

Part 1 — R-001 INSERT path fix (REQUIRED before production):
  Restructure QuotationNew.tsx submission to use a two-step flow:
    Step 1: INSERT quotation with quotation_status = 'draft'
    Step 2: Upload spec file documents
    Step 3: UPDATE quotation_status to 'submitted_by_sales'
  This makes R-001 fully TIER-1 at both INSERT and UPDATE paths.
  The BEFORE UPDATE trigger (migration 087) then catches both paths.

  Alternatively: implement a SECURITY DEFINER function submit_quotation(p_id)
  that checks for spec files and then sets quotation_status = 'submitted_by_sales'
  atomically. Call it instead of the direct INSERT.

Part 2 — Live data wiring (implement only after Part 1):
  Wire Sales.tsx, Quotations.tsx, SalesCoordinator.tsx, QuotationDetail.tsx
  coordinator actions to live Supabase rather than mock data.
  Specifically:
    • Replace mockOrEmpty() in Sales.tsx and Quotations.tsx
    • Ensure coordinator status transitions call live Supabase and handle P0001
      errors from migration 086 + 087 trigger rejections gracefully
    • Display error messages to the user when a governance gate blocks an action

Create branch: feature/quotation-submission-hardening
```

---

## 14. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/governance/critical-governance-rules-register.md` | R-001, R-002 definitions |
| `docs/system-audit/07-governance-rules-gap-analysis.md` | Current gap analysis for R-001 and R-002 |
| `docs/implementation/step-7a-quotation-status-transition-guard.md` | Migration 086 — coordinator guard |
| `supabase/migrations/015_quotations.sql` | quotation_requests schema and RLS |
| `supabase/migrations/017_quotation_documents.sql` | quotation_documents schema |
| `supabase/migrations/060_cost_protection.sql` | Updated coordinator and sales policies |
| `supabase/migrations/086_quotation_status_transition_guard.sql` | Step 7A trigger |
| `supabase/migrations/087_quotation_required_document_gates.sql` | This migration |
