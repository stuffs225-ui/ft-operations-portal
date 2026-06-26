# Store User — Artifact Brief

## 1. Role Summary

- **Role name:** `store_user` (Store / Warehouse User)
- **Operational purpose:** run the warehouse — receive materials and vehicles, manage custody,
  register serials for medical/serialized items, hand off to QC, issue materials, and resolve
  unallocated stock.
- **Expected landing route:** `/store`
- **Main responsibilities:** receiving (with required vehicle photos + chassis), custody (Admin/Ops
  approval), serial tracking, QC handoff (don't issue QC-required items before acceptance), issuance,
  unallocated resolution.
- **Permission level:** operational write within store.
- **Read/write scope:** create/track receipts, vehicle receipts (5 photos), custody records, serials,
  issuance; reads QC-handoff status.
- **Sensitive restrictions:** vehicle acceptance needs chassis + 5 photos; custody needs Admin/Ops
  approval + receiver acceptance; QC-required materials not issued before QC acceptance; all issuance
  logged to a project.
- **Modules/pages accessible:** Store dashboard, receipts (+new, +detail), vehicle receiving (+new,
  +detail), inventory, issuance, serials, QC handoff, unallocated, custody (+new, +detail), store
  reports, plus shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** pending receiving, partial receipts, missing serials, vehicles missing photos,
  custody pending acceptance/approval, items pending QC.
- **Obvious actions:** Receive Material, Receive Vehicle, Issue Material, Register Serial.
- **Hide:** other modules; admin; QC/factory execution.
- **Read-only vs write:** QC-handoff status is read (decision is QC's); everything else is store
  write.
- **Highlight:** vehicles missing photos, missing serials, unallocated (restrained red/amber).
- **Minimize:** redundant nav (dashboard already deep-links).
- **UX tone:** warehouse operations SaaS; queue + gate-aware.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | Store Dashboard | `/store` | `src/pages/Store.tsx` | read | **P1** | Optional (polish) | Real counts + loading (PR #146) |
| 2 | QC Handoff | `/store/qc-handoff` | `src/pages/StoreQCHandoff.tsx` | read | **P1** | Yes | Pending/Accepted/Rejected tabs; reads `?status=` |
| 3 | Store Receipts | `/store/receipts` (+new, +`/:id`) | `StoreReceipts.tsx`, `StoreReceiptNew.tsx`, `StoreReceiptDetail.tsx` | read/write | P2 | Yes | Material receiving |
| 4 | Vehicle Receiving | `/store/vehicle-receiving` (+new, +`/:id`), `/vehicle-receiving` | `StoreVehicleReceiving*.tsx` | read/write | P2 | Yes | 5-photo + chassis gate |
| 5 | Store Inventory | `/store/inventory` | `StoreInventory.tsx` | read | P2 | Yes | All items + status |
| 6 | Material Issuance | `/store/issuance` | `StoreIssuance.tsx` | write | P2 | Yes | Issue to Factory/AFS/custody |
| 7 | Store Serials | `/store/serials` | `StoreSerials.tsx` | read/write | P2 | Yes | Medical/serialized register |
| 8 | Unallocated Materials | `/store/unallocated` | `StoreUnallocated.tsx` | read/write | P2 | Yes | Resolve no-project items |
| 9 | Material Custody | `/custody` (+new, +`/:id`) | custody pages | read/write | P2 | Yes | Approval + receiver acceptance |
| 10 | Store Reports | `/reports/store` | `ReportsStore.tsx` | read | P2 | Optional | |
| 11 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: Store Dashboard (P1, polish)

**Route:** `/store`

**Current Component / Files**
- `src/pages/Store.tsx`; reads `store_receipts`, `store_receipt_items`, `material_custody_records`
  (incl. `approval_status`), `material_qc_inspections` (cross-module, for QC accepted/rejected — PR
  #146), `vehicle_receipts` (+photos); `ROLE_MATRIX.store_user` rules; shared `Card`, `Badge`,
  `Button`, `PageHeader`. Loading state + real counts (PR #146).

**Current Page Purpose**
Warehouse command center: receiving/custody/serial/inventory KPIs, work queues, module navigation,
and governance rules.

**Current Version Description**
- **Header** + quick actions (Receive Material, Receive Vehicle) + role badge.
- **Top quick actions** (Receive Material, Receive Vehicle, Issue Material, Register Serial, Return
  Material).
- **8 KPI cards:** Materials Received, Pending QC, In Store, Issued/In Custody, Missing Serials,
  Vehicles Missing Photos, Unallocated, Pending Acceptance — each links to a destination; loading
  shows `…`.
- **8 work queues:** Materials Pending QC, Missing Serials, Vehicles Missing Photos, QC Accepted —
  Ready to Issue, Custody Pending Approval, Custody Pending Acceptance, Unallocated, QC Rejected /
  NCR — with critical/clear badges (now all from real data after PR #146).
- **Module navigation** grid + **Store Rules** card.
- **Loading:** KPI `…` + queue `…` badges.

**Current Data / Business Context**
- Receipts/items/custody/serials/vehicle counts; QC accepted/rejected via cross-module read; read-
  only hub (mutations on linked pages); RLS applies.

**Current Strengths**
- Real counts everywhere (no fabricated zeros after PR #146); loading state; gate-aware queues
  (photos/serials/QC); governance rules.

**Current UX Gaps / Opportunities**
- 8 KPIs + 8 queues overlap; no single urgency order; the gate-critical items (missing photos/serials,
  QC rejected) don't dominate.
- The "QC handoff" relationship (pending/accepted/rejected) is split across queues; could be one lens.
- Module nav duplicates some KPI destinations.
- Dense on tablet.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A gate-first warehouse cockpit: lead with blockers (missing photos/serials, QC rejected, custody
pending), a compact KPI band, and one ordered queue list — same real counts, same destinations.

**Improved Version Layout Requirements**
- **Blockers strip:** missing vehicle photos, missing serials, QC rejected/NCR, custody pending
  approval/acceptance — shown when > 0 (red/amber), each linking to its page.
- **Compact KPI band:** Materials Received, In Store, Pending QC, Issued/In Custody, Unallocated.
- **One priority queue list** (urgency-ordered) replacing the overlapping 8+8.
- **Module nav** kept smaller; **Store Rules** retained.
- Preserve loading `…` and real-count behaviour; `/store/qc-handoff?status=` links retained.

**Improved Version Content Requirements**
- Queue/KPI labels unchanged; counts from real data; gate language preserved ("5 photos required",
  "serial required", "QC acceptance required before issue").

**Improved Version Visual Direction**
Warehouse SaaS; cyan accent; red for photo/serial/QC blockers; amber for custody pending; tabular-
nums; compact; no playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Store / Warehouse Dashboard" for an enterprise operations
> portal (NAFFCO, warehouse operational SaaS, cyan accent). Gates are FIXED: vehicle acceptance needs
> a chassis number + all 5 required photos; custody needs Admin/Ops approval + receiver acceptance;
> QC-required materials must not be issued before QC acceptance; all issuance is logged to a project.
> Do not change these rules, the data, or permissions; all counts are live (placeholder numbers).
>
> CURRENT VERSION: header with Receive Material / Receive Vehicle actions + a role badge; a quick-
> actions row (Receive Material, Receive Vehicle, Issue Material, Register Serial, Return Material);
> eight KPI cards (Materials Received, Pending QC, In Store, Issued/In Custody, Missing Serials,
> Vehicles Missing Photos, Unallocated, Pending Acceptance), each linking somewhere, with a "…"
> loading placeholder; eight work-queue cards (Materials Pending QC, Missing Serials, Vehicles
> Missing Photos, QC Accepted — Ready to Issue, Custody Pending Approval, Custody Pending Acceptance,
> Unallocated, QC Rejected / NCR) with critical/clear badges; a module-navigation grid; a Store Rules
> card.
>
> IMPROVED VERSION (same real counts + destinations + gates): a top "blockers" strip showing
> vehicles-missing-photos, missing-serials, QC-rejected/NCR, and custody-pending (when > 0, red/
> amber, each linking to its page); a compact KPI band (Materials Received, In Store, Pending QC,
> Issued/In Custody, Unallocated); a single urgency-ordered priority-queue list replacing the
> overlapping cards; a smaller module nav; the Store Rules card kept. Preserve the "…" loading and the
> `/store/qc-handoff?status=` links.
>
> Visual: white/off-white cards, cyan accent, red for photo/serial/QC blockers, amber for custody
> pending, tabular-nums, compact, no playful UI, realistic placeholder data. Desktop 1440px + tablet
> stack (blockers on top). Output: both versions, rationale, component breakdown (PageHeader,
> QuickActions, BlockersStrip, KpiBand, PriorityQueues, ModuleNav, StoreRulesCard), implementation
> notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- All counts from existing queries (incl. the cross-module `material_qc_inspections` read); no
  fabricated zeros; loading `…` preserved.
- Blockers strip derives from existing counts; queue destinations + `?status=` links unchanged.
- Gate language preserved; read-only hub (mutations stay on linked pages).

**Safe Implementation Notes:** UI only; do not change receiving/custody/serial/QC-handoff logic,
queries, RLS, or destinations; reuse existing components; no fabricated data.

---

### Page 2: QC Handoff (P1)

**Route:** `/store/qc-handoff`
**Current Component / Files:** `src/pages/StoreQCHandoff.tsx`; reads `material_qc_inspections` (+ item/
project joins); tabs Pending / Accepted / Rejected derived from `inspection_result`; reads `?status=`;
read-only from the store side (QC performs the decision).
**Current Page Purpose:** store-side visibility of QC inspection status for received materials — what
is pending QC, accepted (ready to issue), or rejected (blocked until NCR closed).
**Current Version Description:** header + breadcrumb; an info banner ("don't issue QC-required items
before acceptance; QC is performed by QC team"); three tabs (Pending Material QC / QC Accepted / QC
Rejected-NCR) with counts; a table per tab; `?status=` sets the initial tab.
**Current Data / Business Context:** read-only mirror of QC results; mutating decisions belong to QC.
**Current Strengths:** clear three-state model; deep-linkable; correct read-only framing.
**Current UX Gaps / Opportunities:** the "ready to issue" (accepted) vs "blocked" (rejected) outcome
isn't visually weighted; no quick path from "accepted" to issuance; rejected items don't show the NCR
link prominently.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a clearer accept/reject handoff view that points accepted items toward
issuance and rejected items toward their NCR — same data, still read-only from store.
**Improved Version Layout Requirements:** keep the three tabs (+counts) and `?status=`; per-row,
surface the outcome strongly (green "Ready to issue" → link to issuance; red "Blocked — NCR" → link to
the NCR/material-QC); keep the info banner; empty/loading states.
**Improved Version Content Requirements:** tab labels unchanged; row CTAs are navigation only (no QC
decision from store).
**Improved Version Visual Direction:** warehouse SaaS; green accepted / red rejected; no playful UI.
**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "Store — QC Handoff" page (NAFFCO warehouse SaaS). It is
> READ-ONLY from the store side: QC performs the accept/reject decision; the store only views status
> and must not issue QC-required materials before acceptance. Do not change this. Data: material QC
> inspections classified as Pending / Accepted / Rejected. CURRENT VERSION: header + an info banner;
> three tabs with counts (Pending Material QC, QC Accepted, QC Rejected/NCR) whose initial tab can
> come from `?status=`; a table per tab. IMPROVED VERSION (same data, still read-only): keep the three
> tabs + counts + `?status=`; strengthen the per-row outcome — accepted rows show a green "Ready to
> issue" with a navigation link to issuance, rejected rows show a red "Blocked — NCR" with a link to
> the NCR/material-QC; keep the info banner; include empty/loading states. Visual: white cards, green
> for accepted, red for rejected, compact, no playful UI, realistic placeholder data. Output both
> versions + rationale + component breakdown (PageHeader, InfoBanner, StatusTabs, HandoffTable,
> OutcomeCell) + implementation notes.
**Development Acceptance Criteria:** three-state classification unchanged; `?status=` preserved; row
CTAs are navigation only (no QC decision from store); read-only preserved.
**Safe Implementation Notes:** UI only; do not change QC inspection logic, the read-only framing, or
data; navigation links only.

---

### Pages 3–10 (condensed)

- **Store Receipts (`/store/receipts` +new +`/:id`)** — material receiving. *Prompt:* "Current +
  Improved of a material-receiving list + receipt form + detail; preserve partial-receipt + QC-
  required handling; clearer status; same workflow."
- **Vehicle Receiving (`/store/vehicle-receiving` +new +`/:id`, `/vehicle-receiving`)** — **5-photo +
  chassis gate**. *Prompt:* "Current + Improved of vehicle receiving with a required 5-photo +
  chassis-number gate before acceptance; make the photo checklist explicit; do not weaken the gate;
  same workflow."
- **Store Inventory (`/store/inventory`)** — items + status. *Prompt:* "Current + Improved inventory
  table (item, project, qty, received qty, remaining, serial status, custody owner, status); add a
  status filter + clearer badges; same data."
- **Material Issuance (`/store/issuance`)** — issue to Factory/AFS/custody. *Prompt:* "Current +
  Improved issuance flow; preserve the 'log to a project' + 'no QC-required issue before acceptance'
  rules; clearer destination selection; same workflow."
- **Store Serials (`/store/serials`)** — medical/serialized register. *Prompt:* "Current + Improved
  serial register; highlight missing/required serials; same validation."
- **Unallocated Materials (`/store/unallocated`)** — resolve no-project items. *Prompt:* "Current +
  Improved 'unallocated materials' worklist with assign/stock/resolve actions; same workflow."
- **Material Custody (`/custody` +new +`/:id`)** — **Admin/Ops approval + receiver acceptance**.
  *Prompt:* "Current + Improved custody list + form + detail; preserve the approval + receiver-
  acceptance gates; clearer approval/acceptance status; same workflow."
- **Store Reports (`/reports/store`)** — mature; optional polish (preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates).
