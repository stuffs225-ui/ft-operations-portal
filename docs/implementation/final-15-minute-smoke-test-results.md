# Final 15-Minute Smoke Test — Results

**Branch:** `feature/final-screenshot-smoke-review-go-decision`
**Base main SHA:** `a154f74b990cd1cd5be423896167bcb1fa29a16b`

---

## Status: ⏳ PENDING — no live results provided

No smoke-test results were provided to this sprint, and the build environment cannot run real-auth
UI (no Supabase secrets; the Supabase host is blocked by network egress). Each step below is
**static + code-path verified** (route defined, guard correct, page defensively coded) but the
**live render is pending the user's run**. The go-live decision is **kept at CONDITIONAL GO** — not
upgraded to full GO — until this checklist is executed.

> **Read-only test.** Open modals to confirm they render; **do NOT submit/save** any reschedule,
> amount change, or target unless explicitly approved.

Severity: **B** = blocker · **M** = major · **m** = minor.

| # | Route | Role | Expected | Status | Sev | Notes |
|---|-------|------|----------|--------|-----|-------|
| 1 | login | admin | Lands `/admin-dashboard` | Pending (static ✓) | B | guard `admin` |
| 2 | `/admin-dashboard` | admin | Cards + KPIs render | Pending (static ✓) | M | |
| 3 | `/admin/invoicing-schedule` | admin | **No** migration-100 notice; schedule table + alerts load | Pending (static ✓) | B | availability now true |
| 4 | `/admin/sales-targets` | admin | **No** migration-099 notice; table + Add/Edit modal | Pending (static ✓) | B | availability now true |
| 5 | login | sales_user | Lands `/sales` | Pending (static ✓) | B | |
| 6 | `/sales` | sales_user | **No** migration-100 banner; KPIs + invoicing plan render | Pending (static ✓) | B | `scheduleUnavailable` now false |
| 7 | login | sales_coordinator | Lands `/sales-coordinator` | Pending (static ✓) | M | |
| 8 | `/sales-coordinator` | sales_coordinator | Command center + KPI deep links + queue tabs | Pending (static ✓) | M | |
| 9 | `/procurement` | procurement_user | Dashboard + `?status=` deep links | Pending (static ✓) | M | |
| 10 | `/store` | store_user | Dashboard; real counts; loading `…` | Pending (static ✓) | M | |
| 11 | `/factory` | factory_user | Dashboard; no fabricated "Requirements Missing" | Pending (static ✓) | M | |
| 12 | `/qc` | qc_user | Dashboard; NCR/release statuses | Pending (static ✓) | M | |
| 13 | `/dubai-afs` | afs_user | Dashboard; PN/readiness | Pending (static ✓) | M | |
| 14 | `/reports` | ops_manager | Report hub; all cards route to existing pages | Pending (static ✓) | M | 14 routes confirmed exist |
| 15 | `/management-dashboard` | viewer | **Read-only**; no mutation/admin actions | Pending (static ✓) | B | |

---

## How to run (≤15 minutes)

1. Log in as each role above (use the 12 test accounts).
2. Visit each route; confirm the **Expected** column.
3. Mark **Status** Passed/Failed and **Notes**.
4. Any **B** failure → **NO-GO / Production Hold**; raise a safe follow-up fix.
5. All pass → record here and proceed to unconditional GO with sign-off (`production-handover-pack.md`).

## Pre-confirmed (static / code-path)

All 15 routes are defined with correct guards; the three commercial pages derive migration-pending
state dynamically (clears now that 099/100 exist); deep-links resolve; no null-data crash risk; the
viewer dashboard exposes only navigation links (no mutation controls). These are the strongest
non-live assurances; the live run is the final operational confirmation.
