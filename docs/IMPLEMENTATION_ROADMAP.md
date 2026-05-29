# FT Operations Portal — Implementation Roadmap

**Rule:** Each phase starts only after end-to-end testing of the previous phase.

---

## Phase 0 — Foundation ✅ (Current)

**Goal:** Clean project scaffold. Everything that follows builds on this.

- [x] Vite + React + TypeScript project
- [x] Tailwind CSS with enterprise brand config
- [x] Enterprise layout: Header + Sidebar + Main content
- [x] Mobile-responsive structure
- [x] All placeholder pages and routes (20 routes)
- [x] Role types and navigation constants
- [x] Static Dashboard (Control Tower KPIs)
- [x] Static Action Inbox
- [x] Documentation files
- [x] Clean build

---

## Phase 1 — Foundation: Users, Auth, Documents, Audit

**Key Deliverables:**
- Supabase project setup
- Auth integration (email/password)
- User management UI (Admin/Users page)
- Role assignment
- Document types master data
- Audit log infrastructure
- Settings page implementation

**Test Scenario:** Admin creates user and assigns role.

---

## Phase 2 — Project Core: SO, Approval, Routing

**Key Deliverables:**
- SO creation form
- Vehicle lines management
- Admin Approval workflow (SO Approval)
- Route decision: Saudi / Dubai + Medical Yes/No
- Project list and detail view
- Project Timeline (basic)
- Sales Workspace

**Test Scenario:** Sales submits SO → Admin approves → Route selected.

---

## Phase 3 — Quotation Management

**Key Deliverables:**
- Quotation Request creation
- Specification file upload
- Sales Coordinator queue
- Record "Sent to Estimation Date"
- Quotation PDF + number upload
- Quotation line values
- Convert to Hot Project or SO
- Quotation history

**Test Scenario:** Sales requests quotation → Coordinator processes → Returns with PDF → Sales converts to SO.

---

## Phase 4 — SO-WO/PN Gate

**Key Deliverables:**
- WO entry form (Saudi route)
- PN entry form (Dubai route)
- Blocking rules enforcement
- Factory/Dubai workflow unlock on WO/PN entry
- SLA: 2-day escalation for missing WO/PN

**Test Scenario:** Factory tries to add BOQ before WO → blocked. Factory enters WO → BOQ unlocked.

---

## Phase 5 — Procurement

**Key Deliverables:**
- PR management
- PR items
- PO to Supplier upload
- High-value PO approval (>10,000 SAR)
- ETA tracking with history
- Supplier master list
- Supplier status management

**Test Scenario:** Procurement creates PO for 45,000 SAR → Approval request to Admin → Admin approves → PO sent.

---

## Phase 6 — Factory / Dubai / AFS

**Key Deliverables:**
- BOQ upload per vehicle line
- BOM management
- GA Drawing + Detail Drawings
- Required Manhours
- Raw Material Requests (Excel upload)
- Production progress
- Send to QC
- 30-Day Rule enforcement
- Dubai: PN tracking, ETA, Dubai PO
- AFS: Arrival report, pre-delivery report, missing items
- Dubai readiness checklist

**Test Scenario:** Production uploads raw material Excel for WO → Procurement acts on it.

---

## Phase 7 — Store / Custody

**Key Deliverables:**
- Material receiving (linked to PR + PO to Supplier)
- Vehicle receiving (chassis + photos mandatory)
- Inventory search
- Material issuance (to Production / AFS)
- Temporary custody (approval workflow)
- Medical serial number registration
- Material status lifecycle

**Test Scenario:** Store issues medical item to Production → Receiver accepts custody.

---

## Phase 8 — QC and Release Note

**Key Deliverables:**
- Material QC inspections
- NCR on rejection
- Vehicle QC inspections
- QC findings + rework assignments
- Rework closure tracking
- Release Note issuance (blocked until all findings closed)
- Supplier QC scorecard

**Test Scenario:** QC closes rework findings → Issues Release Note → Project moves to delivery readiness.

---

## Phase 9 — After Sales Maintenance

**Key Deliverables:**
- AFS Maintenance Request creation
- Link to original project (SO)
- Vehicle/line affected
- Issue type + priority
- Inspection + repair workflow
- Parts waiting
- Resolution and closure

**Test Scenario:** Sales raises post-delivery maintenance request → AFS inspects → Resolved and closed.

---

## Phase 10 — Operational Excellence

**Key Deliverables:**
- Full Control Tower with live data
- SLA breach reports
- Escalation notifications
- Data quality enforcement dashboard
- All report categories
- CAPA management
- KPI exports

**Test Scenario:** Operations Manager exports SLA breach report for the month.
