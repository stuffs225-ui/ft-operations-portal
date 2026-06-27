# Viewer / Management — Artifact Brief

## 1. Role Summary

- **Role name:** `viewer` (Viewer / Management)
- **Operational purpose:** read-only executive visibility into portfolio health, delivery readiness,
  delays, and operational blockers. **No write actions anywhere.**
- **Expected landing route:** `/management-dashboard`
- **Main responsibilities:** monitor; escalate verbally; no execution.
- **Permission level:** read-only.
- **Read/write scope:** read only. No create/edit/approve/delete/upload.
- **Sensitive restrictions:** no admin pages; no mutation controls; no individually-sensitive
  commercial data beyond what management reporting already exposes (sales targets are NOT exposed to
  viewer).
- **Modules/pages accessible:** Management Dashboard, Control Tower (read), Reports (Executive,
  Health, SLA, Data Quality, Issues), portfolio views (Projects, Hot Projects, Quotations,
  Receivables — read), plus shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** the executive headline — active projects, pending approvals, overdue, release-
  blocked, open QC blockers/NCRs, hot pipeline, open quotations.
- **Obvious actions:** navigate to read-only detail/reports. **No mutation actions at all.**
- **Hide:** every create/edit/approve/delete control; admin links; sales targets.
- **Read-only:** the entire surface — make "read-only" explicit and trustworthy.
- **Highlight:** critical/overdue/blocked (restrained red) for executive attention.
- **Minimize:** operational minutiae — summarise for leadership.
- **UX tone:** calm executive read-only; clarity over density.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Management Dashboard | `/management-dashboard` | `src/pages/ManagementDashboard.tsx` | read | **P0** | Yes | Read-only flagship |
| 2 | Control Tower | `/control-tower` | `src/pages/ControlTower.tsx` | read | P1 | — | See `operations_manager.md` (read-only) |
| 3 | Executive / Health / SLA / Data Quality / Issues reports | `/reports/executive`, `/reports/health-scores`, `/reports/sla`, `/reports/data-quality`, `/reports/issues` | report pages | read | P2 | Optional | Read-only analytics |
| 4 | Reports Hub | `/reports` | `src/pages/Reports.tsx` | read | P2 | Optional | Role-filtered |
| 5 | Portfolio reads | `/projects`, `/projects/:id`, `/hot-projects`(+`/:id`), `/quotations`(+`/:id`), `/receivables`, `/reports/sales`, `/reports/projects`, `/projects/:projectId/invoicing` | read | read | P2 | Optional | Read-only; see `sales_user.md` |
| 6 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read | P3 | Optional | See Shared appendix |

> **Note:** the screenshot route manifest lists `/management-dashboard` as the viewer's primary;
> other portfolio/report routes are reachable read-only. Verify against `App.tsx` guards when
> redesigning (trust code over docs); document any mismatch but do not change guards.

---

## 4. Pages Detail

### Page 1: Management Dashboard (P0)

**Route:** `/management-dashboard`

**Current Component / Files**
- `src/pages/ManagementDashboard.tsx`; `PageHeader`, `SectionHeader`, `DataSourceBadge`,
  `RoleRulesCard`, `cn`. Reads counts: active/pending-approval/overdue projects, release-blocked
  (`release_notes`), open QC blockers (`project_qc_findings`), open NCRs (`material_ncrs`), hot
  projects open (`hot_projects`), open quotations (`quotation_requests`). Fallback KPI set when
  Supabase not configured.

**Current Page Purpose**
Read-only executive overview of portfolio health, delivery readiness, delays, and operational
blockers, with navigation to read-only visibility and executive reports.

**Current Version Description**
- **Header:** "Management Dashboard" + subtitle; a **"Read-only"** pill + DataSourceBadge.
- **8 KPI cards** with severity coloring + a severity icon (critical/warning/info/normal): Active
  Projects, Pending Approval, Overdue Projects, Release Blocked, Open QC Blockers, Open NCRs, Hot
  Projects Open, Open Quotations — each a `<Link>` to the relevant read-only page; a graceful
  fallback set ("—") when data isn't available.
- **Management Visibility** link grid (Portfolio Overview, Operations Overview, Hot Projects,
  Quotation Pipeline, Receivables).
- **Executive Reports** link grid (Reports Hub, Executive Report, SLA & Delays, Health Scores, Data
  Quality).
- **RoleRulesCard** (governance rules).
- **Loading:** KPI skeletons. **No mutation controls anywhere.**

**Current Data / Business Context**
- Read-only count queries across projects/QC/NCR/release/hot/quotations; navigation links only;
  guarded `viewer` (+admin). No writes.

**Current Strengths**
- Genuinely read-only; severity-coded KPIs; graceful fallback; clear visibility/report shortcuts.

**Current UX Gaps / Opportunities**
- 8 uniform KPI tiles — the critical ones (Overdue, Release Blocked, Open NCRs) don't dominate.
- Severity is encoded in a small icon + color; an executive scan would benefit from a clearer
  "attention vs healthy" split.
- Visibility links and report links are two similar grids — could be unified or clearly themed.
- No single "executive headline" sentence (e.g., "N projects active, N at risk, N blocked").
- "Read-only" pill is present but the trust signal could be stronger.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A calm executive read-only cockpit: a one-line portfolio headline, a clear "attention" group vs
"healthy" group of KPIs, and tidy visibility/report shortcuts — same counts, same links, strictly
read-only.

**Improved Version Layout Requirements**
- **Header:** keep title + a prominent **Read-only** badge.
- **Executive headline strip:** a single summarising line built from existing counts (e.g., "{active}
  active · {atRisk} at risk · {blocked} release-blocked").
- **KPI grid in two zones:** "Needs attention" (Overdue, Release Blocked, Open QC Blockers, Open
  NCRs — surfaced when > 0, red/amber) and "Portfolio" (Active, Pending Approval, Hot Pipeline, Open
  Quotations). Each tile remains a read-only link; preserve the graceful "—" fallback.
- **Shortcuts:** one "Management Visibility" group + one "Executive Reports" group (kept, tidied).
- **RoleRulesCard** retained. **Absolutely no mutation controls.**

**Improved Version Content Requirements**
- Read-only badge text: "Read-only". Headline uses existing counts only. KPI labels unchanged.

**Improved Version Visual Direction**
Calm executive SaaS; white on off-white; restrained red for critical only; generous spacing;
tabular-nums; no dark panels; no playful UI; no fabricated data; obviously read-only.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version of a read-only "Management Dashboard" for company
> leadership in an enterprise operations portal (NAFFCO, calm executive SaaS). This role is
> READ-ONLY: there must be NO create/edit/approve/delete/upload controls anywhere, no admin links,
> and no individual sales-target data. Do not add features; all numbers come from live counts (use
> realistic placeholder values).
>
> CURRENT VERSION: header "Management Dashboard" with a "Read-only" pill and a data-source badge;
> eight KPI cards with severity coloring and a small severity icon (Active Projects, Pending Approval,
> Overdue Projects, Release Blocked, Open QC Blockers, Open NCRs, Hot Projects Open, Open
> Quotations), each a link to a read-only page, with a graceful "—" fallback when data is
> unavailable; a "Management Visibility" link grid (Portfolio Overview, Operations Overview, Hot
> Projects, Quotation Pipeline, Receivables); an "Executive Reports" link grid (Reports Hub,
> Executive Report, SLA & Delays, Health Scores, Data Quality); a governance rules card; KPI loading
> skeletons.
>
> IMPROVED VERSION (same counts + links, strictly read-only): keep the title + a prominent Read-only
> badge; add a one-line executive headline built from existing counts ("{active} active · {atRisk}
> at risk · {blocked} release-blocked"); split the KPIs into a "Needs attention" zone (Overdue,
> Release Blocked, Open QC Blockers, Open NCRs — red/amber, shown when > 0) and a "Portfolio" zone
> (Active, Pending Approval, Hot Pipeline, Open Quotations); keep each tile as a read-only link with
> the "—" fallback; keep the Management Visibility and Executive Reports shortcut groups (tidied);
> keep the governance rules card. Include the loading skeleton.
>
> Visual: white/off-white cards, restrained red for critical only, generous spacing, tabular-nums,
> obviously read-only, no dark panels, no playful UI. Desktop 1440px primary + tablet stack. Output:
> both versions, design rationale, component breakdown (PageHeader+ReadOnlyBadge, HeadlineStrip,
> AttentionKpiGroup, PortfolioKpiGroup, ShortcutGroup, RoleRulesCard, Skeleton), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- Uses only the existing count queries + links; headline derived from those counts; no new data.
- **Zero mutation controls**; no admin links; no sales-target exposure.
- Graceful "—" fallback preserved; loading skeleton preserved.
- KPI links unchanged; guard unchanged (`viewer`/admin); read-only verified.

**Safe Implementation Notes:** UI only; do not add any write action, change links/guards/queries, or
expose restricted data; reuse existing components; no fabricated data.

---

### Pages 2–6 (condensed)

- **Control Tower (read-only)** — see `operations_manager.md` §4; for viewer it is strictly read-
  only (no export-driven actions beyond the existing CSV, no admin controls).
- **Executive / Health / SLA / Data Quality / Issues reports** — read-only analytics. *Prompt (per
  page):* "Current + Improved of a read-only {executive | health-scores | SLA | data-quality |
  issues} report; clear KPI summary + tables; preserve calculations; no mutation; obviously read-
  only."
- **Reports Hub (`/reports`)** — see `operations_manager.md` (role-filtered; viewer sees its subset).
- **Portfolio reads (`/projects`, `/hot-projects`, `/quotations`, `/receivables`, …)** — read-only
  versions of the sales_user pages; *reuse the `sales_user.md` prompts but strip every create/edit
  action and present as read-only.*

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates). For viewer, present them
read-only (no create/template-generate actions).
