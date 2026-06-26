# Post-Migration UI Smoke Test — 099 + 100

**Branch:** `feature/missing-migrations-099-100-activation-pack`
**Run AFTER** applying `docs/sql/apply-migrations-099-100-supervised.sql` and passing
`docs/sql/postcheck-after-applying-099-100.sql`.

> **Read-only test.** Open modals to confirm they render, but **do NOT submit/save** any reschedule,
> amount change, or target unless the user explicitly approves writing to production.

Severity: **B** = blocker · **M** = major · **m** = minor.

---

## Admin — Sales Targets (migration 099)

| # | Step | Expected | Sev | Pass/Fail | Notes |
|---|------|----------|-----|-----------|-------|
| 1 | Login as **admin** | Lands `/admin-dashboard` | B | | |
| 2 | Open `/admin/sales-targets` | Page loads; **no "migration 99 pending" notice** | B | | |
| 3 | Observe table | Targets table renders (may be empty — that's fine) | M | | |
| 4 | Click "Add Target" / "Create Target" | Modal opens with user + year fields | M | | |
| 5 | Inspect collection target | Blank shows as not-set (NULL), never auto-filled from invoicing | M | | |
| 6 | Close modal | **Do not save** unless approved | — | | |

## Admin — Invoicing Schedule (migration 100)

| # | Step | Expected | Sev | Pass/Fail | Notes |
|---|------|----------|-----|-----------|-------|
| 7 | Open `/admin/invoicing-schedule` | Page loads; **no "migration 100 pending" notice** | B | | |
| 8 | Observe schedule table | Lines render (backfilled default lines visible for eligible projects) | B | | |
| 9 | Observe KPI cards | Total Scheduled / Pending / Overdue etc. show real numbers | M | | |
| 10 | Observe Overdue Alerts section | Loads from `project_invoicing_schedule_alerts_view` (may be empty) | M | | |
| 11 | Open History drawer on a row | Opens (empty history is fine on a fresh line) | m | | |
| 12 | Open Reschedule modal | Modal opens with date + reason | M | | |
| 13 | **Do NOT submit** reschedule | (unless user approves a real change) | — | | |
| 14 | Open Update Amount modal | Modal opens with amount + reason | M | | |
| 15 | **Do NOT submit** amount change | (unless user approves) | — | | |
| 16 | Split modal | Remains **disabled** (no split RPC yet) — expected | m | | |

## Sales User — Dashboard (migration 100)

| # | Step | Expected | Sev | Pass/Fail | Notes |
|---|------|----------|-----|-----------|-------|
| 17 | Login as **sales_user**, open `/sales` | **No amber "migration not active yet" banner** | B | | |
| 18 | Pending Invoicing KPI | Shows a real value (not "—") | M | | |
| 19 | Invoicing Plan table | Populates with the user's scheduled lines | M | | |
| 20 | Invoicing target section | "Invoiced up to date" / "Year plan" show real values (not "—") | M | | |
| 21 | Projects / pipeline / SO / collection cards | Still load (regression check) | M | | |
| 22 | Overall | No crash, no error panel | B | | |

## Viewer / Operations Manager (regression + permission)

| # | Step | Expected | Sev | Pass/Fail | Notes |
|---|------|----------|-----|-----------|-------|
| 23 | Login as **operations_manager**, open `/control-tower` | Loads; cross-module KPIs | M | | |
| 24 | ops_manager — any invoicing surface | Read-only; **no reschedule/amount write actions** | M | | |
| 25 | Login as **viewer**, open `/management-dashboard` | Loads read-only; **no admin/mutation actions, no targets exposure** | B | | |

---

## Rollback / stop criteria

- Any **B** failure → **STOP**, treat as Production Hold (`go-no-go-decision-matrix.md`), and
  follow rollback in `safe-migration-application-runbook.md` (restore the pre-apply backup).
- `/sales` showing the migration banner **after** a successful apply → migration 100 objects not
  fully created; re-run postcheck SQL and inspect §100.1–§100.3.
- Admin page still showing "migration pending" → the table/view/RPC is missing; do not proceed to
  go-live; re-verify with postcheck SQL.
- Backfill anomaly (postcheck §100.11 > 0, or duplicate lines) → investigate before go-live.
