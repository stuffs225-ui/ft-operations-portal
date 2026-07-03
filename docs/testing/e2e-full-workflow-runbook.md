# E2E Full-Workflow — Runbook

Exact commands for running the full-workflow test pack. **Never run seed or
cleanup against production** (the tool blocks it by default — see Safety).

## 0. Prerequisites

Environment (e.g. in `.env.local`, which the tool loads via dotenv):

```bash
# Target database (defaults to VITE_SUPABASE_URL if E2E_SUPABASE_URL unset)
E2E_SUPABASE_URL=https://<project>.supabase.co

# EITHER a service-role key (backend tool only — never used in the frontend)…
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# …OR the anon key + an admin test login the tool signs in with:
VITE_SUPABASE_ANON_KEY=<anon-key>
TEST_ADMIN_EMAIL=admin.test@example.com
TEST_ADMIN_PASSWORD=<password>

# Safety allow-list: hosts that are genuinely NOT production.
# Any host not listed here is treated as production and writes are blocked.
E2E_NON_PRODUCTION_HOSTS=<staging-project>.supabase.co
```

For the UI smoke test, also set `VITE_APP_URL` (defaults to
`http://localhost:5173`) and per-role credentials:
`TEST_ADMIN_* · TEST_OPS_* · TEST_VIEWER_* · TEST_SALES_* · TEST_COORDINATOR_* ·
TEST_PROCUREMENT_* · TEST_STORE_* · TEST_FACTORY_* · TEST_QC_* · TEST_AFS_*`
(roles with missing credentials are skipped unless `E2E_STRICT_AUTH=true`).

## 1. Dry-run (default — writes nothing)

```bash
npm run e2e:workflow:dry-run
```

Prints the target host, its production/non-production classification, the full
per-table insert plan for all 10 scenarios, and the would-be run id. Safe to run
anywhere, anytime.

## 2. Seed (writes — double-gated)

```bash
E2E_SEED_CONFIRM=true npm run e2e:workflow:seed -- --scenario all
```

- Refuses to run without `E2E_SEED_CONFIRM=true`.
- Refuses to run against any host not in `E2E_NON_PRODUCTION_HOSTS` unless you
  *additionally* set `E2E_ALLOW_PRODUCTION=true` (don't).
- Prints the generated `run_id` and writes
  `artifacts/e2e-full-workflow/<run_id>.json` (manifest) and `<run_id>.md` (report).

Single scenario: `E2E_SEED_CONFIRM=true npm run e2e:workflow:seed -- --scenario S05`

## 3. Validate a run

```bash
npm run e2e:workflow:validate -- --run-id <run_id>
```

Read-only: confirms every manifest record still exists, reports trigger-created
invoicing lines, and appends the results to the run's `.md` report. Exit code 1
if anything is missing.

Deeper checks: open `docs/sql/e2e-full-workflow-validation.sql` in the Supabase
SQL editor, replace `<RUN_ID>`, and run (SELECT-only).

## 4. UI role/route smoke (Playwright)

```bash
# app running locally (npm run dev) or VITE_APP_URL pointing at staging
npm run test:e2e -- tests/e2e/full-workflow.spec.ts
```

Read-only navigation: 10 roles × 33 routes. Expected denial = pass; unexpected
access, unexpected denial, crash, or blank page = fail.

## 5. Cleanup (writes — double-gated, run-scoped only)

```bash
E2E_SEED_CONFIRM=true npm run e2e:workflow:cleanup -- --run-id <run_id>
```

- Requires `--run-id`; refuses otherwise.
- Deletes **only** the record ids in that run's manifest (children before
  parents) plus `project_invoicing_schedule`/`_history` rows belonging to that
  run's projects (trigger-created). Never deletes untagged data, never truncates.
- Records the deletion counts in the manifest + report.
- Verify: re-run section 1 of the validation SQL — all counts must be 0.

## 6. Regenerate a run report

```bash
npm run e2e:workflow:report -- --run-id <run_id>
```

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `seed writes to the database and is blocked` | Set `E2E_SEED_CONFIRM=true` (deliberate) |
| `treated as PRODUCTION` | The host isn't in `E2E_NON_PRODUCTION_HOSTS`. Add it only if it is genuinely non-production |
| `Could not resolve a profile id` | The target DB has no `profiles` rows — create test users first (`npm run create:test-users`) |
| Step errors in the manifest | RLS may block anon+admin login for some tables — use `SUPABASE_SERVICE_ROLE_KEY` for seeding; each failed step is recorded, the run continues |
| Playwright skips a role | That role's `TEST_*` credentials are unset — intentional; set them or `E2E_STRICT_AUTH=true` |
