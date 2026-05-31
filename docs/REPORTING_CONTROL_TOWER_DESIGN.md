# Reporting & Control Tower Design

Phase 10 — Reports, SLA, Control Tower, Data Quality, Health Scores

## Report Categories

| Category | Route | Key Reports |
|---|---|---|
| executive | /reports/executive, /control-tower | Lifecycle overview, exceptions, delivery readiness, operational health |
| project | /reports/projects | Lifecycle status, WO/PN coverage, health scores |
| sales | /reports/sales | Quotation pipeline, active projects, aging |
| procurement | /reports/procurement | PRs, PO to Supplier, ETA delays, supplier status |
| factory | /reports/factory | BOQ gaps, GA drawing gaps, monthly updates, QC readiness |
| store | /reports/store | Material receipts, vehicle receiving, custody, serials |
| qc | /reports/qc | Material QC, NCRs, project QC, findings, release notes |
| afs | /reports/afs | Missing PN, ETAs, arrivals, pre-delivery, maintenance |
| supplier | /reports/suppliers | Scorecards, delivery, NCR counts |
| sla | /reports/sla | SLA rules, open breaches, escalation levels |
| data_quality | /reports/data-quality | Missing data gaps across all modules |
| operational_excellence | /reports/health-scores, /reports/issues, /reports/capa | Health scores, issues, CAPA |

## Role Access Matrix

| Role | Executive | Sales | Procurement | Factory | Store | QC | AFS | Supplier | SLA | Data Quality | Health |
|---|---|---|---|---|---|---|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| operations_manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sales_user | ❌ | Own only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Own only |
| sales_coordinator | ❌ | Quotations | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| procurement_user | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| factory_user | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| store_user | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| qc_user | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| afs_user | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| viewer | Executive | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Purchase Cost Visibility
- Purchase cost columns only visible to admin, operations_manager, procurement_user
- All other roles see cost-free report views
- Guard: `const canSeeCost = role && ['admin', 'operations_manager', 'procurement_user'].includes(role)`

## Mock vs Real Data Strategy
- Dev mode (no Supabase): all reports use mock data from src/data/mockReports.ts
- Real Supabase: operational tables (projects, procurement, etc.) use live DB; derived analytics (health scores, SLA events) acceptable as mock until background calculation engine is built
- Dev mode notice shown on all report pages when isSupabaseConfigured is false

## Data Sources
All reports are generated from existing workflow data. No manual data entry for reporting. Sources:
- Projects/Sales: mockProjects.ts → projects, project_vehicle_lines tables
- Procurement: mockProcurement.ts → purchase_requests, purchase_orders tables
- Factory: mockFactory.ts → factory_records, factory_requirements tables
- Store: mockStore.ts, mockCustody.ts → store_receipts, vehicle_receipts, custody_records tables
- QC: mockQc.ts → material_qc_inspections, material_ncrs, project_qc_inspections, release_notes tables
- AFS: mockAfs.ts → dubai_project_followups, afs_arrival_reports, afs_maintenance_requests tables
- Analytics: mockReports.ts → project_health_scores, department_health_scores, sla_events tables
