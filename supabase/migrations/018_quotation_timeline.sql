-- ── Phase 4: Quotation Timeline Events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotation_timeline_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  event_type           text NOT NULL,
  title                text NOT NULL,
  body                 text,
  actor_id             uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name           text,
  metadata             jsonb,
  is_system            boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qtl_quotation_id ON quotation_timeline_events(quotation_request_id, created_at DESC);

-- RLS
ALTER TABLE quotation_timeline_events ENABLE ROW LEVEL SECURITY;

-- Admin / ops: full access
CREATE POLICY qtl_admin_all ON quotation_timeline_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );

-- Sales user: own quotation timeline
CREATE POLICY qtl_sales_select ON quotation_timeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.requested_by = auth.uid()
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
    )
  );

CREATE POLICY qtl_sales_insert ON quotation_timeline_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('sales_user', 'sales_coordinator', 'admin', 'operations_manager'))
  );

-- Coordinator: select + insert all
CREATE POLICY qtl_coordinator_all ON quotation_timeline_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'sales_coordinator')
  );

-- Viewer: non-draft
CREATE POLICY qtl_viewer_select ON quotation_timeline_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotation_requests qr
      WHERE qr.id = quotation_request_id AND qr.quotation_status != 'draft'
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'viewer')
    )
  );
