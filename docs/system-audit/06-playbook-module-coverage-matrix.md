# 06 — Playbook Module Coverage Matrix

Legend:
- Status: ✅ Complete | ⚠️ Partial | 🔴 Missing | 🏗️ Built but not aligned
- Risk: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- Reference Usage: Direct | Pattern only | Inspiration only | Avoid

---

## Module 1 — Foundation

| Item | Detail |
|------|--------|
| **Status** | ✅ Complete |
| **Pages** | Login, RequestAccess, AppLayout, Sidebar, Header |
| **Tables** | profiles, user_roles, audit_log, timeline_events, master_data |
| **Components** | ProtectedRoute, RequireRole, AuthContext, AppLayout |
| **Missing** | ESLint config; shadcn/ui design system not adopted |
| **Risk** | 🟡 Medium |
| **Phase** | Done — needs design system upgrade |
| **Reference** | shadcn/ui (Direct, MIT, Low risk) for design system foundation |

---

## Module 2 — Quotation Management

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | Quotations, QuotationNew (wizard ✅), QuotationDetail |
| **Tables** | quotation_requests, quotation_request_lines, quotation_documents, quotation_timeline_events |
| **Key Gaps** | Spec-file gate: ✅ client-side; DB-level not enforced. Coordinator return gate (PDF + number): ❓ not verified at DB. SLA client-side only. |
| **Missing** | RLS on quotation_requests; live Supabase query wiring on Quotations list |
| **Risk** | 🟠 High |
| **Phase** | Phase 2 |
| **Reference** | refine (Pattern only, MIT, Low risk) for list/detail structure |

---

## Module 3 — Sales Coordinator

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | SalesCoordinator |
| **Tables** | quotation_requests (coordinator columns: quotation_number, pdf path, coordinator_remarks) |
| **Key Gaps** | Return-to-sales validation (PDF + quotation_number mandatory) not enforced at DB. Coordinator workspace not role-filtered in live mode. |
| **Missing** | Live Supabase query; DB constraint on return action |
| **Risk** | 🟠 High |
| **Phase** | Phase 2 |
| **Reference** | refine (Pattern only, MIT, Low risk) for workspace/queue view |

---

## Module 4 — Sales Workspace

| Item | Detail |
|------|--------|
| **Status** | 🔴 Mock only |
| **Pages** | Sales |
| **Tables** | hot_projects, quotation_requests, projects, invoicing_plans |
| **Key Gaps** | Sales workspace is not wired to live Supabase. "What is pending for me?" view not built. Aging and next-action summaries are mock. |
| **Missing** | Live aggregation query; role-filtered project/quotation view for sales_user |
| **Risk** | 🟠 High |
| **Phase** | Phase 2 |
| **Reference** | Twenty CRM (Inspiration only, AGPL, High risk) for pipeline/next-action UX |

---

## Module 5 — SO Registration

| Item | Detail |
|------|--------|
| **Status** | ✅ Substantially complete |
| **Pages** | Projects, ProjectNew, ProjectDetail |
| **Tables** | projects, project_vehicle_lines, project_documents, project_timeline_events |
| **Key Gaps** | RLS on projects: ✅. All authenticated users can create SO (no RequireRole on /projects/new). Contract/PO document not mandated at DB level. |
| **Missing** | RequireRole guard on ProjectNew; contract/PO document upload enforcement |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 3 |
| **Reference** | refine (Pattern only, MIT, Low risk) for SO detail page tab structure |

---

## Module 6 — Admin Approval

| Item | Detail |
|------|--------|
| **Status** | ✅ Complete |
| **Pages** | AdminApprovals |
| **Tables** | projects (project_status, manufacturing_location, medical_items columns) |
| **Key Gaps** | None critical — route, Medical, and Saudi/Dubai all enforced in AdminApprovals page |
| **Risk** | 🟢 Low |
| **Phase** | Phase 3 |
| **Reference** | None needed |

---

## Module 7 — Approval & Routing Engine

| Item | Detail |
|------|--------|
| **Status** | ✅ Substantially complete |
| **Pages** | AdminApprovals (routing selection), WoPnGate (shows routing result) |
| **Tables** | projects (manufacturing_location), project_execution_references |
| **Key Gaps** | After approval, WO/PN task notification not auto-sent. Control Tower routing state not live. |
| **Missing** | Notification trigger on SO approval; real-time Control Tower update |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 3 |
| **Reference** | Inngest/Trigger.dev (Direct, MIT/Apache, Low risk) for approval-triggered notifications |

---

## Module 8 — WO/PN Gate

| Item | Detail |
|------|--------|
| **Status** | ✅ Complete |
| **Pages** | WoPnGate |
| **Tables** | project_execution_references |
| **Library** | `executionGate.ts` — `canStartSaudiFactory()`, `canStartDubaiFollowUp()` |
| **Key Gaps** | Gate is enforced in UI and used in FactoryProjectWorkspace and DubaiAfsProjectDetail. DB-level block on factory_records insert without wo_reference_id not confirmed. |
| **Missing** | DB trigger to reject factory_records insert if no active WO for Saudi route |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 4 |
| **Reference** | ERPNext (Inspiration only, GPL, High risk) for WO lifecycle validation patterns |

---

## Module 9 — Procurement & PO Approval

| Item | Detail |
|------|--------|
| **Status** | ✅ Substantially complete |
| **Pages** | Procurement, ProcurementRequests, ProcurementRequestDetail, ProcurementPurchaseOrders, ProcurementPODetail, ProcurementEtaHistory |
| **Tables** | procurement_requests, purchase_orders_to_supplier, eta_change_history |
| **RLS** | ✅ PO approval: dual-enforced (RLS policy + DB trigger in migration 061) |
| **Key Gaps** | `approval_required` flag auto-setting (for POs > 10,000 SAR) needs DB trigger confirmation. PR-to-PO link tracking. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 5 |
| **Reference** | react-admin (Pattern only, MIT, Low risk) for PO list/filter/approval views |

---

## Module 10 — Approved Suppliers

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | ProcurementSuppliers, ProcurementSupplierDetail |
| **Tables** | approved_suppliers, supplier_scorecards |
| **Key Gaps** | All supplier status transitions need workflow enforcement. Blacklist/suspend actions not DB-level gated. No auto-link from NCR to supplier quality score. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 5 |
| **Reference** | react-admin (Pattern only, MIT, Low risk) for supplier record management |

---

## Module 11 — Saudi Factory

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | Factory, FactoryProjects, FactoryProjectWorkspace, FactoryRequirements, FactoryMonthlyUpdates |
| **Tables** | factory_records, factory_requirements |
| **Key Gaps** | WO gate enforced in UI via executionGate.ts ✅. No DB constraint preventing factory_records without WO. Monthly update reminder is client-side logic only. No BOM item-level line tracking. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 7 |
| **Reference** | ERPNext (Inspiration only, GPL, High risk) for BOM structure; Inngest (Direct, MIT, Low risk) for monthly update reminders |

---

## Module 12 — Dubai Projects & AFS

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | DubaiAFS, DubaiAfsProjects, DubaiAfsProjectDetail, DubaiAfsEta, DubaiAfsArrivalReports, DubaiAfsMissingItems, DubaiAfsPredeliveryReports, DubaiAfsConditionReports |
| **Tables** | dubai_project_followups, dubai_eta_history, afs_arrival_reports, afs_missing_items, afs_predelivery_reports, afs_condition_reports |
| **Key Gaps** | PN gate enforced in UI ✅. No DB-level block on dubai_project_followups insert without PN. ETA history exists but auto-capture of changes not confirmed. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 8 |
| **Reference** | Inngest (Direct, MIT, Low risk) for ETA change notifications |

---

## Module 13 — Store & Warehouse

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | Store, StoreReceipts, StoreReceiptNew, StoreReceiptDetail, StoreVehicleReceiving, StoreVehicleReceivingNew, StoreVehicleReceivingDetail, StoreInventory, StoreUnallocated |
| **Tables** | store_receipts, store_receipt_items |
| **Key Gaps** | No inventory quantity ledger. Receipt is metadata only — no running stock balance. No minimum stock alerts. |
| **Risk** | 🟠 High |
| **Phase** | Phase 6 |
| **Reference** | ERPNext (Inspiration only, GPL, High risk) for stock entry/ledger patterns |

---

## Module 14 — Material Custody

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | MaterialCustody, CustodyNew, CustodyDetail |
| **Tables** | material_custody_records |
| **Key Gaps** | `approval_required` set in UI only. No DB trigger preventing auto-approval. Receiver acceptance tracked in types (`CustodyReceiverDecision`) but DB enforcement unclear. |
| **Risk** | 🟠 High |
| **Phase** | Phase 6 |
| **Reference** | Pattern only — custody approval guard should mirror the PO approval guard (migration 061) |

---

## Module 15 — Vehicle Receiving

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | StoreVehicleReceiving, StoreVehicleReceivingNew, StoreVehicleReceivingDetail, VehicleReceiving |
| **Tables** | vehicle_receipts, vehicle_receipt_photos |
| **Key Gaps** | `chassis_number` is in type definition but no DB NOT NULL constraint on completed receipts. Photo upload for required types (front/rear/left/right/chassis_plate) not enforced at DB level. Duplicate route `/vehicle-receiving`. |
| **Risk** | 🟠 High |
| **Phase** | Phase 6 |
| **Reference** | shadcn/ui (Direct, MIT, Low risk) for photo upload card component |

---

## Module 16 — Medical Serial Tracking

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | StoreReceiptDetail (serial entry inline) |
| **Tables** | medical_serial_numbers, store_receipt_items (serial_required flag) |
| **Key Gaps** | No DB constraint enforcing serial entry when `serial_required = true`. No UI hard-block on item without serial. Serial QC status tracking exists in types but enforcement gap is critical. |
| **Risk** | 🔴 Critical |
| **Phase** | Phase 6 |
| **Reference** | ERPNext (Inspiration only, GPL, High risk) for serial number tracking patterns |

---

## Module 17 — Raw Material Requests

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | FactoryRawMaterialRequests, FactoryRawMaterialRequestNew |
| **Tables** | raw_material_requests, raw_material_request_items |
| **Key Gaps** | Excel upload for BOM/BOQ: file upload exists but parser not implemented. `parsing_status` field is 'not_parsed' or 'pending_future_parser' — acknowledged as deferred. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 7 |
| **Reference** | Inngest (Direct, MIT, Low risk) for async Excel parsing job |

---

## Module 18 — Excel Upload / BOQ / BOM Readiness

| Item | Detail |
|------|--------|
| **Status** | 🔴 Missing (design only) |
| **Pages** | None specific |
| **Tables** | raw_material_request_items (parsing_status field is a placeholder) |
| **Key Gaps** | No parser exists. Design doc `EXCEL_UPLOAD_FUTURE_BOM_BOQ_DESIGN.md` is a future plan only. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 7 |
| **Reference** | Trigger.dev (Direct, Apache 2.0, Low risk) for background Excel parsing job |

---

## Module 19 — Quality Control

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | MaterialQC, MaterialQcInspections, MaterialQcInspectionDetail, MaterialNcrs, MaterialNcrDetail, ProjectQC, ProjectQcInspections, ProjectQcInspectionDetail, ProjectQcFindings, ProjectQcFindingDetail |
| **Tables** | material_qc_inspections, material_ncrs, project_qc_inspections, project_qc_findings, qc_inspection_documents |
| **Key Gaps** | NCR → CAPA linkage exists in type but auto-creation not enforced. NCR closure evidence required in types but UI enforcement unclear. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 9 |
| **Reference** | Plane (Inspiration only, AGPL, High risk) for finding/rework tracking UX |

---

## Module 20 — Release Note

| Item | Detail |
|------|--------|
| **Status** | 🏗️ Built but not aligned with playbook |
| **Pages** | ProjectQcReleaseNotes, ProjectQcReleaseNoteDetail |
| **Tables** | release_notes (release_status: draft/blocked/ready_to_issue/issued/cancelled) |
| **Key Gaps** | `release_status = 'blocked'` field exists but no DB trigger checks open `project_qc_findings` before allowing status change to `ready_to_issue` or `issued`. This is the most critical governance gap. |
| **Risk** | 🔴 Critical |
| **Phase** | Phase 9 |
| **Reference** | Custom DB trigger — no external reference needed; modeled on migration 061 PO guard pattern |

---

## Module 21 — After-Sales Maintenance

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | AfterSales, AfterSalesMaintenance, AfterSalesMaintenanceNew, AfterSalesMaintenanceDetail |
| **Tables** | afs_maintenance_requests, afs_maintenance_attachments |
| **Key Gaps** | Linkage to SO/WO/PN required by playbook — `wo_reference` and `pn_reference` exist as text fields, not FK constraints. No DB rule preventing unlinked maintenance requests. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 10 |
| **Reference** | Plane (Inspiration only, AGPL, High risk) for maintenance ticket lifecycle UX |

---

## Module 22 — Documents & Checklist Engine

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | Templates, TemplateNew, TemplateDetail, TemplateGenerate, GeneratedDocuments |
| **Tables** | document_templates, template_fields, generated_documents |
| **Key Gaps** | Template engine is generic, not governed by checklist type. No per-module required-document checklist enforcement. No versioning link between template and generated doc after template update. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 1 (Foundation) |
| **Reference** | refine (Pattern only, MIT, Low risk) for document/template resource pattern |

---

## Module 23 — Risks / Issues / Root Cause / CAPA

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | ReportsIssues, ReportsCapa (report pages only) |
| **Tables** | operational_issues, capa_records |
| **Key Gaps** | No dedicated Issues/CAPA management pages — only visible in report pages. No way to create/manage issues/CAPA from UI (only via reports). No CAPA status workflow enforcement. |
| **Risk** | 🟠 High |
| **Phase** | Phase 9–10 |
| **Reference** | Plane (Inspiration only, AGPL, High risk) for issue/CAPA workflow UX |

---

## Module 24 — SLA / Escalation / Notifications

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | ReportsSLA, AdminNotificationRules, Notifications, NotificationSettings |
| **Tables** | sla_rules, sla_events, notifications, notification_preferences, notification_escalation_rules |
| **Key Gaps** | SLA calculation is client-side only (`quotationSla.ts`, `slaEngine.ts`). No server-side cron/trigger that creates `sla_events`. No email/SMS delivery engine. Notifications table exists but delivery is not wired. |
| **Risk** | 🔴 Critical |
| **Phase** | Phase 1 (Foundation) / Phase 11 |
| **Reference** | Inngest (Direct, MIT, Low risk) for SLA cron + escalation; Novu (Direct, AGPL, Medium risk) for notification delivery |

---

## Module 25 — Reports & KPIs

| Item | Detail |
|------|--------|
| **Status** | 🔴 Mock only in live mode |
| **Pages** | All 13 report pages + ControlTower |
| **Tables** | report_definitions, saved_report_views, report_snapshots, department_health_scores, project_health_scores |
| **Key Gaps** | Every report page uses `mockOrEmpty()` in live mode — returns empty or mock data. No real Supabase aggregation queries. No drill-down from numbers to records. No chart visualizations. |
| **Risk** | 🔴 Critical (operational blindness) |
| **Phase** | Phase 11 |
| **Reference** | refine / react-admin (Pattern only, MIT, Low risk) for data-driven report list; Recharts/Chart.js for KPI visualization |

---

## Module 26 — Data Quality & Master Data

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | ReportsDataQuality |
| **Tables** | master_data, project_health_scores, department_health_scores |
| **Key Gaps** | `DataQualityCheck` type defined but no live DB query populates it. Customer is a free-text field (no master table). No automatic data quality scan job. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 11 |
| **Reference** | ERPNext (Inspiration only, GPL, High risk) for master data structure |

---

## Module 27 — Timeline & Audit

| Item | Detail |
|------|--------|
| **Status** | ⚠️ Partial |
| **Pages** | AuditLog, ProjectDetail (timeline section) |
| **Tables** | audit_log, timeline_events, project_timeline_events, quotation_timeline_events |
| **Lib** | projectAudit.ts, quotationAudit.ts, procurementAudit.ts, factoryAudit.ts, qcAudit.ts, storeAudit.ts, afsAudit.ts |
| **Key Gaps** | Audit lib functions exist for all modules but are not consistently called. Some pages write events; others don't. Timeline display exists in ProjectDetail but not uniformly across all module detail pages. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 1 (Foundation) |
| **Reference** | Plane (Inspiration only, AGPL, High risk) for timeline/activity feed UX |

---

## Module 28 — Operations Control Tower

| Item | Detail |
|------|--------|
| **Status** | 🔴 Mock only in live mode |
| **Pages** | ControlTower |
| **Tables** | Would aggregate from: projects, sla_events, purchase_orders_to_supplier, material_custody_records, vehicle_receipts, project_qc_findings, raw_material_requests, afs_maintenance_requests |
| **Key Gaps** | ControlTower explicitly uses `mockOrEmpty()` for all sections. No live aggregation query. In live mode shows empty panels. |
| **Risk** | 🔴 Critical |
| **Phase** | Phase 11 |
| **Reference** | refine / react-admin (Pattern only, MIT, Low risk) for dashboard aggregation patterns |

---

## Module 29 — Roles & Permissions

| Item | Detail |
|------|--------|
| **Status** | ✅ Substantially complete |
| **Pages** | AdminUsers, Settings, AdminAccessRequests, RequestAccess |
| **Tables** | profiles, user_roles, access_requests |
| **Key Gaps** | 10 roles defined and enforced. PERMISSION_KEYS defined but not wired. RLS gaps on several tables. No audit trail for role changes. |
| **Risk** | 🟡 Medium |
| **Phase** | Phase 1 (Foundation) |
| **Reference** | refine `useCan()` (Pattern only, MIT, Low risk) for granular permission hooks |

---

## Summary Matrix

| # | Module | Status | Risk | Phase |
|---|--------|--------|------|-------|
| 1 | Foundation | ✅ | 🟡 | Done |
| 2 | Quotation Management | ⚠️ | 🟠 | 2 |
| 3 | Sales Coordinator | ⚠️ | 🟠 | 2 |
| 4 | Sales Workspace | 🔴 | 🟠 | 2 |
| 5 | SO Registration | ✅ | 🟡 | 3 |
| 6 | Admin Approval | ✅ | 🟢 | 3 |
| 7 | Approval & Routing | ✅ | 🟡 | 3 |
| 8 | WO/PN Gate | ✅ | 🟡 | 4 |
| 9 | Procurement & PO Approval | ✅ | 🟡 | 5 |
| 10 | Approved Suppliers | ⚠️ | 🟡 | 5 |
| 11 | Saudi Factory | ⚠️ | 🟡 | 7 |
| 12 | Dubai Projects & AFS | ⚠️ | 🟡 | 8 |
| 13 | Store & Warehouse | ⚠️ | 🟠 | 6 |
| 14 | Material Custody | ⚠️ | 🟠 | 6 |
| 15 | Vehicle Receiving | ⚠️ | 🟠 | 6 |
| 16 | Medical Serial Tracking | ⚠️ | 🔴 | 6 |
| 17 | Raw Material Requests | ⚠️ | 🟡 | 7 |
| 18 | Excel Upload / BOQ / BOM | 🔴 | 🟡 | 7 |
| 19 | Quality Control | ⚠️ | 🟡 | 9 |
| 20 | Release Note | 🏗️ | 🔴 | 9 |
| 21 | After-Sales Maintenance | ⚠️ | 🟡 | 10 |
| 22 | Documents & Checklist Engine | ⚠️ | 🟡 | 1 |
| 23 | Risks / Issues / CAPA | ⚠️ | 🟠 | 9–10 |
| 24 | SLA / Escalation / Notifications | ⚠️ | 🔴 | 1/11 |
| 25 | Reports & KPIs | 🔴 | 🔴 | 11 |
| 26 | Data Quality & Master Data | ⚠️ | 🟡 | 11 |
| 27 | Timeline & Audit | ⚠️ | 🟡 | 1 |
| 28 | Operations Control Tower | 🔴 | 🔴 | 11 |
| 29 | Roles & Permissions | ✅ | 🟡 | 1 |
