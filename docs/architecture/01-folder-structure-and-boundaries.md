# 01 — Folder Structure and Feature Boundaries

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no files created or modified

---

## Current Structure (Confirmed by Audit)

```
src/
├── app/
│   └── App.tsx                     ← 279 lines — all 105+ routes, lazy imports
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx      ← auth guard
│   │   └── RequireRole.tsx         ← role enforcement
│   ├── documents/
│   │   └── DocumentPanel.tsx       ← upload panel (partial)
│   ├── features/
│   │   ├── DocumentList.tsx        ← document list (partial)
│   │   └── ReportExportBar.tsx     ← export bar (partial)
│   ├── layout/
│   │   ├── Header.tsx              ← top bar
│   │   └── Sidebar.tsx             ← navigation
│   └── ui/
│       ├── Badge.tsx               ← custom, not accessible
│       ├── BrandLogo.tsx
│       ├── Button.tsx              ← custom, no variant system
│       ├── Card.tsx                ← custom
│       ├── DataSourceBadge.tsx     ← dev helper
│       ├── DevModeBanner.tsx       ← dev helper
│       ├── Drawer.tsx              ← custom slide-out
│       ├── EmptyState.tsx          ← ✅ good pattern
│       ├── PageHeader.tsx          ← ✅ good pattern
│       └── PageLoader.tsx          ← ✅ good pattern
├── context/
│   └── AuthContext.tsx             ← 176 lines — single auth source of truth
├── data/                           ← 15 mock data files (4,856 total lines)
│   ├── departmentReports.ts
│   ├── mockAccessRequests.ts
│   ├── mockAfs.ts
│   ├── mockDashboard.ts
│   ├── mockExecutionReferences.ts
│   ├── mockFactory.ts
│   ├── mockInbox.ts
│   ├── mockNotifications.ts
│   ├── mockProcurement.ts
│   ├── mockProjects.ts
│   ├── mockQc.ts
│   ├── mockQuotations.ts
│   ├── mockReportSubscriptions.ts
│   ├── mockReports.ts
│   ├── mockStore.ts
│   ├── mockTemplates.ts
│   └── navigation.ts               ← sidebar nav items
├── hooks/
│   └── useAuth.ts                  ← thin wrapper around AuthContext
├── layouts/
│   └── AppLayout.tsx               ← root layout shell
├── lib/                            ← flat — mixes business logic + utilities
│   ├── afsAudit.ts
│   ├── dataMode.ts                 ← mockOrEmpty() pattern ✅
│   ├── documents.ts
│   ├── executionGate.ts            ← WO/PN gate logic ✅
│   ├── factoryAudit.ts
│   ├── notifications.ts
│   ├── procurementAudit.ts
│   ├── projectAudit.ts
│   ├── qcAudit.ts
│   ├── quotationAudit.ts
│   ├── quotationSla.ts
│   ├── reportExport.ts
│   ├── roles.ts                    ← ROLE_CONFIGS + MOCK_CURRENT_USER (legacy)
│   ├── slaEngine.ts
│   ├── storeAudit.ts
│   ├── supabase.ts                 ← client + isSupabaseConfigured
│   ├── templateRender.ts
│   └── utils.ts
├── pages/                          ← 155 page files in a single flat directory
│   └── [155 .tsx files — no sub-directories]
├── styles/
│   └── index.css                   ← Tailwind directives only
├── types/
│   ├── database.ts                 ← 1,830 lines — auto-generated Supabase types
│   └── index.ts                    ← 1,672 lines — all app types in one file
└── main.tsx
```

---

## Structure Classification

| Area | Classification | Reasoning |
|------|---------------|-----------|
| `src/app/` | Acceptable | Single router file is fine for now; will need splitting at 200+ routes |
| `src/components/ui/` | Inconsistent | Custom components without shared variant system; not accessible |
| `src/components/documents/` | Needs reorganization | Only 2 files; will grow when document engine is built |
| `src/components/features/` | Inconsistent | Only 2 files; mix of feature concepts |
| `src/context/` | Clean | AuthContext is correct and minimal |
| `src/data/` | High-risk | 15 mock files ship in production bundle; no separation from test fixtures |
| `src/hooks/` | Needs reorganization | Only 1 hook; missing data-fetching hooks for each module |
| `src/lib/` | Inconsistent | Flat mix of business logic, utilities, and Supabase helpers |
| `src/pages/` | High-risk | 155 files in a flat directory; no feature grouping whatsoever |
| `src/types/` | Needs reorganization | 1,672-line `index.ts` is a merge conflict magnet; needs splitting |

---

## Current Structure: Key Problems

### Problem 1 — Flat Pages Directory (155 files)

All 155 page components live in `src/pages/` with no sub-folder organization. This creates:
- Poor discoverability — `ProjectQcReleaseNoteDetail.tsx` and `ProjectNew.tsx` are adjacent alphabetically but belong to completely different modules
- Naming collisions — `MaterialCustody.tsx`, `MaterialNcrs.tsx`, `MaterialQC.tsx` are unrelated modules
- High cognitive load — a new developer cannot identify module boundaries from the file list

### Problem 2 — No Service Layer

Supabase SDK calls are scattered directly inside page components:
- `ProjectDetail.tsx` — 11 direct `supabase.from()` calls
- `QuotationDetail.tsx` — 8 direct `supabase.from()` calls
- `WoPnGate.tsx` — 0 calls (correctly delegates to `executionGate.ts`)

The exception (`executionGate.ts`) proves the pattern: the WO/PN gate logic works well **because** it was extracted to a service file. The rest of the codebase has not followed this example.

### Problem 3 — Mock Data in Production Bundle

The `src/data/` folder contains 15 mock data files that are emitted as named chunks in the production build:
- `mockProjects-Utvw82_S.js` — 15.82 KB
- `mockStore-CF4GjWqr.js` — 24.09 KB
- `mockReports-Gi5Rzvsz.js` — 27.94 KB
- `mockQuotations-DxqPr-0f.js` — 23.04 KB

These are downloaded by real users even though `mockOrEmpty()` returns `[]` in live mode.

### Problem 4 — `src/lib/` is a Flat Mix

`src/lib/` contains:
- Supabase client setup (`supabase.ts`)
- Data mode helpers (`dataMode.ts`)
- Business logic (`executionGate.ts`, `slaEngine.ts`, `quotationSla.ts`)
- Audit utilities (`projectAudit.ts`, `qcAudit.ts`, etc. — 6 separate files)
- SLA engine (`slaEngine.ts`)
- Report export (`reportExport.ts`)
- Template rendering (`templateRender.ts`)
- Notification helpers (`notifications.ts`)
- Role definitions (`roles.ts`)

These serve different architectural concerns and should be separated.

---

## Target Structure Proposal

The target structure introduces feature boundaries without breaking the flat page pattern immediately (that is a Phase 2+ change). This can be adopted incrementally.

```
src/
├── app/
│   └── App.tsx                     (unchanged — routes stay here)
│
├── components/
│   ├── auth/                       (unchanged — ProtectedRoute, RequireRole)
│   ├── layout/                     (unchanged — Header, Sidebar, AppLayout)
│   └── ui/                         ← shadcn/ui components (Step 5)
│       ├── badge.tsx               ← shadcn/ui Badge (replaces custom)
│       ├── button.tsx              ← shadcn/ui Button
│       ├── card.tsx                ← shadcn/ui Card
│       ├── dialog.tsx              ← shadcn/ui Dialog (new)
│       ├── data-table.tsx          ← shadcn/ui + TanStack Table (new)
│       ├── form.tsx                ← shadcn/ui Form (new)
│       ├── input.tsx               ← shadcn/ui Input (new)
│       ├── select.tsx              ← shadcn/ui Select (new)
│       ├── sheet.tsx               ← shadcn/ui Sheet — replaces Drawer
│       ├── skeleton.tsx            ← shadcn/ui Skeleton (new)
│       ├── toast.tsx               ← shadcn/ui Toast (new)
│       ├── tabs.tsx                ← shadcn/ui Tabs (new)
│       ├── DataSourceBadge.tsx     ← keep (dev helper)
│       ├── DevModeBanner.tsx       ← keep (dev helper)
│       ├── EmptyState.tsx          ← keep (update to use shadcn)
│       ├── PageHeader.tsx          ← keep
│       └── PageLoader.tsx          ← keep
│
├── context/
│   └── AuthContext.tsx             (unchanged)
│
├── data/                           ← MOVE TO: src/test-fixtures/ (Phase 1)
│   └── [15 mock files — exclude from production bundle]
│
├── hooks/
│   ├── useAuth.ts                  (unchanged)
│   ├── useProject.ts               ← new (Phase 2: fetch project + references)
│   ├── useQuotation.ts             ← new (Phase 3)
│   └── usePermission.ts            ← new (Phase 1: check PERMISSION_KEYS)
│
├── services/                       ← NEW: data access layer
│   ├── projects.service.ts         ← all project Supabase queries
│   ├── quotations.service.ts       ← all quotation queries
│   ├── procurement.service.ts      ← PO, PR, supplier queries
│   ├── store.service.ts            ← store receipt, custody, vehicle queries
│   ├── factory.service.ts          ← factory record, requirement queries
│   ├── qc.service.ts               ← inspection, NCR, release note queries
│   ├── afs.service.ts              ← Dubai, AFS queries
│   ├── audit.service.ts            ← merged audit utilities from lib/
│   └── notifications.service.ts    ← notifications queries
│
├── lib/                            ← business logic only (not data access)
│   ├── dataMode.ts                 (unchanged)
│   ├── executionGate.ts            (unchanged — move pure functions here)
│   ├── roles.ts                    (unchanged minus MOCK_CURRENT_USER removal)
│   ├── slaEngine.ts                (unchanged)
│   ├── quotationSla.ts             (unchanged)
│   ├── documents.ts                (unchanged)
│   ├── templateRender.ts           (unchanged)
│   ├── reportExport.ts             (unchanged)
│   ├── utils.ts                    (unchanged)
│   └── supabase.ts                 (unchanged)
│
├── pages/                          ← flat for now; reorganize in Phase 2
│   └── [existing files — no change in Phase 1]
│
├── types/
│   ├── index.ts                    ← split into domain files (Phase 1)
│   ├── auth.types.ts               ← UserRole, RoleConfig
│   ├── project.types.ts            ← Project, ProjectVehicleLine, etc.
│   ├── quotation.types.ts
│   ├── procurement.types.ts
│   ├── factory.types.ts
│   ├── store.types.ts
│   ├── qc.types.ts
│   ├── afs.types.ts
│   ├── admin.types.ts
│   └── database.ts                 (unchanged — auto-generated)
│
└── test-fixtures/                  ← NEW: replaces src/data/ for mock data
    └── [15 mock files — excluded from Vite production build]
```

---

## Feature Boundary Proposal

For Phase 2+ page reorganization (do NOT attempt in Phase 1):

```
src/pages/
├── auth/               Login, RequestAccess
├── dashboard/          Dashboard, ActionInbox, ControlTower
├── projects/           Projects, ProjectNew, ProjectDetail, ProjectInvoicing
├── quotations/         Quotations, QuotationNew, QuotationDetail
├── sales/              Sales, SalesCoordinator, HotProjects, HotProjectNew, HotProjectDetail
├── procurement/        Procurement, ProcurementRequests, ProcurementRequestDetail,
│                       ProcurementPurchaseOrders, ProcurementPODetail,
│                       ProcurementSuppliers, ProcurementSupplierDetail, ProcurementEtaHistory
├── factory/            Factory, FactoryProjects, FactoryProjectWorkspace,
│                       FactoryRequirements, FactoryRawMaterialRequests,
│                       FactoryRawMaterialRequestNew, FactoryMonthlyUpdates
├── store/              Store, StoreReceipts, StoreReceiptNew, StoreReceiptDetail,
│                       StoreInventory, StoreUnallocated,
│                       StoreVehicleReceiving, StoreVehicleReceivingNew, StoreVehicleReceivingDetail,
│                       MaterialCustody, CustodyNew, CustodyDetail
├── qc/                 MaterialQC, MaterialQcInspections, MaterialQcInspectionDetail,
│                       MaterialNcrs, MaterialNcrDetail,
│                       ProjectQC, ProjectQcInspections, ProjectQcInspectionDetail,
│                       ProjectQcFindings, ProjectQcFindingDetail,
│                       ProjectQcReleaseNotes, ProjectQcReleaseNoteDetail
├── dubai-afs/          DubaiAFS, DubaiAfsProjects, DubaiAfsProjectDetail,
│                       DubaiAfsEta, DubaiAfsArrivalReports, DubaiAfsArrivalReportDetail,
│                       DubaiAfsMissingItems, DubaiAfsPredeliveryReports,
│                       DubaiAfsPredeliveryReportDetail, DubaiAfsConditionReports
├── after-sales/        AfterSales, AfterSalesMaintenance, AfterSalesMaintenanceNew,
│                       AfterSalesMaintenanceDetail
├── reports/            Reports, ReportsExecutive, ReportsProjects, ReportsSales,
│                       ReportsProcurement, ReportsFactory, ReportsStore, ReportsQC,
│                       ReportsAFS, ReportsSuppliers, ReportsSLA, ReportsDataQuality,
│                       ReportsHealthScores, ReportsIssues, ReportsCapa
├── admin/              Settings, AdminUsers, AdminApprovals, AdminAccessRequests,
│                       AdminAccessRequestDetail, AdminNotificationRules,
│                       AdminReportSubscriptions, AdminReportSubscriptionDetail,
│                       WoPnGate, AuditLog
├── documents/          Templates, TemplateNew, TemplateDetail, TemplateApprovals,
│                       TemplateGenerate, GeneratedDocuments, GeneratedDocumentDetail
└── notifications/      Notifications, NotificationSettings
```

---

## Migration Approach: Current to Target

### Phase 1 (Low Risk — Additive Only)
1. Create `src/services/` with one service file per module. Extract data fetching from pages one at a time, starting with `projects.service.ts`.
2. Create `src/types/project.types.ts` etc., re-export from `index.ts`. This keeps backward compatibility.
3. Move mock files to `src/test-fixtures/`. Update Vite config to exclude from production bundle.
4. Install shadcn/ui components into `src/components/ui/` alongside existing custom components. Do NOT replace existing components yet.

### Phase 2 (Medium Risk — Page Changes)
5. Begin page decomposition (see document 02). Start with `ProjectDetail.tsx`.
6. Move pages to feature sub-folders once all imports are confirmed working.
7. Update `App.tsx` route imports to new paths.
8. Remove replaced custom components once shadcn/ui versions are proven.

### Phase 3+ (Higher Risk — Structural)
9. Split `src/types/index.ts` into domain files. Keep `index.ts` as a re-export barrel.
10. Move audit utility functions from `src/lib/` to `src/services/audit.service.ts`.

---

## Duplicate Routes to Resolve (Before Phase 2)

| Issue | Routes | Resolution |
|-------|--------|-----------|
| Duplicate vehicle receiving | `/vehicle-receiving` and `/store/vehicle-receiving` | Remove `/vehicle-receiving`; redirect to `/store/vehicle-receiving` |
| Duplicate raw material | `/factory/pending-raw-materials` (same component as `/factory/raw-material-requests`) | Remove duplicate route; add pre-filtered query param instead |
