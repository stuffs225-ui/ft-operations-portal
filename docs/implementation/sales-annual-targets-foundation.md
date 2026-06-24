# Sales Annual Targets Foundation

**Branch:** `feature/sales-annual-targets-foundation`  
**Migration:** `099_sales_user_targets.sql`  
**Status:** Data foundation — no UI implemented

---

## Business Purpose

Sales Users need to see how their performance compares against yearly commercial targets on the Sales Dashboard v2. Three targets are tracked per Sales User per year:

| Target | Definition |
|--------|-----------|
| **Sales Order Target** | Expected total value of approved/created sales orders during the year |
| **Invoicing Target** | Expected total value to be invoiced during the year |
| **Collection Target** | Expected total value to be collected (received as payment) during the year |

Admin assigns these targets at the start of each year. They are annual figures — not monthly sub-targets.

---

## Terminology Definitions

These terms must not be mixed in UI labels or queries:

| Term | Meaning |
|------|---------|
| **Sales Order Target** | Target value for new confirmed SOs |
| **Invoicing Target** | Target value to be invoiced (milestone `amount`, when invoiced) |
| **Collection Target** | Target value to be actually collected (milestone `paid_amount`) |
| **Pending Invoicing / Unbilled Value** | Milestone amount scheduled but not yet invoiced: `status IN ('planned','ready_to_invoice')` |
| **Outstanding Receivables** | Invoiced but not yet collected: `status IN ('submitted','approved','overdue')`, using `amount - paid_amount` |

---

## Table Design: `sales_user_targets`

```sql
create table public.sales_user_targets (
  id                  uuid        primary key default gen_random_uuid(),
  sales_user_id       uuid        not null references public.profiles(id) on delete cascade,
  target_year         integer     not null,
  sales_order_target  numeric(14,2),        -- NULL = not yet set
  invoicing_target    numeric(14,2),        -- NULL = not yet set
  collection_target   numeric(14,2),        -- NULL = not yet set
  currency            text        not null default 'SAR',
  notes               text,
  assigned_by         uuid        references public.profiles(id) on delete set null,
  updated_by          uuid        references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint sales_user_targets_user_year_unique unique (sales_user_id, target_year),
  constraint sales_user_targets_year_range       check (target_year between 2020 and 2100),
  constraint sales_user_targets_so_nonneg        check (sales_order_target  is null or sales_order_target  >= 0),
  constraint sales_user_targets_inv_nonneg       check (invoicing_target    is null or invoicing_target    >= 0),
  constraint sales_user_targets_col_nonneg       check (collection_target   is null or collection_target   >= 0)
);
```

### Why Annual Targets Per Sales User

- Sales performance reviews are done annually (year-end assessment)
- Monthly sub-targets add complexity without a clear current business need
- The UNIQUE(sales_user_id, target_year) constraint prevents accidental duplicates
- Targets can be revised by creating a new record for the next year, not by patching old ones

### Foreign Key Choice: `profiles(id)` not `auth.users(id)`

`profiles.id` IS `auth.users.id` — they share the same UUID (profiles.id is `references auth.users(id)`). All other application tables use `profiles(id)` for user references, not `auth.users(id)`. Using `profiles(id)` gives:
- Consistent reference pattern with the rest of the schema
- Cascade on delete aligned with profile lifecycle
- No impedance mismatch with the ORM layer

### NULL vs Zero

| Value | Meaning |
|-------|---------|
| `NULL` | Target not yet assigned by admin — UI should show "—" or "Not set" |
| `0` | Admin explicitly set a zero target |

**Never default target columns to 0.** A zero target must be explicitly chosen.

---

## RLS Policies

| Role | Access |
|------|--------|
| `admin` | Full CRUD (policy: `sut: admin full`) |
| `operations_manager` | SELECT only (policy: `sut: ops_manager read`) |
| `sales_user` | SELECT own record only — `sales_user_id = auth.uid()` (policy: `sut: sales_user own read`) |
| `viewer` | No access |
| All other roles | No access |

### Why Operations Manager Gets Read-Only

`operations_manager` has `financialVisibility: 'partial'` in `ROLE_CONFIGS`. Ops managers review team performance and escalate issues — they need to see targets to contextualise dashboard KPIs. They should not be able to assign or modify targets, which is an admin governance responsibility.

### Why Viewer Gets No Access

The `viewer` role has access to aggregate reports and management dashboards. Individual per-user commercial targets are not currently surfaced in any viewer route. This can be revisited when a management-level report requiring individual target visibility is designed.

### Why Sales User is Read-Only

Sales users should be able to see their own targets to track performance. They must not self-assign targets — that would defeat the governance purpose.

---

## Seed Strategy

### Why Seed Records Were Not Added to the Migration

Seeding by email inside a migration is unsafe because:
1. `profiles` and `auth.users` UUIDs are environment-specific — they differ between development, staging, and production
2. A hardcoded UUID in the migration would silently succeed in one environment and produce an FK violation or wrong assignment in another
3. Migrations are irreversible — a bad seed record is hard to clean up under RLS

### Manual Seed Snippet (Admin Runs After Deploy)

```sql
-- Run this as a superuser or service-role connection after 099 has been applied.
-- Replace the UUIDs with the actual profiles.id values from your environment.

-- How to find the UUIDs:
--   SELECT id, email FROM public.profiles
--   WHERE email IN ('sales.test@naffco.local', 'testsales@ft.com');

INSERT INTO public.sales_user_targets
  (sales_user_id, target_year, sales_order_target, invoicing_target, collection_target, currency, notes, assigned_by)
VALUES
  -- sales.test@naffco.local — replace <UUID_1> with actual profiles.id
  ('<UUID_1>', 2026, 75350000, 60000000, NULL, 'SAR',
   'Initial 2026 targets. Collection target not yet confirmed.', NULL),

  -- testsales@ft.com — replace <UUID_2> with actual profiles.id
  ('<UUID_2>', 2026, 75350000, 60000000, NULL, 'SAR',
   'Initial 2026 targets. Collection target not yet confirmed.', NULL)

ON CONFLICT (sales_user_id, target_year) DO UPDATE SET
  sales_order_target = EXCLUDED.sales_order_target,
  invoicing_target   = EXCLUDED.invoicing_target,
  -- collection_target left unchanged — do not overwrite with NULL inadvertently
  currency           = EXCLUDED.currency,
  notes              = EXCLUDED.notes,
  updated_by         = EXCLUDED.assigned_by;
```

### Collection Target: Left NULL Until Approved

`collection_target` is `NULL` in the seed snippet above. The business has not confirmed a collection target value for 2026. Do not invent a value. Do not use `invoicing_target` as a proxy for `collection_target`. The dashboard will display "—" for collection target KPIs until this value is explicitly set by admin.

---

## How This Supports Sales Dashboard v2

When the Sales Dashboard v2 is implemented (later PR), it will:

1. Call `getSalesTargetForUser(currentYear, currentUserId)` from `src/lib/salesTargetsQueries.ts`
2. Compare `sales_order_target` against `SUM(projects.total_sales_value WHERE approved_at IN current year)` to compute SO % achievement
3. Compare `invoicing_target` against `SUM(project_invoice_milestones.paid_amount WHERE paid_at IN current year)` to compute invoicing % achievement
4. Compare `collection_target` against actual collection data (once defined) — currently shown as "—"

When a target field is `NULL`, the corresponding KPI card displays "—" (target not set) rather than an empty/zero value.

---

## What Is Intentionally Not Implemented Yet

| Item | Reason |
|------|--------|
| Admin UI for entering targets | Separate PR: "Sales Targets Admin Management" |
| Monthly target breakdown | Not required — annual targets suffice for v2 |
| Sales Dashboard v2 UI | Separate PR |
| Collection target value for 2026 | Not confirmed by business; seed left NULL |
| Multi-currency support | SAR default sufficient for current scope |
| Target change history / audit | Not required for Phase 1 |

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/099_sales_user_targets.sql` | New migration: table + RLS |
| `src/types/database.ts` | `sales_user_targets` Row/Insert/Update types added manually |
| `src/lib/salesTargetsQueries.ts` | New read-only query helper |
| `docs/implementation/sales-annual-targets-foundation.md` | This document |
| `docs/implementation/README.md` | Entry added |

---

## Validation Results

- `npm run build`: ✅ clean
- `npx tsc --noEmit`: ✅ clean
- `npm run lint`: pre-existing issues only (21 errors / 35 warnings, unchanged from main)
- `git diff --check`: clean
