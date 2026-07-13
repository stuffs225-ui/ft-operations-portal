-- ── 108_aging_item_followup.sql ───────────────────────────────────────────────
-- Extends C3 Aging (migration 107) with two salesman-facing actions on an item:
--   1. Expected collection date — a single current estimate, set through a
--      SECURITY DEFINER RPC so the salesman can update just that one column
--      without a broad row-level UPDATE grant on aging_items.
--   2. Collection records — an append-only log of amounts collected (full or
--      partial) against an item, mirroring the aging_clarifications pattern.
-- Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.aging_items
  add column if not exists expected_collection_date date;
comment on column public.aging_items.expected_collection_date is
  'Salesman''s current estimate of when this item will be collected.';

-- ── Collection records (append-only) ──────────────────────────────────────────
create table if not exists public.aging_item_collections (
  id                uuid primary key default gen_random_uuid(),
  aging_item_id     uuid not null references public.aging_items(id) on delete cascade,
  amount            numeric(14,2) not null check (amount > 0),
  collected_at      date not null default current_date,
  note              text,
  recorded_by       uuid references auth.users(id),
  recorded_by_name  text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_aging_item_collections_item on public.aging_item_collections(aging_item_id, collected_at);
comment on table public.aging_item_collections is
  'C3 Aging: append-only log of amounts collected (full or partial) against an aging item.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.aging_item_collections enable row level security;

drop policy if exists aic_select on public.aging_item_collections;
create policy aic_select on public.aging_item_collections for select to authenticated using (
  exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer')))
  )
);

drop policy if exists aic_insert on public.aging_item_collections;
create policy aic_insert on public.aging_item_collections for insert to authenticated with check (
  recorded_by = auth.uid()
  and exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  )
);

-- No update/delete policy — collection records are append-only by design; a
-- correction is entered as a new (possibly negative-adjusting) note, not an edit.

-- ── Expected collection date RPC ──────────────────────────────────────────────
-- The owning salesman (or admin/operations_manager) may set the estimate.
-- SECURITY DEFINER so this can write a single column without a broad UPDATE
-- grant on aging_items (which would also expose amount/snapshot_id etc.).
create or replace function public.set_aging_item_expected_date(p_item_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.aging_items i
    where i.id = p_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  ) then
    raise exception 'Not authorized to update this aging item.';
  end if;

  update public.aging_items set expected_collection_date = p_date where id = p_item_id;
end;
$$;

grant execute on function public.set_aging_item_expected_date(uuid, date) to authenticated;
