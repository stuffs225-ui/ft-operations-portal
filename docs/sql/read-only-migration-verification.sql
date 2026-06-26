-- ============================================================================
-- READ-ONLY Supabase Migration Verification Script
-- FT Operations Portal — Full System QA / Go-Live Readiness
-- ============================================================================
--
-- PURPOSE
--   Verify which GitHub migration objects exist in the live Supabase database.
--   Run this manually in the Supabase SQL editor (or a read-only psql session).
--
-- SAFETY
--   * This script is STRICTLY READ-ONLY. It uses SELECT only.
--   * It does NOT create, alter, drop, insert, update, or delete anything.
--   * It does NOT apply migrations. It only inspects catalog metadata.
--   * Safe to run against production (read-only). Do not modify it to write.
--
-- HOW TO READ RESULTS
--   * present = true  -> the object EXISTS in the database.
--   * present = false -> the object is MISSING (its migration is not applied,
--                        or was applied differently).
--   * Compare each result against the "expected" notes inline.
--
-- The two migrations the program treats as DEFERRED / unverified are:
--   099 sales_user_targets
--   100 project_invoicing_schedule (+ history, alerts view, 2 RPCs, trigger)
-- These are the highest priority to confirm before go-live.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 1. CRITICAL TABLES
--    Expected present=true for a fully-migrated database.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'table' AS kind, name AS object,
       to_regclass('public.' || name) IS NOT NULL AS present,
       migration
FROM (VALUES
    ('profiles',                        '001'),
    ('user_roles',                      '002'),
    ('projects',                        '009'),
    ('project_vehicle_lines',           '010'),
    ('quotation_requests',              '015'),
    ('procurement_requests',            '019'),
    ('purchase_orders_to_supplier',     '021'),
    ('approved_suppliers',              '024'),
    ('factory_records',                 '025'),
    ('store_receipts',                  '029'),
    ('material_custody_records',        '034'),
    ('material_qc_inspections',         '035'),
    ('material_ncrs',                   '036'),
    ('project_qc_inspections',          '037'),
    ('project_qc_findings',             '038'),
    ('release_notes',                   '040'),
    ('dubai_project_followups',         '041'),
    ('afs_arrival_reports',             '043'),
    ('afs_missing_items',               '044'),
    ('afs_predelivery_reports',         '045'),
    ('afs_maintenance_requests',        '047'),
    ('hot_projects',                    '068'),
    ('project_invoice_milestones',      '069'),
    -- ▼▼ DEFERRED / HIGH PRIORITY ▼▼
    ('sales_user_targets',              '099'),
    ('project_invoicing_schedule',      '100'),
    ('project_invoicing_schedule_history', '100')
) AS t(name, migration)
ORDER BY migration, name;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. CRITICAL VIEWS
--    Expected present=true.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'view' AS kind, name AS object,
       to_regclass('public.' || name) IS NOT NULL AS present,
       migration
FROM (VALUES
    ('receivables_aging_view',                  '070'),
    ('project_invoicing_schedule_alerts_view',  '100')   -- DEFERRED / HIGH PRIORITY
) AS t(name, migration)
ORDER BY migration, name;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. CRITICAL FUNCTIONS / RPCs
--    Expected present=true.
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'function' AS kind, name AS object,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = name) AS present,
       migration
FROM (VALUES
    ('convert_quotation_to_so',                     '067'),
    ('create_default_invoicing_schedule',           '100'),  -- trigger fn (DEFERRED)
    ('reschedule_project_invoicing_schedule',       '100'),  -- DEFERRED / HIGH PRIORITY
    ('update_project_invoicing_schedule_amount',    '100')   -- DEFERRED / HIGH PRIORITY
) AS t(name, migration)
ORDER BY migration, name;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER for migration 100 (auto-create default schedule on project insert)
--    Expected: one row if migration 100 is applied.
-- ─────────────────────────────────────────────────────────────────────────
SELECT tgname AS trigger_name,
       relname AS on_table,
       'expected if migration 100 applied' AS note
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
WHERE NOT tg.tgisinternal
  AND tg.tgname ILIKE '%invoicing_schedule%';


-- ─────────────────────────────────────────────────────────────────────────
-- 5. RLS ENABLED STATUS on key/governed tables
--    Expected relrowsecurity = true on all of these.
-- ─────────────────────────────────────────────────────────────────────────
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'profiles', 'projects', 'quotation_requests',
    'purchase_orders_to_supplier', 'approved_suppliers',
    'material_custody_records', 'material_qc_inspections',
    'release_notes', 'sales_user_targets', 'project_invoicing_schedule'
  )
ORDER BY c.relname;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. POLICY EXISTENCE on the two deferred tables
--    Expected: one or more policies per table if migrations 099/100 applied.
-- ─────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sales_user_targets', 'project_invoicing_schedule',
                    'project_invoicing_schedule_history')
ORDER BY tablename, policyname;


-- ─────────────────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKETS (read-only)
--    Expected present=true for document/evidence features.
-- ─────────────────────────────────────────────────────────────────────────
SELECT id AS bucket, public AS is_public
FROM storage.buckets
WHERE id IN ('procurement-documents', 'qc-documents', 'afs-documents',
             'vehicle-photos', 'quotation-documents', 'project-documents')
ORDER BY id;


-- ─────────────────────────────────────────────────────────────────────────
-- 8. (Optional) Supabase CLI migration history, if the project is CLI-managed.
--    If this returns "relation does not exist", the project is not using the
--    CLI migration history table; rely on the object checks above instead.
-- ─────────────────────────────────────────────────────────────────────────
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
-- ============================================================================
-- END OF READ-ONLY VERIFICATION SCRIPT — no writes performed.
-- ============================================================================
