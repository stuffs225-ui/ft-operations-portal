-- 123_project_chassis_units.sql
-- Detailed chassis tracking — the #1 real-world production blocker on the factory's
-- Master List ("15 chassis received", "Awaiting Chassis"), which the system tracked
-- only as a summary count. Each row is one chassis unit with its own status.
-- The app keeps project_production_details.chassis_received/_total in sync from these
-- rows, so the Production Board and the project spine reflect them automatically.
-- Factory-owned RLS. Idempotent.

create table if not exists public.project_chassis_units (
  id             uuid        primary key default gen_random_uuid(),
  project_id     uuid        not null references public.projects(id) on delete cascade,
  chassis_number text,
  status         text        not null default 'ordered' check (status in ('ordered', 'in_transit', 'received', 'allocated', 'rejected')),
  po_number      text,
  received_date  date,
  remarks        text,
  created_by     uuid        references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_pcu_project on public.project_chassis_units(project_id);

create or replace function public.chassis_units_touch_updated_at()
  returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
do $$
begin
  begin
    create trigger trg_pcu_touch before update on public.project_chassis_units
      for each row execute function public.chassis_units_touch_updated_at();
  exception when duplicate_object then null; end;
end $$;

alter table public.project_chassis_units enable row level security;
do $$
begin
  begin
    execute 'create policy "pcu_read" on public.project_chassis_units for select using (auth.role() = ''authenticated'')';
  exception when duplicate_object then null; end;
  begin
    execute 'create policy "pcu_owner_write" on public.project_chassis_units for all
               using (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))
               with check (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))';
  exception when duplicate_object then null; end;
end $$;
