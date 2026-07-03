# One-Click GitHub Action — Full E2E Workflow Test

Runs the entire E2E workflow test pack (PR #159) from the GitHub Actions UI —
no local terminal needed. **Staging/test only:** the run fails immediately
unless you type the confirmation phrase, and there is deliberately **no
production override input** in this workflow.

Workflow file: `.github/workflows/e2e-full-workflow.yml`
Workflow name: **Full E2E Workflow Test**

## What it does (in order)

1. **Safety gate** — aborts unless `confirm_staging` is exactly `RUN_E2E_STAGING`.
2. Checkout → Node 20 → `npm ci`.
3. **Build** + **typecheck** (app + `tsconfig.e2e.json`).
4. **Dry-run** — prints the full seed plan; writes nothing.
5. **Seed** the selected scenario (`S01` or `all`) against the staging database,
   tagged `E2E_SCENARIO_SEED run_id=<id> scenario=<code>`; captures the `run_id`
   from the output (fallback: newest manifest file). If no `run_id` can be
   captured the job fails safely and cleanup is skipped — cleanup never runs blind.
6. **Validate** — read-only check that every manifest record exists.
7. **Playwright UI E2E** (optional) — serves the built bundle via `vite preview`
   and runs `tests/e2e/full-workflow.spec.ts` (10 roles × 33 routes).
8. **Cleanup** (optional, `if: always()`) — deletes **only** that run's tagged
   records (children→parents, plus trigger-created invoicing-schedule rows
   scoped to the run's projects). Runs even if validate/Playwright failed, as
   long as a `run_id` was captured.
9. **Uploads artifacts** (always) and writes a **job summary** table.

## Required GitHub secrets

Add these under **Repo → Settings → Secrets and variables → Actions →
New repository secret**:

| Secret | Purpose |
|--------|---------|
| `E2E_SUPABASE_URL` | Staging/test Supabase project URL the seeder targets |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Service-role key for the **staging** project (backend seeder only; never bundled into the app, never printed) |
| `E2E_NON_PRODUCTION_HOSTS` | Comma-separated hostnames that are genuinely non-production, e.g. `myproject-staging.supabase.co`. The seeder **blocks any host not in this list** — this is the second production guard |

Already used by the existing screenshot workflow (needed for the build/preview):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — point these at the same staging
project when running this workflow's UI E2E.

## Optional Playwright role secrets

One pair per role; roles with missing credentials are **skipped** unless
`strict_auth` is set: `E2E_ADMIN_EMAIL/PASSWORD`, `E2E_OPS_*`, `E2E_VIEWER_*`,
`E2E_SALES_*`, `E2E_COORDINATOR_*`, `E2E_PROCUREMENT_*`, `E2E_STORE_*`,
`E2E_FACTORY_*`, `E2E_QC_*`, `E2E_AFS_*`.

## How to run

1. GitHub → **Actions** tab.
2. Select **Full E2E Workflow Test** in the left sidebar.
3. Click **Run workflow**.
4. Choose inputs (see below), type `RUN_E2E_STAGING` into *confirm_staging*.
5. Click the green **Run workflow** button.
6. When finished, open the run → **Summary** shows the status table; download
   the `e2e-full-workflow-<run number>` artifact at the bottom of the page.

### Recommended first run

| Input | Value |
|-------|-------|
| scenario | `S01` |
| run_ui_e2e | `true` |
| cleanup_after | `true` |
| strict_auth | `false` |
| confirm_staging | `RUN_E2E_STAGING` |

One clean-full-flow scenario, UI smoke, then automatic cleanup — a safe
end-to-end proof of the whole pipeline.

### When to run `scenario: all`

After the first `S01` run comes back green (seed + validate + cleanup all
succeeded, no step errors in the manifest). `all` seeds all 10 scenarios
(~54 rows) — use it for full population before a screenshot baseline or a
manual dense-data review. Keep `cleanup_after: true` unless you intentionally
want the data left in place for manual review (then clean up later with the
run_id from the summary).

## Where artifacts land

Every run uploads `e2e-full-workflow-<run number>` containing:
- `artifacts/e2e-full-workflow/<run_id>.json` — the manifest (source of truth)
- `artifacts/e2e-full-workflow/<run_id>.md` — human-readable run report
- `seed-output.log` — raw seeder output
- `playwright-report/`, `test-results/`, `docs/ux-audit/playwright-output/` — when UI E2E ran

## Safety notes

- The confirm phrase gate runs **before checkout** — nothing executes without it.
- No production override input exists; the workflow never sets
  `E2E_ALLOW_PRODUCTION`. Even with `E2E_SEED_CONFIRM=true`, the seeder refuses
  any host not in `E2E_NON_PRODUCTION_HOSTS`.
- Cleanup requires the captured `run_id` and deletes only that run's tagged
  records — untagged data is never touched; nothing is truncated.
- Secrets are passed via env only and never echoed; the service-role key never
  reaches the frontend bundle (the build uses only `VITE_*` values).
- A concurrency group prevents two runs from seeding/cleaning simultaneously.

## Troubleshooting

| Problem | Cause / fix |
|---------|-------------|
| **Job fails at "Safety gate"** | `confirm_staging` wasn't exactly `RUN_E2E_STAGING`. Re-run with the exact phrase |
| **`Could not capture run_id after seed`** | Seed crashed before creating the manifest (bad URL/key, or host blocked). Check the seed step log; nothing was created or a partial manifest exists in the artifact — clean up manually with `npm run e2e:workflow:cleanup -- --run-id <id>` if a manifest file is present in the artifact |
| **Seed step: `treated as PRODUCTION`** | The `E2E_SUPABASE_URL` host isn't in `E2E_NON_PRODUCTION_HOSTS`. Add the *staging* hostname to that secret (never add production) |
| **Seed step errors on specific tables** | RLS/CHECK constraint mismatch — the manifest records each failed step and the run continues. Review `<run_id>.md` in the artifact; cleanup still removes whatever was created |
| **Playwright skips roles** | That role's `E2E_*_EMAIL/PASSWORD` secrets are unset — intentional. Add the secrets, or set `strict_auth: true` to turn skips into failures |
| **Playwright all-fail on login** | `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` secrets point at a different project than the test users, or preview server didn't start (check the "Start app" step) |
| **Cleanup failed / partially failed** | Check the cleanup step log — each table error is listed. Re-run cleanup locally with the run_id (it is idempotent), or use section 1 of `docs/sql/e2e-full-workflow-validation.sql` to find remaining tagged rows |
| **Missing secrets** | The affected step fails with an auth error from Supabase. Add the three required secrets and re-run |
