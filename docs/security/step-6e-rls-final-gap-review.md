# Step 6E — RLS Final Gap Review and Step 6 Closure Recommendation

**Branch:** `audit/step-6-rls-final-gap-review`  
**Date:** 2026-06-14  
**Scope:** Documentation only — no migrations, no schema changes, no code changes.  
**Depends on:** Steps 6A → 6D (all merged)

---

## 1. Executive Summary

Step 6 has delivered a complete RBAC/RLS hardening layer across the FT Operations Portal. All originally identified Class-A gaps have been addressed. The four Product Owner-approved decisions from Step 6D-0 are fully implemented through migrations 082–085.

Five items were explicitly deferred from Step 6D. After reviewing each deferred item against the Step 7 scope (Sales & Quotation workflow), **none of them touch Step 7 tables or workflows**. Step 7 can begin without implementing any of the deferred items.

A separate gap exists on `quotation_requests` (`qr_coordinator_update` has no status-transition restriction) that was identified in Step 6B and not addressed in Steps 6C–6D. This gap **must be addressed as part of Step 7**, as it lives within the Step 7 domain.

**Recommendation: Close Step 6. Proceed to Step 7. Plan Step 6F as a post-Step-7 cleanup sprint for the deferred write-policy items.**

---

## 2. Step 6 Accomplishments

### Step 6A — Application RBAC Foundation

**Branch:** `feature/rbac-permission-foundation` (merged)  
**Files:** `src/hooks/usePermission.ts`, `src/components/auth/PermissionGate.tsx`, `src/app/App.tsx`

Delivered:
- `usePermission()` hook with a named `ROLE_PERMISSIONS` map covering 9 permission keys across all 10 roles
- `PermissionGate` component for conditional UI rendering by permission key
- Route guard fix for B-013: `/projects/new` was reachable by all authenticated roles; now wrapped with `RequireRole(['admin', 'operations_manager', 'sales_user'])`

No Supabase changes.

---

### Step 6B — RLS Evidence Review

**Branch:** `audit/rls-hardening-evidence-review` (merged)  
**File:** `docs/security/step-6b-rls-hardening-evidence-review.md`

Delivered:
- Comprehensive audit of 31 tables across 80 migrations at the time of review
- Classification of 14 focus tables: 5 Class A (urgent), 8 Class B (need clarification), 1 Class D (acceptable)
- Identified consistency gap: older migrations use `EXISTS (SELECT 1 FROM user_roles ...)` vs the SECURITY DEFINER `current_user_role()` pattern (cosmetic, not a security flaw)
- Manual test plan for each table
- Rollback considerations for each proposed change

No Supabase changes.

---

### Step 6C — QC/Release SELECT Restriction

**Branch:** `fix/qc-select-rls-restriction` (merged)  
**Migration:** `081_qc_select_restriction.sql`

Delivered:
- Replaced 5 `FOR SELECT USING (true)` policies across 5 QC/release tables with role-aware policies
- 10 new SELECT policies: `*_select_operational` (7 operational roles) + `*_select_sales` (own-project via `projects.created_by = auth.uid()`)
- sales_coordinator and procurement_user now receive zero rows on QC tables (no operational need)
- Safety review identified and fixed a critical error: original draft used `sales_owner_id` in the subquery; corrected to `created_by` to match the projects RLS pattern

Tables hardened: `material_qc_inspections`, `material_ncrs`, `project_qc_inspections`, `project_qc_findings`, `release_notes`

---

### Step 6D-0 — Product Owner Decision Pack

**Branch:** `docs/rls-class-b-decision-pack` (merged)  
**File:** `docs/security/step-6d0-class-b-rls-owner-decisions.md`

Delivered:
- Four structured decision questions with current-state SQL, risk analysis, recommended answers, and exact migration impact for each option
- Sign-off form for product owner
- All four questions answered and approved before Step 6D implementation

---

### Step 6D — Class-B Write Policy Hardening

**Branch:** `fix/class-b-rls-write-policy-hardening` (merged, safety-reviewed)  
**Migrations:** `082_medical_serial_numbers_rls_hardening.sql` through `085_procurement_and_store_write_rls_hardening.sql`

| Migration | Tables | Policies Dropped | Policies Created | Triggers Added |
|-----------|--------|-----------------|-----------------|----------------|
| 082 | `medical_serial_numbers` | 1 | 6 | 0 |
| 083 | `factory_records` | 1 | 3 | 0 |
| 084 | `approved_suppliers` | 2 | 4 | 1 (`trg_enforce_qc_supplier_fields`) |
| 085 | `procurement_requests`, `store_receipts`, `material_custody_records` | 3 | 5 | 2 (`trg_lock_receipt_number`, `trg_enforce_custody_approval`) |
| **Total** | **6 tables** | **7 policies** | **18 policies** | **3 triggers** |

Key achievements:
- qc_user DELETE blocked on medical serial numbers (regulatory compliance)
- factory_user DELETE blocked on factory records
- procurement_user DELETE blocked on procurement requests; terminal-state PRs immutable
- receipt_number immutable after INSERT (BEFORE UPDATE trigger, all roles)
- store_user self-approval of custody blocked (BEFORE INSERT OR UPDATE trigger)
- procurement_user blocked from self-approving medical/critical supplier eligibility
- qc_user field-level restriction on `approved_suppliers` (BEFORE UPDATE trigger, covers 13 prohibited columns)

Safety review during this step identified and fixed one blocking issue before merge: the original `sup_procurement_update` WITH CHECK evaluated the flag against the NEW row value, which would have locked procurement_user out of all updates on suppliers already approved for medical items. Fixed by moving the guard to the trigger (OLD vs NEW comparison).

---

## 3. Deferred Items Matrix

Five items were deferred from Step 6D and documented in `docs/security/step-6d-class-b-write-policy-hardening.md` §11.

| # | Item | Table | Policy | Role Risk | Business Risk | Page Break Risk | Step 7 Blocker | Recommendation |
|---|------|-------|--------|-----------|---------------|-----------------|----------------|----------------|
| D1 | factory_viewer_select project_status restriction | `factory_records` | `factory_viewer_select` | viewer + store_user see draft/rejected project production data | Low — no financial data; progress % and dates only | Low-Medium | No | Defer to Factory module phase |
| D2 | custody_records_factory_update WITH CHECK | `material_custody_records` | `custody_records_factory_update` | factory_user/afs_user can theoretically change issued_to_user_id | Low-Medium — custody chain integrity | Medium — acceptance flow uses this policy | No | Defer to Store/Custody module phase; needs UX review |
| D3 | store_user DELETE on store_receipts | `store_receipts` | `store_receipts_store_all` | store_user could delete receipt records | Medium — receipt audit trail | Medium — if delete UI exists | No | Requires PO decision: fix in Step 6F (delete receipts via status cancellation) |
| D4 | qc_user field restriction on medical_serial_numbers | `medical_serial_numbers` | `medical_serials_qc_update` | qc_user can change serial_number, expiry_date — regulatory compliance data | Medium-High — regulatory audit records | Low — QC workflow primarily uses qc_status and remarks | No | Fix in Step 6F before production deployment |
| D5 | Policy pattern normalization | Multiple older tables | Various | No security impact; cosmetic inconsistency | None | None | No | Known limitation; lowest priority |

### 3.1 Detailed Assessment — D1: factory_viewer_select Project Status Restriction

**Current state:** `factory_viewer_select` (migration 025, unchanged) grants `viewer` and `store_user` SELECT access to ALL factory records regardless of `project_status`. Approved projects, draft projects, and rejected projects are all visible.

**Gap:** Inconsistency with the pattern on other operational tables, where viewer/store reads are restricted to `project_status = 'approved'`.

**Why deferred:** Restricting `factory_viewer_select` to approved projects only requires verifying that no store UI pages load factory records for non-approved projects. Adding a project_status restriction now could silently hide records from pages that haven't been validated.

**When to fix:** When implementing the Factory module. The factory production page (if any) will clarify what project statuses are expected to appear in the store/viewer view.

---

### 3.2 Detailed Assessment — D2: custody_records_factory_update WITH CHECK

**Current state:** `custody_records_factory_update` (migration 034, unchanged):
```sql
CREATE POLICY custody_records_factory_update ON material_custody_records
  FOR UPDATE
  USING (... role IN ('factory_user', 'afs_user') AND issued_to_user_id = auth.uid());
-- No WITH CHECK — factory_user can change issued_to_user_id or any other field
```

**Gap:** factory_user or afs_user could theoretically change `issued_to_user_id` on their own custody record to transfer custody to themselves. There is no WITH CHECK preventing field modification outside the acceptance workflow.

**Why deferred:** The acceptance workflow (setting `receiver_decision`, `accepted_at`, `accepted_by`) uses this policy. Adding a WITH CHECK that restricts which fields can change requires a trigger (same reasoning as the supplier QC restriction). Without seeing the acceptance UI's exact field update pattern, there is a risk of breaking the acceptance flow.

**When to fix:** When implementing the Store/Custody module. The acceptance page's UPDATE payload will clarify the exact fields being set, making it safe to write a trigger.

---

### 3.3 Detailed Assessment — D3: store_user DELETE on store_receipts

**Current state:** `store_receipts_store_all` (migration 085) is FOR ALL for store_user, admin, operations_manager. store_user retains DELETE access. Step 6D hardened WITH CHECK and added receipt_number immutability but did not remove DELETE.

**Gap:** store_user can permanently delete a store receipt. If an error receipt needs to be removed, deletion should be the exception (admin-only) not the rule.

**Product owner decision needed:**
- Option A (recommended): Receipt deletion blocked for store_user. Errors corrected via remarks field or by admin deletion.
- Option B: Receipt deletion allowed only for receipts in `draft` status.

**When to fix:** Step 6F, after product owner confirms Option A or B. This is the lowest-complexity remaining item once the decision is made.

---

### 3.4 Detailed Assessment — D4: qc_user Field Restriction on medical_serial_numbers

**Current state:** `medical_serials_qc_update` (migration 082) gives qc_user UPDATE access to `medical_serial_numbers` with USING + WITH CHECK but no column-level restriction. qc_user could change `serial_number`, `batch_number`, `expiry_date`, `manufacturer`, `supplier_name`, and `current_status` — all outside QC's operational domain.

**Gap:** qc_user's legitimate UPDATE scope on medical serials is:
- `qc_status` (pass/fail/pending) — their primary field
- `remarks` — QC notes
- Potentially `current_status` (e.g., to mark 'in_custody' when handled by QC)

All other fields are set by store_user on receipt and should be immutable from qc_user's perspective.

**Risk level:** Medium-High — medical serial numbers feed the medical serial gate trigger (migration 077). If a qc_user modifies `expiry_date` or `serial_number`, regulatory traceability is compromised.

**Fix complexity:** Low — the same BEFORE UPDATE trigger approach used for `approved_suppliers.qc_user` restriction applies here. The fix is a short trigger function and one `DROP TRIGGER IF EXISTS / CREATE TRIGGER` statement.

**Recommendation:** **Implement in Step 6F before production deployment of the Store/QC module.** This is the highest-priority deferred item. It does not require a product owner decision — the restriction to qc-domain fields is clearly correct.

---

### 3.5 Detailed Assessment — D5: Policy Pattern Normalization

**Current state:** Migrations 015, 019, 021, 024, 025, 029, 030, 031, 034 (and others) use:
```sql
EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'x')
```

Migrations 061 onward use:
```sql
public.current_user_role() = 'x'
```

Both patterns are functionally equivalent. `user_roles` has its own RLS restricting each user to reading only their own row, so the EXISTS pattern cannot be subverted. `current_user_role()` is SECURITY DEFINER and more efficient.

**Risk:** None — purely cosmetic/consistency gap.

**Recommendation:** Known limitation. Defer indefinitely or batch into a dedicated normalization migration set in a cleanup phase. Never blocks any feature work.

---

## 4. Step 7 Dependency Analysis

Step 7 will implement the Sales & Quotation workflow, including:
- Sales workspace: quotation creation, customer selection
- Quotation flow: spec document requirements, submission to coordinator
- Sales Coordinator: review, return, PDF/value entry
- Quotation-to-SO readiness assessment
- Timeline and audit events for the quotation lifecycle

### 4.1 Step 6 Deferred Items vs Step 7 Tables

| Deferred Item | Affected Table | Step 7 Tables | Overlap? |
|--------------|----------------|---------------|----------|
| D1 factory_viewer_select | `factory_records` | None | ❌ No |
| D2 custody factory UPDATE | `material_custody_records` | None | ❌ No |
| D3 store_user DELETE | `store_receipts` | None | ❌ No |
| D4 qc_user medical serials | `medical_serial_numbers` | None | ❌ No |
| D5 pattern normalization | Multiple legacy tables | `quotation_requests` uses old pattern | ⚠️ Cosmetic only |

**Conclusion: Zero of the five deferred Step 6D items block or affect Step 7.**

### 4.2 Pre-Existing Quotation RLS Gap (NOT a Deferred Item — Class B from Step 6B)

The most relevant security concern for Step 7 is a gap identified in Step 6B (§3.10) that was NOT addressed in Steps 6C or 6D because it was outside the approved scope:

**`qr_coordinator_update` — no status-transition restriction.**

Migration 060 added `WITH CHECK` to `qr_coordinator_update`, but the check only confirms that the updater is still a `sales_coordinator`. It does NOT restrict which `quotation_status` values the coordinator may set.

**Current policy (migration 060):**
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

**Gap:** A `sales_coordinator` can set `quotation_status` to any value in the enum, including:
- `converted_to_so` — bypasses the formal quotation-to-SO conversion workflow (migration 067)
- `cancelled` — cancels a live quotation without admin/ops sign-off
- `closed_lost` — marks a lost deal without any approval gate

**Step 7 relevance:** HIGH. Step 7 will implement the coordinator review/return workflow. If the coordinator's status transitions are not DB-enforced, the workflow can be bypassed directly via the Supabase API.

**Recommendation for Step 7:** Include a `BEFORE UPDATE` trigger or a narrower `WITH CHECK` (using a status transition allowlist) on `quotation_requests` as part of the Step 7 implementation scope. The coordinator's permitted transitions are:
- `received_by_coordinator` → `sent_to_estimation` (route to estimator)
- `sent_to_estimation` → `waiting_for_estimation`
- `waiting_for_estimation` → `quotation_received`
- `quotation_received` → `returned_to_sales`
- Any status → `need_clarification` (request clarification)
- Any status → `cancelled` (debatable — may require admin)

### 4.3 Additional Step 7 Observations (Non-RLS)

These are not RLS gaps but context relevant to Step 7 planning:

1. **No customer master table.** Customer name is a free-text field on both `quotation_requests.customer_name` and `projects.customer_name`. Step 7 should determine whether to introduce a `customers` master table or continue with free-text (data integrity risk: spelling variations, no customer history view).

2. **quotation_total_value is unprotected.** `quotation_requests.quotation_total_value` is a financial field visible to `sales_coordinator` via `qr_coordinator_select`. Unlike `purchase_orders_to_supplier` (which has a safe view masking cost columns), `quotation_requests` has no equivalent cost protection. If Step 7 adds financial fields or quotation value visibility, this should be assessed.

3. **quotation_requests uses old policy pattern.** `qr_admin_all`, `qr_sales_select`, `qr_coordinator_select`, and `qr_coordinator_update` all use `EXISTS (SELECT 1 FROM user_roles ...)`. Step 7 policy additions should use `public.current_user_role()` for consistency.

---

## 5. Recommendation

### 5.1 Close Step 6

**Recommendation: Close Step 6 and proceed to Step 7.**

The rationale:
- All Class-A gaps from Step 6B are implemented and merged (5 tables, migration 081)
- All four Product Owner-approved decisions from Step 6D-0 are implemented (6 tables, migrations 082–085)
- Safety review caught and fixed one blocking issue during Step 6D (supplier procurement_user lockout)
- Five deferred items have been reviewed and confirmed to have zero overlap with Step 7 tables
- The deferred items that warrant implementation (D3, D4) do not require Step 7 completion to be fixed; they can be implemented in Step 6F in parallel with or immediately after Step 7

### 5.2 Risk Acceptance for Deferred Items

| Item | Accepted Risk Level | Accepted by | Condition |
|------|--------------------|----|------|
| D1 factory_viewer_select | Low — draft project data exposure to viewer/store_user | TBD | Fix deferred to Factory module phase |
| D2 custody factory UPDATE | Low-Medium — custody re-assignment risk | TBD | Fix deferred to Store/Custody module phase |
| D3 store_user DELETE | Medium — receipt deletion risk | TBD | Fix in Step 6F; PO decision required |
| D4 qc_user medical serials | Medium-High — regulatory record integrity | TBD | Fix in Step 6F before production deployment |
| D5 pattern normalization | None | N/A | Known limitation; defer indefinitely |

### 5.3 Step 6F Plan (Post-Step-7)

Step 6F should be a focused implementation sprint targeting in priority order:

1. **qc_user field restriction on medical_serial_numbers** — BEFORE UPDATE trigger restricting qc_user to `qc_status` and `remarks`. No product owner decision needed. Low break risk.

2. **store_user DELETE on store_receipts** — after product owner confirms Option A (no delete) or B (draft-only delete). One policy change + trigger.

3. **custody_records_factory_update WITH CHECK** — after UX review of the acceptance flow. One trigger.

4. **factory_viewer_select project_status restriction** — when the Factory module pages are built and validated.

5. **Policy pattern normalization** — optional batch cleanup. Lowest priority.

---

## 6. Owner Sign-Off Statement

*Awaiting product owner signature to close Step 6 and formally accept the deferred risks.*

```
Step 6 Closure Sign-Off
Date: _______________
Signed by: _______________  Role: _______________

I confirm that:
  [ ] Step 6A RBAC foundation is complete and acceptable.
  [ ] Step 6C QC/release SELECT restriction is complete and acceptable.
  [ ] Step 6D write policy hardening is complete and acceptable.
  [ ] The five deferred items (D1–D5) have been reviewed and their risks accepted.
  [ ] Step 7 may begin with the quotation coordinator gap addressed within Step 7 scope.
  [ ] Step 6F will be implemented before production go-live of the Store/QC module.

Signature: _______________  Date: _______________
```

---

## 7. Validation Results

```
npm run build        → ✅ Built successfully
npx tsc --noEmit     → ✅ No type errors
npm run lint         → ⚠️ 79 pre-existing problems (63 errors, 16 warnings) — unchanged
Supabase CLI         → Not available; no SQL files added
```

No code changed. No migrations created. No RLS changed.

---

## 8. Recommended Step 7 Prompt Outline

The following is a suggested prompt structure for Step 7. Step 7 must be self-contained and not assume any un-merged branches.

---

```
Task title: Step 7 — Sales & Quotation Workflow Implementation

Context:
Steps 1–6 complete and merged. Step 6 hardened RLS across all focus tables.
Step 7 scope: Sales workspace, quotation request lifecycle, coordinator workflow,
PDF/number entry, quotation-to-SO readiness.

Create branch: feature/sales-quotation-workflow

Read first:
  docs/CLAUDE_PROJECT_RULES.md
  docs/governance/playbook-to-system-mapping.md (Module 5 — Quotation Management)
  docs/governance/critical-governance-rules-register.md
  docs/security/step-6e-rls-final-gap-review.md   ← step 7 dependency section
  supabase/migrations/015_quotations.sql
  supabase/migrations/016_quotation_lines.sql
  supabase/migrations/017_quotation_documents.sql
  supabase/migrations/018_quotation_timeline.sql
  supabase/migrations/060_cost_protection.sql      ← existing coordinator policy
  supabase/migrations/067_convert_quotation_to_so.sql
  src/app/App.tsx                                  ← existing quotation routes
  [relevant quotation page files]

Scope:
  Part 1 — Quotation Coordinator Status Guard (REQUIRED before feature work):
    Add a BEFORE UPDATE trigger or tighter WITH CHECK on quotation_requests
    restricting coordinator to permitted status transitions only.
    Coordinator must NOT be able to set status = 'converted_to_so' directly;
    conversion must go through the formal convert_quotation_to_so flow.
    Coordinator must NOT cancel a quotation without admin/ops sign-off
    (or define cancellation rule with product owner).

  Part 2 — Quotation Feature Implementation:
    [Implementation details per Playbook §05-06]

Important:
  Same constraints as Step 6: do not broaden access, do not break existing
  project/quotation pages, use current_user_role() for any new policies.
  Do not modify Step 6 migrations.
```

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/security/step-6a-rbac-permission-foundation.md` | Step 6A: UI permission layer |
| `docs/security/step-6b-rls-hardening-evidence-review.md` | Step 6B: Evidence matrix and classification |
| `docs/security/step-6c-qc-select-rls-restriction.md` | Step 6C: QC SELECT implementation |
| `docs/security/step-6d0-class-b-rls-owner-decisions.md` | Step 6D-0: Owner decisions |
| `docs/security/step-6d-class-b-write-policy-hardening.md` | Step 6D: Write policy hardening |
| `docs/governance/critical-governance-rules-register.md` | Governance rules R-001–R-019 |
| `docs/CLAUDE_PROJECT_RULES.md` | Repository rules and role definitions |
