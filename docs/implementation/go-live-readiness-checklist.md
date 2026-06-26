# Go-Live Readiness Checklist

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> Status legend: ✅ done/verified · ☐ pending · ⚠ attention required.
> This sprint produced the readiness package; items requiring live DB/secrets/sign-off remain ☐.

---

## 1. Code readiness

- ✅ `npm run build` — clean (zero TypeScript errors) at this SHA.
- ✅ `npx tsc --noEmit` — clean.
- ✅ Lint baseline — **56 problems (22 errors, 34 warnings)**; the 22 errors are pre-existing
  `Views: {}` empty-object-type entries in `database.ts` (not regressions).
- ✅ No new lint regressions from this sprint (only docs + a manifest data array were changed).
- ☐ CI green on the PR.
- ✅ No unmerged stabilization PRs (PRs #141–#147 merged).

## 2. Database readiness

- ✅ Migration gap audit completed (`supabase-migration-gap-audit.md`).
- ☐ Read-only verification run against live Supabase (`docs/sql/read-only-migration-verification.sql`).
- ⚠ Migrations **099 / 100 status**: **Unknown / unverified** — must be confirmed before go-live.
  Working `/sales` strongly implies **100 is applied**, but verify.
- ✅ Runtime dependencies mapped (migration gap audit §2).
- ☐ Backup taken before any migration application.
- ☐ Safe migration plan approved (`safe-migration-application-runbook.md`).
- ✅ Post-migration verification queries ready (read-only SQL).

## 3. Auth and roles

- ✅ Role access audit completed (`role-access-audit.md`).
- ✅ Landing routes verified against `roleMatrix`.
- ✅ Role access matrix documented; admin-only routes confirmed admin-guarded.
- ✅ Viewer read-only confirmed (no mutation actions).
- ☐ All 12 role accounts tested live (screenshot baseline / smoke test).

## 4. Functional smoke

- ✅ Smoke-test checklist created (`full-system-smoke-test-checklist.md`).
- ☐ All core modules smoke-tested live.
- ☐ Key workflows (quotation→SO, approvals, gates) smoke-tested — **observe only, do not mutate
  production**.
- ☐ No critical route crashes confirmed live (esp. `/sales` re migration 100).

## 5. Data and reports

- ✅ Reports hub verified — all 14 `/reports/*` routes exist (no broken links).
- ☐ Export behaviour checked live (Projects CSV, Control Tower overdue CSV).
- ☐ KPI values sanity-checked against known data.
- ✅ No fabricated counts — Store/Factory fake `count: 0` queues fixed in PR #146; Sales/AFS/QC/AFS
  use real data.
- ☐ No demo/mock data visible in production (mock is gated by `isSupabaseConfigured`).

## 6. Security

- ✅ No service role key used in frontend (anon key only).
- ✅ No admin-only data exposed to viewer/management (role audit).
- ✅ RLS not disabled or changed in any sprint.
- ☐ Env vars reviewed in the deployment target.
- ✅ Secrets not committed (`.env.local`, `.env.screenshots.local`, auth storage are git-ignored).

## 7. Production deployment

- ☐ Vercel (or host) linked to the correct repo/branch.
- ☐ Env vars present (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- ☐ Supabase URL/anon key correct for the production project.
- ☐ Production branch correct (`main`).
- ☐ CI passing.
- ☐ Rollback plan prepared (revert PR + restore DB backup if a migration was applied).

## 8. Sign-off

| Stakeholder | Sign-off | Date |
|-------------|----------|------|
| Admin | ☐ | |
| Sales | ☐ | |
| Procurement | ☐ | |
| Store | ☐ | |
| Factory | ☐ | |
| QC | ☐ | |
| AFS | ☐ | |
| Management | ☐ | |

---

## Top go-live blockers (must close)

1. ⚠ **Verify migration 100** (`project_invoicing_schedule`) is applied — `/sales` is fatal
   without it. Run the read-only SQL; if absent, apply 100 (runbook) or ship the Option-B safety
   guard.
2. ☐ Run the read-only verification script and reconcile 099/100 + 068/069/070.
3. ☐ Live role/screenshot pass + smoke test.
