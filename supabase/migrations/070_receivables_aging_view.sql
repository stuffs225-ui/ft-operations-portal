-- ── 070_receivables_aging_view.sql ───────────────────────────────────────────
-- View: outstanding invoice milestones with aging bucket classification.
-- RLS on the underlying tables is enforced — this view does NOT bypass it.

create or replace view public.receivables_aging_view as
select
  pim.id                                                   as milestone_id,
  pim.plan_id,
  pim.project_id,
  pim.milestone_name,
  pim.milestone_status,
  pim.amount,
  coalesce(pim.paid_amount, 0)                             as paid_amount,
  pim.amount - coalesce(pim.paid_amount, 0)                as outstanding_amount,
  pim.due_date,
  pim.invoice_number,
  pim.submitted_at,
  pim.approved_at,
  pim.paid_at,
  pim.sort_order,
  p.project_code,
  p.so_number,
  p.customer_name,
  p.sales_owner_id,
  p.project_status,
  pip.total_contract_value,
  case
    when pim.due_date is null                              then 'not_due'
    when pim.due_date > current_date                      then 'not_due'
    when current_date - pim.due_date between 0  and 30    then 'due_0_30'
    when current_date - pim.due_date between 31 and 60    then 'due_31_60'
    when current_date - pim.due_date between 61 and 90    then 'due_61_90'
    else                                                       'due_90_plus'
  end                                                      as aging_bucket,
  greatest(0, current_date - coalesce(pim.due_date, current_date + 1))
                                                           as days_overdue
from public.project_invoice_milestones pim
join public.project_invoicing_plans pip on pip.id = pim.plan_id
join public.projects                p   on p.id   = pim.project_id
where pim.milestone_status not in ('paid', 'cancelled');

grant select on public.receivables_aging_view to authenticated;
