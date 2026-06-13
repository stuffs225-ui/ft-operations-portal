-- ── 076_action_inbox_view_and_sla_seed.sql ──────────────────────────────────
-- 1. Seeds initial SLA rules (idempotent ON CONFLICT DO UPDATE).
-- 2. Creates action_inbox_view — a SECURITY INVOKER view that derives open
--    action items from live workflow state. Underlying table RLS applies to
--    every query, so each user sees only rows they are permitted to see.
-- Safe to run multiple times.

-- ── SLA rules seed ────────────────────────────────────────────────────────────

INSERT INTO public.sla_rules
  (rule_key, rule_name, module_name, trigger_status, target_status,
   duration_hours, severity, applies_to_roles, escalation_roles, is_active)
VALUES
  (
    'qtn_submitted_to_coordinator',
    'Quotation not processed by coordinator within 2 days',
    'quotation', 'submitted_by_sales', 'received_by_coordinator',
    48, 'high',
    ARRAY['sales_coordinator', 'operations_manager'],
    ARRAY['operations_manager', 'admin'],
    true
  ),
  (
    'qtn_received_to_estimation',
    'Quotation not forwarded to estimation within 24 hours',
    'quotation', 'received_by_coordinator', 'sent_to_estimation',
    24, 'medium',
    ARRAY['sales_coordinator'],
    ARRAY['operations_manager', 'admin'],
    true
  ),
  (
    'qtn_waiting_estimation_5d',
    'Waiting for estimation response beyond 5 days',
    'quotation', 'waiting_for_estimation', 'quotation_received',
    120, 'high',
    ARRAY['sales_coordinator', 'operations_manager'],
    ARRAY['admin'],
    true
  ),
  (
    'qtn_returned_not_acted',
    'Returned quotation not converted by sales within 3 days',
    'quotation', 'returned_to_sales', 'converted_to_so',
    72, 'high',
    ARRAY['sales_user', 'operations_manager'],
    ARRAY['operations_manager', 'admin'],
    true
  ),
  (
    'proj_pending_approval_2d',
    'Project pending approval for more than 2 days',
    'project', 'submitted_for_approval', 'approved',
    48, 'high',
    ARRAY['admin', 'operations_manager'],
    ARRAY['admin'],
    true
  ),
  (
    'proj_sent_back_not_revised',
    'Project sent back for revision not resubmitted within 2 days',
    'project', 'sent_back_for_revision', 'submitted_for_approval',
    48, 'medium',
    ARRAY['sales_user'],
    ARRAY['operations_manager', 'admin'],
    true
  ),
  (
    'inv_milestone_overdue',
    'Invoice milestone past due date and not submitted',
    'invoicing', 'ready_to_invoice', 'submitted',
    0, 'critical',
    ARRAY['operations_manager'],
    ARRAY['admin'],
    true
  )
ON CONFLICT (rule_key) DO UPDATE SET
  rule_name       = EXCLUDED.rule_name,
  duration_hours  = EXCLUDED.duration_hours,
  severity        = EXCLUDED.severity,
  applies_to_roles = EXCLUDED.applies_to_roles,
  escalation_roles = EXCLUDED.escalation_roles,
  is_active       = EXCLUDED.is_active,
  updated_at      = now();

-- ── action_inbox_view ─────────────────────────────────────────────────────────
-- Each branch unions one category of open actions.
-- All branches filter by public.current_user_role() so each role sees only
-- the actions relevant to them.
-- Underlying table RLS (quotation_requests, projects, project_invoice_milestones)
-- provides a second layer of isolation.

create or replace view public.action_inbox_view as

-- 1. Coordinator: newly submitted quotation waiting to be processed
select
  'qtn_new_' || qr.id                              as id,
  'Process Quotation Request'                       as title,
  qr.quotation_code || ' — ' || qr.customer_name   as description,
  'quotation'                                       as action_type,
  'quotation_request'                               as related_entity_type,
  qr.id::text                                       as related_entity_id,
  null::uuid                                        as assigned_to_user_id,
  'sales_coordinator'                               as assigned_to_role,
  'sales'                                           as department,
  case qr.priority
    when 'urgent' then 'critical'
    when 'high'   then 'high'
    when 'medium' then 'medium'
    else               'low'
  end                                               as priority,
  (qr.submitted_at + interval '48 hours')          as due_at,
  case
    when (qr.submitted_at + interval '48 hours') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/quotations/' || qr.id                          as path,
  qr.created_at,
  qr.updated_at
from public.quotation_requests qr
where qr.quotation_status = 'submitted_by_sales'
  and qr.submitted_at is not null
  and public.current_user_role() in ('admin', 'operations_manager', 'sales_coordinator')

union all

-- 2. Coordinator: received quotation not yet sent to estimation
select
  'qtn_coord_' || qr.id                            as id,
  'Send Quotation to Estimation'                    as title,
  qr.quotation_code || ' — ' || qr.customer_name   as description,
  'quotation'                                       as action_type,
  'quotation_request'                               as related_entity_type,
  qr.id::text                                       as related_entity_id,
  null::uuid                                        as assigned_to_user_id,
  'sales_coordinator'                               as assigned_to_role,
  'sales'                                           as department,
  case qr.priority
    when 'urgent' then 'critical'
    when 'high'   then 'high'
    when 'medium' then 'medium'
    else               'low'
  end                                               as priority,
  (qr.updated_at + interval '24 hours')            as due_at,
  case
    when (qr.updated_at + interval '24 hours') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/quotations/' || qr.id                          as path,
  qr.created_at,
  qr.updated_at
from public.quotation_requests qr
where qr.quotation_status = 'received_by_coordinator'
  and public.current_user_role() in ('admin', 'operations_manager', 'sales_coordinator')

union all

-- 3. Coordinator/Ops: follow up with estimation team (> 5 days waiting)
select
  'qtn_est_' || qr.id                              as id,
  'Follow Up with Estimation'                       as title,
  qr.quotation_code || ' — ' || qr.customer_name   as description,
  'quotation'                                       as action_type,
  'quotation_request'                               as related_entity_type,
  qr.id::text                                       as related_entity_id,
  null::uuid                                        as assigned_to_user_id,
  'sales_coordinator'                               as assigned_to_role,
  'sales'                                           as department,
  'medium'                                          as priority,
  (qr.sent_to_estimation_at + interval '5 days')   as due_at,
  case
    when (qr.sent_to_estimation_at + interval '5 days') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/quotations/' || qr.id                          as path,
  qr.created_at,
  qr.updated_at
from public.quotation_requests qr
where qr.quotation_status = 'waiting_for_estimation'
  and qr.sent_to_estimation_at is not null
  and public.current_user_role() in ('admin', 'operations_manager', 'sales_coordinator')

union all

-- 4. Sales user: provide clarification requested by coordinator
select
  'qtn_clar_' || qr.id                             as id,
  'Provide Clarification'                           as title,
  qr.quotation_code || ' — ' || qr.customer_name   as description,
  'quotation'                                       as action_type,
  'quotation_request'                               as related_entity_type,
  qr.id::text                                       as related_entity_id,
  qr.requested_by                                   as assigned_to_user_id,
  'sales_user'                                      as assigned_to_role,
  'sales'                                           as department,
  'high'                                            as priority,
  (qr.updated_at + interval '48 hours')            as due_at,
  case
    when (qr.updated_at + interval '48 hours') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/quotations/' || qr.id                          as path,
  qr.created_at,
  qr.updated_at
from public.quotation_requests qr
where qr.quotation_status = 'need_clarification'
  and (
    public.current_user_role() in ('admin', 'operations_manager', 'sales_coordinator')
    or (public.current_user_role() = 'sales_user' and qr.requested_by = auth.uid())
  )

union all

-- 5. Sales user: act on quotation returned by coordinator
select
  'qtn_ret_' || qr.id                              as id,
  'Review Returned Quotation'                       as title,
  qr.quotation_code || ' — ' || qr.customer_name   as description,
  'quotation'                                       as action_type,
  'quotation_request'                               as related_entity_type,
  qr.id::text                                       as related_entity_id,
  qr.requested_by                                   as assigned_to_user_id,
  'sales_user'                                      as assigned_to_role,
  'sales'                                           as department,
  'high'                                            as priority,
  (qr.returned_to_sales_at + interval '3 days')    as due_at,
  case
    when (qr.returned_to_sales_at + interval '3 days') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/quotations/' || qr.id                          as path,
  qr.created_at,
  qr.updated_at
from public.quotation_requests qr
where qr.quotation_status = 'returned_to_sales'
  and qr.returned_to_sales_at is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or (public.current_user_role() = 'sales_user' and qr.requested_by = auth.uid())
  )

union all

-- 6. Admin/Ops: approve project submitted for approval
select
  'proj_appr_' || p.id                             as id,
  'Approve Sales Order / Project'                   as title,
  p.project_code || ' — ' || p.customer_name        as description,
  'approval'                                        as action_type,
  'project'                                         as related_entity_type,
  p.id::text                                        as related_entity_id,
  null::uuid                                        as assigned_to_user_id,
  'admin'                                           as assigned_to_role,
  'management'                                      as department,
  'high'                                            as priority,
  (p.submitted_at + interval '48 hours')           as due_at,
  case
    when (p.submitted_at + interval '48 hours') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/projects/' || p.id                             as path,
  p.created_at,
  p.updated_at
from public.projects p
where p.project_status = 'submitted_for_approval'
  and p.submitted_at is not null
  and public.current_user_role() in ('admin', 'operations_manager')

union all

-- 7. Sales user: revise project sent back for revision
select
  'proj_rev_' || p.id                              as id,
  'Revise and Resubmit Project'                    as title,
  p.project_code || ' — ' || p.customer_name        as description,
  'revision'                                        as action_type,
  'project'                                         as related_entity_type,
  p.id::text                                        as related_entity_id,
  p.created_by                                      as assigned_to_user_id,
  'sales_user'                                      as assigned_to_role,
  'sales'                                           as department,
  'high'                                            as priority,
  (p.updated_at + interval '48 hours')             as due_at,
  case
    when (p.updated_at + interval '48 hours') < now() then 'overdue'
    else 'open'
  end                                               as status,
  '/projects/' || p.id                             as path,
  p.created_at,
  p.updated_at
from public.projects p
where p.project_status = 'sent_back_for_revision'
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or (public.current_user_role() = 'sales_user' and p.created_by = auth.uid())
  )

union all

-- 8. Admin/Ops: overdue invoice milestones
select
  'inv_' || pim.id                                 as id,
  'Overdue Invoice Milestone'                       as title,
  p.project_code || ' — ' || pim.milestone_name   as description,
  'invoicing'                                       as action_type,
  'project_invoice_milestone'                       as related_entity_type,
  pim.id::text                                      as related_entity_id,
  null::uuid                                        as assigned_to_user_id,
  'operations_manager'                              as assigned_to_role,
  'finance'                                         as department,
  'critical'                                        as priority,
  pim.due_date::timestamptz                         as due_at,
  'overdue'                                         as status,
  '/projects/' || pim.project_id                   as path,
  pim.created_at,
  pim.updated_at
from public.project_invoice_milestones pim
join public.projects p on p.id = pim.project_id
where pim.due_date < current_date
  and pim.milestone_status not in ('paid', 'cancelled')
  and public.current_user_role() in ('admin', 'operations_manager')
;

grant select on public.action_inbox_view to authenticated;

notify pgrst, 'reload schema';
