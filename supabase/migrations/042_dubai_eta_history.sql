-- Phase 9: Dubai ETA Change History

CREATE TABLE IF NOT EXISTS dubai_eta_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dubai_followup_id uuid NOT NULL REFERENCES dubai_project_followups(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  project_vehicle_line_id uuid REFERENCES project_vehicle_lines(id) ON DELETE SET NULL,
  old_eta date,
  new_eta date NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  remarks text
);

CREATE INDEX idx_deh_followup ON dubai_eta_history(dubai_followup_id);
CREATE INDEX idx_deh_project ON dubai_eta_history(project_id);

ALTER TABLE dubai_eta_history ENABLE ROW LEVEL SECURITY;

-- admin / ops: read + write
CREATE POLICY deh_admin_full ON dubai_eta_history FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'operations_manager'));

-- afs_user: read
CREATE POLICY deh_afs_select ON dubai_eta_history FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'afs_user');

-- others: read
CREATE POLICY deh_others_select ON dubai_eta_history FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' NOT IN ('admin', 'operations_manager', 'afs_user'));
