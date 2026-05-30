# Phase 6 Test Plan — Factory / Production + Raw Material Requests

## 1. Database Migrations (025–028)

| # | Test | Expected |
|---|---|---|
| 1.1 | Migration 025: production_status enum created | All 16 values present |
| 1.2 | Migration 025: factory_records table created | All columns, FK to projects/vehicle_lines/execution_references |
| 1.3 | Migration 025: progress_percentage constraint | Values outside 0-100 rejected |
| 1.4 | Migration 026: factory_requirement_types seeded | 8 rows: BOQ through Other |
| 1.5 | Migration 026: factory_item_requirements created | FK to requirement_types |
| 1.6 | Migration 027: production_raw_material_requests created | request_number UNIQUE constraint |
| 1.7 | Migration 027: RMR number trigger | Insert with empty request_number → auto-generates RMR-YYYY-NNNN |
| 1.8 | Migration 028: files and items tables created | FKs to production_raw_material_requests |

## 2. RLS Policies

| # | Test | Expected |
|---|---|---|
| 2.1 | factory_user SELECT factory_records | Returns all |
| 2.2 | factory_user INSERT factory_records | Allowed |
| 2.3 | sales_user SELECT factory_records (own project) | Returns own project records |
| 2.4 | sales_user SELECT factory_records (other project) | Returns empty |
| 2.5 | sales_user INSERT factory_records | Denied |
| 2.6 | qc_user SELECT factory_records | Returns all (read-only) |
| 2.7 | qc_user UPDATE factory_records | Denied |
| 2.8 | procurement_user SELECT production_raw_material_requests | Returns all |
| 2.9 | factory_user INSERT production_raw_material_requests | Allowed |
| 2.10 | viewer SELECT factory_item_requirements | Returns all (read-only) |

## 3. TypeScript Types

| # | Test | Expected |
|---|---|---|
| 3.1 | FactoryProductionStatus has 16 values | All match DB enum |
| 3.2 | FactoryReqStatus has 6 values | pending through not_applicable |
| 3.3 | RawMaterialRequestStatus has 8 values | draft through cancelled |
| 3.4 | FactoryRecord interface complete | All fields including nullable ones |
| 3.5 | RawMaterialRequest has project? join | Optional project pick |
| 3.6 | database.ts has 6 new table stubs | factory_records through production_raw_material_request_items |

## 4. Mock Data

| # | Test | Expected |
|---|---|---|
| 4.1 | MOCK_REQUIREMENT_TYPES has 8 entries | BOQ through Other |
| 4.2 | MOCK_FACTORY_RECORDS has 4 entries | Various statuses |
| 4.3 | fr-001 is for proj-005, pvl-005-1, in_production | 65% progress |
| 4.4 | fr-001 has monthly_update_required=true | Appears in monthly updates |
| 4.5 | MOCK_FACTORY_REQUIREMENTS has 7 entries | Mix of uploaded/pending/in_progress |
| 4.6 | MOCK_RAW_MATERIAL_REQUESTS has 3 entries | project_related x2, stock x1 |
| 4.7 | rmr-001 status=sent_to_procurement | Visible to procurement_user |
| 4.8 | getMockFactoryRecordsForProject('proj-005') returns 4 | All ARFF records |
| 4.9 | getMockRMRsForProject('proj-005') returns 2 | rmr-001, rmr-002 |
| 4.10 | getMockRequirementsForLine('pvl-005-1') returns 5 | fir-001 through fir-005 |

## 5. Factory Dashboard (/factory)

| # | Test | Expected |
|---|---|---|
| 5.1 | factory_user can access /factory | Dashboard renders with KPI strip |
| 5.2 | sales_user visits /factory | "Access restricted" message |
| 5.3 | In production KPI | Shows count from mock records |
| 5.4 | Missing BOQ KPI | Count of pending BOQ requirements |
| 5.5 | Monthly update KPI | 1 (fr-001 has monthly_update_required=true) |
| 5.6 | WO gate notice shown | Amber banner links to /wo-pn-gate |
| 5.7 | Nav to /factory/projects | FactoryProjects page loads |
| 5.8 | Nav to /factory/raw-material-requests | RMR list loads |
| 5.9 | Nav to /factory/monthly-updates | Monthly updates page loads |
| 5.10 | Dev mode banner shown | Amber "using mock data" notice |

## 6. Factory Projects List (/factory/projects)

| # | Test | Expected |
|---|---|---|
| 6.1 | Only approved Saudi projects shown | proj-005 appears, proj-006 (Dubai) does not |
| 6.2 | WO Active badge for proj-005 | wo-001 reference found |
| 6.3 | Progress % shown | Average of factory records |
| 6.4 | Filter "In Progress" | proj-005 shown (has in_production record) |
| 6.5 | View link → /factory/projects/proj-005 | Navigates correctly |

## 7. Factory Project Workspace (/factory/projects/:projectId)

| # | Test | Expected |
|---|---|---|
| 7.1 | /factory/projects/proj-005 loads | Overview tab shown |
| 7.2 | WO number shown | "WO-2025-0041" badge |
| 7.3 | Vehicle Lines tab | Shows line with status and progress |
| 7.4 | Edit form appears when WO present | Status dropdown visible |
| 7.5 | Dev mode update | "Dev mode — changes not persisted" shown |
| 7.6 | Requirements tab | BOQ=uploaded, BOM=pending, GA=uploaded shown |
| 7.7 | RMR tab | rmr-001, rmr-002 listed |
| 7.8 | Dubai project /factory/projects/proj-006 | "Not Saudi project" or redirect |
| 7.9 | Invalid project /factory/projects/proj-999 | Not found message |
| 7.10 | No WO scenario | WO gate alert shown, actions disabled |

## 8. Requirements Overview (/factory/requirements)

| # | Test | Expected |
|---|---|---|
| 8.1 | All 7 mock requirements shown | Table renders |
| 8.2 | Filter "Pending" | fir-002, fir-007 shown |
| 8.3 | Filter "Uploaded" | fir-001, fir-003, fir-005, fir-006 shown |
| 8.4 | Pending count banner | Shows "X requirements pending" |
| 8.5 | Link → factory workspace | /factory/projects/proj-005 |

## 9. RMR List (/factory/raw-material-requests)

| # | Test | Expected |
|---|---|---|
| 9.1 | All 3 mock RMRs shown | Table renders |
| 9.2 | Filter "Sent to Procurement" | rmr-001 shown |
| 9.3 | Type filter "Stock" | rmr-003 shown |
| 9.4 | New Request button → /factory/raw-material-requests/new | Navigates |
| 9.5 | Status badges correct | sent_to_procurement=info, draft=neutral |

## 10. New RMR Wizard (/factory/raw-material-requests/new)

| # | Test | Expected |
|---|---|---|
| 10.1 | Page loads with Step 1 | Request type selection |
| 10.2 | Cannot proceed without selecting type | Next button disabled |
| 10.3 | Select Project-Related → Step 2 | Project dropdown shown |
| 10.4 | Select Stock → Step 2 | "No project required" shown |
| 10.5 | Step 3: file upload form | File name + type + remarks |
| 10.6 | Future parser banner shown | Sky info banner visible |
| 10.7 | Step 4: review summary | All selections summarized |
| 10.8 | Save as Draft (dev mode) | Success message + navigate to /factory/raw-material-requests |
| 10.9 | Submit (dev mode) | Success message + navigate |
| 10.10 | Back button works on each step | Returns to previous step |

## 11. Monthly Updates (/factory/monthly-updates)

| # | Test | Expected |
|---|---|---|
| 11.1 | fr-001 shown (monthly_update_required=true) | Table row appears |
| 11.2 | Days since update column | Computed correctly |
| 11.3 | Submit Update button | Inline form toggles |
| 11.4 | Dev mode update | "Dev mode — update recorded" shown |
| 11.5 | Pending raw materials section | Link to /factory/raw-material-requests |
| 11.6 | /factory/pending-raw-materials route | Renders FactoryMonthlyUpdates |

## 12. ProjectDetail Factory Tab

| # | Test | Expected |
|---|---|---|
| 12.1 | Saudi project (proj-005) has Factory tab | Tab visible |
| 12.2 | Factory tab shows 4 factory records | All proj-005 records |
| 12.3 | Open Factory Workspace link | /factory/projects/proj-005 |
| 12.4 | RMRs for proj-005 shown | rmr-001, rmr-002 |
| 12.5 | Dubai project (proj-006) Factory tab | "Dubai/AFS Route" message |
| 12.6 | Phase 8 QC handover note | Sky info card visible |

## 13. Dashboard / Inbox

| # | Test | Expected |
|---|---|---|
| 13.1 | Dashboard has factory KPI cards | 5 new cards with Wrench/Calendar icons |
| 13.2 | "Factory: Missing BOQ" card | Value=2, links to /factory/requirements |
| 13.3 | "Monthly Update Required" card | Critical severity |
| 13.4 | Inbox task-fac-001 | BOQ missing task for factory_user |
| 13.5 | Inbox task-fac-002 | Monthly update critical/overdue |
| 13.6 | Inbox task-fac-003 | RMR for procurement_user |

## 14. Governance Rules

| # | Test | Expected |
|---|---|---|
| 14.1 | Dubai project cannot access factory workspace | "Dubai route" message or redirect |
| 14.2 | Factory_user cannot see purchase costs | No SAR values in factory pages |
| 14.3 | WO missing → all actions blocked | Buttons disabled, warning shown |
| 14.4 | WO present → all actions enabled | Full edit capability |
| 14.5 | RMR send-to-procurement requires submit first | Logical flow enforced |

## 15. Build Quality

| # | Test | Expected |
|---|---|---|
| 15.1 | npm run build passes | Zero TypeScript errors |
| 15.2 | No unused imports | noUnusedLocals clean |
| 15.3 | All routes registered | /factory/* routes respond |
| 15.4 | Dashboard Wrench/Calendar icons render | ICON_MAP entries present |
| 15.5 | ProjectDetail Factory tab renders | No runtime errors |
