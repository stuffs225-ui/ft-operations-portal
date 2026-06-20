# Step 18.7F — Sales User Work Center & Commercial UX Rebuild

**Branch:** `feature/step-18-7f-sales-user-work-center`
**PR:** #115
**Status:** Merged pending Vercel green

---

## Implementation Summary

Complete rebuild of the `sales_user` experience across navigation, dashboard, pipeline, quotations, projects, receivables, and reports. Visual identity: emerald accent (`bg-emerald-600`, `text-emerald-700`, `border-emerald-600`). All changes are UI-only — no DB schema, RLS, migration, or business logic changes.

### Files Changed

| File | Change |
|------|--------|
| `src/data/navigation.ts` | Dedicated `sales_user` nav items; removed from shared admin/ops entries |
| `src/lib/roleMatrix.ts` | Updated `sales_user` governance rules |
| `src/pages/Sales.tsx` | Full rewrite — Sales Command Center |
| `src/pages/HotProjects.tsx` | Pipeline tab filters, nextAction() column, emerald accent |
| `src/pages/Quotations.tsx` | Action Required default tab, nextAction() column, emerald tabs |
| `src/pages/QuotationNew.tsx` | Helper text on key fields (no submission logic change) |
| `src/pages/Projects.tsx` | Emerald underline tabs with counts, Active/Completed tabs, role subtitle |
| `src/pages/Receivables.tsx` | Differentiated empty states |
| `src/pages/ReportsSales.tsx` | Hot Projects tab, emerald accent, Aging tab redirect |

---

## Sales Workflow Status

### Sales Sidebar
- **Status: Fixed**
- `sales_user` now sees: My Sales Dashboard, Receivables & Aging, Projects / SO, Sales Reports
- Removed from: PROJECTS section (shared with admin/ops), REPORTING section (shared)
- `buildVisibleNav()` auto-hides separators when no visible children for role

### Sales Dashboard (`Sales.tsx`)
- **Status: Rebuilt**
- 8 KPI tiles: Open Quotations, Returned to Sales (urgent), Need Clarification (urgent), Hot Projects, Approved SOs, Projects At Risk (urgent), Pending Approval, SO Drafts
- 4 work-queue cards: Action Required, Pending Approval, Projects At Risk, Draft SOs
- Commercial Pipeline Strip: Hot Projects / Invoicing Plan / Receivables
- Sales Governance Rules card (from `ROLE_MATRIX.sales_user.rules`)
- KPI detail drawer preserved for all categories
- Invoicing table hidden for `isSalesUser` — admin/ops only
- **Support status:** Derived live queries (Supabase reads, filtered by `sales_owner_id` for `sales_user`)

### Hot Projects (`HotProjects.tsx`)
- **Status: Improved**
- Tab filters: All Open / My Pipeline / Closing This Month / No Next Action / Won/Lost
- `nextAction()` derives action text from stage — not persisted
- Amber row highlight when `hasNoNextAction()`
- Won KPI: emerald accent with TrendingUp icon
- **Support status:** Existing logic preserved — reads `hot_projects` table, scoped by `sales_owner_id` for non-broad-view roles

### Quotation Requests (`Quotations.tsx`)
- **Status: Improved**
- Default tab: `action_required` (returned_to_sales + need_clarification + quotation_received)
- `quotationNextAction()` column: status-derived text, amber highlight for actionable rows
- Emerald underline tab style with count badges
- Alert banner when `actionRequired.length > 0`
- Coordinator column hidden for `sales_user`
- **Support status:** Existing logic preserved — reads `quotation_requests` scoped by `requested_by` for `sales_user`

### New Quotation (`QuotationNew.tsx`)
- **Status: Improved (helper text only)**
- Helper text added under: Customer Name, Priority, Delivery Expectation, Scope Summary, Sales Remarks, Step 2 intro
- Submission logic: **unchanged** — still follows the draft-insert → documents-insert → status-UPDATE pattern enforced by migration 087 trigger

### Projects / SO (`Projects.tsx`)
- **Status: Improved**
- Emerald underline tabs with count badges
- Active + Completed status tabs added
- `sales_user`-specific subtitle
- Emerald focus ring on search input
- **Support status:** Read-only sales view — existing query logic preserved, scoped by `sales_owner_id`

### New SO / Project (`ProjectNew.tsx`)
- **Status: Deferred**
- Rationale: Form submission touches approval workflow; helper text additions carry risk of breaking approval routing. Deferred to avoid regressions.

### Project Sales View
- **Status: Deferred**
- Rationale: Existing ProjectDetail is shared across all roles and is complex. Scoped sales view carries structural risk. Deferred.

### Receivables (`Receivables.tsx`)
- **Status: Improved**
- `rows.length === 0` → helpful empty state with link to Projects (no data vs filtered-to-zero now differentiated)
- **Support status:** Read-only — reads `receivables_aging_view`; empty state handles missing view gracefully

### Sales Reports (`ReportsSales.tsx`)
- **Status: Improved**
- Hot Projects tab: pipeline KPIs (open, won, weighted pipeline) + table with stage badges
- Quotations tab: Action Required count tile highlighted amber when non-zero; emerald accent on Won (Converted to SO)
- Aging tab: links to `/receivables` instead of dead-end empty state
- CSV export added for Hot Projects tab
- **Support status:** Partial live — Supabase queries for quotations, projects (approved/active only), and hot_projects; mock fallback in dev mode

---

## SO Approval / Routing Safety Review

**No changes made to SO approval or routing logic.**

- `ProjectNew.tsx` was not modified
- The `projects` table insert and `project_status` progression logic is untouched
- `RequireRole` guards on `/projects/new` are untouched
- Admin approval queue (`AdminApprovals.tsx`) is untouched
- `operations_manager` approval path is untouched

---

## Quotation Conversion Safety Review

**No changes made to quotation conversion logic.**

- `QuotationNew.tsx` submission: insert-as-draft → insert-documents → UPDATE-to-submitted pattern unchanged
- Migration 087 trigger (`trg_quotation_document_gates`) enforcement path unchanged
- `converted_to_so` and `converted_to_hot_project` status transitions: not modified (handled by coordinator workflow)
- `QuotationDetail.tsx` convert-to-SO button: not modified

---

## Schema / Storage Gaps

| Gap | Impact | Workaround |
|-----|--------|------------|
| `next_action` not a DB column | nextAction() is client-only, not searchable/filterable server-side | Acceptable — guidance UX only |
| `hot_projects.probability` nullable | Weighted pipeline may undercount if NULL | UI shows `—` gracefully |
| `hot_projects.estimated_value` nullable | Same as above | UI shows `—` gracefully |
| Quotation PDF storage | File name recorded only; no actual upload in dev mode | Supabase Storage bucket must be provisioned separately |
| `receivables_aging_view` | View must exist in Supabase; client has no write path | Empty state handles absence gracefully |
| Share by Email | No SMTP provider wired; button is UI-only | Not changed; retained as-is |
| `quotation_requests.assigned_coordinator_id` | Coordinator assignment is done by coordinator, not sales; sales cannot force-assign | By design; sales_user sees coordinator name read-only |

---

## Deferred Items

1. **`ProjectNew.tsx` helper text** — deferred to avoid submission logic risk
2. **Project Sales Detail view** — deferred; shared component is complex, scoped sales view requires architectural planning
3. **Unclear Actions Cleanup (Share by Email, Export, Print)** — audit done; buttons retained as-is; no SMTP/storage provider available to wire these up
4. **`next_action` persistence** — would require a DB column; deferred as schema change

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run build` | ✓ Clean — 1812 modules, no errors |
| `npx tsc --noEmit` | ✓ Clean — no type errors |
| `npm run lint` | 84 problems (48 errors, 36 warnings) — **all pre-existing**, 0 new errors introduced by this PR |

Pre-existing lint errors are in: `AuthContext.tsx`, `data-table.tsx`, `form.tsx`, `badge.tsx`, `button.tsx`, `AdminAccessRequest*.tsx`, `AdminApprovals.tsx`, `FactoryProjectWorkspace.tsx`, `HotProjectDetail.tsx`, `Notifications.tsx`, `ProjectDetail.tsx`, `SalesCoordinator.tsx`, and others — none introduced by this PR.
