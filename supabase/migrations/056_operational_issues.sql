-- Phase 10: Operational Issues

CREATE TYPE issue_type_enum AS ENUM ('blocker', 'risk', 'action_item', 'observation', 'escalation');
CREATE TYPE issue_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE operational_issue_status_enum AS ENUM ('open', 'assigned', 'in_progress', 'waiting_input', 'resolved', 'closed', 'cancelled');

CREATE TABLE operational_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number text UNIQUE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  module_name text NOT NULL,
  issue_type issue_type_enum NOT NULL DEFAULT 'observation',
  severity issue_severity_enum NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_role text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status operational_issue_status_enum NOT NULL DEFAULT 'open',
  due_date date,
  closed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  closure_notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operational_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues_read" ON operational_issues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "issues_write" ON operational_issues
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
    OR owner_id = auth.uid()
  );

CREATE INDEX idx_issues_status ON operational_issues(status);
CREATE INDEX idx_issues_severity ON operational_issues(severity);
CREATE INDEX idx_issues_project ON operational_issues(project_id);
