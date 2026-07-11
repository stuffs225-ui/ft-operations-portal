-- ── 103_financial_truth_views.sql ─────────────────────────────────────────────
-- One financial truth (audit findings H1 + H2,
-- docs/system-audit/13-full-critical-audit-2026-07.md).
--
-- DECISION (documented in docs/implementation/financial-truth.md):
--   • project_invoicing_schedule (100) is THE invoicing-plan source of truth.
--     project_invoicing_plans / project_invoice_milestones (069) are demoted to
--     READ-ONLY LEGACY at the application layer — no new rows are created by
--     the UI. No DB object from 069 is dropped or altered here (non-destructive;
--     removal is a future reviewed down-migration once legacy data is migrated).
--   • CONVENTION: schedule.invoice_amount is NET (excluding VAT). VAT is a
--     derived pass-through computed from the project's vehicle lines
--     (vat_applicable × 15% — must match VAT_RATE in src/lib/commercialFields.ts).
--     The one systematic exception: default lines auto-created by the
--     migration-100 trigger copy projects.total_sales_value, which is GROSS for
--     VAT projects — the reconciliation view below classifies those as
--     'matches_gross' so Admin can see and normalize them explicitly.
--
-- Adds two SECURITY INVOKER views (no table, policy, or trigger changes):
--   1. project_financials             — net / vat / gross per project
--   2. project_schedule_reconciliation — schedule total vs project value, classified
--
-- Revenue visibility in both views mirrors migration 060's rule exactly:
-- admin / operations_manager / the owning sales_user only.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099–102):
-- see docs/implementation/migration-103-activation.md. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. project_financials ─────────────────────────────────────────────────────
create or replace view public.project_financials as
select
  p.id                                   as project_id,
  p.project_code,
  p.so_number,
  p.customer_name,
  p.project_status,
  p.sales_owner_id,
  p.created_by,
  p.total_sales_value,
  count(pvl.id)::integer                 as line_count,
  coalesce(sum(pvl.line_total_value), 0)::numeric(15,2) as lines_net,
  -- 0.15 must stay in lock-step with VAT_RATE in src/lib/commercialFields.ts.
  coalesce(sum(case when pvl.vat_applicable then round(pvl.line_total_value * 0.15, 2) else 0 end), 0)::numeric(15,2) as lines_vat,
  (coalesce(sum(pvl.line_total_value), 0)
   + coalesce(sum(case when pvl.vat_applicable then round(pvl.line_total_value * 0.15, 2) else 0 end), 0))::numeric(15,2) as lines_gross,
  coalesce(sum(case when pvl.vat_applicable then 1 else 0 end), 0)::integer as vat_line_count
from public.projects p
left join public.project_vehicle_lines pvl on pvl.project_id = p.id
where
  auth.uid() is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or (public.current_user_role() = 'sales_user' and p.created_by = auth.uid())
  )
group by p.id;

grant select on public.project_financials to authenticated;

comment on view public.project_financials is
  'Net / VAT / gross per project, derived from vehicle lines (vat_applicable × 15%). Revenue-restricted: admin, operations_manager, owning sales_user (mirrors migration 060).';

-- ── 2. project_schedule_reconciliation ────────────────────────────────────────
create or replace view public.project_schedule_reconciliation as
select
  f.project_id,
  f.project_code,
  f.so_number,
  f.customer_name,
  f.project_status,
  f.total_sales_value,
  f.lines_net,
  f.lines_vat,
  f.lines_gross,
  coalesce(s.schedule_total, 0)::numeric(15,2) as schedule_total,
  coalesce(s.schedule_lines, 0)::integer       as schedule_lines,
  case
    when coalesce(s.schedule_lines, 0) = 0            then 'no_schedule'
    when abs(coalesce(s.schedule_total, 0) - f.lines_net)   <= 1 then 'matches_net'
    when abs(coalesce(s.schedule_total, 0) - f.lines_gross) <= 1 then 'matches_gross'
    else 'mismatch'
  end as reconciliation
from public.project_financials f
left join (
  select project_id,
         sum(invoice_amount) as schedule_total,
         count(*)            as schedule_lines
  from public.project_invoicing_schedule
  where status <> 'cancelled'
  group by project_id
) s on s.project_id = f.project_id;

grant select on public.project_schedule_reconciliation to authenticated;

comment on view public.project_schedule_reconciliation is
  'Non-cancelled schedule total vs the project''s net/gross line values. matches_net = follows the NET convention; matches_gross = trigger-default line carrying gross (normalize via the amount-adjust RPC); mismatch = needs attention. Inherits project_financials'' revenue restriction.';

-- Nothing from migration 069 (plans/milestones) is dropped, altered, or written.
-- No RLS policy, trigger, or guard is modified by this migration.
