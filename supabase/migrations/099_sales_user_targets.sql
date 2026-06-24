-- ── 099_sales_user_targets.sql ────────────────────────────────────────────────
-- Annual targets per Sales User for the Sales Dashboard v2.
--
-- Three target types are tracked per user per year:
--   • sales_order_target  — value of approved/created SOs expected this year
--   • invoicing_target    — value to be invoiced this year
--   • collection_target   — value to be collected this year
--
-- All three targets are nullable: NULL means "not yet set by admin".
-- A value of 0 means a real zero target has been intentionally assigned.
-- Do not default targets to zero; leave them NULL until confirmed by admin.
--
-- FK to profiles(id) was chosen over auth.users(id) because:
--   1. profiles.id IS auth.users.id (1:1, profiles.id references auth.users(id))
--   2. All other app tables reference profiles(id) not auth.users(id) directly
--   3. Cascading on delete should mirror the profiles cascade behaviour
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.sales_user_targets (
  id                  uuid        primary key default gen_random_uuid(),
  sales_user_id       uuid        not null references public.profiles(id) on delete cascade,
  target_year         integer     not null,
  sales_order_target  numeric(14,2),
  invoicing_target    numeric(14,2),
  collection_target   numeric(14,2),
  currency            text        not null default 'SAR',
  notes               text,
  assigned_by         uuid        references public.profiles(id) on delete set null,
  updated_by          uuid        references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One record per sales user per year
  constraint sales_user_targets_user_year_unique unique (sales_user_id, target_year),

  -- Year must be in a plausible range
  constraint sales_user_targets_year_range
    check (target_year between 2020 and 2100),

  -- Non-negative when supplied
  constraint sales_user_targets_so_nonneg
    check (sales_order_target is null or sales_order_target >= 0),
  constraint sales_user_targets_inv_nonneg
    check (invoicing_target is null or invoicing_target >= 0),
  constraint sales_user_targets_col_nonneg
    check (collection_target is null or collection_target >= 0)
);

create trigger sales_user_targets_updated_at
  before update on public.sales_user_targets
  for each row execute function public.handle_updated_at();

create index if not exists idx_sut_sales_user_id  on public.sales_user_targets(sales_user_id);
create index if not exists idx_sut_target_year    on public.sales_user_targets(target_year);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.sales_user_targets enable row level security;

-- Admin: full CRUD
do $$ begin
  create policy "sut: admin full"
    on public.sales_user_targets for all
    using  (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
exception when duplicate_object then null;
end $$;

-- Operations Manager: read-only
-- Rationale: ops_manager can see financial performance data broadly
-- (aligned with financialVisibility='partial' in ROLE_CONFIGS), but should
-- not assign or modify targets — that responsibility belongs to admin.
do $$ begin
  create policy "sut: ops_manager read"
    on public.sales_user_targets for select
    using (public.current_user_role() = 'operations_manager');
exception when duplicate_object then null;
end $$;

-- Sales User: read their own target only — no writes
do $$ begin
  create policy "sut: sales_user own read"
    on public.sales_user_targets for select
    using (
      public.current_user_role() = 'sales_user'
      and sales_user_id = auth.uid()
    );
exception when duplicate_object then null;
end $$;

-- Viewer: no access
-- Rationale: viewer/management role has reporting access to aggregate
-- dashboards but individual sales targets are commercially sensitive and
-- are not currently exposed in any viewer route.  Extend if a future
-- management-level report requires it.
