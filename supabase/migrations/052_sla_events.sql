-- Phase 10: SLA Events

CREATE TYPE sla_event_status_enum AS ENUM ('open', 'acknowledged', 'escalated', 'resolved', 'cancelled');

CREATE TABLE sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES sla_rules(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  resolved_at timestamptz,
  status sla_event_status_enum NOT NULL DEFAULT 'open',
  severity sla_severity_enum NOT NULL DEFAULT 'medium',
  owner_role text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  escalation_level integer NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sla_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_events_read" ON sla_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sla_events_admin_write" ON sla_events
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'operations_manager')
  );

CREATE INDEX idx_sla_events_status ON sla_events(status);
CREATE INDEX idx_sla_events_due_at ON sla_events(due_at);
CREATE INDEX idx_sla_events_project ON sla_events(project_id);
