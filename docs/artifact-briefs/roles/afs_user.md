# AFS User (Dubai / After Sales) — Artifact Brief

## 1. Role Summary

- **Role name:** `afs_user` (Dubai / AFS User)
- **Operational purpose:** run Dubai/AFS — PN-gated follow-ups, ETA tracking, vehicle arrival,
  missing-item resolution, pre-delivery readiness, final handover, and post-delivery after-sales
  maintenance.
- **Expected landing route:** `/dubai-afs`
- **Main responsibilities:** PN gate (required before Dubai follow-up + pre-delivery), ETA updates
  (reason on change), arrival reports, missing items (block pre-delivery), pre-delivery readiness, QC
  release before ready-for-delivery, after-sales maintenance (post-delivery, linked to project).
- **Permission level:** operational write within Dubai/AFS + after-sales.
- **Read/write scope:** follow-ups, ETA, arrival/condition/pre-delivery reports, missing items,
  maintenance requests; reads PN gate + QC release status.
- **Sensitive restrictions:** PN required before follow-up/pre-delivery; open missing items block
  pre-delivery; QC Release Note required before ready-for-delivery; maintenance is post-delivery.
- **Modules/pages accessible:** Dubai/AFS dashboard, AFS projects (+detail), ETA, arrival reports
  (+detail), missing items, pre-delivery reports (+detail), condition reports, PN gate, ready-for-
  delivery, AFS materials, After Sales dashboard + maintenance (+new, +detail), AFS reports, plus
  shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** missing PN (blocks follow-up), delayed ETAs, open missing items (block delivery),
  not-ready vs ready-for-delivery, open maintenance.
- **Obvious actions:** Update ETA, Register Arrival, Add Missing Item, Pre-Delivery Check, New
  Maintenance Request.
- **Hide:** other modules; admin; QC decisions (read the release status).
- **Read-only vs write:** PN gate + QC release are read; AFS/maintenance actions are write.
- **Highlight:** missing PN, open missing items, delayed ETA (red/amber); ready-for-delivery (green).
- **Minimize:** redundant nav (dashboard deep-links).
- **UX tone:** logistics/delivery operations SaaS; gate + readiness-aware.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Dubai / AFS Dashboard | `/dubai-afs` | `src/pages/DubaiAFS.tsx` | read | **P1** | Optional (polish) | Real KPIs + PN-gate alert |
| 2 | After Sales Dashboard | `/after-sales` | `src/pages/AfterSales.tsx` | read | **P1** | Optional (polish) | KPI deep links (PR #147) |
| 3 | Maintenance Requests | `/after-sales/maintenance` (+new, +`/:id`) | `AfterSalesMaintenance*.tsx` | read/write | P2 | Optional | Tabbed; reads `?tab=` |
| 4 | AFS Missing Items | `/dubai-afs/missing-items` | `DubaiAfsMissingItems.tsx` | read/write | P2 | Yes | Blocks pre-delivery |
| 5 | AFS Pre-Delivery Reports | `/dubai-afs/predelivery-reports` (+`/:id`) | `DubaiAfsPredeliveryReports*.tsx` | read/write | P2 | Yes | Readiness |
| 6 | AFS PN Gate | `/afs/pn-gate` | `AFSPnGate.tsx` | read | P1 | Optional | Gate visibility (don't change logic) |
| 7 | AFS Ready for Delivery | `/afs/ready-for-delivery` | `AFSReadyForDelivery.tsx` | read | P2 | Yes | QC release required |
| 8 | AFS Projects / ETA / Arrival / Condition / Materials | `/dubai-afs/projects`(+`/:id`), `/dubai-afs/eta`, `/dubai-afs/arrival-reports`(+`/:id`), `/dubai-afs/condition-reports`, `/afs/materials` | AFS pages | read/write | P2 | Yes | Follow-up workflow |
| 9 | AFS Reports | `/reports/afs` | `ReportsAFS.tsx` | read | P2 | Optional | |
| 10 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: Dubai / AFS Dashboard (P1, polish)

**Route:** `/dubai-afs`

**Current Component / Files**
- `src/pages/DubaiAFS.tsx`; reads via `count`-exact queries `dubai_project_followups` (missing PN,
  active, delayed ETA), `afs_arrival_reports` (pending), `afs_missing_items` (open), `afs_predelivery_
  reports` (not ready / ready), `afs_maintenance_requests` (open); recent follow-ups list;
  `ROLE_MATRIX.afs_user` rules; `DataSourceBadge`.

**Current Page Purpose**
Dubai/AFS command center: PN readiness, follow-ups, ETA, arrivals, missing items, pre-delivery
readiness, and after-sales — across the delivery lifecycle.

**Current Version Description**
- **Header** + AFS User badge + DataSourceBadge.
- **Top actions:** Update Dubai ETA, Register Arrival, Add Missing Item, Pre-Delivery Check, New
  Maintenance Request.
- **Critical PN alert** (red) when projects miss a PN → "View PN Gate".
- **Zone A — Dubai/Pre-Delivery (8 KPI cards):** Missing PN, Active Follow-ups, Delayed ETAs, Pending
  Arrival, Open Missing Items, Not Ready for Delivery, Ready for Delivery, Open Maintenance — each
  links; `—` while loading.
- **Work queues row:** Dubai Follow-ups (recent list) + AFS Governance Rules card.
- **Zone B — After Sales:** Maintenance Requests, New Request, AFS Reports tiles.

**Current Data / Business Context**
- Lifecycle counts + recent follow-ups; read-only hub; mutations on linked pages; RLS.

**Current Strengths**
- Full lifecycle coverage; real counts; PN-gate alert; recent follow-ups; governance rules; mature.

**Current UX Gaps / Opportunities**
- 8 KPIs + two zones can feel like two dashboards stitched together; the delivery-readiness flow
  (PN → arrival → missing items → pre-delivery → ready) isn't shown as a pipeline.
- The hard blockers (missing PN, open missing items) share weight with routine counts beyond the PN
  banner.
- "Ready for delivery" (QC-release-gated) isn't a single obvious CTA.
- Dense on tablet.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A delivery-readiness cockpit: blockers on top (missing PN, open missing items, delayed ETA), a
compact lifecycle pipeline, a clear ready-for-delivery CTA, and after-sales as a secondary zone —
same counts, same gates.

**Improved Version Layout Requirements**
- Keep the PN-gate alert as the top blocker; add open-missing-items + delayed-ETA blockers when > 0.
- **Lifecycle pipeline strip:** Pending PN → In Preparation → Missing Items → Pre-Delivery → Ready →
  Delivered — each a count linking to its page (a readiness funnel from existing counts).
- **Compact KPI band** for the headline numbers.
- **Ready-for-delivery** card (QC-release-gated) as a distinct CTA.
- After-sales kept as a clearly separated secondary zone; recent follow-ups + governance retained;
  `—` loading preserved.

**Improved Version Content Requirements**
- Pipeline stage labels mirror the real lifecycle; gate language preserved ("PN required before
  follow-up/pre-delivery"; "open missing items block pre-delivery"; "QC Release Note required before
  ready-for-delivery").

**Improved Version Visual Direction**
Logistics/delivery SaaS; sky accent; red for missing-PN/missing-items; amber for delayed ETA/not-
ready; green for ready/delivered; tabular-nums; compact; no playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Dubai / AFS Dashboard" (NAFFCO logistics/delivery
> operational SaaS, sky accent). Gates are FIXED: a PN is required before Dubai follow-up and pre-
> delivery readiness; open missing items block pre-delivery; a QC Release Note is required before
> marking ready-for-delivery; after-sales maintenance is post-delivery and links to a delivered
> project. Do not change these gates, the data, or permissions; all counts are live (placeholder
> numbers).
>
> CURRENT VERSION: header + an AFS User badge; a top action row (Update Dubai ETA, Register Arrival,
> Add Missing Item, Pre-Delivery Check, New Maintenance Request); a red "missing PN" alert linking to
> the PN Gate; a "Dubai / Pre-Delivery" zone of eight KPI cards (Missing PN, Active Follow-ups,
> Delayed ETAs, Pending Arrival, Open Missing Items, Not Ready for Delivery, Ready for Delivery, Open
> Maintenance), each linking, with "—" while loading; a Dubai Follow-ups recent list + an AFS
> Governance Rules card; an "After Sales" zone with Maintenance Requests / New Request / AFS Reports
> tiles.
>
> IMPROVED VERSION (same counts + gates + destinations): keep the PN-gate alert and add open-missing-
> items + delayed-ETA blockers (when > 0) at the top; a lifecycle pipeline strip (Pending PN → In
> Preparation → Missing Items → Pre-Delivery → Ready → Delivered), each a count linking to its page; a
> compact KPI band for headline numbers; a distinct "Ready for delivery" CTA (QC-release-gated); the
> after-sales zone kept clearly separated and secondary; the recent follow-ups list + governance card
> retained; "—" loading preserved.
>
> Visual: white/off-white cards, sky accent, red for missing-PN/missing-items, amber for delayed-ETA/
> not-ready, green for ready/delivered, tabular-nums, compact, no playful UI, realistic placeholder
> data. Desktop 1440px + tablet stack (blockers + pipeline on top). Output: both versions, rationale,
> component breakdown (PageHeader, TopActions, PnGateAlert, BlockersStrip, LifecyclePipeline, KpiBand,
> ReadyForDeliveryCard, FollowupsList, GovernanceRules, AfterSalesZone), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- All counts from existing `count`-exact queries; pipeline + blockers derive from those; `—` loading
  preserved.
- PN-gate alert + gate language retained; KPI/queue destinations unchanged.
- Read-only hub (mutations on linked pages); ready-for-delivery stays QC-release-gated downstream.

**Safe Implementation Notes:** UI only; do not change the PN gate, delivery-readiness logic, after-
sales workflow, queries, or RLS; reuse existing components; no fabricated data.

---

### Page 2: After Sales Dashboard (P1, polish)

**Route:** `/after-sales`
**Current Component / Files:** `src/pages/AfterSales.tsx`; reads `afs_maintenance_requests` count
queries; `PageLoader`; 6 KPI cards deep-linking to `/after-sales/maintenance?tab=…` (PR #147); recent
requests list; governance rules.
**Current Page Purpose:** post-delivery maintenance command center — open/in-progress/parts-waiting/
critical/completed/total, with recent requests.
**Current Version Description:** header + New Request; 6 KPI cards (Open, In Progress, Parts Waiting,
Critical Priority, Completed, Total) deep-linking to maintenance tabs ("Parts Waiting" → in_progress
superset); recent requests card with priority/status badges; governance rules.
**Current Data / Business Context:** `afs_maintenance_requests`; read-only hub; mutations on the
maintenance pages; RLS.
**Current Strengths:** real counts; KPI cards deep-link to the matching tab (PR #147); recent list.
**Current UX Gaps / Opportunities:** no SLA/overdue lens (which requests are aging); "Parts Waiting"
maps to the in_progress tab (documented superset) — could be clearer; priority not summarised.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** an aging-aware maintenance cockpit that keeps the deep-link KPIs and
adds an overdue/priority lens — same data, same tabs.
**Improved Version Layout Requirements:** keep the 6 deep-linking KPI cards; add an "aging/overdue"
chip and a priority summary; recent requests with clearer priority/status + days-open; governance
retained; loading state.
**Improved Version Content Requirements:** KPI labels unchanged; "Parts Waiting" note that it filters
the In Progress tab; days-open per recent row.
**Improved Version Visual Direction:** delivery/service SaaS; sky/purple; red for critical/overdue; no
playful UI.
**Artifact Prompt for This Page**
> Create a Current + Improved Version of an "After Sales Maintenance Dashboard" (NAFFCO service SaaS).
> Post-delivery maintenance; KPI cards deep-link to a maintenance list's tabs (Open, In Progress,
> Critical, Completed, All); "Parts Waiting" links to the In Progress tab (a correct superset). Do not
> change the data, tabs, or permissions. CURRENT VERSION: header + New Request; six KPI cards (Open,
> In Progress, Parts Waiting, Critical Priority, Completed, Total) that deep-link to the matching tab;
> a recent-requests list with priority/status badges; a governance rules card; a page loader.
> IMPROVED VERSION (same data + deep links): keep the six deep-linking KPI cards; add an aging/overdue
> chip and a small priority summary; show days-open per recent request with clearer priority/status;
> keep governance + loading. Visual: white cards, red for critical/overdue, compact, no playful UI,
> realistic placeholder data. Output both versions + rationale + component breakdown (PageHeader,
> KpiDeepLinkCards, AgingChip, RecentRequests, GovernanceRules, PageLoader) + implementation notes.
**Development Acceptance Criteria:** KPI deep-link targets unchanged (`?tab=`); aging/priority derive
from existing data; recent list unchanged in data; read-only hub.
**Safe Implementation Notes:** UI only; do not change maintenance workflow, the deep-link contract,
queries, or RLS.

---

### Pages 3–9 (condensed)

- **Maintenance Requests (`/after-sales/maintenance` +new +`/:id`)** — mature tabbed list (Open /
  Critical / In Progress / Completed / Closed / All), reads `?tab=`. *Prompt:* "Current + Improved of
  a maintenance-requests tabbed list (+counts) + new + detail; preserve `?tab=`, the link-to-project
  requirement, and resolution-notes-to-close; clearer SLA/priority; same workflow."
- **AFS Missing Items (`/dubai-afs/missing-items`)** — **blocks pre-delivery**. *Prompt:* "Current +
  Improved of an AFS missing-items worklist; make 'open items block pre-delivery' explicit; same
  workflow."
- **AFS Pre-Delivery Reports (`/dubai-afs/predelivery-reports` +`/:id`)** — readiness. *Prompt:*
  "Current + Improved of a pre-delivery readiness report; show the readiness checklist (missing items,
  QC release); preserve the gate; same workflow."
- **AFS PN Gate (`/afs/pn-gate`)** — gate visibility. *Prompt:* "Current + Improved of the AFS PN gate
  page; clearer per-project PN status; DO NOT change gate logic."
- **AFS Ready for Delivery (`/afs/ready-for-delivery`)** — **QC release required**. *Prompt:* "Current
  + Improved of a ready-for-delivery list; show the QC-release-note requirement per project; preserve
  the gate; same workflow."
- **AFS Projects / ETA / Arrival / Condition / Materials** — follow-up workflow. *Prompt (per page):*
  "Current + Improved of the AFS {projects | ETA tracking | arrival reports | condition reports |
  materials} page; preserve the PN gate + ETA reason-on-change; clearer status; same workflow."
- **AFS Reports (`/reports/afs`)** — mature; optional polish (preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates).
