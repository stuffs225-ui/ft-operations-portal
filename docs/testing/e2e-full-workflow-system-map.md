# E2E Full-Workflow — System Map

How the business workflow maps onto the **actual discovered schema** (from
`src/types/database.ts`, verified against migrations). No table names are
invented; anything not safely representable is listed at the bottom.

## Workflow chain → tables

| Stage | Tables (actual) | Key columns used by the seeder |
|-------|-----------------|-------------------------------|
| 1. Quotation | `quotation_requests` | `customer_name` (req), `quotation_status`, `sales_remarks` (tag) |
| 2. SO / Project | `projects` | `so_number` (req), `customer_name` (req), `customer_delivery_date` (req), `project_status`, `total_sales_value`, `notes` (tag). **AFTER INSERT trigger** (migration 100) auto-creates one `project_invoicing_schedule` line per project |
| 3. Procurement PR | `procurement_requests`, `procurement_request_items` | `pr_number`, `status`, `remarks` (tag); items: `item_name`, `quantity_required` |
| 4. PO to Supplier | `purchase_orders_to_supplier` | `po_number`, `purchase_value`, `approval_required`, `approval_status`, `po_status`, `eta_date`, `remarks` (tag). ≥ SAR 10,000 → approval gate |
| 5. Store receiving | `store_receipts`, `store_receipt_items` | `receipt_number`, `received_by` (profile id), `status` (`draft…closed`), item `status` (`received…lost_or_damaged`), `serial_required`, `remarks` (tag) |
| 5b. Vehicle receiving | `vehicle_receipts`, `vehicle_receipt_photos` | `chassis_number` (unique), 5 required `photo_type`s: `front, rear, left_side, right_side, chassis_plate`; a photo only counts when `storage_path` is set |
| 5c. Serials | `medical_serial_numbers` | `serial_number`, `qc_status` (`not_checked/pending_qc/passed/failed`), `current_status` |
| 5d. Custody | `material_custody_records` | `issue_type`, `approval_required/approval_status`, `receiver_decision`, `status`, `issued_by` (profile id) |
| 6. Factory | `factory_records` | `project_id` (only safely-known required column; deeper factory chain not seeded) |
| 7. Material QC | `material_qc_inspections` | `inspection_status` enum (`pending/in_progress/completed/cancelled`), `inspection_result` enum (`pending/accepted/accepted_with_comments/rejected/pending_supplier_clarification/pending_rework`) |
| 7b. NCR | `material_ncrs` | `material_qc_inspection_id` (req), `ncr_status` enum (`open…cancelled`), `severity` enum (`low/medium/high/critical`), `description` (req) |
| 8. AFS / delivery | `dubai_project_followups` (seeded); `afs_arrival_reports`, `afs_predelivery_reports`, `afs_missing_items` (**not seeded** — see below) | followup: `project_id` (req), statuses defaulted |
| 9. Invoicing | `project_invoicing_schedule` (+ trigger-created default line), `project_invoicing_schedule_history` | `invoice_amount` (req), `current_invoice_date` (req), `status`, `source='admin_manual'` for the explicit overdue line |
| 10. Receivables | `project_invoicing_plans`, `project_invoice_milestones` | plan: `project_id`; milestone: `plan_id` (req), `milestone_name` (req), `milestone_status` (`submitted/approved/overdue/paid`), `amount`, `paid_amount` |

## Auth / actor columns

`store_receipts.received_by`, `vehicle_receipts.received_by`,
`vehicle_receipt_photos.uploaded_by`, `material_custody_records.issued_by`
are NOT NULL profile references. The seeder resolves one existing `profiles.id`
at runtime (read-only lookup) — it never creates or modifies users.

## Trigger interactions

Inserting into `projects` fires the migration-100 `AFTER INSERT` trigger, which
creates one default `project_invoicing_schedule` line per project. These rows
are **not directly tagged** but belong exclusively to the run's tagged projects;
cleanup removes `project_invoicing_schedule` / `_history` rows **by the run's
project ids** (still strictly run-scoped).

## Not safely seedable yet (documented, not guessed)

| Area | Reason |
|------|--------|
| `afs_arrival_reports` / `afs_predelivery_reports` / `afs_missing_items` / `afs_condition_reports` | This section of `database.ts` is hand-maintained with loose index signatures (`[key: string]: unknown`), so NOT NULL columns cannot be verified from types. Seeding could fail or half-write. S09 seeds the `dubai_project_followups` stage only. |
| Project-level QC rework chain (`project_qc_inspections` → `project_qc_findings` → `release_notes`) | `project_qc_findings` requires a `project_qc_inspection_id`; the inspection table's full constraint set (readiness enums, inspector references) is not verifiable enough to guarantee a clean, consistent chain. Material-level QC failure + NCR (S08) covers the QC-failure behavior instead. |
| Deep factory execution (`factory_item_requirements`, `production_raw_material_requests`) | WO-gate coupling: factory rows are governance-gated on WO status; seeding mid-chain rows could create states the app forbids. S01 seeds a minimal `factory_records` row only. |
| Storage objects (photo binaries, documents) | The seeder writes `storage_path` strings only; it does not upload to storage buckets. Photo-gate logic counts `storage_path IS NOT NULL`, which the seeded rows satisfy. |

## Role → route access matrix source

The Playwright spec's expectations are transcribed from the real `RequireRole`
guards in `src/app/App.tsx` (admin always passes by design; `/sales`,
`/quotations`, `/quotations/new`, `/projects` are unguarded → open to all
authenticated roles). Note: the app route for Material Custody is **`/custody`**
(the brief's `/store/custody` is a sidebar label, not a route).
