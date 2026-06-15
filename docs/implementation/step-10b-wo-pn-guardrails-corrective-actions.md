# Step 10B — WO / PN Guardrails and Corrective Actions

**Branch:** `fix/step-10b-wo-pn-guardrails-corrective-actions`  
**Date:** 2026-06-15  
**Scope:** Close Step 10A HIGH gaps H-001, H-002, H-003 and MEDIUM gaps M-002, M-003  
**Depends on:** Steps 1–10A (all merged)

---

## 1. Executive Summary

Step 10B closes all gaps identified in the Step 10A audit. Migration 092 adds a BEFORE INSERT trigger preventing WO/PN creation before project approval and hardens the `factory_user` RLS policy from FOR ALL to SELECT + INSERT only. `WoPnGate.tsx` gains admin/operations_manager-only corrective actions (cancel, supersede), adds a timeline event on remarks save, and aligns its `PageHeader` with the shared design system.

| Part | Gap Closed | Result |
|------|-----------|--------|
| A | H-001 — WO/PN creation before approval | TIER-1 DB trigger on `project_execution_references` INSERT |
| B | H-002 — factory_user self-confirm via API | RLS split: FOR ALL → SELECT + INSERT only |
| C | H-003 — no cancel/supersede flow | Admin/ops_manager corrective actions in EditReferenceModal |
| D | M-002 — remarks save missing timeline event | `recordProjectEvent` added alongside `recordAuditEntry` |
| E | M-003 — legacy PageHeader in WoPnGate.tsx | Migrated to `@/components/common/page-header` |

M-001 design decision: WO/PN gate remains based on `manufacturing_location` only (see §10).

---

## 2. Migration Created

**`supabase/migrations/092_wo_pn_reference_approval_guardrails.sql`**

### Part A — Trigger: Block WO/PN creation before project approval

**Function:** `public.enforce_exec_ref_project_approved()` (SECURITY DEFINER)

**Trigger:** `trg_exec_ref_project_approved` BEFORE INSERT on `project_execution_references` FOR EACH ROW

**Logic:**
```
1. SELECT project_status, project_code FROM projects WHERE id = NEW.project_id
2. IF project_status IS DISTINCT FROM 'approved' THEN
     RAISE EXCEPTION P0001
     "WO/PN reference cannot be created before the project is approved.
      Project '<code>' has status '<status>'. Approve the project first
      then add the WO|PN reference."
3. RETURN NEW  (allow INSERT)
```

Applies to both `reference_type = 'wo'` and `reference_type = 'pn'`.  
Does NOT modify `project_has_wo()`, `project_has_pn()`, `can_start_saudi_factory()`, or `can_start_dubai_followup()`.  
Does NOT affect UPDATE on existing rows.

### Part B — RLS Hardening: factory_user WO policy

**Before (migration 014):**

| Policy | Type | Scope |
|--------|------|-------|
| `"exec_ref: factory_user wo"` | FOR ALL | `factory_user` on `reference_type = 'wo'` |

"FOR ALL" included SELECT + INSERT + UPDATE + DELETE, enabling factory_user to self-confirm, cancel, or supersede a WO via direct API call.

**After (migration 092):**

| Policy | Type | Scope |
|--------|------|-------|
| `"exec_ref: factory_user wo select"` | FOR SELECT | `factory_user` on `reference_type = 'wo'` |
| `"exec_ref: factory_user wo insert"` | FOR INSERT | `factory_user` on `reference_type = 'wo'` |

factory_user retains exactly the same data visibility and INSERT capability. UPDATE and DELETE are no longer accessible. `"exec_ref: admin_ops full access"` (migration 014, unchanged) continues to give admin/operations_manager full CRUD.

**All other policies unchanged:**

| Policy | Changed? |
|--------|---------|
| `"exec_ref: admin_ops full access"` | No |
| `"exec_ref: afs_user read pn"` | No |
| `"exec_ref: sales_user read own"` | No |
| `"exec_ref: operational read"` | No |

---

## 3. Trigger Behavior (Part A)

| Scenario | Result |
|----------|--------|
| INSERT WO for unapproved Saudi project | BLOCKED — P0001 error |
| INSERT PN for unapproved Dubai project | BLOCKED — P0001 error |
| INSERT WO for approved Saudi project | ALLOWED |
| INSERT PN for approved Dubai project | ALLOWED |
| INSERT for project with `project_status = 'submitted_for_approval'` | BLOCKED |
| INSERT for project with `project_status = 'sent_back_for_revision'` | BLOCKED |
| UPDATE on existing `project_execution_references` row | NOT AFFECTED (BEFORE INSERT only) |
| Existing rows | NOT MODIFIED |

---

## 4. UI Corrective Actions (Part C)

### 4.1 EditReferenceModal Changes

**Props unchanged:** `{ reference, canConfirm, onClose, onSuccess }` — `canConfirm` (`CAN_CONFIRM = ['admin', 'operations_manager']`) gates both confirmation and corrective actions.

**New state variables:**
- `cancelling: boolean` — loading state for cancel action
- `superseding: boolean` — loading state for supersede action
- `anyBusy: boolean` — computed: `submitting || confirming || cancelling || superseding`

**New functions:**

`handleCancel()` — sets `status = 'cancelled'`:
1. UPDATE `project_execution_references` SET status = 'cancelled' WHERE id = reference.id
2. `recordProjectEvent(project_id, '{type}_cancelled', '{TYPE} cancelled', ...)`
3. `recordAuditEntry('{type}_cancelled', project_id, ..., { status: old }, { status: 'cancelled' }, ...)`
4. `onSuccess(updated)`

`handleSupersede()` — sets `status = 'superseded'`:
1. UPDATE `project_execution_references` SET status = 'superseded' WHERE id = reference.id
2. `recordProjectEvent(project_id, '{type}_superseded', '{TYPE} superseded', ...)`
3. `recordAuditEntry('{type}_superseded', project_id, ..., { status: old }, { status: 'superseded' }, ...)`
4. `onSuccess(updated)`

**Corrective Actions UI section** (shown when `canConfirm && isActive`):
- Red-bordered card with warning text: "These actions deactivate this reference. A new reference can then be added."
- "Cancel Reference" button (danger variant)
- "Supersede Reference" button (secondary variant)
- All buttons disabled when any other action is in progress (`anyBusy`)

**Confirm button** gated by `canConfirm && !isConfirmed && isActive` (unchanged from before; `isActive` check added for safety).

### 4.2 handleEditSuccess Updated (main component)

After cancel or supersede: calls `loadData()` to fully refresh the missing lists and references list. The cancelled/superseded reference disappears from the active list; if the project now has no active reference, it reappears in the "Missing WO" / "Missing PN" section.

After confirm or remarks save: updates local state only (no reload), same as before.

**Success messages:**
- Cancelled/superseded: `"WO/PN {number} {cancelled|superseded}. A new reference can now be added for the project."`
- Confirmed: `"WO/PN {number} confirmed."` (unchanged)
- Remarks: `"Remarks updated."` (unchanged)

---

## 5. Remarks Timeline Event (Part D)

**Before:** `handleSave()` called only `recordAuditEntry` — change appeared in audit_log but NOT in project timeline.

**After:** `handleSave()` now calls `recordProjectEvent` first, then `recordAuditEntry`:
```typescript
await recordProjectEvent(
  reference.project_id,
  `${reference.reference_type}_updated`,
  `${reference.reference_type.toUpperCase()} remarks updated`,
  `${reference.reference_type.toUpperCase()} number: ${reference.reference_number}`,
  profile?.id ?? null, profile?.full_name ?? null,
  { reference_type, reference_number },
);
await recordAuditEntry(...);
```

Closes R-016 gap for this specific action.

---

## 6. PageHeader Alignment (Part E)

**Before:** `import { PageHeader } from '../components/ui/PageHeader'` with `<PageHeader ... icon={<GitBranch size={18} />} />`

**After:** `import { PageHeader } from '@/components/common/page-header'` with icon prop removed.

`GitBranch` icon is still imported and used elsewhere in the file (governance card, references section, EmptyState). No import change for the icon itself.

The legacy `PageHeader` component remains in the codebase for other pages not yet migrated (per the Step 9D G-9A-03 cleanup plan). This step migrates WoPnGate.tsx only.

---

## 7. M-001 Design Decision — WO/PN Gate vs. Routing

**Decision confirmed:** WO/PN gate remains based on `manufacturing_location` only. `project_department_routing` is NOT consulted by `getExecutionGateStatus()`, `WoPnGateCard`, or `WoPnGate.tsx`.

**Rationale:**
- Any approved Saudi project requires WO before factory execution, regardless of which departments were checked in the routing step.
- `project_department_routing` is a downstream routing/visibility mechanism for Steps 11–15, not a gate condition for WO/PN.
- `getExecutionGateStatus()` in `executionGate.ts` is NOT changed in Step 10B.
- `project_has_wo()` and `project_has_pn()` are NOT changed.

---

## 8. Files Changed

| File | Change Type |
|------|------------|
| `supabase/migrations/092_wo_pn_reference_approval_guardrails.sql` | Created |
| `src/pages/WoPnGate.tsx` | Updated — Parts C, D, E |
| `docs/implementation/step-10b-wo-pn-guardrails-corrective-actions.md` | Created |

**Files NOT changed:** `src/lib/executionGate.ts`, `src/pages/ProjectDetail.tsx`, `src/types/index.ts`, `src/lib/projectAudit.ts`, all other source files, all other migrations.

---

## 9. Manual SQL Test Scenarios

Run in Supabase SQL editor or psql. Requires: one approved Saudi project `<appr_saudi>`, one unapproved Saudi project `<unappr_saudi>`, one approved Dubai project `<appr_dubai>`.

| # | Scenario | Expected |
|---|----------|----------|
| T-001 | INSERT WO for `<unappr_saudi>` | FAIL: P0001 "WO/PN reference cannot be created before the project is approved" |
| T-002 | INSERT PN for unapproved Dubai project | FAIL: P0001 (same message, "PN reference") |
| T-003 | INSERT WO for `<appr_saudi>` (as admin) | PASS |
| T-004 | INSERT PN for `<appr_dubai>` (as admin) | PASS |
| T-005 | factory_user INSERT WO for `<appr_saudi>` | PASS (RLS allows) |
| T-006 | factory_user UPDATE WO status to 'confirmed' (direct API) | No rows affected (RLS blocks UPDATE for factory_user) |
| T-007 | admin UPDATE WO status to 'confirmed' | PASS (1 row updated) |
| T-008 | admin UPDATE WO status to 'cancelled' | PASS → `project_has_wo()` returns false |
| T-009 | admin UPDATE WO status to 'superseded' | PASS → `project_has_wo()` returns false |
| T-010 | `project_has_wo('<appr_saudi>')` after T-003 | true |
| T-011 | `project_has_pn('<appr_dubai>')` after T-004 | true |
| T-012 | After T-008 (cancel): INSERT new WO for same project | PASS (partial unique index not violated — old ref is now 'cancelled') |

---

## 10. Manual UI Test Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| U-001 | Admin opens WoPnGate page | Page renders with new-style PageHeader (no left icon) |
| U-002 | Admin clicks Add WO on an approved Saudi project | AddReferenceModal opens; submitting succeeds |
| U-003 | Admin navigates to WoPnGate, selects a project with missing WO, but project is unapproved | Not visible in "Missing WO" list (fetchProjectsMissingReference filters to approved) |
| U-004 | Admin opens edit modal on an active WO reference | "Corrective Actions" card visible with Cancel/Supersede buttons |
| U-005 | Admin clicks "Cancel Reference" | WO status set to 'cancelled'; success toast shown; page reloads; project appears in "Missing WO" |
| U-006 | Admin clicks "Supersede Reference" | WO status set to 'superseded'; success toast; page reloads; project appears in "Missing WO" |
| U-007 | After cancel: admin adds new WO for same project | Succeeds; unique constraint not violated (old ref is cancelled) |
| U-008 | factory_user opens edit modal on WO reference | Modal shows NO corrective actions (canConfirm=false for factory_user) |
| U-009 | Admin saves remarks on a WO | Audit log + project timeline event both written |
| U-010 | ProjectDetail WoPnGateCard on an approved project | Unchanged — no WoPnGateCard changes in Step 10B |

---

## 11. Assumptions

| ID | Assumption |
|----|-----------|
| A-001 | The trigger `enforce_exec_ref_project_approved()` delegates to `projects.project_status` as the single source of truth for approval. No other status values (e.g. 'active') unblock WO/PN creation — only `'approved'`. |
| A-002 | factory_user UPDATE was already blocked at the UI level (CAN_CONFIRM check). Migration 092 closes the API bypass. No factory_user existing workflows are disrupted by this RLS change. |
| A-003 | Cancel and supersede corrective actions are admin/operations_manager only (CAN_CONFIRM). factory_user is explicitly excluded. |
| A-004 | `handleEditSuccess` calling `loadData()` on cancel/supersede causes a full data reload. This is intentional — it refreshes the missing lists so the project correctly appears as needing a new reference. |
| A-005 | Mock mode (dev/isSupabaseConfigured=false) corrective actions call `onSuccess` without DB persistence — same as existing mock pattern for confirm. |

---

## 12. Limitations

| ID | Limitation | Deferred To |
|----|-----------|-------------|
| L-001 | `WoPnGateCard` in ProjectDetail.tsx has no corrective action flow — cancel/supersede can only be done from WoPnGate.tsx. | Step 10C or future polish |
| L-002 | R-007 (BOQ/BOM/RMR WO gate) and R-008 (Dubai ETA/AFS PN gate) not addressed — separate backlog items. | Steps per module plan |
| L-003 | `fetchProjectsMissingReference()` still uses 2 queries instead of 1 NOT EXISTS query (L-001 from Step 10A). | Low priority — deferred |
| L-004 | If a project was unapproved AFTER a WO was created (not a normal flow — approval is irreversible in current model), the WO would remain active. The trigger only applies to new INSERTs. | Not applicable — current model has no unapproval path |

---

## 13. Rollback Notes

**Migration 092 rollback:**
```sql
DROP TRIGGER IF EXISTS trg_exec_ref_project_approved
  ON public.project_execution_references;
DROP FUNCTION IF EXISTS public.enforce_exec_ref_project_approved();

DROP POLICY IF EXISTS "exec_ref: factory_user wo select"
  ON public.project_execution_references;
DROP POLICY IF EXISTS "exec_ref: factory_user wo insert"
  ON public.project_execution_references;

-- Restore original broad policy:
CREATE POLICY "exec_ref: factory_user wo"
  ON public.project_execution_references FOR ALL
  TO authenticated
  USING (public.current_user_role() = 'factory_user' AND reference_type = 'wo')
  WITH CHECK (public.current_user_role() = 'factory_user' AND reference_type = 'wo');
```

**WoPnGate.tsx rollback:**
- Revert import to `'../components/ui/PageHeader'`; restore `icon={<GitBranch size={18} />}` on PageHeader call
- Remove `handleCancel()`, `handleSupersede()`, `cancelling`, `superseding` state, `isActive`, `anyBusy` from `EditReferenceModal`
- Remove corrective actions card from modal JSX; revert button disabled states
- Remove `recordProjectEvent` call from `handleSave()`
- Revert `handleEditSuccess()` to original single-path implementation

---

## 14. Safety Review

| Check | Result |
|-------|--------|
| Step 7 Sales & Quotation logic changed | No |
| Step 8 UX logic changed (beyond WoPnGate PageHeader) | No |
| Step 9 approval/routing behavior changed | No |
| Quotation files changed | No |
| Procurement / Store / Factory / Dubai / QC / After-Sales logic changed | No |
| Downstream module visibility changed | No |
| project_department_routing changed | No |
| project_has_wo() / project_has_pn() behavior changed | No — functions unchanged |
| can_start_saudi_factory() / can_start_dubai_followup() changed | No |
| Existing `project_execution_references` rows modified | No — trigger is BEFORE INSERT only |
| AdminApprovals.tsx changed | No |
| ProjectDetail.tsx changed | No |
| Build result | PASS (✓ built in 7.30s) |
| TypeScript result | PASS (0 errors) |
| Lint result | 79 problems (63 errors, 16 warnings) — same as before Step 10B |

---

## 15. Recommended Step 10C Scope

Step 10C should be the final sign-off and stabilization step for the WO/PN gate pipeline:

1. **WoPnGateCard corrective actions (L-001):** Add cancel/supersede to the ProjectDetail WoPnGateCard inline flow, so admins can correct a wrong reference without navigating to the WoPnGate page.

2. **G-9A-03 PageHeader cleanup completion:** Any remaining legacy PageHeader pages not yet migrated to `@/components/common/page-header`. WoPnGate.tsx is now done; audit what remains.

3. **Governance sign-off document:** Create `docs/governance/step-10-wo-pn-gate-final-signoff.md` summarizing all R-005, R-006 enforcement layers after Steps 9B and 10B.

4. **Optional — fetchProjectsMissingReference optimization (L-003):** Replace 2-query pattern with a single NOT EXISTS / LEFT JOIN query.
