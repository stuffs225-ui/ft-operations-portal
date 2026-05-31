# Migration Execution Order — FT Operations Portal

**Target:** a fresh Supabase project. Run migrations **once, in numeric order**,
`001` → `059`. The set is forward-only (see `MIGRATION_RISK_REVIEW.md`); do not
re-run individual files on a populated database.

## Recommended method — Supabase CLI

```bash
# 1. Link the local repo to your project (one time)
supabase link --project-ref <your-project-ref>

# 2. Push all migrations in order
supabase db push
```

`supabase db push` applies every file under `supabase/migrations/` in filename
order. It runs as the `postgres` role, which can also create the storage
policies in `058`.

## Alternative — manual SQL Editor

If you are not using the CLI, paste each file's contents into the Supabase **SQL
Editor** and run them **in numeric order**. Group checkpoints below tell you what
to verify after each block.

---

## Groups & post-run verification

### Group A — Foundation (001–008)
Profiles, roles, RLS helpers, audit log, timeline, master data, seed data.
`008_dev_users.sql` is a commented no-op (skip in production).
```sql
select count(*) from public.profiles;                 -- 0 (no users yet)
select proname from pg_proc where proname = 'current_user_role';  -- 1 row
select id from storage.buckets;                        -- none yet (created in 058)
select count(*) from public.sla_rule_templates;        -- after 051; not yet here
```
Verify after A: tables `profiles`, `user_roles`, `audit_log`, `timeline_events`,
master-data tables, and the `current_user_role()` / `handle_new_user()` functions exist.

### Group B — Projects / SO / WO-PN (009–014)
```sql
\d public.projects
select conname, confrelid::regclass from pg_constraint
  where conrelid='public.project_execution_references'::regclass and contype='f';
```
Verify: `projects`, `project_vehicle_lines`, `project_documents`,
`project_timeline_events`, `project_execution_references` and gate functions
(`project_has_wo`, `project_has_pn`, `can_start_saudi_factory`, `can_start_dubai_followup`).

### Group C — Quotations (015–018)
Verify: `quotation_requests`, `quotation_request_lines`, `quotation_documents`,
`quotation_timeline_events`.

### Group D — Procurement (019–024)
```sql
-- supplier FK is added by 024 (deferred); confirm it exists:
select conname from pg_constraint where conname = 'po_supplier_fk';
```
Verify: `procurement_requests`, `procurement_request_items`,
`purchase_orders_to_supplier`, `purchase_order_items`, `eta_change_history`,
`approved_suppliers`.

### Group E — Factory (025–028)
```sql
-- confirm the FK fix landed (must reference project_execution_references):
select confrelid::regclass from pg_constraint
  where conrelid='public.factory_records'::regclass and contype='f'
    and conname like '%wo_reference%';
```
Verify: `factory_records`, `factory_requirement_types`, `factory_item_requirements`,
`production_raw_material_requests`, `production_raw_material_request_files`,
`production_raw_material_request_items`.

### Group F — Store (029–034)
Verify: `store_receipts`, `store_receipt_items`, `medical_serial_numbers`,
`vehicle_receipts`, `vehicle_receipt_photos`, `material_custody_records`.

### Group G — QC / Release (035–040)
```sql
-- confirm policies use current_user_role(), not auth.jwt():
select polname from pg_policy
  where polrelid = 'public.material_qc_inspections'::regclass;
```
Verify: `material_qc_inspections`, `material_ncrs`, `project_qc_inspections`,
`project_qc_findings`, `qc_inspection_documents`, `release_notes`.

### Group H — Dubai / AFS (041–048)
Verify: `dubai_project_followups`, `dubai_eta_history`, `afs_arrival_reports`,
`afs_missing_items`, `afs_predelivery_reports`, `afs_condition_reports`,
`afs_maintenance_requests`, `afs_maintenance_attachments`.

### Group I — Reports / OE (049–057)
```sql
-- 051 renames legacy sla_rules → sla_rule_templates, then creates new sla_rules
select count(*) from public.sla_rule_templates;   -- legacy rows (from 007 seed)
\d public.sla_rules                                -- Phase-10 schema (rule_key, module_name…)
```
Verify: `report_definitions`, `saved_report_views`, `sla_rules`, `sla_events`,
`project_health_scores`, `department_health_scores`, `supplier_scorecards`,
`operational_issues`, `capa_records`.

### Group J — Real-readiness hardening (058–059)
```sql
select id, public from storage.buckets order by id;   -- 6 private buckets
select indexname from pg_indexes where tablename = 'projects';
select tgname from pg_trigger where tgrelid = 'public.capa_records'::regclass;
```
Verify: 6 storage buckets (`project-documents`, `quotation-documents`,
`raw-material-files`, `vehicle-photos`, `qc-documents`, `afs-attachments`) +
their `storage.objects` policies; new indexes and `updated_at` triggers.

> If `058` errors with a storage-ownership permission message under the CLI,
> run `058_storage_buckets.sql` manually in the SQL Editor (executes as `postgres`).

---

## After all migrations

1. Create the first admin user — see `FIRST_ADMIN_BOOTSTRAP.md`.
2. Assign roles — run `supabase/seed_real_roles.sql` (with real emails).
3. Run the smoke test — `REAL_SUPABASE_SMOKE_TEST.md`.
