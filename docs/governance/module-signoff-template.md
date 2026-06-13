# Module Sign-Off Template

**Document:** Step 3 — Playbook-to-System Mapping  
**Branch:** `audit/playbook-to-system-mapping`  
**Date:** 2026-06-13

---

## Purpose

This template is used to formally close a playbook module after its implementation gaps have been addressed. Complete one copy of this template per module before marking it as "signed off" in `docs/governance/playbook-module-status-matrix.md`.

A module is only signed off when:
1. All CRITICAL and HIGH gaps are resolved
2. All DB-layer governance rules for this module pass bypass tests
3. The implementation has been reviewed by the session that completed it

---

## How to Use

1. Copy this entire file to: `docs/governance/signoffs/MODULE-##-signoff.md`
2. Fill in every field
3. Run the sign-off tests defined in `docs/governance/critical-governance-rules-register.md` for any rules in this module
4. Commit the completed sign-off document alongside the implementation commit
5. Update `docs/governance/playbook-module-status-matrix.md`: change status to ✅ and mark "Sign-off Ready: Yes ✅"

---

## Sign-Off Document

```
MODULE SIGN-OFF RECORD
======================

Module Number:       [e.g., 10]
Module Name:         [e.g., Procurement & PO Approval]
Playbook Section:    [e.g., Section 10]
Date Signed Off:     [YYYY-MM-DD]
Implementation PR:   [PR number or branch name]
Signed Off By:       [Claude Code session ID or human reviewer]

---

PRIOR STATUS
============

Status Before:       [✅ / ⚠️ / 🔴 / 🏗️]
Risk Level Before:   [CRITICAL / HIGH / MEDIUM / LOW]
Key Gaps Before:     
  - [List each gap that existed at audit time]
  - [Reference backlog items e.g., B-001]

---

CHANGES MADE
============

Migration Files Created:
  - [e.g., supabase/migrations/076_release_note_gate.sql]
  - [Description of what each migration does]

Source Files Modified:
  - [e.g., src/pages/qc/ReleaseNote.tsx — removed mock gate logic]
  - [Only list if UI changes were required to align with DB enforcement]

Backlog Items Closed:
  - [e.g., B-001 — Release Note DB trigger]
  - [e.g., B-002 — Medical serial trigger]

---

GOVERNANCE RULES VERIFIED
==========================

For each governance rule covered by this module:

Rule ID:             [e.g., R-015]
Rule Description:    [e.g., Release Note cannot be issued with open QC findings]
Enforcement Before:  [e.g., NONE]
Enforcement After:   [e.g., TIER-1 (DB) — trigger on release_notes table]
Test A (DB bypass):  [PASS / FAIL — describe the test and result]
Test B (UI path):    [PASS / FAIL — describe the test and result]
Test C (role bypass): [PASS / FAIL / N/A — describe the test and result]

[Repeat for each rule in this module]

---

REMAINING GAPS (if any)
========================

If any MEDIUM or LOW gaps remain that were not addressed in this implementation:

Remaining Gap:       [Description]
Reason Not Fixed:    [e.g., depends on Phase 10 SLA scheduler]
Backlog Item:        [e.g., B-006]
Impact:              [e.g., SLA breach not auto-escalated, but can be triggered manually]

---

SIGN-OFF DECISION
=================

All CRITICAL risks resolved:   [ YES / NO ]
All HIGH risks resolved:       [ YES / NO ]
DB bypass tests passed:        [ YES / NO ]
UI path tests passed:          [ YES / NO ]
Implementation matches playbook: [ YES / NO ]

Decision:   [ APPROVED / CONDITIONAL / REJECTED ]

If CONDITIONAL — state the condition:
  [e.g., "Approved pending B-006 SLA scheduler in Phase 10"]

If REJECTED — state the reason:
  [e.g., "Test A failed for R-015 — trigger not blocking direct INSERT"]

Notes:
  [Any additional notes about the implementation or remaining work]
```

---

## Sign-Off Checklist

Before completing the sign-off record, verify each item:

### Pre-Implementation
- [ ] Module's section in `docs/governance/playbook-to-system-mapping.md` was read in full
- [ ] All governance rules for this module were identified in `docs/governance/critical-governance-rules-register.md`
- [ ] Migration gold standard (`supabase/migrations/061_po_approval_guard.sql`) was reviewed before writing any migration
- [ ] License of any new third-party pattern was verified in `docs/reference-library/05-license-risk-notes.md`

### During Implementation
- [ ] No existing migration files were modified (migrations are immutable)
- [ ] New migrations use sequential numbering after the last existing migration
- [ ] All DB triggers include a clear error message explaining what is missing
- [ ] RLS policies were added alongside any triggers (dual-layer pattern)
- [ ] No UI changes bypass or weaken an existing governance gate

### Post-Implementation
- [ ] Test A (DB bypass): Confirmed governance rule cannot be bypassed by direct Supabase call
- [ ] Test B (UI path): Confirmed normal UI workflow is not broken
- [ ] Test C (role): Confirmed rule applies regardless of user role
- [ ] Backlog items closed in `docs/system-audit/11-prioritized-gap-backlog.md` (mark as complete with date)
- [ ] Module status updated in `docs/governance/playbook-module-status-matrix.md`
- [ ] Governance rule enforcement tier updated in `docs/governance/critical-governance-rules-register.md`

---

## Example: Completed Sign-Off (Module 10)

Module 10 (Procurement & PO Approval) is the only module that has passed sign-off at the time of Step 3. Its sign-off record would look like:

```
MODULE SIGN-OFF RECORD
======================

Module Number:       10
Module Name:         Procurement & PO Approval
Playbook Section:    Section 10
Date Signed Off:     [Date migration 061 was merged]
Implementation PR:   [PR that included migration 061]
Signed Off By:       Original implementation team

---

PRIOR STATUS
============

Status Before:       ⚠️ (partial — PO approval UI only)
Risk Level Before:   HIGH
Key Gaps Before:     
  - PO > 10,000 SAR gate was UI-only
  - No DB-level block for sending unapproved POs

---

CHANGES MADE
============

Migration Files Created:
  - supabase/migrations/061_po_approval_guard.sql
    Dual-layer enforcement: RLS policy blocking unapproved PO status
    change + BEFORE UPDATE trigger raising exception

---

GOVERNANCE RULES VERIFIED
==========================

Rule ID:             R-009
Rule Description:    PO > 10,000 SAR requires Admin/Ops Manager approval
Enforcement Before:  TIER-3 (UI)
Enforcement After:   TIER-1 (DB) — dual layer via migration 061
Test A (DB bypass):  PASS — direct UPDATE to 'sent_to_supplier' rejected by trigger
Test B (UI path):    PASS — approval flow works correctly
Test C (role bypass): PASS — RLS policy blocks procurement_user from bypassing

Rule ID:             R-010
Rule Description:    PO cannot be active without approval
Enforcement Before:  TIER-3 (UI)
Enforcement After:   TIER-1 (DB) — covered by same migration
Test A (DB bypass):  PASS
Test B (UI path):    PASS
Test C (role bypass): PASS

---

SIGN-OFF DECISION
=================

All CRITICAL risks resolved:   YES
All HIGH risks resolved:       YES
DB bypass tests passed:        YES
UI path tests passed:          YES
Implementation matches playbook: YES

Decision:   APPROVED
```

---

## Notes on Dual-Layer Enforcement Pattern

When writing a new migration for a governance rule, always implement both layers:

**Layer 1 — RLS Policy** (blocks unauthorized role from performing the operation):
```sql
CREATE POLICY "policy_name"
ON table_name
FOR UPDATE
TO authenticated
USING (
  -- Allow only roles that can approve
  current_user_role() IN ('admin', 'operations_manager')
  OR
  -- Allow the status change only if approved
  (status_column != 'blocked_status')
);
```

**Layer 2 — BEFORE Trigger** (enforces business rule even for authorized roles):
```sql
CREATE OR REPLACE FUNCTION enforce_rule_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'blocked_status' AND [condition] THEN
    RAISE EXCEPTION 
      'Rule violated: [clear description of what is missing]. [What user must do to fix it].';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_name
BEFORE INSERT OR UPDATE ON table_name
FOR EACH ROW EXECUTE FUNCTION enforce_rule_name();
```

See `supabase/migrations/061_po_approval_guard.sql` for the production example.
