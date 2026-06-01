# Final Route Test Plan (Manual)

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Purpose:** Manual verification of Wave A (mock isolation) and Wave B (route role guards + cost protection).

How to read this plan: run **Part A** in dev mode (no Supabase env vars), then
**Part B/C/D** in live mode (Supabase configured) against an **empty** database.
Tick each box; any crash or mock-leak is a failure.

---

## Part A — Dev mode (no Supabase configured)

Expected on every route: the page **loads**, shows **mock/sample data**, shows
the **"Dev mode — sample data"** badge where a `DataSourceBadge` is present, and
**does not crash**.

- [ ] Every route in the app loads without a blank screen or console crash.
- [ ] Pages with `DataSourceBadge` show the amber **Dev mode — sample data** badge.
- [ ] Lists/tables render sample rows (mock).
- [ ] `Dashboard` and `ControlTower` show sample KPIs (dev only).
- [ ] No uncaught errors in the console.

---

## Part B — Live mode (Supabase configured, empty DB)

For **each** route below confirm: it **loads**, shows **NO mock records**
(empty states / preview badges instead), and **does not crash on an empty DB**.

| Route | Loads | No mock shown | No crash |
|-------|:-----:|:-------------:|:--------:|
| `/dashboard` (shows "aggregation not yet connected" notice) | ☐ | ☐ | ☐ |
| `/control-tower` (shows "aggregation not yet connected" notice) | ☐ | ☐ | ☐ |
| `/inbox` | ☐ | ☐ | ☐ |
| `/sales` | ☐ | ☐ | ☐ |
| `/quotations` | ☐ | ☐ | ☐ |
| `/projects` | ☐ | ☐ | ☐ |
| `/projects/new` | ☐ | ☐ | ☐ |
| `/procurement` | ☐ | ☐ | ☐ |
| `/factory` | ☐ | ☐ | ☐ |
| `/store` | ☐ | ☐ | ☐ |
| `/custody` | ☐ | ☐ | ☐ |
| `/material-qc` | ☐ | ☐ | ☐ |
| `/project-qc` | ☐ | ☐ | ☐ |
| `/dubai-afs` | ☐ | ☐ | ☐ |
| `/after-sales` | ☐ | ☐ | ☐ |
| `/reports` | ☐ | ☐ | ☐ |
| `/templates` | ☐ | ☐ | ☐ |
| `/notifications` | ☐ | ☐ | ☐ |
| `/notifications/settings` | ☐ | ☐ | ☐ |
| `/request-access` | ☐ | ☐ | ☐ |
| `/admin/users` | ☐ | ☐ | ☐ |
| `/admin/access-requests` | ☐ | ☐ | ☐ |
| `/admin/report-subscriptions` | ☐ | ☐ | ☐ |
| `/admin/notification-rules` | ☐ | ☐ | ☐ |
| `/settings` | ☐ | ☐ | ☐ |
| `/audit-log` | ☐ | ☐ | ☐ |

Additional live-mode checks:
- [ ] Pages fixed in Wave A show the indigo **Preview — not yet connected** badge.
- [ ] `/notifications/settings` does **not** crash with empty preferences (GAP crash fix).
- [ ] No mock/sample row appears anywhere in live mode.

> Reports note: the 13 reports sub-pages (Executive/Projects/Sales/Procurement/
> Factory/Store/QC/Suppliers/SLA/Data Quality/Health Scores/Issues/CAPA) are
> still mock-only (GAP-05). They are expected to still show sample analytics in
> live mode until Wave F — record this as a **known issue**, not a test failure.

---

## Part C — Role-guard tests (live mode)

### As a non-admin (e.g. `factory_user`)
Deep-link directly to each URL. Each must show the **"Access restricted"** panel,
**NOT** the admin page:

- [ ] `/admin/users` → Access restricted
- [ ] `/settings` → Access restricted
- [ ] `/audit-log` → Access restricted
- [ ] `/admin/access-requests` → Access restricted

### As `admin`
- [ ] `/admin/users` loads
- [ ] `/settings` loads
- [ ] `/audit-log` loads
- [ ] `/admin/access-requests` loads
- [ ] All other guarded routes load (admin always allowed)

---

## Part D — Cost protection

Open a project's vehicle lines in `ProjectDetail` as each non-commercial role and
confirm **no revenue figures** (`unit_sales_value` / `line_total_value`) appear:

- [ ] `factory_user` — no revenue columns/values
- [ ] `store_user` — no revenue columns/values
- [ ] `qc_user` — no revenue columns/values
- [ ] `afs_user` — no revenue columns/values
- [ ] `viewer` — no revenue columns/values

(Backed by the `project_vehicle_lines_safe` view — Wave A cost-view fix.)

---

## Sign-off

| Part | Result | Tester | Notes |
|------|--------|--------|-------|
| A — Dev mode | ☐ Pass / ☐ Fail | | |
| B — Live mode (empty DB) | ☐ Pass / ☐ Fail | | |
| C — Role guards | ☐ Pass / ☐ Fail | | |
| D — Cost protection | ☐ Pass / ☐ Fail | | |
