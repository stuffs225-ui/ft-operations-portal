# Analysis 04 — Implementation Opportunities Backlog

**Purpose:** Organize all identified implementation opportunities from the reference repositories into a prioritized backlog, mapped to FT Operations Portal modules and implementation phases.

Each item specifies: Feature/Pattern, Source Repository, FT Portal Module, Why It Matters, Estimated Complexity, Dependencies, and Suggested Phase.

---

## Must-Have Now

These items are foundational and block all other work.

---

### 1. UI Component Library Setup (shadcn/ui)

| Field | Value |
|---|---|
| **Feature / Pattern** | Core UI component set: Button, Input, Form, Table, Badge, Dialog, Sheet, Select, DatePicker, Card, Separator, Tabs, Tooltip |
| **Source Repository** | shadcn/ui (MIT) |
| **FT Portal Module** | All modules — Design System |
| **Why It Matters** | Without a consistent component library, each screen will look different and require 3-5x more effort to build. shadcn/ui eliminates this by providing copy-paste accessible components. |
| **Estimated Complexity** | Low — initial setup takes ~1 day; ongoing component addition is trivial |
| **Dependencies** | React, TypeScript, Tailwind CSS, Radix UI |
| **Suggested Phase** | Phase 1 — Foundation |

---

### 2. Admin Framework Setup (refine + shadcn/ui)

| Field | Value |
|---|---|
| **Feature / Pattern** | Resource model, data provider, access control provider, layout shell, sidebar navigation, routing |
| **Source Repository** | refine (MIT) |
| **FT Portal Module** | Admin / Users / Roles, all CRUD screens |
| **Why It Matters** | refine provides the CRUD scaffolding (list, create, edit, show), role-based access control, and data provider abstraction. Without this, the team would build these patterns from scratch for every entity. |
| **Estimated Complexity** | Medium — setup takes 2-3 days; team needs to learn refine conventions |
| **Dependencies** | React, TypeScript, shadcn/ui, backend REST or GraphQL API |
| **Suggested Phase** | Phase 1 — Foundation |

---

### 3. Role-Based Access Control (RBAC) from refine

| Field | Value |
|---|---|
| **Feature / Pattern** | `authProvider`, `accessControlProvider`, `CanAccess` component, role-based sidebar visibility, route-level permission guards |
| **Source Repository** | refine (MIT), ERPNext (GPL v3 — pattern reference only) |
| **FT Portal Module** | Admin / Users / Roles |
| **Why It Matters** | The playbook defines 10 distinct roles with different screen access and financial visibility rules. RBAC must be implemented at both UI and API level from the start. |
| **Estimated Complexity** | Medium — 3-4 days for full RBAC setup including API-level enforcement |
| **Dependencies** | refine, backend authentication service |
| **Suggested Phase** | Phase 1 — Foundation |

---

### 4. Master Data Management Screens

| Field | Value |
|---|---|
| **Feature / Pattern** | CRUD screens for: Vehicle Types, Material Categories, Supplier Categories, Document Types, Root Cause Categories, Issue Types, SLA Rules, Store Locations |
| **Source Repository** | refine (MIT) + ERPNext pattern reference |
| **FT Portal Module** | Data Quality and Master Data |
| **Why It Matters** | All operational modules depend on master data lists. Without clean master data, data quality enforcement is impossible. |
| **Estimated Complexity** | Low-Medium — standard CRUD screens; 1-2 days per master data category |
| **Dependencies** | refine setup, database schema for master tables |
| **Suggested Phase** | Phase 1 — Foundation |

---

### 5. SO Registration with Vehicle Line Management

| Field | Value |
|---|---|
| **Feature / Pattern** | Create/Edit form for Sales Orders with embedded vehicle line table; inline add/edit lines; save with validation |
| **Source Repository** | refine + shadcn/ui (MIT); ERPNext Sales Order data model (GPL — pattern reference) |
| **FT Portal Module** | SO Registration |
| **Why It Matters** | SO is the central commercial reference for every project. Every other module links to an SO. |
| **Estimated Complexity** | Medium — line-item table within a form requires custom component (~3 days) |
| **Dependencies** | refine, shadcn/ui DataTable, Customer master data |
| **Suggested Phase** | Phase 2 — Project Core |

---

### 6. Approval and Routing Engine (Stage-Gate)

| Field | Value |
|---|---|
| **Feature / Pattern** | Approve/Reject actions with routing matrix; conditional task creation (WO task for Saudi, PN task for Dubai) after approval; blocking rules at data level |
| **Source Repository** | ERPNext approval workflow (GPL — pattern reference); refine for UI |
| **FT Portal Module** | Approval and Routing Engine |
| **Why It Matters** | The routing engine is the single most critical business logic in the system. Errors here cause entire project tracks to run incorrectly. |
| **Estimated Complexity** | High — routing logic is complex; 5-7 days for full implementation and testing |
| **Dependencies** | SO Registration, RBAC, notification service hook |
| **Suggested Phase** | Phase 2 — Project Core |

---

### 7. Status Badge Component with FT Portal Status Map

| Field | Value |
|---|---|
| **Feature / Pattern** | Centralized `statusBadge(status)` utility + shadcn Badge variants for all FT Portal status values |
| **Source Repository** | shadcn/ui (MIT) |
| **FT Portal Module** | All modules |
| **Why It Matters** | Status clarity is critical in an operational system. Every record in every module has a status. Without a consistent badge system, status display will be inconsistent. |
| **Estimated Complexity** | Low — 1 day to define all status-to-variant mappings |
| **Dependencies** | shadcn/ui Badge |
| **Suggested Phase** | Phase 1 — Foundation |

---

### 8. Quotation Request Workflow (Sales + Coordinator)

| Field | Value |
|---|---|
| **Feature / Pattern** | Sales creates request → Coordinator queue → PDF upload with line values → Returned to Sales → Convert to SO |
| **Source Repository** | refine (MIT) + ERPNext Quotation pattern |
| **FT Portal Module** | Quotation Management, Sales Coordinator Workspace |
| **Why It Matters** | Quotation is the entry point of the entire project lifecycle. It must be reliable and traceable. |
| **Estimated Complexity** | Medium — 4-5 days for full flow |
| **Dependencies** | refine, file upload service, RBAC |
| **Suggested Phase** | Phase 3 — Quotation |

---

## Should-Have Soon

These items are important but can follow the foundational modules.

---

### 9. WO/PN Gate with Blocking Logic

| Field | Value |
|---|---|
| **Feature / Pattern** | After SO approval: factory workspace is blocked until WO is entered; Dubai workspace is blocked until PN is entered; system shows alert and pending task |
| **Source Repository** | ERPNext Work Order (GPL — pattern reference); refine for UI |
| **FT Portal Module** | WO/PN Gate |
| **Why It Matters** | The WO/PN gate is a non-negotiable governance rule from the playbook. Without it, the entire manufacturing tracking breaks. |
| **Estimated Complexity** | Medium — 3-4 days |
| **Dependencies** | SO Registration, Approval/Routing, Factory Workspace |
| **Suggested Phase** | Phase 4 — SO-WO/PN Gate |

---

### 10. Procurement Queue with High-Value PO Approval

| Field | Value |
|---|---|
| **Feature / Pattern** | PR creation → PR items → PO to Supplier (with PDF upload) → if > 10,000 SAR: approval gate → ETA tracking → Store Receiving link |
| **Source Repository** | ERPNext Purchase workflow (GPL — pattern reference); refine for UI |
| **FT Portal Module** | Procurement and PO Approval |
| **Why It Matters** | Procurement is active for every Saudi-route project. The 10,000 SAR approval gate is a hard governance rule. |
| **Estimated Complexity** | Medium-High — 5-6 days for full procurement flow |
| **Dependencies** | SO/WO Gate, Approved Suppliers, Approval engine |
| **Suggested Phase** | Phase 5 — Procurement |

---

### 11. Approved Supplier Registry with Status Lifecycle

| Field | Value |
|---|---|
| **Feature / Pattern** | Supplier CRUD with 6-state lifecycle (Draft → Blacklisted), QC notes, medical certification flag, contact info, material categories |
| **Source Repository** | ERPNext Supplier master (GPL — data model reference); refine for UI |
| **FT Portal Module** | Approved Suppliers |
| **Why It Matters** | PO to Supplier must reference approved suppliers only. Blacklisted supplier must be blocked from new POs. |
| **Estimated Complexity** | Low-Medium — 2-3 days |
| **Dependencies** | Master data setup, QC module for quality notes |
| **Suggested Phase** | Phase 5 — Procurement |

---

### 12. Store Receiving with Chassis Photo Upload

| Field | Value |
|---|---|
| **Feature / Pattern** | Material receiving form linked to PO; Vehicle receiving with chassis number + 5-photo requirement; inventory search by Item Code / Serial / Project |
| **Source Repository** | ERPNext Stock Entry / Purchase Receipt (GPL — data model); refine for UI |
| **FT Portal Module** | Store and Warehouse, Vehicle Receiving |
| **Why It Matters** | Every material and vehicle must be received into the system. Vehicle receiving without chassis number must be blocked. |
| **Estimated Complexity** | Medium — 4-5 days including photo upload flow |
| **Dependencies** | PO, WO/PN Gate, file upload service |
| **Suggested Phase** | Phase 7 — Store / Custody |

---

### 13. Medical Item Serial Number Register

| Field | Value |
|---|---|
| **Feature / Pattern** | Serial number registration at goods receipt; QC check per serial; custody tracking linked to serial; installation record on vehicle |
| **Source Repository** | ERPNext Serial Number tracking (GPL — data model reference) |
| **FT Portal Module** | Medical Serial Tracking |
| **Why It Matters** | Every medical item must be traceable from supplier to installed vehicle. Missing serial = blocked QC acceptance. |
| **Estimated Complexity** | Medium — 3-4 days |
| **Dependencies** | Store Receiving, QC module |
| **Suggested Phase** | Phase 7 — Store / Custody |

---

### 14. QC Checklist + NCR + Release Note Flow

| Field | Value |
|---|---|
| **Feature / Pattern** | Material QC task (pass/fail per item); NCR creation on rejection with root cause + corrective action; Vehicle QC checklist; Release Note only when all observations closed |
| **Source Repository** | ERPNext Quality Inspection (GPL — data model); Plane issue model (AGPL — UX reference) |
| **FT Portal Module** | Quality Control |
| **Why It Matters** | QC is the gate before release. Release Note without closed QC must be blocked. |
| **Estimated Complexity** | High — 6-8 days for full QC + NCR + Release Note flow |
| **Dependencies** | Store Receiving, Factory / AFS modules |
| **Suggested Phase** | Phase 8 — QC and Release |

---

### 15. CAPA Module (Risks, Issues, Root Cause)

| Field | Value |
|---|---|
| **Feature / Pattern** | Issue/risk creation linked to project; fields: title, type, priority, status, root cause, corrective action, preventive action, owner, due date, evidence, closure approval |
| **Source Repository** | Plane issue model (AGPL — UX/data model reference); ERPNext CAPA (GPL — reference) |
| **FT Portal Module** | Risks, Issues, Root Cause, CAPA |
| **Why It Matters** | Every major operational problem must be tracked with a CAPA record. This is how the system moves from reactive to preventive. |
| **Estimated Complexity** | Medium — 4-5 days |
| **Dependencies** | refine, RBAC, Notification service (for due date alerts) |
| **Suggested Phase** | Phase 8 or 10 |

---

### 16. Timeline / Audit Log per Record

| Field | Value |
|---|---|
| **Feature / Pattern** | Chronological event log per project: shows creation, approvals, WO/PN creation, QC events, material movements, release — all with timestamp and actor |
| **Source Repository** | Twenty CRM activity timeline (AGPL — UX reference); ERPNext audit trail (GPL — data model) |
| **FT Portal Module** | Timeline and Audit |
| **Why It Matters** | The playbook states every significant event must appear in the Timeline. This is the accountability layer. |
| **Estimated Complexity** | Medium — 3-4 days for timeline component + event logging hooks |
| **Dependencies** | Implemented at backend; all modules must emit timeline events |
| **Suggested Phase** | Phase 2+ (add timeline events as each module is built) |

---

## Could-Have Later

These are important but can be implemented in later phases.

---

### 17. Saudi Factory Workspace with 30-Day Rule

| Field | Value |
|---|---|
| **Feature / Pattern** | Per-vehicle-line workspace: BOQ upload, BOM upload, GA Drawing upload (with versioning), Required Manhours, progress percentage, Raw Material Requests pending, 30-day staleness alert |
| **Source Repository** | ERPNext Work Order / BOM (GPL — data model reference) |
| **FT Portal Module** | Saudi Factory |
| **Why It Matters** | Factory team needs a dedicated workspace linked to WO for each vehicle line. The 30-day rule requires a background job checking last update timestamps. |
| **Estimated Complexity** | Medium-High — 5-6 days for workspace + 2 days for 30-day rule background job |
| **Dependencies** | WO Gate, file upload service, background job system |
| **Suggested Phase** | Phase 6 — Factory / Dubai / AFS |

---

### 18. Dubai Projects + AFS Workspace

| Field | Value |
|---|---|
| **Feature / Pattern** | PN-linked Dubai project tracking: PO from Saudi to Dubai, ETA per vehicle line, Dubai status, AFS arrival report, pre-delivery report, missing items, delivery readiness |
| **Source Repository** | ERPNext (GPL — reference); refine |
| **FT Portal Module** | Dubai Projects and AFS |
| **Why It Matters** | Dubai route is a parallel execution path to Saudi. AFS team needs their own workspace. |
| **Estimated Complexity** | Medium-High — 5-6 days |
| **Dependencies** | PN Gate, Store module |
| **Suggested Phase** | Phase 6 — Factory / Dubai / AFS |

---

### 19. AFS Maintenance Requests (Post-Delivery)

| Field | Value |
|---|---|
| **Feature / Pattern** | Create maintenance request linked to delivered SO; AFS inspects, logs issue, tracks parts / repair, closes |
| **Source Repository** | Plane issue tracking (AGPL — UX reference); ERPNext Maintenance (GPL — reference) |
| **FT Portal Module** | AFS Maintenance |
| **Why It Matters** | Post-delivery maintenance must be linked to the original project for full traceability. |
| **Estimated Complexity** | Medium — 3-4 days |
| **Dependencies** | SO / Project, AFS workspace |
| **Suggested Phase** | Phase 9 — After Sales |

---

### 20. SLA Engine with Escalation

| Field | Value |
|---|---|
| **Feature / Pattern** | Configurable SLA rules table; background job that evaluates all open records against SLA conditions; sends notifications at Level 1, 2, 3, 4 |
| **Source Repository** | Novu (MIT SDK); Inngest / Trigger.dev (BSL — architecture reference); BullMQ (MIT) for implementation |
| **FT Portal Module** | SLA, Escalation, Notifications |
| **Why It Matters** | The SLA engine is the automation layer that prevents delays from going unnoticed. 8 SLA rules defined in the playbook. |
| **Estimated Complexity** | High — 8-10 days for full SLA engine, notification routing, and escalation chain |
| **Dependencies** | All operational modules must be complete; notification service |
| **Suggested Phase** | Phase 10 — Operational Excellence |

---

### 21. Operations Control Tower Dashboard

| Field | Value |
|---|---|
| **Feature / Pattern** | 9-tile dashboard with real-time counts; each tile links to pre-filtered list; auto-refresh every 30s; critical issues highlighted |
| **Source Repository** | Appsmith (Apache 2.0 — UX reference); refine for implementation |
| **FT Portal Module** | Operations Control Tower |
| **Why It Matters** | Daily command center for Admin and Operations Manager. The most visible page in the system. |
| **Estimated Complexity** | Medium — 4-5 days once all underlying modules are working |
| **Dependencies** | All modules must be implemented; SLA data available |
| **Suggested Phase** | Phase 10 — Operational Excellence |

---

### 22. Notification Center (In-App)

| Field | Value |
|---|---|
| **Feature / Pattern** | Bell icon in header with unread count; notification list: title, type, link-to-record, timestamp, read/unread state |
| **Source Repository** | Novu Notification Center (MIT) |
| **FT Portal Module** | SLA, Escalation, Notifications |
| **Why It Matters** | Users need in-app alerts for SLA breaches, approval requests, and escalations without leaving the portal. |
| **Estimated Complexity** | Low-Medium — Novu SDK integrates as a React component; custom build takes 2-3 days |
| **Dependencies** | SLA engine, user authentication |
| **Suggested Phase** | Phase 10 — Operational Excellence |

---

### 23. Reports and KPI Export

| Field | Value |
|---|---|
| **Feature / Pattern** | 7 report categories from playbook; each report: filter by date range, status, project, export to CSV; summary KPI widgets |
| **Source Repository** | refine (MIT) for data grids; ERPNext (GPL — reference) for report category inspiration |
| **FT Portal Module** | Reports and KPIs |
| **Why It Matters** | Management needs operational visibility into quotation turnaround, procurement delays, QC rejection rates, etc. |
| **Estimated Complexity** | Medium-High — 6-8 days for all 7 report categories |
| **Dependencies** | All operational modules |
| **Suggested Phase** | Phase 10 — Operational Excellence |

---

### 24. Excel Upload for Raw Material Requests (Current Phase)

| Field | Value |
|---|---|
| **Feature / Pattern** | File upload for Production raw material Excel files; store with metadata (project/WO, stock, request type, remarks, file type, status) |
| **Source Repository** | refine file upload pattern |
| **FT Portal Module** | Raw Material Requests and Excel Upload |
| **Why It Matters** | Production team uses Excel for material lists. System must accept, store, and link files now, even before the parser is built. |
| **Estimated Complexity** | Low-Medium — 2-3 days for upload + metadata storage |
| **Dependencies** | File storage service, WO Gate |
| **Suggested Phase** | Phase 6 — Factory / Dubai / AFS |

---

## Reference Only

These items are valuable to study but will not be implemented as code from their reference sources.

---

### 25. ERPNext BOM/BOQ Data Model

| Field | Value |
|---|---|
| **Feature / Pattern** | ERPNext Bill of Materials structure: parent item, BOM items (item code, qty, unit, rate), BOM version, BOM status |
| **Source Repository** | ERPNext (GPL v3 — reference only) |
| **FT Portal Module** | Saudi Factory (BOQ/BOM management) |
| **Why It Matters** | Understanding ERPNext's BOM model helps design the FT Portal's BOQ/BOM schema correctly. |
| **Estimated Complexity** | Study only — implementation from scratch |
| **Dependencies** | None — reference study task |
| **Suggested Phase** | Before Phase 6 |

---

### 26. Twenty CRM Record View Layout

| Field | Value |
|---|---|
| **Feature / Pattern** | Record page layout: title header, status bar, property panels, related records section, activity timeline, action bar |
| **Source Repository** | Twenty CRM (AGPL v3 — UX inspiration only) |
| **FT Portal Module** | Project detail page, Supplier detail page, any detail view |
| **Why It Matters** | The project detail page (SO + vehicle lines + documents + timeline) needs a clear information architecture. Twenty CRM's record view is an excellent model. |
| **Estimated Complexity** | Study only — implement with shadcn/ui components |
| **Dependencies** | shadcn/ui |
| **Suggested Phase** | Before Phase 2 |

---

### 27. Inngest Durable Function Pattern

| Field | Value |
|---|---|
| **Feature / Pattern** | Define a background job as a durable function: step-by-step execution with automatic retry, idempotency, structured logging |
| **Source Repository** | Inngest (BSL 1.1 — architecture reference only) |
| **FT Portal Module** | SLA Engine, 30-Day Factory Rule, Excel Parser (future) |
| **Why It Matters** | Understanding how to structure durable functions will improve the FT Portal's background job reliability. Implement using BullMQ (MIT) with the same pattern. |
| **Estimated Complexity** | Study only — implement with BullMQ |
| **Dependencies** | BullMQ, Redis |
| **Suggested Phase** | Before Phase 10 |

---

## Avoid

Items that should not be pursued.

---

### 28. Self-Hosted Novu Server

| Field | Value |
|---|---|
| **Why to Avoid** | AGPL v3 license. Self-hosting Novu with FT Portal code integrated triggers full source disclosure obligation. |
| **Alternative** | Use Novu's MIT SDK (Notification Center component), Novu Cloud, or build a simple custom notification service. |

---

### 29. Copying ERPNext Python Code

| Field | Value |
|---|---|
| **Why to Avoid** | GPL v3 license. Any copy of ERPNext code into the FT Portal codebase creates GPL contamination risk. |
| **Alternative** | Study ERPNext's logic and rewrite everything from scratch, using ERPNext as a business requirement reference. |

---

### 30. Using Inngest or Trigger.dev in Production

| Field | Value |
|---|---|
| **Why to Avoid** | BSL 1.1 — commercial production use of current versions is not permitted without a commercial license. |
| **Alternative** | BullMQ (MIT) for job queues, pg-boss (MIT) for PostgreSQL-based scheduled jobs. |

---

## Implementation Phase Summary

| Phase | Key Items from This Backlog |
|---|---|
| 1 — Foundation | #1 (shadcn/ui), #2 (refine), #3 (RBAC), #4 (Master Data), #7 (Status Badges) |
| 2 — Project Core | #5 (SO Registration), #6 (Approval/Routing), #16 (Timeline — start wiring events) |
| 3 — Quotation | #8 (Quotation Workflow) |
| 4 — WO/PN Gate | #9 (WO/PN Gate with blocking) |
| 5 — Procurement | #10 (Procurement Queue), #11 (Supplier Registry) |
| 6 — Factory/Dubai/AFS | #17 (Saudi Factory), #18 (Dubai/AFS), #24 (Excel Upload) |
| 7 — Store/Custody | #12 (Store Receiving + Vehicle), #13 (Serial Tracking) |
| 8 — QC/Release | #14 (QC + NCR + Release Note), #15 (CAPA) |
| 9 — After Sales | #19 (AFS Maintenance) |
| 10 — Excellence | #20 (SLA Engine), #21 (Control Tower), #22 (Notification Center), #23 (Reports) |
