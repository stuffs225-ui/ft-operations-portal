# E2E Scenario S11 — Two Full Orders: KSA + Dubai

**Scenario code:** `S11-two-full-orders-ksa-dubai` · **Action option:** `S11`
**Display name:** S11 — Two Full Orders KSA + Dubai

Seeds two realistic, non-identical operational orders end-to-end, tagged
`E2E_SCENARIO_SEED run_id=<id> scenario=S11-two-full-orders-ksa-dubai` and fully
removable by run-scoped cleanup. ~59 rows across 16 tables.

## Order 1 — KSA Ambulance (`E2E S11 KSA Ambulance Full Flow`)

Customer **E2E-\<sid\> KSA Ministry Medical Services** · `manufacturing_location='saudi'`
· `medical_items='yes'` · SO `E2E-<sid>-SO-11K` · value 950,000.

| Step | Table(s) | State seeded |
|------|----------|--------------|
| Quotation | `quotation_requests` | `converted_to_so`, priority `medium` |
| Quotation lines ×6 | `quotation_request_lines` | conversion pkg, stretcher, O₂ bracket, cabinet set, suction unit, defib mount (Type III Ambulance) |
| Project + vehicle line | `projects`, `project_vehicle_lines` | `active`, 2× Type III Ambulance line |
| Factory | `factory_records` | `production_status='in_production'`, 45%, monthly update required |
| Procurement | `procurement_requests` (+6 items) | `partially_ordered` |
| PO (high-value) | `purchase_orders_to_supplier` (+2 `purchase_order_items`) | SAR 45,000 → `approval_required=true`, `approval_status='approved'`, `po_status='partially_received'` |
| Store — full | `store_receipts` + 2 items | GRN-11K1 `accepted`: stretchers `in_store`; defib kits `accepted_by_qc` + serial `passed` |
| Store — **partial** | `store_receipts` + 1 item | GRN-11K2 `partially_received`: suction 1 of 2 (the pending-material condition) |
| QC | `material_qc_inspections` | `completed` / `accepted` |
| Serials | `medical_serial_numbers` | `passed` / `in_store` |
| Invoicing | trigger line + `project_invoicing_schedule` (`admin_manual`, +15d) | schedule visible |
| Receivables | `project_invoicing_plans` + 2 milestones | Advance 30% `paid`; Progress 40% `approved` (outstanding receivable) |

## Order 2 — Dubai / AFS (`E2E S11 Dubai AFS Full Flow`)

Customer **E2E-\<sid\> Dubai Private Hospital Group** · `manufacturing_location='dubai'`
· SO `E2E-<sid>-SO-11D` · value 480,000.

| Step | Table(s) | State seeded |
|------|----------|--------------|
| Quotation + 6 lines | `quotation_requests`, `quotation_request_lines` | VIP Box Ambulance: conversion, interior panel, IV rail, sharps holder, O₂ regulator, first-aid cabinet |
| Project + vehicle line | `projects`, `project_vehicle_lines` | `active`, 1× VIP Box Ambulance |
| Procurement | `procurement_requests` (+3 items) | `fully_ordered` |
| PO | `purchase_orders_to_supplier` (+2 items) | SAR 8,500, no approval, `fully_received` |
| Store | `store_receipts` + 2 items | `accepted`, items `in_store` |
| **Vehicle receiving** | `vehicle_receipts` (linked to project + vehicle line) | chassis `E2E<sid>CHS11D`, `accepted` |
| **5-photo gate** | `vehicle_receipt_photos` ×5 | `front, rear, left_side, right_side, chassis_plate` — all with `storage_path` → 5/5 complete |
| QC handoff | `material_qc_inspections` | `completed` / `accepted` |
| **Dubai / AFS** | `dubai_project_followups` | `dubai_status='handed_to_afs'`, `eta_status='arrived'` (delivery preparation pending) |
| Invoicing | trigger line + manual schedule line (+25d) | schedule visible |
| Receivables | plan + 2 milestones | Advance 50% `paid`; Delivery 50% `submitted` (awaiting approval) |

All enum values verified against migrations + `database.ts`: `quotation_status`
(015), `quotation_priority` (015), `manufacturing_location_enum` /
`medical_items_enum` (009), `production_status` (025), `dubai_status_enum` /
`eta_status_enum` (041), receipt/item/vehicle/serial/custody unions, milestone
statuses (`submitted/approved/overdue/paid`).

## Not safely seedable (documented, not guessed)

- **AFS arrival / predelivery / missing-item / condition reports** — this schema
  section is hand-maintained with loose index signatures; NOT NULL columns
  unverifiable. The Dubai order's AFS stage is represented by
  `dubai_project_followups` (`handed_to_afs` / `arrived`) instead.
- **Project-level QC rework / release-note chain** — constraint set not
  verifiable enough for a consistent chain; material-level QC covers QC state.
- **Deep factory execution** (item requirements, raw-material requests) —
  WO-gate coupling; represented by the `factory_records` `in_production` row.
- **Storage binaries** — photo rows carry `storage_path` strings only.
- **PN readiness** (`project_execution_references`) — not seeded; the
  `dubai_project_followups.pn_reference_id` is left null (valid).

## Route / role visibility expected

| Route | Roles (guard) | S11 evidence |
|-------|---------------|--------------|
| `/projects`, `/quotations` | all authenticated | SO-11K/11D, both customers |
| `/procurement/requests`, `/procurement/purchase-orders` | procurement, ops, admin | PR-11K/11D, PO-11K (≥10K flag) / PO-11D |
| `/store/receipts` | store, ops, admin | GRN-11K1 (accepted), GRN-11K2 (**partial**), GRN-11D |
| `/store/vehicle-receiving` | store, ops, admin | CHS11D with **5/5 photo meter** |
| `/store/serials`, `/store/qc-handoff` | store, ops, admin | SER-11K passed; QCI accepted |
| `/factory` | factory, ops, admin | in-production record |
| `/dubai-afs` | afs, ops, admin | handed-to-AFS followup |
| `/admin/invoicing-schedule` | admin | trigger + manual schedule lines |
| `/receivables`, `/sales` | sales/ops/viewer/admin | outstanding milestones |

The Playwright spec's **S11 seeded-data visibility** block (enabled when
`E2E_RUN_ID` is set — wired automatically by the GitHub Action) asserts the
run's own `E2E-<shortid>` references are visible on the six deterministic list
pages (projects, quotations, PRs, POs, receipts, vehicle receiving) for
sales/procurement/store roles. Dashboards and gated pages keep their existing
render/deny checks. Roles without credentials skip unless `strict_auth=true`.

## Report statuses

The run report (`artifacts/e2e-full-workflow/<run_id>.md`) marks every record
**Created** (Key-records section with table, reference, id), **Validated**
(validate mode appends per-table presence), **Step errors** (any failed
insert), and a fixed **Not safely seedable** block — nothing is silently
skipped. Playwright reports credential-skips per role in its own summary.
