# Enterprise UX & Design-System Review

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Scope:** UX / design-system audit and the proposed Wave C plan.

> **Status note.** Wave C (the enterprise UI system) is **DEFERRED** to a
> follow-up PR by explicit decision. The only UI primitive added in *this* PR is
> the **`DataSourceBadge`** component (part of Wave A). Everything else below is
> an audit finding plus a recommendation, **not implemented here**.

---

## 1. What WAS done in this PR

- **`src/components/ui/DataSourceBadge.tsx`** — added (Wave A). Inline badge that
  declares whether on-screen data is live, dev-mock sample, or preview/not-yet-connected.

Nothing else in this document is implemented in this PR.

---

## 2. Audit findings

### 2.1 Badge status→variant duplication

The mapping from a domain status (e.g. `approved`, `pending`, `rejected`,
`in_progress`) to a badge colour/variant is **duplicated across 15+ pages**.
Each page hand-rolls its own switch/lookup. This drifts over time and produces
inconsistent colours for the same status across modules.

**Recommendation (Wave C):** a central `src/lib/statusVariants.ts` exporting a
single status→variant map (and small helpers per domain where statuses overlap),
consumed by every `Badge`.

### 2.2 No shared Table / DataTable component

**20+ pages hand-roll their own `<table>`** markup (headers, row striping,
empty-state, sorting). There is no shared `Table`/`DataTable` primitive, so
spacing, empty states, and responsive behaviour are inconsistent.

**Recommendation (Wave C):** a shared `DataTable` component (columns config,
built-in empty state, consistent density) to replace the hand-rolled tables.

### 2.3 EmptyState under-used

An `EmptyState` component exists but is inconsistently applied. Several pages
render a bare "no data" string or nothing at all. Now that Wave A makes
empty-in-live-mode the common case, a consistent empty state matters more.

**Recommendation (Wave C):** adopt `EmptyState` everywhere a list can be empty,
including the 25 Wave A pages.

### 2.4 Settings & AuditLog inconsistency

`Settings` and `AuditLog` do **not** use the shared `Card` / `Badge` primitives;
they render ad-hoc layout. They look visibly different from the rest of the app.

**Recommendation (Wave C):** refactor both onto `Card`/`Badge`.

### 2.5 ProjectDetail monolith

`ProjectDetail.tsx` is **1,813 lines** with **12 tabs** in a single component.
It mixes data fetching, cost logic, and per-tab UI. It is hard to maintain and
is the largest single contributor to the bundle for its route.

**Recommendation (Wave C / dedicated split wave):** break each tab into its own
lazy-loaded sub-component; lift shared fetch into a hook.

### 2.6 Repeated `isSupabaseConfigured` branching

~27 pages repeat the same `isSupabaseConfigured ? query : mock` branching.

**Recommendation (Wave C):** a `useSupabaseQuery` hook that encapsulates the
mode branching, loading, and error handling. (Also referenced in the
security/architecture review.)

---

## 3. Deferred — Wave C summary

| Item | Status |
|------|--------|
| Central `src/lib/statusVariants.ts` | DEFERRED |
| Shared `DataTable` component | DEFERRED |
| Consistent `EmptyState` adoption | DEFERRED |
| Settings / AuditLog onto Card/Badge | DEFERRED |
| ProjectDetail tab split | DEFERRED |
| `useSupabaseQuery` hook | DEFERRED |
| `DataSourceBadge` | **DONE (Wave A)** |

See `docs/PRE_PILOT_READINESS_REVIEW.md` for how these deferrals affect pilot
readiness.
