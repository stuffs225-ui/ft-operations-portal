# FT Operations Portal — Module Map

Each module maps to a route, a page file, a future feature folder, and an implementation phase.

---

## Module Registry

| Module | Route | Page File | Phase | Primary Roles |
|--------|-------|-----------|-------|---------------|
| Dashboard / Control Tower | `/` | `Dashboard.tsx` | 0 ✅ | All |
| My Action Inbox | `/inbox` | `ActionInbox.tsx` | 0 ✅ | All |
| Quotation Requests | `/quotations` | `QuotationRequests.tsx` | 3 | admin, ops, sales, coordinator |
| Sales Workspace | `/sales` | `Sales.tsx` | 2 | admin, ops, sales |
| Sales Coordinator | `/sales-coordinator` | `SalesCoordinator.tsx` | 3 | admin, ops, coordinator |
| Projects / SO | `/projects` | `Projects.tsx` | 2 | All |
| Admin Approvals | `/admin-approvals` | `AdminApprovals.tsx` | 2 | admin, ops |
| WO / PN Gate | `/wo-pn-gate` | `WoPnGate.tsx` | 4 | admin, ops, factory |
| Procurement | `/procurement` | `Procurement.tsx` | 5 | admin, ops, procurement |
| Factory / Production | `/factory` | `Factory.tsx` | 6 | admin, ops, factory |
| Store / Warehouse | `/store` | `Store.tsx` | 7 | admin, ops, store |
| Material Custody | `/custody` | `MaterialCustody.tsx` | 7 | admin, ops, store, factory, afs |
| Vehicle Receiving | `/vehicle-receiving` | `VehicleReceiving.tsx` | 7 | admin, ops, store |
| Material QC | `/material-qc` | `MaterialQC.tsx` | 8 | admin, ops, qc |
| Project / Vehicle QC | `/project-qc` | `ProjectQC.tsx` | 8 | admin, ops, qc |
| Dubai / AFS | `/dubai-afs` | `DubaiAFS.tsx` | 6 | admin, ops, afs |
| After Sales Maintenance | `/after-sales` | `AfterSales.tsx` | 9 | admin, ops, sales, afs |
| Reports | `/reports` | `Reports.tsx` | 10 | admin, ops, viewer |
| Settings | `/settings` | `Settings.tsx` | 1 | admin |
| Admin / Users | `/admin/users` | `AdminUsers.tsx` | 1 | admin |

---

## Future Feature Folders (src/features/)

When a module grows beyond a single page, it moves to a feature folder:

```
src/features/
├── quotations/
│   ├── QuotationList.tsx
│   ├── QuotationDetail.tsx
│   ├── QuotationForm.tsx
│   ├── hooks/useQuotations.ts
│   └── types.ts
├── projects/
├── procurement/
├── factory/
├── store/
├── qc/
├── afs/
└── reports/
```

---

## Governance Modules (cross-cutting)

These are not standalone pages but systems that appear in every module:

| System | Implementation |
|--------|---------------|
| Timeline | Embedded in every project/SO detail view |
| Audit Log | Automatic Supabase triggers on DB changes |
| SLA Engine | Background checks + inbox task generation |
| Escalation | SLA breach triggers role-based notifications |
| Document Control | Attached to every entity (PR, PO, vehicle, project) |
| Checklist Engine | Per-stage checklists (WO Gate, QC, Release Note, etc.) |
