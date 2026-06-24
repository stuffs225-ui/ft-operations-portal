# Module 05 — Store / Warehouse

## Accounts with Access
`store`, `coo`, `ops`, `admin`, `stuffs` + custody also accessible to `factory`, `afs`

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/store` | Store Dashboard | store_user, operations_manager |
| `/store/receipts` | Store Receipts | same |
| `/store/receipts/new` | New Store Receipt | same |
| `/store/vehicle-receiving` | Vehicle Receiving List | same |
| `/store/vehicle-receiving/new` | New Vehicle Receiving | same |
| `/store/inventory` | Inventory | same |
| `/store/issuance` | Material Issuance | same |
| `/store/serials` | Serialized Items | same |
| `/store/qc-handoff` | QC Handoff | same |
| `/store/unallocated` | Unallocated Materials | same |
| `/custody` | Material Custody | store/factory/afs/ops |
| `/custody/new` | New Custody | same |
| `/vehicle-receiving` | Vehicle Receiving (legacy) | store_user, ops |
| `/reports/store` | Store Reports | store_user, ops |

## Review Checklist

- [ ] Store dashboard shows inventory health KPIs (low stock alerts, pending QC)
- [ ] Vehicle receiving form has chassis number field and photo upload section
- [ ] Serialized items list shows serial numbers prominently
- [ ] QC handoff list is actionable (clear which items are waiting)
- [ ] Unallocated materials shows urgency / age of unresolved items
- [ ] Custody approval status clearly shown (pending Admin/Ops approval)

## Artifact Instructions

Vehicle receiving requires 5 photos — this requirement must be surfaced in any redesign.
Material custody requires approval — do not simplify away the approval state.
