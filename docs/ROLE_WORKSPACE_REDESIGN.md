# Role Workspace Redesign (Proposal — Wave E)

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Status:** **DEFERRED design proposal — NOT implemented in this PR.**

The current `Dashboard` is **NOT role-aware**: every role sees the identical set
of KPIs. (By contrast, `ActionInbox` *is* already role-filtered — a good model to
follow.) This document proposes a role-aware Dashboard / landing experience for
each of the 10 roles.

---

## 1. Goal

When a user lands, they should immediately see **what needs their attention**,
the things **they can create**, the **exceptions** they own, the **reports**
relevant to them, and **quick actions** — scoped to their role and RLS-permitted
data only.

Each role workspace is composed of five blocks:

1. **Needs my attention** — the prioritized work queue for this role.
2. **Create** — the records this role is allowed to originate.
3. **Exceptions** — overdue / blocked / failing items this role owns.
4. **Reports** — the reports relevant to this role.
5. **Quick actions** — one-click shortcuts.

---

## 2. Per-role definitions (10 roles)

### admin
- **Attention:** pending access requests, user/role changes, failed jobs, audit anomalies.
- **Create:** users, templates, notification rules, report subscriptions.
- **Exceptions:** stuck approvals across all modules, security events.
- **Reports:** all reports (Executive, Data Quality, SLA, Health Scores).
- **Quick actions:** Manage Users, Access Requests, Audit Log, Settings.

### operations_manager
- **Attention:** items awaiting approval (PO, WO/PN gate, templates, access requests), SLA breaches.
- **Create:** approvals/decisions, escalations.
- **Exceptions:** overdue approvals, projects off-track, breached SLAs.
- **Reports:** Executive, Projects, SLA, Issues, CAPA, Health Scores.
- **Quick actions:** Admin Approvals, WO/PN Gate, Access Requests, Control Tower.

### sales_user
- **Attention:** quotations awaiting action, expiring quotations, won deals to convert.
- **Create:** quotations, sales orders.
- **Exceptions:** stale/expiring quotations, rejected quotations.
- **Reports:** Sales, Projects (own).
- **Quick actions:** New Quotation, My Quotations, Sales pipeline.

### sales_coordinator
- **Attention:** SO creation/coordination tasks, handoffs to procurement/factory.
- **Create:** sales orders, coordination records.
- **Exceptions:** incomplete handoffs, blocked SO conversions.
- **Reports:** Sales, Projects.
- **Quick actions:** Sales Coordinator workspace, New SO, Projects.

### procurement_user
- **Attention:** POs to raise/approve, supplier responses due, raw-material requests.
- **Create:** purchase orders, POs to supplier, supplier records.
- **Exceptions:** overdue POs, supplier governance flags, late deliveries.
- **Reports:** Procurement, Suppliers.
- **Quick actions:** New PO, Procurement queue, Suppliers.

### factory_user
- **Attention:** WO/PN gate items, requirements assigned, monthly updates due.
- **Create:** raw-material requests, monthly updates, factory progress.
- **Exceptions:** blocked WOs, missing raw material, overdue updates.
- **Reports:** Factory.
- **Quick actions:** Factory Workspace, Requirements, WO/PN Gate.

### store_user
- **Attention:** vehicle receiving, receipts to confirm, unallocated stock, custody handoffs.
- **Create:** store receipts, vehicle receiving records, custody records.
- **Exceptions:** unallocated inventory, custody overdue, receiving discrepancies.
- **Reports:** Store.
- **Quick actions:** Vehicle Receiving, New Receipt, Custody, Inventory.

### qc_user
- **Attention:** material/project inspections due, NCRs open, findings to resolve, release notes.
- **Create:** QC inspections, NCRs, findings, release notes.
- **Exceptions:** failed inspections, open NCRs, overdue findings.
- **Reports:** QC.
- **Quick actions:** Material QC, Project QC, New Inspection, NCRs.

### afs_user
- **Attention:** Dubai AFS arrivals, ETAs, missing items, condition/pre-delivery reports, maintenance.
- **Create:** AFS arrival/condition/pre-delivery reports, missing-item records, maintenance tickets.
- **Exceptions:** ETA slips, missing items unresolved, condition failures.
- **Reports:** AFS.
- **Quick actions:** Dubai AFS, Arrivals, ETA, After-Sales Maintenance.

### viewer
- **Attention:** read-only — recent activity in permitted scope.
- **Create:** nothing.
- **Exceptions:** read-only exception summaries (no actions).
- **Reports:** read-only access to permitted reports.
- **Quick actions:** none (navigation only).

---

## 3. Implementation notes (for the future wave)

- Reuse the `ActionInbox` role-filter pattern as the basis for "Needs my attention".
- All blocks must respect RLS and the cost-view rules (no revenue for
  factory/store/qc/afs/viewer — see Wave A cost-view fix).
- Pair with the navigation restructure (`docs/NAVIGATION_RESTRUCTURE.md`) so the
  sidebar hides irrelevant groups per role.
- KPI aggregation must be wired to live data first (Dashboard/ControlTower
  currently show an "aggregation not yet connected" notice in live mode).

---

## 4. Status

| Item | Status |
|------|--------|
| Role-workspace design (10 roles) | DONE (this document) |
| Role-aware Dashboard implementation | DEFERRED (Wave E) |
| Current Dashboard role-awareness | NONE (all roles identical) |
