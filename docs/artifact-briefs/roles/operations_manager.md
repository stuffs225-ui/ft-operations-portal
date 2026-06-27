# Operations Manager — Artifact Brief

## 1. Role Summary

- **Role name:** `operations_manager` (Operations Manager / COO)
- **Operational purpose:** cross-functional oversight — monitor blockers, approvals, gate violations,
  delivery risks, and SLA breaches across Sales, Procurement, Store, Factory, QC, and AFS; approve
  high-value items; escalate.
- **Expected landing route:** `/control-tower`
- **Main responsibilities:** Control Tower monitoring; approve high-value POs / SO approvals; review
  reports; oversee module health without performing day-to-day execution.
- **Permission level:** management; broad read across modules + approval authority.
- **Read/write scope:** reads almost all module pages (monitoring); approves where governance allows;
  cannot reach admin-only configuration (`/admin/*`, `/settings`, `/audit-log`,
  `/admin/invoicing-schedule`, `/admin/sales-targets`).
- **Sensitive restrictions:** monitor gates, don't override them; admin configuration is off-limits.
- **Modules/pages accessible:** Control Tower, all module dashboards/lists (read), reports,
  management dashboard, approvals, plus shared Inbox/Notifications/Templates. (109 routes.)

## 2. Design Principles for This Role

- **See first:** today's exceptions — blocked releases, overdue deliveries, pending approvals,
  missing requirements, SLA breaches — across all modules.
- **Obvious actions:** drill into a module exception; approve a pending high-value item; export.
- **Hide:** admin configuration; day-to-day execution controls (monitor, don't operate).
- **Read-only vs write:** mostly read/monitor; approvals where allowed.
- **Highlight:** critical exceptions (red) and delivery risk; SLA breaches.
- **Minimize:** per-module detail noise — summarise, then link to the module.
- **UX tone:** executive control room; exception-first, cross-module, calm.

## 3. Page Inventory

> Ops Manager reaches 109 routes (everything except admin-only config). Below: the **ops-unique**
> page (Control Tower, full detail) + the module/report pages (cross-referenced to owning-role
> briefs). On module pages, ops sees the owning role's view in a monitoring capacity.

| # | Page | Route | Component | Priority | Artifact | Detail location |
|---|------|-------|-----------|----------|----------|-----------------|
| 1 | Operations Control Tower | `/control-tower` | `src/pages/ControlTower.tsx` | **P0** | Yes | §4 here |
| 2 | Reports Hub | `/reports` | `src/pages/Reports.tsx` | P1 | Optional | §4 (condensed) |
| 3 | Reports — Executive / Health / SLA / Data Quality | `/reports/executive`, `/reports/health-scores`, `/reports/sla`, `/reports/data-quality` | report pages | P2 | Optional | §4 (condensed) |
| 4 | Admin Approvals | `/admin-approvals` | `src/pages/AdminApprovals.tsx` | P1 | Optional | see `admin.md` §4 |
| 5 | Sales / Coordinator / Projects | `/sales`, `/sales-coordinator`, `/projects*`, `/quotations*`, `/hot-projects*`, `/receivables` | — | mixed | — | see `sales_user.md`, `sales_coordinator.md` |
| 6 | Procurement / Store / Factory / QC / AFS | `/procurement*`, `/store*`, `/factory*`, `/qc*`, `/dubai-afs*`, `/after-sales*` | — | mixed | — | see respective role briefs |
| 7 | Module Reports | `/reports/{sales,projects,procurement,suppliers,factory,store,qc,afs,issues,capa}` | report pages | P2 | Optional | each role brief |
| 8 | Management Dashboard | `/management-dashboard` | — | P2 | — | shares viewer surface; see `viewer.md` |
| 9 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | P3 | Optional | see `sales_user.md` Shared appendix |

---

## 4. Pages Detail

### Page 1: Operations Control Tower (P0)

**Route:** `/control-tower`

**Current Component / Files**
- `src/pages/ControlTower.tsx`; `src/components/ui/PageLoader`; ~16 live `count`-exact queries across
  `projects`, `project_qc_findings`, `material_ncrs`, `release_notes`, `procurement_requests`,
  `afs_maintenance_requests`, `hot_projects`, `quotation_requests`, `project_execution_references`;
  CSV export of overdue items; severity badges.

**Current Page Purpose**
Single-pane cross-module oversight: active projects, pending approvals/receiving/production/QC,
ready-for-delivery, blocked/exception counts, overdue actions, and a "Critical Exceptions" list —
all from live data; export overdue.

**Current Version Description**
- **Header:** "Operations Control Tower" + subtitle.
- **KPI/metric cards:** cross-module counts (active projects, pending procurement, pending receiving,
  in production, pending QC, ready for delivery, blocked/exceptions, overdue actions).
- **Critical Exceptions section:** auto-computed actionable items with severity badges + an overdue
  CSV export.
- **PageLoader** while loading; guarded to ops_manager + viewer.

**Current Data / Business Context**
- Many parallel count queries; read-only; cross-module; no mutations. Guarded `operations_manager`,
  `viewer` (+admin).

**Current Strengths**
- Genuinely cross-module, all live data, exception-focused, exportable; mature.

**Current UX Gaps / Opportunities**
- The metric cards are a flat grid — no module grouping (Sales / Procurement / Store / Factory / QC /
  AFS), so the operator can't quickly see "which module is on fire".
- Critical exceptions and the KPIs are separate; an operator reconciles them mentally.
- No severity-first ordering or a single "most urgent" focal element.
- Each card links broadly; a "jump to this module's exceptions" path would be tighter.
- Dense on desktop; tablet stacks without prioritisation.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A module-grouped exception cockpit: a top "critical now" band, then per-module health rows
(KPIs + that module's exceptions + a drill link), preserving the live counts and CSV export.

**Improved Version Layout Requirements**
- **Critical-now band:** the top 3–5 highest-severity exceptions across all modules (red/amber),
  each linking to its module page.
- **Per-module health rows:** one row per module (Sales/Commercial, Procurement, Store, Factory, QC,
  Dubai/AFS, After Sales) showing that module's key counts + an exception count + a "View module"
  link. Read-only summaries from existing counts.
- **Critical Exceptions table:** keep, but severity-sorted, with the CSV export retained.
- **KPI band** retained as a compact top strip for the headline numbers.
- PageLoader + empty/error preserved; guarded read-only (no admin actions).

**Improved Version Content Requirements**
- Module row titles: "Sales / Commercial", "Procurement", "Store / Warehouse", "Factory /
  Production", "QC / NCR / Release", "Dubai / AFS", "After Sales".
- Exception phrasing mirrors the existing computed items (e.g., "Release blocked", "Overdue
  delivery", "Pending approval", "Missing requirements").

**Improved Version Visual Direction**
Executive control room; white cards on off-white; **red for critical, amber for warning**, neutral
otherwise; tabular-nums; compact; no dark panels; no playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version of an "Operations Control Tower" cross-module
> oversight page for an enterprise operations portal (NAFFCO, executive control-room SaaS). It is
> read-only monitoring for an Operations Manager (and Viewer); it must NOT expose admin-only actions
> or any module mutation; do not change the data or add features. All numbers come from live counts;
> use realistic placeholder values only.
>
> CURRENT VERSION: header "Operations Control Tower"; a flat grid of cross-module metric cards (Active
> Projects, Pending Procurement, Pending Receiving, In Production, Pending QC, Ready for Delivery,
> Blocked/Exceptions, Overdue Actions); a "Critical Exceptions" section listing auto-computed
> actionable items with severity badges and a CSV export of overdue items; a full-page loader state.
>
> IMPROVED VERSION (same counts + export, read-only): a compact KPI strip for the headline numbers; a
> top "Critical now" band showing the 3–5 highest-severity exceptions across modules, each linking to
> its module; per-module health rows (Sales/Commercial, Procurement, Store/Warehouse, Factory/
> Production, QC/NCR/Release, Dubai/AFS, After Sales) each showing that module's key counts + an
> exception count + a "View module" link; and the Critical Exceptions table kept but severity-sorted
> with the CSV export retained. Include loading and empty states.
>
> Visual: white/off-white cards, red for critical and amber for warning only, tabular-nums, compact,
> no dark panels, no playful UI. Desktop 1440px primary + tablet stack that keeps the critical band
> on top. Output: both versions, design rationale, component breakdown (PageHeader, KpiStrip,
> CriticalNowBand, ModuleHealthRow, ExceptionsTable+Export, Loader), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- Uses only the existing live count queries + exception computation + CSV export; no new query/data.
- Module grouping is presentational; counts identical to today.
- Read-only; no admin/mutation action introduced; guard unchanged (ops_manager/viewer/admin).
- PageLoader + empty/error states preserved.

**Safe Implementation Notes:** UI only; do not change queries, the exception logic, the export, RLS,
or the guard; reuse existing components; no fabricated counts.

---

### Pages 2–3 (condensed)

- **Reports Hub (`/reports`, `Reports.tsx`)** — mature role-filtered report hub (Executive, Projects
  & Sales, Operations, Suppliers, Operational Excellence, Reference); all 14 `/reports/*` targets
  exist. *Prompt:* "Current + Improved of a role-filtered Reports hub of grouped report cards.
  Improved: tighter group headers + a search/filter; preserve role gating and every card link; no
  new reports."
- **Executive / Health / SLA / Data Quality reports (`/reports/*`)** — mature read-only analytics.
  *Prompt (per page):* "Current + Improved of a read-only {executive | health-scores | SLA & delays |
  data-quality} report with clear KPI summary + tables/charts; preserve calculations + export; tidy
  filters and emphasis; no calculation change."

### Module / shared pages
For all module dashboards/lists/reports and shared pages, use the **owning-role brief** (Ops sees the
same monitoring view). See `sales_user.md`, `sales_coordinator.md`, `procurement_user.md`,
`store_user.md`, `factory_user.md`, `qc_user.md`, `afs_user.md`, and the Shared Pages Appendix in
`sales_user.md`.
