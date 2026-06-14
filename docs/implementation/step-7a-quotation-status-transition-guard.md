# Step 7A — Quotation Status Transition Guard

**Branch:** `fix/quotation-status-transition-guard`  
**Date:** 2026-06-14  
**Migration:** `supabase/migrations/086_quotation_status_transition_guard.sql`  
**Depends on:** Steps 1–6 (all merged), Step 6E (identified this as mandatory Step 7 pre-work)

---

## 1. Problem Summary

The `qr_coordinator_update` RLS policy (originally migration 015, updated in migration 060) grants `sales_coordinator` UPDATE access to ALL rows on `quotation_requests` with no restriction on which `quotation_status` values can be written. Migration 060 added a `WITH CHECK` confirming that the updater remains a `sales_coordinator`, but did not introduce any status-transition allowlist.

A coordinator could therefore bypass the formal quotation governance flow by directly calling the Supabase REST API:

```
PATCH /rest/v1/quotation_requests?id=eq.<id>
{ "quotation_status": "converted_to_so" }
```

This bypasses:

1. The formal SO conversion workflow (`convert_quotation_to_so()` / `link_quotation_to_project()`) — SECURITY DEFINER functions that check status, create the project atomically, and require the caller to be `admin`, `operations_manager`, or `sales_user`.
2. The admin/operations_manager authorization required for `cancelled` and `closed_lost` (commercial deal-disposition decisions).
3. The hot project conversion workflow for `converted_to_hot_project`.

---

## 2. Current Gap

**Policy before this migration (from migration 060):**

```sql
CREATE POLICY qr_coordinator_update ON public.quotation_requests
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );
```

The `WITH CHECK` only confirms the caller is still a `sales_coordinator`. There is no restriction on `NEW.quotation_status`. A coordinator can set `quotation_status` to any value in the enum.

**Classification:** Step 6B Class-B gap / Step 6E mandatory Step 7 pre-work item.

---

## 3. Tables and Policies Inspected

| Object | Migration | Notes |
|--------|-----------|-------|
| `quotation_requests` table | 015 | Schema, status enum, triggers, indexes |
| `qr_admin_all` policy | 015 | FOR ALL — admin + operations_manager |
| `qr_sales_select` policy | 015 | SELECT — own rows only |
| `qr_sales_insert` policy | 015 | INSERT — sales_user |
| `qr_sales_update` policy | 060 | UPDATE — own rows, status IN ('draft', 'need_clarification') only |
| `qr_coordinator_select` policy | 015 | SELECT all |
| `qr_coordinator_update` policy | 060 | UPDATE all — **no status restriction (the gap)** |
| `qr_viewer_select` policy | 015 | SELECT non-draft |
| `convert_quotation_to_so()` function | 067 | SECURITY DEFINER; requires returned_to_sales; admin/ops/sales only |
| `link_quotation_to_project()` function | 071, 073 | SECURITY DEFINER; same guards; atomic project linkage |
| `QuotationDetail.tsx` | src/pages | UI coordinator actions and status transitions used |
| `SalesCoordinator.tsx` | src/pages | Coordinator workspace view |

---

## 4. Status Values Discovered

From `CREATE TYPE quotation_status AS ENUM` in migration 015:

| Value | Stage | Who Sets It |
|-------|-------|-------------|
| `draft` | Pre-submission | sales_user (INSERT default) |
| `submitted_by_sales` | Submission | sales_user |
| `received_by_coordinator` | Coordinator intake | sales_coordinator |
| `sent_to_estimation` | Coordinator → Estimation (legacy path) | sales_coordinator |
| `waiting_for_estimation` | Coordinator → Estimation (current path) | sales_coordinator |
| `need_clarification` | Coordinator returns for info | sales_coordinator |
| `quotation_received` | Estimation values entered | sales_coordinator |
| `returned_to_sales` | Response complete | sales_coordinator |
| `converted_to_hot_project` | Conversion to hot pipeline | admin / operations_manager |
| `converted_to_so` | SO registered | SECURITY DEFINER function (convert_quotation_to_so / link_quotation_to_project) |
| `cancelled` | Cancelled | admin / operations_manager |
| `closed_lost` | Deal lost | admin / operations_manager |

---

## 5. Allowed Transition Matrix

### sales_coordinator Allowed Transitions (after this migration)

| FROM | TO | Action | UI Handler |
|------|----|--------|-----------|
| `submitted_by_sales` | `received_by_coordinator` | Mark Received | `handleMarkReceived` |
| `submitted_by_sales` | `waiting_for_estimation` | Send to Estimation | `handleSentToEstimation` |
| `received_by_coordinator` | `waiting_for_estimation` | Send to Estimation | `handleSentToEstimation` |
| `submitted_by_sales` | `sent_to_estimation` | Legacy/alternate path | — |
| `received_by_coordinator` | `sent_to_estimation` | Legacy/alternate path | — |
| any non-terminal | `need_clarification` | Request Clarification | `handleRequestClarification` |
| any non-terminal | `quotation_received` | Save Values | `handleSaveLineValues` |
| `quotation_received` | `returned_to_sales` | Return to Sales | `handleReturnToSales` |
| any | same (unchanged) | Non-status update | remarks, coordinator_remarks, etc. |

### admin / operations_manager Transitions

Unrestricted — may set any status value. Admins can cancel, close as lost, or perform any disposition.

### sales_user Direct Transitions

Restricted by `qr_sales_update` USING clause (`quotation_status IN ('draft', 'need_clarification')`):
- `draft` → `submitted_by_sales`
- `need_clarification` → `submitted_by_sales` (re-submission)

The `returned_to_sales → converted_to_so` transition for sales_user goes through `convert_quotation_to_so()` or `link_quotation_to_project()` (SECURITY DEFINER functions), which bypass RLS but fire this trigger under the original caller's identity. Since the trigger only restricts `sales_coordinator`, this path is unaffected.

---

## 6. Forbidden Transition Matrix

### Blocked for sales_coordinator (migration 086)

| Target Status | Why Blocked |
|--------------|-------------|
| `converted_to_so` | Must go through `convert_quotation_to_so()` / `link_quotation_to_project()`. These functions verify `status = 'returned_to_sales'`, create the project atomically, and require the caller to be `admin`/`operations_manager`/`sales_user`. Coordinator is explicitly excluded from calling these functions. |
| `cancelled` | Commercial decision requiring admin or operations_manager authorization. Coordinator must not unilaterally cancel a live quotation. |
| `closed_lost` | Deal-disposition decision. Must be recorded by admin/ops after commercial review. |
| `converted_to_hot_project` | Hot Project conversion requires admin/ops or the formal hot project creation workflow. |

---

## 7. Migration Created

**File:** `supabase/migrations/086_quotation_status_transition_guard.sql`

### Core Logic

```sql
CREATE OR REPLACE FUNCTION public.enforce_quotation_status_transitions()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Pass-through: quotation_status is not changing
  IF NEW.quotation_status IS NOT DISTINCT FROM OLD.quotation_status THEN
    RETURN NEW;
  END IF;

  v_role := public.current_user_role();

  -- admin / operations_manager: unrestricted
  IF v_role IN ('admin', 'operations_manager') THEN
    RETURN NEW;
  END IF;

  -- sales_coordinator: block the four forbidden terminal / conversion statuses
  IF v_role = 'sales_coordinator'
     AND NEW.quotation_status IN (
       'converted_to_so', 'cancelled', 'closed_lost', 'converted_to_hot_project'
     )
  THEN
    RAISE EXCEPTION
      'Governance violation: sales_coordinator may not directly set '
      'quotation_status = ''%''. % requires admin or operations_manager '
      'authorization (or the formal SO conversion workflow for converted_to_so).',
      NEW.quotation_status,
      CASE NEW.quotation_status
        WHEN 'converted_to_so'          THEN 'SO conversion'
        WHEN 'cancelled'                THEN 'Cancellation'
        WHEN 'closed_lost'              THEN 'Closed Lost deal disposition'
        WHEN 'converted_to_hot_project' THEN 'Hot Project conversion'
        ELSE                                 'This status transition'
      END
      USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotation_status_transition_guard ON public.quotation_requests;
CREATE TRIGGER trg_quotation_status_transition_guard
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quotation_status_transitions();
```

### Design Notes

- **BEFORE UPDATE** (not AFTER): blocks the write before it occurs; consistent with all other trigger guards in this codebase (migrations 061, 084, 085).
- **SECURITY DEFINER SET search_path = public**: consistent with all Step 6D trigger functions. Ensures `public.current_user_role()` is accessible; `auth.uid()` returns the original caller's UID even when called from a SECURITY DEFINER context (e.g., `convert_quotation_to_so()`).
- **IS NOT DISTINCT FROM** for NULL-safe comparison: prevents false positives when quotation_status is NULL (should not occur given the NOT NULL default, but safe regardless).
- **`current_user_role()` not `user_roles` EXISTS pattern**: uses the established SECURITY DEFINER helper from migration 061 onward (cosmetically consistent with Step 6D migrations).
- **Narrowest safe guard**: only blocks the specific statuses identified as forbidden. Does not add further restrictions on legitimate coordinator workflows.

---

## 8. Trigger / Policy Logic Summary

```
BEFORE UPDATE on quotation_requests
  ├─ quotation_status unchanged?  → PASS (non-status updates always allowed)
  ├─ role = admin or ops_manager? → PASS (unrestricted)
  ├─ role = sales_coordinator?
  │   ├─ new status in forbidden set? → RAISE EXCEPTION P0001
  │   └─ otherwise                  → PASS
  └─ any other role              → PASS (RLS handles their restrictions)
```

**No RLS policies are modified.** The trigger is a belt-and-suspenders guard on top of the existing `qr_coordinator_update` policy, following the same pattern as migration 061 (`trg_enforce_po_approval_authority`).

---

## 9. Role Impact

| Role | Impact |
|------|--------|
| `admin` | None — unrestricted as before |
| `operations_manager` | None — unrestricted as before |
| `sales_coordinator` | Direct write to `converted_to_so`, `cancelled`, `closed_lost`, `converted_to_hot_project` is now blocked. All coordinator UI actions (mark received, send to estimation, need clarification, save values, return to sales) are unaffected. |
| `sales_user` | None — their direct UPDATE path is already restricted by RLS; the SO conversion SECURITY DEFINER function path is unaffected. |
| `viewer` | None — no UPDATE policy. |
| All other roles | None — no UPDATE policy on `quotation_requests`. |

---

## 10. Manual Test Scenarios

All tests should be performed via direct Supabase REST/SDK calls (not through the UI) to confirm the DB-level guard.

### Test A — Coordinator cannot directly set converted_to_so

```typescript
// Authenticated as sales_coordinator
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'converted_to_so' })
  .eq('id', someQuotationId);

// Expected: error.code = 'P0001'
// Expected: error.message includes 'Governance violation'
// Expected: error.message includes 'converted_to_so'
```

### Test B — Coordinator cannot directly set cancelled

```typescript
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'cancelled' })
  .eq('id', someQuotationId);

// Expected: error.code = 'P0001'
// Expected: error.message includes 'Cancellation'
```

### Test C — Coordinator cannot directly set closed_lost

```typescript
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'closed_lost' })
  .eq('id', someQuotationId);

// Expected: error.code = 'P0001'
```

### Test D — Non-status update is not blocked

```typescript
// Authenticated as sales_coordinator
// quotation_status unchanged
const { error } = await supabase
  .from('quotation_requests')
  .update({ coordinator_remarks: 'Updated remarks', estimation_contact: 'estimator@example.com' })
  .eq('id', someQuotationId);

// Expected: error = null; update succeeds
```

### Test E — Valid coordinator status transitions still work

```typescript
// Authenticated as sales_coordinator, quotation in 'submitted_by_sales'
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'received_by_coordinator' })
  .eq('id', someQuotationId);
// Expected: error = null

const { error: error2 } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'need_clarification', coordinator_remarks: 'Please provide spec file.' })
  .eq('id', someQuotationId);
// Expected: error2 = null

const { error: error3 } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'returned_to_sales', returned_to_sales_at: new Date().toISOString() })
  .eq('id', someQuotationId);
// Expected: error3 = null
```

### Test F — Admin/ops_manager can set any status

```typescript
// Authenticated as admin
const { error } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'cancelled' })
  .eq('id', someQuotationId);
// Expected: error = null

const { error: e2 } = await supabase
  .from('quotation_requests')
  .update({ quotation_status: 'closed_lost' })
  .eq('id', someQuotationId);
// Expected: e2 = null
```

### Test G — SO conversion through formal function is not broken

```typescript
// Authenticated as sales_user (quotation must be in 'returned_to_sales')
const { data, error } = await supabase
  .rpc('convert_quotation_to_so', { p_quotation_id: someQuotationId });

// Expected: error = null; data returns project_id, project_code, so_number
// quotation_status is now 'converted_to_so' (set by SECURITY DEFINER function)
```

---

## 11. Rollback Notes

To revert migration 086:

```sql
-- Step 1: Remove the trigger
DROP TRIGGER IF EXISTS trg_quotation_status_transition_guard ON public.quotation_requests;

-- Step 2: Remove the function
DROP FUNCTION IF EXISTS public.enforce_quotation_status_transitions();
```

No data is affected. No RLS policies are changed. No schema is modified. The rollback is safe and instantaneous.

---

## 12. Known Assumptions

1. **`public.current_user_role()` is the canonical role resolver.** The function (SECURITY DEFINER, established in migration 061) reads `user_roles.role` for `auth.uid()`. This is the same pattern used in all Step 6D triggers.

2. **Coordinator cannot call the SECURITY DEFINER conversion functions.** `convert_quotation_to_so()` and `link_quotation_to_project()` both explicitly check `v_role NOT IN ('admin', 'operations_manager', 'sales_user')` and raise exception for coordinator. The trigger's `converted_to_so` block is defense-in-depth against direct UPDATE only.

3. **`sent_to_estimation` and `waiting_for_estimation` are both valid coordinator targets.** The enum has both; the UI currently uses `waiting_for_estimation`. Both are allowed by this trigger (not in the forbidden list).

4. **No existing live coordinator records have been manually set to the forbidden statuses.** If any exist, they would still be readable and would not be retroactively affected (triggers only fire on new UPDATE operations).

5. **admin and operations_manager cancel/close paths are intentional.** Only admin/ops can set `cancelled` and `closed_lost`. If a future business process requires coordinator to cancel (e.g., with an explicit reason recorded), this trigger must be updated to add a condition (e.g., `cancellation_reason IS NOT NULL`).

---

## 13. Known Limitations

1. **No transition guard on `sales_user` direct updates.** `qr_sales_update` already restricts sales_user to `status IN ('draft', 'need_clarification')` rows, so they cannot reach terminal statuses via direct UPDATE. No additional trigger logic was added for sales_user in this migration.

2. **`cancelled` is blocked for coordinator but there is no DB-enforced cancellation workflow for admin/ops yet.** This migration blocks the unauthorized path; the authorized path (admin cancellation with reason) is UI-only at present. A future migration can add a cancellation reason requirement.

3. **No transition FROM terminal statuses is blocked.** An admin can re-open a `cancelled` quotation by setting it back to `draft` or any other status. This is intentional (admin privilege) but should be considered when implementing the quotation lifecycle audit trail.

4. **`converted_to_hot_project` has no formal creation function yet.** Migration 068 added the `hot_projects` table but no SECURITY DEFINER function for converting a quotation to a hot project was found. The coordinator block for this status is pre-emptive — when the hot project conversion flow is implemented, it must be a SECURITY DEFINER function or require admin/ops direct update.

5. **Policy pattern inconsistency (cosmetic).** `qr_coordinator_update` (migration 060) uses `EXISTS (SELECT 1 FROM user_roles ...)` while this trigger uses `public.current_user_role()`. Both are functionally equivalent. The inconsistency is a known Step 6E deferred item (D5) and does not affect security.

---

## 14. Confirmation: No App Code Changed

- No TypeScript/TSX files modified.
- No `src/` files modified.
- No `package.json` modified.
- No Supabase Edge Functions created or modified.
- No existing migration files modified.
- The only file created in `supabase/migrations/` is `086_quotation_status_transition_guard.sql`.

---

## 15. Recommended Step 7B

Step 7B should begin implementing the full Quotation Coordinator workflow as a connected feature. Suggested scope:

```
Task title: Step 7B — Quotation Coordinator Workflow Implementation

Context:
Step 7A added the quotation status transition guard (migration 086).
The coordinator can now not bypass the SO conversion or cancellation governance.
Step 7B implements the working UI and data flow for the coordinator review flow.

Create branch: feature/quotation-coordinator-workflow

Read first:
  docs/CLAUDE_PROJECT_RULES.md
  docs/implementation/step-7a-quotation-status-transition-guard.md
  docs/governance/playbook-to-system-mapping.md (Module 5 + Module 6)
  docs/governance/critical-governance-rules-register.md (R-001, R-002)
  supabase/migrations/015_quotations.sql
  supabase/migrations/016_quotation_lines.sql
  supabase/migrations/017_quotation_documents.sql
  supabase/migrations/086_quotation_status_transition_guard.sql
  src/pages/SalesCoordinator.tsx
  src/pages/QuotationDetail.tsx
  src/pages/QuotationNew.tsx

Scope:
  Part 1 — R-001: Quotation Spec File Gate (Backlog B-008)
    DB trigger blocking status = 'submitted_by_sales' when no spec file
    exists in quotation_documents for the quotation.

  Part 2 — R-002: Coordinator Return Gate (Backlog B-009)
    DB trigger blocking status = 'returned_to_sales' when:
    (a) quotation_number IS NULL, or
    (b) quotation_total_value IS NULL or 0, or
    (c) no quotation_pdf document exists in quotation_documents.

  Part 3 — Wire SalesCoordinator.tsx to live data
    Replace mockOrEmpty() patterns with live Supabase queries.
    Filter: quotation_status NOT IN terminal statuses.

  Part 4 — Wire QuotationDetail.tsx coordinator actions to live Supabase
    Verify all coordinator status-change calls succeed against migration 086.

Important:
  Do not broaden any RLS policy.
  Do not modify Step 6 migrations.
  Do not implement SO registration (Step 7C).
  Do not implement SLA escalation (Step 10).
```

---

## 16. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/security/step-6b-rls-hardening-evidence-review.md` | Step 6B: Original gap identification (§3.10) |
| `docs/security/step-6e-rls-final-gap-review.md` | Step 6E: Gap confirmed as mandatory Step 7 pre-work (§4.2) |
| `docs/governance/critical-governance-rules-register.md` | R-001, R-002 — quotation spec file and return gates |
| `supabase/migrations/015_quotations.sql` | Original quotation schema and RLS policies |
| `supabase/migrations/060_cost_protection.sql` | Updated coordinator and sales_user policies |
| `supabase/migrations/067_convert_quotation_to_so.sql` | SO conversion SECURITY DEFINER function |
| `supabase/migrations/071_link_quotation_to_project.sql` | Project linkage SECURITY DEFINER function |
| `supabase/migrations/073_sales_order_creation_final_fix.sql` | Final link_quotation_to_project revision |
| `supabase/migrations/086_quotation_status_transition_guard.sql` | This migration |
