-- Phase 10: CAPA Records

CREATE TYPE capa_status_enum AS ENUM (
  'draft', 'assigned', 'in_progress', 'pending_effectiveness_check',
  'effective', 'ineffective', 'closed', 'cancelled'
);

CREATE TABLE capa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES operational_issues(id) ON DELETE SET NULL,
  ncr_id uuid,
  capa_number text UNIQUE NOT NULL,
  root_cause text NOT NULL DEFAULT '',
  corrective_action text NOT NULL DEFAULT '',
  preventive_action text NOT NULL DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  status capa_status_enum NOT NULL DEFAULT 'draft',
  effectiveness_check_date date,
  effectiveness_result text,
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE capa_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capa_read" ON capa_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "capa_write" ON capa_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
    OR owner_id = auth.uid()
  );

CREATE INDEX idx_capa_status ON capa_records(status);
CREATE INDEX idx_capa_issue ON capa_records(issue_id);
