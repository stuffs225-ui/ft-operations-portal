# QC User — Artifact Brief

## 1. Role Summary

- **Role name:** `qc_user` (QC / NCR / Release User)
- **Operational purpose:** quality control — inspect store-received materials and factory-completed
  projects/vehicles, raise/close NCRs and findings, manage rework, and issue release notes only when
  all checks pass.
- **Expected landing route:** `/qc`
- **Main responsibilities:** material QC, project/vehicle QC, NCRs (root cause + corrective action),
  findings/rework, release-note gate (no release while NCRs/findings/rework open).
- **Permission level:** operational write within QC.
- **Read/write scope:** inspections, NCRs, findings, rework, release notes; reads upstream store/
  factory handoff.
- **Sensitive restrictions:** open NCRs block release; project/vehicle QC must reach
  ready_for_release before a release note; all findings/rework closed before release.
- **Modules/pages accessible:** QC dashboard, work queue, rework, material QC (+inspections, +NCRs,
  +detail), project QC (+inspections, +findings, +release-notes, +detail), QC/Issues/CAPA reports,
  plus shared Inbox/Notifications/Templates.

## 2. Design Principles for This Role

- **See first:** pending inspections, open NCRs/findings, rework pending, release-blocked, ready-for-
  release.
- **Obvious actions:** Start Material Inspection, Start Project QC, review NCRs/findings/rework, issue
  release note (when allowed).
- **Hide:** other modules; admin; the release action when the gate is not met.
- **Read-only vs write:** upstream handoff is read; QC decisions are write.
- **Highlight:** open NCRs and release-blocked (red); rework pending (amber); ready-for-release (green).
- **Minimize:** redundant nav (dashboard deep-links to queues).
- **UX tone:** quality/compliance SaaS; gate + evidence-aware.

## 3. Page Inventory

| # | Page | Route | Component | Access | Priority | Artifact | Notes |
|---|------|-------|-----------|--------|----------|----------|-------|
| 1 | QC Dashboard | `/qc` | `src/pages/QC.tsx` | read | **P1** | Optional (polish) | Fully real-data; skeletons |
| 2 | QC Release Notes | `/project-qc/release-notes` (+`/:id`) | `ProjectQcReleaseNotes.tsx`, `…Detail` | read/write | **P1** | Yes | Release gate readiness |
| 3 | Material NCRs | `/material-qc/ncrs` (+`/:id`) | `MaterialQcInspections.tsx`/NCR pages | read/write | P2 | Yes | NCR handling |
| 4 | QC Rework | `/qc/rework` | `QCRework.tsx` | read/write | P2 | Yes | Rework tracking |
| 5 | QC Findings | `/project-qc/findings` (+`/:id`) | `ProjectQcFindings.tsx`, `…Detail` | read/write | P2 | Yes | Findings |
| 6 | Material QC (+inspections, +detail) | `/material-qc`, `/material-qc/inspections` (+`/:id`) | `MaterialQC.tsx`, `MaterialQcInspections.tsx`, `…Detail` | read/write | P2 | Yes | Material inspection |
| 7 | Project QC (+inspections, +detail) | `/project-qc`, `/project-qc/inspections` (+`/:id`) | `ProjectQC.tsx`, `ProjectQcInspections.tsx`, `…Detail` | read/write | P2 | Yes | Project/vehicle inspection |
| 8 | QC Work Queue | `/qc/work-queue` | `QCWorkQueue.tsx` | read | P2 | Optional | Consolidated daily queue |
| 9 | QC / Issues / CAPA Reports | `/reports/qc`, `/reports/issues`, `/reports/capa` | report pages | read | P2 | Optional | |
| 10 | Shared (Inbox/Notifications/Templates) | `/inbox`, `/notifications`, `/templates*` | shared | read/write | P3 | Optional | See Shared appendix |

---

## 4. Pages Detail

### Page 1: QC Dashboard (P1, polish)

**Route:** `/qc`

**Current Component / Files**
- `src/pages/QC.tsx`; reads via `count`-exact queries `material_qc_inspections` (pending/in-progress),
  `project_qc_inspections` (pending, ready_for_release), `material_ncrs` (open), `project_qc_findings`
  (open, rework-required), `release_notes` (blocked); `DataSourceBadge`, `EmptyState`; loading
  skeletons.

**Current Page Purpose**
QC command center: pending material/project inspections, open NCRs/findings, rework, release-blocked,
ready-for-release — all live counts.

**Current Version Description**
- **Header** + DataSourceBadge.
- **Role/alert chips:** "QC Work Center"; "{n} Release Notes Blocked" (red); "{n} Open NCRs" (red).
- **Top actions:** Start Material Inspection, Start Project QC, NCRs, Findings, Rework, Release Notes.
- **8 KPI cards:** Pending Material QC, In Progress Inspections, Pending Project/Vehicle QC, Open
  Material NCRs, Open Findings, Rework Required, Ready for Release Note, Blocked Release Notes — each
  links; loading skeletons.
- **Work Queues** card (8 mini-queues; "Full Queue" link): Materials Waiting QC, Material In Progress,
  Open Material NCRs, Projects Pending QC, Open QC Findings, Rework Pending, Blocked Release Notes,
  Ready to Issue Release Note — with all-clear/action states.
- **Module tiles** + **QC Governance Rules** card.

**Current Data / Business Context**
- All live count queries across material/project QC, NCRs, findings, release notes; read-only hub.

**Current Strengths**
- Fully real-data (no fabricated counts); loading skeletons; alert chips for the two critical states;
  governance rules; mature.

**Current UX Gaps / Opportunities**
- 8 KPIs + 8 queues overlap; the release gate (the compliance crux) shares weight with routine counts.
- The path from "ready for release" → issue a release note isn't a single obvious CTA.
- Open NCRs/findings → rework → release relationship isn't shown as a flow.
- Dense on tablet.

**Current Screenshot Reference:** Screenshot pending — recreate from description.

**Improved Version Objective**
A gate-first quality cockpit: lead with release-blocked + open NCRs, show the inspection→NCR→rework→
release flow, and a clear ready-for-release CTA — same live counts, same release gate.

**Improved Version Layout Requirements**
- **Critical chips** retained (Release Blocked, Open NCRs) as the top blockers.
- **Compact KPI band:** Pending Material QC, Pending Project QC, Open NCRs, Rework Required, Ready for
  Release.
- **One priority queue list** (Blocked Release → Open NCRs → Open Findings → Rework Pending → Pending
  Inspection → Ready to Release) replacing the overlapping 8+8.
- **Ready-for-release** as a distinct card linking to release notes (gate enforced downstream).
- Module tiles smaller; governance rules + skeletons retained.

**Improved Version Content Requirements**
- Labels unchanged; gate language preserved ("Open NCRs block release"; "all findings/rework must
  close before release").

**Improved Version Visual Direction**
Quality/compliance SaaS; violet accent; red for blocked/open-NCR; amber for rework; green for ready-
for-release; tabular-nums; compact; no playful UI; no fabricated counts.

**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "QC / NCR / Release Dashboard" (NAFFCO quality/compliance
> SaaS, violet accent). The release gate is FIXED: open NCRs block a project's release note; project/
> vehicle QC must reach ready-for-release; all findings and rework must close before release. Do not
> change the gate, data, or permissions; all counts are live (placeholder numbers).
>
> CURRENT VERSION: header + a data-source badge; a "QC Work Center" chip and red chips "{n} Release
> Notes Blocked" and "{n} Open NCRs"; a top action row (Start Material Inspection, Start Project QC,
> NCRs, Findings, Rework, Release Notes); eight KPI cards (Pending Material QC, In Progress
> Inspections, Pending Project/Vehicle QC, Open Material NCRs, Open Findings, Rework Required, Ready
> for Release Note, Blocked Release Notes), each linking, with loading skeletons; a Work Queues card
> with eight mini-queues (and a "Full Queue" link); module tiles; a QC Governance Rules card.
>
> IMPROVED VERSION (same live counts + release gate + destinations): keep the critical chips (Release
> Blocked, Open NCRs) as top blockers; a compact KPI band (Pending Material QC, Pending Project QC,
> Open NCRs, Rework Required, Ready for Release); a single priority queue list ordered Blocked Release
> → Open NCRs → Open Findings → Rework Pending → Pending Inspection → Ready to Release (replacing the
> overlapping cards); a distinct "Ready for release" card linking to release notes (the gate is
> enforced downstream); smaller module tiles; the governance rules card and loading skeletons kept.
>
> Visual: white/off-white cards, violet accent, red for blocked/open-NCR, amber for rework, green for
> ready-for-release, tabular-nums, compact, no playful UI, realistic placeholder data. Desktop 1440px
> + tablet stack (blockers on top). Output: both versions, rationale, component breakdown
> (PageHeader, AlertChips, TopActions, KpiBand, PriorityQueues, ReadyForReleaseCard, ModuleTiles,
> GovernanceRules, Skeleton), implementation notes.

**Artifact Output Requirements:** Current, Improved, rationale, component breakdown, implementation
notes, acceptance criteria.

**Development Acceptance Criteria**
- All counts from existing `count`-exact queries; no fabricated counts; skeletons preserved.
- Critical chips + gate language retained; queue destinations unchanged.
- Read-only hub (decisions on linked pages); the release action stays gated downstream.

**Safe Implementation Notes:** UI only; do not change QC pass/fail, NCR, rework, or release-gate
logic, queries, or RLS; reuse existing components; no fabricated data.

---

### Page 2: QC Release Notes (P1)

**Route:** `/project-qc/release-notes` (+ `/:id`)
**Current Component / Files:** `src/pages/ProjectQcReleaseNotes.tsx`, `ProjectQcReleaseNoteDetail.tsx`;
reads `release_notes` + project QC state; the release gate (076) blocks issuance while NCRs/findings/
rework open or QC not ready_for_release.
**Current Page Purpose:** view release-note status per project and issue a release note only when the
gate is satisfied.
**Current Version Description:** a list of projects/release notes with status (blocked / ready /
released); a detail page showing the blocking reasons (open NCRs, open findings, rework, QC not ready)
and the issue action when allowed.
**Current Data / Business Context:** `release_notes` + QC readiness; mutating (issue) gated in DB; RLS.
**Current Strengths:** the gate is enforced; blocking reasons surfaced on detail.
**Current UX Gaps / Opportunities:** "why blocked" may require opening detail; the list doesn't
summarise the blocker mix; the ready-to-issue path isn't a single obvious CTA; released vs blocked vs
ready not strongly weighted.
**Current Screenshot Reference:** Screenshot pending — recreate from description.
**Improved Version Objective:** a release-readiness view that shows each project's blockers inline and
makes "issue when ready" obvious — same gate, same data.
**Improved Version Layout Requirements:** a list with status (Blocked / Ready / Released) and an inline
blocker summary (open NCRs / findings / rework / QC-not-ready counts) per project; a detail view that
lists the exact blockers and an Issue action enabled only when the gate passes (disabled with the
reason otherwise); empty/loading states.
**Improved Version Content Requirements:** blocker chips mirror the real gate conditions; Issue button
disabled with "Blocked by: …" until the gate passes.
**Improved Version Visual Direction:** compliance SaaS; red blocked / green ready/released; no playful
UI.
**Artifact Prompt for This Page**
> Create a Current + Improved Version of a "QC Release Notes" page (NAFFCO compliance SaaS). The
> release gate is FIXED: a release note cannot be issued while a project has open NCRs, open findings,
> or pending rework, or while project/vehicle QC has not reached ready-for-release. Do not change this
> gate, the data, or permissions. CURRENT VERSION: a list of projects/release notes with status
> (blocked/ready/released) and a detail page that shows blocking reasons and an issue action when
> allowed. IMPROVED VERSION (same gate + data): a list with status and an inline blocker summary per
> project (counts of open NCRs / findings / rework / QC-not-ready); a detail view listing the exact
> blockers with an Issue action enabled only when the gate passes (disabled with "Blocked by: …"
> otherwise); include empty/loading states. Visual: white cards, red for blocked, green for ready/
> released, compact, no playful UI, realistic placeholder data. Output both versions + rationale +
> component breakdown (ReleaseList, StatusBadge, BlockerSummary, ReleaseDetail, IssueAction) +
> implementation notes.
**Development Acceptance Criteria:** gate conditions unchanged; Issue disabled until the real gate
passes; blocker summary derives from existing QC state; mutating (issue) behavior unchanged.
**Safe Implementation Notes:** UI only; do not change the release-note gate, QC state logic, RLS, or
the issue mutation.

---

### Pages 3–9 (condensed)

- **Material NCRs (`/material-qc/ncrs` +`/:id`)** — NCR handling. *Prompt:* "Current + Improved of an
  NCR list + detail (root cause, corrective action, status); preserve the close requirements; clearer
  status + linkage to the blocked release; same workflow."
- **QC Rework (`/qc/rework`)** — rework tracking. *Prompt:* "Current + Improved of a rework list
  (requested/in-progress/pending re-inspection); clearer status; same workflow."
- **QC Findings (`/project-qc/findings` +`/:id`)** — findings. *Prompt:* "Current + Improved of a
  findings list + detail with rework linkage; same close requirements."
- **Material QC (+inspections, +detail)** — material inspection. *Prompt:* "Current + Improved of
  material inspection list + detail (result, evidence, NCR linkage); preserve pass/fail logic; clearer
  result + evidence."
- **Project QC (+inspections, +detail)** — project/vehicle inspection. *Prompt:* "Current + Improved
  of project/vehicle inspection list + detail (readiness status, findings); preserve ready-for-release
  logic; clearer readiness."
- **QC Work Queue (`/qc/work-queue`)** — consolidated daily queue. *Prompt:* "Current + Improved of a
  consolidated QC daily work queue grouped by stage; same data; clearer prioritisation."
- **QC / Issues / CAPA Reports** — mature; optional polish (preserve export).

## Shared Pages Appendix
See `sales_user.md` → Shared Pages Appendix (Inbox/Notifications/Templates).
