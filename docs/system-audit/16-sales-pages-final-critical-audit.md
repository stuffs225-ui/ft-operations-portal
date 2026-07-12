# 16 — Sales Pages Final Critical Audit (Pre-Demo)
**Date:** 2026-07-12 · **Baseline:** `main` after PRs #181/#182/#183 · **Goal:** present the sales area to management tomorrow with zero visible errors.
**Method:** (a) every sales route driven live in the browser as a `sales_user` (mock mode) with console/page-error capture, and (b) critical code read of each page. Findings cite `file:line`.

Severity: 🔴 correctness/trust · 🟠 UX/product · 🟡 polish · ✅ verified good.

---

## 0. Live walkthrough result (the headline for the demo)
Drove all eight sales-journey routes as `sales_user`. **No page errors, no console errors, every page rendered with the correct `<h1>` and structure:**

| Route | Renders | Errors |
|-------|---------|--------|
| `/sales` (Sales Dashboard) | ✅ | 0 |
| `/hot-projects` | ✅ | 0 |
| `/hot-projects/:id` | ✅ | 0 |
| `/quotations` | ✅ | 0 |
| `/receivables` | ✅ | 0 |
| `/projects` | ✅ | 0 |
| `/reports/sales` | ✅ | 0 |
| `/inbox` (Action Inbox) | ✅ | 0 |

**Nothing crashes.** The findings below are correctness/UX/polish issues, not demo-breakers — except where marked P0.

> ⚠️ **The demo runs against real Supabase, not mock.** The walkthrough proves the code path is clean; it cannot prove the imported 2026 data renders. **Before the demo, log in as a real salesman and confirm `/sales`, `/hot-projects`, `/receivables` show live data** (mock mode shows empty "No live data source" states, which is expected and NOT what management will see).

---

## Cross-page findings (these matter most to a management audience)

### C1. 🔴 The pipeline number disagrees between two sales pages
`/hot-projects` headlines **"Weighted Pipeline"** = Σ(estimated_value × probability) (`HotProjects.tsx:143,189`), while `/sales` shows **"Pipeline Value — Estimated, unweighted"** (`Sales.tsx` KPI). The same salesman opens two pages and sees **two different pipeline totals** with no explanation. A manager will notice.
**Fix:** pick one canonical definition, or show both on `/sales` (e.g. "Pipeline SAR X · weighted SAR Y"). Corrects the round-2 note #8 — weighted pipeline **is** used, just only on `/hot-projects`.

### C2. 🟠 Two overlapping "reports" surfaces
There is a **Sales Reports** page (`/reports/sales`, sidebar) with tabs Quotations / Hot Projects / Active Projects / Aging + Print/Export/Snapshot, **and** a **Generate Report** button on `/sales` opening a printable A4 dialog. Both report on the same quotations/hot-projects/aging. Two entry points, same purpose — confusing to demo.
**Fix (before demo, cheap):** clarify the split verbally or relabel — `/reports/sales` = interactive/on-screen + CSV; `/sales` "Generate Report" = printable PDF for a salesman/period. Longer term, consider merging.

### C3. 🟡 Confirm the fixes are deployed
PRs #181 (audit r2), #182 (report/label/money/a11y fixes) and #183 (ProjectDetail two-tab) are on `main`. **Ensure the environment management will demo from is deployed from current `main`.**

---

## Per-page findings

### `/sales` — Sales Dashboard
- ✅ Structure is clean: grouped KPIs (Portfolio / Pipeline / Risk & Cash), invoicing-plan table, Hot Projects + Quotations pillars, Annual Targets, governance rules.
- ✅ Round-1/2 fixes shipped: money year-total bug, Qty column, fake link removed, report year-consistency, no silent truncation, exact-money hover, dialog a11y, custom-range validation.
- 🟠 **Open from round 2 (not demo-blockers):** pillar header total vs per-stage body math (#5), non-clickable "+ N more…" (#6), Year selector governs KPIs/table but not the two pillars (#7), two loading languages + thin empty states (#10).
- 🟡 In mock/empty state the KPI cards read as bare "—". With the imported 2026 data they populate; **verify live**. If a salesman has no `sales_user_targets` row, Annual Targets legitimately show "—" + a "Set targets" hint.

### `/hot-projects` — Opportunity Pipeline
- ✅ Strong page: KPIs, five filter tabs (All Open / My Pipeline / Closing This Month / No Next Action / Won-Lost), search + stage filter, weighted pipeline, CSV/print.
- 🔴 **"Won This Period" ignores any period** — `wonCount = records.filter(stage==='won').length` (`HotProjects.tsx:144`) has **no date filter**; the KPI label says "This Period" but counts all-time wins. Either add the period filter or relabel "Won (total)".
- 🟡 **"Share by email — provider not configured"** badge (`ReportExportBar.tsx:95`) is always visible when no email provider is set — reads as unfinished in a demo. **Hide it entirely** unless `EMAIL_PROVIDER_CONFIGURED`.

### `/quotations` — Quotation Requests
- ✅ **Demo-ready.** Action-required banner, tabs with live counts (Action Required / Draft / Submitted / With Coordinator / Converted / Closed / All), clean table (Code / Customer / Status / Priority / Submitted / Next Action), working View links. No issues found.

### `/receivables` — Receivables & Aging
- 🟠 **Duplicated buckets.** The top KPI row renders `due_31_60` and `due_90_plus` (`Receivables.tsx:107`), and the aging strip below renders **all five** buckets including those same two (`:119+`). "31-60 Days" and "90+ Days" appear **twice** on one screen. Replace the two duplicated top cells with something additive (e.g. "Current / Not Yet Due" vs "Overdue"), or drop them and let the strip carry the buckets.
- ✅ Aging strip doubles as a filter; Total Outstanding + Overdue KPIs are correct.

### `/reports/sales` — Sales Reports
- ✅ Rich, working: tabs Quotations / Hot Projects / Active Projects / Aging, KPI tiles, full table, Print/Export CSV/Save Snapshot.
- 🟠 Overlaps `/quotations` and the `/sales` report dialog (see C2).
- 🟡 Same "provider not configured" badge as Hot Projects (`ReportExportBar.tsx:95`).

### `/projects/:id` — Project detail (sales view)
- ✅ Just simplified to two tabs (Overview + Progress) for commercial roles (PR #183) — verified live: only those two tabs show, Progress renders timeline + execution glance. Good to demo.

---

## Demo-day priority plan

**P0 — do before the demo (small, high-visibility):**
1. **Hide** the "Share by email — provider not configured" badge when no provider is set (`ReportExportBar.tsx`) — removes an "unfinished" look from Hot Projects + Sales Reports.
2. **Remove the two duplicated bucket cells** from the Receivables top KPI row (`Receivables.tsx:107`).
3. **Log in as a real salesman and click every sales page** to confirm the imported 2026 data renders (this is the single most important pre-demo check — mock mode hides it).
4. Confirm the demo environment is deployed from current `main` (PRs #181/#182/#183).

**P1 — worth doing if there's time:**
5. Reconcile the pipeline number across `/sales` and `/hot-projects` (C1) — show weighted + unweighted, or one definition.
6. Fix "Won This Period" to actually filter by period, or relabel (`HotProjects.tsx:144`).

**P2 — after the demo:**
7. Round-2 open items on `/sales` (#5 header math, #6 dead "+more", #7 year-selector scope, #10 loading/empty unification).
8. Rationalise the two report surfaces (C2).

## One-line verdict
The sales area is **stable and demo-safe** — nothing crashes and the core pages (Sales Dashboard, Quotations, Hot Projects, Projects) are clean. The only things a sharp manager might catch are the **two duplicated Receivables buckets**, the **"provider not configured" badge**, and the **pipeline number differing between two pages**. P0 items 1–2 are ~30 minutes; items 3–4 are verification, not code.
