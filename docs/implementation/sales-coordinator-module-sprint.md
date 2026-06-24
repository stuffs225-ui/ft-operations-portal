# Sales Coordinator Module — Workspace UX and Workflow Stabilization

**Branch:** `feature/sales-coordinator-module-sprint`
**Status:** Complete. Zero new lint/type errors. Baseline 57 problems unchanged.

---

## Scope

Stabilizes and upgrades the Sales Coordinator role workspace for operational clarity and
executive readiness. All changes are limited to the Sales Coordinator module pages.
No routes, guards, navigation entries, business logic, database, or other modules changed.

---

## Module Responsibilities (from existing implementation)

The Sales Coordinator role is responsible for the **quotation coordination pipeline**:

1. **Intake** — Receive and acknowledge quotation requests submitted by Sales (`submitted_by_sales`)
2. **Assign** — Self-assign or route requests to the correct coordinator
3. **Forward** — Send requests to the estimation team with contact recorded (`sent_to_estimation`)
4. **Track** — Monitor estimation response and follow up (`waiting_for_estimation`)
5. **Clarify** — Request missing information from Sales when scope/customer details are incomplete (`need_clarification`)
6. **Record** — Enter the quotation number, PDF, and per-line values when response arrives (`quotation_received`)
7. **Return** — Send the completed quotation back to Sales (`returned_to_sales`)

SLA rules (from `src/lib/quotationSla.ts`):
- **Coordinator pickup SLA**: 48 hours from `submitted_at`
- **Estimation response SLA**: 120 hours from `sent_to_estimation_at`
- **Clarification response SLA**: 48 hours from `updated_at` when in `need_clarification`

Actions (mark received, send to estimation, request clarification, enter response, return to Sales)
are performed in **`QuotationDetail.tsx`** — not changed in this sprint.

---

## Files Changed

### `src/pages/SalesCoordinator.tsx` — Full Redesign
**Before:** Static KPI tiles, 5-button action row, 7-section accordion queue (2-column), bottom quick-links card.  
**After:** Operational command center — clickable KPI tiles, priority-ordered sections, single CTA row.

Key changes:
- **Removed**: `QuotationRow` component, `QueueSection` component (accordion layout)
- **Removed**: 5-button "Top actions" row (redundant with KPI deep links)
- **Removed**: Bottom "Quick Access" card (redundant)
- **Added**: `reloadKey` state + reload button (spinner on load) in header actions
- **Added**: KPI tiles are now `<Link>` components pointing to specific queue tabs/filters:
  - New / Unprocessed → `/coordinator-queue`
  - Unassigned → `/coordinator-queue?filter=unassigned`
  - Need Clarification → `/coordinator-queue?filter=clarification`
  - Ready to Return → `/coordinator-queue?filter=ready`
  - Assigned to Me → `/coordinator-queue?tab=mine`
  - Waiting Estimation → `/coordinator-queue?tab=estimation`
  - Total Active → `/coordinator-queue?tab=all`
  - Overdue → `/coordinator-queue?filter=overdue`
- **Added**: `PriorityRow` component — compact row with SLA indicator (days overdue or due date) and priority badge
- **Added**: `PrioritySection` component — shows up to 5 items per group, "View N more →" link to full queue
- **Added**: Priority-ordered sections (rendered only when non-empty):
  1. **Overdue — SLA Breached** (red accent) → `/coordinator-queue?filter=overdue`
  2. **Need Clarification from Sales** (orange accent) → `/coordinator-queue?filter=clarification`
  3. **Ready to Return to Sales** (green accent) → `/coordinator-queue?filter=ready`
  4. **In Intake / Processing** (teal accent) — `submitted_by_sales` + `received_by_coordinator`
  5. **Waiting for Estimation Response** (sky accent) → `/coordinator-queue?tab=estimation`
- **Added**: "All clear" empty state (`CheckCircle2`) when no active quotations
- **Kept**: Governance Rules card (unchanged)
- **Kept**: Same Supabase query and mock data fallback
- **Kept**: `canView` guard (admin / ops_manager / sales_coordinator)
- **Fixed**: `setLoading(true)` moved inside `run()` function (not in effect body) to satisfy `react-hooks/set-state-in-effect` rule

### `src/pages/CoordinatorQueue.tsx` — Minor Enhancement
Adds `?tab=` URL param support so dashboard KPI tiles can deep-link to specific queue tabs:

```tsx
const urlTab    = searchParams.get('tab') as QueueTab | null;
const urlFilter = searchParams.get('filter') as QuickFilter | null;
const initialTab: QueueTab = (() => {
  if (urlTab && QUEUE_TABS.some(t => t.key === urlTab)) return urlTab;
  if (urlFilter === 'unassigned') return 'unassigned';
  // ... existing filter logic
})();
```

Valid `?tab=` values: `new | unassigned | mine | estimation | clarification | ready | returned | completed | all`.
Invalid values are ignored and fall through to the default `'new'` tab.

---

## UX/IA Improvements

| Before | After |
|--------|-------|
| KPI tiles: static, not clickable | KPI tiles: `<Link>` to specific queue tab/filter |
| 5-button top action row | Single "Open Coordinator Queue" + "All Quotations" + "Reports" row |
| 7 equal-weight accordion sections (2-column) | Priority-ordered sections (only non-empty rendered) |
| Bottom "Quick Access" card (redundant) | Removed — CTAs consolidated at top |
| No reload mechanism | Reload button with spinner in header |
| All queue stages visible at once | Urgency hierarchy: Overdue → Clarification → Ready → Intake → Estimation |
| No SLA time in dashboard rows | SLA indicator (overdue days or due date) on each PriorityRow |

---

## Safety Review

| Area | Changed? |
|------|----------|
| Supabase migrations applied | No |
| Production DB / RLS | No |
| Business workflows (mark received, send to estimation, return to sales) | No |
| `QuotationDetail.tsx` coordinator actions | No |
| `Quotations.tsx` | No |
| Routes | No |
| `RequireRole` guards | No |
| `roleMatrix` | No |
| Navigation entries | No |
| `quotationSla.ts` | No |
| Other modules (Procurement, Store, Factory, QC, AFS, After Sales, Reports, Viewer, Control Tower) | No |
| `App.tsx` | No |

---

## Validation

- `npm run build` — zero TypeScript errors; `SalesCoordinator` and `CoordinatorQueue` chunks emitted ✓
- `npx tsc --noEmit` — clean ✓
- Changed-file lint (`SalesCoordinator.tsx`, `CoordinatorQueue.tsx`) — zero issues ✓
- Full lint — 57 problems (22 errors, 35 warnings); identical to baseline; zero regressions ✓
  (The 22 errors are pre-existing `Views: {}` empty-object-type entries in `database.ts`)
