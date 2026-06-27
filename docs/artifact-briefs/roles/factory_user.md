# Factory User — Artifact Brief

## 1. Role Summary

- **Role name:** `factory_user` (Factory / Production User)
- **Operational purpose:** run Saudi factory production — confirm WO before execution, manage
  requirements (BOQ/BOM/drawings/manhours), request raw materials, submit monthly progress, and hand
  off completed work to QC.
- **Expected landing route:** `/factory`
- **Main responsibilities:** WO gate (no execution before WO), requirements, RMR (linked to project +
  WO), monthly updates (on time), send-to-QC.
- **Permission level:** operational write within factory.
- **Read/write scope:** production records, requirements, RMRs, monthly updates, QC handoff; reads WO
  gate status.
- **Sensitive restrictions:** WO is mandatory before factory execution; no BOQ/BOM/drawings/manhours/
  project RMR before WO; completed work must go to QC; materials from Store must be accepted/tracked.
- **Modules/pages accessible:** Factory dashboard, projects, requirements, RMR (+new), monthly
  updates, send-to-QC, pending raw materials, WO/PN gate, factory project workspace, factory reports,
  plus shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** projects missing WO (blocked), ready-to-start, in production, waiting materials,
  monthly updates due/overdue, ready-for-QC, blocked.
- **Obvious actions:** Enter WO, Start Production, Upload Requirement, Request Raw Materials, Submit
  Monthly Update, Send to QC.
- **Hide:** other modules; admin; QC decisions.
- **Read-only vs write:** WO gate status is read (gate is governed); production actions are write.
- **Highlight:** missing WO (red, blocks execution), overdue monthly updates (red), blocked/on-hold.
- **Minimize:** redundant nav.
- **UX tone:** production operations SaaS; gate + schedule-aware.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Factory Dashboard | `/factory` | `src/pages/Factory.tsx` | read | **P1** | Optional (polish) | Real KPIs; fabricated "Requirements Missing" removed (PR #146) |
| 2 | Factory Requirements | `/factory/requirements` | `src/pages/FactoryRequirements.tsx` | read/write | **P1** | Yes | BOQ/BOM/drawings (post-WO) |
| 3 | Factory Projects | `/factory/projects` (+`/:projectId`) | `FactoryProjects.tsx`, `FactoryProjectWorkspace.tsx` | read/write | P2 | Yes | Production tracking |
| 4 | Raw Material Requests | `/factory/raw-material-requests` (+new) | `FactoryRawMaterialRequests*.tsx` | read/write | P2 | Yes | RMR (linked to project + WO) |
| 5 | Monthly Updates | `/factory/monthly-updates` | `FactoryMonthlyUpdates.tsx` | write | P2 | Yes | On-time progress |
| 6 | Send to QC | `/factory/send-to-qc` | `FactorySendToQC.tsx` | write | P2 | Yes | QC handoff queue |
| 7 | Pending Raw Materials | `/factory/pending-raw-materials` | page | read | P2 | Optional | |
| 8 | WO / PN Gate | `/wo-pn-gate` | `WoPnGate.tsx` | read | P1 | Optional | Gate visibility (don't change logic) |
| 9 | Factory Reports | `/reports/factory` | `ReportsFactory.tsx` | read | P2 | Optional | |
| 10 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: Factory Dashboard (P1, polish)

**Route:** `/factory`

**Current Component / Files**
- `src/pages/Factory.tsx`; reads `projects` (Saudi approved), `factory_records` (production_status,
  monthly_update_required, last_updated_at, wo_reference_id), `production_raw_material_requests`,
  `factory_requirements`; `DataSourceBadge`; `ROLE_MATRIX.factory_user` rules. WO-gate alert + overdue
  monthly-update alert; the fabricated "Requirements Missing" queue was removed (PR #146).

**Current Page Purpose**
Production command center: WO readiness, production status, raw-material status, monthly-update
status, and QC-handoff readiness, with gate alerts.

**Current Version Description**
- **Header** + DataSourceBadge + Factory User badge.
- **WO-gate alert** (red) when Saudi projects miss a WO; **overdue monthly-update alert** (amber).
- **Quick actions** (Enter WO, Start Production, Upload Requirement, Request Raw Materials, Submit
  Monthly Update, Send to QC).
- **7 KPI cards:** Missing WO, Ready to Start, In Production, Waiting Materials, Update Due, Update
  Overdue, Ready for QC, Blocked (left-border accents; `…` while loading).
- **Work queues (7):** Projects Missing WO, Ready to Start, Waiting Raw Materials, Monthly Updates
  Due, Updates Overdue, Ready for QC Handoff, Blocked/On Hold — with critical/warning/clear variants.
- **Module tiles** + **Factory Governance Rules** card.

**Current Data / Business Context**
- Production/WO/RMR/requirement counts; read-only hub; mutations on linked pages; RLS applies.

**Current Strengths**
- Gate-aware (WO + overdue updates as banners); real counts (no fabricated "Requirements Missing"
  after PR #146); governance rules.

**Current UX Gaps / Opportunities**
- KPIs (7) + queues (7) overlap; no single urgency order; the WO gate (the hard blocker) shares
  visual weight with routine counts beyond its banner.
- "Ready for QC" handoff readiness could be a clearer call-to-action.
- Module tiles duplicate KPI destinations.
- Dense on tablet.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A gate-first production cockpit: WO + overdue-update blockers on top, a compact KPI band, one
urgency-ordered queue list, and a clear "ready for QC" handoff — same counts, same gate logic.

**Improved Version Layout Requirements**
- Keep the WO-gate alert + overdue-update alert as the top blockers.
- **Compact KPI band:** Missing WO, In Production, Waiting Materials, Ready for QC, Blocked.
- **One priority queue list** (Missing WO → Updates Overdue → Waiting Materials → Ready for QC →
  Blocked) replacing the overlapping 7+7.
- **Ready-for-QC** as a distinct hand-off card linking to `/factory/send-to-qc`.
- Module tiles kept smaller; governance rules retained; loading `…` preserved.

**Improved Version Content Requirements**
- Labels unchanged; WO-gate language preserved ("WO required before factory execution"); counts real.

**Improved Version Visual Direction**
Production SaaS; orange accent; red for missing-WO/overdue; amber for waiting/update-due; sky for
ready-for-QC; tabular-nums; compact; no playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Factory / Production Dashboard" (NAFFCO production
> operational SaaS, orange accent). The WO gate is FIXED: a Work Order is mandatory before Saudi
> factory execution; no BOQ/BOM/drawings/manhours/project raw-material-requests before the WO;
> completed work goes to QC. Do not change the gate, data, or permissions; all counts are live
> (placeholder numbers).
>
> CURRENT VERSION: header + a Factory User badge; a red WO-gate alert when Saudi projects miss a WO; an
> amber "monthly updates overdue" alert; a quick-actions row (Enter WO, Start Production, Upload
> Requirement, Request Raw Materials, Submit Monthly Update, Send to QC); seven KPI cards (Missing
> WO, Ready to Start, In Production, Waiting Materials, Update Due, Update Overdue, Ready for QC,
> Blocked) with left-border accents and a "…" loading placeholder; seven work-queue cards (Projects
> Missing WO, Ready to Start, Waiting Raw Materials, Monthly Updates Due, Updates Overdue, Ready for
> QC Handoff, Blocked/On Hold) with critical/warning/clear badges; module tiles; a Factory Governance
> Rules card.
>
> IMPROVED VERSION (same counts + gate + destinations): keep the WO-gate and overdue-update alerts as
> top blockers; a compact KPI band (Missing WO, In Production, Waiting Materials, Ready for QC,
> Blocked); a single urgency-ordered priority-queue list (Missing WO → Updates Overdue → Waiting
> Materials → Ready for QC → Blocked) replacing the overlapping cards; a distinct "Ready for QC"
> hand-off card linking to send-to-QC; smaller module tiles; the governance rules card kept; preserve
> the "…" loading.
>
> Visual: white/off-white cards, orange accent, red for missing-WO/overdue, amber for waiting/update-
> due, sky for ready-for-QC, tabular-nums, compact, no playful UI, realistic placeholder data.
> Desktop 1440px + tablet stack (blockers on top). Output: both versions, rationale, component
> breakdown (PageHeader, WoGateAlert, OverdueUpdateAlert, QuickActions, KpiBand, PriorityQueues,
> ReadyForQcCard, ModuleTiles, GovernanceRules), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- All counts from existing queries; no fabricated "Requirements Missing" reintroduced; loading `…`
  preserved.
- WO-gate + overdue-update alerts retained; queue destinations unchanged.
- Read-only hub (mutations stay on linked pages); gate language preserved.

**Safe Implementation Notes:** UI only; do not change the WO gate, production/RMR logic, queries,
RLS, or destinations; reuse existing components; no fabricated data.

---

### Page 2: Factory Requirements (P1)

**Route:** `/factory/requirements`
**Current Component / Files:** `src/pages/FactoryRequirements.tsx`; reads/writes `factory_requirements`
(BOQ/BOM/GA drawing/detail drawings/manhours) — only valid **after** WO is issued.
**Current Page Purpose:** manage per-project production requirements (BOQ/BOM/drawings/manhours),
gated by WO.
**Current Version Description:** a list/form of requirement types per project with status (pending/
submitted), upload/record actions, and WO-gating (cannot create before WO).
**Current Data / Business Context:** `factory_requirements` linked to project + WO; mutating; RLS.
**Current Strengths:** enforces the WO gate; requirement-type structure.
**Current UX Gaps / Opportunities:** requirement completeness per project isn't summarised (which of
BOQ/BOM/GA/Detail are missing); the WO-gate block reason may not be obvious until you try; status not
strongly visualised.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a per-project requirement checklist that shows completeness at a
glance and explains the WO gate — same types, same gate.
**Improved Version Layout Requirements:** per-project requirement checklist (BOQ, BOM, GA Drawing,
Detail Drawings, Manhours) with satisfied/missing states; an explicit "WO required" lock when no WO;
upload/record actions per item; empty/loading states.
**Improved Version Content Requirements:** checklist items mirror the real requirement types; lock
text "Requires a confirmed Work Order".
**Improved Version Visual Direction:** production SaaS; green satisfied / neutral missing; red lock
when WO absent; no playful UI.
**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Factory Requirements" page (NAFFCO production SaaS). Rule:
> requirements (BOQ, BOM, GA Drawing, Detail Drawings, Manhours) can only be created/uploaded AFTER a
> Work Order is confirmed for the project. Do not change this gate, the requirement types, or
> permissions. CURRENT VERSION: a per-project list/form of requirement types with status and upload/
> record actions, blocked before WO. IMPROVED VERSION (same types + gate): a per-project requirement
> checklist showing each type as satisfied or missing, an explicit "Requires a confirmed Work Order"
> lock when no WO exists, and per-item upload/record actions; include empty/loading states. Visual:
> white cards, green satisfied / neutral missing, a red lock when WO absent, compact, no playful UI,
> realistic placeholder data. Output both versions + rationale + component breakdown (PageHeader,
> RequirementChecklist, WoGateLock, RequirementItem, UploadAction) + implementation notes.
**Development Acceptance Criteria:** requirement types + WO gate unchanged; checklist completeness
derives from existing data; create blocked before WO; mutating behavior unchanged.
**Safe Implementation Notes:** UI only; do not change the WO gate, requirement schema, RLS, or
upload logic.

---

### Pages 3–9 (condensed)

- **Factory Projects (`/factory/projects` +`/:projectId`)** — production tracking + per-project
  workspace. *Prompt:* "Current + Improved of a factory projects list + project workspace (WO status,
  production status, raw-material status, target date); clearer status + gate visibility; same data."
- **Raw Material Requests (`/factory/raw-material-requests` +new)** — RMR (linked to project + WO).
  *Prompt:* "Current + Improved of an RMR list + form; preserve the project + WO linkage requirement;
  clearer status; same workflow."
- **Monthly Updates (`/factory/monthly-updates`)** — on-time progress. *Prompt:* "Current + Improved
  of a monthly production-update list/form; highlight due/overdue; preserve the on-time requirement;
  same workflow."
- **Send to QC (`/factory/send-to-qc`)** — QC handoff queue. *Prompt:* "Current + Improved of a
  'completed production → send to QC' queue; clear hand-off action; same workflow."
- **Pending Raw Materials (`/factory/pending-raw-materials`)** — read list; optional polish.
- **WO / PN Gate (`/wo-pn-gate`)** — gate visibility (factory sees WO). *Prompt:* "Current + Improved
  of the WO/PN gate page; clearer per-project gate status; DO NOT change gate logic."
- **Factory Reports (`/reports/factory`)** — mature; optional polish (preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates).
