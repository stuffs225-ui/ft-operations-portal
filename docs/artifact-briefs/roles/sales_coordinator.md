# Sales Coordinator — Artifact Brief

## 1. Role Summary

- **Role name:** `sales_coordinator` (Sales Coordinator)
- **Operational purpose:** run the quotation coordination pipeline — receive quotation requests from
  Sales, assign/acknowledge, forward to estimation, request clarification, record the quotation
  output, and return completed quotations to Sales.
- **Expected landing route:** `/sales-coordinator`
- **Main responsibilities:** SLA-bound intake → estimation handoff → clarification → record number/
  value → return to Sales. Does **not** convert quotations to SO (that is a Sales action).
- **Permission level:** operational, write within the coordination workflow.
- **Read/write scope:** reads/updates `quotation_requests` workflow fields and coordinator remarks;
  reads quotation lines/documents.
- **Sensitive restrictions:** no `/admin/*`, no other work centers; cannot bypass the Sales or SO
  approval workflow; quotation conversion is a Sales action.
- **Modules/pages accessible:** Coordinator Dashboard, Coordinator Queue, Quotation Requests (+
  detail), Projects Reports, Sales Reports, plus shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** what breaches SLA now, what needs clarification, what is ready to return.
- **Obvious actions:** open the queue, jump to a filtered stage, open a quotation to act.
- **Hide:** admin/other-module surfaces; the Sales-only conversion action.
- **Read-only:** estimation outputs are recorded, not invented.
- **Highlight:** overdue (red), ready-to-return (green), clarification (amber).
- **Minimize:** redundant navigation (the dashboard already deep-links into the queue).
- **UX tone:** operational command center; queue-first, SLA-forward.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Coordinator Dashboard | `/sales-coordinator` | `src/pages/SalesCoordinator.tsx` | read | **P0** | Optional (polish) | Redesigned PR #144; mature |
| 2 | Coordinator Queue | `/coordinator-queue` | `src/pages/CoordinatorQueue.tsx` | read | P1 | Optional (polish) | Tabbed; `?tab=`/`?filter=` (PR #144) |
| 3 | Quotation Detail | `/quotations/:id` | `src/pages/QuotationDetail.tsx` | read/write | P1 | Yes | Coordinator action panel lives here |
| 4 | Quotation Requests (list) | `/quotations` | `src/pages/Quotations.tsx` | read | P2 | Optional | |
| 5 | Coordination / Projects Reports | `/reports/projects`, `/reports/sales` | `ReportsProjects.tsx`, `ReportsSales.tsx` | read | P2 | Optional | |
| 6 | Action Inbox / Notifications / Templates | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: Coordinator Dashboard

**Route:** `/sales-coordinator`

**Current Component / Files**
- `src/pages/SalesCoordinator.tsx`; `src/lib/quotationSla.ts` (SLA helpers:
  `getQuotationSlaStatus`, `getOverdueDays`, `isQuotationOverdue`, `getQuotationSlaDue`);
  `src/lib/roleMatrix.ts` (governance rules); shared `Card`, `Button`, `Badge`, `PageHeader`,
  `Skeleton`, `DataSourceBadge`.

**Current Page Purpose**
Operational command center for the quotation pipeline: priority-ordered work, clickable KPI tiles,
and deep links into the full queue.

**Current Version Description**
- **Header:** "Coordinator Dashboard" + reload button + role badge + DataSourceBadge.
- **Critical overdue alert** (red) when overdue > 0, with "Open Queue".
- **8 clickable KPI tiles** (New/Unprocessed, Unassigned, Need Clarification, Ready to Return,
  Assigned to Me, Waiting Estimation, Total Active, Overdue) — each deep-links to
  `/coordinator-queue?tab=…` or `?filter=…`.
- **Priority sections** (render only when non-empty, max 5 rows + "View N more"): Overdue (red),
  Need Clarification (orange), Ready to Return (green), In Intake/Processing (teal), Waiting
  Estimation (sky). Each row: quotation code, customer, SLA indicator, priority badge.
- **CTA row:** Open Coordinator Queue, All Quotation Requests, Coordination Reports.
- **Governance Rules card.**
- **Loading:** KPI + section skeletons. **All-clear** empty state.

**Current Data / Business Context**
- `quotation_requests` (active statuses) joined to requester/assigned-coordinator profiles; SLA
  derived client-side; read-only page (actions happen on the detail page).

**Current Strengths**
- Already redesigned (PR #144): urgency-ordered, deep-linked KPIs, reload, honest empty state.

**Current UX Gaps / Opportunities**
- "Assigned to Me" vs "Unassigned" relationship could be clearer (ownership lens).
- SLA indicator is per-row text; a small countdown/aging visual would scan faster.
- The five sections can stack long on a busy day; a density toggle or collapse could help.
- No at-a-glance "today's throughput" (returned today) sense.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
Refine the existing command center: a crisper SLA visual, an ownership lens (mine vs team), and a
light throughput indicator — without changing the workflow or the deep-link contract.

**Improved Version Layout Requirements**
- Keep header + reload + overdue alert + 8 clickable KPI tiles (unchanged deep-links).
- Add a small "ownership" segmented control on the KPI band (All / Mine / Unassigned) that filters
  the priority sections client-side (no new data).
- Per-row SLA: a compact aging chip (e.g., "2d overdue", "due today") with color, replacing plain
  text.
- Keep the five priority sections (only non-empty), max-5 + "View N more".
- Optional collapsed/expanded density toggle.
- Preserve loading skeletons + all-clear empty state + governance card.

**Improved Version Content Requirements**
- Section titles unchanged. Ownership control: "All / Mine / Unassigned". SLA chips: "Overdue {n}d",
  "Due today", "Due in {n}d".

**Improved Version Visual Direction**
Operational SaaS; teal accent; red for overdue only; green for ready-to-return; compact rows; no
playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version of a "Coordinator Dashboard" command center for an
> enterprise operations portal (NAFFCO, executive SaaS, teal accent). It manages a quotation
> coordination pipeline. Do not change the workflow, permissions, data, or the deep-link behaviour.
> Read-only page (actions happen on the quotation detail page).
>
> CURRENT VERSION: header with a reload button + role badge; a red "N quotations overdue" alert when
> any are overdue; eight clickable KPI tiles (New/Unprocessed, Unassigned, Need Clarification, Ready
> to Return, Assigned to Me, Waiting Estimation, Total Active, Overdue); priority sections rendered
> only when non-empty (Overdue=red, Need Clarification=orange, Ready to Return=green, In Intake/
> Processing=teal, Waiting Estimation=sky), each showing up to 5 rows (quotation code, customer, an
> SLA text indicator, a priority badge) with a "View N more" link; a CTA row (Open Queue, All
> Quotation Requests, Coordination Reports); a Governance Rules card; loading skeletons; and an
> "All clear" empty state.
>
> IMPROVED VERSION (same data + workflow + deep links): keep the eight clickable KPI tiles and the
> five priority sections, but add (1) a small ownership segmented control on the KPI band — All /
> Mine / Unassigned — that filters the sections client-side, and (2) replace the per-row SLA text
> with a compact color-coded aging chip ("Overdue {n}d", "Due today", "Due in {n}d"). Optional
> density toggle to collapse sections. Preserve loading, all-clear empty state, and the governance
> card.
>
> Visual: white/off-white cards, teal accent, red reserved for overdue, green for ready-to-return,
> compact rows, no dark panels, no playful UI, realistic placeholder data only. Desktop 1440px
> primary + a tablet stack. Output: both versions, design rationale, component breakdown (PageHeader,
> KpiTile, OwnershipToggle, PrioritySection, SlaChip, GovernanceCard, EmptyState, Skeleton),
> implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- KPI tiles keep their existing deep-link targets (`/coordinator-queue?tab=…`/`?filter=…`).
- Ownership toggle and SLA chips derive from existing fields (assignment + SLA helpers) — no new
  query/data.
- Sections render only when non-empty; max-5 + "View N more" preserved.
- Page stays read-only; governance card + empty/loading states preserved.

**Safe Implementation Notes:** UI only; do not change `quotation_requests`, SLA logic, the workflow,
RLS, or the deep-link contract.

---

### Page 3: Quotation Detail (Coordinator actions)

**Route:** `/quotations/:id`
**Current Component / Files:** `src/pages/QuotationDetail.tsx`; coordinator-role action panel
(`COORDINATOR_ROLES`); writes workflow fields via fixed handlers (mark received, send to estimation,
request clarification, save line values, return to Sales); document gates.
**Current Page Purpose:** the action surface where the coordinator advances a quotation through the
pipeline and records the estimation output.
**Current Version Description:** header summary (code, customer, status, priority); a "Coordinator
Actions" section (remarks, mark received, send to estimation w/ contact, request clarification,
enter quotation response — number + PDF + per-line unit values, return to Sales); a quotation
response block; documents; timeline. Coordinator-only blocks gated by role.
**Current Data / Business Context:** `quotation_requests` (+ lines, documents, timeline); mutating
page; status transitions guarded in DB (086).
**Current Strengths:** all coordinator actions in one place; status-aware visibility; document gates.
**Current UX Gaps / Opportunities:** the action section is long and shows many actions at once
regardless of stage; the "what's the next action" isn't a single obvious CTA; line-value entry is
dense; the return gate (must have number/value) isn't surfaced until you try.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a stage-aware action surface that foregrounds the **single next
action** for the current status while keeping all other actions available — same handlers, same
gates.
**Improved Version Layout Requirements:** a strong status header with the current stage + SLA; a
"Next action" primary card (contextual to status: Mark received / Send to estimation / Awaiting
clarification / Record quotation / Return to Sales); secondary actions in a collapsed "More actions"
area; the quotation-response entry (number, PDF, per-line values) as a tidy sub-form revealed when
relevant; documents + timeline as side panels; clear return-gate messaging.
**Improved Version Content Requirements:** next-action labels mirror the existing handler set;
return button disabled with reason until number/value present.
**Improved Version Visual Direction:** operational SaaS; teal; red only for SLA-overdue; no playful
UI.
**Artifact Prompt for This Page**
> Create a Current Version and Improved Version of a "Quotation Detail — Coordinator" page (NAFFCO
> enterprise SaaS, teal). It advances a quotation through a fixed pipeline. Do NOT change the
> workflow, handlers, status transitions, document gates, or permissions; the SO-conversion action
> is NOT available to this role. CURRENT VERSION: a header summary (code, customer, status,
> priority); a long "Coordinator Actions" panel exposing remarks, Mark Received, Send to Estimation
> (with contact), Request Clarification, Enter Quotation Response (number + PDF + per-line unit
> values), and Return to Sales — visibility varies by status; a documents section; a timeline.
> IMPROVED VERSION (same handlers + gates): a strong status header with stage + SLA; a single "Next
> action" primary card contextual to the current status; all other actions tucked into a "More
> actions" area; the quotation-response entry as a tidy sub-form shown when relevant; documents and
> timeline as side panels; the Return button disabled with a clear reason until a quotation number/
> value exists. Include loading, error, and the empty timeline state. Visual: white cards, teal,
> red only for SLA-overdue, compact, no playful UI, realistic placeholder data. Output both versions
> + rationale + component breakdown (StatusHeader, NextActionCard, MoreActions, ResponseSubform,
> DocumentsPanel, Timeline) + implementation notes.
**Development Acceptance Criteria:** identical handler set + status-gated visibility; return gated by
number/value; document gates preserved; no SO-conversion action for coordinator; mutating behavior
unchanged.
**Safe Implementation Notes:** UI only; preserve all transition guards, gates, and role visibility;
no DB/RLS/workflow change.

---

### Pages 2, 4, 5 (condensed)

- **Coordinator Queue (`/coordinator-queue`, `CoordinatorQueue.tsx`)** — mature tabbed queue (New /
  Unassigned / Mine / Estimation / Clarification / Ready / Returned / Completed / All) with quick
  filters, search, and `?tab=`/`?filter=` deep links. *Prompt:* "Current + Improved of a tabbed
  coordination queue with quick filters, search, and a status/priority/SLA table. Improved: a
  sticky tab bar with counts, clearer SLA/aging chips, and a compact density; preserve the `?tab=`/
  `?filter=` deep-link behaviour and all data; no new actions."
- **Quotation Requests list (`/quotations`)** — see sales_user brief; coordinator view emphasises
  status/SLA. *Prompt:* "Current + Improved quotation list with status summary strip + SLA badges."
- **Reports (`/reports/projects`, `/reports/sales`)** — mature; optional polish (tidy filters/tables,
  preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix for Action Inbox, Notifications, and Templates prompts
(identical for this role).
