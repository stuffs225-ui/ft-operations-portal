# 04 — Database & Supabase Audit

---

## Supabase Client Setup

| Item | Detail |
|------|--------|
| Client file | `src/lib/supabase.ts` |
| Initialization | `createClient<Database>(url, anonKey)` — typed with generated `Database` type |
| Guard flag | `isSupabaseConfigured` — checked before every query |
| Dev fallback | Mock data when env vars absent |
| Typed | Yes — `src/types/database.ts` exists |
| Service role | Not used in browser; only in `scripts/create-dev-users.ts` |
| Real-time | Not configured |
| Edge functions | Not used |

---

## Migration Summary (75 migrations, 001–075)

| Range | Theme |
|-------|-------|
| 001–008 | Foundation: profiles, roles, RLS, audit_log, timeline_events, master_data, seed |
| 009–013 | Projects: core table, vehicle_lines, documents, timeline, project RLS |
| 014 | Execution references (WO/PN) |
| 015–018 | Quotations: core, lines, documents, timeline |
| 019–023 | Procurement: PR, PR items, POs, PO items, ETA history |
| 024 | Approved suppliers |
| 025–028 | Factory: records, requirements, raw material requests + items |
| 029–034 | Store: receipts, receipt items, medical serials, vehicle receipts, vehicle photos, custody |
| 035–040 | QC: material inspections, NCRs, project inspections, findings, QC documents, release notes |
| 041–048 | Dubai/AFS: followups, ETA history, arrival reports, missing items, pre-delivery, condition reports, maintenance, attachments |
| 049–057 | Reports/Health: report definitions, saved views, SLA rules, SLA events, health scores, supplier scorecards, operational issues, CAPA |
| 058–061 | Hardening: storage buckets, schema hardening, cost protection, PO approval guard |
| 062–070 | Pre-launch: user profile enhancement, access requests, templates, notifications, report subscriptions |
| 067–075 | Sales workflow: quotation-to-SO conversion, hot projects, invoicing plans, receivables view, link fixes, code gen fixes, document columns |

---

## Tables Inventory

### Foundation

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `profiles` | User profile data | id, full_name, email, department, is_active | ✅ per-user + admin |
| `user_roles` | Role assignments | user_id, role | ✅ per-user + admin |
| `audit_log` | System audit events | entity_type, entity_id, action, actor_id, changes_json | ⚠️ check needed |
| `timeline_events` | Per-entity timeline | entity_type, entity_id, event_type, title, actor_id | ⚠️ check needed |
| `master_data` | Reference data (customers, categories) | key, value, category | ⚠️ check needed |

### Quotations

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `quotation_requests` | Quotation request records | quotation_code, status, priority, submitted_at | ⚠️ |
| `quotation_request_lines` | Vehicle/item lines | vehicle_type, quantity, estimated_value | ⚠️ |
| `quotation_documents` | Document metadata | document_type, storage_path, version | ⚠️ |
| `quotation_timeline_events` | Quotation history | event_type, title, actor_id | ⚠️ |

### Projects / SO

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `projects` | Sales Orders (SO) | project_code, so_number, project_status, manufacturing_location, medical_items | ✅ |
| `project_vehicle_lines` | Vehicle lines per SO | vehicle_type, quantity, unit_sales_value | ✅ |
| `project_documents` | Document metadata | document_type, storage_path, version | ✅ |
| `project_timeline_events` | Project audit trail | event_type, title, actor_id | ✅ |
| `project_execution_references` | WO/PN gate numbers | reference_type (wo/pn), reference_number, status | ✅ |

### Procurement

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `procurement_requests` | Purchase Requests | pr_number, project_id, status | ⚠️ |
| `procurement_request_items` | PR line items | item_name, quantity, unit | ⚠️ |
| `purchase_orders_to_supplier` | Purchase Orders | po_number, purchase_value, approval_status, approval_required | ✅ dual-enforced |
| `purchase_order_items` | PO line items | item_name, quantity, unit_price | ⚠️ |
| `eta_change_history` | ETA changes log | entity_type, old_eta, new_eta, reason | ⚠️ |
| `approved_suppliers` | Supplier registry | procurement_status, qc_status, quality_rating | ⚠️ |

### Factory

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `factory_records` | Production progress per project | production_status, progress_percentage, wo_reference_id | ⚠️ |
| `factory_requirements` | BOQ/BOM/drawing requirements | requirement_type_id, status, document_id | ⚠️ |
| `raw_material_requests` | Raw material requisitions | request_type, status, wo_reference_id | ⚠️ |
| `raw_material_request_items` | Line items | item_name, quantity, material_category | ⚠️ |

### Store / Warehouse

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `store_receipts` | Material receipts | receipt_type, status, purchase_order_id | ⚠️ |
| `store_receipt_items` | Items per receipt | item_name, serial_required, status | ⚠️ |
| `medical_serial_numbers` | Medical device serials | serial_number, batch_number, expiry_date, qc_status | ⚠️ |
| `vehicle_receipts` | Vehicle delivery records | chassis_number, condition_status, status | ⚠️ |
| `vehicle_receipt_photos` | Vehicle photos | photo_type, storage_path | ⚠️ |
| `material_custody_records` | Custody issuance | custody_number, approval_required, receiver_decision | ⚠️ |

### QC

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `material_qc_inspections` | Material inspections | inspection_result, rejection_reason | ⚠️ |
| `material_ncrs` | Non-Conformance Reports | ncr_status, severity, corrective_action | ⚠️ |
| `project_qc_inspections` | Vehicle/project QC | inspection_result, readiness_status | ⚠️ |
| `project_qc_findings` | QC findings / rework | finding_status, rework_required, rework_completed_at | ⚠️ |
| `qc_inspection_documents` | QC evidence files | document_type, storage_path | ⚠️ |
| `release_notes` | Release notes | release_status, issued_by, document_id | ⚠️ |

### Dubai / AFS

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `dubai_project_followups` | Dubai project tracking | pn_reference_id, dubai_status, eta_status |
| `dubai_eta_history` | Dubai ETA changes | old_eta, new_eta, reason |
| `afs_arrival_reports` | Vehicle arrival records | arrival_status, received_quantity |
| `afs_missing_items` | Missing items log | missing_item_status, severity |
| `afs_predelivery_reports` | Pre-delivery checklist | readiness_status, release_note_issued |
| `afs_condition_reports` | Vehicle condition reports | overall_condition, report_status |
| `afs_maintenance_requests` | After-sales maintenance | maintenance_status, priority, parts_required |
| `afs_maintenance_attachments` | Maintenance files | document_type, storage_path |

### Reports / SLA / Health

| Table | Purpose |
|-------|---------|
| `report_definitions` | Report catalog |
| `saved_report_views` | User saved report filters |
| `sla_rules` | SLA rule definitions |
| `sla_events` | Active/historical SLA events |
| `project_health_scores` | Composite health per project |
| `department_health_scores` | Department-level scores |
| `supplier_scorecards` | Supplier quality scores |
| `operational_issues` | Issues / risks / blockers |
| `capa_records` | CAPA records |

### Admin / Governance

| Table | Purpose |
|-------|---------|
| `access_requests` | New user access requests |
| `document_templates` | Document template definitions |
| `template_fields` | Template field definitions |
| `generated_documents` | Filled-in generated docs |
| `notifications` | In-app notification events |
| `notification_preferences` | Per-user channel prefs |
| `notification_escalation_rules` | Escalation rule config |
| `report_snapshots` | Scheduled report snapshots |
| `scheduled_report_subscriptions` | Subscription config |
| `invoicing_plans` | Per-project invoicing plans |
| `invoice_milestones` | Milestone definitions |

---

## Storage Buckets

| Bucket | Write Roles | Notes |
|--------|-------------|-------|
| `project-documents` | admin, ops, sales_user | ✅ Private; signed URLs only |
| `quotation-documents` | admin, ops, sales_user, sales_coordinator | ✅ Private |
| `raw-material-files` | admin, ops, factory_user | ✅ Private |
| `vehicle-photos` | admin, ops, store_user | ✅ Private |
| `qc-documents` | admin, ops, qc_user | ✅ Private |
| `afs-attachments` | admin, ops, afs_user | ✅ Private |

**Gap:** No bucket for `template-files` or `generated-documents`. Template storage_path column exists but no bucket policy found.

---

## Schema Gaps

| Gap | Risk | Tables Affected |
|-----|------|-----------------|
| No DB trigger blocking Release Note while QC findings are open | Critical | `release_notes`, `project_qc_findings` |
| No DB constraint enforcing serial_number when `serial_required = true` | High | `store_receipt_items`, `medical_serial_numbers` |
| No DB trigger enforcing `chassis_number` non-null on vehicle receipt completion | Medium | `vehicle_receipts` |
| No DB trigger enforcing coordinator return requires PDF + quotation_number | Medium | `quotation_requests` |
| No budget constraint on `purchase_value` threshold auto-setting `approval_required` | Medium | `purchase_orders_to_supplier` |
| No FK between `release_notes` and `project_qc_findings` to check closure | Critical | `release_notes` |
| `factory_records.wo_reference_id` may be null — no NOT NULL constraint after WO entry | Medium | `factory_records` |
| `afs_predelivery_reports.release_note_id` FK not validated before `ready_for_delivery=true` | Medium | `afs_predelivery_reports` |

---

## Code / Schema Mismatches

| Issue | Details |
|-------|---------|
| `purchase_orders_to_supplier` (table name) vs `PurchaseOrder` (type) | Table name includes "to_supplier" suffix; types use shorter name — minor inconsistency |
| `src/types/database.ts` auto-generated type needs re-sync after latest migrations | If DB type was generated before migration 060–075, it may be stale |
| `MOCK_CURRENT_USER` in `roles.ts` | Unused mock constant still present in production code |

---

## ERPNext-Inspired Object Comparison (Business Reference Only — No Code Copy)

| ERPNext Object | FT Portal Equivalent | Gap Assessment |
|----------------|---------------------|----------------|
| Sales Order | `projects` table | ✅ Covered — SO number, customer, vehicle lines, value |
| Work Order | `project_execution_references` (type='wo') | ✅ Covered — reference number, status, gate |
| Purchase Order | `purchase_orders_to_supplier` | ✅ Covered — approval workflow present |
| Bill of Materials | `factory_requirements` (BOQ/BOM types) | ⚠️ Partial — no item-level BOM lines table |
| Stock Entry | `store_receipts` + `material_custody_records` | ⚠️ Partial — no real-time stock quantity tracking |
| Quality Inspection | `material_qc_inspections` + `project_qc_inspections` | ✅ Covered |
| Non-Conformance | `material_ncrs` | ✅ Covered |
| Delivery Note | `release_notes` | ⚠️ Partial — no delivery confirmation signature flow |
| Maintenance Request | `afs_maintenance_requests` | ✅ Covered |
| Customer | `projects.customer_name` (denormalized) | ⚠️ No separate Customer master table |
| Supplier | `approved_suppliers` | ✅ Covered |

**Key ERPNext gap:** No separate `customers` master table — customer name is a free-text string on each project. This risks data inconsistency (spelling variations, no history per customer).
