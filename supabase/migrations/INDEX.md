# Supabase Migrations — Index & Audit

This project applies migrations **manually** in the Supabase SQL Editor (SQL is
delivered in chat, then pasted and run). Supabase therefore has **no automatic
"applied" tracking table** — the live schema is the source of truth for what has
actually run. Use the **Applied?** column below to track that yourself: put a
`✅` (and the date) once you've run a migration in the live project.

## What a migration is

A migration is one ordered SQL file describing a single step of database change —
a new table, a column, an RLS policy, or a function. Numbered `001 → 111`, run in
order they reproduce the full schema from scratch, and they are the historical
record of *why* and *when* each object was added. Nothing here is destructive by
default; each file is written to be safe to re-run (`create ... if not exists`,
`add column if not exists`, `add value if not exists`).

## Code ↔ schema audit (2026-07)

Every table/view the app reads via `.from('…')` and every RPC it calls via
`.rpc('…')` was checked against the migration set:

- **Tables/views:** all resolve to a `create table/view` in some migration. The
  only apparent "gap" — `sla_rule_templates` — is the renamed form of `sla_rules`
  (migration 051 renames `sla_rules` → `sla_rule_templates`), so it is covered.
- **RPCs:** all 6 called in code (`link_quotation_to_project`,
  `notification_recipients_for_roles`, `reschedule_project_invoicing_schedule`,
  `update_project_invoicing_schedule_amount`, `set_line_invoicing_plan`,
  `set_aging_item_expected_date`, `split_project_invoicing_schedule`) are defined
  in migrations. **No missing objects.**

> If a feature shows a "migration NNN pending" notice or an
> `invalid input value for enum` / `Could not find the … in the schema cache`
> error at runtime, that migration simply hasn't been **applied** yet — find its
> row below and run it.

## Consolidation note

108+ files is normal for a system this size built incrementally; it is **history,
not clutter**. Renumbering or merging old files is discouraged — it risks losing
the audit trail and de-syncs from what's already live in the database, while
saving nothing (the files aren't loaded at runtime). The safe way to reduce
mental load is this index (know what each file is) plus, if ever needed, a single
idempotent "full schema snapshot" for standing up a brand-new environment — the
numbered files stay as the archive.

## Migrations

| # | File | What it does | Applied? |
|---|------|--------------|----------|
| 001 | `001_profiles.sql` | profiles: one row per auth.users entry |  |
| 002 | `002_roles.sql` | enum for all 10 roles |  |
| 003 | `003_rls_profiles.sql` | Enable RLS |  |
| 004 | `004_audit_log.sql` | audit_log: immutable record of all system actions |  |
| 005 | `005_timeline_events.sql` | timeline_events: ordered activity feed per project / entity |  |
| 006 | `006_master_data.sql` | Master data tables for Settings page configuration |  |
| 007 | `007_seed_data.sql` | Seed data for all master data tables. |  |
| 008 | `008_dev_users.sql` | Development / Testing User Plan |  |
| 009 | `009_projects.sql` | projects |  |
| 010 | `010_project_vehicle_lines.sql` | project vehicle lines |  |
| 011 | `011_project_documents.sql` | project documents |  |
| 012 | `012_project_timeline.sql` | project timeline |  |
| 013 | `013_project_rls.sql` | project rls |  |
| 014 | `014_execution_references.sql` | execution references |  |
| 015 | `015_quotations.sql` |  Phase 4: Quotation Requests |  |
| 016 | `016_quotation_lines.sql` |  Phase 4: Quotation Request Lines |  |
| 017 | `017_quotation_documents.sql` |  Phase 4: Quotation Documents |  |
| 018 | `018_quotation_timeline.sql` |  Phase 4: Quotation Timeline Events |  |
| 019 | `019_procurement_requests.sql` |  Phase 5: Procurement Requests |  |
| 020 | `020_procurement_request_items.sql` |  Phase 5: Procurement Request Items |  |
| 021 | `021_purchase_orders.sql` |  Phase 5: Purchase Orders to Supplier |  |
| 022 | `022_purchase_order_items.sql` |  Phase 5: Purchase Order Items |  |
| 023 | `023_eta_change_history.sql` |  Phase 5: ETA Change History |  |
| 024 | `024_approved_suppliers.sql` |  Phase 5: Approved Suppliers |  |
| 025 | `025_factory_records.sql` |  Phase 6: Factory Records |  |
| 026 | `026_factory_requirements.sql` |  Phase 6: Factory Requirements |  |
| 027 | `027_raw_material_requests.sql` |  Phase 6: Raw Material Requests |  |
| 028 | `028_raw_material_request_items.sql` |  Phase 6: RMR Files and Items |  |
| 029 | `029_store_receipts.sql` |  Phase 7: Store Receipts |  |
| 030 | `030_store_receipt_items.sql` |  Phase 7: Store Receipt Items |  |
| 031 | `031_medical_serial_numbers.sql` |  Phase 7: Medical Serial Numbers |  |
| 032 | `032_vehicle_receipts.sql` |  Phase 7: Vehicle Receipts |  |
| 033 | `033_vehicle_receipt_photos.sql` |  Phase 7: Vehicle Receipt Photos |  |
| 034 | `034_material_custody_records.sql` |  Phase 7: Material Custody Records |  |
| 035 | `035_material_qc_inspections.sql` | Material QC Inspections |  |
| 036 | `036_material_ncrs.sql` | Material NCRs |  |
| 037 | `037_project_qc_inspections.sql` | Project/Vehicle QC Inspections |  |
| 038 | `038_project_qc_findings.sql` | Project QC Findings |  |
| 039 | `039_qc_documents.sql` | QC Inspection Documents |  |
| 040 | `040_release_notes.sql` | Release Notes |  |
| 041 | `041_dubai_project_followups.sql` | Dubai Project Follow-ups |  |
| 042 | `042_dubai_eta_history.sql` | Dubai ETA Change History |  |
| 043 | `043_afs_arrival_reports.sql` | AFS Vehicle Arrival Reports |  |
| 044 | `044_afs_missing_items.sql` | AFS Missing Items |  |
| 045 | `045_afs_predelivery_reports.sql` | AFS Pre-Delivery Reports |  |
| 046 | `046_afs_condition_reports.sql` | AFS Condition Reports (post-delivery) |  |
| 047 | `047_afs_maintenance_requests.sql` | After Sales Maintenance Requests |  |
| 048 | `048_afs_maintenance_attachments.sql` | AFS Maintenance Attachments |  |
| 049 | `049_report_definitions.sql` | Report Definitions |  |
| 050 | `050_saved_report_views.sql` | Saved Report Views |  |
| 051 | `051_sla_rules.sql` | SLA Rules |  |
| 052 | `052_sla_events.sql` | SLA Events |  |
| 053 | `053_project_health_scores.sql` | Project Health Scores |  |
| 054 | `054_department_health_scores.sql` | Department Health Scores |  |
| 055 | `055_supplier_scorecards.sql` | Supplier Scorecards |  |
| 056 | `056_operational_issues.sql` | Operational Issues |  |
| 057 | `057_capa_records.sql` | CAPA Records |  |
| 058 | `058_storage_buckets.sql` | Real Supabase Readiness  Storage buckets + object RLS |  |
| 059 | `059_schema_hardening.sql` | Real Supabase Readiness  Schema hardening (indexes + missing triggers) |  |
| 060 | `060_cost_protection.sql` |  Migration 060: DB-Level Cost Column Protection (GAP-01) |  |
| 061 | `061_po_approval_guard.sql` |  Migration 061: PO Self-Approval Guard (GAP-02) |  |
| 062 | `062_user_profile_enhancement.sql` |  Migration 062: User Profile Enhancement (Pre-launch) |  |
| 063 | `063_access_requests.sql` |  Migration 063: Employee Self-Registration / Access Requests |  |
| 064 | `064_document_templates.sql` |  Migration 064: Template Management + Fillable Templates |  |
| 065 | `065_notifications.sql` |  Migration 065: Notification System Foundation |  |
| 066 | `066_report_snapshots_subscriptions.sql` |  Migration 066: Report Snapshots + Scheduled Reports + Delivery Logs |  |
| 067 | `067_convert_quotation_to_so.sql` | convert quotation to so |  |
| 068 | `068_hot_projects.sql` | hot projects |  |
| 069 | `069_invoicing_plans_milestones.sql` | invoicing plans milestones |  |
| 070 | `070_receivables_aging_view.sql` | receivables aging view |  |
| 071 | `071_link_quotation_to_project.sql` | link quotation to project |  |
| 072 | `072_fix_project_code_generation.sql` | fix project code generation |  |
| 073 | `073_sales_order_creation_final_fix.sql` | sales order creation final fix |  |
| 074 | `074_fix_hot_project_code_generation.sql` | fix hot project code generation |  |
| 075 | `075_document_columns.sql` | document columns |  |
| 076 | `076_release_note_gate.sql` |  Migration 076: Release Note Gate (R-015) |  |
| 077 | `077_medical_serial_gate.sql` |  Migration 077: Medical Serial Gate (R-011) |  |
| 078 | `078_so_approval_checks.sql` |  Migration 078: SO Approval Fields Guard (B-010, B-011) |  |
| 079 | `079_customer_master_data.sql` |  Migration 079: Customer Master Data Foundation (B-026) |  |
| 080 | `080_unified_audit_trigger.sql` |  Migration 080: Unified Audit Trigger Foundation (R-016, R-017) |  |
| 081 | `081_qc_select_restriction.sql` |  Migration 081: QC SELECT Policy Restriction (Step 6C) |  |
| 082 | `082_medical_serial_numbers_rls_hardening.sql` |  Migration 082: Medical Serial Numbers RLS Hardening (Step 6D) |  |
| 083 | `083_factory_records_rls_hardening.sql` |  Migration 083: Factory Records RLS Hardening (Step 6D) |  |
| 084 | `084_approved_suppliers_rls_hardening.sql` |  Migration 084: Approved Suppliers RLS Hardening (Step 6D) |  |
| 085 | `085_procurement_and_store_write_rls_hardening.sql` |  Migration 085: Procurement and Store Write RLS Hardening (Step 6D) |  |
| 086 | `086_quotation_status_transition_guard.sql` |  Migration 086: Quotation Status Transition Guard |  |
| 087 | `087_quotation_required_document_gates.sql` |  Migration 087: Quotation Required Document Gates |  |
| 088 | `088_quotation_insert_draft_only.sql` |  Migration 088: Quotation Insert Draft-Only Policy |  |
| 089 | `089_wo_pn_execution_guardrails.sql` |  Migration 089: WO / PN Execution Gate TIER-1 Guardrails (R-005, R-006) |  |
| 090 | `090_project_department_routing.sql` |  Migration 090: Project Department Routing Persistence (Step 9C) |  |
| 091 | `091_project_department_routing_sales_visibility.sql` |  Migration 091: Project Department Routing  Sales Visibility (Step 9D) |  |
| 092 | `092_wo_pn_reference_approval_guardrails.sql` |  Migration 092: WO/PN Reference Approval Guardrails (Step 10B) |  |
| 093 | `093_procurement_governance_hardening.sql` |  Migration 093: Procurement Governance Hardening (Step 11B) |  |
| 094 | `094_store_governance_hardening.sql` |  Migration 094: Store Governance Hardening (Step 12B) |  |
| 095 | `095_vehicle_photo_storage_path_hardening.sql` |  Migration 095: Vehicle Receipt Photo Storage Path Hardening |  |
| 096 | `096_procurement_documents.sql` | procurement documents |  |
| 097 | `097_afs_document_tables.sql` | afs document tables |  |
| 098 | `098_qc_documents_file_columns.sql` | qc documents file columns |  |
| 099 | `099_sales_user_targets.sql` | sales user targets |  |
| 100 | `100_project_invoicing_schedule.sql` | project invoicing schedule |  |
| 101 | `101_commercial_fields.sql` | commercial fields |  |
| 102 | `102_project_lifecycle_visibility.sql` | project lifecycle visibility |  |
| 103 | `103_financial_truth_views.sql` | financial truth views |  |
| 104 | `104_line_invoicing_plan.sql` | line invoicing plan |  |
| 105 | `105_invoicing_plan_dedupe.sql` | invoicing plan dedupe |  |
| 106 | `106_quotation_clarifications.sql` | quotation clarifications |  |
| 107 | `107_collection_and_aging.sql` | collection and aging |  |
| 108 | `108_aging_item_followup.sql` | aging item followup |  |
| 109 | `109_quotation_document_type_clarification.sql` | quotation document type clarification |  |
| 110 | `110_quotation_document_type_customer_docs.sql` | quotation document type customer docs |  |
| 111 | `111_split_invoicing_schedule.sql` | split invoicing schedule |  |
