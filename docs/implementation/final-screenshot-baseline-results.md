# Final Screenshot Baseline — Results

**Branch:** `feature/final-production-readiness-screenshot-smoke-go-no-go`
**Base main SHA:** `1a385a6f2bfbb9c2a3d27ef51cba7b932b2f20f7`

> Real authentication preserved (secrets-based). No demo auth, no coverage reduction, no workflow
> change.

---

## Workflow run (triggered this sprint)

| Item | Value |
|------|-------|
| Workflow | **Role/Page Screenshot Baseline** (`.github/workflows/role-screenshot-baseline.yml`) |
| Trigger | `workflow_dispatch` on `main` (this sprint) |
| Run | **#2** — id `28264136467` |
| Run URL | https://github.com/stuffs225-ui/ft-operations-portal/actions/runs/28264136467 |
| Head SHA | `1a385a6` (post-migration — 099/100 applied) |
| Inputs | `capture_mode=full`, `upload_screenshots=true` |
| Expected artifact | **`full-role-page-screenshot-baseline`** (`index.html` + summary + zip) |
| Route count (manifest) | **98 static / 121 total** |
| Accounts (roles) | 12 real-auth accounts |

### Run health (observed)

Setup steps **succeeded**, confirming real auth + secrets are configured:
- Checkout, Node setup, deps install, Playwright Chromium install — ✅
- `.env.local` + `.env.screenshots.local` from secrets — ✅
- Dev server start + readiness — ✅
- Dry-run route-catalogue validation — ✅
- **Run screenshot capture** — the long capture step (per role × per route).

> **Why this run matters:** the only prior baseline (run #1, 2026-06-23) was captured **before**
> migrations 099/100 were applied, so its `/sales`, `/admin/invoicing-schedule`, and
> `/admin/sales-targets` screenshots would have shown the migration-pending / unavailable states.
> Run #2 captures the **post-migration** state and is the baseline to review for go-live.

---

## Critical screenshots to review (post-migration)

When the artifact is available, confirm these render **real data** (not "migration pending"):

- **`/sales`** — invoicing plan + Pending-Invoicing KPI populated; **no amber migration-100 banner**.
- **`/admin/invoicing-schedule`** — schedule table (with backfilled default lines) + overdue alerts;
  **no migration-100 pending notice**.
- **`/admin/sales-targets`** — targets table (may be empty until admin sets targets) + Add/Edit
  enabled; **no migration-099 pending notice**.

Plus general health on every role landing page: `/sales-coordinator`, `/projects`, `/procurement`,
`/store`, `/factory`, `/qc`, `/dubai-afs`, `/after-sales`, `/reports`, `/control-tower`,
`/management-dashboard`, `/admin-dashboard` — no blank/error pages.

---

## Status

**▶ Run #2 triggered and progressing on `main` (post-migration).** Setup + auth confirmed working;
screenshot capture underway. Final artifact analysis to be completed once the run finishes (prior
run took ~19 min). See the run URL above for the gallery/summary artifact.

- Workflow status: triggered, in progress (this sprint).
- Failures: none observed in setup/auth steps.
- Blank/error pages: to be confirmed from the artifact gallery.
- Fixes made: none required from static analysis; revisit if the artifact shows a critical failure.

## Remaining pending items

1. Download the `full-role-page-screenshot-baseline` artifact from run #2 and open `index.html`.
2. Confirm the three commercial pages show real data (no pending notices).
3. Confirm no role landing page is blank/errored.
4. Record the outcome in the go/no-go matrix and proceed to final sign-off.

> If run #2 surfaces a critical UI failure on a key route, raise it as a **blocker** per
> `go-no-go-decision-matrix.md` and fix safe issues in a follow-up before go-live.

---

## ⚠️ Data-volume caveat — baseline captured on a near-empty database

The screenshot baseline above was captured against a **near-empty database**. It
is therefore **valid for empty-state, layout, and navigation review**, but it is
**not a valid validation of dense-table / data-volume behavior**.

This matters: the Admin Invoicing Schedule "730317 days overdue" defect (see
`targeted-ui-data-quality-fixes.md`, Issue 1) only surfaces with populated schedule
rows carrying edge-case dates — exactly the conditions an empty-DB baseline cannot
exercise. An all-green empty-DB gallery does **not** imply data-heavy pages are
correct.

**Recommendation (future):** add an **E2E scenario seeder** that loads a small,
representative dataset — projects with invoicing schedules spanning valid, edge,
and deliberately-invalid dates; quotations; receivables; NCRs — and re-run the
baseline against it so populated tables (and their overdue/aging math) are actually
reviewed.
