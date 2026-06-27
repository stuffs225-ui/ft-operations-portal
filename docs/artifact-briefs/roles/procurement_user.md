# Procurement User — Artifact Brief

## 1. Role Summary

- **Role name:** `procurement_user` (Procurement User)
- **Operational purpose:** run procurement — register PRs, create supplier POs, manage approvals
  (>SAR 10,000 needs Admin/Ops), track ETAs, and maintain the approved-supplier register.
- **Expected landing route:** `/procurement`
- **Main responsibilities:** PR intake → link items to POs → supplier ordering (with approval gate) →
  ETA tracking → handoff to Store receiving.
- **Permission level:** operational write within procurement.
- **Read/write scope:** create/track PRs and POs, suppliers, ETA updates; approval authority is
  gated (high-value POs require Admin/Ops approval).
- **Sensitive restrictions:** cannot self-approve high-value POs; supplier must be on the approved
  register before a PO; no other module's work center; no admin config.
- **Modules/pages accessible:** Procurement dashboard, PRs (+new, +detail), POs (+new, +detail),
  PR-items-without-PO, Suppliers (+detail), ETA history, Procurement/Supplier reports, plus shared
  Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** what needs action — new PRs, items without a PO, POs pending approval, delayed ETAs.
- **Obvious actions:** Register PR, Create PO, track ETA, review suppliers.
- **Hide:** approval *power* for high-value POs at the procurement level (request, don't grant);
  other modules; admin.
- **Read-only vs write:** cost values gated by role; approval status visible, not self-grantable.
- **Highlight:** PO pending approval, delayed ETA, items without PO (restrained red/amber).
- **Minimize:** redundant navigation (dashboard already deep-links to filtered lists).
- **UX tone:** operational procurement SaaS; queue + approval-aware.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Procurement Dashboard | `/procurement` | `src/pages/Procurement.tsx` | read | **P1** | Optional (polish) | Mature; real-data KPIs + queues; `?status=` deep links |
| 2 | Purchase Orders | `/procurement/purchase-orders` | `src/pages/ProcurementPurchaseOrders.tsx` | read/write | **P1** | Yes | High-value approval visibility; reads `?status=` (PR #145) |
| 3 | Purchase Requests | `/procurement/requests` | `src/pages/ProcurementRequests.tsx` | read/write | P1 | Yes | Reads `?status=` |
| 4 | Suppliers | `/procurement/suppliers` | `src/pages/ProcurementSuppliers.tsx` | read/write | P1 | Yes | Reads `?status=`; approved register |
| 5 | PR Items Without PO | `/procurement/pr-items-without-po` | `src/pages/ProcurementPrItemsWithoutPo.tsx` | read | P2 | Yes | Action queue |
| 6 | ETA History | `/procurement/eta-history` | `src/pages/ProcurementEtaHistory.tsx` | read/write | P2 | Yes | ETA tracking |
| 7 | New PR / New PO | `/procurement/requests/new`, `/procurement/purchase-orders/new` | `ProcurementRequestNew.tsx`, `ProcurementPurchaseOrderNew.tsx` | write | P2 | Optional | Forms |
| 8 | PR / PO / Supplier Detail | `/procurement/requests/:id`, `/procurement/purchase-orders/:id`, `/procurement/suppliers/:id` | detail pages | read/write | P2 | Needs Screenshot First | Dense detail |
| 9 | Procurement / Supplier Reports | `/reports/procurement`, `/reports/suppliers` | report pages | read | P2 | Optional | |
| 10 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 2: Purchase Orders (P1)

**Route:** `/procurement/purchase-orders`

**Current Component / Files**
- `src/pages/ProcurementPurchaseOrders.tsx`; reads `purchase_orders_to_supplier` joined to projects;
  cost-visibility gating (`COST_VISIBLE_ROLES`); `?status=` deep-link support (PR #145); shared
  `Card`, `Badge`, `EmptyState`, `Skeleton`, `PageHeader`. Approval guard in DB (061/093).

**Current Page Purpose**
List/track all supplier POs with status, approval state, value, and ETA; the place to see which POs
need approval and which are delayed. Creating a PO is a separate page; **approval of >SAR 10,000 is
performed by Admin/Ops, not here.**

**Current Version Description**
- **Header** + "Create PO" (if allowed) + governance subtitle (>SAR 10,000 needs approval).
- **Cost-hidden notice** when the role can't see cost.
- **Search** + **status tabs** (All, Draft, Pending Approval, Approved, Sent to Supplier, In Transit,
  Partially Received, Received, Delayed, Cancelled) — initial tab honors `?status=`.
- **Table:** PO Number, Project, Supplier, Value (gated), Currency, Status (badge), Approval
  ("Needs Approval"/approved/rejected), ETA, Actions; row click → PO detail.
- **Empty/loading** states.

**Current Data / Business Context**
- `purchase_orders_to_supplier` (+ project join); read/track; approval status reflects the DB gate;
  RLS applies. Cost values gated by role.

**Current Strengths**
- Clear status model; approval column makes the gate visible; deep-linkable; cost-gating respected.

**Current UX Gaps / Opportunities**
- Status tabs have no counts — operator can't see where the volume/risk is.
- "Needs Approval" and "Delayed" are columns, not a prioritised lens; a procurement user must scan.
- Value column gating is correct but the high-value (>SAR 10k) threshold isn't visually flagged on
  the rows that trigger it.
- Wide table on tablet; no row drawer for ETA/approval context.
- The relationship to "PR items without PO" isn't surfaced here.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A status-aware PO worklist that foregrounds "needs approval" and "delayed", flags the >SAR 10k
threshold, and shows tab counts — same data, same approval gate (request, not grant).

**Improved Version Layout Requirements**
- **Status tabs with counts**; default honors `?status=` deep link.
- **Priority lenses** above the table: "Pending Approval (N)" and "Delayed (N)" quick filters.
- **Table:** PO Number, Project/Customer, Supplier, Value (gated; >SAR 10k gets a small "approval"
  flag), Status badge, Approval badge, ETA; a row drawer for approval context + ETA history link.
- Preserve the cost-hidden notice, empty/loading states, and `?status=` behaviour.
- **No self-approval** control for high-value POs at this role.

**Improved Version Content Requirements**
- Threshold flag: a subtle "≥ SAR 10k — needs approval" marker on qualifying rows. Tab counts from
  loaded data. Approval badges: "Needs Approval" / "Approved" / "Rejected".

**Improved Version Visual Direction**
Procurement SaaS; amber for pending approval, red for delayed, green for approved/received;
tabular-nums money; compact; no playful UI; no fabricated data.

**Artifact Prompt for This Page**
> Create a Current Version and an Improved Version of a "Purchase Orders (to Supplier)" list for an
> enterprise procurement module (NAFFCO, operational SaaS). Business rules are FIXED: a PO above SAR
> 10,000 requires Admin/Operations approval before it is sent — the procurement user can SEE the
> approval status but cannot grant it; suppliers must be on the approved register; cost values are
> hidden for roles without cost visibility. Do not change these rules, the statuses, or permissions.
>
> CURRENT VERSION: header with a "Create PO" action and a governance subtitle; a notice when cost is
> hidden; a search box; status tabs (All, Draft, Pending Approval, Approved, Sent to Supplier, In
> Transit, Partially Received, Received, Delayed, Cancelled) whose initial tab can come from a URL
> `?status=`; a table (PO Number, Project, Supplier, Value [hidden for some roles], Currency, Status
> badge, Approval ["Needs Approval"/approved/rejected], ETA, Actions) with clickable rows; empty and
> loading states.
>
> IMPROVED VERSION (same data + rules + deep-link): status tabs that show counts; quick "Pending
> Approval (N)" and "Delayed (N)" lenses above the table; a table (PO Number, Project/Customer,
> Supplier, Value [gated, with a subtle "≥ SAR 10k — needs approval" flag on qualifying rows], Status
> badge, Approval badge, ETA) with a row drawer for approval context + an ETA-history link; keep the
> cost-hidden notice, empty/loading states, and the `?status=` behaviour; NO self-approval control
> for high-value POs.
>
> Visual: white cards, amber for pending approval, red for delayed, green for approved/received,
> tabular-nums money, compact, no playful UI, realistic placeholder data. Desktop 1440px + tablet
> (frozen PO/Project column, horizontal scroll). Output: both versions, rationale, component
> breakdown (PageHeader, CostHiddenNotice, StatusTabs+counts, PriorityLenses, POTable, RowDrawer,
> ApprovalBadge, EmptyState), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- Reads only `purchase_orders_to_supplier` (+ join); tab counts + lenses derive from loaded rows.
- Cost gating preserved; high-value flag is presentational (threshold display only).
- Approval remains view-only for this role; `?status=` deep link preserved; statuses unchanged.
- Empty/loading states preserved.

**Safe Implementation Notes:** UI only; do not change the approval gate/threshold, supplier-register
rule, PO statuses, RLS, cost-gating, or mutations.

---

### Page 1: Procurement Dashboard (P1, polish)

**Route:** `/procurement`
**Current Component / Files:** `src/pages/Procurement.tsx`; real-data count KPIs (PRs, items without
PO, PO pending approval, sent-to-supplier, delayed ETA, in-transit, suppliers-for-review, ready-for-
store); 8 work-queue cards; module nav; governance banner; `?status=` deep links to lists.
**Current Page Purpose:** procurement command center — KPIs, work queues, module navigation,
governance reminders.
**Current Version Description:** header + role/dev badges; amber governance banner (>SAR 10k rule);
top action bar (Register PR, Create PO, ETA Tracking, Suppliers); 8 KPI cards (each links to a
filtered list); 8 work-queue cards (Action/Clear badges); module navigation grid.
**Current Data / Business Context:** parallel count queries; read-only hub; mutations happen on the
linked pages.
**Current Strengths:** mature, real-data, deep-linked; governance visible; no fake counts.
**Current UX Gaps / Opportunities:** KPI strip (8) + work queues (8) + module grid overlap in meaning
(some duplication); no single "today's priorities" focal order; governance banner is static.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a tighter command center that de-duplicates KPIs vs queues and leads
with priorities — same counts, same deep links.
**Improved Version Layout Requirements:** a compact KPI band (the 6 most decision-relevant counts); a
single "priority queues" section ordered by urgency (Pending Approval, Items Without PO, Delayed ETA,
New PRs) replacing the overlapping KPI+queue duplication; module nav kept smaller; governance banner
retained. Preserve `?status=` deep links + empty/loading.
**Improved Version Content Requirements:** queue titles mirror existing; counts from real data.
**Improved Version Visual Direction:** procurement SaaS; amber/red for approval/delay; no playful UI.
**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Procurement Dashboard" (NAFFCO operational SaaS). Do not
> change data, the >SAR 10k approval rule, or permissions; all counts are live (placeholder numbers).
> CURRENT VERSION: header + role badge; an amber governance banner (PO > SAR 10,000 needs Admin/Ops
> approval); a top action bar (Register PR, Create PO, ETA Tracking, Suppliers); eight KPI cards each
> linking to a filtered list via `?status=`; eight work-queue cards with Action/Clear badges; a
> module-navigation grid. IMPROVED VERSION (same counts + deep links): a compact KPI band of the six
> most decision-relevant counts; one urgency-ordered "priority queues" section (Pending Approval,
> Items Without PO, Delayed ETA, New PRs) that removes the KPI/queue duplication; a smaller module
> nav; the governance banner kept; preserve `?status=` deep links + empty/loading. Visual: white
> cards, amber/red for approval/delay, compact, no playful UI, realistic placeholder data. Output
> both versions + rationale + component breakdown (PageHeader, GovernanceBanner, KpiBand,
> PriorityQueues, ModuleNav) + implementation notes.
**Development Acceptance Criteria:** counts/links unchanged; de-duplication is presentational; deep
links preserved; governance banner retained; no new actions.
**Safe Implementation Notes:** UI only; no change to queries, the approval rule, RLS, or navigation
targets.

---

### Pages 3–9 (condensed)

- **Purchase Requests (`/procurement/requests`)** — PR list; reads `?status=`. *Prompt:* "Current +
  Improved of a PR list with status tabs (+counts), search, and a table (PR ref, project, items,
  status, created); preserve `?status=`; no new actions."
- **Suppliers (`/procurement/suppliers`)** — approved register; reads `?status=`. *Prompt:* "Current
  + Improved of an approved-supplier register (name, procurement status, QC status, scorecard link)
  with a status filter; preserve the approved-register rule + `?status=`; no new powers."
- **PR Items Without PO (`/procurement/pr-items-without-po`)** — action queue. *Prompt:* "Current +
  Improved of an 'items awaiting a PO' worklist with quick link to create/link a PO; same data."
- **ETA History (`/procurement/eta-history`)** — ETA tracking. *Prompt:* "Current + Improved of an ETA
  tracking/history list (PO, supplier, ETA, change reason, status); preserve the reason-on-change
  rule; clearer delay emphasis."
- **New PR / New PO** — forms. *Prompt:* "Current + Improved of the {PR | PO} creation form; group
  fields; for PO keep the supplier-register requirement and the approval-gate messaging; same
  fields/workflow."
- **PR / PO / Supplier Detail** — dense detail (**Needs Screenshot First**). *Prompt:* "Current +
  Improved of the {PR | PO | Supplier} detail; capture the current layout from the screenshot
  baseline first; preserve all actions/gates; clearer header + status + sections."
- **Procurement / Supplier Reports** — mature; optional polish (preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates).
