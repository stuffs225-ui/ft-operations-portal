# Full-System Screenshot Baseline Plan

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> Real authentication is required and **preserved**. No demo/fake auth is introduced. No security
> check was weakened.

---

## Tooling overview

| Item | Value |
|------|-------|
| Workflow file | `.github/workflows/role-screenshot-baseline.yml` |
| Workflow name | **Role/Page Screenshot Baseline** |
| Trigger | `workflow_dispatch` (manual only) |
| Playwright config | `playwright.config.ts` |
| Capture engine | `tools/screenshots/*.mjs` (`screenshot-routes.mjs`, `screenshot-accounts.mjs`, `screenshot-modules.mjs`, `generate-screenshot-index.mjs`) |
| Route catalogue | `tools/screenshots/screenshot-routes.mjs` — **98 static + 23 dynamic = 121 routes** |
| Accounts | `tools/screenshots/screenshot-accounts.mjs` — 12 role accounts (real Supabase auth) |
| Artifact name | **`full-role-page-screenshot-baseline`** (`index.html` gallery + `screenshot-run-summary.md` + zipped screenshots) |

---

## Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (build + runtime) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (build + runtime) |
| `SCREENSHOT_SHARED_PASSWORD` | Shared password for the 12 test accounts |
| `SCREENSHOT_<KEY>_PASSWORD` (optional) | Per-account override (e.g. `SCREENSHOT_ADMIN_PASSWORD`) |
| `SCREENSHOT_<KEY>_EMAIL` | Per-account email (per `screenshot-accounts.mjs` env keys) |

> Secrets are **never** committed. `.env.screenshots.local` is git-ignored and used only for local
> runs. Credentials are not printed in logs and must not appear in screenshots.

---

## How to trigger (GitHub Actions)

1. GitHub → **Actions** → **Role/Page Screenshot Baseline** → **Run workflow**.
2. Inputs:
   - `app_base_url` — default `http://localhost:5173` (the workflow builds/serves the app).
   - `capture_mode` — `full` (all 12 accounts).
   - `upload_screenshots` — `true`.
3. Run. On completion, download the **`full-role-page-screenshot-baseline`** artifact.

---

## Roles included (12 accounts)

`admin`, owner (`stuffs`, admin), `coo` + `ops` (operations_manager), `sales-test` + `testsales`
(sales_user / possibly sales_coordinator — verify from app behaviour), `procurement`, plus the
remaining store / factory / qc / afs / viewer / sales_coordinator accounts defined in
`screenshot-accounts.mjs`. Each account records its **detected landing page** (compared to
`expectedLanding`).

## Route coverage

All 98 static routes are captured per role (filtered by `getStaticRoutesForRole`); 23 dynamic
routes are captured only when their `SAMPLE_*` env var is provided. Coverage now includes the two
admin commercial-control routes added to the manifest this sprint:
`/admin/invoicing-schedule`, `/admin/sales-targets`.

---

## How to interpret failures

- **Login failure** → bad/missing credentials secret, or the account is disabled in Supabase.
- **403 panel captured** → the role legitimately cannot access that route (expected for
  non-owning roles); compare against the role-access audit.
- **Red error panel on `/sales`** → migration 100 (`project_invoicing_schedule`) may be missing —
  cross-check with the migration gap audit and the read-only verification script.
- **"Migration pending" notice on `/admin/invoicing-schedule` or `/admin/sales-targets`** →
  migration 100 / 099 not applied (graceful state; not a failure).
- **Blank screen / console error** → genuine regression; capture route + role + console output.

## How to review

Open `index.html` from the artifact for the visual gallery grouped by account → module → route.
Read `screenshot-run-summary.md` for the pass/landing summary. Diff against any prior baseline
under the `tooling/*screenshot*` branches.

---

## Known limitations (this sprint)

- **A live screenshot run was NOT performed in this environment** — the remote sandbox has no
  Supabase secrets or seeded auth session, so real-auth capture is not possible here. The run must
  be executed via the GitHub Actions workflow above with the configured secrets.
- The workflow file and route manifest were **validated for syntax** (the manifest imports and
  reports 98/121 routes correctly; no workflow YAML change was made).
- This plan introduces **no brittle pixel-diff assertions** — the baseline is a visual/landing
  capture, intentionally non-blocking.
