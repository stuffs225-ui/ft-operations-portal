-- Phase 10: SLA Rules
-- This migration renames the legacy sla_rules table (created in 006_master_data.sql)
-- to sla_rule_templates, then creates the Phase 10 sla_rules table with the new schema.

-- Rename legacy table (Settings admin UI continues to use sla_rule_templates)
ALTER TABLE IF EXISTS public.sla_rules RENAME TO sla_rule_templates;

-- Rename associated trigger if it exists
DROP TRIGGER IF EXISTS sla_rules_updated_at ON public.sla_rule_templates;

CREATE TRIGGER sla_rule_templates_updated_at
  BEFORE UPDATE ON public.sla_rule_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Phase 10 sla_rules: module-level SLA tracking rules

CREATE TYPE sla_severity_enum AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.sla_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key          text UNIQUE NOT NULL,
  rule_name         text NOT NULL,
  module_name       text NOT NULL,
  trigger_status    text NOT NULL,
  target_status     text NOT NULL,
  duration_hours    integer NOT NULL,
  severity          sla_severity_enum NOT NULL DEFAULT 'medium',
  applies_to_roles  text[] NOT NULL DEFAULT '{}',
  escalation_roles  text[] NOT NULL DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER sla_rules_updated_at
  BEFORE UPDATE ON public.sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_rules_select" ON public.sla_rules
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "sla_rules_admin_write" ON public.sla_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operations_manager'))
  );
