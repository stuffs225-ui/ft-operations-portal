# Post-QA Verification and Critical Readiness Fixes

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Starting main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`
**Merged PR confirmed:** #148 (Full System QA & Go-Live Readiness package) — merged into `main`.

---

## Executive summary

A verification + safe-fix sprint. Key outcomes:

1. **Read-only DB verification attempted** via an anon-key REST existence probe — **blocked by the
   environment's network egress allowlist** (the Supabase host is not allowed). A negative control
   proved the block is at the egress proxy, so existence cannot be determined here. All live
   migration statuses remain **Unknown** and must be confirmed manually with the provided SQL.
2. **Critical safe fix shipped (Part C):** the Sales Dashboard v2 no longer **hard-fails** when
   migration 100 (`project_invoicing_schedule`) is missing. It now renders projects/pipeline/SO/
   collection normally and shows the invoicing-schedule sections as **unavailable** (with a clear
   banner) instead of failing the whole page — **without changing any calculation when the data is
   present**.
3. **Part D:** Sales Targets (migration 099) handling was already safe; a `salesTargetsUnavailable`
   flag was added for completeness. No fabricated targets; collection target stays NULL when unset.
4. **Route/link validation (Part E):** all critical routes + recently-added deep-links validated —
   **no broken links found**.
5. Readiness packet, go/no-go matrix, and final summary produced.

---

## Part A — Baseline

| Check | Result |
|-------|--------|
| `git status` (start) | clean |
| Starting main SHA | `b579fdc3199478b9c6eb049fa3c6827cc5d5135c` |
| `npm run build` | ✅ clean (zero TS errors) |
| `npx tsc --noEmit` | ✅ clean |
| `npm run lint` | 56 problems (22 errors, 34 warnings) — pre-existing baseline |
| Screenshot manifest parse | ✅ 98 static / 121 total routes |
| `docs/sql/read-only-migration-verification.sql` | ✅ present |
| Route inventory / smoke checklist / runbook docs | ✅ present (from PR #148) |

**Lint baseline note:** the 22 errors are pre-existing `Views: {}` empty-object-type entries in
`database.ts`. This sprint's code changes added **zero** new lint issues (full lint stays 56).

---

## Known risks at start

- Migration 100 (`project_invoicing_schedule`) live status unverified; `/sales` historically
  hard-depended on it (fatal). **Addressed by the Part C safety guard + manual-verification doc.**
- Migration 099 (`sales_user_targets`) live status unverified (already had safe fallbacks).

---

## Changes made this sprint

### Code (frontend only — no business-calculation change)
- `src/types/salesDashboardV2.ts` — added `invoicingScheduleUnavailable` and
  `salesTargetsUnavailable` to `SalesDashboardV2Warnings`.
- `src/lib/salesDashboardV2Queries.ts` — schedule query error is now **fatal only for genuine
  errors**; a missing-relation (migration-100-absent) error degrades gracefully via
  `isMissingRelationError` (schedules → `[]`, flag set). Targets missing-relation → flagged. A real
  (non-migration) error is still surfaced — never masked. **Projects remain fatal (core data).**
- `src/pages/Sales.tsx` — amber "migration not active yet" banner; Pending-Invoicing KPI, the
  Invoicing Plan table, and the schedule-derived invoicing-target rows render as **unavailable
  (“—”)** instead of silent zero when the schedule is unavailable. **No change when data is
  present.**

### Docs
- `live-supabase-readonly-verification-results.md` (Part B)
- `critical-route-link-validation.md` (Part E)
- `screenshot-baseline-execution-status.md` (Part F)
- `manual-smoke-test-execution-packet.md` (Part G)
- `go-no-go-decision-matrix.md` (Part H)
- `final-readiness-summary.md` (Part I)
- this file (Part A) + README index update

---

## Validation (end)

- `npm run build` — ✅ clean
- `npx tsc --noEmit` — ✅ clean
- Changed-file lint (`Sales.tsx`, `salesDashboardV2Queries.ts`, `salesDashboardV2.ts`) — ✅ zero issues
- Full lint — 56 problems (unchanged baseline; zero new issues)

---

## Safety confirmation

No migrations applied/created · no `db push` · no write SQL · no production data change · no RLS
change · no business-workflow change · no roleMatrix/route-guard/permission change. The Part C/D
edits are availability/error-handling + presentation only; all business calculations are byte-for-
byte identical when migration 100/099 objects are present.
