# 14 — Sales Page (`/sales`) Critical Audit
**Date:** 2026-07-12 · **Scope:** `src/pages/Sales.tsx`, `src/components/features/SalesWorkspacePillars.tsx`, `src/lib/salesDashboardV2Queries.ts`, `src/hooks/useSalesDashboardV2Data.ts` · **Method:** every finding verified in code (file:line).

Honest, part-by-part. Severity: 🔴 correctness/trust · 🟠 UX/product · 🟡 polish.

---

## 0. The verdict up front
The page does a lot and the data plumbing is careful — but it is trying to be **three different products at once** (an executive KPI dashboard, a dense financial spreadsheet, and a salesman's work list), so none of them is fully right. There is one real **money bug**, one **dead column**, one **fake-report link**, and a **year filter that silently governs only part of the page**. Below, each part with a fix.

---

## 1. 🔴 Invoicing Plan — the "{year}" total is wrong (money bug)
`Sales.tsx:536–541`: the table's two total columns are **TTL** and **{selectedYear}**. Per-row they correctly show `row.ttl` vs `row.selectedYearValue` — but the **footer totals both print `footerTtl`**. There is no `footerSelectedYear` sum at all (`Sales.tsx:252–254`). So the grand total under the "2026" column repeats the all-time TTL, not the 2026 total. On a page salesmen and management read for money, a wrong total is the worst possible defect.
**Fix:** add `const footerSelectedYear = planRows.reduce((s, r) => s + r.selectedYearValue, 0);` and render it in the last footer cell.

## 2. 🔴 Invoicing Plan — the "Qty" column is permanently empty
`salesDashboardV2Queries.ts:239` hardcodes `quantity: null` ("requires join to project_vehicle_lines — deferred"), and `Sales.tsx:458` renders `row.quantity ?? '—'`. Every row shows **—**. A column that is always empty trains users to ignore the table and wastes horizontal space on an already-too-wide grid.
**Fix:** either populate it (the vehicle-lines join is cheap — `sum(quantity)` per project), or remove the column until it carries data. Do not ship an always-empty column.

## 3. 🔴 A primary "Sales Reports" button links to a known fake page
`Sales.tsx:308` "Sales Reports" → `/reports/sales`, which is one of the mock-only report pages flagged in audit #13 (renders `mockOrEmpty` — empty/fake in production). Meanwhile `Sales.tsx:311` "Generate Report" opens the real, live report dialog. **Two report buttons side by side, one of them fake.** This actively erodes trust.
**Fix:** remove the "Sales Reports" button (or repoint it) and keep the single, working "Generate Report" entry. One report door, and it must be the real one.

## 4. 🟠 The Year selector governs only half the page
The prominent **Year** control (`Sales.tsx:275`) drives the dashboard hook (KPIs, invoicing plan, targets) — but the **Hot Projects and Quotations pillars ignore it** (their effect deps are `[authLoading, isBroadView, profile?.id]`, `Sales.tsx:222–226`; no `selectedYear`). So switching to 2025 changes the top of the page and the plan table but leaves the two pillars showing all-time data. Users cannot tell which numbers moved.
**Fix:** either (a) scope the pillars to the selected year too (filter hot projects/quotations by created/close date), or (b) visually separate the year-scoped block from the "live pipeline" block with a heading, so the selector's reach is obvious. (a) is more honest.

## 5. 🟠 "Three pillars" are not three peers
The prompt/design promised three equal pillars, but the layout is: a **giant 15-column spreadsheet** (Invoicing Plan) followed by **two small stacked lists** (Hot Projects, Quotations). Visually and in weight they are 70% / 15% / 15%. The salesman's daily-work items (open quotations, hot deals) are buried under a finance grid.
**Fix:** give the three equal visual footing — e.g. a compact **"This month due / overdue / next"** summary for invoicing as the pillar, with the full spreadsheet behind a "Full plan" expand or on the dedicated invoicing route. Lead with what the salesman acts on.

## 6. 🟠 The Invoicing Plan table is a desktop-only spreadsheet
`min-width: 1280px` (`Sales.tsx:419`) with a sticky first column and 12 month columns. On a phone — where the identity brief says the salesmen live — it is a horizontal-scroll monster. Money is shown abbreviated (`sarK` → "6.1M", "605K") which **loses the exact figure** a finance user needs, with no tooltip for the precise value.
**Fix:** mobile → stacked card rows (customer, this-year total, pending, a mini month sparkline). Desktop → keep the grid but show exact SAR on hover/tooltip, and right-size to the viewport instead of a fixed 1280px.

## 7. 🟠 "Projects At Risk" is a misleading red KPI
`salesDashboardV2Queries.ts:352` defines at-risk as `project_status = 'sent_back_for_revision'` and the card renders **red/urgent** (`Sales.tsx:361–376`) with a self-admitted "Interim" tag (`:405`). Sent-back-for-revision is an administrative state, **not commercial delivery risk**. A red alarm for a routine revision cries wolf; real risk (overdue delivery, penalty exposure) isn't surfaced here at all.
**Fix:** rename to "Needs Revision" in neutral/warning color, and add a genuine risk KPI (projects past contractual delivery / penalty-exposed) once delivery tracking exists — don't paint an admin state red.

## 7b. 🟡 KPI labels use insider jargon
"TTL" column header (`Sales.tsx:443`) and "TTL 2026" are cryptic; the invoicing subtitle still says "Per-project monthly **milestone** schedule" (`Sales.tsx:395`) although milestones were retired in the financial-truth change (now it's the schedule). Stale/opaque copy erodes confidence.
**Fix:** "TTL" → "Total (all years)" / "2026 Total"; update the subtitle to "Per-project monthly invoicing schedule".

## 8. 🟠 Pipeline value is unweighted; probability is collected but ignored
The KPI "Pipeline Value" is a raw sum "unweighted" (`Sales.tsx:352–356`), yet hot projects carry a `probability` field. Standard sales practice shows a **weighted pipeline** (Σ value × probability) so the number is a realistic forecast, not a best-case fantasy.
**Fix:** add a weighted figure (or a toggle raw/weighted). It's a one-line change with real management value.

## 9. 🟠 Too many exits, little focus
The header stacks five actions — New Quotation, Create SO, Add Hot Project, View Receivables, Sales Reports, Generate Report — plus every pillar has an "Open …" link and a bottom governance card. The page is a **launchpad, not a workspace**: it tells the salesman where to go, not what to do next.
**Fix:** lead with an "action list" (from the live inbox queries already built — sent-back SOs, quotations needing clarification, overdue invoices) at the top; demote the create-buttons into a single "New ▾" menu.

## 10. 🟡 Inconsistent loading & thin empty states
The dashboard uses a real skeleton (`DashboardSkeleton`), but the two pillars show plain "Loading…" text (`SalesWorkspacePillars.tsx:75,135`) — two loading languages on one screen. Empty states are one grey line ("No hot projects yet.") with no call to action.
**Fix:** one skeleton style everywhere; empty states get an icon + a primary action ("Add your first hot project").

## 11. 🟡 The Governance Rules card is dead weight
A static bulleted list of rules at the bottom (`Sales.tsx:637–652`) — never changes, rarely read, pushes real content down. Reference material, not dashboard content.
**Fix:** move to a help/"?" popover or a docs link; reclaim the space.

## 12. 🟡 Three separate round-trips, unmemoised
On mount the page fires the dashboard hook **and** two independent pillar queries (`Sales.tsx:222`), each re-running on their own deps. Fine at today's scale, but the pillars refetch on any `profile.id` identity change and there's no shared cache.
**Fix:** fold the two pillar queries into the dashboard data layer (one `getSalesWorkspaceData`) so the page has a single loading state and one source — and the reports (which already call the same helpers) stay drift-free.

---

## Priority order to fix
1. **#1 wrong year total** and **#3 fake report link** — trust-critical, tiny changes.
2. **#2 dead Qty column**, **#4 year selector reach**, **#7 misleading red KPI** — honesty of the numbers.
3. **#5 pillar balance / #6 mobile / #9 focus** — the "workspace not launchpad" redesign.
4. Polish: #7b copy, #8 weighted pipeline, #10 loading/empty, #11 governance card, #12 data-layer merge.

Items #1–#4 and #7 are a small, high-value PR (correctness + trust). #5/#6/#9 are the real product upgrade (a focused, mobile-first salesman workspace) and deserve their own design pass.
