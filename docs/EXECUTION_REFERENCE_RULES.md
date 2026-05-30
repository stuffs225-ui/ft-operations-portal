# Execution Reference Rules

## Governing Principles

The execution reference gate enforces the Playbook v3.2 governance rules:

> **WO is mandatory before Saudi factory execution.**
> **PN is mandatory before Dubai follow-up.**

These are hard gates — not advisory warnings. No process step in the Saudi or Dubai execution chain may begin without the respective reference being in place.

## Rule Matrix

### Saudi Route (Work Order — WO)

**Blocked until WO is entered:**
- BOQ (Bill of Quantities) creation
- BOM (Bill of Materials) creation
- Technical drawings issuance
- Raw material requests
- Production progress logging
- Factory scheduling

**Who can enter a WO:**
- Factory User (`factory_user`)
- Operations Manager (`operations_manager`)
- Admin (`admin`)

**WO number format:** `WO-YYYY-NNNN` (e.g. WO-2025-0041)

### Dubai Route (Part Number — PN)

**Blocked until PN is entered:**
- Dubai ETA tracking
- Dubai PO (to local Dubai supplier)
- AFS readiness checks
- Dubai shipping coordination

**Who can enter a PN:**
- Operations Manager (`operations_manager`)
- Admin (`admin`)

**PN number format:** `PN-YYYY-NNNN` (e.g. PN-2025-0018)

## Reference Lifecycle

### Creation

1. Approved project with correct route (Saudi/Dubai) is visible in WoPnGate page under "Missing" section.
2. Authorised user enters reference number + optional remarks.
3. Reference created with `status = 'created'`.
4. Timeline event written: `wo_created` or `pn_created`.
5. Audit entry logged.

### Confirmation

1. Operations Manager or Admin reviews the reference.
2. Confirms by clicking "Confirm" in the edit modal.
3. Status changes to `confirmed`.
4. Timeline event written: `wo_confirmed` or `pn_confirmed`.

### Superseding

When a reference must be replaced (e.g. WO number changed by ERP):

1. Existing active reference is marked `superseded`.
2. New reference is created.
3. Timeline event written recording the transition.

### Cancellation

If a project is cancelled or re-routed:

1. Active reference is marked `cancelled`.
2. All historical references remain in the table for audit trail.

## Enforcement Points

### Database Layer

The SQL function `can_start_saudi_factory(project_id)` returns `TRUE` only when:
- Project status = `approved`
- Manufacturing location = `saudi`
- EXISTS an active (status IN `created`, `confirmed`) WO reference

The equivalent `can_start_dubai_followup(project_id)` applies the same logic for Dubai + PN.

These functions are `security definer stable` and may be used inside RLS policies or as pre-condition checks in API routes.

### Application Layer

`getExecutionGateStatus(project, references)` is the client-side equivalent. It is called:
- In the ProjectDetail Overview tab (WoPnGateCard component)
- In the WoPnGate dashboard page before rendering action buttons
- In any future page that must conditionally block a workflow step

### Future Enforcement Points (Phase 4+)

When Procurement, Factory, Store, and AFS modules are built, each workflow entry point must call `can_start_saudi_factory` or `can_start_dubai_followup` before allowing the user to proceed. UI pages must render a gate-blocked state and link to `/wo-pn-gate` for resolution.

## Data Integrity Rules

1. **One active reference per project per type**: Enforced by partial unique index. Attempting to insert a second WO for the same project (while one is `created` or `confirmed`) will fail with constraint violation `exec_ref_one_active_per_project`.

2. **Type-location consistency**: A WO reference must have `manufacturing_location = 'saudi'`; a PN reference must have `manufacturing_location = 'dubai'`. Enforced by CHECK constraint `exec_ref_location_type_match`.

3. **Globally unique reference numbers per type**: The same WO number cannot be reused across different projects. Enforced by `exec_ref_number_type_unique` UNIQUE constraint.

## Terminology

| Term | Meaning |
|---|---|
| WO | Work Order — the Saudi factory execution reference |
| PN | Part Number — the Dubai follow-up execution reference |
| Active reference | Status is `created` or `confirmed` |
| Gate blocked | Project is approved + correct route but has no active reference |
| PO to Supplier | Purchase Order issued to an external supplier (never abbreviated as "BO") |
