-- ============================================================================
-- SUPERVISED ACTIVATION PACK — Migrations 099 + 100
-- FT Operations Portal — apply ONLY in the Supabase SQL Editor, supervised.
-- ============================================================================
--
-- WHAT THIS DOES
--   099  sales_user_targets            (table + RLS + policies + indexes + updated_at trigger)
--   100  project_invoicing_schedule    (+ history table, alerts view, trigger fn, 2 RPCs, backfill)
--
-- LIVE STATUS (user-verified, read-only):
--   PRESENT : 068 hot_projects, 069 project_invoice_milestones, 070 receivables_aging_view,
--             storage buckets (afs-attachments, project-documents, qc-documents,
--             quotation-documents, raw-material-files, vehicle-photos)
--   MISSING : 099 + all 100 objects  ← this pack creates them
--
-- DEPENDENCIES (all verified present in repo migration history; required live):
--   public.profiles(id) [001] · public.user_roles(user_id, role) + public.user_role [002]
--   public.handle_updated_at() [001] · public.current_user_role() [003]
--   public.projects(id, customer_delivery_date, total_sales_value, sales_owner_id, created_by) [009]
--   auth.uid(), gen_random_uuid() (built-in)
--
-- BEFORE RUNNING
--   1. Take a Supabase backup.
--   2. Run docs/sql/precheck-before-applying-099-100.sql and review the output.
--   3. Run this pack ONCE in the SQL Editor.
--   4. Run docs/sql/postcheck-after-applying-099-100.sql.
--
-- IDEMPOTENCY
--   This pack is content from migrations 099 + 100 verbatim, EXCEPT the two bare
--   "create trigger ... updated_at" statements are wrapped in a
--   "do $$ ... exception when duplicate_object then null; end $$;" guard — the SAME
--   mechanical pattern already used elsewhere in migration 100. This makes the whole
--   pack safely re-runnable; logic is identical. No other change was made.
--   Tables use "create table if not exists"; functions "create or replace";
--   the backfill is guarded by "WHERE NOT EXISTS". Safe to re-run.
--
-- SAFETY
--   * RLS + policies are exactly as defined in the migration files.
--   * The backfill creates one default schedule line per existing eligible project
--     (delivery date set AND total_sales_value > 0) that has none — this is the
--     intended migration-100 behavior, not new logic.
--   * Run inside a transaction if your workflow prefers; both migrations are
--     compatible with a single transaction.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ MIGRATION 099 — sales_user_targets                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

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

do $$ begin
  create trigger sales_user_targets_updated_at
    before update on public.sales_user_targets
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null;
end $$;

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


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ MIGRATION 100 — project_invoicing_schedule (+ history, view, RPCs, backfill)║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── 100_project_invoicing_schedule.sql ────────────────────────────────────────
-- Project Invoicing Schedule Foundation.
--
-- WHY A NEW TABLE INSTEAD OF EXTENDING project_invoice_milestones:
--   • project_invoice_milestones is tied to project_invoicing_plans (1-to-1 plan
--     per project) and carries complex workflow state (submitted/approved/paid).
--   • The Sales Dashboard v2 needs a simpler, line-level source: one or more
--     scheduled invoicing dates per project, each with an amount and a current
--     expected date that Admin can reschedule.
--   • Milestones remain the workflow-execution source; this schedule is the
--     commercial planning source. They are additive, not replacing each other.
--
-- DESIGN DECISIONS:
--   • One project may have multiple schedule lines (installments).
--   • The delivery date from projects.customer_delivery_date becomes the default
--     invoice date when a project is created.
--   • A DB trigger fires AFTER INSERT on projects to create the default line.
--     This is preferred over an application helper because it fires for both
--     frontend inserts (ProjectNew.tsx) and DB function inserts
--     (convert_quotation_to_so). New project creation paths are also covered
--     automatically without code changes.
--   • invoice_year and invoice_month are GENERATED ALWAYS AS STORED columns;
--     they auto-update when current_invoice_date changes (no manual maintenance).
--   • Rescheduling requires Admin, a new date, and a change reason. Every
--     reschedule writes a history row — no silent changes are allowed.
--   • The overdue view exposes lines where current_invoice_date < current_date
--     and status is not invoiced/cancelled.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Enums ──────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.pis_status_enum as enum (
    'scheduled',    -- created, not yet due or actioned
    'overdue',      -- past due, not invoiced (application-set or view-derived)
    'rescheduled',  -- date changed by admin at least once
    'invoiced',     -- actually invoiced
    'cancelled'     -- line cancelled, ignore in totals
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.pis_source_enum as enum (
    'delivery_date',      -- system-generated from project delivery date
    'admin_split',        -- admin created as part of an installment split
    'admin_manual',       -- admin created manually (independent of delivery)
    'migration_backfill'  -- created by the migration backfill for existing projects
  );
exception when duplicate_object then null;
end $$;

-- ── project_invoicing_schedule ─────────────────────────────────────────────────

create table if not exists public.project_invoicing_schedule (
  id                    uuid        primary key default gen_random_uuid(),
  project_id            uuid        not null references public.projects(id) on delete cascade,
  sales_user_id         uuid        references public.profiles(id) on delete set null,

  sequence_no           integer     not null default 1,
  schedule_label        text,
  schedule_description  text,

  invoice_amount        numeric(14,2) not null,
  invoice_percentage    numeric(7,4),

  -- original_delivery_date: delivery date at time of schedule creation (never changes)
  original_delivery_date  date,
  -- original_invoice_date: invoice date set at creation (never changes)
  original_invoice_date   date,
  -- current_invoice_date: latest planned invoice date (changes on reschedule)
  current_invoice_date    date        not null,

  -- Derived from current_invoice_date; auto-updated when current_invoice_date changes
  invoice_year   integer generated always as (extract(year  from current_invoice_date)::integer) stored,
  invoice_month  integer generated always as (extract(month from current_invoice_date)::integer) stored,

  status          public.pis_status_enum  not null default 'scheduled',
  source          public.pis_source_enum  not null default 'delivery_date',

  delay_count         integer     not null default 0,
  last_change_reason  text,
  last_change_details text,
  last_rescheduled_by uuid        references public.profiles(id) on delete set null,
  last_rescheduled_at timestamptz,

  -- When actually invoiced
  invoiced_at         timestamptz,
  invoice_reference   text,

  created_by  uuid  references public.profiles(id) on delete set null,
  updated_by  uuid  references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One sequence number per project (installment ordering)
  constraint pis_project_seq_unique unique (project_id, sequence_no),

  -- Amount must be non-negative
  constraint pis_amount_nonneg check (invoice_amount >= 0),

  -- Percentage must be in [0, 100] when provided
  constraint pis_pct_range check (
    invoice_percentage is null
    or (invoice_percentage >= 0 and invoice_percentage <= 100)
  )
);

-- NOTE: sum(invoice_amount) vs projects.total_sales_value is NOT enforced at
-- DB constraint level because:
--   1. Projects may legitimately have split/partial schedules that evolve over time
--   2. A hard constraint would block valid intermediate states during admin setup
--   3. Validation should happen in the Admin UI and via the diagnostic query below
--
-- Diagnostic query to surface mismatches (run ad-hoc or via admin report):
--   SELECT p.id, p.project_code, p.total_sales_value,
--          coalesce(sum(pis.invoice_amount),0) as scheduled_total,
--          p.total_sales_value - coalesce(sum(pis.invoice_amount),0) as variance
--   FROM public.projects p
--   LEFT JOIN public.project_invoicing_schedule pis
--     ON pis.project_id = p.id AND pis.status != 'cancelled'
--   GROUP BY p.id, p.project_code, p.total_sales_value
--   HAVING p.total_sales_value != coalesce(sum(pis.invoice_amount),0);

do $$ begin
  create trigger pis_updated_at
    before update on public.project_invoicing_schedule
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null;
end $$;

create index if not exists idx_pis_project_id          on public.project_invoicing_schedule(project_id);
create index if not exists idx_pis_sales_user_id       on public.project_invoicing_schedule(sales_user_id);
create index if not exists idx_pis_current_invoice_date on public.project_invoicing_schedule(current_invoice_date);
create index if not exists idx_pis_invoice_year_month  on public.project_invoicing_schedule(invoice_year, invoice_month);
create index if not exists idx_pis_status              on public.project_invoicing_schedule(status);

-- ── project_invoicing_schedule_history ────────────────────────────────────────

create table if not exists public.project_invoicing_schedule_history (
  id           uuid        primary key default gen_random_uuid(),
  schedule_id  uuid        not null references public.project_invoicing_schedule(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,

  old_invoice_date    date,
  new_invoice_date    date,
  old_invoice_amount  numeric(14,2),
  new_invoice_amount  numeric(14,2),
  old_status          text,
  new_status          text,

  change_reason   text        not null,
  change_details  text,
  changed_by      uuid        references public.profiles(id) on delete set null,
  changed_at      timestamptz not null default now()
);

create index if not exists idx_pish_schedule_id  on public.project_invoicing_schedule_history(schedule_id);
create index if not exists idx_pish_project_id   on public.project_invoicing_schedule_history(project_id);
create index if not exists idx_pish_changed_at   on public.project_invoicing_schedule_history(changed_at);

-- ── RLS: project_invoicing_schedule ───────────────────────────────────────────

alter table public.project_invoicing_schedule enable row level security;

-- Admin: full CRUD
do $$ begin
  create policy "pis: admin full"
    on public.project_invoicing_schedule for all
    using  (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
exception when duplicate_object then null;
end $$;

-- Operations Manager: read-only (financial visibility, cannot reschedule)
do $$ begin
  create policy "pis: ops_manager read"
    on public.project_invoicing_schedule for select
    using (public.current_user_role() = 'operations_manager');
exception when duplicate_object then null;
end $$;

-- Sales User: read-only, own projects only
-- Uses same ownership pattern as project_invoice_milestones RLS
do $$ begin
  create policy "pis: sales_user own project read"
    on public.project_invoicing_schedule for select
    using (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = project_id and p.created_by = auth.uid()
      )
    );
exception when duplicate_object then null;
end $$;

-- All other roles (viewer, coordinator, etc.): no direct access
-- (Aggregated visibility can be added via a view with its own SECURITY DEFINER
-- if a future management report requires it.)

-- ── RLS: project_invoicing_schedule_history ────────────────────────────────────

alter table public.project_invoicing_schedule_history enable row level security;

-- Admin: full read + (SECURITY DEFINER functions handle writes)
do $$ begin
  create policy "pish: admin full"
    on public.project_invoicing_schedule_history for all
    using  (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
exception when duplicate_object then null;
end $$;

-- Operations Manager: read-only
do $$ begin
  create policy "pish: ops_manager read"
    on public.project_invoicing_schedule_history for select
    using (public.current_user_role() = 'operations_manager');
exception when duplicate_object then null;
end $$;

-- Sales User: read-only, own projects only
do $$ begin
  create policy "pish: sales_user own project read"
    on public.project_invoicing_schedule_history for select
    using (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.project_invoicing_schedule pis
        where pis.id = schedule_id
          and exists (
            select 1 from public.projects p
            where p.id = pis.project_id and p.created_by = auth.uid()
          )
      )
    );
exception when duplicate_object then null;
end $$;

-- ── Default schedule creation trigger ─────────────────────────────────────────
-- Fires AFTER INSERT on projects to create one default schedule line.
-- Uses SECURITY DEFINER so it can insert into project_invoicing_schedule
-- regardless of the role that inserted the project (sales_user, admin, or
-- the convert_quotation_to_so SECURITY DEFINER function).

create or replace function public.create_default_invoicing_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create a schedule line when delivery date and a positive value exist.
  -- This guards against edge cases (draft with no value, migration inserts, etc.).
  if new.customer_delivery_date is not null and new.total_sales_value > 0 then
    insert into public.project_invoicing_schedule (
      project_id,
      sales_user_id,
      sequence_no,
      schedule_label,
      invoice_amount,
      invoice_percentage,
      original_delivery_date,
      original_invoice_date,
      current_invoice_date,
      status,
      source,
      created_by
    ) values (
      new.id,
      new.sales_owner_id,
      1,
      'Default invoice on delivery',
      new.total_sales_value,
      100.00,
      new.customer_delivery_date,
      new.customer_delivery_date,
      new.customer_delivery_date,
      'scheduled',
      'delivery_date',
      new.created_by
    );
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger projects_create_default_invoicing_schedule
    after insert on public.projects
    for each row execute function public.create_default_invoicing_schedule();
exception when duplicate_object then null;
end $$;

-- ── Backfill: default schedule for existing projects ───────────────────────────
-- Creates one schedule line per project that has a delivery date and value but
-- no existing schedule lines. Safe to run multiple times (WHERE NOT EXISTS guard).

insert into public.project_invoicing_schedule (
  project_id,
  sales_user_id,
  sequence_no,
  schedule_label,
  invoice_amount,
  invoice_percentage,
  original_delivery_date,
  original_invoice_date,
  current_invoice_date,
  status,
  source,
  created_by
)
select
  p.id,
  p.sales_owner_id,
  1,
  'Default invoice on delivery',
  p.total_sales_value,
  100.00,
  p.customer_delivery_date,
  p.customer_delivery_date,
  p.customer_delivery_date,
  'scheduled'::public.pis_status_enum,
  'migration_backfill'::public.pis_source_enum,
  p.created_by
from public.projects p
where
  p.customer_delivery_date is not null
  and p.total_sales_value > 0
  and not exists (
    select 1 from public.project_invoicing_schedule pis
    where pis.project_id = p.id
  );

-- ── RPC: reschedule_project_invoicing_schedule ────────────────────────────────
-- Admin-only. Updates current_invoice_date, writes a history record, increments
-- delay_count. A change reason is mandatory — no silent reschedules.
-- invoice_year/invoice_month update automatically (generated columns).

create or replace function public.reschedule_project_invoicing_schedule(
  p_schedule_id   uuid,
  p_new_invoice_date date,
  p_change_reason text,
  p_change_details text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_role     public.user_role;
  v_schedule public.project_invoicing_schedule%rowtype;
begin
  -- ── Authorization ──────────────────────────────────────────────────────────
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role <> 'admin' then
    raise exception 'Only admin may reschedule invoicing schedule lines'
      using errcode = '42501';
  end if;

  -- ── Validation ─────────────────────────────────────────────────────────────
  if p_schedule_id is null then
    raise exception 'p_schedule_id is required' using errcode = '22004';
  end if;
  if p_new_invoice_date is null then
    raise exception 'p_new_invoice_date is required' using errcode = '22004';
  end if;
  if p_change_reason is null or trim(p_change_reason) = '' then
    raise exception 'p_change_reason is required' using errcode = '22004';
  end if;

  -- ── Load ───────────────────────────────────────────────────────────────────
  select * into v_schedule
  from public.project_invoicing_schedule
  where id = p_schedule_id;

  if not found then
    raise exception 'Invoicing schedule line not found' using errcode = 'P0002';
  end if;

  if v_schedule.status = 'invoiced' then
    raise exception 'Cannot reschedule an already invoiced line'
      using errcode = 'P0001';
  end if;

  if v_schedule.status = 'cancelled' then
    raise exception 'Cannot reschedule a cancelled line'
      using errcode = 'P0001';
  end if;

  -- ── History ────────────────────────────────────────────────────────────────
  insert into public.project_invoicing_schedule_history (
    schedule_id,
    project_id,
    old_invoice_date,
    new_invoice_date,
    old_invoice_amount,
    new_invoice_amount,
    old_status,
    new_status,
    change_reason,
    change_details,
    changed_by
  ) values (
    p_schedule_id,
    v_schedule.project_id,
    v_schedule.current_invoice_date,
    p_new_invoice_date,
    v_schedule.invoice_amount,
    v_schedule.invoice_amount,       -- amount unchanged on date reschedule
    v_schedule.status::text,
    'rescheduled',
    p_change_reason,
    p_change_details,
    v_uid
  );

  -- ── Update ─────────────────────────────────────────────────────────────────
  -- invoice_year / invoice_month are generated columns — NOT included here.
  update public.project_invoicing_schedule set
    current_invoice_date  = p_new_invoice_date,
    status                = 'rescheduled',
    delay_count           = delay_count + 1,
    last_change_reason    = p_change_reason,
    last_change_details   = p_change_details,
    last_rescheduled_by   = v_uid,
    last_rescheduled_at   = now(),
    updated_by            = v_uid,
    updated_at            = now()
  where id = p_schedule_id;
end;
$$;

-- ── RPC: update_project_invoicing_schedule_amount ─────────────────────────────
-- Admin-only. Adjusts the invoice_amount of a schedule line.
-- Separate from rescheduling so amount changes have their own audit trail.
-- Does NOT enforce that total schedule amounts equal project total_sales_value;
-- that is a business-layer concern, not a DB constraint.

create or replace function public.update_project_invoicing_schedule_amount(
  p_schedule_id       uuid,
  p_new_invoice_amount numeric,
  p_change_reason     text,
  p_change_details    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_role     public.user_role;
  v_schedule public.project_invoicing_schedule%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role <> 'admin' then
    raise exception 'Only admin may adjust invoicing schedule amounts'
      using errcode = '42501';
  end if;

  if p_schedule_id is null then
    raise exception 'p_schedule_id is required' using errcode = '22004';
  end if;
  if p_new_invoice_amount is null or p_new_invoice_amount < 0 then
    raise exception 'p_new_invoice_amount must be >= 0' using errcode = '22003';
  end if;
  if p_change_reason is null or trim(p_change_reason) = '' then
    raise exception 'p_change_reason is required' using errcode = '22004';
  end if;

  select * into v_schedule
  from public.project_invoicing_schedule
  where id = p_schedule_id;

  if not found then
    raise exception 'Invoicing schedule line not found' using errcode = 'P0002';
  end if;

  if v_schedule.status = 'invoiced' then
    raise exception 'Cannot adjust amount of an already invoiced line'
      using errcode = 'P0001';
  end if;

  insert into public.project_invoicing_schedule_history (
    schedule_id,
    project_id,
    old_invoice_date,
    new_invoice_date,
    old_invoice_amount,
    new_invoice_amount,
    old_status,
    new_status,
    change_reason,
    change_details,
    changed_by
  ) values (
    p_schedule_id,
    v_schedule.project_id,
    v_schedule.current_invoice_date,
    v_schedule.current_invoice_date,  -- date unchanged on amount adjust
    v_schedule.invoice_amount,
    p_new_invoice_amount,
    v_schedule.status::text,
    v_schedule.status::text,          -- status unchanged on amount adjust
    p_change_reason,
    p_change_details,
    v_uid
  );

  update public.project_invoicing_schedule set
    invoice_amount = p_new_invoice_amount,
    updated_by     = v_uid,
    updated_at     = now()
  where id = p_schedule_id;
end;
$$;

-- ── Overdue alert view ────────────────────────────────────────────────────────
-- SECURITY INVOKER (default): RLS of project_invoicing_schedule is applied.
-- Admin sees all overdue lines; sales_user sees only their own project lines;
-- viewer sees nothing.
--
-- A line is overdue when:
--   current_invoice_date < CURRENT_DATE
--   AND status NOT IN ('invoiced', 'cancelled')
--   AND invoiced_at IS NULL
--
-- The view does NOT update the status column. Status is updated by the Admin UI
-- or a scheduled job. The view is read-only for alerting purposes.

create or replace view public.project_invoicing_schedule_alerts_view as
select
  pis.id                    as schedule_id,
  pis.project_id,
  p.project_code,
  p.customer_name,
  pis.sequence_no,
  pis.schedule_label,
  pis.current_invoice_date,
  pis.invoice_amount,
  (current_date - pis.current_invoice_date)::integer as days_overdue,
  pis.sales_user_id,
  pis.status,
  pis.delay_count,
  pis.last_change_reason,
  pis.last_change_details
from public.project_invoicing_schedule pis
join public.projects p on p.id = pis.project_id
where
  pis.current_invoice_date < current_date
  and pis.status not in ('invoiced', 'cancelled')
  and pis.invoiced_at is null
order by pis.current_invoice_date asc;


-- ============================================================================
-- END OF ACTIVATION PACK. Now run postcheck-after-applying-099-100.sql.
-- ============================================================================
