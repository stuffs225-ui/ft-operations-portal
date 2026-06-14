# Analysis 02 — FT Operations Portal Module-to-Reference Mapping

**Purpose:** Map every FT Operations Portal module to the reference repositories that best inform its design, patterns, data model, or UX, with specific guidance on what to extract from each.

---

## Module 1 — Design System and UI Foundation

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **shadcn/ui** | Full component library: Button, Input, Table, Badge, Dialog, Sheet, Form, Select, DatePicker, Command, Popover, Tooltip, Separator, Card | Consistent, accessible, customizable UI across all 25+ modules | Use now |
| **refine** | Theme integration with shadcn/ui, layout shell, sidebar navigation | Admin layout that wraps all role-specific workspaces | Use now |
| **Appsmith** | Dashboard card layout and widget grid for Control Tower | Compact multi-KPI dashboard layout | UX reference |
| **Twenty CRM** | Workspace chrome: top navigation, sidebar, workspace switcher | Modern SaaS navigation pattern | UX reference |

**Recommendation:** Establish the Tailwind design token system (colors, spacing, typography) first. Adopt shadcn/ui as the component baseline. Build the role-based layout shell with refine.

---

## Module 2 — Admin / Users / Roles / Permissions

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **refine** | `usePermissions`, `CanAccess`, `authProvider`, `accessControlProvider` | Fine-grained RBAC: Admin sees everything, Store User sees no financial values | Use now |
| **react-admin** | `authProvider`, `useGetPermissions`, conditional rendering | Alternative permission pattern | Reference |
| **ERPNext** | Role + permission table model (each DocType has role-based permission rows) | Data model for permission definition | Data model reference |

**Roles to implement (from playbook):**
- Admin (full access)
- Operations Manager
- Sales User
- Sales Coordinator
- Procurement User
- Factory / Production User
- Store User
- QC User
- AFS User
- Viewer / Management

**Recommendation:** Use refine's `accessControlProvider` to implement role-based screen access. Enforce permissions at API level (not just UI). Map each route and API endpoint to the role matrix from the playbook.

---

## Module 3 — Sales Workspace

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Twenty CRM** | Workspace layout, pipeline columns, record list with action bar | Sales can see Hot Projects pipeline, Quotation Requests, and My Projects | UX reference |
| **refine** | Resource-based list views, custom data providers | Sales workspace as a set of filtered resource views per Sales user | Use now |
| **react-admin** | Filtered list views, TabbedShowLayout for project detail | Quotation Requests → Pending → Returned → Converted tabs | Reference |

**Pages to build (from playbook):**
- Quotation Requests (filtered to Sales user's requests)
- Hot Projects (pipeline / opportunity board)
- SO Registration
- Invoicing Plan
- Aging
- My Projects

---

## Module 4 — Quotation Management

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Quotation DocType: customer, items, quantities, prices, specification attachment, validity date, status machine | Data model for the Quotation Request entity | Data model reference |
| **refine** | Create form with file upload, line item table, status display | Quotation request creation and tracking UI | Use now |
| **shadcn/ui** | DataTable for quotation line items, FileUpload pattern, Badge for status | Line-level quotation value display, status badges | Use now |

**Key data fields (from playbook):**
- Customer / Entity Name
- Requested Vehicles / Items
- Quantities
- Specification Files
- Linked Hot Project (optional)
- Quotation Number (filled by Coordinator)
- Quotation PDF (uploaded by Coordinator)
- Quotation Value per Line (filled by Coordinator)
- Validity Date
- Status: Draft → Pending Estimation → Returned → Converted

---

## Module 5 — Sales Coordinator Workspace

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **refine** | Queue-based list views (Pending, Need Clarification, Returned, History tabs) | Coordinator sees all requests organized by state | Use now |
| **Plane** | Triage queue: priority, assignee, state filter, action toolbar | Queue management UX for Coordinator handling of requests | UX reference |
| **react-admin** | TabbedDatagrid, bulk action bar | Processing multiple quotation requests at once | Reference |

**Pages (from playbook):**
- Coordinator Dashboard
- Quotation Requests (queue)
- Pending Estimation
- Need Clarification
- Returned Quotations
- Quotation History

---

## Module 6 — SO Registration

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Sales Order: SO Number, Customer, Date, PO/Contract, Line Items (vehicle type, qty, line value, line status), Total, Approval Status | The primary data model for an SO | Data model reference |
| **refine** | Create/Edit form for SO, DataTable for vehicle lines | SO creation UI with vehicle line management | Use now |
| **shadcn/ui** | Multi-step form pattern, DataTable with editable rows, Dialog for line editing | Complex form with vehicle line items | Use now |

**Data fields (from playbook):**
- SO Number (system-generated)
- Customer
- Sales Owner
- PO / Contract (upload)
- Total Value
- Delivery Date
- Saudi / Dubai route selection
- Medical Yes / No
- Vehicle Lines (Vehicle Type, Quantity, Line Value, Line Status)

---

## Module 7 — Approval and Routing Engine

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Approval workflow with condition-based routing, submit/cancel/amend cycle | Stage-gate SO approval triggering routing and next tasks | Workflow reference |
| **refine** | Optimistic update on approve/reject, role-based action buttons | Admin approval UI with route selection | Use now |
| **Plane** | State machine transitions with guards (can only move to next state if conditions met) | Blocking rule implementation pattern | Workflow reference |

**Routing Matrix (from playbook):**

| Saudi + Medical | → WO + Procurement + Saudi Factory + Store + Material QC + Vehicle QC |
| Saudi + No Medical | → WO + Saudi Factory + Store + Vehicle QC when needed |
| Dubai + Medical | → PN + Dubai Management + AFS + Medical follow-up |
| Dubai + No Medical | → PN + Dubai Management + AFS |

---

## Module 8 — WO/PN Gate

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Work Order creation linked to Sales Order, status blocking gates | WO creation model and SO-WO linkage | Data model reference |
| **refine** | Conditional action visibility (WO entry only available for approved Saudi SO) | Block factory workspace until WO is entered | Use now |
| **Plane** | Blocking state transitions | System-enforced gate: cannot proceed without WO/PN number | Workflow reference |

**Gate Rules (from playbook):**
- Factory cannot enter BOQ, BOM, Drawings, or Raw Material Requests until WO is created
- Dubai management cannot track ETA or AFS readiness until PN is created
- WO/PN creation triggers the execution workflow for that route

---

## Module 9 — Procurement and PO Approval

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Purchase Requisition → Purchase Order flow, item-level PR, high-value PO approval, ETA field, Supplier selection | Full procurement data model and workflow | Data model + workflow reference |
| **refine** | CRUD for PR, PO with file upload, approval status badge, conditional approval action | Procurement queue with one-click approve/reject | Use now |
| **shadcn/ui** | Badge for PO status (Pending Approval, Approved, Rejected), DataTable for PR items | Procurement list views with visual status | Use now |

**High-Value PO Approval Rule:** Any PO > 10,000 SAR must be approved by Admin or Operations Manager before being marked as Sent to Supplier.

**ETA Change Rule:** Procurement must record both Old ETA and New ETA with reason when ETA changes.

---

## Module 10 — Approved Suppliers

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Supplier master with categories, contact, payment terms, approved materials, quality notes, blacklist status | Comprehensive supplier data model | Data model reference |
| **refine** | Supplier list with status filter, create/edit form, QC notes section | Supplier registry with quick status management | Use now |
| **shadcn/ui** | Status badge (Draft, Pending Review, Approved, Suspended, Blacklisted) with color coding | Visual supplier status indicators | Use now |

**Supplier States:** Draft → Pending Review → Approved / Approved with Conditions / Suspended / Blacklisted

---

## Module 11 — Saudi Factory

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Work Order with BOM lines, material requirements, production progress tracking, BOQ management | Manufacturing workspace data model | Data model reference |
| **refine** | Per-vehicle-line detail panel with file management (BOQ, BOM, Drawings uploads) | Factory workspace with line-level tracking | Use now |
| **shadcn/ui** | FileUpload pattern with version tracking, Progress indicator for production percentage, DataTable for BOM items | Manufacturing document management UI | Use now |

**30-Day Rule:** Every vehicle line must be updated at least every 30 days or it appears as "Monthly Update Required" in the Control Tower. Implement via a background job (BullMQ) checking last_update timestamps.

---

## Module 12 — Dubai Projects and AFS

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Purchase Order tracking, delivery follow-up, arrival reporting | Dubai project tracking data model | Data model reference |
| **refine** | Per-vehicle-line ETA tracking, status timeline, arrival report upload | Dubai management workspace | Use now |
| **Twenty CRM** | Timeline view showing project events (PN created, Dubai PO sent, ETA confirmed, vehicle arrived) | Activity timeline for Dubai project | UX reference |

**AFS Role (from playbook):** Record vehicle arrival, file Arrival Report, file Pre-delivery Report, record Missing Items, receive materials from Store when needed, record delivery readiness.

---

## Module 13 — Store and Warehouse

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Stock Entry, Warehouse model, Material Receipt (linked to PO), Inventory Search, Material Issue, Batch Tracking | Full warehouse management data model | Data model reference |
| **refine** | Inventory search with multi-field filter (Item Code, Serial Number, Project), DataTable for stock items | Inventory management UI | Use now |
| **shadcn/ui** | SearchCommand for inventory lookup, DataTable with status column | Fast inventory search UI | Use now |

**Store Functions (from playbook):** Material Receiving (linked to PR/PO), Vehicle Receiving, Inventory Search, Material Issuance, Temporary Custody.

---

## Module 14 — Material Custody

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Material Transfer with acceptance, custody states, installation update | Custody state machine model | Data model reference |
| **Plane** | State machine with approval gates (Pending Approval → Issued → Pending Acceptance → In Custody) | Custody workflow with blocking at each gate | Workflow reference |
| **refine** | Custody list view with status filter, approval action button, receiver confirmation UI | Material custody management screen | Use now |

**Custody States:** In Store → Reserved → Pending Approval → Issued → Pending Acceptance → In Custody → Installed / Returned / Consumed / Lost/Damaged

---

## Module 15 — Vehicle Receiving

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Purchase Receipt with serial number, condition, photos | Vehicle receipt data model | Data model reference |
| **refine** | Create form with multi-photo upload, chassis number field, condition selector | Vehicle receiving form | Use now |
| **shadcn/ui** | Photo upload grid (multiple images), required field validation, completion checklist | Photo-required UI with mandatory chassis field | Use now |

**Data Quality Rule (from playbook):** Vehicle receipt is not complete without Chassis Number and basic photos. System must block completion without these.

---

## Module 16 — Medical Serial Tracking

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Serial Number tracking: unique serial per item, linked to purchase, QC, warehouse, installation | Medical item serial tracking data model | Data model reference |
| **refine** | Serial register view with search by serial number, linked QC status, custody location | Medical item serial tracking UI | Use now |
| **shadcn/ui** | SearchCommand for serial number lookup, status badge for QC status | Quick serial number lookup | Use now |

**Fields (from playbook):** Serial Number, Batch Number / Expiry, Supplier / Manufacturer, QC Status, Current Custody, Installed On Vehicle.

---

## Module 17 — Raw Material Requests and Excel Upload

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Material Request DocType (linked to Work Order or stock replenishment) | Raw material request data model | Data model reference |
| **refine** | Create form with Project/WO selector, file upload for Excel, status tracking | Raw material request creation and tracking | Use now |
| **Inngest / Trigger.dev** | File processing job pattern (receive file → validate → parse → output records) | Future Excel parsing job architecture | Architecture reference |

**Future Phase:** Excel parser job that extracts item lines from uploaded files to create BOQ/BOM or PR Items automatically. Design the file storage schema with metadata now so the parser can be added later without data redesign.

---

## Module 18 — Quality Control

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Quality Inspection DocType, NCR (Non-Conformance Report), Corrective Action | QC inspection data model, NCR structure | Data model reference |
| **Plane** | Issue creation from inspection finding, state machine for NCR resolution, CAPA tracking | NCR as an issue type with CAPA fields | Workflow + UX reference |
| **refine** | QC checklist form, inspection result entry, NCR create/resolve UI | QC workspace | Use now |
| **shadcn/ui** | Checklist component (checkbox items), Badge for pass/fail/rework, file upload for QC evidence | QC inspection form UI | Use now |

**QC Objects (from playbook):**
- Material QC Task (after Store Receipt)
- Material NCR (if rejected)
- Vehicle QC Inspection (after Production/AFS readiness)
- Release Note (after all observations closed)

---

## Module 19 — AFS Maintenance

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Plane** | Issue/ticket creation linked to a parent project, priority, assignee, resolution tracking | Post-delivery maintenance request as a ticket type | UX + workflow reference |
| **ERPNext** | Maintenance Request / Service Request linked to delivered Sales Order | Data model for post-delivery requests | Data model reference |
| **refine** | Create maintenance request form, list view with status filter | AFS maintenance request management | Use now |

---

## Module 20 — Documents and Checklist Engine

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Attachment model (linked to any DocType), File versioning, Document status | Document control data model | Data model reference |
| **refine** | File upload component per record type, document status tracking | Document management per project/PO/vehicle | Use now |
| **shadcn/ui** | FileUpload, Badge for document status, Table for document list view | Document management UI components | Use now |

**Document Status Machine:** Uploaded → Under Review → Approved / Rejected → Superseded / Expired

---

## Module 21 — Risks, Issues, Root Cause, CAPA

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Plane** | Issue model: title, description, type, priority, status, assignee, due date, linked project, root cause, corrective action, evidence | CAPA record structure | Data model + UX reference |
| **ERPNext** | Corrective Action / Preventive Action fields in Quality module | CAPA fields: Root Cause, Corrective Action, Preventive Action, Evidence, Closure Approval | Data model reference |
| **refine** | Issue list with status/priority filter, create form with CAPA fields | CAPA management screen | Use now |
| **shadcn/ui** | Priority badge (Critical, High, Medium, Low), status badge (Open, In Progress, Resolved, Closed) | CAPA status and priority display | Use now |

---

## Module 22 — SLA, Escalation, Notifications

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Novu** | Notification workflow: trigger event → route to channels (in-app, email, SMS) → templated message | SLA breach notification architecture | Architecture + MIT SDK |
| **Inngest / Trigger.dev** | Durable scheduled function: check SLA condition → if breached → send notification → escalate | SLA checker job pattern | Architecture reference |
| **Plane** | Priority escalation: Urgent priority auto-escalates, overdue indicators | SLA urgency display in Control Tower | UX reference |

**SLA Rules to implement (from playbook — 8 conditions with escalation chains):**

Implement with:
1. A background job (BullMQ/MIT) that runs every N minutes checking for SLA breaches
2. A notification service (Novu SDK/MIT or custom) that routes alerts to the right users
3. An escalation chain: assigned user → dept manager → ops manager → senior management

---

## Module 23 — Reports and KPIs

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **refine** | Custom report pages using `useList` with filters, DataTable export, date range pickers | Flexible report views per category | Use now |
| **react-admin** | Datagrid with exportable data, complex filter combinations | Alternative report datagrid with CSV export | Reference |
| **Appsmith** | KPI card layout, chart widget placement, metric tiles | Control Tower and dashboard KPI layout | UX reference |
| **ERPNext** | Report types: List Report, Summary Report, Pivot, Script Report | Report category classification model | Reference |

---

## Module 24 — Data Quality and Master Data

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **ERPNext** | Master data management: Items, Customers, Suppliers, Warehouses, Document Types | Master data entity list and admin management | Data model reference |
| **refine** | Admin CRUD screens for master data (Vehicle Types, Material Categories, Supplier Categories, SLA Rules) | Master data management UI | Use now |
| **shadcn/ui** | Form validation with error states, required field marking, block-on-invalid pattern | Data quality enforcement at form level | Use now |

---

## Module 25 — Timeline and Audit

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Twenty CRM** | Activity timeline: events, notes, file uploads displayed chronologically per record | Project timeline showing all events from Quotation to Delivery | UX reference |
| **ERPNext** | Audit log: field-level change tracking with old value, new value, user, timestamp | Audit log data model | Data model reference |
| **Plane** | Activity feed per issue: state changes, comments, file uploads with timestamps | Audit activity feed per CAPA or issue | UX reference |
| **refine** | Timeline component or custom timeline built with shadcn | Project timeline display | Use now |

---

## Module 26 — Operations Control Tower

| Reference | Pattern to Take | Expected Benefit | Priority |
|---|---|---|---|
| **Appsmith** | Dashboard card grid: metric tiles with drill-down links | Control Tower card layout for 9 KPI categories | UX reference |
| **Twenty CRM** | Workspace command center: cross-entity status overview | Modern SaaS operations overview | UX reference |
| **refine** | Custom dashboard page with multiple `useList` hooks for real-time data | Dynamic Control Tower pulling live data | Use now |
| **shadcn/ui** | Card component, Badge for counts, Alert for critical issues | Control Tower UI components | Use now |
| **Novu** | In-app notification bell with unread count | Notification center in Control Tower header | MIT SDK |

**Control Tower sections (from playbook):**
- Pending Quotations
- SO without WO
- SO without PN
- PO Approval Pending (>10,000 SAR)
- Materials in Custody
- Vehicle Receiving Issues
- Raw Material Requests (open)
- QC Rework (unclosed)
- Critical Issues (escalated)

---

## Priority Matrix Summary

| Module | Primary Reference | Use Now | Use Later | Reference Only |
|---|---|---|---|---|
| Design System | shadcn/ui | ✓ | | |
| Admin / Roles | refine | ✓ | | |
| Sales Workspace | refine + Twenty CRM | ✓ (refine) | | ✓ (Twenty) |
| Quotation Management | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Sales Coordinator | refine + Plane | ✓ (refine) | | ✓ (Plane) |
| SO Registration | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Approval / Routing | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| WO/PN Gate | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Procurement | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Approved Suppliers | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Saudi Factory | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Dubai / AFS | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Store / Warehouse | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Material Custody | ERPNext + Plane | ✓ (refine) | | ✓ (ERPNext, Plane) |
| Vehicle Receiving | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Medical Serial | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Raw Material | ERPNext + refine | ✓ (refine) | ✓ (future parser) | ✓ (ERPNext) |
| QC | ERPNext + Plane | ✓ (refine) | | ✓ (ERPNext, Plane) |
| AFS Maintenance | Plane + ERPNext | ✓ (refine) | | ✓ (Plane, ERPNext) |
| Documents / Checklists | ERPNext + refine | ✓ (refine) | | ✓ (ERPNext) |
| Risks / CAPA | Plane + ERPNext | ✓ (refine) | | ✓ (Plane, ERPNext) |
| SLA / Escalation / Notifications | Novu + Inngest | | ✓ (Phase 10) | ✓ (Inngest architecture) |
| Reports / KPIs | refine + ERPNext | | ✓ (Phase 10) | ✓ (ERPNext) |
| Data Quality / Master Data | ERPNext + refine | ✓ (Phase 1) | | ✓ (ERPNext) |
| Timeline / Audit | Twenty CRM + ERPNext | | ✓ (Phase 2+) | ✓ (both) |
| Control Tower | Appsmith + refine | | ✓ (Phase 10) | ✓ (Appsmith) |
