# Issues, Risks & CAPA Design

Phase 10

## Operational Issues

### Purpose
Capture operational blockers, risks, action items, escalations, and observations
that require tracking and resolution outside of existing workflow modules.

### Issue Number Format
ISS-YYYY-NNNN (e.g. ISS-2025-0001)

### Issue Types
- blocker: prevents a workflow from progressing
- risk: may cause problems if unaddressed
- action_item: a task assigned to a role
- observation: informational, no urgency
- escalation: elevated from another module

### Lifecycle
open → assigned → in_progress → waiting_input → resolved → closed
         ↓                                                    ↑
      cancelled ─────────────────────────────────────────────

### Closure Rule
closure_notes must be non-empty before an issue can be closed.
Only admin, operations_manager, or the assigned owner can close.

### Severity
low / medium / high / critical (same as IssueSeverity type)

---

## CAPA Records

### Purpose
Corrective and Preventive Action records. Linked to an operational issue
or an NCR. Used to ensure root causes are addressed and recurrence prevented.

### CAPA Number Format
CAPA-YYYY-NNNN (e.g. CAPA-2025-0001)

### Key Fields
- root_cause: what caused the problem
- corrective_action: what was done to fix it
- preventive_action: what prevents recurrence
- effectiveness_check_date: when to verify the fix worked
- effectiveness_result: outcome of the effectiveness check

### Lifecycle
draft → assigned → in_progress → pending_effectiveness_check → effective / ineffective → closed
                                                                     ↓
                                                                 cancelled

### Effectiveness Check Rule
effectiveness_result must be non-empty before moving to effective/ineffective.
Only admin or operations_manager can complete the effectiveness check.

### Linkage
- issue_id: links to an operational issue
- ncr_id: links to a material NCR (for quality-originated CAPAs)
- Can be standalone (both null) for process improvement CAPAs

---

## Integration with Existing Modules
- Material NCRs (Phase 8): CAPA can be linked to NCR via ncr_id
- Project QC findings (Phase 8): can raise an issue, then link CAPA
- AFS maintenance (Phase 9): can raise an issue for systemic problems
- SLA breaches (Phase 10): operations_manager should raise issue if repeated breach
