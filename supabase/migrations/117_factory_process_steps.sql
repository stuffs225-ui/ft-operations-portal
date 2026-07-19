-- 117_factory_process_steps.sql
-- Phase 1 of the Runtime Configuration layer.
--
-- Replaces the hand-typed factory progress % with a value DERIVED from weighted,
-- factory-defined process steps. Two tables:
--   • factory_process_steps  — the editable TEMPLATE (name + weight + order),
--                              owned by the factory (managed from "Manage Lists").
--   • factory_record_steps   — a per production-record SNAPSHOT of the template
--                              taken at set-up time, so later template edits never
--                              rewrite the numbers of projects already in flight.
--
-- Progress is computed in the app as round(Σ(completion% × weight) / Σ(weight))
-- and written to the EXISTING factory_records.progress_percentage column, so every
-- existing consumer (Send-to-QC gate, reports, sales dashboard) keeps working with
-- no change. No triggers on governance tables. Idempotent.

-- ── Template: the factory's standard weighted process steps ────────────────────
create table if not exists public.factory_process_steps (
  id          uuid           primary key default gen_random_uuid(),
  name        text           not null,
  weight      numeric(6,2)   not null default 0 check (weight >= 0),
  sort_order  int            not null default 0,
  is_active   boolean        not null default true,
  created_by  uuid           references public.profiles(id) on delete set null,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);
create index if not exists idx_fps_active on public.factory_process_steps(is_active);

-- ── Per-record instance: snapshot of the template + live completion ────────────
create table if not exists public.factory_record_steps (
  id                 uuid          primary key default gen_random_uuid(),
  factory_record_id  uuid          not null references public.factory_records(id) on delete cascade,
  project_id         uuid          references public.projects(id) on delete set null,
  step_name          text          not null,
  weight             numeric(6,2)  not null default 0,
  sort_order         int           not null default 0,
  completion_pct     numeric(5,2)  not null default 0 check (completion_pct >= 0 and completion_pct <= 100),
  updated_by         uuid          references public.profiles(id) on delete set null,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);
create index if not exists idx_frs_record on public.factory_record_steps(factory_record_id);

-- ── updated_at touch trigger (shared by both tables) ───────────────────────────
create or replace function public.factory_steps_touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
begin
  begin
    create trigger trg_fps_touch before update on public.factory_process_steps
      for each row execute function public.factory_steps_touch_updated_at();
  exception when duplicate_object then null; end;
  begin
    create trigger trg_frs_touch before update on public.factory_record_steps
      for each row execute function public.factory_steps_touch_updated_at();
  exception when duplicate_object then null; end;
end $$;

-- ── RLS: read to any authenticated user; write to factory_user + admin/ops ──────
alter table public.factory_process_steps enable row level security;
alter table public.factory_record_steps  enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['factory_process_steps', 'factory_record_steps'] loop
    begin
      execute format(
        'create policy "fsteps_read" on public.%1$s for select
           using (auth.role() = ''authenticated'')', tbl);
    exception when duplicate_object then null; end;
    begin
      execute format(
        'create policy "fsteps_owner_write" on public.%1$s for all
           using (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))
           with check (public.current_user_role() in (''admin'',''operations_manager'',''factory_user''))', tbl);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ── Seed a sensible default template (only if the factory has none yet) ─────────
-- The factory can rename, re-weight, deactivate, or add to these at any time.
insert into public.factory_process_steps (name, weight, sort_order)
select v.name, v.weight, v.sort_order
from (values
  ('Cutting & Preparation',    10, 1),
  ('Welding & Fabrication',    25, 2),
  ('Assembly & Fit-out',       30, 3),
  ('Painting & Finishing',     15, 4),
  ('Testing & Commissioning',  20, 5)
) as v(name, weight, sort_order)
where not exists (select 1 from public.factory_process_steps);
