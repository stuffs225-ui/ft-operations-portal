# Enterprise UX & Design-System Review

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Scope:** UX / design-system audit, plus the proposed Wave C plan
**Status:** Audit complete. Wave C is **DEFERRED** (not implemented in this PR).

---

## 1. What was done in this PR

Only one UX-facing primitive was added in this PR, in support of Wave A:

- **`src/components/ui/DataSourceBadge.tsx`** — a small inline badge that labels
  the data source on a page ("Live data" / "Dev mode — sample data" /
  "Preview — not yet connected"). **This WAS added.**

Everything else in this document is **audit findings and a deferred plan
(Wave C)**. No other UI components, restyling, or refactors were shipped here.

---

## 2. Audit findings

### 2.1 Component reuse is inconsistent

The app has reusable primitives (`Card`, `Badge`, `EmptyState`, etc.) but they
are applied unevenly. Several pages bypass them and hand-roll equivalent markup,
which produces visual drift and makes a future restyle expensive.

### 2.2 Badge status → variant mapping is duplicated (15+ pages)

The same "status string → badge colour/variant" logic is re-implemented inline
across **15+ pages**. There is no central mapping, so the same status can render
differently on different pages, and adding a status means editing many files.

**Recommendation (Wave C):** introduce a central
**`src/lib/statusVariants.ts`** that maps every domain status to a single badge
variant, and have all pages import from it. One status → one colour, everywhere.

### 2.3 No shared Table / DataTable component (20+ pages)

**20+ pages** hand-roll their own `<table>` markup (headers, row striping, empty
rows, alignment). This is the largest single source of inconsistency and the most
repetitive code in the UI.

**Recommendation (Wave C):** build a shared **`Table` / `DataTable`** component
(columns config, empty state, loading state, consistent density) and migrate the
hand-rolled tables onto it.

### 2.4 EmptyState is under-used

The `EmptyState` component exists but many pages either show nothing or an ad-hoc
empty message. With Wave A creating many more empty-in-live-mode states, a
consistent `EmptyState` (icon + headline + hint, plus the `DataSourceBadge`)
should become the standard.

### 2.5 Settings and AuditLog are off-pattern

`Settings` and `AuditLog` do **not** use the shared `Card`/`Badge` primitives, so
they look visually different from the rest of the app. They should be brought
onto the standard layout primitives.

### 2.6 Dashboard is not role-aware

The Dashboard shows identical content to every role (see also
`docs/ROLE_WORKSPACE_REDESIGN.md`). `ActionInbox`, by contrast, **is**
role-filtered and is the right model to follow. Role-aware landing surfaces are
covered as Wave E.

### 2.7 ProjectDetail is monolithic

`src/pages/ProjectDetail.tsx` is ~1,813 lines with 12 tabs in a single file. It
is hard to read, hard to test, and slow to change.

**Recommendation (Wave G):** split ProjectDetail into per-tab child components
with a thin container. (Tracked separately from Wave C.)

---

## 3. Wave C plan (DEFERRED — not in this PR)

The enterprise UI-system work is intentionally deferred to a follow-up PR.
Planned scope, in priority order:

1. **`src/lib/statusVariants.ts`** — central status → badge-variant mapping;
   migrate the 15+ pages off inline mappings.
2. **Shared `Table` / `DataTable`** — one component; migrate the 20+ hand-rolled
   tables.
3. **EmptyState standardisation** — adopt `EmptyState` + `DataSourceBadge`
   everywhere a list can be empty.
4. **Settings / AuditLog** — bring onto `Card`/`Badge` primitives.

> ProjectDetail split (Wave G), navigation restructure (Wave D), role workspaces
> (Wave E) and reports overhaul (Wave F) are tracked in their own documents.

---

## 4. Summary

| Item                                   | Status in this PR |
|----------------------------------------|-------------------|
| DataSourceBadge component              | **Added**         |
| Central `statusVariants.ts`            | Deferred (Wave C) |
| Shared Table / DataTable               | Deferred (Wave C) |
| EmptyState standardisation             | Deferred (Wave C) |
| Settings / AuditLog onto primitives    | Deferred (Wave C) |
| Role-aware Dashboard                   | Deferred (Wave E) |
| ProjectDetail split                    | Deferred (Wave G) |
