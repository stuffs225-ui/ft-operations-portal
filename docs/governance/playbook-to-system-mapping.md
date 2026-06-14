# Playbook-to-System Mapping
# FT Operations Portal — Governance Playbook v3.2

**Created:** 2026-06-13  
**Branch:** `audit/playbook-to-system-mapping`  
**Sources:** docs/system-audit/ (Step 2), docs/reference-library/ (Step 2.5), Governance Playbook v3.2  
**Purpose:** Map every Playbook section to the current system implementation, audit findings, and reference library recommendations.

---

## How to Use This Document

- **Status key:** ✅ Complete | ⚠️ Partial | 🔴 Missing | 🏗️ Built but not aligned
- **Rule enforcement:** Enforced in UI | Enforced in DB/RLS | Enforced in both | Missing | Unknown
- **Risk key:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- **Backlog IDs (B-xxx):** See `docs/system-audit/11-prioritized-gap-backlog.md`
- **Rule IDs (R-xxx):** See `docs/system-audit/07-governance-rules-gap-analysis.md`

---

---

## Module 1 — Vision and Operating Intent

### 1. Playbook Requirement
Transform vehicle project tracking from emails, Excel, and chat into a unified operational control center connecting pre-sale, SO, WO/PN, Procurement, Factory, Store, AFS, QC, Delivery, and After-Sales into one system of record. The Golden Rule: any operational event not recorded in the system is not considered an official record.

### 2. Current System Evidence
- **Routes/Pages:** Login, AppLayout, Dashboard, ControlTower — all routed in `src/app/App.tsx`
- **Components:** `AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `ProtectedRoute.tsx`, `RequireRole.tsx`
- **Tables/Migrations:** `profiles`, `user_roles`, `audit_log` (migration 003–004), `timeline_events`
- **Services/Utilities:** `src/lib/supabase.ts`, `src/lib/dataMode.ts`, `src/context/AuthContext.tsx`
- **Audit/Timeline:** `audit_log` table; module-level audit libs: `projectAudit.ts`, `quotationAudit.ts`, etc.

### 3. Current Status
⚠️ **Partial** — The structural foundation (auth, roles, routing, app shell) is solid. However, the Control Tower (the operational command center) serves mock data in live mode, meaning the "single system of record" vision is not yet realized operationally.

### 4. Gap Analysis
- Control Tower is empty in live Supabase mode (B-003)
- Many report pages return mock/empty data in live mode (B-004)
- SLA events not auto-generated server-side (B-006)
- Timeline events inconsistently written across modules (R-016)
- Golden Rule cannot be enforced when UI pages bypass audit logging

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| All operational events recorded | Missing — DB triggers needed |
| Audit log written for all status changes | Enforced in UI (partial), Missing in DB |
| System is primary record (not email/Excel) | Missing — no enforcement mechanism |

### 6. Required Documents and Evidence
- System architecture overview (exists: `docs/SYSTEM_ARCHITECTURE.md`)
- Data flow diagrams: Not present

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full system access |
| All roles | Read their own module data |
| Viewer | Read-only across all modules |

### 8. Required Reports / KPIs / Control Tower Signals
- Active projects count by status
- System health score (% modules with live data)
- Pending items by role (action queue)

### 9. Required Timeline / Audit Events
- System login/logout
- Role changes
- Any status transition on any governed entity

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Layout shell** | refine (MIT) — admin layout, sidebar, breadcrumb |
| **Usage category** | Pattern only |
| **License risk** | Low |
| **Guidance** | Use refine's `<Refine>` layout as shell; plug in shadcn/ui components |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker
- **Phase:** Foundation

### 12. Sign-off Criteria
- Control Tower shows live data for all 9 KPI sections
- Audit log written on every governed status transition
- Timeline events consistently created by all modules

---

## Module 2 — Governance Principles

### 1. Playbook Requirement
Four core principles: (1) Single Source of Truth, (2) Line-Level Control — projects managed at vehicle/item line level, (3) Security Beyond UI — permissions at both UI and DB level, (4) Stage-Gate Validation — no phase transition without required data and documents.

### 2. Current System Evidence
- **Single Source of Truth:** Supabase as backend — all modules read/write same DB
- **Line-Level Control:** `project_vehicle_lines` table; factory tracked per line; QC per line
- **Security Beyond UI:** RLS policies on all major tables; `RequireRole` components; migration 061 dual-enforcement
- **Stage-Gate Validation:** `executionGate.ts`; `QuotationNew.tsx` spec-file gate; `AdminApprovals.tsx` route/medical gates

### 3. Current Status
⚠️ **Partial** — Principles are architecturally embodied but not uniformly enforced. Security beyond UI is strong for PO approval (migration 061) but weak for Release Note, medical serial, vehicle receipt, and custody.

### 4. Gap Analysis
- Line-Level Control: Factory requirements tracked per line ✅; Store receipt items tracked ✅; QC per line ✅; but Invoicing milestone linked to project not line
- Security Beyond UI: Only migration 061 has full dual-layer; Release Note (R-015), medical serial (R-011), vehicle receipt (R-012), custody (R-013) lack DB enforcement
- Stage-Gate: WO/PN gate ✅ at UI; but factory_records and dubai_project_followups not blocked at DB level (B-024, B-025)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| No phase skip without required data | Enforced in UI (partial) |
| DB-level block on invalid state transitions | Missing for most modules |
| RLS on all write operations | Enforced in DB (partial) — gaps in custody, quotations |

### 6. Required Documents and Evidence
- Governance principles document: `docs/DEVELOPMENT_RULES.md` (partial)
- Security rules: `docs/RLS_SECURITY_REVIEW.md` (exists)
- RLS policy plan: `docs/RLS_POLICY_PLAN.md` (exists)

### 7. Required Permissions
All roles — governance principles apply system-wide.

### 8. Required Reports / KPIs / Control Tower Signals
- DB constraint violation audit (log of blocked invalid transitions)
- RLS policy coverage report

### 9. Required Timeline / Audit Events
- Any governance rule violation attempt (blocked or bypassed)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Stage-gate pattern** | ERPNext workflow pattern (GPL v3) — study only |
| **DB enforcement** | Custom triggers modeled on migration 061 |
| **Usage category** | Inspiration only (ERPNext) / Direct (custom) |
| **License risk** | High (ERPNext), Low (custom) |
| **Guidance** | Use migration 061 (`po_approval_guard.sql`) as the template for all new DB triggers |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker
- **Phase:** Architecture Cleanup (before any feature work)

### 12. Sign-off Criteria
- All 19 governance rules from `docs/system-audit/07-governance-rules-gap-analysis.md` are enforced in DB
- No critical rule is UI-only

---

## Module 3 — End-to-End Lifecycle

### 1. Playbook Requirement
Full lifecycle: Quotation Request → Sales Coordinator → Quotation Return → SO Registration → Admin Approval → Route (Saudi WO / Dubai PN) → Procurement / Factory / Store / QC / AFS → Release Note → Delivered → AFS Maintenance.

### 2. Current System Evidence
- **Routes covering lifecycle:** `/quotations`, `/projects`, `/projects/new`, `/admin-approvals`, `/wo-pn-gate`, `/procurement`, `/factory`, `/store`, `/qc`, `/afs`, `/after-sales`
- **Status model:** `ProjectStatus` type in `src/types/index.ts` covers `draft → submitted → approved → delivered → closed`
- **Routing tables:** `projects.manufacturing_location` (saudi/dubai), `project_execution_references` (WO/PN records)

### 3. Current Status
⚠️ **Partial** — The full lifecycle is modeled in the routing and type system. The critical gaps are: (1) no automated notifications at lifecycle transitions, (2) no enforcement that lifecycle cannot skip stages at DB level, (3) Control Tower cannot show live lifecycle status.

### 4. Gap Analysis
- Lifecycle notifications on approval not triggered (B-007)
- No automatic task creation when SO is approved (WO task for factory, PN task for AFS)
- Control Tower cannot show "SO without WO" or "SO without PN" in live mode (B-003)
- No lifecycle event auto-written to timeline at each transition (R-016)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| SO approval triggers WO/PN task | Missing |
| Every lifecycle transition logged to timeline | Enforced in UI (partial) |
| No lifecycle stage skip | Enforced in UI; Missing in DB |

### 6. Required Documents and Evidence
- Lifecycle diagram: `docs/IMPLEMENTATION_ROADMAP.md` (partial)
- Approval workflow: `docs/APPROVAL_ROUTING_WORKFLOW.md` (exists)

### 7. Required Permissions
Lifecycle transitions have role-specific gating (sales → coordinator → admin → factory/afs/procurement).

### 8. Required Reports / KPIs / Control Tower Signals
- Projects at each lifecycle stage
- Average time per stage (SLA tracking)
- Stuck projects (no movement for X days)

### 9. Required Timeline / Audit Events
- SO created, SO approved, WO entered, PN entered, QC started, Release Note issued, Delivered

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Lifecycle notifications** | Inngest (MIT) for event-driven lifecycle actions |
| **Usage category** | Architecture reference — implement with BullMQ/MIT |
| **License risk** | Low |
| **Guidance** | Model each lifecycle transition as an Inngest event; trigger notifications and task creation on each |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** SO / Approval / Routing

### 12. Sign-off Criteria
- Every lifecycle transition fires a timeline event automatically
- Control Tower shows live lifecycle stage counts
- Stuck project alerts fire via SLA rules

---

## Module 4 — Data Hierarchy

### 1. Playbook Requirement
Six levels: Quotation Request → Project Header (SO) → Execution Reference (WO/PN) → Vehicle/Item Lines → Operational Records → Governance Records. SO is the commercial reference; WO/PN is the internal execution reference. They do not replace each other.

### 2. Current System Evidence
- **Quotation Requests:** `quotation_requests` + `quotation_request_lines` tables
- **Project Header (SO):** `projects` table — SO number, customer, sales_owner, total_value
- **Execution Reference:** `project_execution_references` — `reference_type: 'wo' | 'pn'`
- **Vehicle Lines:** `project_vehicle_lines` — vehicle_type, quantity, line_value, line_status
- **Operational Records:** `procurement_requests`, `purchase_orders_to_supplier`, `store_receipts`, `material_qc_inspections`, `factory_records`
- **Governance Records:** `audit_log`, `timeline_events`, `sla_rules`, `sla_events`

### 3. Current Status
✅ **Substantially complete** — The data hierarchy is faithfully represented in the schema. FK constraints link records across levels. `project_vehicle_lines` properly ties vehicle-level data to the project.

### 4. Gap Analysis
- Customer is a free-text field (`customer_name TEXT`) — no customer master table (B-026)
- Vehicle types are free-text — no vehicle type master table
- Line-level invoicing milestones exist but may not link to vehicle lines
- No FK from `factory_records` to `project_execution_references.reference_type = 'wo'` (enforced only at UI level)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| All operational records linked to SO | Enforced in DB (FK) |
| WO/PN separate from SO | Enforced in DB (separate table) |
| Line-level tracking for vehicles | Enforced in DB (project_vehicle_lines) |

### 6. Required Documents and Evidence
- Database blueprint: `docs/DATABASE_BLUEPRINT.md` (exists)
- Entity relationship diagram: Not present

### 7. Required Permissions
Data hierarchy is read-accessible to all roles with appropriate RLS filtering.

### 8. Required Reports / KPIs / Control Tower Signals
- Hierarchy completeness: SOs without vehicle lines
- Projects without execution reference (WO/PN)

### 9. Required Timeline / Audit Events
- Vehicle line added/removed
- Execution reference (WO/PN) created

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Data model** | ERPNext Sales Order hierarchy (GPL v3) — study only |
| **Master data** | refine CRUD for customer/vehicle master (MIT) |
| **Usage category** | Inspiration only (ERPNext) / Pattern only (refine) |
| **License risk** | High (ERPNext), Low (refine) |
| **Guidance** | Replace free-text `customer_name` with FK to `customers` master table; add `vehicle_types` master |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** Architecture Cleanup

### 12. Sign-off Criteria
- Customer field is FK to customers master table
- Vehicle types field is FK to vehicle_types master table
- All operational records have verifiable FK to project

---

## Module 5 — Quotation Management

### 1. Playbook Requirement
Formal pre-SO stage. Sales submits a Quotation Request with customer info, requested vehicles, quantities, and specification files. Sales Coordinator receives, sends to Estimation (via email), uploads quotation PDF + quotation number + values per line, returns to Sales. Sales converts to SO or Hot Project. Cannot submit without spec files. Cannot return without PDF and quotation number.

### 2. Current System Evidence
- **Routes/Pages:** `/quotations` (Quotations list), `/quotations/new` (QuotationNew — multi-step wizard ✅), `/quotations/:id` (QuotationDetail)
- **Components:** `QuotationNew.tsx` — multi-step wizard with spec-file gate
- **Tables:** `quotation_requests`, `quotation_request_lines`, `quotation_documents`, `quotation_timeline_events`
- **RLS:** RLS exists on `quotation_requests` table
- **Services:** `quotationAudit.ts`, `quotationSla.ts`
- **Validation:** Spec-file gate at UI level (`QuotationNew.tsx:183`)

### 3. Current Status
⚠️ **Partial** — Multi-step wizard exists and enforces spec-file gate at UI. Coordinator return action exists. But spec-file gate is UI-only (B-008), coordinator return PDF+number gate not DB-enforced (B-009), and live Supabase query not confirmed for all list operations.

### 4. Gap Analysis
- Spec-file gate: UI ✅, DB trigger missing (R-001, B-008)
- Coordinator return gate: UI only — no DB constraint preventing status change to `returned_to_sales` without PDF + quotation_number (R-002, B-009)
- RLS on `quotation_requests` — sales_user should only see own quotations (B-012)
- SLA: client-side `quotationSla.ts` only; no server-side SLA event creation (R-018, B-006)
- No Hot Project conversion flow documented in routes
- Quotation list page may not filter by sales_user in live mode

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Cannot submit without spec files | Enforced in UI — Missing in DB |
| Cannot return without PDF + quotation_number | Enforced in UI (partial) — Missing in DB |
| SLA: process within 2 days | Missing (no server-side SLA events) |
| Sales user sees only own quotations | Missing in RLS (B-012) |

### 6. Required Documents and Evidence
- Specification files (required before submission)
- Quotation PDF (required before return to sales)
- Quotation number (required before return to sales)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full CRUD |
| Operations Manager | View all, approve conversion |
| Sales User | Create own, view own, convert to SO |
| Sales Coordinator | View all, process (upload PDF + values), return |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Pending Quotations (unprocessed) → Control Tower tile
- Avg quotation turnaround time
- Quotations by status / by sales_user
- SLA breach count

### 9. Required Timeline / Audit Events
- Quotation submitted
- Sent to Estimation (coordinator action)
- Quotation PDF uploaded
- Returned to Sales
- Converted to SO / Hot Project

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Multi-step form** | shadcn/ui Steps (MIT) — Direct |
| **List/queue view** | refine resource list pattern (MIT) — Pattern only |
| **Data model** | ERPNext Quotation DocType (GPL v3) — Inspiration only |
| **License risk** | Low (shadcn/ui, refine) / High (ERPNext) |
| **Guidance** | Keep existing wizard; add DB trigger for spec-file gate; add RLS for sales_user filtering |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Sales & Quotation

### 12. Sign-off Criteria
- DB trigger blocks status change to `submitted_by_sales` without spec file document
- DB trigger blocks status change to `returned_to_sales` without quotation_number and PDF
- RLS filters quotation_requests to sales_user's own records
- SLA events created server-side when 2-day deadline is breached
- Quotation timeline events written consistently

---

## Module 6 — Sales Coordinator

### 1. Playbook Requirement
Sales Coordinator receives all quotation requests, logs send-to-Estimation email, uploads Quotation PDF + number + line values, returns to Sales. Coordinator Dashboard shows: queue (Pending, Need Clarification, Returned, History). Estimation team is external (email only in current phase).

### 2. Current System Evidence
- **Routes/Pages:** `/sales-coordinator` (SalesCoordinator page)
- **Tables:** `quotation_requests` — `coordinator_remarks`, `quotation_number`, `coordinator_user_id` columns
- **Components:** `SalesCoordinator.tsx`
- **RLS:** `RequireRole` on route — `sales_coordinator` only
- **Audit:** `quotationAudit.ts` — coordinator actions logged

### 3. Current Status
⚠️ **Partial** — Coordinator page exists with role guard. Core workflow is modeled. Critical gap: return-to-sales action lacks DB enforcement of PDF + quotation_number requirement. Coordinator workspace may not be wired to live Supabase filtering (returning all quotations vs. only pending ones).

### 4. Gap Analysis
- DB trigger for return gate (B-009, R-002): quotation_number and PDF must exist before status = returned_to_sales
- Coordinator workspace tabs (Pending / Need Clarification / Returned / History) — UI state exists but live Supabase filter by status not confirmed
- No "Send to Estimation" button that logs the email action as a timeline event
- Estimation team outside system — no tracking of when email was sent
- No clarification request flow UI confirmed

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Cannot return to sales without PDF + quotation_number | Enforced in UI (partial) — Missing in DB |
| Coordinator sees all quotation requests | Unknown — RLS filter needed |

### 6. Required Documents and Evidence
- Quotation PDF (uploaded by coordinator)
- Send-to-Estimation email timestamp (logged as timeline event)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Sales Coordinator | View all, process, return |
| Sales User | Cannot process — view return result only |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Coordinator queue length (pending quotations)
- Average coordinator processing time
- Quotations pending for > 2 days (SLA breach)

### 9. Required Timeline / Audit Events
- Coordinator received quotation
- Sent to Estimation (with timestamp)
- Clarification requested
- Quotation PDF uploaded
- Returned to Sales (with quotation_number)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Queue/triage view** | Plane triage queue UX (AGPL v3) — Inspiration only |
| **List with tabs** | refine TabbedDatagrid pattern (MIT) — Pattern only |
| **License risk** | High (Plane) / Low (refine) |
| **Guidance** | Build Coordinator workspace as a tabbed list using refine list pattern; use shadcn/ui Tabs |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Sales & Quotation

### 12. Sign-off Criteria
- DB trigger blocks return-to-sales without quotation_number + PDF document
- Coordinator workspace tabs filter by actual status in live mode
- Timeline events written for all coordinator actions
- SLA breach notification fires when quotation not processed in 2 days

---

## Module 7 — SO then WO/PN Gate

### 1. Playbook Requirement
Non-negotiable: After SO approval, WO must be entered for Saudi route before ANY factory activity. PN must be entered for Dubai route before ANY Dubai/AFS activity. No BOQ, BOM, Drawings, Raw Material Requests, or Production Progress before WO. No Dubai ETA, AFS Readiness before PN.

### 2. Current System Evidence
- **Routes/Pages:** `/wo-pn-gate` (WoPnGate) — `RequireRole(['operations_manager', 'factory_user'])`
- **Library:** `src/lib/executionGate.ts` — `canStartSaudiFactory()`, `canStartDubaiFollowUp()`
- **Tables:** `project_execution_references` — `reference_type: 'wo' | 'pn'`, `reference_number`, `is_active`
- **Components:** `WoPnGate.tsx` (21.7 KB) — entry form + status dashboard
- **Integration:** `FactoryProjectWorkspace.tsx` and `DubaiAfsProjectDetail.tsx` call `canStartSaudiFactory()` / `canStartDubaiFollowUp()`

### 3. Current Status
✅ **Complete at UI level** — Gate logic is correctly implemented and integrated into both Factory and Dubai workflows. The critical gap is DB-level enforcement: `factory_records` and `dubai_project_followups` can be inserted via direct API call without WO/PN.

### 4. Gap Analysis
- DB trigger on `factory_records` INSERT: reject if Saudi route and no active WO (R-005, B-025)
- DB trigger on `dubai_project_followups` INSERT: reject if Dubai route and no active PN (R-006, B-024)
- DB trigger on `factory_requirements` INSERT: WO required (R-007, B-030)
- DB trigger on `raw_material_requests` INSERT: WO required (R-007, B-030)
- DB trigger on `afs_arrival_reports` INSERT: PN required (R-008)
- WoPnGate component is 21.7 KB — potential for complexity reduction
- Control Tower "SO without WO" and "SO without PN" tiles are mock (B-003)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Factory blocked before WO | Enforced in UI ✅ — Missing in DB |
| Dubai blocked before PN | Enforced in UI ✅ — Missing in DB |
| BOQ/BOM/drawings/RMR blocked before WO | Enforced in UI (partial) — Missing in DB |
| Dubai ETA/AFS blocked before PN | Enforced in UI (partial) — Missing in DB |

### 6. Required Documents and Evidence
- WO number (entered by Factory/Ops Manager)
- PN number (entered by AFS/Ops Manager)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Enter WO/PN, view gate status |
| Operations Manager | Enter WO/PN, view gate status |
| Factory User | View gate status, blocked until WO entered |
| AFS User | View gate status, blocked until PN entered |
| Others | No WO/PN entry |

### 8. Required Reports / KPIs / Control Tower Signals
- SO without WO (Saudi route, approved, no WO) → Control Tower critical tile
- SO without PN (Dubai route, approved, no PN) → Control Tower critical tile
- Days since SO approved without WO/PN (SLA breach at 2 days)

### 9. Required Timeline / Audit Events
- WO entered (with WO number, entered by, timestamp)
- PN entered (with PN number, entered by, timestamp)
- Factory unblocked (auto event when WO entered)
- Dubai unblocked (auto event when PN entered)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Gate UI** | shadcn/ui Alert + Badge (MIT) — Direct |
| **DB enforcement** | Custom trigger modeled on migration 061 |
| **WO data model** | ERPNext Work Order (GPL v3) — Inspiration only |
| **License risk** | Low |
| **Guidance** | Add DB triggers for factory_records, dubai_project_followups, factory_requirements, raw_material_requests; use migration 061 pattern |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** WO/PN Gate

### 12. Sign-off Criteria
- DB trigger prevents factory_records INSERT without active WO on Saudi projects
- DB trigger prevents dubai_project_followups INSERT without active PN on Dubai projects
- DB trigger prevents raw_material_requests INSERT without active WO
- Control Tower "SO without WO/PN" tiles show live count
- SLA fires after 2 days without WO/PN after SO approval

---

## Module 8 — Approval and Routing Engine

### 1. Playbook Requirement
SO Approval is an operational classification: selects Saudi or Dubai route and Medical Yes/No. This determines which departments are activated. Saudi + Medical → WO + Procurement + Saudi Factory + Store + Material QC + Vehicle QC. Saudi + No Medical → WO + Saudi Factory + Store + Vehicle QC. Dubai + Medical → PN + Dubai Management + AFS + Medical follow-up. Dubai + No Medical → PN + Dubai Management + AFS.

### 2. Current System Evidence
- **Routes/Pages:** `/admin-approvals` (AdminApprovals) — `RequireRole(['admin', 'operations_manager'])`
- **Tables:** `projects.project_status`, `projects.manufacturing_location`, `projects.medical_items`, `project_execution_references`
- **Components:** `AdminApprovals.tsx` — route + Medical selection before approval
- **Validation:** UI enforces Saudi/Dubai selection (R-003), Medical Yes/No selection (R-004)
- **Type model:** `ManufacturingLocation: 'not_set' | 'saudi' | 'dubai'`, `MedicalItemsStatus: 'not_set' | 'yes' | 'no'`

### 3. Current Status
✅ **Complete** — AdminApprovals page correctly enforces route and Medical selection before approval. The routing model is well-structured. Minor gaps: missing DB CHECK constraints and no auto-notification on approval.

### 4. Gap Analysis
- DB CHECK missing: `manufacturing_location != 'not_set'` when `project_status = 'approved'` (B-010)
- DB CHECK missing: `medical_items != 'not_set'` when `project_status = 'approved'` (B-011)
- No automated task/notification created for factory or AFS when SO is approved (B-007)
- No timeline event auto-written on SO approval via DB trigger
- Control Tower routing state not live (B-003)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Route (Saudi/Dubai) required before approval | Enforced in UI ✅ — Missing DB CHECK |
| Medical Yes/No required before approval | Enforced in UI ✅ — Missing DB CHECK |
| Approval triggers route-specific tasks | Missing |

### 6. Required Documents and Evidence
- Approval action logged to project timeline
- Rejection reason recorded if rejected

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Approve/reject SO |
| Operations Manager | Approve/reject SO |
| Others | View status only |

### 8. Required Reports / KPIs / Control Tower Signals
- Projects pending approval
- Avg approval time
- Approval/rejection ratio

### 9. Required Timeline / Audit Events
- SO submitted for approval
- SO approved (with route, medical flag, approver)
- SO rejected (with reason, rejector)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Approval workflow** | ERPNext approval submit/cancel cycle (GPL v3) — Inspiration only |
| **Notification on approval** | Inngest (MIT) — Direct; implement with BullMQ |
| **License risk** | High (ERPNext) / Low (Inngest/BullMQ) |
| **Guidance** | Add DB CHECK constraints (B-010, B-011); add Inngest job triggered on SO approval to notify factory/AFS |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** SO / Approval / Routing

### 12. Sign-off Criteria
- DB CHECK prevents approval without Saudi/Dubai route
- DB CHECK prevents approval without Medical Yes/No
- Timeline event auto-written on approval
- Notification fires to factory/AFS when SO approved

---

## Module 9 — Sales Workspace

### 1. Playbook Requirement
Sales manages: Quotation Requests (own), Hot Projects (pipeline), SO Registration, Invoicing Plan, Aging, My Projects. The workspace shows what is pending for the Sales user specifically.

### 2. Current System Evidence
- **Routes/Pages:** `/sales` (Sales page), `/hot-projects`, `/projects`, `/projects/new`, `/invoicing`, `/aging`
- **Tables:** `hot_projects`, `quotation_requests`, `projects`, `invoicing_plans`, `invoicing_milestones`
- **RLS:** `RequireRole(['sales_user', 'admin', 'operations_manager'])` on `/sales`
- **Data mode:** Sales page uses `mockOrEmpty()` — not wired to live Supabase (B-014)

### 3. Current Status
🔴 **Mock only** — The sales route, Hot Projects, and project list pages exist but the Sales workspace page itself is not connected to live Supabase. The "what is pending for me" view is not built.

### 4. Gap Analysis
- Sales workspace page not wired to live Supabase (B-014)
- No role-filtered query: sales_user should only see own quotations and own projects
- Hot Projects pipeline view exists but is mock
- Invoicing and Aging pages return mock data in live mode (B-004)
- No "action queue" showing what the sales user needs to do today

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Sales user sees only own data | Missing — RLS not confirmed for sales-filtered queries |

### 6. Required Documents and Evidence
- Invoicing milestones linked to project
- Aging report based on milestone dates

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | All sales data |
| Operations Manager | All sales data |
| Sales User | Own quotations, own SOs, own hot projects |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- My open quotation requests
- My projects by status
- Overdue invoicing milestones
- Aging summary

### 9. Required Timeline / Audit Events
- Hot Project created
- Hot Project converted to SO
- Invoicing milestone created/paid

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Pipeline view** | Twenty CRM workspace layout (AGPL v3) — Inspiration only |
| **List view** | refine `useList` with role filter (MIT) — Pattern only |
| **License risk** | High (Twenty CRM) / Low (refine) |
| **Guidance** | Replace `mockOrEmpty()` with live `supabase.from('projects').select().eq('sales_owner', user.id)`; build action queue widget |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Sales & Quotation

### 12. Sign-off Criteria
- Sales workspace shows live data filtered to sales_user's own records
- Hot Projects pipeline shows live hot_projects records
- Invoicing and Aging pages show live data
- Action queue shows today's pending items for the sales user

---

## Module 10 — Procurement and High-Value PO Approval

### 1. Playbook Requirement
Procurement logs PR, PR Items, PO to Supplier, ETA. Any PO above 10,000 SAR requires Admin or Operations Manager approval. PO cannot be considered active/sent without approval. ETA changes must record old + new ETA with reason.

### 2. Current System Evidence
- **Routes/Pages:** `/procurement`, `/procurement/requests`, `/procurement/requests/:id`, `/procurement/purchase-orders`, `/procurement/purchase-orders/:id`, `/procurement/eta-history`
- **Tables:** `procurement_requests`, `procurement_request_items`, `purchase_orders_to_supplier`, `eta_change_history`
- **RLS/Triggers:** Migration 061 — dual-layer PO approval: RLS policy prevents `procurement_user` from setting `approval_status = 'approved'`; DB trigger `enforce_po_approval_authority()` raises exception for unauthorized approval
- **Status model:** `POStatus: 'draft' | 'pending_approval' | 'approved' | 'sent_to_supplier' | 'partially_received' | 'fully_received' | 'cancelled'`

### 3. Current Status
✅ **Substantially complete** — PO approval is the best-enforced governance rule in the system (dual-layer, migration 061). ETA history table exists. Multiple procurement pages are routed.

### 4. Gap Analysis
- `approval_required` auto-set for POs > 10,000 SAR — needs DB trigger verification (B-023)
- PR to PO linking — is every PO linked to a PR? FK constraint not confirmed
- Supplier FK: PO linked to `approved_suppliers` table or free-text supplier name?
- Procurement list pages may use `mockOrEmpty()` in live mode (B-004)
- No PDF viewer for PO documents in current UI

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| PO > 10,000 SAR requires approval | Enforced in both ✅ (migration 061) |
| PO cannot be sent without approval | Enforced in both ✅ |
| ETA change records old + new ETA | Enforced in DB (eta_change_history) |
| approval_required auto-set at 10,000 threshold | Unknown — needs verification (B-023) |

### 6. Required Documents and Evidence
- PO to Supplier (PDF upload)
- Supplier quotation/invoice (optional)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full CRUD + approve |
| Operations Manager | Full CRUD + approve |
| Procurement User | Create PR/PO, cannot approve own high-value PO |
| Store User | View PO for receiving |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- PO Approval Pending (>10,000 SAR, waiting) → Control Tower tile
- Open PRs without PO (delay indicator)
- ETA overruns (planned vs actual ETA)
- Procurement value by supplier

### 9. Required Timeline / Audit Events
- PR submitted
- PO created
- PO submitted for approval (>10k)
- PO approved/rejected (with approver)
- PO sent to supplier
- ETA confirmed / changed (with old/new values)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **PO approval** | Migration 061 pattern ✅ — already implemented |
| **PO list/filter** | react-admin Datagrid (MIT) — Pattern only |
| **PR data model** | ERPNext Purchase Requisition (GPL v3) — Inspiration only |
| **License risk** | Low (react-admin) / High (ERPNext) |
| **Guidance** | Migration 061 is gold standard; add B-023 DB trigger for auto-flag; wire list pages to live Supabase |

### 11. Priority and Recommended Phase
- **Priority:** High (B-023 verification), Medium (live wiring)
- **Phase:** Procurement

### 12. Sign-off Criteria
- `approval_required = true` auto-set when purchase_value > 10,000 via DB trigger
- Control Tower PO Approval Pending tile shows live count
- All procurement list pages wired to live Supabase
- Timeline events written for all PO status changes

---

## Module 11 — Approved Supplier Management

### 1. Playbook Requirement
Unified approved supplier registry. Supplier lifecycle: Draft → Pending Review → Approved / Approved with Conditions / Suspended / Blacklisted. All POs must reference an approved supplier. Blacklisted supplier cannot receive new POs.

### 2. Current System Evidence
- **Routes/Pages:** `/procurement/suppliers`, `/procurement/suppliers/:id` (ProcurementSuppliers, ProcurementSupplierDetail)
- **Tables:** `approved_suppliers`, `supplier_scorecards`
- **Status model:** `ProcurementSupplierStatus: 'draft' | 'pending_review' | 'approved' | 'approved_with_conditions' | 'suspended' | 'blacklisted'`
- **Components:** Supplier list + detail pages

### 3. Current Status
⚠️ **Partial** — Supplier CRUD exists with correct status lifecycle. Gaps: blacklisted supplier not blocked from new POs at DB level; no auto-link from NCRs to supplier scorecard; status transitions lack DB enforcement.

### 4. Gap Analysis
- No DB trigger blocking PO creation against `approved_suppliers.status = 'blacklisted'`
- NCR-to-supplier quality score auto-calculation not implemented (B-040)
- Supplier status transitions can be set freely — no workflow enforcement
- Supplier scorecard auto-update from QC data not implemented
- Supplier list page may use `mockOrEmpty()` in live mode (B-004)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Blacklisted supplier blocked from new POs | Missing |
| Suspended supplier flagged on new POs | Missing |
| Status transitions require authorized role | Unknown |

### 6. Required Documents and Evidence
- Supplier registration documents
- QC certification (for medical suppliers)
- Blacklist/suspension reason (required on status change)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full CRUD, approve, blacklist |
| Operations Manager | View all, suspend/approve |
| Procurement User | View all, create draft |
| QC User | Add QC notes to supplier |
| Others | View only |

### 8. Required Reports / KPIs / Control Tower Signals
- Approved suppliers count by category
- Suppliers with recent NCRs
- Blacklisted suppliers (alert if PO attempted)
- Supplier scorecard rankings

### 9. Required Timeline / Audit Events
- Supplier created (Draft)
- Supplier approved
- Supplier suspended (with reason)
- Supplier blacklisted (with reason)
- NCR linked to supplier

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Supplier list** | react-admin Datagrid with status filter (MIT) — Pattern only |
| **Supplier data model** | ERPNext Supplier master (GPL v3) — Inspiration only |
| **License risk** | Low (react-admin) / High (ERPNext) |
| **Guidance** | Add DB trigger blocking PO INSERT against blacklisted suppliers; wire scorecard to NCR data |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** Procurement

### 12. Sign-off Criteria
- DB trigger blocks PO creation against blacklisted suppliers
- Supplier status transitions require admin/ops authorization
- Supplier scorecard auto-calculated from NCR data
- Timeline events written on all status changes

---

## Module 12 — Saudi Factory Workspace

### 1. Playbook Requirement
Factory team works only on Saudi-routed, WO-entered projects. Per vehicle line: WO Number (mandatory), BOQ upload, BOM upload, GA Drawing upload, Detail Drawings, Required Manhours, Pending Raw Materials, Progress %. 30-Day Rule: every vehicle line must be updated at least every 30 days or it shows "Monthly Update Required" in Control Tower.

### 2. Current System Evidence
- **Routes/Pages:** `/factory`, `/factory/projects`, `/factory/projects/:id` (FactoryProjectWorkspace), `/factory/requirements`, `/factory/monthly-updates`
- **Tables:** `factory_records`, `factory_requirements`
- **Gate:** `executionGate.ts` — `canStartSaudiFactory()` checked in `FactoryProjectWorkspace.tsx`
- **Buckets:** `raw-material-files` storage bucket
- **Monthly update:** `FactoryMonthlyUpdates.tsx` — exists

### 3. Current Status
⚠️ **Partial** — Factory workspace with WO gate exists and functions. Missing: DB-level WO enforcement, BOM item-level tracking, monthly update reminder as server-side job, and document versioning for BOQ/BOM/Drawings.

### 4. Gap Analysis
- DB trigger on `factory_records` INSERT: reject without active WO (B-025, R-005)
- DB trigger on `factory_requirements` INSERT: reject without active WO (B-030, R-007)
- No BOM item-level line tracking — only file upload, no structured BOM items table (B-029)
- 30-Day rule: client-side check only, no Inngest cron job auto-flagging staleness (B-037)
- No document versioning on BOQ/BOM/GA Drawing files (B-034)
- No Required Manhours field confirmed in factory_records type

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Cannot enter factory details before WO | Enforced in UI ✅ — Missing in DB |
| BOQ/BOM/drawings require WO | Enforced in UI (partial) — Missing in DB |
| 30-day update rule | Missing (no server-side job) |

### 6. Required Documents and Evidence
- BOQ file (upload required per vehicle line)
- BOM file (upload required per vehicle line)
- GA Drawing (upload required per vehicle line)
- Detail Drawings (optional)
- Monthly update report (required every 30 days)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | View all, approve |
| Operations Manager | View all |
| Factory User | Edit own factory records (WO-gated) |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Raw Material Requests open → Control Tower tile
- Vehicle lines with "Monthly Update Required" (30-day rule)
- Factory progress % per project

### 9. Required Timeline / Audit Events
- BOQ uploaded
- BOM uploaded
- GA Drawing uploaded
- Monthly update submitted
- Factory progress updated (with %)
- Raw Material Request submitted

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **BOM data model** | ERPNext Work Order / BOM (GPL v3) — Inspiration only |
| **30-day reminder** | Inngest cron (MIT) — Direct (implement with BullMQ/MIT) |
| **File upload** | shadcn/ui FileUpload pattern (MIT) — Direct |
| **License risk** | High (ERPNext) / Low (Inngest, shadcn) |
| **Guidance** | Design BOM as structured table (`factory_bom_items`); implement 30-day check as pg-boss scheduled job |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Factory / Raw Materials

### 12. Sign-off Criteria
- DB trigger blocks factory_records without WO
- Monthly update reminder fires server-side after 30 days
- BOQ, BOM, GA Drawing uploads linked to vehicle line with versioning
- Control Tower "Raw Material Requests" tile shows live count

---

## Module 13 — Dubai Projects and AFS

### 1. Playbook Requirement
Dubai projects bypass Saudi factory. PN entered first. Dubai management tracks: PN Number, PO from Saudi to Dubai, ETA per vehicle line, Dubai Status, AFS Arrival Reports, Pre-delivery Reports, Missing Items, Delivery Readiness. AFS role: record arrival, file Arrival Report, file Pre-delivery Report, receive materials from Store, record delivery readiness.

### 2. Current System Evidence
- **Routes/Pages:** `/afs`, `/afs/projects`, `/afs/projects/:id` (DubaiAfsProjectDetail), `/afs/eta`, `/afs/arrival-reports`, `/afs/missing-items`, `/afs/predelivery-reports`, `/afs/condition-reports`
- **Tables:** `dubai_project_followups`, `dubai_eta_history`, `afs_arrival_reports`, `afs_missing_items`, `afs_predelivery_reports`, `afs_condition_reports`
- **Gate:** `executionGate.ts` — `canStartDubaiFollowUp()` used in `DubaiAfsProjectDetail.tsx`
- **Buckets:** `afs-attachments` storage bucket

### 3. Current Status
⚠️ **Partial** — Dubai/AFS workspace exists with PN gate at UI level. Multiple report pages created. Missing: DB-level PN enforcement, ETA change tracking confirmation, and live data wiring for list pages.

### 4. Gap Analysis
- DB trigger on `dubai_project_followups` INSERT: reject without active PN (B-024, R-006)
- DB trigger on `afs_arrival_reports` INSERT: reject without active PN (R-008)
- ETA change history exists (`dubai_eta_history`) but auto-capture on ETA change not confirmed
- Dubai AFS list pages may return mock data in live mode (B-004)
- No "Medical follow-up" module for Dubai + Medical projects

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Dubai follow-up blocked before PN | Enforced in UI ✅ — Missing in DB |
| AFS readiness blocked before PN | Enforced in UI (partial) — Missing in DB |
| ETA change records old + new ETA | Enforced in DB (table exists) — auto-capture unclear |

### 6. Required Documents and Evidence
- Arrival Report (AFS required on vehicle arrival)
- Pre-delivery Report (AFS required before delivery)
- Missing Items list (if applicable)
- Condition Report (vehicle condition at arrival)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Operations Manager | View all, approve delivery readiness |
| AFS User | Full CRUD on Dubai/AFS records |
| Others | No access to AFS data |

### 8. Required Reports / KPIs / Control Tower Signals
- Dubai projects by status
- ETA compliance (planned vs actual)
- Missing items by project
- AFS readiness rate

### 9. Required Timeline / Audit Events
- PN entered
- Dubai follow-up started
- ETA confirmed / changed
- Vehicle arrived (arrival report submitted)
- Pre-delivery report submitted
- Delivery readiness confirmed

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **ETA notifications** | Inngest (MIT) — Direct (implement with BullMQ) |
| **Timeline view** | Twenty CRM activity timeline (AGPL v3) — Inspiration only |
| **License risk** | Low (Inngest) / High (Twenty CRM) |
| **Guidance** | Add DB triggers for PN enforcement; add Inngest job for ETA overrun alerts |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Dubai / AFS

### 12. Sign-off Criteria
- DB trigger blocks dubai_project_followups without PN
- DB trigger blocks afs_arrival_reports without PN
- ETA change auto-logs to dubai_eta_history
- All Dubai/AFS list pages wired to live Supabase

---

## Module 14 — Store and Warehouse

### 1. Playbook Requirement
Store receives materials (linked to PR/PO) and vehicles (chassis + photos required). Store manages Inventory Search, Material Issuance, and Temporary Custody. Inventory tracked by Item Code, Serial Number, and Project. No inventory balance ledger currently.

### 2. Current System Evidence
- **Routes/Pages:** `/store`, `/store/receipts`, `/store/receipts/new`, `/store/receipts/:id`, `/store/vehicle-receiving`, `/store/vehicle-receiving/new`, `/store/vehicle-receiving/:id`, `/store/inventory`, `/store/unallocated`
- **Tables:** `store_receipts`, `store_receipt_items`
- **Buckets:** `vehicle-photos` (private), `qc-documents`
- **Components:** `StoreReceipts.tsx`, `StoreReceiptNew.tsx`, `StoreInventory.tsx`

### 3. Current Status
⚠️ **Partial** — Store receipt and vehicle receiving pages exist. Core data model is in place. Missing: inventory stock balance ledger (quantity tracking), minimum stock alerts, and live Supabase query wiring.

### 4. Gap Analysis
- No inventory quantity ledger — receipts are metadata only (B-027)
- No running stock balance per item/project
- `store_receipt_items.serial_required` exists but serial enforcement missing (B-002, R-011)
- No minimum stock alerts
- Store inventory page (`StoreInventory.tsx`) — live query status unclear
- Store unallocated materials tracking is partial

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Material receipt linked to PO | Unknown — FK to purchase_orders not confirmed |
| Serial required items tracked | Enforced in type (partial) — Missing in DB |
| Inventory balance maintained | Missing — no ledger |

### 6. Required Documents and Evidence
- Store Receipt document
- Vehicle Receiving Report
- Material delivery note

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Operations Manager | View all |
| Store User | Full CRUD on receipts, inventory |
| Procurement User | View receipts linked to PO |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Total unallocated materials
- Materials pending QC
- Vehicle receiving issues (missing chassis/photos) → Control Tower tile
- Stock below minimum level

### 9. Required Timeline / Audit Events
- Material received (with PO reference)
- Vehicle received (with chassis number)
- Item allocated to project
- Item issued to custody

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Inventory ledger** | ERPNext Stock Entry pattern (GPL v3) — Inspiration only |
| **Inventory search** | shadcn/ui Command palette (MIT) — Direct |
| **License risk** | High (ERPNext) / Low (shadcn) |
| **Guidance** | Design `stock_movements` ledger table with quantity delta; implement inventory balance as running sum |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Store / Custody / Serials

### 12. Sign-off Criteria
- Inventory balance ledger implemented
- All store list pages wired to live Supabase
- Material receipt links to PO via FK
- Control Tower "Vehicle Receiving Issues" tile shows live count

---

## Module 15 — Material Custody and Issuance

### 1. Playbook Requirement
Manages material movement after Store acceptance. States: In Store → Reserved → Pending Approval → Issued → Pending Acceptance → In Custody → Installed / Returned / Consumed / Lost/Damaged. Temporary Custody requires Admin or Operations Manager approval. Receiver must accept or reject.

### 2. Current System Evidence
- **Routes/Pages:** `/material-custody`, `/material-custody/new`, `/material-custody/:id`
- **Tables:** `material_custody_records`
- **Type model:** `MaterialCustodyStatus`, `CustodyApprovalStatus`, `CustodyReceiverDecision`, `CustodyIssueType`
- **Components:** `MaterialCustody.tsx`, `CustodyNew.tsx`, `CustodyDetail.tsx`

### 3. Current Status
⚠️ **Partial** — Type model for custody is comprehensive. Data model covers all required states. Critical gaps: `approval_required` flag set by UI only (not DB-enforced), and receiver acceptance state not enforced at DB level.

### 4. Gap Analysis
- DB trigger for custody approval (B-020, R-013): block `status = 'in_custody'` when `approval_required = true` and `approval_status != 'approved'`
- DB trigger for receiver decision (B-021, R-014): block `status = 'in_custody'` when `receiver_decision = 'pending'`
- RLS on `material_custody_records` (B-022): only store_user, admin, ops can create
- No SLA alert when receiver doesn't accept within 1 day (R-018)
- Custody approval mirror of migration 061 not yet implemented

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Temporary custody requires Admin/Ops approval | Enforced in UI (partial) — Missing in DB |
| Receiver must accept/reject | Data model only — Missing in DB enforcement |
| Approval authority: Admin/Ops only | Missing in RLS (B-022) |

### 6. Required Documents and Evidence
- Custody handover form/receipt
- Receiver acceptance confirmation

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full CRUD + approve custody |
| Operations Manager | Full access + approve custody |
| Store User | Create/issue custody records |
| Factory User | Accept/reject as receiver |
| Others | View own custody records |

### 8. Required Reports / KPIs / Control Tower Signals
- Materials in Custody → Control Tower tile
- Pending acceptance (receiver not confirmed)
- Temporary custody pending approval (SLA: 1 day)

### 9. Required Timeline / Audit Events
- Custody record created
- Approval requested (temporary custody)
- Custody approved by Admin/Ops
- Material issued
- Receiver accepted / rejected
- Material returned / installed / consumed

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Approval guard** | Mirror migration 061 PO approval guard — Direct |
| **State machine** | Plane state machine pattern (AGPL v3) — Inspiration only |
| **License risk** | Low (custom) / High (Plane) |
| **Guidance** | Implement custody approval guard as DB trigger mirroring migration 061; add RLS for store_user writes |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Store / Custody / Serials

### 12. Sign-off Criteria
- DB trigger blocks custody issuance without approval when `approval_required = true`
- DB trigger blocks `in_custody` status when `receiver_decision = 'pending'`
- RLS on `material_custody_records` restricts write access to authorized roles
- Control Tower "Materials in Custody" tile shows live count
- SLA fires when receiver doesn't respond within 1 day

---

## Module 16 — Vehicle Receiving

### 1. Playbook Requirement
Every vehicle or chassis received must have: Chassis Number (mandatory), Project/Vehicle Line link, Received Date/By, Condition, Photos (Front, Rear, Left, Right, Chassis Plate, Damage if any), Receiving Report. Receipt is NOT complete without Chassis Number and basic photos.

### 2. Current System Evidence
- **Routes/Pages:** `/store/vehicle-receiving`, `/store/vehicle-receiving/new`, `/store/vehicle-receiving/:id`, `/vehicle-receiving` (duplicate route)
- **Tables:** `vehicle_receipts`, `vehicle_receipt_photos`
- **Type model:** `VehicleReceipt.chassis_number: string`, `VehicleReceiptPhoto.photo_type: PhotoType`
- **Buckets:** `vehicle-photos` (private storage bucket)
- **Photo types:** `front | rear | left_side | right_side | chassis_plate | damage` (from `PhotoType` type)
- **Components:** `StoreVehicleReceivingNew.tsx`, `StoreVehicleReceivingDetail.tsx`

### 3. Current Status
⚠️ **Partial** — Vehicle receiving pages and photo upload exist. Type model is correct. Critical gaps: no DB NOT NULL constraint on `chassis_number`, no DB trigger verifying required photo types before status = accepted.

### 4. Gap Analysis
- DB NOT NULL: `vehicle_receipts.chassis_number` — needs database-level enforcement (B-018, R-012)
- DB trigger: all 5 required photo types must exist before `status = 'accepted'` (B-019, R-012)
- Duplicate route `/vehicle-receiving` (separate from `/store/vehicle-receiving`) — needs consolidation
- Vehicle receipt not linked to PR/PO via FK — is receiving linked to a PO?
- No chassis number deduplication check

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Chassis number required | Enforced in type (NOT NULL in TypeScript) — Missing in DB |
| Required photos before completion | Enforced in UI (partial) — Missing in DB |
| Receiving linked to project/vehicle line | Unknown — FK not confirmed |

### 6. Required Documents and Evidence
- Photos: Front, Rear, Left Side, Right Side, Chassis Plate (all required)
- Damage photo (if condition shows damage)
- Receiving Report

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Store User | Create/complete vehicle receipts |
| QC User | View for QC initiation |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Vehicle Receiving Issues (missing chassis/photos) → Control Tower tile
- Vehicles received this week/month
- Vehicles awaiting QC

### 9. Required Timeline / Audit Events
- Vehicle received (with chassis number)
- Photos uploaded
- Receiving completed
- Vehicle linked to project/vehicle line

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Photo upload UI** | shadcn/ui FileUpload multi-image pattern (MIT) — Direct |
| **Vehicle data model** | ERPNext Purchase Receipt (GPL v3) — Inspiration only |
| **License risk** | Low (shadcn) / High (ERPNext) |
| **Guidance** | Add DB NOT NULL on chassis_number; add DB trigger for required photos; consolidate duplicate route |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Store / Custody / Serials

### 12. Sign-off Criteria
- `vehicle_receipts.chassis_number` is NOT NULL at DB level
- DB trigger verifies all 5 required photo types before status = accepted
- Duplicate `/vehicle-receiving` route consolidated
- Control Tower "Vehicle Receiving Issues" tile shows live count

---

## Module 17 — Medical Items Serial Number Tracking

### 1. Playbook Requirement
Every medical item must be tracked at serial number level for QC assurance, traceability, and installation verification. Required fields: Serial Number, Batch Number / Expiry, Supplier / Manufacturer, QC Status, Current Custody, Installed On Vehicle. Cannot accept or install without serial number.

### 2. Current System Evidence
- **Routes/Pages:** Serial entry embedded in `StoreReceiptDetail.tsx`
- **Tables:** `medical_serial_numbers`, `store_receipt_items.serial_required: boolean`
- **Type model:** `MedicalSerialNumber`, `SerialQcStatus`, `store_receipt_items.serial_required`
- **Integration:** `store_receipt_items` has `serial_required` boolean flag

### 3. Current Status
⚠️ **Partial (Critical Risk)** — Data model and flag exist. The most critical gap: no DB constraint prevents accepting or installing a `serial_required = true` item without a registered serial number (R-011, B-002).

### 4. Gap Analysis
- DB trigger: when `store_receipt_item.status` changes to `accepted_by_qc` or `installed`, check `medical_serial_numbers` count for item — raise exception if `serial_required = true` and no serial (R-011, B-002)
- No dedicated Medical Serial Tracking page (currently embedded in receipt detail)
- Serial QC status tracking exists in types but no dedicated QC serial workflow
- No serial → installed vehicle tracking confirmed in current schema
- Batch number / expiry date fields need verification in `medical_serial_numbers` schema

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Cannot accept without serial (if serial_required=true) | 🔴 Missing in DB (Critical) |
| Cannot install without serial | 🔴 Missing in DB (Critical) |
| Serial number is unique per item | Unknown — UNIQUE constraint not confirmed |

### 6. Required Documents and Evidence
- Serial number registration at goods receipt
- QC check per serial
- Installation record (linked to vehicle)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Store User | Register serial numbers on receipt |
| QC User | Verify serial, update QC status |
| Factory User | Record installation (link serial to vehicle) |
| Others | View only |

### 8. Required Reports / KPIs / Control Tower Signals
- Medical items without serial (alert in Control Tower)
- Serial QC status summary
- Installed serials by vehicle/project

### 9. Required Timeline / Audit Events
- Serial number registered
- Serial QC passed
- Serial installed on vehicle (with vehicle line reference)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Serial tracking data model** | ERPNext Serial Number (GPL v3) — Inspiration only |
| **Enforcement trigger** | Custom DB trigger — modeled on migration 061 |
| **License risk** | High (ERPNext) / Low (custom) |
| **Guidance** | Add DB trigger on `store_receipt_items` UPDATE; add dedicated Medical Serials page with shadcn/ui search |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker
- **Phase:** Store / Custody / Serials

### 12. Sign-off Criteria
- DB trigger blocks `accepted_by_qc` and `installed` status without serial number when `serial_required = true`
- `medical_serial_numbers.serial_number` has UNIQUE constraint
- Dedicated Medical Serial Tracking page shows all serials with QC status
- Timeline event written when serial registered and when installed

---

## Module 18 — Production Raw Material Requests

### 1. Playbook Requirement
Production requests Raw Materials from system for specific project/WO or stock replenishment. Flow: Production creates request → Select Project/WO or Stock → Upload Excel File → System stores and classifies → Procurement/Store acts. Statuses: Draft → Submitted → Under Review → Sent to Procurement → Fulfilled. Cannot create without active WO.

### 2. Current System Evidence
- **Routes/Pages:** `/factory/raw-material-requests`, `/factory/raw-material-requests/new`
- **Tables:** `raw_material_requests`, `raw_material_request_items`
- **Buckets:** `raw-material-files` storage bucket
- **Components:** `FactoryRawMaterialRequests.tsx`, `FactoryRawMaterialRequestNew.tsx`
- **Status model:** `RawMaterialRequestStatus` type

### 3. Current Status
⚠️ **Partial** — Request creation with Excel upload exists. Missing: DB trigger blocking requests without WO (B-030), server-side Excel parser (B-028), and live query wiring.

### 4. Gap Analysis
- DB trigger: raw_material_requests INSERT blocked if project is Saudi route and no active WO (B-030, R-007)
- Excel parser not implemented (B-028) — `parsing_status: 'not_parsed' | 'pending_future_parser'` acknowledges this
- No BOM item-level extraction from Excel
- Request list page may use `mockOrEmpty()` in live mode
- No auto-link from Raw Material Request to PR creation

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Cannot create RMR without WO | Enforced in UI (partial) — Missing in DB |
| Excel file must be uploaded with request | Unknown — validation not confirmed |

### 6. Required Documents and Evidence
- Excel file (upload required — raw material list)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Factory User | Create, submit requests |
| Procurement User | View, process requests |
| Store User | View, fulfill requests |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Raw Material Requests open → Control Tower tile
- Requests pending Procurement action (SLA: 3 days)
- Unfulfilled requests by project

### 9. Required Timeline / Audit Events
- RMR submitted
- RMR sent to Procurement
- RMR fulfilled / partially fulfilled

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Request data model** | ERPNext Material Request (GPL v3) — Inspiration only |
| **Excel parser job** | Trigger.dev architecture (BSL) — implement with BullMQ (MIT) |
| **License risk** | High (ERPNext) / Low (BullMQ) |
| **Guidance** | Add DB trigger for WO enforcement; design `raw_material_request_items` to accept parsed output; implement async Excel parser as BullMQ job |

### 11. Priority and Recommended Phase
- **Priority:** High (WO gate), Medium (Excel parser)
- **Phase:** Factory / Raw Materials

### 12. Sign-off Criteria
- DB trigger blocks RMR without WO for Saudi projects
- Excel upload wired to `raw-material-files` bucket ✅
- Control Tower "Raw Material Requests" tile shows live count
- Future parser design documented (B-028 in backlog)

---

## Module 19 — Excel Upload, BOQ and BOM Future Parsing

### 1. Playbook Requirement
Current phase: Upload Excel files and link to Project/WO/Stock with metadata so future parser can process without redesign. Future phase: parser extracts items to create BOQ/BOM or PR Items automatically.

### 2. Current System Evidence
- **Tables:** `raw_material_request_items.parsing_status: 'not_parsed' | 'pending_future_parser'`
- **Design doc:** `docs/EXCEL_UPLOAD_FUTURE_BOM_BOQ_DESIGN.md` (exists)
- **Buckets:** `raw-material-files` storage bucket

### 3. Current Status
🔴 **Design only** — Storage and metadata schema exist. Parser is explicitly deferred. `parsing_status` field is a placeholder for future implementation.

### 4. Gap Analysis
- No parser implementation — by design for current phase
- Parser job design not started (B-028)
- BOM item-level table (`factory_bom_items`) not in current schema (B-029)
- Design doc (`EXCEL_UPLOAD_FUTURE_BOM_BOQ_DESIGN.md`) exists but needs to be aligned with reference library pattern

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Excel files must store metadata | Enforced in schema (partial) |
| Parser must not redesign schema | By policy — design doc exists |

### 6. Required Documents and Evidence
- Excel file (BOM/BOQ format)
- Parser output specification (future)

### 7. Required Permissions
Factory User creates; Procurement processes.

### 8. Required Reports / KPIs / Control Tower Signals
- Unparsed Excel files count
- Items parsed vs. total

### 9. Required Timeline / Audit Events
- Excel uploaded
- Parsing completed (future)
- BOQ/BOM items extracted (future)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Parser job** | Trigger.dev / Inngest architecture (BSL) — implement with BullMQ (MIT) |
| **Usage category** | Architecture reference — implement with BullMQ |
| **License risk** | Low (BullMQ) |
| **Guidance** | Design `factory_bom_items` table now; implement BullMQ job to parse Excel → insert rows; use Inngest durable function pattern |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** Factory / Raw Materials

### 12. Sign-off Criteria
- `factory_bom_items` table designed and migrated
- BullMQ parser job implemented and tested
- `parsing_status` updated to `parsed` after successful job
- Parsed items visible in factory workspace per vehicle line

---

## Module 20 — Quality Control

### 1. Playbook Requirement
Two types: (1) Material QC — triggered after Store receipt; accept or reject; NCR if rejected. (2) Vehicle/Project QC — triggered after Production or AFS readiness; checklist, findings, rework. Release Note issued ONLY after all QC observations and rework are closed.

### 2. Current System Evidence
- **Routes/Pages:** `/material-qc`, `/material-qc/inspections`, `/material-qc/inspections/:id`, `/material-qc/ncrs`, `/material-qc/ncrs/:id`, `/project-qc`, `/project-qc/inspections`, `/project-qc/findings`, `/project-qc/release-notes`, `/project-qc/release-notes/:id`
- **Tables:** `material_qc_inspections`, `material_ncrs`, `project_qc_inspections`, `project_qc_findings`, `qc_inspection_documents`, `release_notes`
- **Buckets:** `qc-documents` storage bucket
- **Status model:** `release_notes.release_status: 'draft' | 'blocked' | 'ready_to_issue' | 'issued' | 'cancelled'`
- **Finding status:** `ProjectQcFindingStatus: 'open' | 'rework_in_progress' | 'closed' | 'cancelled'`

### 3. Current Status
⚠️ **Partial** — QC module infrastructure is comprehensive. The critical gap is the Release Note gate: no DB trigger prevents issuing a Release Note while QC findings are open (R-015, B-001). This is the highest-priority governance gap.

### 4. Gap Analysis
- **B-001 (Critical):** DB trigger on `release_notes` UPDATE: when `release_status` changes to `ready_to_issue` or `issued`, verify all `project_qc_findings` for the project have `finding_status = 'closed'` or `cancelled`. Raise exception if any are open.
- NCR → CAPA auto-creation not enforced (B-031)
- QC list pages may use `mockOrEmpty()` in live mode (B-004)
- NCR closure evidence — types require it but UI enforcement unclear
- No mandatory QC checklist template enforcement per project type

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Release Note blocked until all findings closed | 🔴 Missing in DB (Critical — B-001) |
| NCR required on material rejection | Unknown — auto-creation not confirmed |
| QC inspection required before Release Note | Unknown — no FK from release_notes to inspections |

### 6. Required Documents and Evidence
- QC Inspection form / checklist
- NCR (if material rejected)
- Evidence documents (photos, test results)
- Release Note (after all findings closed)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access + release notes |
| Operations Manager | View all |
| QC User | Full CRUD on inspections, findings, NCRs, release notes |
| Factory User | View findings, confirm rework done |
| Store User | Receive QC result |
| Others | View only |

### 8. Required Reports / KPIs / Control Tower Signals
- QC Rework open → Control Tower tile (SLA: 7 days)
- NCR count by supplier
- QC rejection rate by material category
- Release notes issued vs pending

### 9. Required Timeline / Audit Events
- QC inspection created
- Material accepted / rejected by QC
- NCR created (if rejected)
- Finding opened / rework started / closed
- Release Note issued

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Release Note trigger** | Custom DB trigger modeled on migration 061 |
| **Finding/rework UX** | Plane issue model (AGPL v3) — Inspiration only |
| **NCR data model** | ERPNext Quality Inspection (GPL v3) — Inspiration only |
| **License risk** | Low (custom) / High (Plane, ERPNext) |
| **Guidance** | B-001 is the #1 priority; implement release_notes trigger before any other QC enhancement |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker (B-001)
- **Phase:** QC / Release

### 12. Sign-off Criteria
- DB trigger blocks release_notes.release_status to 'ready_to_issue' or 'issued' while open findings exist
- All QC list pages wired to live Supabase
- NCR auto-created when material rejected
- Control Tower "QC Rework" tile shows live count
- SLA fires after 7 days on open QC rework

---

## Module 21 — AFS Maintenance Requests After Delivery

### 1. Playbook Requirement
After project delivery, Sales / Operations / AFS can raise post-delivery maintenance requests linked to original project. Fields: Project/SO, WO or PN, Vehicle/Line, Issue Type/Priority, Attachments, Resolution Notes. Flow: Delivered Project → Issue Raised → AFS Maintenance Request Created → AFS Inspects → Waiting Parts/Repair → Resolved and Closed.

### 2. Current System Evidence
- **Routes/Pages:** `/after-sales`, `/after-sales/maintenance`, `/after-sales/maintenance/new`, `/after-sales/maintenance/:id`
- **Tables:** `afs_maintenance_requests`, `afs_maintenance_attachments`
- **Buckets:** `afs-attachments` storage bucket
- **Type model:** `AfsMaintenanceStatus`, `MaintenancePriority`, `MaintenanceIssueType`

### 3. Current Status
⚠️ **Partial** — AFS maintenance pages exist with correct type model. Missing: linkage to SO/WO/PN via FK (currently text fields), and live Supabase query wiring.

### 4. Gap Analysis
- `wo_reference` and `pn_reference` are text fields, not FK constraints → no referential integrity
- No DB rule preventing unlinked maintenance requests
- AFS maintenance list may use `mockOrEmpty()` (B-004)
- No auto-SLA for maintenance request resolution time
- No escalation path when maintenance is not resolved within SLA

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Maintenance request linked to project | Enforced in type (partial) — Missing in DB (no FK) |
| Linkage to WO/PN | Missing (text field only) |

### 6. Required Documents and Evidence
- Attachments (photos, reports of issue)
- Resolution notes

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access |
| Operations Manager | View all, escalate |
| AFS User | Create, manage, resolve maintenance requests |
| Sales User | Create maintenance request for own delivered projects |
| Others | No access |

### 8. Required Reports / KPIs / Control Tower Signals
- Open maintenance requests by status/priority
- Avg resolution time
- Maintenance requests by issue type

### 9. Required Timeline / Audit Events
- Maintenance request created (with project link)
- AFS inspection started
- Parts ordered / waiting repair
- Resolved and closed

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Maintenance ticket UX** | Plane issue model (AGPL v3) — Inspiration only |
| **Data model** | ERPNext Maintenance (GPL v3) — Inspiration only |
| **License risk** | High (Plane, ERPNext) |
| **Guidance** | Replace text `wo_reference` / `pn_reference` with FK to `project_execution_references`; add SLA rule for maintenance resolution |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** After Sales

### 12. Sign-off Criteria
- `afs_maintenance_requests` has FK to `projects` table
- `wo_reference` / `pn_reference` replaced with FK to `project_execution_references`
- AFS maintenance list wired to live Supabase
- SLA rule created for maintenance resolution time

---

## Module 22 — Document Control and Checklist Engine

### 1. Playbook Requirement
File upload alone is not sufficient. System must control: document type, version, status, owner, and linked entity. Document statuses: Uploaded → Under Review → Approved → Rejected → Superseded → Expired. Checklist types: Quotation Request, Project Approval, WO/PN Gate, Vehicle Receiving, Material Handover, Release Readiness.

### 2. Current System Evidence
- **Routes/Pages:** `/templates`, `/templates/new`, `/templates/:id`, `/templates/:id/generate`, `/generated-documents`
- **Tables:** `document_templates`, `template_fields`, `generated_documents`
- **Buckets:** `project-documents`, `quotation-documents`, `raw-material-files`, `vehicle-photos`, `qc-documents`, `afs-attachments`
- **Components:** `Templates.tsx`, `TemplateNew.tsx`, `TemplateGenerate.tsx`, `GeneratedDocuments.tsx`

### 3. Current Status
⚠️ **Partial** — Template engine and 6 storage buckets exist. Document status model is partially implemented in types. Missing: per-module required document checklist enforcement, document versioning (`supersedes_id` FK), and template bucket for generated docs.

### 4. Gap Analysis
- No per-module required document checklist enforcement (B-035)
- Document versioning: `supersedes_id` FK not in current schema (B-034)
- No `templates` and `generated-documents` storage bucket (B-036)
- Template engine is generic — not tied to governance-required document types
- Document status machine exists in types but `document_status` column not confirmed in all document tables

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Required documents per checklist type | Missing |
| Document versioning (supersedes_id) | Missing |
| Approved document required before stage gate | Missing |

### 6. Required Documents and Evidence
Checklist types requiring enforcement:
- Quotation spec file (enforced at UI level ✅)
- SO approval (route + medical) ✅
- WO entry ✅
- Vehicle Receiving (chassis + photos) — partial
- Material Handover — missing
- Release Readiness — missing

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full CRUD on templates + approve documents |
| Role-specific | Upload documents relevant to their module |
| Viewer | Read documents |

### 8. Required Reports / KPIs / Control Tower Signals
- Documents pending approval
- Expired documents
- Checklist completion rate per project

### 9. Required Timeline / Audit Events
- Document uploaded
- Document approved / rejected
- Document superseded (new version)
- Document expired

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Document management** | refine resource pattern (MIT) — Pattern only |
| **Versioning** | ERPNext Attachment model (GPL v3) — Inspiration only |
| **License risk** | Low (refine) / High (ERPNext) |
| **Guidance** | Add `supersedes_id` FK to document tables; add per-module required document checklist table; add template/generated-document storage bucket |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** Foundation (document standards before implementation phases)

### 12. Sign-off Criteria
- `supersedes_id` FK added to all document tables
- Per-module required document checklist table implemented
- Template + generated-document storage bucket created
- Document status transitions enforced

---

## Module 23 — Risks, Issues, Root Cause and CAPA

### 1. Playbook Requirement
Every major issue must have: Root Cause, Corrective Action, Preventive Action, Owner, Due Date, Evidence, Closure Approval. CAPA lifecycle: Open → In Progress → Resolved → Closed. Linked to project and NCR where applicable.

### 2. Current System Evidence
- **Routes/Pages:** `/reports/issues` (ReportsIssues), `/reports/capa` (ReportsCapa) — report views only
- **Tables:** `operational_issues`, `capa_records`
- **Type model:** `OperationalIssue`, `CapaRecord`, `CapaStatus`, `IssuePriority`
- **Integration:** NCR → CAPA linkage exists in types (`capa_records.ncr_id`)

### 3. Current Status
⚠️ **Partial** — Data model and tables exist. Reports exist (read-only). Critical gap: no dedicated CAPA management pages for creating/editing issues (B-032). CAPA is only visible in reports, not manageable from UI.

### 4. Gap Analysis
- No dedicated CAPA create/edit pages (B-032)
- NCR → CAPA auto-creation not confirmed (B-031)
- CAPA status workflow not enforced (B-033)
- No Due Date alert when CAPA approaches deadline
- Issues visible in report view only — no actionable management

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| CAPA required on critical NCR | Missing |
| CAPA requires Corrective + Preventive Action | Missing — fields exist, not required |
| CAPA closure requires approval | Missing |

### 6. Required Documents and Evidence
- Root Cause analysis document
- Evidence (photos, logs)
- Closure approval record

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full access + closure approval |
| Operations Manager | View all, escalate |
| QC User | Create from NCR, manage findings |
| Factory User | View CAPA on own projects |
| Others | View relevant records |

### 8. Required Reports / KPIs / Control Tower Signals
- Open CAPAs by status/priority
- Overdue CAPAs (past due date)
- CAPAs by module/issue type
- CAPA effectiveness rate

### 9. Required Timeline / Audit Events
- Issue / CAPA created
- Root cause identified
- Corrective action taken
- CAPA closed (with approver)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **CAPA UX** | Plane issue lifecycle (AGPL v3) — Inspiration only |
| **Data model** | ERPNext CAPA (GPL v3) — Inspiration only |
| **Management pages** | refine create/edit resource pattern (MIT) — Pattern only |
| **License risk** | High (Plane, ERPNext) / Low (refine) |
| **Guidance** | Build dedicated CAPA management pages using refine pattern; implement NCR → CAPA auto-creation; add CAPA closure approval |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** QC / Release (alongside Module 20)

### 12. Sign-off Criteria
- Dedicated CAPA create/edit/close pages built
- NCR auto-creates CAPA when material rejected
- CAPA closure requires admin/ops approval
- SLA fires for overdue CAPAs

---

## Module 24 — SLA, Escalation and Notifications

### 1. Playbook Requirement
8 SLA rules with 4-level escalation chains. Key conditions: quotation not processed (2 days), SO approved without WO/PN (2 days), PR without PO (3 days), PO > 10k pending approval (2 days), temporary custody pending acceptance (1 day), factory update missing (30 days), QC rework open (7 days). Escalation levels: 1=Assigned, 2=Dept Manager, 3=Ops Manager, 4=Senior Management.

### 2. Current System Evidence
- **Routes/Pages:** `/reports/sla`, `/admin/notification-rules`, `/notifications`, `/notification-settings`
- **Tables:** `sla_rules`, `sla_events`, `notifications`, `notification_preferences`, `notification_escalation_rules`
- **Services:** `src/lib/slaEngine.ts`, `src/lib/quotationSla.ts` — client-side SLA calculation
- **Components:** `ReportsSLA.tsx`, `AdminNotificationRules.tsx`, `Notifications.tsx`

### 3. Current Status
⚠️ **Partial (Critical)** — SLA data model, client-side calculation, and notification tables exist. Critical gap: no server-side background job creates `sla_events` or fires escalations. All SLA logic is client-side only — if no user is viewing the page, no SLA events fire (R-018, B-006).

### 4. Gap Analysis
- No background SLA scheduler — Inngest/BullMQ job not implemented (B-006, R-018)
- No escalation chain execution (B-007)
- Notification delivery not wired — `notifications` table has records but no delivery mechanism (email, in-app)
- `AdminNotificationRules.tsx` page exists but may show mock data
- No in-app notification bell/count in header
- SLA report page uses `mockOrEmpty()` (B-004)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| SLA breach creates sla_events | Missing — no server-side job |
| Escalation fires automatically | Missing |
| User notified in-app on breach | Missing |

### 6. Required Documents and Evidence
- SLA configuration (rules table)
- Escalation chain configuration

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Configure SLA rules, view all events |
| Operations Manager | View all SLA events, receive Level 3 escalations |
| Role-specific | Receive escalation notifications at their level |

### 8. Required Reports / KPIs / Control Tower Signals
- SLA breach count by rule type
- Active escalations by level
- Average time to resolve SLA breach
- Escalation heatmap

### 9. Required Timeline / Audit Events
- SLA breach detected (with rule, entity, timestamp)
- Escalation fired (with level, recipient)
- SLA resolved (breach closed)

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **SLA scheduler** | Inngest durable function (BSL) — implement with BullMQ (MIT) or pg-boss (MIT) |
| **Notification delivery** | Novu MIT SDK — Direct; or custom notification service |
| **Usage category** | Architecture reference (Inngest) / Direct (BullMQ, Novu SDK) |
| **License risk** | Low (BullMQ, Novu SDK) / High (Inngest BSL, Novu Server AGPL) |
| **Guidance** | Implement SLA checker as pg-boss scheduled job (PostgreSQL-native, MIT); use Novu MIT SDK for in-app notification center |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker
- **Phase:** Foundation (B-006 is Tier 1)

### 12. Sign-off Criteria
- pg-boss or BullMQ job runs every 15 minutes, creates `sla_events` on breach
- Escalation chain fires notifications at each level
- In-app notification bell shows unread count
- SLA report shows live breach data
- All 8 SLA rules from playbook are configured in `sla_rules` table

---

## Module 25 — Reporting and KPI Framework

### 1. Playbook Requirement
7 report categories: Quotation Reports, Execution Reference Reports (missing WO/PN), Procurement Reports, Store/Custody Reports, Vehicle Receiving Reports, Raw Material Reports, Supplier Reports. All reports based on recorded system data. Export to CSV minimum.

### 2. Current System Evidence
- **Routes/Pages:** `/reports` hub, 13+ report sub-pages: `/reports/quotations`, `/reports/so-tracking`, `/reports/procurement`, `/reports/store`, `/reports/vehicle-receiving`, `/reports/raw-materials`, `/reports/suppliers`, `/reports/qc`, `/reports/sla`, `/reports/issues`, `/reports/capa`, `/reports/data-quality`, `/reports/schedules`
- **Tables:** `report_definitions`, `saved_report_views`, `report_snapshots`, `department_health_scores`, `project_health_scores`
- **Data mode:** ALL 13 report pages use `mockOrEmpty()` — return empty or mock data in live mode

### 3. Current Status
🔴 **Mock only in live mode** — All 13 report pages and the Control Tower return mock data. This is operational blindness at the management level (R-019, B-004).

### 4. Gap Analysis
- All 13 report pages must replace `mockOrEmpty(MOCK_*)` calls with live Supabase queries (B-004)
- No chart/visualization components (B-038) — no bar charts, pie charts, trend lines
- No CSV export on any report page
- No drill-down from KPI numbers to underlying records
- No scheduled report delivery (B-041)
- Health score calculation not implemented (B-039)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Reports based on real data | 🔴 Missing — all mock |
| Export required | Missing |
| Data completeness for reports | Depends on upstream module data quality |

### 6. Required Documents and Evidence
- Report output files (CSV export)
- Scheduled report delivery

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | All reports |
| Operations Manager | All reports |
| Sales User | Own sales reports |
| Viewer | All configured report views |
| Others | Module-specific reports |

### 8. Required Reports / KPIs / Control Tower Signals
- Quotation turnaround time
- SOs without WO/PN (execution gap report)
- Procurement: open PRs, PO approval queue, ETA overruns
- QC rejection rates
- Supplier quality scores
- AFS delivery readiness rates

### 9. Required Timeline / Audit Events
- Report generated / exported
- Scheduled report delivered

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Report data grid** | refine `useList` with filters (MIT) — Pattern only |
| **Chart visualizations** | Recharts (MIT) — Direct |
| **CSV export** | Native `react-csv` or browser download (MIT) — Direct |
| **Report categories** | ERPNext report types (GPL v3) — Inspiration only |
| **License risk** | Low (refine, Recharts) / High (ERPNext) |
| **Guidance** | Replace all `mockOrEmpty()` in report pages; add Recharts for visualizations; add CSV download button |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker (B-004)
- **Phase:** Control Tower / SLA / Reports

### 12. Sign-off Criteria
- All 13 report pages wired to live Supabase queries
- Each report has CSV export
- At least 3 chart visualizations per report type
- Drill-down from numbers to underlying records
- Scheduled report delivery working

---

## Module 26 — Operations Control Tower

### 1. Playbook Requirement
Daily command page for Admin and Operations Manager. 9 KPI tiles: Pending Quotations, SO without WO, SO without PN, PO Approval Pending (>10k), Materials in Custody, Vehicle Receiving Issues, Raw Material Requests open, QC Rework open, Critical Issues. Each tile: count + link to pre-filtered list + auto-refresh.

### 2. Current System Evidence
- **Routes/Pages:** `/control-tower` (ControlTower)
- **Tables:** Would aggregate from: `projects`, `sla_events`, `purchase_orders_to_supplier`, `material_custody_records`, `vehicle_receipts`, `project_qc_findings`, `raw_material_requests`, `afs_maintenance_requests`
- **Components:** `ControlTower.tsx`
- **Data mode:** ControlTower uses `mockOrEmpty()` for ALL 9 sections — returns empty or mock data in live mode (B-003)

### 3. Current Status
🔴 **Mock only** — The ControlTower page exists with correct tile layout but all data is mock in live mode. This is the single most critical operational gap (B-003).

### 4. Gap Analysis
- All 9 Control Tower sections must be wired to live Supabase aggregation queries (B-003)
- No auto-refresh mechanism implemented
- No drill-down from tile count to filtered list
- Aggregation queries will require indexes on status columns for performance
- No critical issue escalation alert visual (color-coded tiles)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Control Tower shows live operational state | Missing (B-003) |
| Auto-refresh every 30 seconds | Missing |

### 6. Required Documents and Evidence
None — operational dashboard.

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full Control Tower |
| Operations Manager | Full Control Tower |
| Others | Role-specific mini-dashboard only |

### 8. Required Reports / KPIs / Control Tower Signals
All 9 tiles must show live counts:
1. Pending Quotations (quotation_requests where status = unprocessed)
2. SO without WO (projects: Saudi, approved, no active WO)
3. SO without PN (projects: Dubai, approved, no active PN)
4. PO Approval Pending (purchase_orders_to_supplier where approval_status = pending AND purchase_value > 10000)
5. Materials in Custody (material_custody_records where status = in_custody)
6. Vehicle Receiving Issues (vehicle_receipts where chassis_number IS NULL OR missing photos)
7. Raw Material Requests open (raw_material_requests where status != fulfilled)
8. QC Rework open (project_qc_findings where finding_status IN (open, rework_in_progress))
9. Critical Issues (sla_events where escalation_level >= 3)

### 9. Required Timeline / Audit Events
No timeline events for Control Tower itself (it is read-only aggregation).

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Dashboard layout** | Appsmith dashboard card grid (Apache 2.0) — Inspiration only |
| **Live data** | refine `useList` with real-time refresh (MIT) — Pattern only |
| **Tile cards** | shadcn/ui Card + Badge (MIT) — Direct |
| **License risk** | Low (shadcn, refine) |
| **Guidance** | Replace all `mockOrEmpty()` calls with `supabase.from().select().count()`; add auto-refresh interval with React `useEffect` |

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker (B-003)
- **Phase:** Control Tower / SLA / Reports

### 12. Sign-off Criteria
- All 9 tiles show live counts from Supabase
- Auto-refresh every 30 seconds
- Clicking any tile opens pre-filtered list view
- Tiles color-coded: 0 = green, any count = amber/red by severity
- Critical Issues tile escalates to red when escalation_level >= 3

---

## Module 27 — Data Quality and Master Data

### 1. Playbook Requirement
System must block invalid state transitions (8 data quality checks from playbook). Master data lists: Vehicle Types, Material Categories, Supplier Categories, Approved Suppliers, Customers, Document Types, Root Cause Categories, Issue Types, SLA Rules, Checklist Templates, Store Locations.

### 2. Current System Evidence
- **Routes/Pages:** `/reports/data-quality` (ReportsDataQuality)
- **Tables:** `master_data`, `project_health_scores`, `department_health_scores`
- **Types:** `DataQualityCheck` type defined in `src/types/index.ts`
- **Master data:** `master_data` generic table — not module-specific master tables

### 3. Current Status
⚠️ **Partial** — Master data generic table exists. Data quality report page exists but shows mock data. Customer is free-text (B-026), vehicle types are free-text, no dedicated master data management pages.

### 4. Gap Analysis
- No dedicated master data CRUD pages for: Vehicle Types, Material Categories, Supplier Categories, Document Types, Root Cause Categories, Issue Types
- Customer is free-text `customer_name` — no `customers` master table (B-026)
- Data quality check page uses `mockOrEmpty()` (B-004)
- No automatic data quality scan job
- Health score calculation not implemented (B-039)

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| 8 data quality blocking rules | Partially enforced — see modules 5-20 |
| Master data enforced via FK | Missing — most fields are free-text |

### 6. Required Documents and Evidence
None — data quality is operational hygiene.

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | CRUD on all master data |
| Others | Read master data lists (for form selects) |

### 8. Required Reports / KPIs / Control Tower Signals
- Data quality score per module
- Records failing data quality checks
- Customer records with missing fields

### 9. Required Timeline / Audit Events
- Master data record created/updated
- Data quality scan run

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Master data pages** | refine CRUD screens (MIT) — Pattern only |
| **Master data model** | ERPNext master DocTypes (GPL v3) — Inspiration only |
| **License risk** | Low (refine) / High (ERPNext) |
| **Guidance** | Create `customers`, `vehicle_types`, `material_categories` dedicated tables with FK constraints on operational tables |

### 11. Priority and Recommended Phase
- **Priority:** Medium
- **Phase:** Architecture Cleanup

### 12. Sign-off Criteria
- `customers` table with FK from `projects.customer_id`
- `vehicle_types` table with FK from `project_vehicle_lines.vehicle_type_id`
- Master data CRUD pages for all 10 master data types
- Data quality page wired to live Supabase

---

## Module 28 — Timeline and Audit Governance

### 1. Playbook Requirement
Every significant event must appear in Timeline. Every data change must appear in Audit Log. Timeline is project-level (all roles with access see it). Audit log is admin-only (field-level changes with old/new values, user, timestamp).

### 2. Current System Evidence
- **Routes/Pages:** `/admin/audit-log` (AuditLog), timeline section in `ProjectDetail.tsx`
- **Tables:** `audit_log`, `timeline_events`, `project_timeline_events`, `quotation_timeline_events`
- **Services:** `src/lib/projectAudit.ts`, `quotationAudit.ts`, `procurementAudit.ts`, `factoryAudit.ts`, `qcAudit.ts`, `storeAudit.ts`, `afsAudit.ts`
- **Coverage:** Audit libs exist for all 7 major modules

### 3. Current Status
⚠️ **Partial** — Excellent foundation: 7 module audit libs, 4 timeline tables, AuditLog page. Gaps: audit lib calls are inconsistent across pages — some pages call them, others don't. No DB trigger enforces audit writing. Timeline visible in ProjectDetail but not in all detail pages.

### 4. Gap Analysis
- Inconsistent audit lib usage — no DB trigger forces timeline event creation (R-016, R-017)
- Timeline section not present in all module detail pages (QuotationDetail, PO Detail, etc.)
- Audit log writes manual — bypassed if developer forgets to call audit lib
- No `pg_audit` extension or generic audit trigger on key tables
- Field-level change tracking (old value / new value) may not be implemented for all tables

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| All status changes logged to audit_log | Enforced in UI (partial) — Missing in DB trigger |
| Timeline events on key transitions | Enforced in UI (partial) — Missing in DB trigger |
| Field-level changes captured | Missing for most tables |

### 6. Required Documents and Evidence
- Audit log access (Admin only)
- Timeline view (all authorized roles)

### 7. Required Permissions
| Role | Access |
|------|--------|
| Admin | Full audit log access |
| All authorized | Project timeline (own projects) |
| Others | No audit log |

### 8. Required Reports / KPIs / Control Tower Signals
- Audit log search by entity / user / date
- Timeline events by project
- Missing audit coverage report

### 9. Required Timeline / Audit Events
This module defines what ALL other modules must emit. See the Required Timeline Events section in each module above.

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **Timeline UX** | Twenty CRM activity timeline (AGPL v3) — Inspiration only |
| **Audit log** | ERPNext audit trail (GPL v3) — Inspiration only |
| **DB audit trigger** | Custom `pg_trigger` — Direct |
| **License risk** | High (Twenty CRM, ERPNext) / Low (custom) |
| **Guidance** | Add generic audit DB trigger for all critical table status changes; standardize timeline event format across all modules |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Foundation (audit must be consistent before implementation phases)

### 12. Sign-off Criteria
- DB trigger auto-creates timeline event on every governed status transition
- All 7 audit libs called consistently from all pages
- Timeline section present in all module detail pages
- Audit log shows field-level old/new values
- Admin-only audit log access confirmed via RLS

---

## Module 29 — Roles and Permissions

### 1. Playbook Requirement
10 roles with distinct responsibilities and financial visibility. Admin sees all. Financial visibility: Admin (full), Ops Manager (by permission), Sales User (own values + quotation), Sales Coordinator (quotation values), Procurement (purchase cost), Factory/Store/QC/AFS (no financial values), Viewer (by permission).

### 2. Current System Evidence
- **Routes/Pages:** `/admin/users`, `/settings`, `/admin/access-requests`, `/request-access`
- **Tables:** `profiles`, `user_roles`, `access_requests`
- **Services:** `src/lib/roles.ts` — `ROLE_CONFIGS`, `financialVisibility` per role
- **Components:** `RequireRole.tsx`, `ProtectedRoute.tsx`
- **Auth:** `AuthContext.tsx` — role injection from Supabase profile
- **RLS:** `current_user_role()` PostgreSQL function used in all RLS policies
- **Types:** `PERMISSION_KEYS` defined — not wired to checks

### 3. Current Status
✅ **Substantially complete** — 10 roles fully defined with route guards and `financialVisibility`. `RequireRole` component works correctly. Access request workflow exists. Gaps: `PERMISSION_KEYS` not wired, RLS gaps on several tables, no audit trail for role changes.

### 4. Gap Analysis
- `PERMISSION_KEYS` type defined but not wired to any access checks
- RLS gaps: `quotation_requests`, `material_custody_records` (B-012, B-022)
- No audit trail when user's role changes (B-048)
- Financial visibility enforced at UI level (`financialVisibility`) — not enforced in Supabase RLS column filtering
- `MOCK_CURRENT_USER` in `roles.ts` is legacy — should be removed

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Factory/Store/QC/AFS see no financial values | Enforced in UI — Missing in Supabase RLS |
| Role guards on all sensitive routes | Enforced in UI (RequireRole) ✅ |
| Role changes audited | Missing (B-048) |

### 6. Required Documents and Evidence
- Access request approval record
- Role assignment history (audit log)

### 7. Required Permissions
This module defines permissions for all other modules. See role matrix in `docs/system-audit/05-roles-permissions-rls-audit.md`.

### 8. Required Reports / KPIs / Control Tower Signals
- Users by role
- Pending access requests
- Role changes in last 30 days (audit)

### 9. Required Timeline / Audit Events
- User role assigned
- User role changed
- Access request approved/rejected

### 10. Reference Library Pattern
| Aspect | Recommendation |
|--------|---------------|
| **RBAC** | refine `accessControlProvider` pattern (MIT) — Pattern only |
| **Permission hooks** | refine `useCan()` (MIT) — Pattern only |
| **License risk** | Low |
| **Guidance** | Wire `PERMISSION_KEYS` to `useCan()` checks; add RLS column filtering for financial visibility; add role change audit trigger |

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** RBAC/RLS

### 12. Sign-off Criteria
- `PERMISSION_KEYS` wired to access control checks
- RLS on `quotation_requests` and `material_custody_records` restricts access by role
- Financial data columns excluded from Supabase responses for non-financial roles
- Role change audit events written to audit_log
- `MOCK_CURRENT_USER` removed from `roles.ts`

---

## Module 30 — Implementation Roadmap

### 1. Playbook Requirement
10 implementation phases: 1=Foundation, 2=Project Core, 3=Quotation, 4=SO-WO/PN Gate, 5=Procurement, 6=Factory/Dubai/AFS, 7=Store/Custody, 8=QC/Release, 9=After Sales, 10=Operational Excellence. Rule: next phase does not begin until current phase passes E2E testing.

### 2. Current System Evidence
- **Documents:** `docs/IMPLEMENTATION_ROADMAP.md` exists
- **Phase test plans:** `docs/PHASE_1_TEST_PLAN.md` through `docs/PHASE_10_TEST_PLAN.md` exist

### 3. Current Status
⚠️ **Partial** — Roadmap and test plans exist. However, many phases have been partially implemented without full sign-off. The system currently contains a mix of complete, partial, and missing items across all phases.

### 4. Gap Analysis
- Phase gate enforcement: no formal sign-off process before next phase begins
- Test plans exist but pass/fail results not documented
- Reference library patterns not yet incorporated into phase plans

### 5. Required Governance Rules
| Rule | Enforcement |
|------|------------|
| Phase gate before next phase | Missing — process only |

### 6. Required Documents and Evidence
- Phase sign-off checklist per phase
- E2E test results per phase

### 7. Required Permissions
Admin and Operations Manager sign off phases.

### 8. Required Reports / KPIs / Control Tower Signals
- Implementation progress per phase
- Open items per phase

### 9. Required Timeline / Audit Events
- Phase started
- Phase gate passed (sign-off)

### 10. Reference Library Pattern
The `docs/governance/module-signoff-template.md` (created in this Step 3) defines the sign-off process.

### 11. Priority and Recommended Phase
- **Priority:** High
- **Phase:** Architecture Cleanup (define process before implementing phases)

### 12. Sign-off Criteria
- Formal sign-off template used for every phase
- Phase test results documented
- Reference library patterns confirmed for each phase

---

## Module 31 — Final Operating Charter / Permanent Rules

### 1. Playbook Requirement
20 permanent rules that never change regardless of implementation phase. Key rules include: no "BO" term (use "PO to Supplier"), WO mandatory before Saudi execution, PN mandatory before Dubai, no BOQ/BOM before WO, no ETA before PN, PO > 10k requires approval, temporary custody requires approval, medical items require serial numbers, vehicle receiving requires chassis + photos, Excel stored for future parsing, every delay has SLA, every event in Timeline, no Release Note before QC closed, no reports without data quality.

### 2. Current System Evidence
All 20 permanent rules are mapped to governance rules R-001 through R-019 in `docs/system-audit/07-governance-rules-gap-analysis.md` and to the `docs/governance/critical-governance-rules-register.md` created in this Step 3.

### 3. Current Status
⚠️ **Partial** — Rules are understood and partially enforced. Critical rules R-011 (medical serial) and R-015 (release note gate) are not enforced at DB level.

### 4. Gap Analysis
See `docs/governance/critical-governance-rules-register.md` for full rule-by-rule analysis.

### 5. Required Governance Rules
All 20 permanent rules must be enforced at DB level. See critical rules register.

### 6. Required Documents and Evidence
- Critical governance rules register (this Step 3 deliverable)
- Sign-off criteria per rule

### 7. Required Permissions
Admin is responsible for governance rule enforcement.

### 8. Required Reports / KPIs / Control Tower Signals
- Governance rule compliance dashboard
- Rule violation log

### 9. Required Timeline / Audit Events
- Any governance rule violation attempt (blocked or not)

### 10. Reference Library Pattern
The 20 permanent rules map to implementation patterns in `docs/reference-library/04-implementation-opportunities-backlog.md`.

### 11. Priority and Recommended Phase
- **Priority:** Critical blocker
- **Phase:** Architecture Cleanup

### 12. Sign-off Criteria
- All 20 permanent rules have DB-level enforcement
- Zero critical governance gaps in `docs/system-audit/07-governance-rules-gap-analysis.md`
