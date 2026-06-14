-- ── Migration 079: Customer Master Data Foundation (B-026) ────────────────────
--
-- Gap B-026: Customer names are stored as free-text in projects.customer_name,
-- quotation_requests.customer_name, and hot_projects.customer_name. There is no
-- canonical customer entity, leading to potential duplicates with different
-- spellings across records.
--
-- This migration creates the foundation for a customer master data table by:
--   1. Creating the customers table.
--   2. Seeding it with DISTINCT customer names already present in projects.
--   3. Adding a NULLABLE customer_id FK column to projects only.
--   4. Backfilling customer_id where an exact name match is found.
--
-- NON-DESTRUCTIVE DESIGN DECISIONS:
--   • projects.customer_name is NOT dropped or altered. It remains the working
--     field for all existing code. The customer_id column is additive.
--   • customer_id is NULLABLE — rows that do not match (case differences,
--     leading/trailing spaces) are left with NULL customer_id rather than
--     causing errors. A manual cleanup pass can link them later.
--   • quotation_requests.customer_name and hot_projects.customer_name are NOT
--     touched in this migration. Linking them to the customers table is deferred
--     to Phase 1 implementation once the UI for customer selection is built.
--   • No existing RLS policies, triggers, or migration files are modified.
--
-- BACKFILL APPROACH:
--   Exact TRIM() match (case-sensitive) is used. Names that differ only in
--   trailing spaces will be matched; names with case differences (e.g., "ABC" vs
--   "abc") will result in separate customer rows for now. This is a known
--   limitation documented below.
--
-- References:
--   docs/system-audit/11-prioritized-gap-backlog.md — B-026
--   docs/governance/critical-governance-rules-register.md — Module 27
--   docs/reference-library/05-license-risk-notes.md — ERPNext GPL v3 (inspiration only)
--   NOTE: The customers table schema is original. No ERPNext code was copied.
--         ERPNext customer model was referenced for field selection only.

-- ── 1. Create the customers master table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  country     text,
  contact_name text,
  contact_email text,
  contact_phone text,
  is_active   boolean NOT NULL DEFAULT true,
  notes       text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Unique on trimmed name to prevent exact-duplicate customer entries.
  -- Case-variant duplicates (e.g., "ABC" vs "abc") are NOT prevented here;
  -- a case-insensitive UNIQUE index can be added in a future migration once
  -- a data cleanup pass has normalised existing names.
  CONSTRAINT customers_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_customers_name       ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_is_active  ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- updated_at trigger (reuses handle_updated_at defined in 001_profiles.sql)
DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read customers (needed for dropdowns).
CREATE POLICY customers_select ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin / operations_manager can create or modify customer records.
CREATE POLICY customers_insert ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager', 'sales_user', 'sales_coordinator'));

CREATE POLICY customers_update ON public.customers
  FOR UPDATE
  TO authenticated
  USING  (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- ── 2. Seed customers from existing projects (DISTINCT trimmed names) ──────────
--
-- ON CONFLICT (name) DO NOTHING is safe because the UNIQUE constraint is on the
-- name column. If a customer name already exists (e.g., if this migration is
-- re-run), the INSERT is silently skipped.

INSERT INTO public.customers (name, created_at)
SELECT DISTINCT TRIM(customer_name), now()
FROM   public.projects
WHERE  customer_name IS NOT NULL
  AND  TRIM(customer_name) != ''
ON CONFLICT (name) DO NOTHING;

-- ── 3. Add nullable customer_id FK to projects ────────────────────────────────
--
-- IF NOT EXISTS prevents failure if the column was already added (idempotent).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id);

-- ── 4. Backfill customer_id on projects (exact TRIM match) ────────────────────
--
-- Only rows where customer_id is still NULL are updated, making this safe to
-- re-run after a partial migration or after manually adding new customers.

UPDATE public.projects p
SET    customer_id = c.id
FROM   public.customers c
WHERE  TRIM(p.customer_name) = c.name
  AND  p.customer_id IS NULL;

-- ── Verification comment ───────────────────────────────────────────────────────
-- After applying this migration, verify with:
--
--   -- Check customer table was populated
--   SELECT COUNT(*) FROM customers;
--
--   -- Check backfill coverage on projects
--   SELECT
--     COUNT(*) AS total_projects,
--     COUNT(customer_id) AS linked_projects,
--     COUNT(*) - COUNT(customer_id) AS unlinked_projects
--   FROM projects;
--
--   -- Inspect unlinked projects (name mismatch candidates)
--   SELECT id, customer_name, customer_id
--   FROM projects
--   WHERE customer_id IS NULL
--   ORDER BY customer_name;
--
-- For any unlinked rows, either:
--   a) Create a new customer: INSERT INTO customers (name) VALUES ('Customer Name');
--   b) Or update the project directly:
--      UPDATE projects SET customer_id = '<customer_uuid>' WHERE id = '<project_uuid>';
--
-- KNOWN LIMITATION: Case-variant duplicates in existing data will result in
-- separate customer records (e.g., "ABC Corp" and "abc corp" become two
-- customers). A cleanup pass can be run later to merge them:
--   UPDATE customers SET name = 'ABC Corp' WHERE name = 'abc corp';
--   UPDATE projects SET customer_id = '<canonical_id>' WHERE customer_id = '<duplicate_id>';
--   DELETE FROM customers WHERE id = '<duplicate_id>';
--
-- ROLLBACK:
--   ALTER TABLE projects DROP COLUMN IF EXISTS customer_id;
--   DROP TABLE IF EXISTS customers;
