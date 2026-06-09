-- ── 069_invoicing_plans_milestones.sql ───────────────────────────────────────
-- Invoice milestone tracking per project / SO.

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

-- One plan per project (1-to-1)
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

create trigger project_invoicing_plans_updated_at
  before update on public.project_invoicing_plans
  for each row execute function public.handle_updated_at();

-- Many milestones per plan
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

create trigger project_invoice_milestones_updated_at
  before update on public.project_invoice_milestones
  for each row execute function public.handle_updated_at();

create index if not exists idx_pip_project_id   on public.project_invoicing_plans(project_id);
create index if not exists idx_pim_plan_id      on public.project_invoice_milestones(plan_id);
create index if not exists idx_pim_project_id   on public.project_invoice_milestones(project_id);
create index if not exists idx_pim_status       on public.project_invoice_milestones(milestone_status);
create index if not exists idx_pim_due_date     on public.project_invoice_milestones(due_date);

-- ── RLS: project_invoicing_plans ───────────────────────────────────────────────
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

-- ── RLS: project_invoice_milestones ────────────────────────────────────────────
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
