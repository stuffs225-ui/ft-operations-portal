# Artifact Generation Guide

How to drive Claude Artifacts (or any prototyping tool) **one page at a time** using the role
briefs in this folder, and how to convert the result into a safe implementation prompt later.

> Golden rule: **improve the UI, never the rules.** No new workflows, data, routes, permissions, or
> business logic. These briefs are documentation; redesign happens in Artifacts; implementation
> happens later in a separate, reviewed code PR.

---

## 1. Copy one page prompt into Artifacts

1. Open the relevant `roles/<role>.md` file.
2. Scroll to **Pages Detail → Page N: <name>**.
3. Copy the **"Artifact Prompt for This Page"** block verbatim. It is **standalone** — it contains
   the current description, improved requirements, visual direction, constraints, and output
   requirements, so you do not need to paste anything else.
4. Paste into Artifacts and run.

Do **one page per Artifact session** so each result is focused and reviewable.

## 2. Ask for Current + Improved

Every page prompt already asks Artifacts to produce **both**:
- a **Current Version** mockup (faithful to today's page), and
- an **Improved Version** mockup (same data/scope/permissions, better UX),
plus design rationale, component breakdown, and implementation notes. If you want them on one
canvas, add: *"Place the Current and Improved versions side by side for comparison."*

## 3. Request responsive states

Add to any prompt: *"Show the desktop (1440px) layout as primary, and include a tablet (768px)
adaptation for the main work area and any table (cards or horizontal scroll, not truncated data)."*

## 4. Request empty / loading / error states

Add: *"Include the empty state, the loading (skeleton) state, and the error state for the main data
area. If the page has a migration-deferred/unavailable state, show that too."* (The briefs note
which pages have these.)

## 5. Request a component breakdown

Add: *"List the components (with props you'd expect) so this can be implemented in React + Tailwind
+ shadcn/ui without redesigning, e.g. `<PageHeader>`, `<KpiCard>`, `<FilterBar>`, `<DataTable>`,
`<StatusBadge>`, `<EmptyState>`, `<Drawer>`."*

## 6. Avoid adding new workflows

Always keep this constraint in the prompt (the page prompts already include it):
*"Do not add features, new buttons that imply new workflows, new data, or new permissions. Keep the
exact business logic, role restrictions, and data model. Use realistic placeholder data only; never
present fabricated numbers as real metrics."*

## 7. Reusable Artifact prompt wrapper

Wrap any page brief with this when you want a single consistent instruction:

> "Using the page brief below, create a current-version mockup and an improved-version mockup. Do
> not change the workflow, permissions, data model, or business rules. Focus only on UX, layout,
> clarity, component structure, and visual hierarchy. Output the design rationale, component
> breakdown, and implementation notes. Visual direction: executive enterprise SaaS, NAFFCO-style —
> white/off-white cards, restrained red reserved for critical/overdue/blocked states only, clear
> status badges, compact but readable spacing, no heavy dark panels, no playful UI, no fake data.
> Then paste the page brief here:
> \<paste the page's brief / Artifact Prompt block\>"

## 8. Prepare the follow-up implementation prompt (later)

After you accept an Improved Version, start a **new, separate Claude Code task** with:

> "Implement the accepted Improved Version for **<page>** (`<route>`) in this repo. Paste of the
> accepted Artifact design + component breakdown below. Constraints: change UI only — do NOT change
> DB, RLS, migrations, routes, `roleMatrix`, route guards, business workflows, calculations,
> permissions, or query helpers' contracts. Reuse existing shared components
> (`PageHeader`, `KpiCard`, `Badge`, `Card`, `EmptyState`, table primitives). Preserve all
> empty/loading/error and migration-deferred states. Keep `npm run build`, `npx tsc --noEmit`, and
> changed-file lint green; do not regress the full-lint baseline. Then paste:
> (a) the accepted Artifact design, (b) the page's *Safe Implementation Notes*, (c) the page's
> *Development Acceptance Criteria*."

That keeps the implementation faithful, minimal, and safe.

---

## Quick checklist per page

- [ ] Copied the page's standalone Artifact prompt (not the whole file).
- [ ] Asked for Current + Improved (+ side-by-side if useful).
- [ ] Requested responsive + empty/loading/error (+ migration-deferred where noted) states.
- [ ] Requested component breakdown + implementation notes.
- [ ] Re-stated the "no new workflow/data/permission" constraint.
- [ ] Reviewed output against the page's **Development Acceptance Criteria**.
- [ ] Logged the decision; deferred code to a separate implementation PR.
