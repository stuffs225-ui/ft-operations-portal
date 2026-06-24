# Deferred Database Migrations Register

**Purpose:** A complete audit register of every SQL migration committed to the repository,
prepared for a later controlled migration-application pass against Supabase.

**Status of this document:** Preparation / audit only. **No migrations were applied. No
`supabase db push` was run. No SQL was executed against any database during this sprint.**

**Applied-status policy:** Supabase was **not** queried during this sprint, so the true
applied/unapplied state of each migration is **Unknown / deferred verification**. Do **not**
treat any row below as confirmed-applied until verified against the live database using the
verification method in `future-safe-migration-application-plan.md`.

**Migration source location:** `supabase/migrations/` — `001_profiles.sql` through
`100_project_invoicing_schedule.sql` (100 files).

---

## How to read this register

- **Runtime dependency** — whether current frontend code reads/writes the objects this
  migration creates.
  - **Core** — the app's primary workflows depend on it; the app cannot function meaningfully
    without it. (Marked for the foundational schema the working app already relies on.)
  - **Yes (safe-fallback)** — referenced by code that degrades gracefully if the object is missing
    (e.g. via `deferredMigrationSafety`).
  - **Yes (FATAL if missing)** — referenced by code that errors hard if the object is missing.
  - **Indirect** — supports another object or a server-side guard; not read directly by the UI.
- **Applied?** — always **Unknown** in this pass (Supabase not queried).
- **Risk** — relative risk of applying this migration during the later pass (Low / Medium / High),
  based on whether it changes/locks existing data, adds RLS/guards, or only adds new objects.

---

## Special-attention migrations (read these first)

| # | File | Why flagged | Runtime dependency | Notes |
|---|------|-------------|--------------------|-------|
| **099** | `sales_user_targets.sql` | Sales Dashboard v2 + Admin Sales Targets | **Yes (safe-fallback)** | Admin Sales Targets page and `salesTargetsQueries` use `deferredMigrationSafety` and show a calm "migration pending" state if missing. Sales Dashboard v2 reads it but treats a *targets* failure as non-fatal (target → null). |
| **100** | `project_invoicing_schedule.sql` | Sales Dashboard v2 invoicing plan + Admin Invoicing Schedule | **Yes — FATAL for Sales Dashboard v2; safe-fallback for Admin page** | ⚠️ `salesDashboardV2Queries.ts` treats the `project_invoicing_schedule` query error as **fatal** (`fatalError = … ?? scheduleRes.error?.message`). If migration 100 is NOT applied, **Sales Dashboard v2 will fail to load.** The Admin Invoicing Schedule page (via `projectInvoicingScheduleQueries` + `deferredMigrationSafety`) degrades gracefully. **Apply 100 before relying on Sales Dashboard v2 in any environment where it is not already applied.** |
| 068 | `hot_projects.sql` | Hot Projects pages + Sales Dashboard pipeline | Core | Pipeline KPIs read `hot_projects`. |
| 074 | `fix_hot_project_code_generation.sql` | Hot Project code generation | Indirect | Server-side code generation fix; depends on 068. |
| 069 | `invoicing_plans_milestones.sql` | Receivables, Collection-to-date | Core | `project_invoice_milestones` still powers Outstanding Receivables + Collection in Sales Dashboard v2. |
| 070 | `receivables_aging_view.sql` | Receivables aging | Core | `receivables_aging_view`. |
| 011/075/096/097/098 | document/storage migrations | Document evidence uploads | Core / Yes | See module table. |

> **Single most important finding:** migration **100** is a **hard runtime dependency** for
> Sales Dashboard v2. This was an intentional design decision in PR #142 (schedule is the
> primary invoicing-plan source). It is **left unchanged** in this sprint. It must be applied
> wherever Sales Dashboard v2 is expected to work.

---

## Full migration register

> Applied? = **Unknown / deferred verification** for **every** row (Supabase not queried).
> The Depends-on column lists the most relevant prior migrations only.

### Foundation & platform (001–008)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 001 | profiles.sql | User profiles table | Auth/Core | Core | Low | — | Base identity table. |
| 002 | roles.sql | Roles / `user_roles` | Auth/Core | Core | Low | 001 | Role source of truth. |
| 003 | rls_profiles.sql | RLS on profiles | Auth/Core | Indirect | Medium | 001,002 | Locks profile access. |
| 004 | audit_log.sql | Audit log table | Governance | Core | Low | 001 | Used by Audit Log page. |
| 005 | timeline_events.sql | Generic timeline events | Governance | Core | Low | 001 | Timeline UI. |
| 006 | master_data.sql | Reference/master data | Core | Core | Low | — | Settings reference data. |
| 007 | seed_data.sql | Seed reference data | Core | Indirect | Low | 006 | Seed rows. |
| 008 | dev_users.sql | Dev/test users | Dev | Indirect | Low | 001,002 | Non-production helper. |

### Projects / Sales Orders (009–014)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 009 | projects.sql | Projects/SO table | Projects | Core | Low | 001 | Primary projects table. |
| 010 | project_vehicle_lines.sql | Project line items | Projects | Core | Low | 009 | Vehicle lines. |
| 011 | project_documents.sql | Project documents | Projects | Core | Low | 009 | Documents tab. |
| 012 | project_timeline.sql | Project timeline | Projects | Core | Low | 009 | Activity tab. |
| 013 | project_rls.sql | RLS on projects | Projects | Indirect | Medium | 009 | Sales-owner scoping. |
| 014 | execution_references.sql | WO/PN execution refs | Projects/Factory | Core | Low | 009 | Execution gate. |

### Quotations (015–018)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 015 | quotations.sql | Quotation requests | Sales/Coordinator | Core | Low | 001 | Quotation pipeline. |
| 016 | quotation_lines.sql | Quotation lines | Sales/Coordinator | Core | Low | 015 | Line values. |
| 017 | quotation_documents.sql | Quotation documents | Sales/Coordinator | Core | Low | 015 | Quotation PDFs. |
| 018 | quotation_timeline.sql | Quotation timeline | Sales/Coordinator | Core | Low | 015 | Coordinator timeline. |

### Procurement (019–024)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 019 | procurement_requests.sql | PR table | Procurement | Core | Low | 009 | PR list. |
| 020 | procurement_request_items.sql | PR items | Procurement | Core | Low | 019 | Items-without-PO queue. |
| 021 | purchase_orders.sql | PO to supplier | Procurement | Core | Low | 019 | PO list. |
| 022 | purchase_order_items.sql | PO items | Procurement | Core | Low | 021 | PO line items. |
| 023 | eta_change_history.sql | ETA history | Procurement | Core | Low | 021 | ETA tracking. |
| 024 | approved_suppliers.sql | Supplier register | Procurement | Core | Low | — | Supplier list. |

### Factory / Production (025–028)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 025 | factory_records.sql | Factory records | Factory | Core | Low | 009,014 | Production records. |
| 026 | factory_requirements.sql | BOQ/BOM/manhours | Factory | Core | Low | 025 | Requirements. |
| 027 | raw_material_requests.sql | RMR | Factory | Core | Low | 025 | Raw material requests. |
| 028 | raw_material_request_items.sql | RMR items | Factory | Core | Low | 027 | RMR lines. |

### Store / Warehouse (029–034)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 029 | store_receipts.sql | Store receipts | Store | Core | Low | 021 | Receiving. |
| 030 | store_receipt_items.sql | Receipt items | Store | Core | Low | 029 | Received items. |
| 031 | medical_serial_numbers.sql | Serial tracking | Store | Core | Low | 030 | Serial numbers. |
| 032 | vehicle_receipts.sql | Vehicle receiving | Store | Core | Low | 029 | Vehicle receipts. |
| 033 | vehicle_receipt_photos.sql | Vehicle photos | Store | Core | Low | 032 | 5-photo gate. |
| 034 | material_custody_records.sql | Custody | Store | Core | Low | 030 | Temporary custody. |

### QC / NCR / Release (035–040)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 035 | material_qc_inspections.sql | Material QC | QC | Core | Low | 030 | Material inspection. |
| 036 | material_ncrs.sql | NCRs | QC | Core | Low | 035 | NCR handling. |
| 037 | project_qc_inspections.sql | Project QC | QC | Core | Low | 009 | Project inspection. |
| 038 | project_qc_findings.sql | QC findings | QC | Core | Low | 037 | Findings/rework. |
| 039 | qc_documents.sql | QC documents | QC | Core | Low | 037 | QC evidence. |
| 040 | release_notes.sql | Release notes | QC | Core | Low | 037 | Release gate. |

### Dubai / AFS (041–046)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 041 | dubai_project_followups.sql | Dubai follow-ups | AFS | Core | Low | 009,014 | PN-gated follow-up. |
| 042 | dubai_eta_history.sql | Dubai ETA | AFS | Core | Low | 041 | ETA history. |
| 043 | afs_arrival_reports.sql | Arrival reports | AFS | Core | Low | 041 | Arrival. |
| 044 | afs_missing_items.sql | Missing items | AFS | Core | Low | 043 | Pre-delivery blocker. |
| 045 | afs_predelivery_reports.sql | Pre-delivery | AFS | Core | Low | 043 | Readiness. |
| 046 | afs_condition_reports.sql | Condition reports | AFS | Core | Low | 043 | Condition. |

### After Sales (047–048)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 047 | afs_maintenance_requests.sql | Maintenance requests | After Sales | Core | Low | 009 | Post-delivery requests. |
| 048 | afs_maintenance_attachments.sql | Maintenance attachments | After Sales | Core | Low | 047 | Attachments. |

### Reporting / SLA / Health (049–057)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 049 | report_definitions.sql | Report defs | Reports | Core | Low | — | Reports hub. |
| 050 | saved_report_views.sql | Saved views | Reports | Yes | Low | 049 | Saved report views. |
| 051 | sla_rules.sql | SLA rules | Control Tower | Core | Low | — | SLA config. |
| 052 | sla_events.sql | SLA events | Control Tower | Core | Low | 051 | SLA breaches. |
| 053 | project_health_scores.sql | Project health | Reports | Yes | Low | 009 | Health scores. |
| 054 | department_health_scores.sql | Dept health | Reports | Yes | Low | — | Dept scores. |
| 055 | supplier_scorecards.sql | Supplier scorecards | Procurement/Reports | Yes | Low | 024 | Scorecards. |
| 056 | operational_issues.sql | Operational issues | Control Tower | Yes | Low | — | Issues log. |
| 057 | capa_records.sql | CAPA | QC/Control Tower | Yes | Low | 056 | Corrective actions. |

### Platform hardening / governance (058–066)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 058 | storage_buckets.sql | Storage buckets | Platform | Core | Medium | — | Upload buckets. |
| 059 | schema_hardening.sql | Schema hardening | Platform | Indirect | Medium | many | Constraints. |
| 060 | cost_protection.sql | Cost field protection | Governance | Indirect | Medium | 021 | Cost RLS/column guard. |
| 061 | po_approval_guard.sql | PO approval guard | Procurement | Indirect | High | 021 | >SAR 10k approval enforcement. |
| 062 | user_profile_enhancement.sql | Profile fields | Auth | Yes | Low | 001 | Extra profile columns. |
| 063 | access_requests.sql | Access requests | Admin | Core | Low | 001 | Access request flow. |
| 064 | document_templates.sql | Templates | Admin | Yes | Low | — | Template library. |
| 065 | notifications.sql | Notifications | Platform | Core | Low | 001 | Notifications. |
| 066 | report_snapshots_subscriptions.sql | Report subscriptions | Reports/Admin | Yes | Low | 049 | Scheduled reports. |

### Commercial / Hot Projects / Receivables (067–074)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 067 | convert_quotation_to_so.sql | Quotation→SO RPC | Sales | Core | High | 015,009 | Conversion workflow. Do not modify. |
| 068 | hot_projects.sql | Hot projects | Sales | Core | Low | 015 | Pipeline. |
| 069 | invoicing_plans_milestones.sql | Invoice milestones | Commercial | Core | Low | 009 | Receivables/collection. |
| 070 | receivables_aging_view.sql | Receivables aging view | Commercial | Core | Low | 069 | Aging view. |
| 071 | link_quotation_to_project.sql | Link quotation↔project | Sales | Indirect | Medium | 015,009 | Linkage. |
| 072 | fix_project_code_generation.sql | Project code gen fix | Projects | Indirect | Medium | 009 | Code generation. Do not modify. |
| 073 | sales_order_creation_final_fix.sql | SO creation fix | Projects | Indirect | Medium | 009,072 | SO creation. Do not modify. |
| 074 | fix_hot_project_code_generation.sql | Hot project code gen | Sales | Indirect | Medium | 068 | Code generation. |

### Document columns + gates + RLS hardening (075–095)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 075 | document_columns.sql | Document columns | Platform | Yes | Low | 011,017 | Doc metadata columns. |
| 076 | release_note_gate.sql | Release gate guard | QC | Indirect | High | 040 | Release gate logic. Do not modify. |
| 077 | medical_serial_gate.sql | Medical serial gate | Store | Indirect | High | 031 | Serial gate. Do not modify. |
| 078 | so_approval_checks.sql | SO approval checks | Projects | Indirect | High | 009 | SO approval. Do not modify. |
| 079 | customer_master_data.sql | Customer master | Core | Yes | Low | — | Customer table. |
| 080 | unified_audit_trigger.sql | Unified audit trigger | Governance | Indirect | Medium | 004 | Audit trigger. |
| 081 | qc_select_restriction.sql | QC select RLS | QC | Indirect | Medium | 035 | RLS. |
| 082 | medical_serial_numbers_rls_hardening.sql | Serial RLS | Store | Indirect | Medium | 031 | RLS. |
| 083 | factory_records_rls_hardening.sql | Factory RLS | Factory | Indirect | Medium | 025 | RLS. |
| 084 | approved_suppliers_rls_hardening.sql | Supplier RLS | Procurement | Indirect | Medium | 024 | RLS. |
| 085 | procurement_and_store_write_rls_hardening.sql | Proc/Store write RLS | Procurement/Store | Indirect | Medium | 019,029 | RLS. |
| 086 | quotation_status_transition_guard.sql | Quotation transition guard | Sales/Coordinator | Indirect | High | 015 | Status guard. Do not modify. |
| 087 | quotation_required_document_gates.sql | Quotation doc gates | Sales/Coordinator | Indirect | High | 017 | Doc gate. Do not modify. |
| 088 | quotation_insert_draft_only.sql | Draft-only insert guard | Sales | Indirect | Medium | 015 | Insert guard. |
| 089 | wo_pn_execution_guardrails.sql | WO/PN guardrails | Factory/AFS | Indirect | High | 014 | WO/PN gate. Do not modify. |
| 090 | project_department_routing.sql | Dept routing | Projects | Yes | Medium | 009 | Routing. |
| 091 | project_department_routing_sales_visibility.sql | Routing sales visibility | Projects | Indirect | Medium | 090 | RLS visibility. |
| 092 | wo_pn_reference_approval_guardrails.sql | WO/PN ref approval | Factory | Indirect | High | 014,089 | Approval guard. Do not modify. |
| 093 | procurement_governance_hardening.sql | Procurement governance | Procurement | Indirect | High | 061 | Governance. Do not modify. |
| 094 | store_governance_hardening.sql | Store governance | Store | Indirect | High | 034 | Governance. Do not modify. |
| 095 | vehicle_photo_storage_path_hardening.sql | Vehicle photo path | Store | Indirect | Medium | 033,058 | Storage path. |

### Phase 1A documents/storage (096–098)

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 096 | procurement_documents.sql | `procurement-documents` bucket + `purchase_order_documents` | Procurement | Yes | Medium | 058,021 | PO document uploads. |
| 097 | afs_document_tables.sql | `afs_arrival_documents` + `afs_missing_item_attachments` | AFS | Yes | Low | 043,044 | AFS evidence. |
| 098 | qc_documents_file_columns.sql | `file_size`/`mime_type` on `qc_inspection_documents` | QC | Yes | Low | 039 | QC doc columns. |

### Sales Dashboard v2 / Invoicing Schedule (099–100) — deferred & flagged

| # | File | Purpose | Module | Runtime dep | Risk | Depends on | Notes |
|---|------|---------|--------|-------------|------|-----------|-------|
| 099 | sales_user_targets.sql | `sales_user_targets` (annual SO/invoicing/collection targets per user) | Commercial | **Yes (safe-fallback)** | Low | 001,002 | Admin Sales Targets + Sales Dashboard targets. Degrades gracefully if missing. RLS: admin CRUD, ops read, sales own-read. |
| 100 | project_invoicing_schedule.sql | `project_invoicing_schedule` + `_history` + alerts view + reschedule/amount RPCs + AFTER INSERT trigger + backfill | Commercial | **Yes — FATAL for Sales Dashboard v2** | High | 009,069 | ⚠️ See special-attention table. Sales Dashboard v2 treats a missing table as a fatal load error. Admin Invoicing Schedule degrades gracefully. Trigger auto-creates one schedule line per project; backfill is idempotent. |

---

## Verification queries needed later (per object family)

Run these (read-only) against Supabase during the later audit to confirm applied state.
See `future-safe-migration-application-plan.md` for the full procedure.

```sql
-- Table existence (repeat per table)
select to_regclass('public.project_invoicing_schedule')        as t_100,
       to_regclass('public.project_invoicing_schedule_history') as t_100_hist,
       to_regclass('public.sales_user_targets')                 as t_099,
       to_regclass('public.hot_projects')                       as t_068,
       to_regclass('public.project_invoice_milestones')         as t_069;

-- View existence
select to_regclass('public.receivables_aging_view')                  as v_070,
       to_regclass('public.project_invoicing_schedule_alerts_view')  as v_100;

-- Function existence
select proname from pg_proc
where proname in (
  'reschedule_project_invoicing_schedule',
  'update_project_invoicing_schedule_amount',
  'convert_quotation_to_so',
  'create_default_invoicing_schedule'
);

-- Supabase migration history (if the CLI-managed table exists)
select version, name, executed_at
from supabase_migrations.schema_migrations
order by version;
```

> If `supabase_migrations.schema_migrations` does not exist, the project may not be
> CLI-migration-managed; fall back to per-object `to_regclass` / `pg_proc` checks above.

---

## Summary

- **Total migrations:** 100 (`001`–`100`).
- **Confirmed runtime-referenced in frontend code (this sprint's verification):** 099, 100
  (plus the broad core schema the working app already relies on).
- **Hard (fatal) runtime dependency on an unapplied-status migration:** **100** (Sales Dashboard v2).
- **Graceful-fallback runtime dependency:** 099 + 100-via-Admin pages (`deferredMigrationSafety`).
- **Applied state of all 100:** **Unknown / deferred verification** — Supabase was not queried.
- **Migrations applied during this sprint:** **None.**
- **New migrations created during this sprint:** **None.**
