# 15 — Sales Page (`/sales`) Critical Audit — Round 2
**Date:** 2026-07-12 · **Baseline:** `main` after the round-1 quick fixes (PR #180) · **Method:** every finding verified in code (file:line).

Round 1 (doc #14) fixed the surface trust bugs (wrong year total, dead Qty column, fake report link, misleading KPI). This round goes **deeper** — into the report engine, the query limits, and the interaction details — and finds issues that survive the on-screen glance. Severity: 🔴 correctness/trust · 🟠 UX/product · 🟡 polish. Items already logged in #14 as "deferred to redesign" are marked ↩.

---

## 1. 🔴 The Combined report silently mixes years
The report dialog lets the user pick a **Period** (this month / quarter / **this year** / custom range), but the invoicing section is built from `getSalesDashboardV2Data({ selectedYear })` — the **dashboard's year selector**, not the report period (`SalesWorkspacePillars.tsx:253` + `salesReports.ts:182` `monthsInPeriod(ctx.year, …)`). Meanwhile the Hot Projects and Quotations sections filter by `created_at` / close date **inside the period** (`salesReports.ts:227,273`). So a "Combined · Q1 **2025**" report generated while the dashboard year is **2026** prints **2026 invoicing** next to **2025 pipeline/quotations** — three sections, two different years, no warning. The report *looks* authoritative and is internally inconsistent.
**Fix:** derive the invoicing year from the report period (`period.from.getFullYear()`) and fetch that year, OR lock the Period options to the selected plan year, OR (best) fetch invoicing across every year the period spans and sum. One period meaning for all three sections.

## 2. 🔴 Reports silently truncate at 300 rows
`getWorkspaceHotProjects` / `getWorkspaceQuotations` hard-cap `.limit(300)` (`salesWorkspaceQueries.ts:24,41`). Fine for one salesman on screen — but an **admin/ops generating a broad report** (subject "self" → `scope = null` → all salesmen) will silently drop everything past the 300th hot project or quotation. A management/board report that quietly omits rows, with no "showing 300 of N", is a data-integrity hazard.
**Fix:** for report generation, page through all rows (or raise the cap and assert count), and if a cap is ever hit, print an explicit "truncated — N total" note in the report. Never omit financial rows silently.

## 3. 🟠 "Order / PO" column shows the SO number only — never a PO
Header reads **"Order / PO"** (`Sales.tsx:445`) but the cell renders `row.orderOrPo = project.so_number` (`salesDashboardV2Queries.ts:244`). The customer PO# lives in notes (per the import decision) and is never shown here. The column promises a PO it can't deliver.
**Fix:** relabel to "SO #", or actually surface the PO when present. Don't label a column for data it doesn't carry.

## 4. 🟠 Abbreviated money collapses distinct figures and hides zero-vs-null
`sarK` (`Sales.tsx:55`) renders `6,132,000` and `6,149,000` **both as "6.1M"** — two different contract values look identical on a finance dashboard — and returns **"—" for both `0` and `null`**, so a real zero (e.g. nothing pending) is indistinguishable from "no data". On a page management reads for money, this is a quiet trust erosion.
**Fix:** show exact SAR on hover (title) for every abbreviated cell; render a real `0` as `0`, reserve `—` for genuinely absent values.

## 5. 🟠 Hot-Projects header total ≠ the visible per-stage values
The pillar header says "pipeline SAR X" = **open stages only** (`SalesWorkspacePillars.tsx:55`), while the body lists **every** stage group including won/lost/cancelled with their own SAR values (`STAGE_ORDER` includes them, `:56–58,86`). A user adding up the visible stage numbers won't reach the header total — the two disagree with no explanation.
**Fix:** either show the pipeline total as a clear subset ("open pipeline") and visually separate closed stages, or make the header sum match what's listed.

## 6. 🟠 "+ N more…" is a dead end
Both pillars cap the list (`slice(0,4)` per stage, `slice(0,8)` quotations) and then render **non-clickable grey text** "+ N more…" (`:103,159`). The user is told more exist but can't open them in context; the only escape is the header "Open pipeline/quotations →" which drops the stage/filter context.
**Fix:** make "+ N more" a link to the filtered list (e.g. `/hot-projects?stage=negotiation`), or expand in place.

## 7. 🟠 ↩ The Year selector still governs only half the page
Unchanged since #14: the pillars' effect deps are `[authLoading, isBroadView, profile?.id]` (`Sales.tsx:222`) — **no `selectedYear`**. Switching year moves the KPIs and the plan table but not Hot Projects / Quotations. Still confusing; belongs in the redesign but re-flagged because it's a live inconsistency users hit today.

## 8. 🟡 Report dialog accessibility gaps
The dialog (`SalesWorkspacePillars.tsx:289`) has **no `role="dialog"`/`aria-modal`**, **no Esc-to-close**, **no focus trap**, and the ✕ close button has **no `aria-label`** (grep confirms none). Backdrop-click closes (good) but keyboard users are stranded.
**Fix:** add `role="dialog" aria-modal="true"`, an Esc handler, initial focus + trap, and `aria-label="Close"`.

## 9. 🟡 Custom date range has no validation
`resolvePeriod` custom branch (`SalesWorkspacePillars.tsx:191`) accepts `from > to`, or an empty `to` (→ open-ended), and just yields a window that silently returns few/no rows with a "… → …" label. The user gets an empty report and no reason why.
**Fix:** validate `from ≤ to`, require both for a custom range, and disable "Generate" until valid.

## 10. 🟡 Two loading languages, ambiguous empties, redundant fetches ↩
Still: the dashboard uses a skeleton while the pillars show plain "Loading…" text (`:76,136`); empty states are one grey line with no CTA; and the page fires the dashboard hook plus two independent pillar queries that re-run on `profile.id` identity changes (`Sales.tsx:222`). Fold the pillar queries into the dashboard data layer, one loading state, richer empties.

---

## Still-open from Round 1 (the real redesign — own PR)
- **#5 pillar balance** (a 15-col spreadsheet vs two small lists),
- **#6 desktop-only 1280px table** → mobile card rows (salesmen live on phones),
- **#9 launchpad-not-workspace** (lead with an action list from the live inbox queries),
- **#8 weighted pipeline** (probability is collected, never used).

## Priority
1. **#1 report year-mix** and **#2 silent truncation** — trust-critical, contained changes.
2. **#3 label**, **#4 exact-money-on-hover**, **#5 header math**, **#6 dead "more"** — honesty of the numbers/links.
3. **#8 a11y**, **#9 range validation** — correctness of the interaction.
4. The redesign (round-1 #5/#6/#9/#8) as a dedicated design pass.

Items #1–#4, #8, #9 are a second small, high-value PR. #5/#6 header/label/more are one more. The spreadsheet-on-mobile + workspace refocus is the redesign.
