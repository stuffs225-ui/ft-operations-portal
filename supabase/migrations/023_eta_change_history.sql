-- ── Phase 5: ETA Change History ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eta_change_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL,   -- 'pr_item' | 'po_to_supplier' | 'po_item'
  entity_id     uuid NOT NULL,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  old_eta       date,
  new_eta       date,
  changed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  reason        text NOT NULL,
  remarks       text
);

CREATE INDEX IF NOT EXISTS idx_eta_entity   ON eta_change_history(entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_eta_project  ON eta_change_history(project_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_eta_type     ON eta_change_history(entity_type, changed_at DESC);

ALTER TABLE eta_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY eta_admin_all ON eta_change_history FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','operations_manager'))
);

CREATE POLICY eta_procurement_all ON eta_change_history FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'procurement_user')
);

CREATE POLICY eta_other_select ON eta_change_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    AND role IN ('factory_user','store_user','qc_user','afs_user','viewer','sales_user'))
);
