# Sales User — Artifact Brief

## 1. Role Summary

- **Role name:** `sales_user` (Sales User)
- **Operational purpose:** own the commercial front end — raise quotation requests, create Sales
  Orders/projects, track pipeline (hot projects), and monitor commercial performance (invoicing
  schedule, targets, receivables).
- **Expected landing route:** `/sales`
- **Main responsibilities:** quotation requests → coordinate to estimation → convert to SO/project;
  track invoicing schedule and annual targets; monitor receivables/aging.
- **Permission level:** operational, write within own commercial scope.
- **Read/write scope:** creates quotation requests, hot projects, and SOs/projects; **reads** its
  own invoicing schedule, targets, receivables (RLS scopes rows to the user's own projects).
- **Sensitive restrictions:** cannot reach any `/admin/*` route, the work centers (procurement /
  store / factory / qc / afs), or the Control Tower; cannot perform operational gate actions (WO/PN,
  QC release); SO approval/routing and quotation conversion follow the fixed workflow.
- **Modules/pages accessible:** Sales Dashboard, Hot Projects (+new, +detail), Quotation Requests
  (+new, +detail), Projects/SO (+new, +detail, +invoicing), Receivables, Sales Reports, plus shared
  Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** this-year commercial position — projects value, pipeline, pending invoicing, and
  the monthly invoicing plan; plus anything overdue.
- **Obvious actions:** "New Quotation Request", "Create SO / Project", "Add Hot Project".
- **Hide:** admin controls, other roles' work centers, gate actions — none should appear.
- **Read-only:** invoicing schedule and targets are read-only for sales_user (admin sets them);
  show clearly as read-only.
- **Highlight:** overdue invoicing schedule lines and at-risk projects (restrained red).
- **Minimize:** dense target math — present as compact "actual vs target" with one progress bar.
- **UX tone:** executive commercial SaaS; calm, number-forward, scannable.

## 3. Page Inventory

| # | Page Name | Route | Current Component | Access | Priority | Artifact Needed | Notes |
|---|-----------|-------|-------------------|--------|----------|-----------------|-------|
| 1 | Sales Dashboard | `/sales` | `src/pages/Sales.tsx` | read | **P0** | Yes | Flagship; invoicing schedule active (mig 100) |
| 2 | New Quotation Request | `/quotations/new` | `src/pages/QuotationNew.tsx` | write | P1 | Yes | Two-step submission + doc gates |
| 3 | Quotation Requests (list) | `/quotations` | `src/pages/Quotations.tsx` | read/write | P2 | Optional | Shared list |
| 4 | Quotation Detail | `/quotations/:id` | `src/pages/QuotationDetail.tsx` | read | P2 | Optional | Sales view (coordinator owns actions) |
| 5 | Hot Projects | `/hot-projects` | `src/pages/HotProjects.tsx` | read/write | P1 | Yes | Pipeline list |
| 6 | New Hot Project | `/hot-projects/new` | `src/pages/HotProjectNew.tsx` | write | P2 | Optional | |
| 7 | Hot Project Detail | `/hot-projects/:id` | `src/pages/HotProjectDetail.tsx` | read/write | P2 | Optional | |
| 8 | Projects / SO List | `/projects` | `src/pages/Projects.tsx` | read | P1 | Optional | KPI strip added (PR #145); mature |
| 9 | New SO / Project | `/projects/new` | `src/pages/ProjectNew.tsx` | write | P1 | Optional | Wizard (PR #131); mature |
| 10 | Project Detail | `/projects/:id` | `src/pages/ProjectDetail.tsx` | read | P2 | Optional | Role-tabbed; mature |
| 11 | Project Invoicing | `/projects/:projectId/invoicing` | `src/pages/ProjectInvoicing.tsx` | read | P2 | Optional | Milestones; confirm semantics vs schedule |
| 12 | Receivables & Aging | `/receivables` | `src/pages/Receivables.tsx` | read | P2 | Yes | Aging table |
| 13 | Sales Reports | `/reports/sales` | `src/pages/ReportsSales.tsx` | read | P2 | Optional | |
| 14 | Action Inbox | `/inbox` | `src/pages/Inbox.tsx` (shared) | read | P3 | Optional | See Shared appendix |
| 15 | Notifications | `/notifications` | shared | read | P3 | No | Mature |
| 16 | Templates | `/templates` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: Sales Dashboard

**Route:** `/sales`

**Current Component / Files**
- `src/pages/Sales.tsx` (page)
- `src/hooks/useSalesDashboardV2Data.ts` (data hook)
- `src/lib/salesDashboardV2Queries.ts` (`getSalesDashboardV2Data`) + `src/lib/salesDashboardV2Queries`
  helpers (`calcPendingSchedule`, `buildInvoicingPlanRows`, target calcs)
- `src/types/salesDashboardV2.ts` (data contract + warnings, incl. `invoicingScheduleUnavailable`)
- shared: `KpiCard`, `Card`, `PageHeader`, `Badge`, `DataSourceBadge`, `Skeleton`

**Current Page Purpose**
The Sales User's commercial command center: this-year projects value, pipeline, pending invoicing,
the monthly invoicing plan (now sourced from `project_invoicing_schedule`, migration 100), and the
three annual target blocks (Invoicing, Sales Orders, Collection).

**Current Version Description**
- **Header:** "Sales Dashboard" + subtitle; right side = Year selector, role badge, DataSourceBadge.
- **Top actions row:** New Quotation Request (primary), Create SO/Project, Add Hot Project, View
  Receivables, Sales Reports.
- **Migration-pending banner:** amber banner only if `invoicingScheduleUnavailable` (now resolved —
  100 applied; will not show).
- **6 KPI cards:** Projects, Total Project Value, Pipeline, Total Pipeline Value, Projects at Risk
  (interim def. = sent_back_for_revision), Pending Invoicing.
- **Warnings strip:** subtle info chips (interim at-risk definition; no annual targets configured).
- **Invoicing Plan table:** per-project rows × 12 month columns (sticky first column), soft-green
  month highlights, footer totals; empty state when no schedule rows; an "unavailable" panel if the
  schedule is unavailable.
- **Three target blocks (Invoicing / Sales Orders / Collection):** MetricRow list (Target, achieved,
  year plan, expected total, %), a progress bar, and "not configured" notes; collection target shows
  "—" when NULL (never substituted).
- **Loading:** `DashboardSkeleton`. **Error:** inline red panel.

**Current Data / Business Context**
- Tables/views/functions: `projects`, `hot_projects` (068), `project_invoicing_schedule` (100),
  `project_invoice_milestones` (069, for receivables/collection), `sales_user_targets` (099).
- User-specific: RLS scopes projects/schedule to the user's own projects; targets to the user's own
  row. Read-only page (no mutations here).

**Current Strengths**
- Single source of commercial truth; real data, no fabricated numbers; sticky-column plan table;
  graceful migration-deferred handling; collection-NULL handled correctly.

**Current UX Gaps / Opportunities**
- Heavy density: 6 KPIs + 12-column table + three target blocks compete for attention; no clear
  "what needs action now" focal point.
- Overdue invoicing schedule lines exist as a warning flag but aren't surfaced as a prominent,
  clickable list.
- The three target blocks are visually uniform — hard to scan which target is on/off track at a
  glance.
- "Projects at Risk" uses an interim definition; the chip explains it but it's easy to miss.
- The monthly plan table is wide; tablet experience is horizontal scroll only.
- KPI cards are not clickable to a filtered destination.

**Current Screenshot Reference**
- Screenshot pending (run #2 baseline not yet produced an artifact). Artifact should recreate the
  current version from this description.

**Improved Version Objective**
Turn a dense report into a **scannable commercial cockpit**: a compact KPI band, a prominent
"needs attention" strip (overdue invoicing + at-risk), a cleaner monthly plan, and three
**status-coded** target cards (on track / behind / not set) — same data, clearer priority.

**Improved Version Layout Requirements**
- **Header:** keep title + Year selector + read-only/role badge.
- **KPI band:** 6 compact KPI tiles in one row (wrap to 3×2 on tablet); each tile clickable to its
  natural destination (Projects → `/projects`, Pipeline → `/hot-projects`, Pending Invoicing →
  invoicing plan anchor, Receivables → `/receivables`).
- **Needs-attention strip:** a single row of 1–2 alert chips — "N invoicing lines overdue" (red,
  links to the overdue list) and "N projects at risk" — shown only when counts > 0.
- **Monthly Invoicing Plan:** keep the sticky first column + month grid; add a compact summary
  row at top (YTD invoiced vs pending vs overdue) so the table doesn't carry all the meaning; tablet
  = horizontal scroll with a frozen project column.
- **Targets:** three cards in a row, each with a status pill (On track / Behind / Not set), one
  progress bar, and the 2 most important numbers (achieved, target) — secondary numbers behind a
  "details" expander.
- **States:** preserve loading skeleton, inline error, and the migration-deferred "unavailable"
  panel for the plan.

**Improved Version Content Requirements**
- KPI labels: "Active Projects", "Project Value", "Pipeline", "Pipeline Value", "At Risk",
  "Pending Invoicing".
- Target card titles: "Invoicing Target", "Sales Order Target", "Collection Target".
- Status pills: "On track" (green), "Behind" (amber), "Not set" (neutral) — Collection shows "Not
  set" when target is NULL.
- Overdue chip: "{n} invoicing line{s} overdue" → anchors to the overdue rows.

**Improved Version Visual Direction**
Executive enterprise SaaS, NAFFCO-style: white cards on off-white; restrained red only for overdue/
at-risk; soft-green retained for the current month / on-track; tabular-nums for all money; compact
but readable; no heavy dark panels; no playful UI; no fabricated data.

**Artifact Prompt for This Page**
> Create two mockups — a **Current Version** and an **Improved Version** — of a "Sales Dashboard" for
> an enterprise operations portal (NAFFCO, executive SaaS tone). Do NOT change business logic,
> permissions, data model, or workflows; this is read-only for the Sales User. Use realistic
> placeholder numbers only (never present fabricated data as real).
>
> CURRENT VERSION (recreate faithfully): Page header "Sales Dashboard" with a Year selector, a role
> badge, and a data-source badge. A top action row: New Quotation Request (primary), Create SO/
> Project, Add Hot Project, View Receivables, Sales Reports. Six KPI cards: Projects, Total Project
> Value, Pipeline, Total Pipeline Value, Projects at Risk, Pending Invoicing. A subtle info-chip
> warnings strip. A wide "Invoicing Plan — {year}" table: one row per project × 12 month columns,
> sticky first column, soft-green highlight on the current month, footer totals; show its empty
> state. Three uniform target blocks (Invoicing, Sales Orders, Collection) each listing Target,
> achieved, year plan, expected total, a percentage, and a progress bar; Collection shows "—" when
> not set. Include loading (skeleton) and error (inline red) states.
>
> IMPROVED VERSION (same data + scope): A compact KPI band of six clickable tiles (Active Projects,
> Project Value, Pipeline, Pipeline Value, At Risk, Pending Invoicing). A "needs attention" strip
> that appears only when counts > 0: a red chip "{n} invoicing lines overdue" and an amber chip "{n}
> projects at risk". The monthly Invoicing Plan keeps its sticky project column + month grid but
> gains a compact summary row (YTD invoiced vs pending vs overdue). Three target cards in a row, each
> with a status pill (On track / Behind / Not set), one progress bar, and the two key numbers
> (achieved vs target), with secondary numbers behind a "details" expander; Collection shows "Not
> set" when NULL. Preserve loading, error, and a migration-deferred "Invoicing plan unavailable"
> panel.
>
> Visual direction: white/off-white cards, restrained red for overdue/at-risk only, soft green for
> current month / on-track, tabular-nums for money, compact but readable, no dark panels, no playful
> UI. Provide desktop (1440px) primary + a tablet adaptation (frozen project column with horizontal
> scroll). Output: both versions, a design rationale, a component breakdown (PageHeader, KpiTile,
> AttentionStrip, InvoicingPlanTable, TargetCard, EmptyState, Skeleton), and implementation notes.

**Artifact Output Requirements**
Current Version, Improved Version, design rationale, component breakdown, implementation notes, and
UX acceptance criteria.

**Development Acceptance Criteria**
- Uses only the existing `getSalesDashboardV2Data` contract (no new query, no new field).
- KPI values and plan/target numbers identical to today when data is present.
- Overdue chip derives from existing `overdueInvoicingScheduleExists` / schedule rows.
- Collection target renders "Not set" when NULL (never substituted from invoicing).
- Loading skeleton, inline error, and migration-deferred panel preserved.
- Page remains read-only (no mutation control introduced).
- Desktop 1440px clean; tablet keeps a frozen project column.

**Safe Implementation Notes**
- Do not change DB / RLS / migrations / routes / `roleMatrix` / route guards / workflows /
  calculations. UI + presentation only. Reuse existing shared components. No fabricated data.

---

### Page 2: New Quotation Request

**Route:** `/quotations/new`
**Current Component / Files:** `src/pages/QuotationNew.tsx`; quotation SLA/gate libs; shared form
components. Reads/writes `quotation_requests` (+ lines, documents) via the fixed two-step submission
with required-document gates (migrations 086–088).

**Current Page Purpose:** raise a new quotation request with customer/scope/lines and required
documents, then submit to coordination.

**Current Version Description:** a multi-field form (customer, scope summary, priority, vehicle/line
items), document upload area, and a two-step submit (draft → submit) gated by required documents;
validation messages inline; success routes to the new request.

**Current Data / Business Context:** writes `quotation_requests` and lines; document gates enforced
in DB; mutating page. RLS scopes to the creator.

**Current Strengths:** enforces document gates; two-step prevents premature submission.

**Current UX Gaps / Opportunities:** long single-column form can feel heavy; the document-gate
requirement (what's blocking submit) may not be obvious until submit; line-item entry density;
unclear progress between "draft saved" and "submitted".

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective:** a guided, two-step quotation request that makes the submit gate
("what's still required") explicit and keeps line entry tidy — same fields, same gates, same
workflow.

**Improved Version Layout Requirements:** a slim stepper (Details → Documents & Submit); grouped
field sections (Customer, Scope, Line Items as a compact editable table); a persistent "Submission
checklist" panel showing required documents and which are satisfied; primary action disabled with a
clear reason until gates pass; inline validation; success/empty/error states.

**Improved Version Content Requirements:** step labels "1. Request details" / "2. Documents &
submit"; checklist items mirror the real required-document gates; submit button tooltip states the
unmet requirement.

**Improved Version Visual Direction:** clean enterprise form; white cards; restrained red only on
validation errors / unmet gates; no playful UI.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version mockup of a "New Quotation Request" form for an
> enterprise operations portal (NAFFCO, executive SaaS). Keep the exact workflow: a two-step
> submission (save draft → submit) where submission is gated by required documents; do not add or
> remove fields, gates, or steps. CURRENT VERSION: a long single-column form (customer, scope
> summary, priority, vehicle/line items), a document upload area, draft + submit buttons, inline
> validation. IMPROVED VERSION (same fields + gates): a two-step stepper (1. Request details, 2.
> Documents & submit); grouped sections (Customer, Scope, Line Items as a compact editable table);
> a persistent "Submission checklist" listing the required documents with satisfied/unsatisfied
> states; the Submit button disabled with a clear reason until all gates pass; inline validation;
> include empty, loading, error, and success states. Visual: white cards, restrained red for
> errors/unmet gates, compact but readable, no playful UI, realistic placeholder data only. Output
> both versions + rationale + component breakdown (Stepper, FieldSection, LineItemsTable,
> SubmissionChecklist, validation) + implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria:** same fields/gates/steps; submit remains blocked until the real
document gates pass; no new mutation; validation preserved; mutating behavior unchanged.

**Safe Implementation Notes:** UI only; do not change the two-step submission logic, document gates,
or `quotation_requests` writes; no DB/RLS/workflow change.

---

### Page 5: Hot Projects

**Route:** `/hot-projects`
**Current Component / Files:** `src/pages/HotProjects.tsx`; reads `hot_projects` (068).
**Current Page Purpose:** track the sales pipeline (leads/qualified/proposal/negotiation stages).
**Current Version Description:** a list/table of hot projects with stage, customer, estimated value,
and a "New Hot Project" action; basic filtering.
**Current Data / Business Context:** `hot_projects`; RLS-scoped; read + create.
**Current Strengths:** simple pipeline visibility tied to the dashboard pipeline KPI.
**Current UX Gaps / Opportunities:** stages aren't visualised as a funnel/board; estimated value not
summarised by stage; no quick sense of pipeline weighting or stale leads.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a pipeline view that shows stage distribution and value at a glance
while preserving the existing list and create action.
**Improved Version Layout Requirements:** a compact stage summary strip (count + value per stage);
the existing table below with stage badges, value (tabular-nums), and last-updated; optional board
toggle (columns by stage) — no new data; empty/loading/error states.
**Improved Version Content Requirements:** stage labels exactly as the enum; value totals per stage.
**Improved Version Visual Direction:** executive SaaS; restrained accent per stage; no playful UI.
**Artifact Prompt for This Page**
> Create a Current Version and Improved Version of a "Hot Projects" sales-pipeline page (enterprise
> NAFFCO SaaS). Data: a list of pipeline opportunities each with a stage, customer, estimated value,
> and last-updated; plus a "New Hot Project" action. Do not change the stages, data, or workflow.
> CURRENT VERSION: a simple filterable table of opportunities + a create button. IMPROVED VERSION
> (same data): add a stage-summary strip (count and total estimated value per stage) above the
> table; show stage as a badge and value with tabular-nums; offer an optional board view (columns by
> stage) using the same records. Include empty, loading, and error states. Visual: white/off-white
> cards, restrained stage accents, compact, no playful UI, realistic placeholder data only. Output
> both versions + rationale + component breakdown (StageSummaryStrip, PipelineTable/Board,
> StageBadge, EmptyState) + implementation notes.
**Development Acceptance Criteria:** same records/stages; value totals computed from loaded rows; the
create action unchanged; no new data; read/create scope preserved.
**Safe Implementation Notes:** UI only; no change to `hot_projects` schema, RLS, or stage logic.

---

### Pages 3,4,6–13 (condensed full sections)

> These are mature or secondary for this role. Each still ships a usable prompt. Reuse the **Page 1**
> visual direction, output requirements, and safe-implementation notes for all of them.

- **Quotation Requests list (`/quotations`, `Quotations.tsx`)** — mature list with filters and (for
  coordinator) status; for sales_user it's read/track. *Artifact prompt:* "Current + Improved of a
  quotation-requests list with status/priority badges, search, and per-row 'View'. Improved: add a
  compact status summary strip and clearer SLA/priority badges; same data; no new actions."
- **Quotation Detail (`/quotations/:id`, `QuotationDetail.tsx`)** — sales_user sees status, lines,
  documents, timeline; coordinator owns the action panel (not shown to sales beyond visibility).
  *Artifact prompt:* "Current + Improved of a quotation detail (header summary, line table, documents,
  timeline). Improved: stronger status header + clearer timeline; preserve role-gated action panel
  visibility; no workflow change."
- **New Hot Project (`/hot-projects/new`, `HotProjectNew.tsx`)** — create form. *Prompt:* "Current +
  Improved of a create-hot-project form; group fields; same fields/workflow."
- **Hot Project Detail (`/hot-projects/:id`)** — detail + stage progression. *Prompt:* "Current +
  Improved detail with a clear stage indicator; same data/workflow."
- **Projects/SO list (`/projects`, `Projects.tsx`)** — mature; KPI strip already added (PR #145).
  *Prompt:* "Current + Improved of a Projects/SO list with the existing KPI strip, status tabs,
  filters, and table; Improved: tighten KPI band + status badges; same data/scope."
- **New SO/Project (`/projects/new`, `ProjectNew.tsx`)** — mature 4-step wizard (PR #131). *Prompt:*
  "Current + Improved of the SO/Project creation wizard; keep all steps, fields, code generation, and
  approval/routing; Improved: clearer step progress + review step; no logic change."
- **Project Detail (`/projects/:id`, `ProjectDetail.tsx`)** — mature role-tabbed detail. *Prompt:*
  "Current + Improved of a project detail with Overview/Commercial/Execution/Documents/Activity tabs
  and a WO/PN execution-gate card; preserve role-based tab visibility and gate logic; Improved:
  stronger header summary; no workflow change."
- **Project Invoicing (`/projects/:projectId/invoicing`, `ProjectInvoicing.tsx`)** — milestones view.
  **Needs Business Confirmation** (milestones vs. the new schedule). *Prompt:* "Current + Improved of
  a project invoicing milestones view; same data; confirm milestone semantics before redesign."
- **Receivables & Aging (`/receivables`, `Receivables.tsx`)** — reads `receivables_aging_view` (070).
  *Prompt:* "Current + Improved of a receivables & aging table (aging buckets, totals). Improved: an
  aging summary band (0–30/31–60/61–90/90+) + clearer overdue emphasis; same data; read-only."
- **Sales Reports (`/reports/sales`, `ReportsSales.tsx`)** — mature. *Prompt:* "Current + Improved of
  a sales report (pipeline/conversion/active projects) with export preserved; tidy filters + tables."

---

## Shared Pages Appendix (apply to every role)

- **Action Inbox (`/inbox`)** — shared role-aware task inbox. *Prompt:* "Current + Improved of a
  role-based action inbox grouping pending tasks by type with clear primary actions per row; same
  tasks/permissions; add a priority/overdue emphasis; no new task types."
- **Notifications (`/notifications`, `/notifications/settings`)** — mature; optional polish only.
- **Templates (`/templates`, `/templates/new`, `/templates/generated`, `/templates/:id`)** — document
  template library. *Prompt:* "Current + Improved of a document template library (list, new, generated
  docs, detail); clearer cards + status; same data/permissions; no new generation logic."

> These shared pages are referenced (not re-expanded) in the other role files to avoid duplication.
