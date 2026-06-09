-- ═══════════════════════════════════════════════════════════════════════════════
-- COMBINED DEPLOYMENT SCRIPT: migrations 067 → 068 → 069 → 070
-- ft-operations-portal
--
-- WHERE TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run
--   URL: https://supabase.com/dashboard/project/<your-project-ref>/sql/new
--
-- BEFORE YOU START:
--   1. Take a database backup (Dashboard → Settings → Database → Backups)
--   2. Ensure no other migrations are running simultaneously
--   3. Run the VERIFICATION SCRIPT first to see current state
--
-- EXPECTED SUCCESS: each statement completes with no ERROR lines in the output.
--   "NOTICE" messages are informational and safe to ignore.
--   Supabase SQL Editor shows "Success" in the result panel.
--
-- SAFE-TO-IGNORE errors: none expected — all statements are idempotent.
--
-- STOP-THE-PROCESS errors (investigate before continuing):
--   • ERROR: relation "..." does not exist        → prerequisite table missing
--   • ERROR: type "user_role" does not exist       → earlier migrations not applied
--   • ERROR: function handle_updated_at() does not exist → trigger helper missing
--   • ERROR: function current_user_role() does not exist → helper missing
--   • ERROR: permission denied                     → run as postgres/service role
--   • any ERROR: duplicate key value               → data collision, investigate
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 067: convert_quotation_to_so RPC
-- Idempotency: CREATE OR REPLACE FUNCTION — fully idempotent, no changes needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- Atomic, authorization-checked conversion of a "Returned to Sales" quotation
-- into a draft Sales Order / project.
create or replace function public.convert_quotation_to_so(p_quotation_id uuid)
returns table (project_id uuid, project_code text, so_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_role         public.user_role;
  v_q            public.quotation_requests%rowtype;
  v_project_id   uuid;
  v_project_code text;
  v_so_number    text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role not in ('admin', 'operations_manager', 'sales_user') then
    raise exception 'Your role is not permitted to convert quotations to SO'
      using errcode = '42501';
  end if;

  select * into v_q from public.quotation_requests where id = p_quotation_id;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- A sales_user may only convert quotations they own.
  if v_role = 'sales_user' and v_q.requested_by is distinct from v_uid then
    raise exception 'You can only convert your own quotations'
      using errcode = '42501';
  end if;

  -- Idempotent: already converted → return the existing link, do not duplicate.
  if v_q.converted_to_project_id is not null then
    select p.id, p.project_code, p.so_number
      into v_project_id, v_project_code, v_so_number
      from public.projects p
      where p.id = v_q.converted_to_project_id;
    return query select v_project_id, v_project_code, v_so_number;
    return;
  end if;

  -- Eligibility: the quotation response must be complete and returned to Sales.
  if v_q.quotation_status <> 'returned_to_sales' then
    raise exception
      'Quotation must be in "Returned to Sales" status to convert (current status: %)',
      v_q.quotation_status
      using errcode = 'P0001';
  end if;

  v_so_number := 'SO-' || v_q.quotation_code;

  insert into public.projects (
    project_code, so_number, customer_name, sales_owner_id,
    customer_delivery_date, project_status, total_sales_value, notes, created_by
  ) values (
    '',
    v_so_number,
    v_q.customer_name,
    coalesce(v_q.requested_by, v_uid),
    coalesce(v_q.required_delivery_expectation, (now() + interval '180 days')::date),
    'draft',
    coalesce(v_q.quotation_total_value, 0),
    'Converted from quotation ' || v_q.quotation_code,
    v_uid
  )
  returning id, project_code into v_project_id, v_project_code;

  update public.quotation_requests
    set quotation_status        = 'converted_to_so',
        converted_to_project_id = v_project_id,
        updated_at              = now()
    where id = p_quotation_id;

  return query select v_project_id, v_project_code, v_so_number;
end;
$$;

revoke all on function public.convert_quotation_to_so(uuid) from public;
grant execute on function public.convert_quotation_to_so(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 068: hot_projects table, triggers, indexes, RLS
-- Idempotency fixes applied:
--   • DROP TRIGGER IF EXISTS before each CREATE TRIGGER (triggers are not
--     idempotent in PostgreSQL versions < 16, and Supabase uses PG 15)
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.hot_project_stage as enum (
    'lead',
    'qualified',
    'proposal_required',
    'quotation_requested',
    'negotiation',
    'won',
    'lost',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.hot_projects (
  id                    uuid primary key default gen_random_uuid(),
  hot_project_code      text not null default '',
  title                 text not null,
  customer_name         text not null,
  customer_contact_name text,
  customer_email        text,
  customer_phone        text,
  opportunity_source    text,
  stage                 public.hot_project_stage not null default 'lead',
  probability           int not null default 50
                          constraint hot_projects_probability_check check (probability >= 0 and probability <= 100),
  estimated_value       numeric(15,2),
  expected_close_date   date,
  linked_quotation_id   uuid references public.quotation_requests(id) on delete set null,
  linked_project_id     uuid references public.projects(id) on delete set null,
  sales_owner_id        uuid references public.profiles(id) on delete set null,
  notes                 text,
  lost_reason           text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint hot_projects_code_unique unique (hot_project_code)
);

-- Drop triggers first so re-running this script is safe
drop trigger if exists hot_projects_updated_at on public.hot_projects;
create trigger hot_projects_updated_at
  before update on public.hot_projects
  for each row execute function public.handle_updated_at();

-- Auto-generate HP-YYYY-NNNN code
create or replace function public.generate_hot_project_code()
returns trigger language plpgsql as $$
declare
  year_str text := to_char(now(), 'YYYY');
  seq_num  int;
begin
  if new.hot_project_code = '' or new.hot_project_code is null then
    select count(*) + 1 into seq_num
    from public.hot_projects
    where hot_project_code like 'HP-' || year_str || '-%';
    new.hot_project_code := 'HP-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists hot_projects_generate_code on public.hot_projects;
create trigger hot_projects_generate_code
  before insert on public.hot_projects
  for each row execute function public.generate_hot_project_code();

create index if not exists idx_hot_projects_created_by on public.hot_projects(created_by);
create index if not exists idx_hot_projects_stage       on public.hot_projects(stage);
create index if not exists idx_hot_projects_created_at  on public.hot_projects(created_at desc);

alter table public.hot_projects enable row level security;

do $$ begin
  create policy "hot_projects: admin_ops full"
    on public.hot_projects for all
    using  (public.current_user_role() in ('admin', 'operations_manager'))
    with check (public.current_user_role() in ('admin', 'operations_manager'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user select own"
    on public.hot_projects for select
    using (public.current_user_role() = 'sales_user' and created_by = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user insert"
    on public.hot_projects for insert
    with check (public.current_user_role() = 'sales_user');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: sales_user update own open"
    on public.hot_projects for update
    using (
      public.current_user_role() = 'sales_user'
      and created_by = auth.uid()
      and stage not in ('won', 'lost', 'cancelled')
    )
    with check (
      public.current_user_role() = 'sales_user'
      and created_by = auth.uid()
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: coordinator read all"
    on public.hot_projects for select
    using (public.current_user_role() = 'sales_coordinator');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "hot_projects: viewer read all"
    on public.hot_projects for select
    using (public.current_user_role() = 'viewer');
exception when duplicate_object then null;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 069: project_invoicing_plans + project_invoice_milestones
-- Idempotency fixes applied:
--   • DROP TRIGGER IF EXISTS before each CREATE TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.milestone_status as enum (
    'planned',
    'ready_to_invoice',
    'submitted',
    'approved',
    'paid',
    'overdue',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.project_invoicing_plans (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  total_contract_value numeric(15,2) not null default 0,
  notes                text,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint project_invoicing_plans_project_unique unique (project_id)
);

drop trigger if exists project_invoicing_plans_updated_at on public.project_invoicing_plans;
create trigger project_invoicing_plans_updated_at
  before update on public.project_invoicing_plans
  for each row execute function public.handle_updated_at();

create table if not exists public.project_invoice_milestones (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.project_invoicing_plans(id) on delete cascade,
  project_id       uuid not null references public.projects(id) on delete cascade,
  milestone_name   text not null,
  milestone_status public.milestone_status not null default 'planned',
  percentage       numeric(5,2),
  amount           numeric(15,2) not null default 0,
  due_date         date,
  invoice_number   text,
  submitted_at     timestamptz,
  approved_at      timestamptz,
  paid_at          timestamptz,
  paid_amount      numeric(15,2),
  notes            text,
  sort_order       int not null default 0,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists project_invoice_milestones_updated_at on public.project_invoice_milestones;
create trigger project_invoice_milestones_updated_at
  before update on public.project_invoice_milestones
  for each row execute function public.handle_updated_at();

create index if not exists idx_pip_project_id on public.project_invoicing_plans(project_id);
create index if not exists idx_pim_plan_id    on public.project_invoice_milestones(plan_id);
create index if not exists idx_pim_project_id on public.project_invoice_milestones(project_id);
create index if not exists idx_pim_status     on public.project_invoice_milestones(milestone_status);
create index if not exists idx_pim_due_date   on public.project_invoice_milestones(due_date);

-- RLS: project_invoicing_plans
alter table public.project_invoicing_plans enable row level security;

do $$ begin
  create policy "pip: admin_ops full"
    on public.project_invoicing_plans for all
    using  (public.current_user_role() in ('admin', 'operations_manager'))
    with check (public.current_user_role() in ('admin', 'operations_manager'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pip: sales_user own project"
    on public.project_invoicing_plans for all
    using (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    )
    with check (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pip: coordinator_viewer read"
    on public.project_invoicing_plans for select
    using (public.current_user_role() in ('sales_coordinator', 'viewer'));
exception when duplicate_object then null;
end $$;

-- RLS: project_invoice_milestones
alter table public.project_invoice_milestones enable row level security;

do $$ begin
  create policy "pim: admin_ops full"
    on public.project_invoice_milestones for all
    using  (public.current_user_role() in ('admin', 'operations_manager'))
    with check (public.current_user_role() in ('admin', 'operations_manager'));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pim: sales_user own project"
    on public.project_invoice_milestones for all
    using (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    )
    with check (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "pim: coordinator_viewer read"
    on public.project_invoice_milestones for select
    using (public.current_user_role() in ('sales_coordinator', 'viewer'));
exception when duplicate_object then null;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 070: receivables_aging_view
-- Idempotency: CREATE OR REPLACE VIEW — fully idempotent, no changes needed.
-- ─────────────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA CACHE REFRESH
-- Supabase automatically refreshes PostgREST's schema cache when DDL completes,
-- but an explicit notify ensures the API picks up the new tables/view immediately.
-- ─────────────────────────────────────────────────────────────────────────────
notify pgrst, 'reload schema';
