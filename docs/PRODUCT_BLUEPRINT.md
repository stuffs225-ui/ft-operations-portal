# FT Operations Portal — Product Blueprint

**Source of Truth:** Governance Playbook v3.2  
**Version:** Phase 0 Foundation

---

## What This System Is

FT Operations Portal is an **Action-Based Operations Control Tower** for managing vehicle/fire truck/ambulance projects from quotation request through delivery and after-sales maintenance.

It replaces email chains, Excel sheets, and chat-based tracking with a single, governed, auditable system.

---

## End-to-End Lifecycle

```
Quotation Request / Hot Project
  → Sales Coordinator Processing
  → Quotation Returned to Sales
  → Convert to Hot Project or SO
  → SO Registration + Admin Approval
  → Route Decision: Saudi or Dubai + Medical Yes/No
  → Saudi: Enter WO | Dubai: Enter PN
  → Procurement / Factory / Dubai / Store / QC / AFS
  → Release Note
  → Delivered / Closed
  → AFS Maintenance (if needed post-delivery)
```

---

## Critical Terminology

| Term | Meaning |
|------|---------|
| **SO** | Sales Order — commercial reference for the project |
| **WO** | Work Order — mandatory internal execution reference for Saudi manufacturing |
| **PN** | Project Number — mandatory internal execution reference for Dubai follow-up |
| **PO to Supplier** | Purchase Order issued to a supplier (never use "BO") |
| **PR** | Purchase Request |
| **BOQ** | Bill of Quantities |
| **BOM** | Bill of Materials |
| **AFS** | After Factory Service / Dubai arrival & pre-delivery team |
| **NCR** | Non-Conformance Report (raised by QC on rejection) |

---

## Key Governance Rules (Non-Negotiable)

1. SO is the commercial reference. WO and PN are execution references.
2. WO is mandatory before any Saudi factory action (BOQ, BOM, drawings, raw materials, progress, Send to QC).
3. PN is mandatory before any Dubai tracking (ETA, Dubai PO, AFS readiness, vehicle arrival).
4. PO to Supplier > 10,000 SAR requires Admin or Operations Manager approval.
5. Temporary Custody requires Admin or Operations Manager approval.
6. Medical items must be tracked by serial number at all times.
7. Vehicle receiving requires chassis number + photos to be considered complete.
8. Release Note cannot be issued until all QC findings and rework are closed.
9. Every important event must appear in Timeline and Audit.
10. Reports derive from real workflow data — no manual duplicate entry.

---

## Routing Matrix

| Manufacturing Location | Medical Items | Execution Reference | Workflow Activated |
|------------------------|---------------|--------------------|--------------------|
| Saudi | Yes | WO | Procurement + Saudi Factory + Store + Material QC + Vehicle QC |
| Saudi | No | WO | Saudi Factory + Store + Vehicle QC (when needed) |
| Dubai | Yes | PN | Dubai Management + AFS + Medical follow-up |
| Dubai | No | PN | Dubai Management + AFS |

---

## Roles Summary

| Role | Key Responsibilities | Financial Visibility |
|------|----------------------|----------------------|
| admin | Full governance, users, settings, approvals, reports | Full |
| operations_manager | Operations, escalation, Dubai, PO approvals, Temporary Custody | By permission |
| sales_user | Quotations, Hot Projects, SO, Aging, Invoicing | Own sales values only |
| sales_coordinator | Quotation processing, PDF upload, line values | Quotation values only |
| procurement_user | PR, PO to Supplier, ETA, suppliers | Purchase costs |
| factory_user | WO, BOQ, BOM, Raw Material Requests, production progress | None |
| store_user | Material & vehicle receiving, custody, issuance | None |
| qc_user | Material QC, Vehicle QC, NCR, Release Note | None |
| afs_user | Dubai projects, vehicle arrival, pre-delivery, after-sales | None |
| viewer | Read-only reports and dashboards | By permission |

---

## SLA Rules

| Condition | Target | Escalation |
|-----------|--------|------------|
| Quotation request not processed | 2 days | Sales Coordinator → Operations |
| SO approved but WO missing | 2 days | Factory/Production → Operations |
| SO approved but PN missing | 2 days | Operations/Production |
| PR without PO to Supplier | 3 days | Procurement → Manager |
| PO > 10,000 pending approval | 2 days | Operations/Admin |
| Temporary custody pending acceptance | 1 day | Receiver → Store → Operations |
| Factory update missing | 30 days | Factory → Operations |
| QC rework open | 7 days | QC/Factory → Operations |

---

## Implementation Phases

| Phase | Scope |
|-------|-------|
| 0 | Foundation (this phase): project setup, layout, placeholder pages, docs |
| 1 | Users, roles, permissions, documents, audit |
| 2 | SO, vehicle lines, approval, routing (Project Core) |
| 3 | Quotation Management |
| 4 | SO-WO/PN Gate, blocking rules |
| 5 | Procurement, PO approval, suppliers |
| 6 | Factory / Dubai / AFS |
| 7 | Store / Custody |
| 8 | QC and Release Note |
| 9 | After Sales Maintenance |
| 10 | Operational Excellence: Control Tower, SLA, Reports, Data Quality |
