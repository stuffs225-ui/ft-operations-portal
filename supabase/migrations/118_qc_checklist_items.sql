-- 118_qc_checklist_items.sql
-- Phase 2 of the Runtime Configuration layer.
--
-- Lets the QC team define its OWN inspection checklist items (instead of them being
-- hardcoded / absent), and record a pass/fail result per item on each inspection.
--   • qc_checklist_items                — the editable TEMPLATE, QC-owned, managed
--                                         from "Manage Lists". `category` scopes an
--                                         item to material / project / both.
--   • qc_inspection_checklist_results   — a per-inspection SNAPSHOT + result. The
--                                         link is polymorphic (inspection_type +
--                                         inspection_id) so it serves both the
--                                         material and project inspection tables.
-- No changes to existing tables. Idempotent.

-- ── Template ───────────────────────────────────────────────────────────────────
create table if not exists public.qc_checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  category    text        not null default 'both' check (category in ('material', 'project', 'both')),
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  created_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_qci_active on public.qc_checklist_items(is_active);

-- ── Per-inspection result (polymorphic link, no FK — validated in the app) ─────
create table if not exists public.qc_inspection_checklist_results (
  id               uuid        primary key default gen_random_uuid(),
  inspection_type  text        not null check (inspection_type in ('material', 'project')),
  inspection_id    uuid        not null,
  item_name        text        not null,
  sort_order       int         not null default 0,
  result           text        not null default 'pending' check (result in ('pending', 'pass', 'fail', 'na')),
  remarks          text,
  updated_by       uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_qcr_inspection on public.qc_inspection_checklist_results(inspection_type, inspection_id);

-- ── updated_at touch (shared) ──────────────────────────────────────────────────
create or replace function public.qc_checklist_touch_updated_at()
  returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

do $$
begin
  begin
    create trigger trg_qci_touch before update on public.qc_checklist_items
      for each row execute function public.qc_checklist_touch_updated_at();
  exception when duplicate_object then null; end;
  begin
    create trigger trg_qcr_touch before update on public.qc_inspection_checklist_results
      for each row execute function public.qc_checklist_touch_updated_at();
  exception when duplicate_object then null; end;
end $$;

-- ── RLS: read to any authenticated; write to qc_user + admin/ops ────────────────
alter table public.qc_checklist_items                enable row level security;
alter table public.qc_inspection_checklist_results   enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['qc_checklist_items', 'qc_inspection_checklist_results'] loop
    begin
      execute format('create policy "qcchk_read" on public.%1$s for select using (auth.role() = ''authenticated'')', tbl);
    exception when duplicate_object then null; end;
    begin
      execute format(
        'create policy "qcchk_owner_write" on public.%1$s for all
           using (public.current_user_role() in (''admin'',''operations_manager'',''qc_user''))
           with check (public.current_user_role() in (''admin'',''operations_manager'',''qc_user''))', tbl);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ── Seed a starter checklist (only if empty) — QC can edit/extend freely ────────
insert into public.qc_checklist_items (name, category, sort_order)
select v.name, v.category, v.sort_order
from (values
  ('Documentation & certificates complete', 'both',     1),
  ('Quantity matches order',                'material',  2),
  ('No visible damage / defects',           'both',      3),
  ('Serial / batch recorded',               'material',  4),
  ('Dimensions within tolerance',           'project',   5),
  ('Electrical systems functional',         'project',   6),
  ('Finish & paint quality acceptable',     'project',   7),
  ('Safety equipment present & functional', 'project',   8)
) as v(name, category, sort_order)
where not exists (select 1 from public.qc_checklist_items);
