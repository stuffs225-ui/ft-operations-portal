# Navigation Restructure (Proposal — Wave D)

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Status:** **DEFERRED design proposal — NOT implemented in this PR.**

This document captures the navigation audit and a proposed regrouping. No
sidebar code was changed in this PR.

---

## 1. Current navigation inventory

The sidebar currently has **33 items across 7 groups**. The `MANAGEMENT` group
is bloated — it mixes Reports, Admin, and miscellaneous tools, which forces
operators to scan an overloaded group to find unrelated functions.

| Group | Representative items |
|-------|----------------------|
| Overview | Dashboard, Control Tower, Action Inbox |
| Commercial | Sales, Sales Coordinator, Quotations, Projects |
| Procurement | Procurement + sub-pages |
| Factory | Factory Projects / Workspace / Requirements / Raw Material / Monthly Updates |
| Store & QC | Store, Custody, Material QC, Project QC, Vehicle Receiving |
| Dubai / AFS | Dubai AFS + sub-reports, After-Sales, Maintenance |
| Management (bloated) | Reports (all), Admin Users, Access Requests, Report Subscriptions, Notification Rules, Templates, Approvals, WO/PN Gate, Settings, Audit Log |

> Exact item counts/labels are derived from `src/components/layout/Sidebar.tsx`.
> The headline problem is the `MANAGEMENT` group conflating three distinct
> concerns (reporting, administration, operational tools).

---

## 2. Proposed regrouping (5 groups)

Collapse the 7 groups into **5 intent-based groups**:

| New group | Contents |
|-----------|----------|
| **Home** | Dashboard, Control Tower, Action Inbox |
| **Commercial** | Sales, Sales Coordinator, Quotations, Projects |
| **Operations** | Procurement, Factory, Store, Custody, Quality (Material QC + Project QC), Dubai/AFS, After-Sales, Maintenance, **WO/PN Gate** |
| **Reports** | All reports pages (Executive, Projects, Sales, Procurement, Factory, Store, QC, Suppliers, SLA, Data Quality, Health Scores, Issues, CAPA, AFS) |
| **Admin** | Admin Users, Access Requests, Report Subscriptions, Notification Rules, Templates & Approvals, **Admin Approvals**, Settings, Audit Log |

### Specific moves

- **Admin Approvals → Admin** (currently surfaces alongside operational tools).
- **WO/PN Gate → Operations** (it is an operational gate, not a management report).
- **Merge Quality + Dubai/AFS into Operations** (both are downstream operational flows).
- **Split MANAGEMENT** into a clean **Reports** group and a clean **Admin** group.

### Rationale

- Each group maps to a single user intent ("I want to sell", "I want to run an
  operation", "I want a report", "I want to administer the system").
- The Admin group can then be visually/role-gated as a block (it already aligns
  with the Wave B `RequireRole` guards — see `docs/PRE_PILOT_READINESS_REVIEW.md`).
- Reports become discoverable as a set rather than buried among admin tools.

---

## 3. Role-awareness (cross-reference)

This restructure pairs with the deferred role-workspace work
(`docs/ROLE_WORKSPACE_REDESIGN.md`): once groups are intent-based, the sidebar
can hide entire groups per role cleanly (e.g. a `factory_user` sees Home +
Operations only).

---

## 4. Status

| Item | Status |
|------|--------|
| Navigation audit | DONE (this document) |
| 5-group regrouping | DEFERRED (Wave D) |
| Sidebar code changes | NOT in this PR |
