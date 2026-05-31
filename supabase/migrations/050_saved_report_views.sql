-- Phase 10: Saved Report Views

CREATE TABLE saved_report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  view_name text NOT NULL,
  report_key text NOT NULL,
  filters_json jsonb,
  columns_json jsonb,
  sorting_json jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_report_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_views_own" ON saved_report_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_views_admin_read" ON saved_report_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_saved_report_views_user ON saved_report_views(user_id);
CREATE INDEX idx_saved_report_views_key ON saved_report_views(report_key);
