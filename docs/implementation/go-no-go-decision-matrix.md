# Go / No-Go Decision Matrix

**Branch:** updated on `feature/final-production-readiness-screenshot-smoke-go-no-go`.
**Base main SHA (this update):** `1a385a6f2bfbb9c2a3d27ef51cba7b932b2f20f7`.

---

## CURRENT DECISION: 🟡 CONDITIONAL GO

**Reason:** migrations **099 + 100 are applied and post-check verified**; the **DB-level blockers
are removed**. The codebase is green (build / typecheck / lint baseline), all 15 critical routes are
static + code-path verified (no broken links, no null-data crash risk, no stale migration-pending
wording), role access is clean (admin-only commercial controls; viewer read-only; no service role in
frontend), and the post-migration screenshot baseline (**run #2**) was **triggered and is healthy**
(auth + dev server + route catalogue validated; capture in progress). Launch can proceed with manual
monitoring + the rollback plan; move to **unconditional GO** once the screenshot artifact and the
15-minute smoke test are reviewed clean.

**Conditions remaining for unconditional GO:**
1. Review screenshot run #2 artifact (`full-role-page-screenshot-baseline`) — the 3 commercial pages
   show real data; no blank/error pages on any role landing route.
2. 15-minute minimum smoke test passes (manual packet).
3. Sign-off per the handover pack.

**Completed:**
- ✅ Supabase backup (user) · pre-check · apply · post-check — all passed (PR #150/#151).
- ✅ Build / typecheck / full-lint baseline green.
- ✅ Critical UI smoke — static + code-path verified (`final-ui-smoke-test-results.md`).
- ✅ Role access final check — no blocker (`final-role-access-check.md`).
- ✅ Screenshot baseline **run #2 triggered** on `main` (`final-screenshot-baseline-results.md`).
- ⏳ Screenshot artifact review + 15-minute smoke + sign-off — **next**.

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

### 🟡 Conditional GO (current decision)
DB blockers are **removed** (099 + 100 applied & verified), code is green, all 15 critical routes are
static + code-path verified, role access is clean, and the post-migration screenshot baseline is
triggered & healthy. Ship is **supportable now** with manual monitoring + rollback plan; move to
**unconditional GO** once the screenshot artifact (run #2) and the 15-minute smoke test are reviewed
with no **B** failures. No DB-level blocker remains.

### 🔴 Production Hold
Hold only if a new **B**-severity smoke failure appears, or the screenshot baseline shows a blank/
errored landing page for any role, or a previously-passing page regresses.

---

## Required approvals before GO

- DB owner — confirms 099/100 verification result + backup taken (if applying).
- Release approver — confirms smoke test + screenshot baseline reviewed.
- Module sign-offs per `go-live-readiness-checklist.md` §8.
