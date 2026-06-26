# Live Supabase Read-Only Verification — Results

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`

> **No write SQL, no `db push`, no migrations, no production data change.** Only a read-only
> existence probe was attempted.

---

## Outcome: verification ATTEMPTED but NOT CONCLUSIVE — all statuses **Unknown**

A read-only existence probe was attempted from the build environment using the anon key in
`.env.local` (RLS-enforced REST, the same access the frontend uses — no service role, no writes).

**The Supabase host is blocked by this environment's network egress policy.** Every request
returned:

```
403 :: Host not in allowlist: <project>.supabase.co.
Add this host to your network egress settings to allow access.
```

A **negative control** (a deliberately fake table name) returned the **same** 403 as real tables,
confirming the 403 originates from the **egress proxy**, not from PostgREST/Postgres. Therefore the
probe **cannot distinguish present from missing**, and **no object status can be confirmed from
here**. (This control is the reason no false "present" result is reported.)

| Object | Migration | Live status | Why |
|--------|-----------|-------------|-----|
| `hot_projects` | 068 | **Unknown** | egress blocked |
| `project_invoice_milestones` | 069 | **Unknown** | egress blocked |
| `receivables_aging_view` | 070 | **Unknown** | egress blocked |
| `sales_user_targets` | 099 | **Unknown** | egress blocked |
| `project_invoicing_schedule` | 100 | **Unknown** | egress blocked |
| `project_invoicing_schedule_history` | 100 | **Unknown** | egress blocked |
| `project_invoicing_schedule_alerts_view` | 100 | **Unknown** | egress blocked |
| `reschedule_project_invoicing_schedule` (RPC) | 100 | **Unknown** | egress blocked |
| `update_project_invoicing_schedule_amount` (RPC) | 100 | **Unknown** | egress blocked |
| storage buckets / document tables | 058/096–098 | **Unknown** | egress blocked |

> **Strong indirect signal (not proof):** the program reports `/sales` currently renders the
> dashboard rather than the error panel. Because the Sales Dashboard query treats a missing
> `project_invoicing_schedule` as an error, a working `/sales` **implies migration 100 is applied**
> in the live environment. This must still be confirmed with the manual check below.

---

## Manual verification (REQUIRED — run by a user with DB access)

Run **`docs/sql/read-only-migration-verification.sql`** in the **Supabase SQL editor** (or any
read-only psql session). It is SELECT-only and safe for production.

Steps:
1. Open Supabase → SQL editor.
2. Paste the contents of `docs/sql/read-only-migration-verification.sql`.
3. Run. Review each section's `present` column.

### Manual result paste format

Paste results back here (replace `?` with `true`/`false`):

```
# Tables
sales_user_targets (099)                     present = ?
project_invoicing_schedule (100)             present = ?
project_invoicing_schedule_history (100)     present = ?
hot_projects (068)                           present = ?
project_invoice_milestones (069)             present = ?

# Views
receivables_aging_view (070)                 present = ?
project_invoicing_schedule_alerts_view (100) present = ?

# Functions / RPCs
reschedule_project_invoicing_schedule (100)  present = ?
update_project_invoicing_schedule_amount (100) present = ?
create_default_invoicing_schedule (100)      present = ?

# Trigger on project insert (migration 100)   present = ?
# RLS enabled on sales_user_targets / project_invoicing_schedule = ? / ?
# Storage buckets (procurement-documents, qc-documents, afs-documents, vehicle-photos) present = ?
```

### Interpretation

- All `true` → migrations 099 + 100 (and the core objects) are applied; the `/sales` migration-100
  risk is **resolved** by data.
- `project_invoicing_schedule = false` → **High-severity blocker**: `/sales` would show the new
  amber "migration pending" banner (after this PR) and the invoicing sections render as
  unavailable — apply migration 100 before go-live (see `safe-migration-application-runbook.md`).
- `sales_user_targets = false` → Admin Sales Targets shows "migration 99 pending"; Sales Dashboard
  shows "no targets". Both safe.
