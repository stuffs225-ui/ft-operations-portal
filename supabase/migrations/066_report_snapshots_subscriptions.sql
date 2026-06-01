-- ── Migration 066: Report Snapshots + Scheduled Reports + Delivery Logs ────────
-- report_snapshots             : saved point-in-time department report exports
-- scheduled_report_subscriptions : admin/ops-configured recurring report delivery
-- report_delivery_logs         : delivery attempt audit (filled by Edge Fn later)

DO $$ BEGIN
  CREATE TYPE public.report_frequency_enum AS ENUM ('daily', 'weekly', 'monthly', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_snapshot_status AS ENUM ('generated', 'exported', 'shared', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── report_snapshots ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key      text NOT NULL,
  report_title    text NOT NULL,
  department      text,
  date_range_from date,
  date_range_to   date,
  filters_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  rows_json       jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text,
  status          public.report_snapshot_status NOT NULL DEFAULT 'generated',
  generated_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_key ON public.report_snapshots(report_key);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_by  ON public.report_snapshots(generated_by);

DROP TRIGGER IF EXISTS report_snapshots_updated_at ON public.report_snapshots;
CREATE TRIGGER report_snapshots_updated_at
  BEFORE UPDATE ON public.report_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rs_admin_all ON public.report_snapshots;
CREATE POLICY rs_admin_all ON public.report_snapshots
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

DROP POLICY IF EXISTS rs_user_insert ON public.report_snapshots;
CREATE POLICY rs_user_insert ON public.report_snapshots
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND generated_by = auth.uid());

DROP POLICY IF EXISTS rs_user_select_own ON public.report_snapshots;
CREATE POLICY rs_user_select_own ON public.report_snapshots
  FOR SELECT USING (generated_by = auth.uid());

-- ── scheduled_report_subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_report_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key      text NOT NULL,
  department      text,
  recipients_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency       public.report_frequency_enum NOT NULL DEFAULT 'manual',
  channels        text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_subs_key ON public.scheduled_report_subscriptions(report_key);

DROP TRIGGER IF EXISTS report_subs_updated_at ON public.scheduled_report_subscriptions;
CREATE TRIGGER report_subs_updated_at
  BEFORE UPDATE ON public.scheduled_report_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.scheduled_report_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srs_read_all ON public.scheduled_report_subscriptions;
CREATE POLICY srs_read_all ON public.scheduled_report_subscriptions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS srs_admin_write ON public.scheduled_report_subscriptions;
CREATE POLICY srs_admin_write ON public.scheduled_report_subscriptions
  FOR ALL
  USING (public.current_user_role() IN ('admin', 'operations_manager'))
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));

-- ── report_delivery_logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_delivery_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.scheduled_report_subscriptions(id) ON DELETE SET NULL,
  report_key      text NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  delivery_channel text NOT NULL DEFAULT 'in_app',
  delivery_status public.notification_delivery_status NOT NULL DEFAULT 'pending',
  recipients_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_logs_sub ON public.report_delivery_logs(subscription_id);

ALTER TABLE public.report_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rdl_admin_select ON public.report_delivery_logs;
CREATE POLICY rdl_admin_select ON public.report_delivery_logs
  FOR SELECT
  USING (public.current_user_role() IN ('admin', 'operations_manager'));

DROP POLICY IF EXISTS rdl_admin_insert ON public.report_delivery_logs;
CREATE POLICY rdl_admin_insert ON public.report_delivery_logs
  FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'operations_manager'));
