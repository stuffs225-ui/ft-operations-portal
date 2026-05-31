-- Phase 10: SLA Rules

CREATE TYPE sla_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  module_name text NOT NULL,
  trigger_status text NOT NULL,
  target_status text NOT NULL,
  duration_hours integer NOT NULL,
  severity sla_severity_enum NOT NULL DEFAULT 'medium',
  applies_to_roles text[] NOT NULL DEFAULT '{}',
  escalation_roles text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_rules_select" ON sla_rules
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "sla_rules_admin_write" ON sla_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );
