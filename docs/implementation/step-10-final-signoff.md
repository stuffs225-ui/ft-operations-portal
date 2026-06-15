# Step 10 — WO / PN Gate Final Sign-off

**Branch:** `feature/step-10c-wo-pn-final-signoff`  
**Date:** 2026-06-15  
**Scope:** Closure of Step 10 (WO / PN Gate) and handoff to Step 11 (Procurement)  
**Depends on:** Steps 1–9 (all merged), Step 10A (merged), Step 10B (merged)

---

## 1. Executive Summary

Step 10 closes the WO / PN execution gate layer of the FT Operations Portal. Three sub-steps were completed:

- **10A** — Read-only audit of the WO/PN gate as inherited from Steps 1–9. Identified 5 gaps (H-001, H-002, H-003, M-001, M-002, M-003).
- **10B** — DB trigger hardening (migration 092), RLS hardening, cancel/supersede UI, remarks timeline event, PageHeader migration.
- **10C** — Integration verification, ProjectDetail WoPnGateCard closure link, and this sign-off document.

After Step 10, governance rules R-005 and R-006 are enforced at TIER-1 (DB) across all three layers:

| Layer | Where | What It Enforces |
|-------|-------|------------------|
| DB CHECK constraint | `project_execution_references` | WO only for Saudi; PN only for Dubai |
| DB partial unique index | `project_execution_references` | Max 1 active reference per (project, type) |
| DB BEFORE INSERT trigger | `project_execution_references` | Cannot create WO/PN before project approval |
| DB BEFORE INSERT trigger | `factory_records` | Saudi project requires active WO (migration 089) |
| DB BEFORE INSERT trigger | `dubai_project_followups` | Dubai project requires active PN (migration 089) |
| DB RLS | `project_execution_references` | factory_user SELECT + INSERT only; no UPDATE/DELETE |
| UI gate | `WoPnGate.tsx`, `WoPnGateCard` | Role-gated add/confirm/cancel/supersede |

---

## 2. Step 10 Sub-Step Summary

### 2A — Step 10A: WO / PN Gate Focused Audit

**Branch:** `feature/step-10a-wo-pn-gate-audit`  
**PR:** #74  
**Output:** `docs/implementation/step-10a-wo-pn-gate-audit.md`  

Read-only review of the WO/PN gate implementation against governance rules R-005 and R-006. No code changes.

**Gaps identified:**

| ID | Severity | Description |
|----|----------|-------------|
| H-001 | HIGH | WO/PN could be created before project approval at DB level |
| H-002 | HIGH | factory_user RLS policy was FOR ALL — could UPDATE status='confirmed' via direct API |
| H-003 | HIGH | No cancel/supersede flow existed — statuses in enum but unreachable through UI |
| M-001 | MEDIUM | Design decision required: WO/PN gate scope (manufacturing_location only vs. routing table) |
| M-002 | MEDIUM | Remarks save wrote audit_log but not project timeline |
| M-003 | MEDIUM | WoPnGate.tsx used legacy PageHeader instead of shared design system component |

### 2B — Step 10B: WO / PN Guardrails and Corrective Actions

**Branch:** `fix/step-10b-wo-pn-guardrails-corrective-actions`  
**PR:** #75  
**Output:** `docs/implementation/step-10b-wo-pn-guardrails-corrective-actions.md`

**Gaps closed:**

| Gap | Fix Applied |
|-----|------------|
| H-001 | Migration 092: BEFORE INSERT trigger `trg_exec_ref_project_approved` — blocks WO/PN creation if `project_status IS DISTINCT FROM 'approved'` |
| H-002 | Migration 092: Dropped `"exec_ref: factory_user wo"` FOR ALL; replaced with `"exec_ref: factory_user wo select"` (FOR SELECT) + `"exec_ref: factory_user wo insert"` (FOR INSERT) |
| H-003 | WoPnGate.tsx: `handleCancel()` and `handleSupersede()` added to `EditReferenceModal`, gated by `canConfirm && isActive`; both write `recordProjectEvent` + `recordAuditEntry` |
| M-001 | Design decision confirmed: WO/PN gate based on `manufacturing_location` only; `project_department_routing` not consulted |
| M-002 | WoPnGate.tsx `handleSave()`: `recordProjectEvent` added before existing `recordAuditEntry` |
| M-003 | WoPnGate.tsx: PageHeader import changed to `@/components/common/page-header`; `icon=` prop removed |

### 2C — Step 10C: Final Sign-off

**Branch:** `feature/step-10c-wo-pn-final-signoff`  
**Output:** this document

- Integration verification: all Step 10B changes confirmed present and correct.
- ProjectDetail WoPnGateCard: added "Manage at WO / PN Gate" link for the active reference case (Part B below).
- Build PASS, TypeScript 0 errors, lint 79 (unchanged).

---

## 3. WO / PN Data Model

### Table: `project_execution_references` (migration 014)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, gen_random_uuid() |
| `project_id` | uuid FK → projects | NOT NULL, ON DELETE CASCADE |
| `reference_type` | `execution_reference_type` enum | `'wo'` or `'pn'` |
| `reference_number` | text | NOT NULL, globally unique per reference_type |
| `manufacturing_location` | text CHECK | `'saudi'` or `'dubai'` |
| `status` | `execution_reference_status` enum | Default `'created'` |
| `created_by` | uuid FK → profiles | |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, maintained by trigger |
| `confirmed_by` | uuid FK → profiles | |
| `confirmed_at` | timestamptz | |
| `remarks` | text | |

### Enums

**`execution_reference_type`:** `'wo'` | `'pn'`

**`execution_reference_status`:**

| Value | Meaning | Active? |
|-------|---------|---------|
| `'created'` | Reference number entered, awaiting confirmation | YES |
| `'confirmed'` | Confirmed by admin or operations_manager | YES |
| `'superseded'` | Replaced by a newer reference | NO |
| `'cancelled'` | Voided | NO |

### Active Reference Definition

- **Active WO:** `reference_type = 'wo' AND status IN ('created', 'confirmed')`
- **Active PN:** `reference_type = 'pn' AND status IN ('created', 'confirmed')`

Used by: `project_has_wo(uuid)`, `project_has_pn(uuid)`, `exec_ref_one_active_per_project` partial unique index.

### Constraints

| Constraint | Type | Rule |
|-----------|------|------|
| `exec_ref_location_type_match` | CHECK | WO requires `manufacturing_location = 'saudi'`; PN requires `manufacturing_location = 'dubai'` |
| `exec_ref_number_type_unique` | UNIQUE | `(reference_number, reference_type)` globally unique |
| `exec_ref_one_active_per_project` | Partial UNIQUE INDEX | `(project_id, reference_type)` where `status IN ('created','confirmed')` |

### Helper Functions (migration 014, SECURITY DEFINER STABLE)

| Function | Returns | Definition |
|----------|---------|------------|
| `project_has_wo(uuid)` | boolean | EXISTS active WO for project |
| `project_has_pn(uuid)` | boolean | EXISTS active PN for project |
| `can_start_saudi_factory(uuid)` | boolean | project approved + saudi + `project_has_wo()` |
| `can_start_dubai_followup(uuid)` | boolean | project approved + dubai + `project_has_pn()` |

---

## 4. Governance Rule Status

### R-005 — Saudi Factory Gate (WO Required)

| Layer | Status | Details |
|-------|--------|---------|
| TIER-1 DB trigger | **ENFORCED** ✅ | Migration 089 `trg_factory_requires_active_wo` BEFORE INSERT on `factory_records` |
| TIER-1 DB trigger | **ENFORCED** ✅ | Migration 092 `trg_exec_ref_project_approved` prevents WO creation before project approval |
| UI gate | **ENFORCED** ✅ | `WoPnGateCard` + `getExecutionGateStatus()` block factory workspace entry |
| **Overall enforcement** | **TIER-1 (DB)** | Both source (project_execution_references INSERT) and downstream (factory_records INSERT) are DB-enforced |

### R-006 — Dubai PN Gate (PN Required)

| Layer | Status | Details |
|-------|--------|---------|
| TIER-1 DB trigger | **ENFORCED** ✅ | Migration 089 `trg_dubai_followup_requires_active_pn` BEFORE INSERT on `dubai_project_followups` |
| TIER-1 DB trigger | **ENFORCED** ✅ | Migration 092 `trg_exec_ref_project_approved` prevents PN creation before project approval |
| UI gate | **ENFORCED** ✅ | `WoPnGateCard` + `getExecutionGateStatus()` block Dubai/AFS workspace entry |
| **Overall enforcement** | **TIER-1 (DB)** | Both source and downstream are DB-enforced |

### Governance Rule Checklist

| Rule | Status | Mechanism |
|------|--------|-----------|
| WO required before Saudi factory execution | **ENFORCED** ✅ | Migration 089 trigger on `factory_records` |
| PN required before Dubai/AFS follow-up | **ENFORCED** ✅ | Migration 089 trigger on `dubai_project_followups` |
| WO/PN cannot be created before project approval | **ENFORCED** ✅ | Migration 092 trigger on `project_execution_references` |
| Wrong reference type for route blocked | **ENFORCED** ✅ | CHECK constraint `exec_ref_location_type_match` (migration 014) |
| Duplicate active references blocked | **ENFORCED** ✅ | Partial unique index `exec_ref_one_active_per_project` (migration 014) |
| factory_user cannot self-confirm WO via API | **ENFORCED** ✅ | RLS split in migration 092 — factory_user SELECT + INSERT only; no UPDATE |
| Cancel/supersede correction path exists | **ENFORCED** ✅ | `handleCancel()` + `handleSupersede()` in WoPnGate.tsx EditReferenceModal (Step 10B) |

---

## 5. UI Surfaces

### WoPnGate.tsx (`/wo-pn-gate`)

The central management page for all WO/PN execution references.

| Feature | Role | Implementation |
|---------|------|---------------|
| View all active references | All roles with page access | `fetchAllReferences()` |
| View missing WO/PN projects | All roles with page access | `fetchProjectsMissingReference()` |
| Add WO | `admin`, `operations_manager`, `factory_user` | `AddReferenceModal` → INSERT on `project_execution_references` |
| Add PN | `admin`, `operations_manager` | `AddReferenceModal` → INSERT on `project_execution_references` |
| Confirm WO/PN | `admin`, `operations_manager` | `handleConfirm()` → UPDATE status='confirmed' |
| Edit remarks | All roles with edit access | `handleSave()` → UPDATE remarks; writes `recordProjectEvent` + `recordAuditEntry` |
| Cancel WO/PN | `admin`, `operations_manager` | `handleCancel()` → UPDATE status='cancelled' + audit trail |
| Supersede WO/PN | `admin`, `operations_manager` | `handleSupersede()` → UPDATE status='superseded' + audit trail |
| PageHeader | Shared design system | `@/components/common/page-header` (migrated in Step 10B) |

**Corrective action flow:** After cancel/supersede, `handleEditSuccess` calls `loadData()` to fully refresh missing lists and references. The cancelled/superseded reference is removed from the active list; the project reappears in "Missing WO" / "Missing PN".

### ProjectDetail WoPnGateCard (`/projects/:id` → Overview tab)

Inline summary card on the project detail page.

| State | Shown | Action |
|-------|-------|--------|
| Project not approved | Static note — WO/PN will be required after approval | None |
| Project approved, no active reference | Amber warning card | "Add {WO\|PN}" inline form (roles: admin, ops_manager, factory_user) |
| Project approved, active reference exists | Green success card — shows reference number, status, dates | "Manage at WO / PN Gate" link (Step 10C addition) |

**Step 10C change:** Added "To cancel or supersede this reference, go to WO / PN Gate" link in the `hasRef && activeRef` branch. Previously this link only appeared when `!hasRef`. The link uses the existing `/wo-pn-gate` route, which has its own role guards. No modal logic duplicated.

The WoPnGateCard does **not** include confirm/cancel/supersede modals — full management is intentionally centralised at `WoPnGate.tsx`.

---

## 6. DB/RLS Changes Across Step 10

### Migration 089 (Step 9B) — WO/PN Execution Gate Triggers

| Object | Type | Effect |
|--------|------|--------|
| `enforce_factory_requires_active_wo()` | BEFORE INSERT function | Raises P0001 if Saudi project has no active WO |
| `trg_factory_requires_active_wo` | BEFORE INSERT trigger on `factory_records` | Blocks factory record creation without WO |
| `enforce_dubai_followup_requires_active_pn()` | BEFORE INSERT function | Raises P0001 if Dubai project has no active PN |
| `trg_dubai_followup_requires_active_pn` | BEFORE INSERT trigger on `dubai_project_followups` | Blocks Dubai follow-up creation without PN |

### Migration 092 (Step 10B) — WO/PN Reference Approval Guardrails

| Object | Type | Effect |
|--------|------|--------|
| `enforce_exec_ref_project_approved()` | BEFORE INSERT function | Raises P0001 if parent project status ≠ 'approved' |
| `trg_exec_ref_project_approved` | BEFORE INSERT trigger on `project_execution_references` | Blocks WO/PN creation before project approval |
| `"exec_ref: factory_user wo"` (dropped) | RLS FOR ALL (dropped) | Removed — was granting factory_user UPDATE + DELETE |
| `"exec_ref: factory_user wo select"` | RLS FOR SELECT | factory_user can read WO references |
| `"exec_ref: factory_user wo insert"` | RLS FOR INSERT | factory_user can create WO references |

### RLS Policy Summary (project_execution_references, post Step 10B)

| Policy | Type | Who | Access |
|--------|------|-----|--------|
| `"exec_ref: admin_ops full access"` | FOR ALL | admin, operations_manager | Full CRUD |
| `"exec_ref: factory_user wo select"` | FOR SELECT | factory_user | WO rows only |
| `"exec_ref: factory_user wo insert"` | FOR INSERT | factory_user | WO rows only |
| `"exec_ref: afs_user read pn"` | FOR SELECT | afs_user | PN rows only |
| `"exec_ref: sales_user read own"` | FOR SELECT | sales_user | Own projects only |
| `"exec_ref: operational read"` | FOR SELECT | procurement, store, qc, sales_coordinator, viewer | Approved projects only |

---

## 7. M-001 Design Decision

**Decision:** WO/PN gate is based on `manufacturing_location` only. `project_department_routing` is NOT consulted by the gate logic.

**Rationale:**
- Any approved Saudi project requires a WO before factory execution, regardless of which departments were checked in the routing step.
- `project_department_routing` governs workflow routing for downstream modules (Steps 11–15), not the WO/PN gate condition.
- `getExecutionGateStatus()` in `executionGate.ts` is unchanged; it evaluates `project.manufacturing_location` directly.
- `project_has_wo()` and `project_has_pn()` helper functions are unchanged.

This decision is final for Step 10. Revisiting is deferred to a future governance review if routing changes semantics.

---

## 8. Files Changed in Step 10

| File | Step | Change |
|------|------|--------|
| `supabase/migrations/089_wo_pn_execution_guardrails.sql` | 9B | Created — factory_records + dubai_project_followups BEFORE INSERT triggers |
| `supabase/migrations/092_wo_pn_reference_approval_guardrails.sql` | 10B | Created — project_execution_references BEFORE INSERT trigger + RLS hardening |
| `src/pages/WoPnGate.tsx` | 10B | Updated — cancel/supersede, remarks timeline event, PageHeader migration |
| `src/pages/ProjectDetail.tsx` | 10C | Updated — WoPnGateCard: added "Manage at WO / PN Gate" link for active reference state |
| `docs/implementation/step-10a-wo-pn-gate-audit.md` | 10A | Created |
| `docs/implementation/step-10b-wo-pn-guardrails-corrective-actions.md` | 10B | Created |
| `docs/implementation/step-10-final-signoff.md` | 10C | Created (this document) |

---

## 9. Pages Intentionally Not Touched

| Page / File | Reason |
|------------|--------|
| `src/lib/executionGate.ts` | Gate logic is correct as-is; no changes needed |
| `src/types/index.ts` | No new types required |
| `src/lib/projectAudit.ts` | Existing `recordProjectEvent` / `recordAuditEntry` used without modification |
| `src/pages/AdminApprovals.tsx` | No WO/PN gate logic |
| `src/pages/QuotationNew.tsx`, `QuotationDetail.tsx` | Step 7 scope — not modified |
| Procurement module pages | Step 11 scope — not modified |
| Factory module pages | Downstream of WO gate — receive the gate result, not its source |
| Dubai/AFS module pages | Downstream of PN gate — receive the gate result, not its source |
| QC module pages | Downstream — not modified |
| After-Sales pages | Downstream — not modified |
| Reports pages | Out of scope |

---

## 10. Remaining Non-Blocking Items

| ID | Item | Impact | Deferred To |
|----|------|--------|-------------|
| L-001 | `fetchProjectsMissingReference()` uses 2 sequential queries instead of 1 NOT EXISTS / LEFT JOIN | Performance only; correctness unaffected | Low priority |
| L-002 | R-007 (BOQ/BOM/RMR WO gate) — individual table triggers not yet added | UI already gates these; DB enforcement deferred | Step 12 (Factory module) |
| L-003 | R-008 (Dubai ETA/AFS PN gate) — individual table triggers not yet added | UI already gates these; DB enforcement deferred | Step 13 (Dubai/AFS module) |
| L-004 | WoPnGateCard in ProjectDetail cannot cancel/supersede inline | Central WoPnGate is the corrective-action surface; link added in Step 10C | No further action |

---

## 11. Business Logic Preservation Statement

Step 10 made no changes to:

- `project_has_wo()` / `project_has_pn()` helper functions — unchanged
- `can_start_saudi_factory()` / `can_start_dubai_followup()` — unchanged
- `getExecutionGateStatus()` in `executionGate.ts` — unchanged
- `WoPnGateCard` gate calculations — unchanged
- Any Step 7 Sales & Quotation logic
- Any Step 8 UX / project approval logic
- Any Step 9 approval/routing behavior
- `project_department_routing` table or its RLS
- Downstream module visibility (factory, Dubai/AFS, QC, procurement)

The only business logic additions are:
1. WO/PN cannot be created before project approval (new DB constraint)
2. factory_user UPDATE/DELETE on WO references is now blocked at DB level (was already blocked at UI level)
3. Cancel/supersede corrective actions are now accessible in the UI (statuses already existed; flow was missing)

---

## 12. Route / Permission Preservation Statement

- All existing routes are unchanged.
- `/wo-pn-gate` route was and remains guarded by `RequireRole` in `App.tsx`.
- `/projects/:id` route is unchanged.
- Role constants `CAN_CREATE_WO`, `CAN_CREATE_PN`, `CAN_CONFIRM` in `WoPnGate.tsx` are unchanged.
- `canAddRef` in `ProjectDetail.tsx` is unchanged.
- No new roles added; no existing roles modified.

---

## 13. Database / RLS Preservation Statement

- All RLS policies not listed in Section 6 are unchanged.
- Migration 014 `project_execution_references` table schema is unchanged.
- `project_has_wo()` / `project_has_pn()` / `can_start_saudi_factory()` / `can_start_dubai_followup()` functions are unchanged.
- Migration 089 triggers on `factory_records` and `dubai_project_followups` are unchanged.
- Existing `project_execution_references` rows are not modified (triggers are BEFORE INSERT only).
- No UPDATE trigger exists — existing active references are unaffected by migration 092.

---

## 14. Manual Test Checklist

### DB Layer Tests (Supabase SQL editor / psql)

| # | Test | Expected |
|---|------|----------|
| T-001 | INSERT WO for unapproved Saudi project | BLOCKED — P0001 trigger error from `trg_exec_ref_project_approved` |
| T-002 | INSERT PN for unapproved Dubai project | BLOCKED — P0001 trigger error |
| T-003 | INSERT WO for approved Saudi project (as admin) | PASS |
| T-004 | INSERT PN for approved Dubai project (as admin) | PASS |
| T-005 | factory_user INSERT WO for approved Saudi project | PASS (RLS allows INSERT) |
| T-006 | factory_user UPDATE WO status to 'confirmed' via API | No rows affected (RLS blocks UPDATE for factory_user) |
| T-007 | factory_user UPDATE WO status to 'cancelled' via API | No rows affected (RLS blocks UPDATE for factory_user) |
| T-008 | admin UPDATE WO status to 'confirmed' | PASS — 1 row updated |
| T-009 | admin UPDATE WO status to 'cancelled' | PASS — `project_has_wo()` returns false |
| T-010 | admin UPDATE WO status to 'superseded' | PASS — `project_has_wo()` returns false |
| T-011 | INSERT factory_records for Saudi project with no WO | BLOCKED — P0001 from `trg_factory_requires_active_wo` |
| T-012 | INSERT factory_records for Saudi project with active WO | PASS |
| T-013 | INSERT dubai_project_followups for Dubai project with no PN | BLOCKED — P0001 from `trg_dubai_followup_requires_active_pn` |
| T-014 | INSERT dubai_project_followups for Dubai project with active PN | PASS |
| T-015 | After cancel: INSERT new WO for same project | PASS (partial unique index not violated — old ref is cancelled) |
| T-016 | `project_has_wo('<project_with_active_wo>')` | true |
| T-017 | `project_has_wo('<project_with_only_cancelled_wo>')` | false |
| T-018 | `project_has_pn('<project_with_active_pn>')` | true |

### UI Tests

| # | Scenario | Expected |
|---|----------|----------|
| U-001 | Admin opens WoPnGate page | New-style PageHeader (no left icon) |
| U-002 | Admin opens ProjectDetail for unapproved project | WoPnGateCard shows "WO/PN will be required after project approval" |
| U-003 | Admin opens ProjectDetail for approved Saudi project with no WO | Amber card — "Add WO" button + "Go to WO / PN Gate" link |
| U-004 | Admin opens ProjectDetail for approved Saudi project with active WO | Green card — shows WO number + "To cancel or supersede, go to WO / PN Gate" link |
| U-005 | Admin opens EditReferenceModal on active WO at WoPnGate | "Corrective Actions" card visible with Cancel + Supersede buttons |
| U-006 | Admin clicks "Cancel Reference" | Status='cancelled'; toast shown; page reloads; project reappears in "Missing WO" |
| U-007 | Admin clicks "Supersede Reference" | Status='superseded'; same reload behavior |
| U-008 | After cancel: admin adds new WO from WoPnGate | Succeeds; unique constraint not violated |
| U-009 | factory_user opens EditReferenceModal | No corrective actions visible (`canConfirm = false`) |
| U-010 | Admin saves remarks on a WO | Both audit_log and project timeline event written |
| U-011 | Attempt to add WO for project not in approved state | Project not visible in "Missing WO" list (fetchProjectsMissingReference filters to approved) |
| U-012 | Step 9 routing checkboxes in ApprovePanel | Unchanged — same behavior as after Step 9E |
| U-013 | Downstream factory / Dubai / QC module visibility | Unchanged — no changes to downstream module pages |

---

## 15. Safety Review

| Check | Result |
|-------|--------|
| Step 7 Sales & Quotation logic changed | No |
| Step 8 UX logic changed | No — only WoPnGateCard "Manage" link added (Step 10C) |
| Step 9 approval/routing behavior changed | No |
| Quotation files changed | No |
| Procurement / Store / Factory / Dubai / QC / After-Sales logic changed | No |
| Downstream module visibility changed | No |
| `project_department_routing` changed | No |
| `project_has_wo()` / `project_has_pn()` behavior changed | No |
| `can_start_saudi_factory()` / `can_start_dubai_followup()` changed | No |
| `getExecutionGateStatus()` changed | No |
| `executionGate.ts` changed | No |
| Existing `project_execution_references` rows modified | No — triggers are BEFORE INSERT only |
| Schema changes (new columns / tables) | No |
| Build result | PASS (✓ built in 5.74s) |
| TypeScript result | PASS (0 errors) |
| Lint result | 79 problems (63 errors, 16 warnings) — same as pre-Step 10C |

---

## 16. Final Recommendation

**Step 10 can be closed.**

All governance enforcement for the WO / PN gate is now at TIER-1 (DB) for both the source table (`project_execution_references`) and the downstream execution tables (`factory_records`, `dubai_project_followups`). The corrective action path (cancel/supersede) exists in the UI. The data model is fully documented. Remaining items (L-001 through L-004) are non-blocking.

---

## 17. Recommended Step 11 Scope — Procurement & Suppliers

Step 11 should cover the Procurement module governance closure:

1. **R-009 / PR-08** — PO > 10,000 SAR approval gate is already TIER-1 (migration 061, gold standard). Verify no regressions.

2. **Approved Supplier Registry gate (PR-09, B-016):** Add DB-level enforcement to prevent POs from being created for blocked/non-approved suppliers. Currently TIER-3 only.

3. **Procurement module RLS audit:** Review existing RLS policies on `purchase_orders`, `procurement_requests`, `suppliers` tables. Verify `procurement_user` cannot DELETE approved POs or suppliers; verify `store_user` financial value visibility restriction (PR-20 partial gap).

4. **PO status transition guard:** Audit `purchase_orders` status transitions. Confirm no gaps similar to H-002 (direct API updates bypassing UI gates).

5. **Procurement timeline event coverage:** Verify all key status changes on POs and PRs write both `audit_log` and `timeline_events`.

6. **Sign-off document:** `docs/implementation/step-11-final-signoff.md`
