-- ── 014_execution_references.sql ──────────────────────────────────────────────
-- WO / PN execution reference gate.
-- Saudi projects require a WO before any factory execution.
-- Dubai projects require a PN before any Dubai follow-up.

-- ── Enums ─────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.execution_reference_type as enum ('wo', 'pn');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.execution_reference_status as enum (
    'created',    -- reference number entered, not yet confirmed
    'confirmed',  -- confirmed by Admin / Operations Manager
    'superseded', -- replaced by a newer reference
    'cancelled'   -- voided
  );
exception when duplicate_object then null;
end $$;

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists public.project_execution_references (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.projects(id) on delete cascade,
  reference_type          public.execution_reference_type not null,
  reference_number        text not null,
  manufacturing_location  text not null check (manufacturing_location in ('saudi', 'dubai')),
  status                  public.execution_reference_status not null default 'created',
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  confirmed_by            uuid references public.profiles(id) on delete set null,
  confirmed_at            timestamptz,
  remarks                 text,

  -- WO only for Saudi; PN only for Dubai
  constraint exec_ref_location_type_match check (
    (reference_type = 'wo' and manufacturing_location = 'saudi') or
    (reference_type = 'pn' and manufacturing_location = 'dubai')
  ),

  -- Reference number is globally unique per reference type
  constraint exec_ref_number_type_unique unique (reference_number, reference_type)
);

-- Prevent two active (non-cancelled/non-superseded) references of the same type per project
create unique index if not exists exec_ref_one_active_per_project
  on public.project_execution_references (project_id, reference_type)
  where status in ('created', 'confirmed');

create index if not exists exec_ref_project_id_idx
  on public.project_execution_references (project_id);

create index if not exists exec_ref_reference_type_idx
  on public.project_execution_references (reference_type);

create index if not exists exec_ref_reference_number_idx
  on public.project_execution_references (reference_number);

create trigger execution_references_updated_at
  before update on public.project_execution_references
  for each row execute function public.handle_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.project_execution_references enable row level security;

-- Admin / Operations Manager: full CRUD
begin;
  do $$ begin
    create policy "exec_ref: admin_ops full access"
      on public.project_execution_references for all
      using (public.current_user_role() in ('admin', 'operations_manager'))
      with check (public.current_user_role() in ('admin', 'operations_manager'));
  exception when duplicate_object then null;
  end $$;
commit;

-- Factory user: create + update WO references for Saudi projects
begin;
  do $$ begin
    create policy "exec_ref: factory_user wo"
      on public.project_execution_references for all
      using (
        public.current_user_role() = 'factory_user'
        and reference_type = 'wo'
      )
      with check (
        public.current_user_role() = 'factory_user'
        and reference_type = 'wo'
      );
  exception when duplicate_object then null;
  end $$;
commit;

-- AFS user: read PN for Dubai projects
begin;
  do $$ begin
    create policy "exec_ref: afs_user read pn"
      on public.project_execution_references for select
      using (
        public.current_user_role() = 'afs_user'
        and reference_type = 'pn'
      );
  exception when duplicate_object then null;
  end $$;
commit;

-- Sales user: read own project references
begin;
  do $$ begin
    create policy "exec_ref: sales_user read own"
      on public.project_execution_references for select
      using (
        public.current_user_role() = 'sales_user'
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.created_by = auth.uid()
        )
      );
  exception when duplicate_object then null;
  end $$;
commit;

-- Procurement / Store / QC / Sales Coordinator / Viewer: read approved project references
begin;
  do $$ begin
    create policy "exec_ref: operational read"
      on public.project_execution_references for select
      using (
        public.current_user_role() in (
          'procurement_user', 'store_user', 'qc_user',
          'sales_coordinator', 'viewer'
        )
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.project_status = 'approved'
        )
      );
  exception when duplicate_object then null;
  end $$;
commit;

-- ── Blocking helper functions ──────────────────────────────────────────────────

-- Returns true if the project has an active (created or confirmed) WO
create or replace function public.project_has_wo(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.project_execution_references
    where project_id = p_project_id
      and reference_type = 'wo'
      and status in ('created', 'confirmed')
  );
$$;

-- Returns true if the project has an active PN
create or replace function public.project_has_pn(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.project_execution_references
    where project_id = p_project_id
      and reference_type = 'pn'
      and status in ('created', 'confirmed')
  );
$$;

-- Returns true if Saudi factory execution is unblocked
create or replace function public.can_start_saudi_factory(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.project_status = 'approved'
      and p.manufacturing_location = 'saudi'
  ) and public.project_has_wo(p_project_id);
$$;

-- Returns true if Dubai follow-up is unblocked
create or replace function public.can_start_dubai_followup(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.project_status = 'approved'
      and p.manufacturing_location = 'dubai'
  ) and public.project_has_pn(p_project_id);
$$;
