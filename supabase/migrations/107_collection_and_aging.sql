-- ── 107_collection_and_aging.sql ──────────────────────────────────────────────
-- C3: Collection & Aging as two parts driven by finance uploads.
--
-- COLLECTION: a finance report uploaded a few times a year; each upload is a
--   record (collection_uploads) whose file staff can open. The latest upload is
--   "current".
-- AGING: a MONTHLY finance report. Each month is a snapshot (aging_snapshots) of
--   outstanding items (aging_items). The app diffs the newest month against the
--   prior one: an item whose invoice_ref is unseen last month is NEW; one seen
--   before is RECURRING and the owning salesman must add a clarification
--   (aging_clarifications) explaining why it isn't collected yet.
--
-- Ingestion (turning a finance file into aging_items rows) is an Admin/Finance
-- action; the salesman-facing read + clarify loop is enforced here by RLS.
-- Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Collection uploads ────────────────────────────────────────────────────────
create table if not exists public.collection_uploads (
  id             uuid primary key default gen_random_uuid(),
  period_label   text not null,               -- e.g. "H1 2026", "Q3 2026"
  document_id    uuid,                         -- optional link to a stored file
  note           text,
  uploaded_by    uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
comment on table public.collection_uploads is 'C3 Collection: periodic finance collection report uploads (latest = current).';

-- ── Aging snapshots (one per month) ───────────────────────────────────────────
create table if not exists public.aging_snapshots (
  id             uuid primary key default gen_random_uuid(),
  snapshot_month date not null,               -- first day of the month
  note           text,
  uploaded_by    uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (snapshot_month)
);
comment on table public.aging_snapshots is 'C3 Aging: one monthly snapshot of outstanding items from Finance.';

-- ── Aging items (rows of a snapshot) ──────────────────────────────────────────
create table if not exists public.aging_items (
  id                uuid primary key default gen_random_uuid(),
  snapshot_id       uuid not null references public.aging_snapshots(id) on delete cascade,
  invoice_ref       text not null,            -- stable key used for new-vs-recurring diff
  customer_name     text,
  project_code      text,
  amount            numeric(14,2) not null default 0,
  days_overdue      integer,
  sales_owner_id    uuid references auth.users(id),
  is_recurring      boolean not null default false,  -- set by ingestion (seen in a prior snapshot)
  first_seen_month  date,
  created_at        timestamptz not null default now()
);
create index if not exists idx_aging_items_snapshot on public.aging_items(snapshot_id);
create index if not exists idx_aging_items_owner on public.aging_items(sales_owner_id);
create index if not exists idx_aging_items_invoice on public.aging_items(invoice_ref);
comment on table public.aging_items is 'C3 Aging: outstanding items in a monthly snapshot; is_recurring drives the required clarification.';

-- ── Aging clarifications (salesman explains why not collected) ─────────────────
create table if not exists public.aging_clarifications (
  id              uuid primary key default gen_random_uuid(),
  aging_item_id   uuid not null references public.aging_items(id) on delete cascade,
  author_id       uuid references auth.users(id),
  author_name     text,
  body            text not null check (length(btrim(body)) > 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_aging_clarifications_item on public.aging_clarifications(aging_item_id, created_at);
comment on table public.aging_clarifications is 'C3 Aging: salesman clarification on a recurring uncollected item.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.collection_uploads   enable row level security;
alter table public.aging_snapshots       enable row level security;
alter table public.aging_items           enable row level security;
alter table public.aging_clarifications  enable row level security;

-- helper: is the current user admin / ops / finance-capable?
-- (finance is represented by admin/operations_manager here.)
-- Reads: all authenticated may read uploads/snapshots; items are scoped so a
-- salesman sees their own, admin/ops see all.
drop policy if exists cu_select on public.collection_uploads;
create policy cu_select on public.collection_uploads for select to authenticated using (true);
drop policy if exists cu_write on public.collection_uploads;
create policy cu_write on public.collection_uploads for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

drop policy if exists as_select on public.aging_snapshots;
create policy as_select on public.aging_snapshots for select to authenticated using (true);
drop policy if exists as_write on public.aging_snapshots;
create policy as_write on public.aging_snapshots for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

drop policy if exists ai_select on public.aging_items;
create policy ai_select on public.aging_items for select to authenticated using (
  sales_owner_id = auth.uid()
  or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer'))
);
drop policy if exists ai_write on public.aging_items;
create policy ai_write on public.aging_items for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

-- Clarifications: the owning salesman (of the item) or admin/ops may read/append.
drop policy if exists ac_select on public.aging_clarifications;
create policy ac_select on public.aging_clarifications for select to authenticated using (
  exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer')))
  )
);
drop policy if exists ac_insert on public.aging_clarifications;
create policy ac_insert on public.aging_clarifications for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  )
);
