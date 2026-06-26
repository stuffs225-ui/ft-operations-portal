# Role-Based Access Audit

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> Audit only. **No `roleMatrix`, route guard, RLS, or permission was changed.**

---

## Role source of truth

- **Role assignment:** `user_roles.role` joined to `profiles` (NOT `profiles.role`). Confirmed in
  `salesTargetsQueries.getSalesUsers()` and across admin user management.
- **Route enforcement:** `src/components/auth/RequireRole.tsx` — `admin` always passes; other roles
  must be in the route's `roles` array; otherwise a 403 panel renders. This sits on top of RLS.
- **Landing routes:** `src/lib/roleMatrix.ts` (`ROLE_MATRIX[role].landingRoute`).
- **Navigation visibility:** `src/data/navigation.ts` — sidebar items filtered by `roles`.
- **`ProtectedRoute`:** checks auth/loading only; role checks are delegated to `RequireRole`.

---

## Per-role matrix

| Role | Landing route | Primary accessible area | Forbidden (sample) | Mutations in UI |
|------|---------------|--------------------------|--------------------|-----------------|
| **admin** | `/admin-dashboard` | Everything (bypasses all guards) | — | Full (governed by RLS) |
| **operations_manager** | `/control-tower` | Control Tower, all module dashboards (monitor), reports, approvals | Admin-only (`/admin/*`, `/settings`, `/audit-log`) | Approvals, monitoring; not admin config |
| **sales_user** | `/sales` | Sales Dashboard, projects, hot projects, quotations, receivables, sales reports | Admin, procurement/store/factory/qc/afs work centers, `/control-tower` | Create quotation/project; no admin controls |
| **sales_coordinator** | `/sales-coordinator` | Coordinator dashboard + queue, quotations, project/sales reports | Admin, other work centers | Coordinator quotation actions |
| **procurement_user** | `/procurement` | Procurement dashboards/lists, suppliers, ETA, procurement reports | Admin, other work centers, `/control-tower` | PR/PO create; approvals gated by RLS |
| **factory_user** | `/factory` | Factory work center, WO/PN gate, custody (shared) | Admin, other work centers | Production/RMR actions |
| **store_user** | `/store` | Store work center, receiving, custody, serials, QC handoff | Admin, other work centers | Receiving/custody/serial actions |
| **qc_user** | `/qc` | QC/NCR/Release, material & project QC, issues/capa reports | Admin, other work centers | QC inspection/NCR/release actions |
| **afs_user** | `/dubai-afs` | Dubai/AFS, after-sales, custody (shared) | Admin, other work centers | AFS/maintenance actions |
| **viewer** | `/management-dashboard` | Management dashboard, control tower, reports, portfolio (read-only) | Admin, all work-center mutations | **None** (read-only) |

---

## Checks performed (per-role)

For each role the following were reviewed against `App.tsx` guards + `navigation.ts`:

1. **Expected landing page** — matches `ROLE_MATRIX` (table above). ✓
2. **Accessible routes** — guard arrays reviewed; consistent with module ownership. ✓
3. **Forbidden routes** — admin-only routes (`/admin-dashboard`, `/settings`, `/admin/users`,
   `/audit-log`, `/admin/access-requests`, `/admin/notification-rules`,
   `/admin/report-subscriptions`, `/admin/invoicing-schedule`, `/admin/sales-targets`) are guarded
   to `['admin']` only. ✓ No other role can reach them.
4. **Visible navigation** — sidebar items role-filtered; no nav item points to a route the role
   cannot enter (spot-checked Sales, Coordinator, Procurement, Store, Admin, Viewer). ✓
5. **Mutation permissions in UI** — work-center create/edit actions appear only for owning roles;
   `CAN_CREATE` arrays gate create buttons (e.g. Projects, Procurement, Store, After Sales). ✓
6. **Read-only restrictions** — Viewer/Management dashboard renders only `<Link>` navigation and
   KPI tiles; **no edit/approve/delete/create actions**. ✓
7. **Route-vs-nav mismatch** — none found that grants access; see note below on intentional
   broad-read routes.
8. **Admin-only data exposure risk** — none found. Commercial-control pages (`/admin/*`) are
   admin-guarded; viewer/management surfaces use only portfolio/operational reads.
9. **Workflow-action exposure risk** — none found for read-only roles.
10. **Recommended follow-up** — none required for go-live (see findings).

---

## Findings

### No critical mismatches found

- Admin-only commercial controls (`/admin/invoicing-schedule`, `/admin/sales-targets`) are
  correctly guarded to `['admin']`.
- Viewer is read-only across `/management-dashboard` and all reachable reports.
- `operations_manager` has monitor/approve access but **not** admin configuration — consistent
  with governance.

### Intentional broad-read routes (documented, not a defect)

Several **read** routes are intentionally accessible to many roles for cross-module visibility:
`/sales`, `/projects`, `/quotations`, `/hot-projects`, `/projects/:id` list `all roles` (or most).
This is by design (read-only visibility); RLS scopes the underlying rows (e.g. sales_user sees own
projects). **Not a permission defect.** No change recommended.

### Severity classification

| Item | Severity | Action |
|------|----------|--------|
| Admin-only routes correctly guarded | — (pass) | None |
| Viewer read-only preserved | — (pass) | None |
| Broad-read visibility routes | Informational | Documented; rely on RLS row scoping |
| Migration-100 dependency on `/sales` | High (functional, not access) | See migration gap audit — not an access issue |

**No permission was broadened. No `roleMatrix` or guard change is recommended for go-live.**
Any future change to broad-read routes should be a separate, explicitly-approved PR with RLS review.
