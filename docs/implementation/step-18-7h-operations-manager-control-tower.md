# Step 18.7H — Operations Manager Control Tower and Cross-Module Governance UX Rebuild

## Purpose

Rebuild the `operations_manager` experience from a cluttered 70+ item navigation spanning
all module sub-sections into a focused Operations Control Tower. The ops_mgr monitors
cross-module health, approvals, gate compliance, and delivery readiness — they do not
execute in module work centers.

---

## Files Changed

- `src/lib/roleMatrix.ts` — `operations_manager` landing route + 7 governance rules
- `src/data/navigation.ts` — Full IA restructure: 4 new sections, ops_mgr removed from all module sub-items and admin-only items
- `src/pages/ControlTower.tsx` — Full rebuild: indigo accent, quick actions, governance rules card, async load() lint fix

---

## roleMatrix.ts Changes

### `operations_manager` entry

- `landingRoute`: changed from `'/'` to `'/control-tower'`
- `rules`: replaced 5 generic approval-gate rules with 7 governance-scoped rules:
  1. Monitor cross-module blockers daily — approvals, gate violations, QC blockers, and delivery risks.
  2. Review and approve pending items promptly — high-value POs, SO approvals, and procurement exceptions.
  3. Do not bypass WO, PN, Store, QC, or Release gates — monitor them, not override them.
  4. Escalate SLA breaches and delivery risks to the responsible module team.
  5. Use module work centers for detailed execution review — Control Tower is for oversight, not execution.
  6. Admin-only settings (user management, role assignment, system configuration) remain under Admin.
  7. All operational decisions must remain traceable where audit and timeline support it.

---

## navigation.ts Changes

### New items added (ops_mgr only)

**MY WORK section:**
- `ops-control-tower` → /control-tower — "Operations Control Tower" (MY WORK landing for ops_mgr)

**CONTROL TOWER section (new):**
- `sep-ops-control-tower` separator
- `ops-approvals` → /admin-approvals — "Approvals Center"
- `ops-wo-pn-gate` → /wo-pn-gate — "WO / PN Gate"
- `ops-sla` → /reports/sla — "SLA & Delays"

**WORKSTREAM MONITORING section (new):**
- `sep-ops-monitoring` separator
- `ops-sales-monitor` → /quotations — "Sales & Quotations"
- `ops-hot-projects` → /hot-projects — "Hot Projects"
- `ops-projects` → /projects — "Projects / SO"
- `ops-procurement-monitor` → /procurement — "Procurement Monitor"
- `ops-store-monitor` → /store — "Store Monitor"
- `ops-factory-monitor` → /factory — "Factory Monitor"
- `ops-qc-monitor` → /qc — "QC / Release Monitor"
- `ops-afs-monitor` → /dubai-afs — "AFS / Delivery Monitor"

**OPERATIONS REPORTING section (new):**
- `sep-ops-reporting` separator
- `ops-report-executive` → /reports/executive — "Operations Overview"
- `ops-report-sla` → /reports/sla — "SLA & Delays"
- `ops-report-health` → /reports/health-scores — "Health Scores"
- `ops-report-all` → /reports — "All Reports"

### ops_mgr removed from existing items

| Item | Was | Now |
|---|---|---|
| `dashboard` | admin, **ops_mgr**, proc, factory, store, qc, afs, viewer | admin, proc, factory, store, qc, afs, viewer |
| `sales` | admin, **ops_mgr**, viewer | admin, viewer |
| `hot-projects` | admin, **ops_mgr**, sales_user, viewer | admin, sales_user, viewer |
| `quotations` | admin, **ops_mgr**, sales_user, viewer | admin, sales_user, viewer |
| `receivables` | admin, **ops_mgr**, viewer | admin, viewer |
| `templates` | admin, **ops_mgr**, sales_user | admin, sales_user |
| `projects` | admin, **ops_mgr**, viewer | admin, viewer |
| `admin-approvals` | admin, **ops_mgr** | admin |
| `wo-pn-gate` | admin, **ops_mgr** | admin |
| `admin-access-requests` | admin, **ops_mgr** | admin |
| `admin-notification-rules` | admin, **ops_mgr** | admin |
| `admin-report-subscriptions` | admin, **ops_mgr** | admin |
| All PROCUREMENT sub-items | admin, **ops_mgr**, procurement_user | admin, procurement_user |
| All STORE OPERATIONS sub-items | admin, **ops_mgr**, store_user | admin, store_user |
| All QUALITY HANDOFF sub-items | admin, **ops_mgr**, store_user | admin, store_user |
| All QUALITY CONTROL sub-items | admin, **ops_mgr**, qc_user | admin, qc_user |
| All FACTORY EXECUTION sub-items | admin, **ops_mgr**, factory_user | admin, factory_user |
| All FACTORY MATERIALS sub-items | admin, **ops_mgr**, factory_user | admin, factory_user |
| EXECUTION items (procurement, factory, store) | admin, **ops_mgr** | admin |
| `custody` | admin, **ops_mgr**, afs_user | admin, afs_user |
| `vehicle-receiving` | admin, **ops_mgr**, store_user | admin, store_user |
| QUALITY & RELEASE items | admin, **ops_mgr** | admin |
| All DUBAI/AFS EXECUTION sub-items | admin, **ops_mgr**, afs_user | admin, afs_user |
| All AFS MATERIALS sub-items | admin, **ops_mgr**, afs_user | admin, afs_user |
| All AFTER SALES sub-items | admin, **ops_mgr**, afs_user | admin, afs_user |
| DUBAI/AFS generic items | admin, **ops_mgr** | admin |
| `control-tower` (REPORTING item) | admin, **ops_mgr**, viewer | admin, viewer |
| `reports` | admin, **ops_mgr**, viewer | admin, viewer |

### Admin-only items corrected

`admin-access-requests`, `admin-notification-rules`, and `admin-report-subscriptions` restricted
to `['admin']` only — user management and system configuration are admin-only per governance rules.

---

## ControlTower.tsx Changes

### Title and branding
- Title: "Operations Control Tower" (was "Operations Overview")
- Subtitle: "Monitor approvals, blockers, delays, delivery readiness, and cross-module execution health."
- Breadcrumb updated to match
- Indigo accent on section headings (`text-indigo-600`), KPI "Total Active" tile (`border-indigo-400`),
  Governance Rules card (`border-indigo-100 bg-indigo-50/40`), schema blocker links

### useEffect lint fix (react-hooks/set-state-in-effect)
Converted async IIFE pattern to named async function with cancelled guard:
```tsx
useEffect(() => {
  let cancelled = false;
  async function load() {
    // ...all data loading...
    if (!cancelled) { setMetrics({...}); setLoading(false); }
  }
  void load();
  return () => { cancelled = true; };
}, []);
```

### New: Quick Actions row
Four action buttons with live count badges:
- **Approvals Center** (amber badge when pendingApproval > 0) → /admin-approvals
- **WO / PN Gate** (red badge when missingWo + missingPn > 0) → /wo-pn-gate
- **QC Findings** (orange badge when openQcFindings > 0) → /project-qc
- **Export Overdue** → triggers CSV export

### New: Status signals row
Added `gateIssues` (missingWo + missingPn) pill. Five pills total: overdue, pending approvals,
gate issues, open QC findings, critical maintenance.

### New: Governance Rules section
Renders `ROLE_MATRIX.operations_manager.rules` in an indigo-accented card with Activity icon.
Uses the same rules defined in roleMatrix.ts — single source of truth.

### Unchanged
- All Supabase queries (same tables, same filters, same selects)
- All LiveMetrics fields and computation logic
- Critical Exceptions section
- Delivery Readiness section
- Overdue Projects table
- Module Activity section (renamed from "Department Workload")
- Schema Blocker notice (links updated to indigo)
- Export functionality
- WO/PN gap calculation logic

---

## Safety Review

- No business logic changed
- No status transitions added or removed
- No route guards changed
- No DB schema, migrations, or RLS policies changed
- No Supabase queries changed (same tables, same filters, same selects)
- No SO approval/routing changed
- No quotation conversion logic changed
- No Sales User workflow changed (PR #115 unchanged)
- No Sales Coordinator workflow changed (PR #116/#117 unchanged)
- No module workflows changed (procurement, store, factory, qc, afs)
- No new dependencies introduced
- No fake live data added
- Admin always bypasses RequireRole — all existing admin access preserved

---

## Navigation Safety

- All module routes remain accessible to their module roles unchanged
- Admin retains full access to all items (RequireRole admin bypass is unconditional)
- ops_mgr WORKSTREAM MONITORING links point to existing pages — no new routes required
- ops_mgr CONTROL TOWER links point to existing pages (/admin-approvals, /wo-pn-gate, /reports/sla)
- ops_mgr OPERATIONS REPORTING links point to existing report pages
- viewer access to sales/projects/reporting sections preserved (unchanged)
- `buildVisibleNav()` auto-hides separator sections when no children are visible

---

## Deferred Items (unchanged from 18.7G)

- Quotation Processing Detail write actions
- Clarification thread structured UI
- PDF / quotation output upload
- Coordinator-specific reports tab
- Completed Quotations dedicated management page
- SLA breach tracking (requires `sla_events` schema — documented blocker in ControlTower)
- Health Scores (requires `project_health_scores` / `department_health_scores` — documented blocker)

---

## Validation Results

- `npm run build`: ✅ PASS — 0 errors, built in 7.36s
- `npx tsc --noEmit`: ✅ PASS — 0 errors (covered by build)
- `npx eslint src/pages/ControlTower.tsx src/lib/roleMatrix.ts src/data/navigation.ts`: ✅ PASS — 0 errors, 0 warnings

### 0 new lint errors introduced
Pre-existing baseline lint errors in other files (AuthContext.tsx, ProjectDetail.tsx,
ProjectNew.tsx, etc.) are unchanged and unrelated to this PR.
