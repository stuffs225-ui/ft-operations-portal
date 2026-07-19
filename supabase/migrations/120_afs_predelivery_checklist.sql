-- 120_afs_predelivery_checklist.sql
-- Phase 4 of the Runtime Configuration layer.
--
-- Lets AFS define its OWN pre-delivery checklist (today afs_predelivery_reports only
-- stores checklist_items_total / _passed as bare counts, with no itemised list).
--   • afs_predelivery_checklist_items    — the editable TEMPLATE, AFS-owned, managed
--                                          from "Manage Lists".
--   • afs_predelivery_checklist_results  — a per-report SNAPSHOT + pass/fail/na result.
-- The component keeps the report's existing checklist_items_total / _passed counters
-- in sync, so the readiness view and the pre-delivery list bar reflect the real list.
-- No changes to existing tables. Idempotent.

create table if not exists public.afs_predelivery_checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_apci_active on public.afs_predelivery_checklist_items(is_active);

create table if not exists public.afs_predelivery_checklist_results (
  id                    uuid        primary key default gen_random_uuid(),
  predelivery_report_id uuid        not null references public.afs_predelivery_reports(id) on delete cascade,
  item_name             text        not null,
  sort_order            int         not null default 0,
  result                text        not null default 'pending' check (result in ('pending', 'pass', 'fail', 'na')),
  remarks               text,
  updated_by            uuid        references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_apcr_report on public.afs_predelivery_checklist_results(predelivery_report_id);

create or replace function public.afs_checklist_touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
begin
  begin
    create trigger trg_apci_touch before update on public.afs_predelivery_checklist_items
      for each row execute function public.afs_checklist_touch_updated_at();
  exception when duplicate_object then null; end;
  begin
    create trigger trg_apcr_touch before update on public.afs_predelivery_checklist_results
      for each row execute function public.afs_checklist_touch_updated_at();
  exception when duplicate_object then null; end;
end $$;

alter table public.afs_predelivery_checklist_items   enable row level security;
alter table public.afs_predelivery_checklist_results enable row level security;

-- Write to AFS + QC + admin/ops (mirrors the pre-delivery report's own policies).
do $$
declare tbl text;
begin
  foreach tbl in array array['afs_predelivery_checklist_items', 'afs_predelivery_checklist_results'] loop
    begin
      execute format('create policy "apchk_read" on public.%1$s for select
                        using (auth.role() = ''authenticated'')', tbl);
    exception when duplicate_object then null; end;
    begin
      execute format('create policy "apchk_owner_write" on public.%1$s for all
                        using (public.current_user_role() in (''admin'',''operations_manager'',''afs_user'',''qc_user''))
                        with check (public.current_user_role() in (''admin'',''operations_manager'',''afs_user'',''qc_user''))', tbl);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Seed a starter checklist (only if empty) — AFS can edit/extend freely.
insert into public.afs_predelivery_checklist_items (name, sort_order)
select v.name, v.sort_order
from (values
  ('Exterior condition & paint',        1),
  ('All documentation present',         2),
  ('Electrical systems functional',     3),
  ('Equipment complete per spec',       4),
  ('No open missing items',             5),
  ('No open NCRs',                      6),
  ('QC Release Note issued',            7),
  ('Chassis & serial numbers verified', 8)
) as v(name, sort_order)
where not exists (select 1 from public.afs_predelivery_checklist_items);
