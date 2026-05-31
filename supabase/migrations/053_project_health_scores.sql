-- Phase 10: Project Health Scores

CREATE TYPE score_band_enum AS ENUM ('healthy', 'watch', 'at_risk', 'critical');

CREATE TABLE project_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  score integer NOT NULL,
  score_band score_band_enum NOT NULL,
  delay_score integer NOT NULL DEFAULT 100,
  data_quality_score integer NOT NULL DEFAULT 100,
  procurement_score integer NOT NULL DEFAULT 100,
  factory_score integer NOT NULL DEFAULT 100,
  store_score integer NOT NULL DEFAULT 100,
  qc_score integer NOT NULL DEFAULT 100,
  afs_score integer NOT NULL DEFAULT 100,
  financial_visibility_score integer,
  blockers_count integer NOT NULL DEFAULT 0,
  open_risks_count integer NOT NULL DEFAULT 0,
  open_issues_count integer NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_scores_read" ON project_health_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "health_scores_admin_write" ON project_health_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );

CREATE INDEX idx_project_health_project ON project_health_scores(project_id);
