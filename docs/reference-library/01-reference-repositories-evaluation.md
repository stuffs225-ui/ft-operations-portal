# Analysis 01 — Reference Repositories Evaluation

**Purpose:** Evaluate the 10 selected external repositories for fitness, license compliance, and recommended usage in the FT Operations Portal context.

---

## Executive Summary

The FT Operations Portal is a complex, custom operational system covering vehicle project management from quotation through delivery and after-sales. It requires a strong **UI component foundation**, a proven **admin/CRUD framework**, **ERP-grade workflow patterns** for procurement and manufacturing, and **background job / notification infrastructure** for SLA enforcement.

After evaluating 10 repositories:

- **2 repositories are directly usable** as component libraries or frameworks (shadcn/ui, refine)
- **1 repository is directly usable** as an alternative admin framework (react-admin)
- **2 repositories are architecture/workflow references** with direct ERP relevance (ERPNext, Twenty CRM) — restricted licenses prevent code copying
- **2 repositories are operational pattern references** (Plane for issues/CAPA, Appsmith for dashboards)
- **2 repositories are infrastructure references** for background jobs (Inngest, Trigger.dev) — BSL licenses apply
- **1 repository is a notification infrastructure reference** (Novu)

No production FT Operations Portal code has been changed as part of this analysis.

---

## Repository Evaluation Matrix

### 1. shadcn/ui

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/shadcn-ui/ui |
| **License** | MIT |
| **Tech Stack** | React, TypeScript, Tailwind CSS, Radix UI primitives |
| **Maturity** | Very high — 80k+ GitHub stars, industry standard for React/Tailwind UIs |
| **Main Purpose** | Copy-paste component library: buttons, dialogs, tables, forms, badges, selects, calendars, tooltips |

**FT Operations Portal Modules:**
All modules — this is the UI foundation layer. Every screen in the portal (quotation forms, SO registration, procurement tables, store inventory, QC checklists, control tower dashboard) needs a consistent component set.

**What to Use:**
- **Direct Code** — Components can be copied and customized under MIT license
- Table component (for vehicle lines, procurement items, material lists)
- Form components (for quotation request, SO registration, PO entry)
- Dialog / Sheet (for approval flows, document upload, issue creation)
- Badge (for status indicators: Draft, Pending, Approved, In Custody, etc.)
- Command palette (for quick navigation in Control Tower)
- Calendar / Date picker (for SLA dates, ETA, delivery dates)

**Fit Score:** 5/5  
**Priority:** Use now  
**Key Risks:** None — MIT license, actively maintained, well-documented  
**Recommendation:** Adopt as the primary UI component library for all FT Operations Portal screens. Begin with the core components (Button, Input, Table, Badge, Dialog, Form, Select, DatePicker) and build the design token system around Tailwind + shadcn.

---

### 2. refine

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/refinedev/refine |
| **License** | MIT |
| **Tech Stack** | React, TypeScript, supports any UI library (shadcn, Ant Design, MUI, Chakra) |
| **Maturity** | High — 30k+ stars, actively maintained, production-used by many internal tool teams |
| **Main Purpose** | Framework for building admin panels, CRUD-heavy internal tools, and resource management applications |

**FT Operations Portal Modules:**
- Admin / Users / Roles (user management, permission assignment)
- Sales Coordinator Workspace (quotation request queue management)
- Procurement and PO Approval (PR list, PO list, approval workflows)
- Approved Suppliers (supplier CRUD with status management)
- Store and Warehouse (inventory management, material receiving)
- Material Custody (issuance tracking)
- Vehicle Receiving (chassis registration)
- Raw Material Requests (request queue)
- Reports and KPIs (data grid views)

**What to Use:**
- **Framework Pattern** — The resource/data provider/CRUD model maps well to FT Portal's entities (Projects, Quotations, POs, Materials, Vehicles)
- List/show/create/edit/delete resource pattern for operational records
- Data provider abstraction for connecting to the FT Portal backend API
- Access control (RBAC) pattern for role-based screens
- Real-time data synchronization for Control Tower
- Optimistic updates for fast table interactions

**Fit Score:** 5/5  
**Priority:** Use now  
**Key Risks:** Learning curve for framework abstractions; ensure backend API is RESTful or GraphQL compatible with refine data providers  
**Recommendation:** Strong candidate for the FT Portal frontend framework. Combine with shadcn/ui for the component layer. refine handles routing, data fetching, access control, and CRUD — shadcn handles the visual component layer.

---

### 3. react-admin

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/marmelab/react-admin |
| **License** | MIT |
| **Tech Stack** | React, TypeScript, Material UI (default), supports custom UI |
| **Maturity** | Very high — 25k+ stars, 10+ years of active development, enterprise production use |
| **Main Purpose** | Admin framework: lists, filters, create/edit/show screens, permissions, relationships |

**FT Operations Portal Modules:**
- Admin / Users / Roles
- Quotation Management (list views, filtered queues)
- Procurement and PO Approval
- Approved Suppliers
- Reports and KPIs

**What to Use:**
- **Framework Pattern** — Alternative or complement to refine
- Datagrid patterns for complex operational tables
- Filter sidebar pattern for querying projects, materials, suppliers
- Show/Edit page pattern for detail views
- Permission system (authProvider) for role-based screen access

**Fit Score:** 4/5  
**Priority:** Reference pattern — evaluate against refine and choose one primary framework  
**Key Risks:** Material UI as default may require theming effort if shadcn/ui is the chosen UI system; both refine and react-admin provide similar capabilities — choose one rather than both  
**Recommendation:** Study the datagrid, filter, and permission patterns. If the team is more familiar with react-admin, it is a viable alternative to refine. Avoid using both simultaneously as they overlap significantly.

---

### 4. ERPNext / Frappe

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/frappe/erpnext |
| **License** | GPL v3 |
| **Tech Stack** | Python (Frappe framework), Vue.js frontend, MariaDB |
| **Maturity** | Very high — 22k+ stars, 15+ years of production use, hundreds of enterprise deployments |
| **Main Purpose** | Full ERP: sales, purchasing, manufacturing, stock, quality, HR, accounting |

**FT Operations Portal Modules:**
- Quotation Management (ERPNext Quotation → Sales Order workflow is almost identical)
- Sales Coordinator Workspace (ERPNext sales desk patterns)
- SO Registration (Sales Order creation, customer/item/line model)
- Approval and Routing Engine (ERPNext approval workflows and condition-based routing)
- WO/PN Gate (ERPNext Work Order concept for manufacturing)
- Procurement and PO Approval (PR → PO → Supplier flow)
- Approved Suppliers (supplier master, qualification)
- Saudi Factory (ERPNext Production Orders, BOQ/BOM management)
- Store and Warehouse (ERPNext Warehouse, Stock Entry, Material Request)
- Material Custody (ERPNext Material Transfer, Batch tracking)
- Vehicle Receiving (ERPNext Purchase Receipt with serial tracking)
- Medical Serial Tracking (ERPNext Serial Number tracking)
- Quality Control (ERPNext Quality Inspection, NCR analogs)
- Data Quality and Master Data (ERPNext masters: Items, Suppliers, Customers, Warehouses)

**What to Use:**
- **Data Model Reference** — Study ERPNext's Sales Order → Work Order → Material Request → Purchase Order chain
- **Workflow Pattern** — Stage-gate transitions, approval levels, document status machine
- **Architecture Reference** — How ERPNext separates transactional documents from masters
- **Inspiration Only** for code — GPL v3 prohibits copying into the production system

**Fit Score:** 5/5 (as reference — the closest business domain match in this list)  
**Priority:** Reference only (GPL license prevents code extraction)  
**Key Risks:** GPL v3 license — copying any code into the FT Portal (even small snippets) risks GPL contamination of the entire codebase. Legal approval required for any direct use.  
**Recommendation:** Study ERPNext's data model, status machines, approval workflow, and warehouse management patterns. This is the most operationally similar reference in the list. Use it as the primary business logic reference — but write all FT Portal code from scratch inspired by, not copied from, ERPNext.

---

### 5. Twenty CRM

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/twentyhq/twenty |
| **License** | AGPL v3 |
| **Tech Stack** | React (frontend), NestJS (backend), PostgreSQL, TypeScript |
| **Maturity** | Growing — 24k+ stars, modern architecture, active development |
| **Main Purpose** | Modern CRM: customer records, opportunity tracking, object views, workspace UX |

**FT Operations Portal Modules:**
- Sales Workspace (workspace layout, pipeline view)
- Quotation Management (opportunity-to-quotation conversion patterns)
- Hot Projects (pipeline / active opportunities tracking)
- Sales Coordinator Workspace (task queue, request management)

**What to Use:**
- **UX Pattern** — The object record view layout (header, detail panels, timeline, related records) is excellent for FT Portal project detail pages
- **Architecture Reference** — Metadata-driven object model (interesting for future extensibility of FT Portal entities)
- **Inspiration Only** for code (AGPL v3)

**Fit Score:** 4/5  
**Priority:** Reference only (AGPL v3)  
**Key Risks:** AGPL v3 — copying code into a production SaaS or web application triggers copyleft for the entire application. Do not extract code. Study UX patterns only.  
**Recommendation:** Use as UX/design inspiration for the Sales Workspace and project detail pages. The record view layout with timeline, activity feed, and related objects sidebar is highly applicable to FT Portal's project view.

---

### 6. Plane

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/makeplane/plane |
| **License** | AGPL v3 |
| **Tech Stack** | React, Django (Python backend), PostgreSQL, Redis |
| **Maturity** | High — 32k+ stars, widely used as a Jira/Linear alternative |
| **Main Purpose** | Issue tracking, task management, triage, modules, cycles, sprints |

**FT Operations Portal Modules:**
- Risks, Issues, Root Cause, CAPA (Plane's issue model maps directly)
- SLA, Escalation, Notifications (Plane's priority, assignee, deadline model)
- Quality Control (NCR as issues, rework as sub-issues or states)
- Operations Control Tower (Plane's workspace overview / triage views)
- Timeline and Audit (Plane's activity log and timeline model)

**What to Use:**
- **Workflow Pattern** — Issue state machine (Open → In Progress → Resolved → Closed) with sub-statuses
- **UX Pattern** — Priority labels, status badges, assignee chips, due dates in list view
- **Data Model Reference** — Issue: title, description, type, priority, status, assignee, due date, linked project, root cause, corrective action, evidence
- **Inspiration Only** for code (AGPL v3)

**Fit Score:** 4/5  
**Priority:** Reference only (AGPL v3)  
**Key Risks:** AGPL v3 license. Study patterns only.  
**Recommendation:** Excellent reference for the CAPA module. The issue list view, detail view, state machine, and priority model are directly applicable to FT Portal's Risks/Issues/CAPA and NCR tracking. Extract the UX patterns and implement in FT Portal using shadcn/ui components.

---

### 7. Novu

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/novuhq/novu |
| **License** | MIT (SDK/Notification Center component), AGPL v3 (self-hosted server) |
| **Tech Stack** | React (Notification Center), NestJS (server), TypeScript |
| **Maturity** | High — 36k+ stars, widely adopted notification infrastructure |
| **Main Purpose** | Notification center, multi-channel notification workflows, in-app + email + SMS notifications |

**FT Operations Portal Modules:**
- SLA, Escalation, Notifications — the primary fit
- Operations Control Tower (in-app notification badge)
- Any SLA breach alert, escalation notification, approval request

**What to Use:**
- **Direct Code (MIT SDK)** — The Notification Center React component (MIT licensed) can be integrated into the FT Portal UI
- **Workflow Pattern** — Notification templates and trigger-based notification workflows
- **Architecture Reference** — How to separate notification logic from business logic using a notification service layer

**Fit Score:** 4/5  
**Priority:** Use later (after core CRUD and workflow are working)  
**Key Risks:** The SDK/Notification Center is MIT, but the self-hosted Novu server is AGPL. If hosting the Novu server internally, AGPL obligations may apply. Using Novu's cloud service avoids this but adds a vendor dependency. Alternatively, implement a simple custom notification service initially.  
**Recommendation:** Use Novu's notification workflow pattern as the design reference for FT Portal's SLA escalation system. If using a notification library, the MIT-licensed Notification Center component is fine. Plan the notification architecture early so SLA escalation can plug into it in Phase 10.

---

### 8. Inngest

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/inngest/inngest |
| **License** | Business Source License (BSL 1.1) — converts to Apache 2.0 after 4 years |
| **Tech Stack** | Go (server), TypeScript SDK |
| **Maturity** | Growing — 13k+ stars, modern serverless background job infrastructure |
| **Main Purpose** | Reliable background jobs, event-driven workflows, scheduled functions, retries |

**FT Operations Portal Modules:**
- SLA, Escalation — scheduled checks for SLA breaches
- 30-Day Factory Update Rule — scheduled reminder jobs
- Procurement ETA monitoring — scheduled checks
- Background report generation

**What to Use:**
- **Architecture Reference** — How to structure background jobs as event-driven workflows with retries and idempotency
- **Inspiration Only** for code (BSL — cannot use in commercial production currently)

**Fit Score:** 3/5  
**Priority:** Reference only (BSL license)  
**Key Risks:** BSL 1.1 prohibits direct commercial use of the current version. Older versions may have already converted to Apache 2.0 but the current version cannot be used.  
**Recommendation:** Use as architecture reference for the SLA scheduler design. Study how Inngest structures durable functions and event-driven job workflows. Implement FT Portal's SLA checker using a simpler open-source job queue (BullMQ/MIT, or pg-boss/MIT) using Inngest's patterns.

---

### 9. Trigger.dev

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/triggerdotdev/trigger.dev |
| **License** | Business Source License (BSL 1.1) — converts to Apache 2.0 after 4 years |
| **Tech Stack** | TypeScript, Node.js |
| **Maturity** | Growing — 12k+ stars, modern TypeScript-native background jobs |
| **Main Purpose** | Background jobs, long-running tasks, queues, retries, scheduled tasks in TypeScript |

**FT Operations Portal Modules:**
- SLA, Escalation (scheduled SLA checkers)
- Raw Material Request processing (background file parsing future feature)
- Excel Upload future parsing pipeline
- Procurement ETA tracking jobs

**What to Use:**
- **Architecture Reference** — TypeScript-native job definition patterns, retry logic, structured logging
- **Inspiration Only** for code (BSL)

**Fit Score:** 3/5  
**Priority:** Reference only (BSL license)  
**Key Risks:** Same as Inngest — BSL 1.1 prohibits current commercial use.  
**Recommendation:** Study the TypeScript job definition pattern and use it as inspiration when implementing the FT Portal's background job layer (likely using BullMQ or a similar MIT-licensed alternative).

---

### 10. Appsmith

| Field | Value |
|---|---|
| **GitHub URL** | https://github.com/appsmithorg/appsmith |
| **License** | Apache 2.0 (Community Edition) |
| **Tech Stack** | Java (backend), React (frontend), low-code builder |
| **Maturity** | Very high — 35k+ stars, widely used for internal tools |
| **Main Purpose** | Low-code platform for building internal dashboards and admin tools |

**FT Operations Portal Modules:**
- Operations Control Tower (dashboard layout inspiration)
- Reports and KPIs (widget-based dashboard design)
- Admin / Users / Roles (settings page layout)

**What to Use:**
- **UX Pattern** — Dashboard widget layout for the Control Tower view
- **Inspiration Only** for code (low-code platform, not relevant as code reference)

**Fit Score:** 3/5  
**Priority:** Reference only  
**Key Risks:** Appsmith is a low-code platform — the code is not relevant as a pattern library. Its UX dashboard patterns are useful but the FT Portal will be built as a custom application.  
**Recommendation:** Study the Appsmith dashboard widget layout for the Operations Control Tower design. The card-based dashboard with status counters and drill-down links is directly applicable. Implement this pattern using shadcn Card components.

---

## Direct-Use vs Inspiration-Only Classification

### Directly Usable (MIT / Apache 2.0 — code can be used or integrated)

| Repository | Usage Type | Notes |
|---|---|---|
| shadcn/ui | Direct component copy/integration | MIT — primary UI component library |
| refine | Framework integration | MIT — primary admin/CRUD framework |
| react-admin | Framework pattern reference | MIT — alternative to refine |
| Appsmith | Apache 2.0 — UX pattern reference | Low-code, not code-relevant |
| Novu (SDK only) | MIT component integration | Notification Center component only |

### Inspiration Only (GPL / AGPL / BSL — no code extraction)

| Repository | License | Usage Restriction |
|---|---|---|
| ERPNext | GPL v3 | No code copy — data model and workflow reference only |
| Twenty CRM | AGPL v3 | No code copy — UX and architecture reference only |
| Plane | AGPL v3 | No code copy — issue tracking UX and data model reference only |
| Novu (server) | AGPL v3 | No code copy — notification architecture reference only |
| Inngest | BSL 1.1 | No code copy — background job architecture reference only |
| Trigger.dev | BSL 1.1 | No code copy — TypeScript job pattern reference only |

---

## Final Recommendation

**For immediate UI and framework work:**
1. Adopt **shadcn/ui** as the UI component system
2. Adopt **refine** as the admin framework (or react-admin as an alternative)
3. Use **ERPNext** data model as the primary business workflow reference

**For SLA and notification infrastructure (Phase 10):**
4. Plan notification architecture based on **Novu** patterns (MIT SDK usable directly)
5. Plan background job architecture based on **Inngest/Trigger.dev** patterns (implement with BullMQ/MIT)

**For CAPA and issue module design:**
6. Use **Plane** as UX reference for the Risks/Issues/CAPA and NCR screens

**For Control Tower and dashboard design:**
7. Use **Appsmith** and **Twenty CRM** as UX reference for dashboard and workspace layouts
