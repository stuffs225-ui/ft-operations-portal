# 10 — Reports, KPIs & Control Tower Audit

---

## Overall Assessment

**Reports are the most critical gap in the system.** Every report page and the Control Tower use `mockOrEmpty()` in live Supabase mode, meaning in production all reports show empty data. The schema, type definitions, and page structure exist — but no live Supabase queries are wired.

---

## Existing Report Pages

| Page | Route | Roles | Live Data | Mock Data |
|------|-------|-------|-----------|-----------|
| Reports Hub | `/reports` | ops,viewer,proc,factory,store,qc,afs,coord | ❌ | ✅ |
| Executive | `/reports/executive` | ops, viewer | ❌ | ✅ |
| Projects | `/reports/projects` | ops, viewer, coord | ❌ | ✅ |
| Sales | `/reports/sales` | ops, viewer, sales, coord | ❌ | ✅ |
| Procurement | `/reports/procurement` | ops, proc | ❌ | ✅ |
| Factory | `/reports/factory` | ops, factory | ❌ | ✅ |
| Store | `/reports/store` | ops, store | ❌ | ✅ |
| QC | `/reports/qc` | ops, qc | ❌ | ✅ |
| AFS | `/reports/afs` | ops, afs | ❌ | ✅ |
| Suppliers | `/reports/suppliers` | ops, proc | ❌ | ✅ |
| SLA | `/reports/sla` | ops, viewer | ❌ | ✅ |
| Data Quality | `/reports/data-quality` | ops, viewer | ❌ | ✅ |
| Health Scores | `/reports/health-scores` | ops, viewer | ❌ | ✅ |
| Issues | `/reports/issues` | ops, viewer, qc | ❌ | ✅ |
| CAPA | `/reports/capa` | ops, qc | ❌ | ✅ |

---

## Control Tower Audit

**Route:** `/control-tower`
**Roles:** ops_mgr, viewer
**Status:** 🔴 Mock only in live mode

The ControlTower component explicitly uses:
```typescript
const { mockOrEmpty, isLiveMode } = from '../lib/dataMode';
// Live mode has no wired aggregation yet — never compute from mock records.
```

**Sections it should display (from playbook):**

| Section | Current State | Required Supabase Query |
|---------|---------------|------------------------|
| Pending Quotations | Mock | `quotation_requests WHERE quotation_status = 'submitted_by_sales'` |
| SO without WO | Mock | `projects p LEFT JOIN project_execution_references r... WHERE r.id IS NULL AND p.manufacturing_location = 'saudi' AND p.project_status = 'approved'` |
| SO without PN | Mock | Similar for Dubai route |
| PO Approval Pending | Mock | `purchase_orders_to_supplier WHERE approval_status = 'pending'` |
| Materials in Custody | Mock | `material_custody_records WHERE status = 'in_custody'` |
| Vehicle Receiving Issues | Mock | `vehicle_receipts WHERE condition_status = 'damaged' OR status = 'pending_condition_review'` |
| Raw Material Requests | Mock | `raw_material_requests WHERE status IN ('submitted', 'under_review')` |
| QC Rework | Mock | `project_qc_findings WHERE finding_status IN ('open', 'rework_in_progress')` |
| Critical Issues | Mock | `operational_issues WHERE severity = 'critical' AND status != 'closed'` |

---

## KPI Gaps

### Currently Available KPIs (mock only)
- Project health scores (types defined, no calculation job)
- Department health scores (types defined, no calculation job)
- Supplier scorecards (types defined, no calculation job)
- SLA events count (types defined, no auto-generation)
- Data quality check counts (types defined, no scan job)

### Missing KPIs (from Playbook)
| KPI | Module | Notes |
|-----|--------|-------|
| Quotation conversion rate | Sales | % of quotations converted to SO |
| Average quotation turnaround time | Sales | Days from submitted to returned |
| PO on-time delivery rate | Procurement | ETAs met vs. missed |
| Factory completion rate | Factory | Projects on schedule |
| Monthly update compliance | Factory | Projects with up-to-date monthly updates |
| QC first-pass rate | QC | Inspections with no findings |
| NCR closure time | QC | Average days to close NCR |
| Release note on-time rate | QC | Release notes issued before delivery date |
| AFS missing item resolution rate | AFS/Dubai | Missing items resolved within SLA |
| Maintenance closure rate | After-Sales | Requests closed within SLA |
| Receivables aging | Sales | Outstanding invoices by aging bucket |

---

## Drill-Down Gaps

The playbook requires: "any number in the report must be clickable and open the source record."

Current state:
- Mock report pages show aggregate numbers
- No click handlers link numbers to filtered list views
- No drill-down navigation exists

**Required pattern for each KPI card:**
```
"12 pending quotations" → click → Quotations page filtered by status=submitted_by_sales
"3 POs pending approval" → click → Purchase Orders page filtered by approval_status=pending
```

---

## Missing Reports (from Playbook)

| Report | Module | Priority |
|--------|--------|----------|
| Quotation Pipeline | Quotation | High |
| Quotation-to-SO Conversion | Sales | High |
| SO Execution Status | Projects | High |
| WO/PN Gate Compliance | WO/PN | High |
| PO Approval Audit | Procurement | High |
| Supplier Delay Analysis | Procurement | Medium |
| Factory Progress by Project | Factory | Medium |
| Raw Material Fulfillment Rate | Factory | Medium |
| Stock Aging / Unallocated Materials | Store | Medium |
| Medical Serial Audit | Store/Medical | High |
| Vehicle Receiving Compliance | Store | Medium |
| QC Inspection Results | QC | High |
| Rework Duration Analysis | QC | Medium |
| Release Note Timing | QC | High |
| Dubai ETA Accuracy | Dubai/AFS | Medium |
| After-Sales Response Time | After-Sales | Medium |
| CAPA Effectiveness | CAPA | Low |
| SLA Breach Trend | SLA | High |
| Department Health Trend | Health | Medium |
| Receivables Aging by Customer | Invoicing | High |

---

## Scheduled Reports (Infrastructure Exists, Not Wired)

Tables `report_snapshots` and `scheduled_report_subscriptions` exist. `AdminReportSubscriptions` page exists. But:
- No background job generates snapshots on schedule
- No email/SMS delivery wired
- Subscription config is stored but never processed

---

## Reference Library Patterns for Reports

| Pattern | Source | Usage Category | License Risk | What It Provides |
|---------|--------|----------------|-------------|------------------|
| DataGrid + filter panel | react-admin | Pattern only | Low (MIT) | List/filter/export for tabular reports |
| Dashboard metrics | refine | Pattern only | Low (MIT) | KPI card layout, drill-down navigation |
| Charts / visualizations | Recharts (separate install) | Direct | Low (MIT) | Bar, line, pie charts for KPI trends |
| Background report generation | Inngest | Direct | Low (MIT) | Scheduled snapshot generation, email delivery |
| Notification delivery | Novu | Direct | Medium (AGPL) | Email/SMS report delivery |
| Issue board | Plane | Inspiration only | High (AGPL) | Issues and CAPA tracker UX |
| Control Tower aggregation | ERPNext | Inspiration only | High (GPL) | Business logic for operational dashboard metrics |

---

## Recommended Implementation Order for Reports Phase

1. **Control Tower live wiring** — highest operational impact
2. **Executive Dashboard** — management visibility
3. **SLA Breach report** — governance compliance
4. **Quotation Pipeline report** — Sales operations
5. **PO Approval Audit** — Procurement compliance
6. **QC/Release Note report** — Quality compliance
7. **Health Scores calculation job** — Inngest scheduled job
8. **Receivables Aging** — Finance visibility
9. All other module reports in order of playbook phase
