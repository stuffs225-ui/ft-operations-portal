-- Phase 10: Report Definitions

CREATE TYPE report_category_enum AS ENUM (
  'executive', 'sales', 'procurement', 'factory', 'store',
  'qc', 'afs', 'project', 'supplier', 'data_quality', 'sla', 'operational_excellence'
);

CREATE TABLE report_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key text UNIQUE NOT NULL,
  report_name text NOT NULL,
  report_category report_category_enum NOT NULL,
  description text NOT NULL DEFAULT '',
  default_roles_allowed text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_definitions_select" ON report_definitions
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "report_definitions_admin_all" ON report_definitions
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'operations_manager')
  );
