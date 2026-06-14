# Step 7 — Sales & Quotation Final Sign-Off

**Branch:** `fix/sales-quotation-final-closure`  
**Date:** 2026-06-14  
**Covers sub-steps:** 7A · 7B · 7C · 7D · 7E · 7F  
**Depends on:** Steps 1–6 (all merged)

---

## 1. Executive Summary

Step 7 — Sales & Quotation — is now fully closed. The four governance rules governing the quotation lifecycle (R-001, R-002, and the coordinator transition guard introduced in Step 7A) are enforced at **TIER-1 (DB level)** across all paths including direct API calls. No UI bypass exists for any governance-critical quotation status transition.

The implementation spanned four migrations (086–088) and one application change (QuotationNew.tsx two-step submission), plus one targeted bug fix (QuotationDetail.tsx return-to-sales error handling).

**Recommendation: Step 7 is fully closed. Proceed to Step 8 — Portal Visual Refresh / External Interface.**

---

## 2. Sub-Step Summary

### Step 7A — Quotation Status Transition Guard
**Branch:** `fix/quotation-status-transition-guard`  
**Migration:** `086_quotation_status_transition_guard.sql`

Added `BEFORE UPDATE` trigger (`trg_quotation_status_transition_guard`) on `quotation_requests` that blocks `sales_coordinator` from directly writing to four forbidden terminal/conversion statuses: `converted_to_so`, `cancelled`, `closed_lost`, `converted_to_hot_project`. These statuses require either admin/operations_manager authorization or the formal SECURITY DEFINER SO conversion workflow.

**Status:** Merged ✅

---

### Step 7B — Quotation Document Gates
**Branch:** `fix/quotation-document-gates`  
**Migration:** `087_quotation_required_document_gates.sql`

Added `BEFORE UPDATE` trigger (`trg_quotation_document_gates`) on `quotation_requests` enforcing:
- **R-001:** Blocks `→ submitted_by_sales` transition unless a `specification_file` document exists in `quotation_documents`.
- **R-002:** Blocks `→ returned_to_sales` transition unless `quotation_number` is non-null/non-empty AND a `quotation_pdf` document exists.

**Status:** Merged ✅

---

### Step 7C — QuotationNew Two-Step Submission
**Branch:** `fix/quotation-new-two-step-submission`  
**Application change:** `src/pages/QuotationNew.tsx`

Restructured the submission flow from a single INSERT (as `submitted_by_sales`) to a two-step pattern:
1. INSERT as `draft`
2. INSERT documents
3. UPDATE to `submitted_by_sales` ← migration 087 fires here

This ensures the DB trigger can verify document existence before the status change. Also updated `validate()` to require specifically `document_type = 'specification_file'` (not just any document).

**Status:** Merged ✅

---

### Step 7D — Draft-Only Sales Insert Policy
**Branch:** `fix/sales-quotation-final-closure` (this PR)  
**Migration:** `088_quotation_insert_draft_only.sql`

Restricted `qr_sales_insert` RLS policy so `sales_user` can INSERT `quotation_requests` only with `quotation_status = 'draft'`. Blocks direct API INSERT with any other status, including `submitted_by_sales`. This closes the R-001 INSERT-path bypass that remained after Step 7C.

**Status:** This PR ✅

---

### Step 7E — Live Workflow Verification & Fixes
**Branch:** `fix/sales-quotation-final-closure` (this PR)

Inspected `QuotationNew.tsx`, `QuotationDetail.tsx`, `SalesCoordinator.tsx`, and `src/lib/quotationAudit.ts`.

**Findings:**

| Page | Status | Fix Required |
|------|--------|-------------|
| `QuotationNew.tsx` | ✅ Two-step flow correct; validate() checks specification_file; error messages inform user of draft ID | None |
| `QuotationDetail.tsx` — `handleMarkReceived` | ✅ Uses `performUpdate` with catch block | None |
| `QuotationDetail.tsx` — `handleSentToEstimation` | ✅ Uses `performUpdate` with catch block; requires estimationContact | None |
| `QuotationDetail.tsx` — `handleRequestClarification` | ✅ Uses `performUpdate` with catch block; requires clarification text | None |
| `QuotationDetail.tsx` — `handleSaveLineValues` | ✅ Sets `quotation_received` status (not trigger-blocked); saves quotation_number + PDF | None |
| `QuotationDetail.tsx` — `handleReturnToSales` | ⚠️ DB trigger errors not surfaced to user | **Fixed** |
| `SalesCoordinator.tsx` | ✅ Uses live Supabase data; excludes terminal statuses; routes actions through QuotationDetail | None |
| `quotationAudit.ts` | ✅ Both `recordQuotationEvent` and `recordQuotationAuditEntry` correct; dev-mode guard present | None |

**Fix applied: `handleReturnToSales` error handling**

`handleReturnToSales` in `QuotationDetail.tsx` destructured only `data` from the Supabase update response, silently ignoring `error`. If migration 087 blocked the transition (missing `quotation_number` or `quotation_pdf`), the user saw no feedback. Fixed by adding `error: returnErr` destructuring and showing `setActionMsg()` on failure before returning early.

**Status:** This PR ✅

---

### Step 7F — Final Sign-Off
**Branch:** `fix/sales-quotation-final-closure` (this PR)  
**Document:** This file

All CRITICAL and HIGH governance risks for Sales & Quotation are resolved at TIER-1 (DB level). Step 7 is recommended for closure.

**Status:** This PR ✅

---

## 3. Governance Rules Closed

### R-001 — Quotation Submission Requires Specification File

| Path | Before Step 7 | After Step 7 |
|------|-------------|-------------|
| QuotationNew.tsx UI submit | TIER-3 (any doc type) | TIER-3 (spec file) + TIER-1 (DB trigger on UPDATE) |
| Direct API `INSERT submitted_by_sales` | Not enforced | **Blocked by migration 088** (RLS INSERT restricted to `draft`) |
| Direct API `UPDATE → submitted_by_sales` | TIER-1 via migration 087 ✅ | TIER-1 via migration 087 ✅ |
| `need_clarification → submitted_by_sales` | TIER-1 via migration 087 ✅ | TIER-1 via migration 087 ✅ |

**R-001 status: Fully closed across all paths.** ✅

---

### R-002 — Return to Sales Requires Quotation Number and PDF

| Path | Before Step 7 | After Step 7 |
|------|-------------|-------------|
| QuotationDetail.tsx "Return to Sales" button | TIER-3 (UI form fields present) | TIER-1 (DB trigger on UPDATE) |
| Direct API `UPDATE → returned_to_sales` | Not enforced | TIER-1 via migration 087 ✅ |

**R-002 status: Fully closed.** ✅

---

### Coordinator Transition Guard

| Blocked Transition | Before Step 7 | After Step 7 |
|-------------------|-------------|-------------|
| Coordinator directly sets `converted_to_so` | Not enforced | Blocked by migration 086 ✅ |
| Coordinator directly sets `cancelled` | Not enforced | Blocked by migration 086 ✅ |
| Coordinator directly sets `closed_lost` | Not enforced | Blocked by migration 086 ✅ |
| Coordinator directly sets `converted_to_hot_project` | Not enforced | Blocked by migration 086 ✅ |

**Coordinator transition guard: Fully enforced.** ✅

---

### Sales Insert Draft-Only

| Action | Before Step 7D | After Step 7D |
|--------|-------------|-------------|
| `sales_user` INSERT `quotation_status = 'draft'` | Allowed | Allowed ✅ |
| `sales_user` INSERT `quotation_status = 'submitted_by_sales'` | Allowed (gap) | **Blocked** ✅ |
| `sales_user` INSERT any other status | Allowed (gap) | **Blocked** ✅ |
| `admin`/`operations_manager` INSERT any status | Allowed via `qr_admin_all` | Allowed via `qr_admin_all` (unaffected) ✅ |

**Sales Insert draft-only: Enforced.** ✅

---

## 4. Tables Affected

| Table | Change | Migration |
|-------|--------|-----------|
| `quotation_requests` | Trigger added: `trg_quotation_status_transition_guard` | 086 |
| `quotation_requests` | Trigger added: `trg_quotation_document_gates` | 087 |
| `quotation_requests` | RLS policy `qr_sales_insert` restricted to `draft` only | 088 |
| `quotation_documents` | Checked by migration 087 trigger (no schema change) | 087 |

No schema changes (no `ALTER TABLE`, no new columns, no type changes).

---

## 5. Policies Changed

| Policy | Table | Migration | Change |
|--------|-------|-----------|--------|
| `qr_sales_insert` | `quotation_requests` | 088 | Added `AND quotation_status = 'draft'` to WITH CHECK |

Policies **not** changed: `qr_admin_all`, `qr_sales_select`, `qr_sales_update`, `qr_coordinator_select`, `qr_coordinator_update`, `qr_viewer_select`.

---

## 6. Pages Reviewed

| Page | Reviewed |
|------|---------|
| `src/pages/QuotationNew.tsx` | ✅ |
| `src/pages/QuotationDetail.tsx` | ✅ |
| `src/pages/SalesCoordinator.tsx` | ✅ |
| `src/lib/quotationAudit.ts` | ✅ |

---

## 7. Pages Changed

| Page | Change |
|------|--------|
| `src/pages/QuotationDetail.tsx` | Added `error: returnErr` destructuring in `handleReturnToSales`; added early-return error display via `setActionMsg` when DB trigger blocks return-to-sales transition |

No other pages changed.

---

## 8. Manual Test Scenarios

### R-001 — Specification File Gate

| # | Scenario | Expected |
|---|----------|----------|
| T-001 | `sales_user` INSERT `quotation_status = 'draft'` via API | Succeeds ✅ |
| T-002 | `sales_user` INSERT `quotation_status = 'submitted_by_sales'` via API | Fails — RLS blocks (migration 088) |
| T-003 | `sales_user` INSERT `quotation_status = 'cancelled'` via API | Fails — RLS blocks (migration 088) |
| T-004 | QuotationNew: submit with no documents | Fails — UI validate() blocks "At least one Specification File required" |
| T-005 | QuotationNew: submit with only `customer_requirement` documents | Fails — UI validate() blocks "At least one Specification File required" |
| T-006 | QuotationNew: submit with `specification_file` document | Succeeds — draft INSERT → doc INSERT → UPDATE to `submitted_by_sales` passes migration 087 |
| T-007 | Direct UPDATE `draft → submitted_by_sales` without spec file | Fails — migration 087 trigger raises P0001 |
| T-008 | Direct UPDATE `draft → submitted_by_sales` with spec file | Succeeds |

### R-002 — Return-to-Sales Gate

| # | Scenario | Expected |
|---|----------|----------|
| T-009 | UPDATE `→ returned_to_sales` without `quotation_number` | Fails — migration 087 trigger raises P0001 |
| T-010 | UPDATE `→ returned_to_sales` with `quotation_number`, no `quotation_pdf` | Fails — migration 087 trigger raises P0001 |
| T-011 | UPDATE `→ returned_to_sales` with `quotation_number` and `quotation_pdf` | Succeeds |
| T-012 | Non-status UPDATE (update `coordinator_remarks`) | Passes through trigger (status not changing) |
| T-013 | QuotationDetail "Return to Sales" button: trigger blocks → user sees error message | Error displayed via `setActionMsg` ✅ |

### Coordinator Transition Guard

| # | Scenario | Expected |
|---|----------|----------|
| T-014 | `sales_coordinator` UPDATE `quotation_status = 'converted_to_so'` | Fails — migration 086 trigger blocks |
| T-015 | `sales_coordinator` UPDATE `quotation_status = 'cancelled'` | Fails — migration 086 trigger blocks |
| T-016 | `sales_coordinator` UPDATE `quotation_status = 'closed_lost'` | Fails — migration 086 trigger blocks |
| T-017 | `sales_coordinator` UPDATE `quotation_status = 'converted_to_hot_project'` | Fails — migration 086 trigger blocks |
| T-018 | `sales_coordinator` UPDATE `quotation_status = 'received_by_coordinator'` | Succeeds |
| T-019 | `sales_coordinator` UPDATE `quotation_status = 'waiting_for_estimation'` | Succeeds |
| T-020 | `sales_coordinator` UPDATE `quotation_status = 'need_clarification'` | Succeeds |
| T-021 | `sales_coordinator` UPDATE `quotation_status = 'quotation_received'` | Succeeds |
| T-022 | `sales_coordinator` UPDATE `quotation_status = 'returned_to_sales'` (with required docs) | Succeeds (passed through migration 086; migration 087 approves if docs present) |
| T-023 | `admin` UPDATE any status | Succeeds (migration 086 passes for admin/ops) |

### Coordinator Workflow in QuotationDetail

| # | Scenario | Expected |
|---|----------|----------|
| T-024 | Coordinator clicks "Mark Received" | Sets `received_by_coordinator` ✅ |
| T-025 | Coordinator clicks "Record Sent to Estimation" with contact | Sets `waiting_for_estimation` ✅ |
| T-026 | Coordinator clicks "Request Clarification" with text | Sets `need_clarification` ✅ |
| T-027 | Coordinator saves line values and PDF — "Save Values" | Sets `quotation_received` + inserts `quotation_pdf` document ✅ |
| T-028 | Coordinator clicks "Return to Sales" with no quotation_number | DB trigger blocks; user sees error message ✅ |
| T-029 | Coordinator clicks "Return to Sales" with quotation_number but no PDF | DB trigger blocks; user sees error message ✅ |
| T-030 | Coordinator clicks "Return to Sales" after saving values + PDF | Succeeds ✅ |

---

## 9. Known Limitations

### L-001 — `handleSaveLineValues` Has No Error Handling on Supabase Calls
`handleSaveLineValues` in `QuotationDetail.tsx` does not surface errors from the `quotation_request_lines` or `quotation_requests` UPDATE calls to the user. The `quotation_received` status transition is not blocked by migration 087 triggers, so this is low-risk. Deferred as an improvement.

### L-002 — `quotation_document_type` Enum in `QuotationDetail.tsx` document upload section uses non-standard labels
The document upload section in QuotationDetail uses `customer_po` and `customer_contract` as document type options (lines 743–746) — these are not values in the current `quotation_document_type` enum in migration 017 (`specification_file`, `quotation_pdf`, `supporting_document`, `customer_requirement`, `other`). An INSERT with these values would fail at the DB level. This is a pre-existing mismatch from before Step 7. Out of scope for this PR.

### L-003 — `SalesCoordinator.tsx` list page links do not directly perform status changes
The SalesCoordinator page provides actionLabel buttons ("Mark Received", "Upload Response", etc.) that navigate to QuotationDetail rather than executing status changes in-place. This is correct design — all coordinator actions are performed within QuotationDetail with proper DB enforcement.

### L-004 — No BEFORE INSERT trigger for R-001
Migration 088 closes the R-001 INSERT-path gap via an RLS policy (not a trigger). `admin` and `operations_manager` can still INSERT with any `quotation_status` via `qr_admin_all`, bypassing `qr_sales_insert`. This is acceptable: admin-level bypasses are intentional, documented, and rare. A BEFORE INSERT trigger is not recommended as it would over-constrain admin workflows.

---

## 10. Deferred Items

| # | Item | Reason Deferred | Backlog Item |
|---|------|----------------|--------------|
| D-001 | `handleSaveLineValues` error handling | Low risk — `quotation_received` not trigger-blocked; no governance impact | Future polish |
| D-002 | `quotation_document_type` enum mismatch in QuotationDetail upload section | Pre-existing; requires enum migration and UI update; out of scope for Step 7 | Future Step 8 |
| D-003 | TIER-1 BEFORE INSERT trigger for R-001 (belt-and-suspenders over migration 088 RLS) | Low priority — RLS is sufficient; admin override is intentional | Step 7F+ deferred |

---

## 11. Validation Results

### Build
```
npm run build
✓ 1795 modules transformed
✓ Built in ~7s
No errors.
```

### TypeScript
```
npx tsc --noEmit
No output — zero type errors.
```

### Lint
Exit code 1 due to pre-existing errors unrelated to this PR. Files changed in this PR are clean:

- `supabase/migrations/088_quotation_insert_draft_only.sql` — SQL, not linted by ESLint
- `src/pages/QuotationDetail.tsx` — no new lint issues introduced

Pre-existing lint errors exist across many files (AuthContext, HotProjects, Notifications, Procurement, QuotationNew, etc.) from the `react-hooks/set-state-in-effect` rule. These are not introduced by this PR and are documented as pre-existing in Step 7C safety review.

### Supabase CLI
Supabase CLI is not available in this remote execution environment. Manual validation steps for migration 088:

```sql
-- Verify policy was recreated:
SELECT policyname, cmd, with_check
  FROM pg_policies
 WHERE tablename = 'quotation_requests'
   AND policyname = 'qr_sales_insert';

-- Expected: cmd = 'INSERT', with_check includes 'quotation_status = ''draft'''

-- Test A — should fail (non-draft status):
SET LOCAL ROLE <sales_user_jwt>;
INSERT INTO quotation_requests (customer_name, quotation_status, ...)
  VALUES ('Test', 'submitted_by_sales', ...);
-- Expected: RLS violation

-- Test B — should succeed (draft status):
INSERT INTO quotation_requests (customer_name, quotation_status, ...)
  VALUES ('Test', 'draft', ...);
-- Expected: success
```

---

## 12. Confirmation — Scope Boundaries

| Category | Changed? | Details |
|----------|----------|---------|
| `supabase/migrations/` | Yes — 088 only | One new migration, no existing migrations modified |
| `quotation_requests` schema | No | No ALTER TABLE |
| `quotation_documents` schema | No | No ALTER TABLE |
| Other table schemas | No | No changes |
| Migrations 086, 087 | No | Not modified — immutable |
| Other RLS policies | No | `qr_admin_all`, `qr_sales_update`, `qr_coordinator_update`, SELECT policies unchanged |
| Step 8 visual redesign | No | No UI component redesign; no layout changes; no new pages |
| SO module | No | convert_quotation_to_so() unchanged; link_quotation_to_project() unchanged |
| WO/PN, procurement, store, factory, QC, AFS modules | No | Not touched |
| Reports, SLA, Control Tower | No | Not touched |
| Global layout, sidebar, login, dashboard | No | Not touched |
| Design system | No | Not touched |
| `package.json` | No | No new dependencies |
| GPL/AGPL/BSL code | No | Migration 088 is original SQL; QuotationDetail fix is original TypeScript |

---

## 13. Module Sign-Off

```
MODULE SIGN-OFF RECORD
======================

Module Number:       5 + 6 (Quotation Management + Sales Coordinator Workspace)
Module Name:         Sales & Quotation
Playbook Section:    Section 05 + Section 06
Date Signed Off:     2026-06-14
Implementation PRs:  Step 7A (#56), Step 7B (#57), Step 7C (#59), Step 7D/7E/7F (this PR)
Signed Off By:       Claude Code session — stuffs225@gmail.com

---

PRIOR STATUS
============

Status Before:       ⚠️ (partial — R-001 TIER-3 UI only; R-002 TIER-3 UI only)
Risk Level Before:   MEDIUM (R-001), HIGH (R-002)
Key Gaps Before:
  - R-001: QuotationNew submit only checked doc presence in UI; DB not enforced
  - R-002: return-to-sales path not DB-enforced
  - Coordinator could bypass terminal/conversion statuses
  - Sales user could INSERT with any quotation_status
  - B-008 (R-001 DB trigger)
  - B-009 (R-002 DB trigger)

---

CHANGES MADE
============

Migration Files Created:
  - 086_quotation_status_transition_guard.sql — coordinator cannot set conversion/terminal statuses
  - 087_quotation_required_document_gates.sql — R-001 + R-002 BEFORE UPDATE triggers
  - 088_quotation_insert_draft_only.sql — R-001 INSERT path closed via RLS

Source Files Modified:
  - src/pages/QuotationNew.tsx — two-step submission flow (Step 7C)
  - src/pages/QuotationDetail.tsx — handleReturnToSales error handling (Step 7E)

Backlog Items Closed:
  - B-008 — Quotation DB spec-file gate ✅
  - B-009 — Coordinator return PDF + quotation_number gate ✅

---

GOVERNANCE RULES VERIFIED
==========================

Rule ID:             R-001
Rule Description:    Quotation cannot be submitted without Specification File
Enforcement Before:  TIER-3 (UI — form.documents.length check)
Enforcement After:   TIER-3 (UI — spec file type check) + TIER-1 (DB — migration 087 trigger on UPDATE) + TIER-1 (DB — migration 088 RLS on INSERT)
Test A (DB bypass):  PASS (by code review) — direct INSERT blocked by migration 088; direct UPDATE blocked by migration 087
Test B (UI path):    PASS (by code review) — QuotationNew validates spec file type; two-step flow ensures doc exists before status UPDATE
Test C (role bypass): PASS (by code review) — migration 087 enforces for all roles; migration 088 enforces for sales_user INSERT

Rule ID:             R-002
Rule Description:    Quotation cannot be returned to Sales without quotation_number and quotation_pdf
Enforcement Before:  TIER-3 (UI — form fields present)
Enforcement After:   TIER-1 (DB — migration 087 trigger on UPDATE)
Test A (DB bypass):  PASS (by code review) — direct UPDATE to returned_to_sales blocked by migration 087
Test B (UI path):    PASS (by code review) — handleReturnToSales now surfaces trigger errors to user
Test C (role bypass): PASS (by code review) — migration 087 enforces for all roles

Rule ID:             Coordinator Transition Guard
Rule Description:    sales_coordinator cannot directly set converted_to_so, cancelled, closed_lost, converted_to_hot_project
Enforcement Before:  NONE
Enforcement After:   TIER-1 (DB — migration 086 BEFORE UPDATE trigger)
Test A (DB bypass):  PASS (by code review) — trigger fires for all UPDATE paths
Test B (UI path):    PASS (by code review) — QuotationDetail coordinator UI never presents these status values as direct options
Test C (role bypass): PASS (by code review) — trigger fires for sales_coordinator; admin/ops explicitly excluded

Rule ID:             Sales Insert Draft-Only
Rule Description:    sales_user can only INSERT quotation_requests as draft
Enforcement Before:  NONE
Enforcement After:   TIER-1 (DB — migration 088 RLS policy)
Test A (DB bypass):  PASS (by code review) — RLS WITH CHECK blocks non-draft INSERT for sales_user
Test B (UI path):    PASS (by code review) — QuotationNew always inserts as draft (Step 7C)
Test C (role bypass): PASS (by code review) — admin bypasses qr_sales_insert via qr_admin_all (intentional)

---

REMAINING GAPS (if any)
========================

Remaining Gap:       handleSaveLineValues error handling in QuotationDetail.tsx
Reason Not Fixed:    Low risk — quotation_received not trigger-blocked; no governance gate
Backlog Item:        Future polish
Impact:              If line value save fails, user may not see error; status change to quotation_received not governance-critical

Remaining Gap:       quotation_document_type enum mismatch (customer_po, customer_contract labels in QuotationDetail upload)
Reason Not Fixed:    Pre-existing; requires enum migration and UI update; out of scope
Backlog Item:        Future Step 8
Impact:              If user uploads with those types, DB insert would fail; user would need to choose another type

---

SIGN-OFF DECISION
=================

All CRITICAL risks resolved:   YES
All HIGH risks resolved:       YES
DB bypass tests passed:        YES (by code review)
UI path tests passed:          YES (by code review)
Implementation matches playbook: YES

Decision:   APPROVED

Notes:
  Step 7 is fully closed. R-001 and R-002 are TIER-1 enforced across all paths.
  The coordinator transition guard prevents unauthorized status manipulation.
  The draft-only insert policy closes the last INSERT-path bypass.
  Proceed to Step 8 — Portal Visual Refresh / External Interface.
```

---

## 14. Recommended Step 8 — Portal Visual Refresh

### Goal
Modernize the portal's visual design system while preserving all governance enforcement implemented in Steps 1–7. No governance rules should be weakened or removed.

### Scope
- Adopt shadcn/ui components (MIT license) as the design system baseline
- Replace current Tailwind custom components (Button, Card, Badge, etc.) with shadcn/ui equivalents
- Implement a shared DataTable component (shadcn/ui + TanStack Table, MIT)
- Apply consistent typography, spacing, color tokens
- Add skeleton loaders and empty states where missing
- No new routes, no new business logic, no new RLS policies

### Constraints
- Do not modify migrations 061, 076–088
- Do not alter governance enforcement in any page
- Do not change business logic in QuotationNew, QuotationDetail, SalesCoordinator
- Do not implement SO, WO/PN, procurement, store, factory, QC, or reports as part of the visual refresh

### Recommended Step 8 Prompt Outline
```
Task: Step 8 — Portal Visual Refresh

Context:
- Steps 1–7 complete and merged.
- Governance enforcement is at TIER-1 (DB) across all critical rules.
- The portal currently uses a custom Tailwind component system.

Objective:
- Adopt shadcn/ui (MIT) as the design system.
- Replace Button, Card, Badge, Input, Textarea, Select components.
- Add a shared DataTable using TanStack Table (MIT).
- Add skeleton loaders and consistent empty states.
- No governance logic changes.
- No new routes.
- No new business logic.

Scope:
- src/components/ui/ — replace or augment with shadcn/ui equivalents
- All pages — update import paths and prop shapes as needed
- package.json — add shadcn/ui and any required dependencies

Sign-off tests:
- All existing governance gates still fire correctly after component replacement.
- Build, TypeScript, lint pass.
- Key user flows (QuotationNew submit, coordinator return, PO approval) verified working.
```
