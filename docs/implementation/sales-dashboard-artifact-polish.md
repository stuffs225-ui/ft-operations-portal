# Sales Dashboard Artifact Polish

**Branch:** `feature/sales-dashboard-artifact-polish`
**Base main SHA:** `8f7b4b97d993c89a35349087874fbf1653cb8719`
**Scope:** **UI-only** polish of the `/sales` (Sales User) dashboard from the
approved Artifact design. No business logic, calculation, data-source, DB/RLS,
migration, permission, `roleMatrix`, or route-guard changes. No mock/demo data.

---

## Artifact design summary

The approved Artifact kept the existing `/sales` content and tightened its
presentation toward an executive-SaaS look:

- Group the six KPI cards into **Portfolio / Pipeline / Risk & Cash**.
- Stronger value hierarchy, calmer zero values, restrained NAFFCO red reserved for
  genuine critical status, and removal of decorative rainbow accents.
- Convert the two grey "note bar" boxes into **lighter inline affordances** — an
  "Interim" tag on Projects At Risk and a "Set targets" prompt by the Annual
  Targets header — **preserving the caveat wording and meaning**.
- Keep the Invoicing Plan monthly table (existing data source), Annual Targets (3
  cards + progress bars only when a target exists), Outstanding Receivables inside
  the Collection card, and all contained empty/loading/error states.
- The Artifact's **state toggle was a design-review device only** and is **not**
  implemented in production.

---

## What was implemented

**KPI grouping (Part C):** the flat six-card grid is now three labelled groups —
**Portfolio** (Projects, Total Project Value), **Pipeline** (Pipeline Projects,
Pipeline Value), **Risk & Cash** (Projects At Risk, Pending Invoicing). Metric
meaning, labels, and sub-labels are unchanged.

**KPI readability (Parts B/C):** new `SalesKpiCard` — neutral white surface, larger
`text-2xl` tabular value, uppercase micro-label, calm caption. **Decorative left-
border rainbow removed** (was emerald/orange/indigo). The only colored emphasis is
a restrained red left-border + red value on **Projects At Risk when the count > 0**
(real status). Zero / unavailable values render muted (`text-gray-300`) instead of
bold black.

**Inline affordances (Part 3):** the two grey note bars are gone. Their content
moved to light `InlineTag` chips:
- **Projects At Risk** card carries an **"Interim"** tag whose tooltip preserves the
  full caveat ("counts projects sent back for revision, not commercial delivery
  risk. A refined definition is pending.").
- **Annual Targets** header shows a **"Set {year} targets"** amber chip when no
  targets exist; its tooltip preserves the caveat ("No annual targets configured
  for {year}. Annual targets are configured by an administrator.").

**Invoicing Plan (Part D):** retained as-is — it already meets the approved spec:
existing data source, monthly milestone table when rows exist, professional empty
state otherwise, horizontal scroll, sticky Customer column, derived totals row, and
the "Open Projects" link. No fabricated values; no export/print added.

**Annual Targets (Part E):** retained — three cards (Invoicing, Sales Orders,
Collection), progress bars rendered only when a target exists (`TargetBar` returns
`null` for a null percent), clean "not configured" notes, Outstanding Receivables
kept inside Collection, zeros shown calmly.

**Empty / loading / error (Part F):** retained — page-level skeleton, per-panel
empty states, contained error card, and `—` for unavailable values. The header and
action row render above any error so the page stays useful.

---

## What was intentionally NOT implemented

- **No production state toggle** — the Artifact toggle was design-review only.
- **No export / print actions** — the app does not already support them safely on
  this page; left as a future optional note.
- **No admin "set targets" link** for sales_user — targets are admin-configured;
  exposing `/admin/sales-targets` to sales_user would violate role scope, so the
  prompt is informational only.
- **No data-contract / query / calculation changes** — all figures remain live.
- **No new panels, metrics, or business features.**

---

## Files changed

**Code**
- `src/pages/Sales.tsx` — KPI grouping + `SalesKpiCard`, `KpiGroup`, `InlineTag`
  components; removed the two grey note bars; moved caveats into inline tags;
  neutralized decorative KPI accents; calmer muted zeros. (Presentational only.)

**Docs**
- `docs/implementation/sales-dashboard-artifact-polish.md` (this file).

**Not changed:** `src/lib/salesDashboardV2Queries.ts`, `src/hooks/useSalesDashboardV2Data.ts`,
`src/types/salesDashboardV2.ts`, `roleMatrix`, routes, guards, migrations.

---

## Safety notes

- Route remains `/sales`; intended role remains `sales_user`.
- All action links unchanged and verified: New Quotation Request (`/quotations/new`),
  Create SO / Project (`/projects/new`, gated by `CAN_CREATE_SO`), Add Hot Project
  (`/hot-projects/new`), View Receivables (`/receivables`), Sales Reports
  (`/reports/sales`), Open Projects (`/projects`).
- No admin-only action exposed to sales_user; no service role in the frontend.
- No sidebar/navigation change (no duplicate-nav risk introduced).
- "Pending Invoicing" (scheduled, not yet invoiced) remains distinct from
  "Outstanding Receivables" (invoiced, not yet collected), which stays in the
  Collection card.

---

## Validation checklist

- [x] `npx tsc --noEmit` — clean.
- [x] `npx eslint src/pages/Sales.tsx` — clean.
- [x] `npm run lint` — 56 problems (22 errors / 34 warnings), unchanged baseline.
- [x] `npm run build` — clean.

## Manual / static review checklist

- [ ] `/sales` with **empty data** — three KPI groups render; zeros are muted; no
      crash; panels show their empty states.
- [ ] `/sales` with **populated data** — values render; Invoicing Plan table shows
      monthly milestones with a totals row and sticky Customer column.
- [ ] No migration warning when migration 100 is active; when inactive, schedule
      values show `—` with the contained amber notice (unchanged behavior).
- [ ] KPI labels correct; Pending Invoicing not confused with Outstanding
      Receivables; Outstanding Receivables present in the Collection card.
- [ ] "Interim" tag tooltip shows the full at-risk caveat; "Set {year} targets"
      chip appears only when no targets are configured.
- [ ] No heavy dark UI, no decorative rainbow accents, no full-page crash.
