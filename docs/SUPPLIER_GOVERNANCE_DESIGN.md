# Supplier Governance Design

## Overview

All external suppliers used in PO to Supplier issuance must be registered in the `approved_suppliers` table. This table is the single source of truth for supplier qualification status.

## Supplier Procurement Statuses

| Status | Meaning |
|---|---|
| draft | Supplier record created but not yet reviewed |
| pending_review | Submitted for procurement team review |
| approved | Fully approved for procurement use |
| approved_with_conditions | Approved with restrictions (see procurement_remarks) |
| suspended | Temporarily suspended — do not issue new POs |
| blacklisted | Permanently banned — must not be used |
| inactive | No longer active — historical record only |

## Supplier QC Statuses

| Status | Meaning |
|---|---|
| not_assessed | QC has not assessed this supplier |
| assessed | QC review underway |
| approved | QC-approved supplier |
| approved_with_conditions | QC-approved with specific conditions |
| rejected | Failed QC assessment — cannot be used for critical items |

## Special Flags

### approved_for_medical_items
- If `true`: supplier is cleared to supply medical equipment (per SFDA requirements)
- Medical items require serial number tracking on receipt
- Only suppliers with this flag can be used on PRs with medical_items=yes

### approved_for_critical_items
- If `true`: supplier is cleared for critical path items (fire fighting systems, hydraulics, etc.)
- Critical items are subject to stricter QC inspection on receipt

## Quality Rating (1–5)

| Rating | Meaning |
|---|---|
| 5 | Excellent — preferred supplier |
| 4 | Good — reliable performance |
| 3 | Acceptable — some issues, monitor closely |
| 2 | Below average — use with caution |
| 1 | Poor — escalate to review |
| null | Not yet rated |

## Who Manages What

| Role | Can View | Procurement Status | QC Status | Quality Rating |
|---|---|---|---|---|
| admin | All suppliers | ✅ Update | ✅ Update | ✅ Update |
| operations_manager | All suppliers | ✅ Update | ✅ Update | ✅ Update |
| procurement_user | All suppliers | ✅ Update | ❌ | ❌ |
| qc_user | All approved suppliers | ❌ | ✅ Update | ✅ Update |
| Others | Approved/conditions only | ❌ | ❌ | ❌ |

## Conditions for Use

A supplier with `approved_with_conditions` status:
- Can be used, but procurement_remarks must be read first
- May require second quote for large orders
- May be limited to non-critical items

## Suspended/Blacklisted Rules

- **Suspended**: No new POs may be issued. Existing open POs should be reviewed.
- **Blacklisted**: No new POs. Existing POs must be escalated to Operations Manager.

## Supplier Onboarding Process (Future Phase)

In a future phase, supplier onboarding will include a formal review workflow with document upload (trade license, ISO certificates, SFDA registration). For now, supplier records are created manually by procurement_user or admin.
