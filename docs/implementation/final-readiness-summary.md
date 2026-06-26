# Final Readiness Summary

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`
**Updated:** activation-pack sprint — live verification complete.

> Executive view. **Go-live status: 🔴 CONDITIONAL HOLD** until migrations 099 + 100 are applied
> and verified.

---

## Update — live verification complete (activation-pack sprint)

The user ran the read-only verification SQL against live Supabase. Results:

- **System is functionally stabilized.** The full foundational schema (001–098) is applied.
- **Storage buckets present:** afs-attachments, project-documents, qc-documents,
  quotation-documents, raw-material-files, vehicle-photos.
- **Core commercial tables present:** 068 `hot_projects`, 069 `project_invoice_milestones`,
  070 `receivables_aging_view`.
- **Confirmed MISSING:** 099 `sales_user_targets` and all of 100
  (`project_invoicing_schedule`, `_history`, `_alerts_view`, the trigger fn, and both RPCs).
- **PR #149** mitigates the `/sales` failure risk (graceful banner, no hard fail), **but full
  commercial go-live still requires applying 099 and 100.**
- A complete supervised **activation pack** is now prepared (source review, precheck SQL, apply
  pack, postcheck SQL, UI smoke test). **Claude did not apply anything.**

Details: `live-supabase-verification-final-results.md`, `migration-099-100-source-review.md`.

---

## What is completed

- **Sales Dashboard v2 migration-100 safety guard shipped.** `/sales` no longer hard-fails if the
  invoicing-schedule table is missing; it renders projects/pipeline/SO/collection and clearly marks
  the invoicing-schedule sections unavailable. **No calculation changed when data is present.**
- **Code health:** build, typecheck clean; full lint unchanged at 56 (zero new issues).
- **Route/link validation:** all critical routes and recently-added deep-links validated — no
  broken links.
- **Readiness package:** read-only verification results + manual SQL, screenshot execution status,
  manual smoke-test packet, go/no-go matrix, and this summary.

## What was verified (in this environment)

- Static: route definitions, deep-link source→destination contracts, screenshot manifest parse,
  build/typecheck/lint.
- The Part C/D code paths typecheck and lint clean.

## What remains unverified (needs live access)

- **Live applied-state of migrations 099/100** (and 068/069/070) — the Supabase host is blocked by
  this environment's network egress, so the read-only probe could not reach it. **Run
  `docs/sql/read-only-migration-verification.sql` manually.**
- **Live role/screenshot baseline** and **manual smoke test** — need real auth + seeded data.

## Migration status

| Migration | Live status | Frontend behavior if missing |
|-----------|-------------|------------------------------|
| 099 `sales_user_targets` | **Unknown** | Safe — Admin shows "migration pending"; Sales shows "no targets" |
| 100 `project_invoicing_schedule` | **Unknown** (working `/sales` implies present) | **Now safe** — `/sales` shows banner + "—", does not break (this PR); Admin page already safe |

## Status snapshot

| Area | Status |
|------|--------|
| Migration verification | ⚠ Unknown — manual SQL required (egress-blocked here) |
| Screenshot baseline | ☐ Scheduled (GitHub Actions) |
| Smoke test | ☐ Packet ready, not executed live |
| `/sales` resilience | ✅ Guarded |
| Role access / viewer read-only | ✅ Audited safe |

## Critical risks

1. **Migration 100 live status unconfirmed.** Mitigated (not eliminated) by the new safety guard.
   Verify before go-live.

## Non-blocking risks

- 068/069/070 (`hot_projects`, `project_invoice_milestones`, `receivables_aging_view`) lack
  explicit deferred-migration fallbacks; almost certainly applied (pages render in prod), but
  include them in the manual SQL check.
- Live smoke/screenshot pass still pending.

## Recommended next step

1. Run `docs/sql/read-only-migration-verification.sql` in Supabase; paste results into
   `live-supabase-readonly-verification-results.md`.
2. Run the GitHub Actions screenshot baseline; review `/sales` + admin commercial pages.
3. Execute the **15-minute minimum smoke test**.
4. Apply the **go/no-go matrix** → most likely **Conditional GO** once 100 is confirmed present and
   the smoke test passes.

## Go / No-Go recommendation

**🔴 CONDITIONAL HOLD** — live verification confirms migrations **099 and 100 are missing**. The
system is functionally stabilized and `/sales` no longer hard-fails (PR #149), but the commercial
invoicing-schedule and sales-target features are inactive. Apply the supervised activation pack
(`apply-migrations-099-100-supervised.sql`), pass the post-check SQL and UI smoke test, then move to
🟡 Conditional GO. See `go-no-go-decision-matrix.md` for the exact path.
