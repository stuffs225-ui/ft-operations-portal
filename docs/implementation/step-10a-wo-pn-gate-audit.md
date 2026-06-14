# Step 10A — WO / PN Gate Focused Audit

**Branch:** `feature/step-10a-wo-pn-gate-audit`  
**Date:** 2026-06-14  
**Scope:** Read-only audit of current WO/PN gate implementation; definition of Step 10B scope  
**Depends on:** Steps 1–9E (all merged)

---

## 1. Executive Summary

The WO/PN gate implementation is architecturally sound with a working DB enforcement layer (migration 089) that prevents factory records and Dubai follow-up records from being created without an active WO or PN. The core governance rules R-005 and R-006 are TIER-1 enforced at the execution side.

However, three HIGH gaps exist on the reference-creation side: no DB check prevents a WO/PN being created before SO approval; the `factory_user` RLS policy grants overly broad ALL access (including UPDATE) enabling self-confirmation; and there is no UI or DB flow for cancelling or superseding an existing WO/PN. Additionally, there are medium/low gaps around timeline audit completeness and PageHeader alignment.

**Recommendation: Proceed to Step 10B.**

---

## 2. WO/PN Data Model

### 2.1 Table: `project_execution_references` (migration 014)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `project_id` | uuid NOT NULL FK → `projects(id)` | CASCADE delete |
| `reference_type` | enum `execution_reference_type` | `'wo'` or `'pn'` |
| `reference_number` | text NOT NULL | The actual WO or PN number string |
| `manufacturing_location` | text NOT NULL | `'saudi'` or `'dubai'` |
| `status` | enum `execution_reference_status` | Default `'created'` |
| `created_by` | uuid FK → `profiles(id)` | Nullable; set null on profile delete |
| `confirmed_by` | uuid FK → `profiles(id)` | Nullable; null until confirmed |
| `confirmed_at` | timestamptz | Null until confirmed |
| `remarks` | text | Optional |
| `created_at` | timestamptz NOT NULL | Default `now()` |
| `updated_at` | timestamptz NOT NULL | Auto-maintained by trigger |

### 2.2 Enums

```sql
execution_reference_type:   'wo' | 'pn'
execution_reference_status: 'created' | 'confirmed' | 'superseded' | 'cancelled'
```

### 2.3 Constraints

| Constraint | Rule |
|-----------|------|
| `exec_ref_location_type_match` CHECK | WO only for saudi; PN only for dubai |
| `exec_ref_number_type_unique` UNIQUE | (reference_number, reference_type) globally unique |
| `exec_ref_one_active_per_project` PARTIAL UNIQUE INDEX | (project_id, reference_type) WHERE status IN ('created','confirmed') — max 1 active per project per type |

### 2.4 DB Helper Functions (migration 014, SECURITY DEFINER, STABLE)

| Function | Returns | Logic |
|----------|---------|-------|
| `project_has_wo(p_project_id)` | boolean | EXISTS active WO (status IN 'created','confirmed') |
| `project_has_pn(p_project_id)` | boolean | EXISTS active PN (status IN 'created','confirmed') |
| `can_start_saudi_factory(p_project_id)` | boolean | project approved + saudi + `project_has_wo()` |
| `can_start_dubai_followup(p_project_id)` | boolean | project approved + dubai + `project_has_pn()` |

---

## 3. Active WO / Active PN Definitions

### 3.1 Active WO

| Criterion | Value |
|-----------|-------|
| Table | `project_execution_references` |
| `reference_type` | `'wo'` |
| `status` | `'created'` OR `'confirmed'` |
| Excludes | `'superseded'`, `'cancelled'` |
| Uniqueness | Max 1 active WO per project (partial unique index) |
| DB function | `project_has_wo(project_id)` |

### 3.2 Active PN

| Criterion | Value |
|-----------|-------|
| Table | `project_execution_references` |
| `reference_type` | `'pn'` |
| `status` | `'created'` OR `'confirmed'` |
| Excludes | `'superseded'`, `'cancelled'` |
| Uniqueness | Max 1 active PN per project (partial unique index) |
| DB function | `project_has_pn(project_id)` |

The `'created'` status counts as active and unblocks execution. The confirmation step (`'confirmed'`) is an additional verification step but is NOT required before factory/Dubai execution begins.

---

## 4. Pages and Components Reviewed

| File | Role in WO/PN flow |
|------|--------------------|
| `src/pages/WoPnGate.tsx` | Main management page — lists missing WO/PN, all active references; create + confirm flow |
| `src/pages/ProjectDetail.tsx` (`WoPnGateCard`) | Inline gate card in Overview tab; add WO/PN without leaving project |
| `src/lib/executionGate.ts` | All WO/PN data-fetching and pure gate-status functions |
| `src/types/index.ts` | `ExecutionReference`, `ExecutionGateStatus` TypeScript types |

---

## 5. Tables and Functions Reviewed

| Item | Type | Notes |
|------|------|-------|
| `project_execution_references` | Table | Reviewed via migration 014 |
| `factory_records` | Table (RLS only) | Reviewed via migration 083 — INSERT policy has no project_status check |
| `execute_reference_type` | Enum | 'wo', 'pn' |
| `execution_reference_status` | Enum | 'created', 'confirmed', 'superseded', 'cancelled' |
| `project_has_wo()` | DB function | migration 014 — no project_status check |
| `project_has_pn()` | DB function | migration 014 — no project_status check |
| `can_start_saudi_factory()` | DB function | migration 014 — checks project_status = 'approved' |
| `can_start_dubai_followup()` | DB function | migration 014 — checks project_status = 'approved' |
| `enforce_so_approval_fields()` trigger | migration 078 | Blocks approval if manufacturing_location or medical_items not set |
| `enforce_factory_requires_active_wo()` trigger | migration 089 | BEFORE INSERT on factory_records — blocks Saudi factory without WO |
| `enforce_dubai_followup_requires_active_pn()` trigger | migration 089 | BEFORE INSERT on dubai_project_followups — blocks Dubai follow-up without PN |
| `project_department_routing` | Table | Not consulted by WO/PN gate logic |

---

## 6. Roles Involved

### 6.1 WO Creation

| Role | Can Create WO? | Source |
|------|---------------|--------|
| `admin` | Yes | `CAN_CREATE_WO` array + `"exec_ref: admin_ops full access"` RLS |
| `operations_manager` | Yes | Same |
| `factory_user` | Yes | `CAN_CREATE_WO` array + `"exec_ref: factory_user wo"` RLS (FOR ALL) |
| All other roles | No | Not in CAN_CREATE_WO; no INSERT RLS |

### 6.2 PN Creation

| Role | Can Create PN? | Source |
|------|---------------|--------|
| `admin` | Yes | `CAN_CREATE_PN` array + `"exec_ref: admin_ops full access"` RLS |
| `operations_manager` | Yes | Same |
| `factory_user` | No | Not in CAN_CREATE_PN; RLS restricts to reference_type='wo' only |
| `afs_user` | No (SELECT only) | `"exec_ref: afs_user read pn"` RLS — no INSERT |
| All other roles | No | No INSERT RLS |

### 6.3 WO/PN Confirmation

| Role | Can Confirm? | Source |
|------|-------------|--------|
| `admin` | Yes (UI + API) | `CAN_CONFIRM` + admin_ops full access RLS |
| `operations_manager` | Yes (UI + API) | Same |
| `factory_user` | No (UI) — **Yes (API)** | Not in CAN_CONFIRM; BUT `"exec_ref: factory_user wo"` grants ALL including UPDATE → factory_user CAN self-confirm via direct API **[H-002 gap]** |

### 6.4 Read Access

| Role | Can Read? | Scope |
|------|----------|-------|
| `admin`, `operations_manager` | All rows | RLS FOR ALL |
| `factory_user` | WO rows only | RLS WHERE reference_type='wo' |
| `afs_user` | PN rows only | RLS WHERE reference_type='pn' |
| `sales_user` | Own projects' references | RLS via project FK check |
| `procurement_user`, `store_user`, `qc_user`, `sales_coordinator`, `viewer` | References of approved projects | RLS via project_status check |

---

## 7. Current UI Flow

### 7.1 WoPnGate.tsx (Main Page)

1. On mount: `fetchProjectsMissingReference('wo')`, `fetchProjectsMissingReference('pn')`, `fetchAllReferences()` called in parallel
2. Missing sections show **only approved** projects (query filters `project_status = 'approved'`)
3. `MissingRow` component shows each project missing WO/PN with Add button
4. Add button opens `AddReferenceModal` — form with reference number + remarks; on submit: INSERT into `project_execution_references`, then `recordProjectEvent` + `recordAuditEntry`
5. Existing references shown in `ReferenceRow` — Edit/Confirm button opens `EditReferenceModal`
6. `EditReferenceModal`: Save Remarks → UPDATE remarks + `recordAuditEntry` (no timeline event); Confirm → UPDATE status='confirmed' + `recordProjectEvent` + `recordAuditEntry`
7. **No cancel/supersede flow** — statuses exist in enum but no UI to set them

### 7.2 WoPnGateCard (ProjectDetail.tsx Overview Tab)

1. Props: `project`, `references`, `canAdd`, `onReferenceAdded`
2. Early returns (no Add button shown):
   - Location not set: neutral message
   - Project not yet approved: neutral "WO/PN will be required after approval" message
3. For approved Saudi projects: shows WO status; `canAdd` allows inline Add form
4. For approved Dubai projects: shows PN status; `canAdd` restricted to admin/operations_manager
5. `canAddRef = role === 'admin' || role === 'operations_manager' || role === 'factory_user'` — includes factory_user for WO
6. INSERT + audit flow same as WoPnGate.tsx AddReferenceModal

### 7.3 executionGate.ts

- `getExecutionGateStatus()`: pure function, no DB calls; takes project + references array; computes `canStartSaudiFactory` and `canStartDubaiFollowUp`
- `fetchProjectReferences()`: fetches active (not cancelled/superseded) references for a project
- `fetchAllReferences()`: fetches all active references for the gate dashboard
- `fetchProjectsMissingReference()`: fetches approved projects with the given route that have no active reference

---

## 8. Current DB Enforcement

### 8.1 Gate Trigger on Execution (migration 089) ✅ TIER-1

| Trigger | Table | Rule |
|---------|-------|------|
| `trg_factory_requires_active_wo` | `factory_records` INSERT | Saudi project + no active WO → BLOCKED |
| `trg_dubai_followup_requires_active_pn` | `dubai_project_followups` INSERT | Dubai project + no active PN → BLOCKED |

These triggers use `project_has_wo()` / `project_has_pn()` which do NOT check project_status. They check only for the existence of an active reference.

### 8.2 SO Approval Guard (migration 078) ✅ TIER-1

`trg_so_approval_fields`: Blocks `project_status = 'approved'` if `manufacturing_location = 'not_set'` or `medical_items = 'not_set'`. Ensures approved projects always have a valid route.

### 8.3 Location-Type Constraint (migration 014) ✅ TIER-1

`exec_ref_location_type_match` CHECK: WO must have manufacturing_location='saudi'; PN must have manufacturing_location='dubai'. Client sets this field, constraint validates it. Prevents wrong type for wrong route.

### 8.4 Active Reference Uniqueness (migration 014) ✅ TIER-1

`exec_ref_one_active_per_project` partial unique index: Only 1 active WO and 1 active PN per project at any time. Prevents duplicate active references.

### 8.5 Global Reference Number Uniqueness (migration 014) ✅ TIER-1

`exec_ref_number_type_unique`: No two references of the same type can share the same reference number globally. Prevents data entry errors.

### 8.6 RLS on project_execution_references (migration 014) ✅ TIER-1 (partial gaps)

5 policies as documented in §6 above. No project_status check on factory_user's INSERT permission. See gap H-001 and H-002.

---

## 9. Relationship to Step 9B — Migration 089

Migration 089's `trg_factory_requires_active_wo` and `trg_dubai_followup_requires_active_pn` delegate to `project_has_wo()` / `project_has_pn()` from migration 014.

**Critical observation**: `project_has_wo()` returns true if ANY WO (regardless of when it was created or whether the project was approved at creation time) exists with status IN ('created','confirmed'). If a WO is created for an unapproved Saudi project (possible via direct API — H-001), the trigger would allow factory_records to be inserted even before the project is approved.

The `can_start_saudi_factory()` function (which checks project approval + location + WO) is NOT used by migration 089's trigger — only `project_has_wo()` is used. This means the DB execution gate does not enforce the project approval requirement.

Step 10B should consider whether migration 092 should change the trigger to use `can_start_saudi_factory()` instead of `project_has_wo()`, or add a separate approval check on WO creation.

---

## 10. Relationship to project_department_routing

The current WO/PN gate (`getExecutionGateStatus()`, WoPnGateCard, WoPnGate.tsx) does NOT consult `project_department_routing`. Gate decisions are made solely from:
- `project.project_status` (approved?)
- `project.manufacturing_location` (saudi or dubai?)
- Presence of active WO/PN in `project_execution_references`

**Implication**: A Saudi project approved but with 'factory' department NOT checked in routing will still show a WO requirement in the WoPnGateCard and appear in the WoPnGate "Missing WO" list. Whether this is correct behavior is a design decision — Step 10B should document the decision but not change the current behavior unless explicitly requested.

The `project_department_routing` table is queryable and populated (Steps 9C–9E), but no WO/PN gate logic currently reads from it.

---

## 11. Gap Register

### Critical Gaps (can bypass WO/PN governance or start downstream execution wrongly)

**None identified.** The DB trigger in migration 089 reliably blocks factory_records and dubai_project_followups INSERTs when no active WO/PN exists. The core execution gate is TIER-1 enforced.

### High Gaps

#### H-001 — No Approval Check on WO/PN Creation

| Field | Value |
|-------|-------|
| **Gap ID** | H-001 |
| **Title** | WO/PN creation not gated on project approval |
| **Location** | `project_execution_references` RLS; `project_has_wo()` function |
| **Current behavior** | `factory_user` and `admin/operations_manager` can INSERT a WO for any Saudi project regardless of `project_status`. The UI prevents this (WoPnGateCard early-return, `fetchProjectsMissingReference()` filters to approved only), but the DB does not. |
| **Risk** | factory_user creates WO for unapproved project via direct API → `project_has_wo()` returns true → migration 089 trigger allows factory_record INSERT on unapproved project → factory execution on unapproved SO |
| **Classification** | HIGH (requires direct API access, not achievable through normal UI) |
| **Fix** | Add a BEFORE INSERT trigger on `project_execution_references` checking that `projects.project_status = 'approved'` for the given `project_id`. Alternatively, update migration 089's `enforce_factory_requires_active_wo()` to use `can_start_saudi_factory()` instead of `project_has_wo()`. |

#### H-002 — factory_user RLS Grants Overly Broad ALL Access (Self-Confirm)

| Field | Value |
|-------|-------|
| **Gap ID** | H-002 |
| **Title** | factory_user can self-confirm WO via direct API |
| **Location** | `"exec_ref: factory_user wo"` RLS policy (migration 014) |
| **Current behavior** | Policy is `FOR ALL` with no restriction on status updates. factory_user can UPDATE `status = 'confirmed'` directly via API, bypassing `CAN_CONFIRM = ['admin', 'operations_manager']` governance. UI hides the Confirm button but DB doesn't enforce it. |
| **Classification** | HIGH (requires direct API access; governance principle violated) |
| **Fix** | Replace `"exec_ref: factory_user wo"` FOR ALL with separate INSERT + SELECT policies. Remove UPDATE permission from factory_user so only admin/operations_manager can confirm. Migration 092. |

#### H-003 — No Cancel/Supersede Flow for WO/PN References

| Field | Value |
|-------|-------|
| **Gap ID** | H-003 |
| **Title** | No UI or DB flow to cancel or supersede an existing WO/PN |
| **Location** | `WoPnGate.tsx` EditReferenceModal; WoPnGateCard |
| **Current behavior** | The 'superseded' and 'cancelled' statuses exist in the enum but neither the WoPnGate page nor the WoPnGateCard provides a way to set them. If a WO number is entered incorrectly, admin must do a direct DB UPDATE to cancel/supersede it. |
| **Classification** | HIGH (operational gap — users genuinely need this workflow; current workaround is direct DB access which is error-prone and unaudited) |
| **Fix** | Add cancel action to EditReferenceModal (admin/operations_manager only). When cancelled, the WoPnGateCard and WoPnGate page immediately show the project as "Missing WO/PN" so a new one can be added. UI change only — no DB migration needed (enum already has the values). |

### Medium Gaps

#### M-001 — WO/PN Gate Not Consulted from project_department_routing

| Field | Value |
|-------|-------|
| **Gap ID** | M-001 |
| **Title** | WO requirement based on manufacturing_location, not on factory routing decision |
| **Location** | `getExecutionGateStatus()` in `executionGate.ts` |
| **Current behavior** | A Saudi project with 'factory' unchecked in department routing still shows a WO requirement and appears in the WoPnGate "Missing WO" list. |
| **Classification** | MEDIUM — design decision; may be intentional (Saudi route always requires WO regardless of module routing) |
| **Fix** | Requires design clarification. If the decision is "all Saudi projects require WO regardless of routing", document as accepted. If "WO only required when factory is routed", then `getExecutionGateStatus()` needs a routing table query. Defer to Step 10B design decision. |

#### M-002 — Remarks Save Does Not Write Project Timeline Event

| Field | Value |
|-------|-------|
| **Gap ID** | M-002 |
| **Title** | Remarks update in EditReferenceModal calls recordAuditEntry but not recordProjectEvent |
| **Location** | `WoPnGate.tsx` `handleSave()` in EditReferenceModal |
| **Current behavior** | WO/PN remarks changes are recorded in audit_log but NOT in the project timeline. R-016 (all significant changes must produce a timeline event) is not met for this action. |
| **Classification** | MEDIUM |
| **Fix** | Add `recordProjectEvent()` call alongside existing `recordAuditEntry()` in `handleSave()`. UI-only change. |

#### M-003 — WoPnGate.tsx Uses Legacy PageHeader

| Field | Value |
|-------|-------|
| **Gap ID** | M-003 |
| **Title** | WoPnGate.tsx imports legacy `../components/ui/PageHeader` with `icon=` prop |
| **Location** | `WoPnGate.tsx` line 8 and line 611 |
| **Current behavior** | `<PageHeader title="WO / PN Gate" ... icon={<GitBranch size={18} />} />` — uses legacy PageHeader instead of `@/components/common/page-header` |
| **Classification** | MEDIUM (G-9A-03 cleanup — partially deferred from Step 9D) |
| **Fix** | Update import to `@/components/common/page-header`; remove `icon=` prop. Source change only. |

### Low Gaps

#### L-001 — fetchProjectsMissingReference Makes 2 DB Queries

| Field | Value |
|-------|-------|
| **Gap ID** | L-001 |
| **Title** | fetchProjectsMissingReference() issues 2 separate DB queries |
| **Location** | `executionGate.ts` `fetchProjectsMissingReference()` |
| **Current behavior** | First query fetches all approved projects with matching route; second query fetches their existing references; client-side diff. Could be a single `LEFT JOIN ... WHERE ref IS NULL` query. |
| **Classification** | LOW — functional, no correctness risk |
| **Fix** | Optional optimization. Defer. |

---

## 12. Recommended Step 10B Scope

### Must Do (closes HIGH gaps)

**10B-1 — Migration 092: Execution Reference Approval Guard (closes H-001 + H-002)**

Create `supabase/migrations/092_exec_ref_approval_guard.sql`:

1. Add BEFORE INSERT trigger on `project_execution_references` checking `projects.project_status = 'approved'` for the given `project_id`. Error message: "Execution reference gate: Cannot create {WO|PN} for project % — project must be approved before a WO or PN can be entered."

2. Replace `"exec_ref: factory_user wo"` (FOR ALL) with:
   - `"exec_ref: factory_user wo select"` FOR SELECT WHERE `reference_type = 'wo'`
   - `"exec_ref: factory_user wo insert"` FOR INSERT WITH CHECK `reference_type = 'wo'`
   - Remove UPDATE and DELETE for factory_user. Only admin/operations_manager can UPDATE or DELETE.

**10B-2 — WoPnGate.tsx: Cancel flow (closes H-003)**

Add cancel/supersede action to EditReferenceModal (admin/operations_manager only, `canConfirm` as guard):
- "Cancel Reference" button in footer
- Updates status to 'cancelled', records `recordProjectEvent` + `recordAuditEntry`
- After cancel, project reappears in "Missing WO/PN" list (handled by existing `fetchProjectsMissingReference()`)

### Should Do (closes MEDIUM gaps)

**10B-3 — WoPnGate.tsx: Timeline event for remarks save (closes M-002)**

Add `recordProjectEvent()` in `handleSave()` alongside existing `recordAuditEntry()`.

**10B-4 — WoPnGate.tsx: PageHeader alignment (closes M-003)**

Update import from `'../components/ui/PageHeader'` to `'@/components/common/page-header'`; remove `icon=` prop from JSX call.

### Design Decision Required

**10B-D1 — M-001: WO requirement vs. factory routing**

Before Step 10B implementation: confirm whether WO is required for ALL Saudi projects or only for Saudi projects where `factory` is checked in `project_department_routing`. Document the decision in the Step 10B doc. Do NOT change `getExecutionGateStatus()` until the decision is made.

### Not in Step 10B Scope

- Downstream factory/Dubai module visibility (Steps 11–15 per plan)
- `fetchProjectsMissingReference()` query optimization (L-001)
- `project_department_routing` integration into gate logic (pending D1 decision)
- R-007 (BOQ/BOM/RMR WO gate) and R-008 (Dubai ETA/AFS PN gate) — separate steps
- Any changes to factory pages, Dubai/AFS pages, or other module UIs

---

## 13. Items Intentionally Not Inspected

The following were explicitly out of scope for this audit per the task brief:

- QuotationNew, QuotationDetail, SalesCoordinator
- Procurement module logic (ProcurementRequests, PurchaseOrders, etc.)
- Store module logic
- Factory module pages (FactoryProjectWorkspace, FactoryMonthlyUpdates, etc.)
- Dubai/AFS module pages (DubaiAfsProjects, DubaiAfsArrivalReports, etc.)
- QC module pages
- After-Sales module
- Reports and Control Tower
- Unrelated pages (Dashboard, Notifications, Settings, etc.)

---

## 14. Confirmation — No Application Logic Changed

| Check | Result |
|-------|--------|
| Business logic changed | **No** |
| Schema changed | **No** |
| Migrations created | **No** |
| RLS changed | **No** |
| Route guards changed | **No** |
| Step 7 behavior changed | **No** |
| Step 8 behavior changed | **No** |
| Step 9 approval/routing behavior changed | **No** |
| Downstream module logic changed | **No** |

Only one new file was created: this audit document.

---

## 15. Validation Results

| Check | Result |
|-------|--------|
| `npm run build` | PASS (✓ built in 5.13s) |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | 79 problems (63 errors, 16 warnings) — **same as before Step 10A** |

---

## 16. Final Recommendation

**Proceed to Step 10B.**

The WO/PN gate architecture is sound. Migration 089's execution-side enforcement (TIER-1) is working. The three HIGH gaps (H-001, H-002, H-003) are all fixable in a single focused step:
- One migration (092) for the DB approval guard and RLS fix
- Source-only changes to WoPnGate.tsx for the cancel flow, timeline audit, and PageHeader alignment

Step 10B is bounded and well-understood. No design ambiguity exists for items 10B-1 through 10B-4. Design decision 10B-D1 (routing vs. location for WO requirement) should be confirmed at the start of Step 10B before implementation.
