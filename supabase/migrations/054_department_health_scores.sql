-- Phase 10: Department Health Scores

CREATE TABLE department_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_key text NOT NULL,
  score integer NOT NULL,
  score_band score_band_enum NOT NULL,
  open_tasks_count integer NOT NULL DEFAULT 0,
  overdue_tasks_count integer NOT NULL DEFAULT 0,
  sla_breaches_count integer NOT NULL DEFAULT 0,
  average_cycle_time_hours integer,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE department_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dept_health_read" ON department_health_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dept_health_admin_write" ON department_health_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );
