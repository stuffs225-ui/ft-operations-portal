# Factory Workflow Design

## Overview
The Factory module manages Saudi manufacturing projects after WO approval. It tracks production progress at vehicle/item line level, manages BOQ/BOM/drawing requirements, and handles raw material requests to Procurement.

**Key rule: WO is mandatory before any factory action.**

## Production Status Lifecycle

```
not_started
  → details_requested
  → boq_pending → boq_uploaded
  → ga_drawing_pending → ga_drawing_uploaded
  → detail_drawings_pending → detail_drawings_uploaded
  → manhours_pending → manhours_added
  → pending_raw_materials
  → in_production
  → monthly_update_required (can return to in_production after update)
  → production_completed
  → sent_to_qc (Phase 8)
  → on_hold (any point)
```

## WO Gate

- WO (`execution_references` with `reference_type='wo'` and `status='confirmed'`) must exist for the project
- All factory record create/update actions are blocked if no confirmed WO
- UI shows prominent warning and link to WO/PN Gate
- This is enforced both in the UI and should be enforced via DB policy in production

## Requirement Types (factory_requirement_types)

| Name | Purpose |
|---|---|
| BOQ | Bill of Quantities — lists items and quantities |
| BOM | Bill of Materials — materials list for manufacturing |
| GA Drawing | General Arrangement Drawing — overall layout |
| Detail Drawings | Detailed engineering drawings for each component |
| Required Manhours | Estimated labor hours |
| Pending Raw Materials | Materials awaiting procurement/delivery |
| Production Plan | Schedule and milestones |
| Other | Miscellaneous requirements |

## Role Matrix

| Role | View Factory | Update Records | Create RMR | See Costs |
|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ❌ (no purchase costs) |
| operations_manager | ✅ | ✅ | ✅ | ❌ |
| factory_user | ✅ | ✅ | ✅ | ❌ |
| procurement_user | RMRs only | ❌ | ❌ | N/A |
| sales_user | Own projects (high-level) | ❌ | ❌ | ❌ |
| store_user | RMR status only | ❌ | ❌ | ❌ |
| qc_user | Completion status | ❌ | ❌ | ❌ |
| viewer | Read-only | ❌ | ❌ | ❌ |

## Monthly Updates

Factory records with `monthly_update_required=true` or `production_status='monthly_update_required'` appear in the Monthly Updates queue. Factory users must submit an updated progress % and remarks to clear the flag.

## Audit Events

| Event | Trigger |
|---|---|
| factory_record_created | New factory record created |
| factory_status_updated | Production status changed |
| boq_uploaded | BOQ requirement marked uploaded |
| bom_uploaded | BOM requirement marked uploaded |
| ga_drawing_uploaded | GA Drawing marked uploaded |
| detail_drawing_uploaded | Detail Drawings marked uploaded |
| manhours_added | Required Manhours value added |
| raw_material_request_created | New RMR created |
| raw_material_request_sent_to_procurement | RMR status → sent_to_procurement |
| production_completed | Status → production_completed |
