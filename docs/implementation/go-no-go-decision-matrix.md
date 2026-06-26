# Go / No-Go Decision Matrix

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`
**Updated:** activation-pack sprint (`feature/missing-migrations-099-100-activation-pack`).

---

## CURRENT DECISION: 🔴 CONDITIONAL HOLD

**Reason:** live verification confirms migrations **099 and 100 are missing**. Core commercial
features (invoicing schedule, sales targets, the Sales Dashboard invoicing plan) are not active.
`/sales` is mitigated by the PR #149 safety guard (no hard fail), but full commercial go-live is
held until 099/100 are applied and verified.

**Path to Conditional Go:**
1. Take a Supabase backup.
2. Run `docs/sql/precheck-before-applying-099-100.sql` and review (099/100 still missing; deps present).
3. Apply `docs/sql/apply-migrations-099-100-supervised.sql` (supervised, in the SQL Editor).
4. Run `docs/sql/postcheck-after-applying-099-100.sql` — all checks pass.
5. Run `post-migration-099-100-ui-smoke-test.md` (no **B** failures).
6. Run the screenshot baseline or the 15-minute role smoke test.
7. Approve go-live.

---

## GO criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Build green | ✅ | `npm run build` clean |
| Typecheck green | ✅ | `tsc --noEmit` clean |
| No changed-file lint issues | ✅ | zero; full lint 56 (baseline) |
| Critical migrations verified **or** safe-guarded | ⚠ partial | 099/100 **unverified** (egress-blocked), but `/sales` is now **safe-guarded** for missing 100 |
| Role access verified | ✅ | role-access audit (PR #148); no admin exposure to viewer |
| `/sales` verified | ⚠ | static + guard verified; live render pending smoke test |
| Admin migration-dependent pages behave safely | ✅ | `deferredMigrationSafety` (PR #143) |
| Screenshot baseline completed or scheduled | ☐ | scheduled — run via GitHub Actions |
| Smoke test completed | ☐ | packet ready; not yet executed live |
| No critical blockers | ⚠ | one conditional (verify 100) |

## NO-GO criteria (any TRUE → do not ship)

| Criterion | Current | Notes |
|-----------|---------|-------|
| Migration 100 missing **and** `/sales` not safely guarded | **FALSE** | `/sales` is now safely guarded (this PR) |
| Route crash on a key role landing page | Unknown | confirm via smoke test |
| Viewer sees mutation/admin action | **FALSE** | audited read-only |
| Admin route exposed to non-admin | **FALSE** | admin-guarded |
| DB verification shows missing runtime-critical object **without** fallback | Unknown | `/sales` now has a fallback; verify others (068/069/070) live |
| Screenshot baseline has critical page blank/error | Unknown | run baseline |
| Smoke test fails on a core workflow | Unknown | run smoke test |

---

## Decision states

### ✅ Full GO
All GO criteria ✅ **and** all NO-GO criteria FALSE. Requires: live verification of migration 100
(present), a clean screenshot baseline, and a passing 15-minute smoke test.

### 🟡 Conditional GO (current recommendation)
Ship is **possible** once: (1) the read-only SQL confirms migration 100 is **present** (strongly
implied by working `/sales`), **and** (2) the 15-minute smoke test passes with no **B** failures.
The Part C safety guard means that even an unexpected missing-100 state **degrades gracefully**
rather than breaking `/sales` — this lowers the blast radius but does **not** replace verification.

### 🔴 Production Hold
Hold if: the SQL shows migration 100 (or 068/069/070) **missing** and the dependent pages error
without fallback, or any **B**-severity smoke test fails, or the screenshot baseline shows a blank/
errored landing page for any role.

---

## Required approvals before GO

- DB owner — confirms 099/100 verification result + backup taken (if applying).
- Release approver — confirms smoke test + screenshot baseline reviewed.
- Module sign-offs per `go-live-readiness-checklist.md` §8.
