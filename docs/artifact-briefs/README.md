# Role-Based Artifact Briefs — FT Operations Portal

This folder contains **page-by-page design briefs**, organised by user role, for use with Claude
Artifacts (or any design/prototyping tool). Each brief describes a page's **current** state and an
**improved** concept, and ships a **standalone, copy-paste Artifact prompt** so the UI can be
improved safely and systematically — **without changing business logic, routes, RLS, permissions,
or workflows.**

> **Status context:** All modules are stabilized; migrations 099 + 100 are applied & verified; DB
> blockers are resolved; current readiness is **Conditional GO** (see
> `../implementation/go-no-go-decision-matrix.md`). These briefs are **documentation only** — no app
> code is changed by this folder.

---

## What's here

| File | Purpose |
|------|---------|
| `roles/admin.md` | Admin — control, configuration, commercial controls, exception visibility |
| `roles/operations_manager.md` | Operations Manager — Control Tower + cross-module oversight |
| `roles/viewer.md` | Viewer / Management — read-only executive clarity |
| `roles/sales_user.md` | Sales User — commercial KPIs, invoicing schedule, quotations, projects |
| `roles/sales_coordinator.md` | Sales Coordinator — quotation coordination command center |
| `roles/procurement_user.md` | Procurement — PR/PO/supplier/ETA |
| `roles/store_user.md` | Store / Warehouse — receiving, custody, serials, inventory |
| `roles/factory_user.md` | Factory / Production — WO gate, production, RMR, QC handoff |
| `roles/qc_user.md` | QC / NCR / Release — inspections, NCRs, rework, release notes |
| `roles/afs_user.md` | Dubai / AFS — PN gate, delivery readiness, missing items, after-sales |
| `page-priority-matrix.md` | All pages × all roles, prioritised (P0–P3) with suggested design status |
| `artifact-generation-guide.md` | How to drive Artifacts page-by-page; reusable prompt wrapper |

Each role file follows one fixed structure: **Role Summary → Design Principles → Page Inventory
table → Pages Detail** (full template per page). Source of truth: the actual route definitions
(`src/app/App.tsx`), guards (`RequireRole`), `src/lib/roleMatrix.ts`, navigation
(`src/data/navigation.ts`), `tools/screenshots/screenshot-routes.mjs`, the page components under
`src/pages/`, and the readiness docs under `../implementation/`.

---

## How to use with Artifacts (page at a time)

1. Open the role file for the user you're designing for (start order below).
2. Find the **Pages Detail** section for the page you want to improve.
3. Copy that page's **"Artifact Prompt for This Page"** block into Claude Artifacts.
4. Artifacts returns a **Current Version** + **Improved Version** mockup, with rationale, component
   breakdown, and implementation notes.
5. Review against the page's **Development Acceptance Criteria**.
6. Only then turn the chosen design into an implementation prompt (see the artifact guide) for a
   later, separate, code PR.

**Do one page at a time.** This keeps each redesign reviewable and prevents scope creep.

## Recommended redesign order

1. `sales_user` — highest commercial value; the newly-activated invoicing schedule lives here.
2. `sales_coordinator` — quotation throughput; command-center already strong, polish further.
3. `admin` — commercial controls (`/admin/invoicing-schedule`, `/admin/sales-targets`) + console.
4. `operations_manager` — Control Tower executive clarity.
5. `viewer` — read-only management dashboard.
6. `procurement_user`
7. `store_user`
8. `factory_user`
9. `qc_user`
10. `afs_user`

## Keeping designs aligned with existing business logic

- **Do not invent workflows.** Quotation conversion, SO approval/routing, WO/PN/QC/AFS gates,
  procurement approval thresholds, and the invoicing-schedule RPCs are fixed — redesign the *view*,
  not the *rules*.
- **Do not change permissions or role access.** Each brief states the role's read/write scope; honor
  it. Admin-only commercial controls stay admin-only; the viewer dashboard stays read-only.
- **Do not introduce new data.** Use only the tables/views/functions a page already reads. Use
  realistic *placeholder* values in mockups, never fabricated metrics presented as real.
- **Preserve empty/loading/error and migration-deferred states** where they exist.

## Current Version vs Improved Version method

- **Current Version** = a faithful mockup of what the page renders today (from the brief's
  description), so reviewers can compare apples-to-apples.
- **Improved Version** = the same data, scope, and permissions, with better hierarchy, clearer
  status, tighter actions, and executive-grade polish. No new features.

## Acceptance checklist before implementation

- [ ] Improved design uses only data the page already has.
- [ ] No new mutation, route, or permission introduced.
- [ ] Role restrictions preserved (read-only stays read-only; admin-only stays admin-only).
- [ ] Empty / loading / error / migration-pending states covered.
- [ ] Status badges map to real status values.
- [ ] Layout works at 1440px desktop (and is sane on tablet).
- [ ] Visual direction matches the NAFFCO executive-SaaS tone (white/off-white cards, restrained red
      for critical only, no heavy dark panels, no playful UI).
- [ ] A separate implementation PR will carry the code change — these briefs do not.

## Turning Artifact output into an implementation prompt (later)

After you accept an Improved Version, ask Claude Code (in a **new, separate task**) to implement it,
pasting: (a) the accepted Artifact design, (b) the page's **Safe Implementation Notes**, and (c) the
**Development Acceptance Criteria**. Require build + typecheck + changed-file lint to stay green and
forbid DB/RLS/workflow/permission changes. See `artifact-generation-guide.md`.
