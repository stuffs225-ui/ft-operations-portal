# FT Operations Portal — Governance Playbook Summary

**Source:** FT Operations Portal Governance Playbook v3.2 (Official Operating Reference)  
**Version:** v3.2 (Updated)  
**Audience:** Development team, reference library researchers, system architects

---

## Vision and Operating Intent

The FT Operations Portal transforms vehicle project tracking from emails, Excel sheets, and chat conversations into a **unified operational control center**.

**Goal:** Connect pre-sale, SO, WO/PN, Procurement, Factory, Store, AFS, QC, Delivery, and After-Sales into one system of record.

**The Golden Rule:** Any operational event not recorded in the system is not considered an official record for reporting, tracking, or performance measurement.

---

## Core Governance Principles

| Principle | Meaning |
|---|---|
| **Single Source of Truth** | Every project, quotation request, material, receipt, inspection, or document has one central record |
| **Line-Level Control** | Projects are managed at vehicle/item line level, not just at project header level |
| **Security Beyond UI** | Permissions enforced at both UI and database level — not just button hiding |
| **Stage-Gate Validation** | No phase transition without required data and mandatory documents |

---

## End-to-End Lifecycle

```
Quotation Request / Hot Project
        ↓
Sales Coordinator Processing
        ↓
Quotation Returned to Sales
        ↓
Convert to Hot Project or SO
        ↓
SO Registration and Admin Approval
        ↓
Route Decision: Saudi or Dubai + Medical Yes/No
        ↓
Saudi: Enter WO  /  Dubai: Enter PN
        ↓
Procurement, Factory/Dubai, Store, QC, AFS
        ↓
Release Note
        ↓
Delivered / Closed
        ↓
AFS Maintenance (if needed after delivery)
```

---

## Data Hierarchy

| Level | Purpose | Example Fields |
|---|---|---|
| Quotation Request | Pre-sale phase | Customer, requested vehicles, specs, quotation PDF |
| Project Header | Commercial reference (SO) | SO Number, Customer, Sales Owner, Total Value |
| Execution Reference | Internal execution link | WO (Saudi), PN (Dubai) |
| Vehicle / Item Lines | Line-level management | Vehicle Type, Quantity, Line Value, Line Status |
| Operational Records | Project execution | PR, PO to Supplier, Store Receipt, QC, Factory, Custody |
| Governance Records | Accountability and analysis | Timeline, Audit, SLA, Issues, CAPA |

**Important:** SO is the commercial reference. WO/PN is the internal execution reference. SO does not replace WO or PN.

---

## Module Summaries

### 05 — Quotation Management
A formal stage before SO that allows Sales to request a quotation from the system (from Hot Project or standalone). Sales Coordinator receives, logs the send-to-Estimation email, uploads the quotation PDF and number, and returns quotation values per line to Sales. Sales then converts to Hot Project or SO.

Key fields: Customer/Entity, Items/Vehicles, Quantities, Specification Files, Linked Hot Project, Quotation Number, Quotation PDF, Quotation Value per Line, Validity Date.

### 06 — Sales Coordinator Role
The Sales Coordinator is the user responsible for processing quotation requests and returning responses to Sales. Estimation team remains outside the system (via email in current phase).

Permissions: View all quotation requests, record send-to-Estimation, upload Quotation PDF with values, request clarification, convert to SO (with additional permission). Delete: Admin only.

Role pages: Coordinator Dashboard, Quotation Requests, Pending Estimation, Need Clarification, Returned Quotations, Quotation History.

### 07 — SO then WO / PN Gate
**Non-negotiable rule:** After SO approval, WO must be entered for Saudi manufacturing, or PN for Dubai. No factory details, BOQ, BOM, Drawings, Raw Material Requests, or Progress can be added before the internal reference number.

| Route | Required Number | Must Enter Before |
|---|---|---|
| Saudi Manufacturing | WO - Work Order Number | BOQ, BOM, Drawings, Raw Material Requests, Production Progress |
| Dubai Manufacturing | PN - Project Number | Dubai ETA, Dubai PO, AFS readiness, vehicle arrival |

### 08 — Approval and Routing Engine
Project approval is not just a "confirm" button — it is an operational classification that determines the project route and required departments.

| Manufacturing Location | Medical Items | Activated Route | Required Internal Number |
|---|---|---|---|
| Saudi | Yes | Procurement + Saudi Factory + Store + Material QC + Vehicle QC | WO |
| Saudi | No | Saudi Factory + Store + Vehicle QC when needed | WO |
| Dubai | Yes | Dubai Management + AFS + Medical follow-up | PN |
| Dubai | No | Dubai Management + AFS | PN |

### 09 — Sales Workspace
Sales is responsible for: quotation requests, Hot Projects, converting opportunities to SO, following up on their projects, invoicing, and aging.

Pages: Quotation Requests, Hot Projects, SO Registration, Invoicing Plan, Aging, My Projects.

### 10 — Procurement and High-Value PO Approval
Procurement records PR, PR Items, PO to Supplier, and ETA. Any PO above 10,000 SAR requires Admin or Operations Manager approval.

States: PR Received → PR Items Added → PO to Supplier Uploaded → [If > 10,000 SAR: Approval Required] → Approved → ETA Confirmed → Store Receiving.

Gate rule: A PO above 10,000 SAR cannot be considered sent or active unless it has been approved.

### 11 — Approved Supplier Management
System maintains a unified approved supplier list used in PR, PO to Supplier, Quality, and Reports.

Supplier states: Draft, Pending Review, Approved, Approved with Conditions, Suspended, Blacklisted.

### 12 — Saudi Factory Workspace
Factory works only on approved Saudi-routed projects. Cannot start before WO entry.

Factory manages per Vehicle Line: WO Number (mandatory), BOQ, BOM, GA Drawing, Detail Drawings, Required Manhours, Pending Raw Materials.

**30-Day Rule:** Every manufacturing line item must be updated at least every 30 days, or it shows "Monthly Update Required" in the Control Tower.

### 13 — Dubai Projects and AFS
Dubai projects bypass the Saudi factory route. PN is entered first, then Dubai management and AFS tracking begins.

Dubai Management Fields: PN Number, PO from Saudi to Dubai, ETA per Vehicle Line, Dubai Status, AFS Arrival / Pre-delivery Reports.

AFS role: Record vehicle arrival, file Arrival Report, file Pre-delivery Report, record Missing Items, receive materials from Store when needed, record delivery readiness.

### 14 — Store and Warehouse
Store receives materials and vehicles, links them to projects or keeps them Unallocated, then issues them to Production or AFS or a specific project.

Store functions: Material Receiving (linked to PR/PO), Vehicle Receiving (chassis number + photos), Inventory Search, Material Issuance, Temporary Custody.

### 15 — Material Custody and Issuance
Manages material movement after Store acceptance: issuance, receiver acceptance, installation, return or final project allocation.

Material states: In Store, Reserved, Pending Approval, Issued, Pending Acceptance, In Custody, Installed, Returned, Consumed, Lost/Damaged.

Temporary Custody requires Admin or Operations Manager approval.

### 16 — Vehicle Receiving by Store
Every vehicle or chassis received must have: Chassis Number, Project/Vehicle Line link, Received Date/By, Condition, Photos (Front, Rear, Left, Right, Chassis Plate, Damage if any), Receiving Report.

**Data Quality Rule:** Vehicle receipt is not considered complete without Chassis Number and basic photos.

### 17 — Medical Items Serial Number Tracking
Every medical item must be tracked at Serial Number level for quality assurance, traceability, and installation verification.

Fields: Serial Number, Batch Number / Expiry, Supplier / Manufacturer, QC Status, Current Custody, Installed On Vehicle.

### 18 — Raw Material Requests
Production can request Raw Materials from the system for a specific project/WO or for stock replenishment.

Flow: Production creates request → Select Project/WO or Stock → Upload Excel File → System stores and classifies → Procurement / Store acts.

Statuses: Draft, Submitted, Under Review, Sent to Procurement, Fulfilled.

### 19 — Excel Upload, BOQ and BOM
Current phase: Upload Excel files and link them to Project / WO / Stock. Future phase: Parser extracts items to create BOQ/BOM or PR Items automatically.

Files must be stored with clear metadata so future parser can process without redesign.

### 20 — Quality Control
Two types:

**Material QC:** Triggered after Store receipt. Accept or reject. If rejected, an NCR is created with root cause, owner, and corrective action.

**Vehicle / Project QC:** Triggered after Production or AFS sends item for final inspection. Includes checklist, findings, rework if needed.

Release Note is issued only after all QC observations and rework are closed.

### 21 — AFS Maintenance Requests After Delivery
After project delivery, Sales / Operations / AFS can raise post-delivery maintenance or issue requests linked to the original project.

Fields: Project/SO, WO or PN, Vehicle/Line, Issue Type/Priority, Attachments, Resolution Notes.

Flow: Delivered Project → Issue Raised → AFS Maintenance Request Created → AFS Inspects → Waiting Parts/Repair → Resolved and Closed.

### 22 — Document Control and Checklist Engine
File upload alone is not sufficient. System must control: document type, version, status, owner, and linked entity.

Document statuses: Uploaded, Under Review, Approved, Rejected, Superseded, Expired.

Checklist types: Quotation Request, Project Approval, WO/PN Gate, Vehicle Receiving, Material Handover, Release Readiness.

### 23 — Risks, Issues, Root Cause and CAPA
Every major issue must have: Root Cause, Corrective Action, Preventive Action, Owner, Due Date, Evidence, Closure Approval.

### 24 — SLA, Escalation and Notifications

| Condition | Target | Escalation |
|---|---|---|
| Quotation request not processed | 2 days | Sales Coordinator → Operations |
| SO approved but WO missing | 2 days | Factory/Production → Operations |
| SO approved but PN missing | 2 days | Operations / Production |
| PR without PO to Supplier | 3 days | Procurement → Manager |
| PO > 10,000 pending approval | 2 days | Operations/Admin |
| Temporary custody pending acceptance | 1 day | Receiver → Store → Operations |
| Factory update missing | 30 days | Factory → Operations |
| QC rework open | 7 days | QC/Factory → Operations |

Escalation levels: 1 = Assigned User, 2 = Department Manager, 3 = Operations Manager, 4 = Senior Management / Critical Issue.

### 25 — Reports and KPI Framework
Report categories: Quotation Reports, Execution Reference Reports (missing WO/PN), Procurement Reports, Store/Custody Reports, Vehicle Receiving Reports, Raw Material Reports, Supplier Reports.

### 26 — Operations Control Tower (Data Quality section 26/27)
Daily command page for Admin and Operations Manager. Aggregates:

- Pending Quotations (unprocessed)
- SO without WO (Saudi approved, no WO)
- SO without PN (Dubai approved, no PN)
- PO Approval Pending (>10,000 waiting)
- Materials in Custody (with Production/AFS)
- Vehicle Receiving Issues (missing chassis/photos)
- Raw Material Requests (open)
- QC Rework (unclosed observations)
- Critical Issues (escalated)

### 27 — Data Quality and Master Data
System must block or alert on invalid state transitions:

| Data Quality Check | System Response |
|---|---|
| Quotation without specifications | Block submission |
| Quotation returned without PDF or QTN number | Block return to Sales |
| Approved Saudi project without WO | Block factory details + alert |
| Approved Dubai project without PN | Block Dubai follow-up + alert |
| High-value PO without approval | Block Sent to Supplier |
| Medical item without serial number | Block QC acceptance / installation |
| Vehicle receipt without chassis number/photos | Block completion of receipt |
| Temporary custody without approval | Block handover |

Master Data Lists: Vehicle Types, Material Categories, Supplier Categories, Approved Suppliers, Customers, Document Types, Root Cause Categories, Issue Types, SLA Rules, Checklist Templates, Store Locations, Production Users, AFS Users, WO/PN status lists.

### 28 — Timeline and Audit Governance
Every significant event must appear in the Timeline. Every data change must appear in the Audit Log.

### 29 — Roles and Permissions

| Role | Main Responsibilities | Financial Visibility |
|---|---|---|
| Admin | Full governance, users, settings, approvals, reports | Full |
| Operations Manager | Operations, escalation, Dubai, PO approvals, Temporary Custody | By permission |
| Sales User | Quotation, Hot Projects, SO, Aging, Invoicing | Own sales values + quotation values |
| Sales Coordinator | Process quotation, upload PDF and line values | Quotation values only |
| Procurement User | PR, PO to Supplier, ETA, Suppliers | Purchase cost |
| Factory / Production User | WO, BOQ, BOM, Raw Material Requests, Send to QC, Progress | No financial values |
| Store User | Material and vehicle receiving, custody, serials, issuance | No financial values |
| QC User | Inspect materials and vehicles, evaluate suppliers | No financial values |
| AFS User | Dubai projects, receiving, readiness, post-delivery maintenance | No financial values |
| Viewer / Management | Read and reports only | By permission |

### 30 — Implementation Roadmap

| Phase | Scope |
|---|---|
| 1 | Foundation: users, roles, permissions, documents, audit |
| 2 | Project Core: SO, vehicle lines, approval, routing |
| 3 | Quotation: Sales Coordinator, QTN PDF, values, convert to SO |
| 4 | SO-WO/PN Gate: WO for Saudi, PN for Dubai, blocking rules |
| 5 | Procurement: PR, PO, ETA, high-value approval, suppliers |
| 6 | Factory / Dubai / AFS: BOQ, BOM, raw materials, Dubai PN, AFS reports |
| 7 | Store / Custody: Receiving, chassis, serials, material issuance |
| 8 | QC and Release: Material QC, NCR, Vehicle QC, Release Note |
| 9 | After Sales: AFS maintenance requests after delivery |
| 10 | Operational Excellence: Control Tower, SLA, reports, data quality |

**Implementation Rule:** The next phase does not begin until the current phase passes End-to-End testing.

---

## Final Operating Charter (20 Permanent Rules)

1. System does not use the term "BO" — the correct term is "PO to Supplier"
2. Quotation request is a formal stage before SO
3. Sales Coordinator is responsible for processing quotations and uploading PDF and line values
4. Estimation Team is currently outside the system and communicated via email
5. SO is the official commercial reference for the project
6. WO is mandatory before executing Saudi projects
7. PN is mandatory before following up on Dubai projects
8. No BOQ, BOM, drawings, or Raw Material Requests before WO (Saudi route)
9. No Dubai ETA or AFS readiness before PN (Dubai route)
10. Any PO to Supplier above 10,000 SAR requires Admin or Operations Manager approval
11. Temporary Custody for materials requires Admin or Operations Manager approval
12. Medical items must be registered with serial numbers
13. Vehicle receiving requires chassis number and photos
14. Raw Material Requests can be for a project/WO or for stock
15. Excel files are stored now and prepared for future BOQ/BOM or PR Items extraction
16. AFS may manage post-delivery maintenance requests
17. Every delay must be linked to an SLA and escalated when needed
18. Every significant event appears in Timeline and Audit
19. No Release Note before closing all QC observations and Rework
20. No reliable reports without data quality
