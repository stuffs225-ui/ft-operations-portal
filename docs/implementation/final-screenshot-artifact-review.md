# Final Screenshot Artifact Review

**Branch:** `feature/final-screenshot-smoke-review-go-decision`
**Base main SHA:** `a154f74b990cd1cd5be423896167bcb1fa29a16b`

---

## Artifact status: ⏳ NOT YET AVAILABLE — review PENDING

The post-migration screenshot baseline (GitHub Actions **run #2**, id `28264136467`, on
post-migration SHA `1a385a6`) was triggered in the prior sprint. As of this sprint:

- **Job status:** the `Run screenshot capture` step (step 11) is still reported **in progress**;
  the gallery / zip / upload-artifact steps (12–15) have not run.
- **Artifacts:** `list_workflow_run_artifacts` returns **`total_count: 0`** — the
  `full-role-page-screenshot-baseline` artifact does **not exist yet**.
- **Health so far (confirmed earlier):** checkout, deps, Playwright Chromium, `.env` from secrets,
  dev-server start, and the route-catalogue dry-run all **succeeded** — i.e. real auth + secrets are
  configured and the run is not failing on setup.

**Because no artifact exists, it cannot be inspected, and no result is fabricated.** Per the sprint
rule for an unavailable artifact, the go-live decision is **kept at CONDITIONAL GO (not upgraded to
full GO).**

> Tooling note: even once the artifact is produced, the screenshot **images** are binary content
> inside a zip; reviewing them is a **user action** (download the artifact and open `index.html`).
> The available tooling here can confirm run/artifact status but cannot render the PNGs.

| Field | Value |
|-------|-------|
| Artifact | `full-role-page-screenshot-baseline` |
| Artifact present | **No (total_count: 0)** |
| Run | #2 — `28264136467` ([run URL](https://github.com/stuffs225-ui/ft-operations-portal/actions/runs/28264136467)) |
| Screenshot count | — (artifact pending) |
| Role count | 12 accounts (per `screenshot-accounts.mjs`) — not yet captured-confirmed |
| Route count | 98 static / 121 total (per manifest) — not yet captured-confirmed |
| Failures found | — (cannot assess without artifact) |
| Critical blockers | None identified (no artifact to assess; static review clean) |
| Fixes made | None |

---

## Manual artifact review checklist (user action)

When run #2 finishes (or after re-running it if it timed out), download the
`full-role-page-screenshot-baseline` artifact, open `index.html`, and confirm:

### Critical routes (review first)
- [ ] `/sales` — invoicing plan + Pending-Invoicing KPI show **real data**; **no amber
      migration-100 banner**; no full-page error.
- [ ] `/admin/invoicing-schedule` — schedule table (backfilled default lines) + overdue alerts
      render; **no migration-100 pending notice**.
- [ ] `/admin/sales-targets` — table (may be empty until targets set) + Add/Edit enabled; **no
      migration-099 pending notice**.
- [ ] `/sales-coordinator` — command center renders; KPI tiles present.
- [ ] `/projects` — list + KPI strip render.
- [ ] `/projects/new` — creation wizard renders.
- [ ] `/procurement` — dashboard + KPIs render.
- [ ] `/store` — real counts, loading handled.
- [ ] `/factory` — KPIs; no fabricated "Requirements Missing".
- [ ] `/qc` — KPIs + NCR/release statuses.
- [ ] `/dubai-afs` — KPIs + PN/readiness.
- [ ] `/after-sales` — KPIs render.
- [ ] `/reports` — report hub; cards present.
- [ ] `/control-tower` — cross-module KPIs; no admin-only mutations.
- [ ] `/admin-dashboard` — admin cards incl. commercial controls.
- [ ] `/management-dashboard` — **read-only**; no mutation/admin actions.

### Cross-cutting checks
- [ ] No blank/white screen on any role landing page.
- [ ] No admin-only page captured under a non-admin account (each account folder).
- [ ] No mutation/approve/delete/create control visible in the viewer's `/management-dashboard`.
- [ ] No route showing a "migration pending" / "unavailable" notice on `/sales`,
      `/admin/invoicing-schedule`, `/admin/sales-targets` (these must be cleared post-099/100).
- [ ] No major layout breakage on a key page.

### If a critical issue is found
- File it as a **blocker** (`go-no-go-decision-matrix.md` → Production Hold) and request a safe
  follow-up fix before unconditional GO.

---

## Remaining concerns

- Run #2's capture step has not completed / no artifact yet. If GitHub shows the run **timed out**
  or **failed**, re-dispatch the **Role/Page Screenshot Baseline** workflow on `main` and review the
  new artifact. (Static review found no app-side reason it would fail.)
- Static + code-path review (PR #152) found no broken links, null-data crash risk, role exposure, or
  stale migration-pending wording — so no app defect is expected in the screenshots; this review is
  the operational confirmation, not a risk indicator.
