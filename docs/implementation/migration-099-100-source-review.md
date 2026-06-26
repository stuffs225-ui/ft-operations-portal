# Migration 099 + 100 — Source Review

**Branch:** `feature/missing-migrations-099-100-activation-pack`
**Base main SHA:** `2f6c1529f12fc40480d33e0c3c6786eee4cb6ad9`

Review of `supabase/migrations/099_sales_user_targets.sql` and
`supabase/migrations/100_project_invoicing_schedule.sql` as the source of truth for the supervised
activation pack. **No migration was applied; this is a code/SQL review.**

---

## Migration 099 — `sales_user_targets`

| Aspect | Detail |
|--------|--------|
| **Tables** | `public.sales_user_targets` |
| **Views** | none |
| **Functions/RPCs** | none |
| **Triggers** | `sales_user_targets_updated_at` (BEFORE UPDATE → `handle_updated_at()`) |
| **Indexes** | `idx_sut_sales_user_id`, `idx_sut_target_year` (both `if not exists`) |
| **Constraints** | PK; `sales_user_targets_user_year_unique (sales_user_id, target_year)`; year-range check; 3 non-negative checks (so/inv/col) |
| **RLS** | enabled |
| **Policies** | `sut: admin full` (ALL), `sut: ops_manager read` (SELECT), `sut: sales_user own read` (SELECT, `sales_user_id = auth.uid()`) |
| **Dependencies** | `public.profiles(id)` [001]; `public.handle_updated_at()` [001]; `public.current_user_role()` [003]; `auth.uid()`; `gen_random_uuid()` |
| **Idempotent?** | Mostly — `create table if not exists`, `create index if not exists`, policies in `duplicate_object` guards, `enable row level security` (no-op if already on) |
| **Non-idempotent** | **1 statement**: bare `create trigger sales_user_targets_updated_at` (no `IF NOT EXISTS`; Postgres has none for triggers). Safe on first apply; errors on re-run |
| **Destructive?** | None |
| **Backfill / data writes?** | None |
| **Safe to paste into SQL Editor?** | Yes (first apply). The activation pack wraps the bare trigger in a `duplicate_object` guard to make it re-runnable |
| **Risk areas** | Low. Targets are nullable by design (NULL = not set; 0 = real zero) — preserved |

## Migration 100 — `project_invoicing_schedule`

| Aspect | Detail |
|--------|--------|
| **Tables** | `public.project_invoicing_schedule`, `public.project_invoicing_schedule_history` |
| **Views** | `public.project_invoicing_schedule_alerts_view` (SECURITY INVOKER — RLS of base table applies) |
| **Functions/RPCs** | `create_default_invoicing_schedule()` (trigger fn, SECURITY DEFINER); `reschedule_project_invoicing_schedule(uuid, date, text, text)` (SECURITY DEFINER, admin-only); `update_project_invoicing_schedule_amount(uuid, numeric, text, text)` (SECURITY DEFINER, admin-only) |
| **Triggers** | `pis_updated_at` (BEFORE UPDATE → `handle_updated_at()`); `projects_create_default_invoicing_schedule` (AFTER INSERT on `projects`) |
| **Indexes** | 5 on schedule (`project_id`, `sales_user_id`, `current_invoice_date`, `(invoice_year, invoice_month)`, `status`) + 3 on history — all `if not exists` |
| **Constraints** | PK; `pis_project_seq_unique (project_id, sequence_no)`; `pis_amount_nonneg`; `pis_pct_range` |
| **Generated columns** | `invoice_year`, `invoice_month` — `GENERATED ALWAYS AS … STORED` from `current_invoice_date` |
| **Enums** | `pis_status_enum`, `pis_source_enum` (in `duplicate_object` guards) |
| **RLS** | enabled on both tables |
| **Policies** | schedule: `pis: admin full`, `pis: ops_manager read`, `pis: sales_user own project read`; history: `pish: admin full`, `pish: ops_manager read`, `pish: sales_user own project read` |
| **Dependencies** | `public.projects(id, customer_delivery_date, total_sales_value, sales_owner_id, created_by)` [009]; `public.profiles(id)` [001]; `public.user_roles(user_id, role)` + `public.user_role` enum [002]; `public.handle_updated_at()` [001]; `public.current_user_role()` [003]; `auth.uid()`; `gen_random_uuid()` |
| **Idempotent?** | Strongly — tables `if not exists`; enums/policies/`projects_create_default_invoicing_schedule` trigger in `duplicate_object` guards; functions `create or replace`; view `create or replace`; **backfill INSERT guarded by `WHERE NOT EXISTS`** |
| **Non-idempotent** | **1 statement**: bare `create trigger pis_updated_at` (same trigger limitation). Safe on first apply; errors on re-run |
| **Destructive?** | None (no DROP/TRUNCATE/DELETE/UPDATE-of-existing) |
| **Backfill / data writes?** | **Yes — one backfill INSERT**: creates a single default schedule line per existing project with a delivery date and `total_sales_value > 0` that has no schedule line. Idempotent (`WHERE NOT EXISTS`). This is the intended migration-100 behavior, not new logic |
| **Safe to paste into SQL Editor?** | Yes (first apply). The pack wraps the bare `pis_updated_at` trigger for re-runnability |
| **Risk areas** | Backfill writes rows (expected) — surfaced in precheck §8 and postcheck §100.8–§100.11. The two SECURITY DEFINER RPCs enforce admin-only via `user_roles`; not callable by the apply step |

---

## Dependency verification (repo evidence)

| Dependency | Defined in | Confirmed |
|------------|-----------|-----------|
| `public.profiles(id)` | 001 | ✓ (foundational; 068/069/070 present implies it) |
| `public.handle_updated_at()` | 001 | ✓ (used by 064/065/066/068/069/079…) |
| `public.current_user_role()` | 003 | ✓ (used by 012/040/043/052/058/066/080/085…) |
| `public.user_roles(user_id, role)` + `public.user_role` enum | 002 | ✓ |
| `public.projects(...columns)` | 009 | ✓ (all 5 columns present) |

Because the user-verified live check shows 068/069/070 **present**, the entire foundational schema
(001–098) is applied, so every dependency above is present live.

---

## Idempotency adjustment in the activation pack (the only deviation)

The two bare `create trigger … updated_at` statements (099 + 100) are wrapped in:

```sql
do $$ begin
  create trigger <name> before update on <table>
    for each row execute function public.handle_updated_at();
exception when duplicate_object then null;
end $$;
```

This is **the same mechanical `duplicate_object` guard already used** for the
`projects_create_default_invoicing_schedule` trigger in migration 100. It is logic-preserving
(identical trigger, identical timing/function) and makes the whole pack safely re-runnable. **No
other change** was made; all other statements are verbatim from the migration files (verified: 0
source body lines missing from the pack).

---

## Conclusion

Both migrations are well-formed, dependency-complete, non-destructive, and safe to apply once via
the supervised pack. Migration 100 performs an idempotent backfill (expected). The activation pack
(`docs/sql/apply-migrations-099-100-supervised.sql`) is a faithful concatenation with only the two
trigger-idempotency wrappers added.
