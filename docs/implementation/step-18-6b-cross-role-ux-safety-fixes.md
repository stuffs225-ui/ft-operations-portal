# Step 18.6B — Cross-Role UX Safety Fixes, 404 Page, Access Restricted UX

**Date:** 2026-06-20  
**Branch:** `feature/step-18-6b-cross-role-ux-safety-fixes`  
**Scope:** UX safety fixes across role boundaries — Reports Hub card gating, 404 page, RequireRole UX improvement. No module rebuilds, no schema changes, no route guard changes, no workflow changes.

---

## Executive Summary

Three focused fixes that prevent roles from seeing pages they cannot access, give a professional experience for unknown URLs, and improve the Access Restricted state with actionable context.

---

## Issues Fixed

| Issue | Severity | Fix |
|---|---|---|
| Reports Hub showed inaccessible cards to operational roles | High | Explicit `roles` arrays on every card; empty state guard |
| Unknown URLs silently redirected to `/` with no feedback | Medium | Professional 404 page with role-aware back link |
| Access Restricted panel had no back button or role context | Medium | Role badge + back-to-workspace link added |

---

## 1. Reports Hub Card Visibility (`src/pages/Reports.tsx`)

### Root Cause

Cards without a `roles` field bypassed the visibility filter:

```js
// OLD: !c.roles short-circuits → shows card to ALL roles
c => !c.roles || !role || c.roles.includes(role) || role === 'admin'
```

9 of 16 cards had no `roles` field, meaning a `procurement_user` who navigated to `/reports` would see Executive Dashboard, Factory Reports, SLA, Health Scores, etc. — all of which would redirect them to the Access Restricted screen if clicked.

### Fix Applied

Every card now has an explicit `roles` array matching its route guard:

| Card | Route | Roles (matches RequireRole in App.tsx) |
|---|---|---|
| Control Tower | /control-tower | admin, operations_manager, viewer |
| Executive Dashboard | /reports/executive | admin, operations_manager, viewer |
| Project Reports | /reports/projects | admin, operations_manager, viewer, sales_coordinator |
| Sales Reports | /reports/sales | admin, operations_manager, viewer, sales_user, sales_coordinator |
| Procurement Reports | /reports/procurement | admin, operations_manager, procurement_user |
| Factory Reports | /reports/factory | admin, operations_manager, factory_user |
| Store Reports | /reports/store | admin, operations_manager, store_user |
| QC Reports | /reports/qc | admin, operations_manager, qc_user |
| Dubai/AFS Reports | /reports/afs | admin, operations_manager, afs_user |
| Supplier Reports | /reports/suppliers | admin, operations_manager, procurement_user |
| SLA & Escalations | /reports/sla | admin, operations_manager, **viewer** ← was missing viewer |
| Data Quality | /reports/data-quality | admin, operations_manager, viewer |
| Health Scores | /reports/health-scores | admin, operations_manager, **viewer** ← was missing viewer |
| Issues & Risks | /reports/issues | admin, operations_manager, viewer, qc_user |
| CAPA Records | /reports/capa | admin, operations_manager, qc_user |
| Audit Log | /audit-log | admin |

The filter is now strict — a card is only shown if the role is explicitly listed (or the user is `admin`, which always bypasses):

```js
cards: group.cards.filter(
  c => role === 'admin' || (c.roles != null && role != null && c.roles.includes(role))
)
```

An empty state is rendered if no groups have any visible cards for the current role.

### What Each Role Sees at `/reports`

| Role | Visible Cards |
|---|---|
| admin | All 16 cards |
| operations_manager | All 16 cards |
| viewer | Control Tower, Executive Dashboard, Project Reports, Sales Reports, SLA, Data Quality, Health Scores, Issues |
| sales_coordinator | Project Reports, Sales Reports |
| procurement_user | Procurement Reports, Supplier Reports |
| factory_user | Factory Reports |
| store_user | Store Reports |
| qc_user | QC Reports, Issues, CAPA |
| afs_user | Dubai/AFS Reports |
| sales_user | Sales Reports only (but sales_user is not in the `/reports` route guard — they get direct nav link) |

---

## 2. 404 Not Found Page (`src/pages/NotFound.tsx`)

### Problem

The previous catch-all route silently redirected any unknown URL back to `/`:

```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

This gave no feedback — a user who mistyped a URL just ended up on the Dashboard with no explanation.

### Fix Applied

Created `src/pages/NotFound.tsx` with a professional "404" display and role-aware back link. Registered in `App.tsx` as the catch-all within `AppLayout`:

```jsx
<Route path="*" element={<NotFound />} />
```

The page uses `ROLE_MATRIX[role]?.landingRoute` to send the user to their correct landing page (e.g. `/factory` for `factory_user`, `/` for management roles).

---

## 3. Access Restricted UX (`src/components/auth/RequireRole.tsx`)

### Problem

The previous "Access restricted" screen had:
- No indication of what role the user has
- No link to navigate back
- Generic message with no actionable next step

### Fix Applied

Added:
1. **Role badge** — shows the user's current role name with its configured accent color (`ROLE_MATRIX[role].badgeClass`)
2. **Back link** — "← Back to {role} workspace" linking to the role's `landingRoute`

Example for `qc_user` landing on `/reports/executive`:
- Badge: `QC Inspector` in violet
- Link: `← Back to QC Inspector workspace` → navigates to `/material-qc`

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `src/pages/Reports.tsx` | Modified | Explicit roles on all 16 cards; strict filter; empty state |
| `src/pages/NotFound.tsx` | New | Professional 404 page with role-aware back link |
| `src/app/App.tsx` | Modified | Lazy import NotFound; catch-all route shows NotFound instead of redirect |
| `src/components/auth/RequireRole.tsx` | Modified | Role badge + back-to-workspace link on 403 panel |
| `docs/implementation/step-18-6b-cross-role-ux-safety-fixes.md` | New | This document |

---

## Action Button Audit Results (Complete)

Full audit of all high-risk action buttons across 8 pages. All existing buttons are properly gated — no changes required.

| Page | Button | Gate | Roles Allowed | Fix Needed |
|---|---|---|---|---|
| Quotations.tsx | New Quotation Request | `canCreate` vs `CAN_CREATE` | admin, operations_manager, sales_user | No |
| Projects.tsx | New SO / Project | `canCreate` vs `CAN_CREATE` | admin, operations_manager, sales_user | No |
| ProcurementPurchaseOrders.tsx | (no create button) | — | — | No (missing button is a feature gap, out of scope) |
| MaterialCustody.tsx | Issue Custody | `canCreate` vs `CAN_CREATE` | admin, operations_manager, store_user | No |
| MaterialQcInspections.tsx | New Inspection | `canCreate` vs `CAN_CREATE` | admin, operations_manager, qc_user | No |
| StoreVehicleReceiving.tsx | New Vehicle Receipt | `canCreate` vs `CAN_CREATE` | admin, operations_manager, store_user | No |
| AfterSalesMaintenance.tsx | New Request | `canCreate` vs `CAN_CREATE` | admin, operations_manager, afs_user, sales_user* | No |
| AdminApprovals.tsx | Approve / Send Back / Reject | `isPending` status guard + route guard | operations_manager (+ admin via RequireRole bypass) | No |

*`sales_user` is listed in `AfterSalesMaintenance.CAN_CREATE` but the route guard (`['afs_user','operations_manager']`) blocks sales_user from reaching the page — dead code, no security impact.

**Approval buttons (AdminApprovals.tsx):** Buttons are status-gated (`isPending`). The route guard (`RequireRole roles={['operations_manager']}`) already ensures only `operations_manager` and `admin` can reach the page. Adding a redundant role check inside the component is unnecessary — the route guard is the authoritative control.

No action button visibility changes made in this step.

---

## Intentionally Deferred

- Per-role module page redesign (Procurement, Store, Factory, QC, AFS)
- Live counts in My Work cards
- Full visual system redesign
- Print/export cleanup

---

## Safety Review

| Check | Status |
|---|---|
| DB schema changed | No |
| Migrations added | No |
| RLS changed | No |
| Route guards changed | No — visibility only; RequireRole guards unchanged |
| Business workflow changed | No |
| SO approval logic changed | No |
| WO/PN gate logic changed | No |
| New build errors | No |
| New type errors | No |
