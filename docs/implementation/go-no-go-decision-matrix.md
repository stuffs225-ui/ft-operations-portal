# Go / No-Go Decision Matrix

**Branch:** `feature/post-qa-verification-critical-readiness-fixes` → updated on
`feature/post-migration-099-100-final-readiness`.
**Base main SHA (this update):** `7d11a6d47a2b54da1bae3e12ca2ec1062fd2b421`.

---

## CURRENT DECISION: 🟡 CONDITIONAL GO CANDIDATE

**Reason:** migrations **099 and 100 are now applied and post-check verified** (table/view/function/
trigger/RLS/policies all Present). The **DB-level blockers are removed** — the invoicing schedule,
sales targets, and the Sales Dashboard invoicing plan are active at the DB layer, and the three
pages auto-activate from live data. The system still requires UI smoke test and screenshot baseline
before **final GO**.

**Final decision: CONDITIONAL GO CANDIDATE, pending —**
1. `/sales` UI smoke passes (no migration-100 banner; dashboard + invoicing plan render).
2. `/admin/invoicing-schedule` UI smoke passes (no migration-100 pending; schedule + alerts load).
3. `/admin/sales-targets` UI smoke passes (no migration-099 pending; table + Add/Edit modal).
4. Screenshot baseline completes without critical blank/error pages.
5. 15-minute minimum smoke test passes.

**Completed on the path to here:**
- ✅ Supabase backup taken (user).
- ✅ Pre-check SQL run (user) — 099/100 confirmed missing, dependencies present.
- ✅ Apply pack applied (user) in the Supabase SQL Editor.
- ✅ Post-check SQL run (user) — all checks passed.
- ⏳ UI smoke test, screenshot baseline, final approval — **next**.

---

## GO criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Build green | ✅ | `npm run build` clean |
| Typecheck green | ✅ | `tsc --noEmit` clean |
| No changed-file lint issues | ✅ | zero; full lint 56 (baseline) |
| Critical migrations verified | ✅ | **099 + 100 applied & post-check verified**; 068/069/070 present |
| Role access verified | ✅ | role-access audit (PR #148); no admin exposure to viewer |
| `/sales` verified | ⚠ | guard + real data backing; live render pending smoke test |
| Admin migration-dependent pages behave safely | ✅ | `deferredMigrationSafety` (PR #143); now backed by real data |
| Screenshot baseline completed or scheduled | ☐ | pending user run via GitHub Actions |
| Smoke test completed | ☐ | packet ready; not yet executed live |
| No critical blockers | ✅ | DB blockers removed; only operational verification remains |

## NO-GO criteria (any TRUE → do not ship)

| Criterion | Current | Notes |
|-----------|---------|-------|
| Migration 100 missing **and** `/sales` not safely guarded | **FALSE** | 100 applied; `/sales` also guarded |
| Route crash on a key role landing page | Unknown | confirm via smoke test |
| Viewer sees mutation/admin action | **FALSE** | audited read-only |
| Admin route exposed to non-admin | **FALSE** | admin-guarded |
| DB verification shows missing runtime-critical object **without** fallback | **FALSE** | 099/100 + 068/069/070 all verified present |
| Screenshot baseline has critical page blank/error | Unknown | run baseline |
| Smoke test fails on a core workflow | Unknown | run smoke test |

---

## Decision states

### ✅ Full GO
All GO criteria ✅ **and** all NO-GO criteria FALSE. Remaining requirement from here: a clean
screenshot baseline and a passing 15-minute smoke test.

### 🟡 Conditional GO Candidate (current decision)
DB blockers are **removed** — 099 + 100 applied and post-check verified. Ship is **possible** once
the UI smoke test (`/sales`, `/admin/invoicing-schedule`, `/admin/sales-targets`) passes with no
**B** failures **and** the screenshot baseline is clean. No DB-level blocker remains.

### 🔴 Production Hold
Hold only if a new **B**-severity smoke failure appears, or the screenshot baseline shows a blank/
errored landing page for any role, or a previously-passing page regresses.

---

## Required approvals before GO

- DB owner — confirms 099/100 verification result + backup taken (if applying).
- Release approver — confirms smoke test + screenshot baseline reviewed.
- Module sign-offs per `go-live-readiness-checklist.md` §8.
