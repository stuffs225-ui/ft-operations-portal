# ETA Change History Design

## Purpose

Every change to an Expected Arrival Date (ETA) on a PO to Supplier or PR Item must be fully logged. This provides:
- Full audit trail of delivery date changes
- Accountability (who changed the ETA and why)
- Visibility into supplier reliability and delay patterns
- Basis for escalation decisions

## What is Recorded

Each record in `eta_change_history` contains:

| Field | Description |
|---|---|
| entity_type | 'po_to_supplier' or 'pr_item' |
| entity_id | UUID of the PO or PR Item being updated |
| project_id | Associated project (nullable) |
| old_eta | Previous expected arrival date (nullable for first ETA set) |
| new_eta | New expected arrival date (nullable if ETA removed) |
| reason | Free text — why the ETA changed (required) |
| remarks | Optional additional context |
| changed_by | UUID of the user who made the change |
| changed_at | Timestamp of the change (default: now()) |

## Entity Types

### po_to_supplier
ETA tracked at the PO level — when a supplier delays or advances delivery of the entire PO.

### pr_item
ETA tracked at the item level — when a specific item's expected arrival changes independently of the PO.

## Who Can Update ETAs

- `procurement_user`: Can update ETAs on any PO or PR item
- `admin`, `operations_manager`: Can update ETAs

Factory, Store, QC, AFS, and Viewer roles cannot update ETAs.

## ETA Update Flow

1. User navigates to PO Detail → ETA Management tab
2. Enters new ETA date (required), reason (required), remarks (optional)
3. On submit:
   - `eta_change_history` record created with old_eta (current value), new_eta (new value), reason, remarks
   - PO `eta_date` field updated
   - If the ETA moved past today → po_status can be set to 'delayed'
4. All changes are displayed in reverse-chronological order in the ETA history table

## Days Delta

The ETA History page shows a "Days Delta" column:
- Positive (delay): ETA moved further into the future → shown in red
- Negative (improvement): ETA moved earlier → shown in green
- Zero: same date

## Displayed Information

The ETA History page at /procurement/eta-history shows all changes across all entities. Filterable by:
- entity_type (PO to Supplier / PR Item)
- Searchable by entity_id or reason text

The ETA Management tab on each PO Detail shows history scoped to that PO only.
