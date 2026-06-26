# Post-Migration Screenshot Baseline — Execution Status

**Branch:** `feature/post-migration-099-100-final-readiness`
**Base main SHA:** `7d11a6d47a2b54da1bae3e12ca2ec1062fd2b421`
**Context:** migrations 099 + 100 are applied & verified — capture a fresh baseline to confirm the
commercial pages now render real data.

> Real authentication is required and preserved. No demo auth. The workflow was **not modified**.

---

## Status: ⏳ PENDING USER RUN

A live screenshot run is not possible from the build environment (no Supabase secrets; the Supabase
host is blocked by network egress). Run it via GitHub Actions.

| Item | Value |
|------|-------|
| Workflow | `.github/workflows/role-screenshot-baseline.yml` |
| Workflow name | **Role/Page Screenshot Baseline** |
| Trigger | `workflow_dispatch` (manual) |
| Required secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SCREENSHOT_SHARED_PASSWORD` (+ optional per-account `SCREENSHOT_<KEY>_EMAIL/_PASSWORD`) |
| Expected artifact | **`full-role-page-screenshot-baseline`** (`index.html` gallery + `screenshot-run-summary.md` + zip) |
| Route count (manifest) | **98 static / 121 total** |
| Manifest parse check | ✅ passes (includes `/admin/invoicing-schedule`, `/admin/sales-targets` added in PR #148) |
| Workflow reference check | ✅ no broken references; **workflow unchanged** |

---

## Critical routes to confirm (no blank/error pages)

After migrations 099 + 100, pay special attention to the commercial pages now expected to show real
data (no "migration pending"):

- **`/sales`** — invoicing plan + Pending-Invoicing KPI render with real data; **no amber
  migration-100 banner**.
- **`/admin/invoicing-schedule`** — schedule table + overdue alerts render; **no migration-100
  pending notice**.
- **`/admin/sales-targets`** — targets table + Add/Edit affordance; **no migration-099 pending
  notice**.
- `/sales-coordinator`
- `/projects`
- `/procurement`
- `/store`
- `/factory`
- `/qc`
- `/dubai-afs`
- `/after-sales`
- `/reports`
- `/control-tower`
- `/management-dashboard`

---

## Exact run instruction

1. Confirm the GitHub secrets above are configured.
2. GitHub → **Actions** → **Role/Page Screenshot Baseline** → **Run workflow**
   (`capture_mode = full`, `upload_screenshots = true`).
3. When complete, download the **`full-role-page-screenshot-baseline`** artifact; open `index.html`.
4. Review the critical routes above. Any blank/errored page on a role landing route is a **blocker**
   per `go-no-go-decision-matrix.md`.
5. Record the outcome and proceed to the final go/no-go decision.

---

## Interpretation notes

- A **403 panel** for a non-owning role on a route is expected (it confirms guards work).
- The three commercial pages should now show **data**, not "migration pending". If any still shows a
  pending/unavailable notice, re-run `docs/sql/postcheck-after-applying-099-100.sql` to confirm the
  objects exist and the anon/role can reach them.
