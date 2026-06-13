# 02 — Large File Decomposition Plan

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no files changed

---

## Large File Inventory

Files over 400 lines, sorted by size:

| File | Lines | Bundle Size | Risk | Phase to Decompose |
|------|-------|-------------|------|--------------------|
| `src/pages/ProjectDetail.tsx` | 1,829 | 64.50 KB | 🔴 Critical | Phase 2 |
| `src/pages/ProjectNew.tsx` | 1,083 | 30.54 KB | 🟠 High | Phase 2 |
| `src/pages/QuotationDetail.tsx` | 935 | 30.71 KB | 🟠 High | Phase 3 |
| `src/pages/ProcurementPODetail.tsx` | 817 | 22.24 KB | 🟡 Medium | Phase 5 |
| `src/pages/WoPnGate.tsx` | 783 | 21.67 KB | 🟡 Medium | Phase 4 |
| `src/pages/FactoryProjectWorkspace.tsx` | 714 | 19.72 KB | 🟡 Medium | Phase 6 |
| `src/pages/AdminApprovals.tsx` | 706 | 17.24 KB | 🟡 Medium | Phase 2 |
| `src/pages/Settings.tsx` | 696 | 24.96 KB | 🟡 Medium | Phase 1 |
| `src/pages/Sales.tsx` | 672 | 22.76 KB | 🟠 High | Phase 2 |
| `src/pages/QuotationNew.tsx` | 667 | 23.22 KB | 🟡 Medium | Phase 3 |
| `src/pages/ProcurementSupplierDetail.tsx` | 620 | 16.03 KB | 🟡 Medium | Phase 5 |
| `src/pages/ReportsAFS.tsx` | 545 | 15.34 KB | 🟡 Medium | Phase 10 |
| `src/pages/ReportsFactory.tsx` | 484 | — | 🟡 Medium | Phase 10 |
| `src/pages/ReportsQC.tsx` | 478 | — | 🟡 Medium | Phase 10 |
| `src/pages/ReportsProcurement.tsx` | 477 | — | 🟡 Medium | Phase 10 |
| `src/pages/ProcurementRequestDetail.tsx` | 454 | — | 🟡 Medium | Phase 5 |
| `src/pages/FactoryRawMaterialRequestNew.tsx` | 451 | — | 🟡 Medium | Phase 6 |
| `src/types/database.ts` | 1,830 | — | Low | Never (auto-generated) |
| `src/types/index.ts` | 1,672 | — | 🟡 Medium | Phase 1 |

---

## Decomposition Plan: Critical Files

---

### 1. `ProjectDetail.tsx` — 1,829 lines (CRITICAL RISK)

**Current Responsibility:**
This single file handles everything for a Project/SO detail view:
- Supabase data fetching (11 direct queries): project, vehicle lines, documents, timeline events, execution references, approval profiles
- WO/PN gate status computation using `executionGate.ts`
- Approval action (approve project)
- Rejection action (reject project with reason)
- Revision action (send back for revision)
- Document upload handling
- Vehicle lines display
- Timeline display
- Project header and status display

**Why It Is Risky:**
- A bug in vehicle line rendering can break the approval action (same state)
- A Supabase schema change to `projects` requires reading 1,829 lines to understand impact
- Cannot be unit tested in isolation — fetching, state, and rendering are entangled
- Adding a new tab (e.g., Invoicing) requires touching all existing sections
- 64.50 KB bundle chunk — largest page in the system

**Must Not Be Changed Until:**
- `src/services/projects.service.ts` exists and is tested
- shadcn/ui Tabs component is available
- Decomposed sub-components are unit-tested individually

**Proposed Split:**

```
src/pages/projects/ProjectDetail.tsx            ← Container only (~150 lines)
src/pages/projects/tabs/
    ProjectOverviewTab.tsx                      ← Header, status, key fields (~200 lines)
    ProjectVehicleLinesTab.tsx                  ← Vehicle lines table (~150 lines)
    ProjectDocumentsTab.tsx                     ← Documents list + upload (~200 lines)
    ProjectTimelineTab.tsx                      ← Timeline feed (~150 lines)
    ProjectApprovalTab.tsx                      ← Approval/rejection actions (~150 lines)
    ProjectExecutionGateTab.tsx                 ← WO/PN gate status (~150 lines)
    ProjectInvoicingTab.tsx                     ← Invoicing plan summary (~150 lines)
src/services/projects.service.ts                ← All Supabase queries (extracted from page)
src/hooks/useProject.ts                         ← Data fetching hook wrapping service
```

**Container After Decomposition:**
- `ProjectDetail.tsx` becomes a ~150-line router: fetch project data via `useProject(id)`, render Tabs with sub-components.
- No direct `supabase.from()` calls remain in the container.

---

### 2. `ProjectNew.tsx` — 1,083 lines (HIGH RISK)

**Current Responsibility:**
Multi-step SO creation form: customer fields, vehicle lines table, document upload, review, and submit — all in one file.

**Why It Is Risky:**
- Business validation (required fields, vehicle line validation, medical items gate) lives inside the component
- Document upload logic is mixed with form state
- No re-use: the vehicle line table from ProjectNew cannot be used in ProjectDetail

**Proposed Split:**

```
src/pages/projects/ProjectNew.tsx               ← Wizard shell + step orchestration (~150 lines)
src/pages/projects/steps/
    ProjectCustomerStep.tsx                     ← Customer/SO info fields (~200 lines)
    ProjectVehicleLinesStep.tsx                 ← Vehicle line table with add/remove (~250 lines)
    ProjectDocumentsStep.tsx                    ← Document upload section (~150 lines)
    ProjectReviewStep.tsx                       ← Summary review before submit (~150 lines)
src/components/projects/VehicleLineTable.tsx    ← Shared component (used in ProjectNew + ProjectDetail)
src/services/projects.service.ts               ← createProject(), createVehicleLine() (shared)
```

---

### 3. `QuotationDetail.tsx` — 935 lines (HIGH RISK)

**Current Responsibility:**
Quotation detail, coordinator processing actions, status transitions, document list, timeline, coordinator return form — all in one component.

**Proposed Split:**

```
src/pages/quotations/QuotationDetail.tsx        ← Container + tabs (~150 lines)
src/pages/quotations/tabs/
    QuotationOverviewTab.tsx                    ← Header, priority, customer info
    QuotationDocumentsTab.tsx                   ← Document list + upload
    QuotationStatusHistoryTab.tsx               ← Timeline + audit
    QuotationCoordinatorTab.tsx                 ← Coordinator actions (PDF upload, values)
src/services/quotations.service.ts             ← All Supabase queries
src/hooks/useQuotation.ts                      ← Data fetching hook
```

---

### 4. `WoPnGate.tsx` — 783 lines (MEDIUM RISK)

**Current Responsibility:**
Gate dashboard (pending WO/PN projects) + WO entry form + PN entry form + table of all gate records.

**Why It Is Risky:**
- Factory and ops manager see the same complex view
- Gate entry logic is mixed with dashboard display
- `executionGate.ts` already contains the pure gate logic — it should be the source of truth

**Proposed Split:**

```
src/pages/admin/WoPnGate.tsx                   ← Page shell + summary cards (~150 lines)
src/pages/admin/components/
    WoPnPendingTable.tsx                        ← Projects missing WO or PN (~200 lines)
    WoEntryDrawer.tsx                           ← Sheet/drawer for WO entry (~150 lines)
    PnEntryDrawer.tsx                           ← Sheet/drawer for PN entry (~150 lines)
src/hooks/useExecutionGate.ts                  ← Wraps executionGate.ts + Supabase queries
```

**What Remains:**
`src/lib/executionGate.ts` stays exactly as-is — it is a pure business logic module. Only the UI layer is decomposed.

---

### 5. `ProcurementPODetail.tsx` — 817 lines (MEDIUM RISK)

**Current Responsibility:**
PO detail, approval/rejection actions, line items table, ETA tracking, document handling.

**Proposed Split:**

```
src/pages/procurement/ProcurementPODetail.tsx   ← Container + tabs (~150 lines)
src/pages/procurement/tabs/
    POOverviewTab.tsx                           ← PO header, supplier, total value
    POLineItemsTab.tsx                          ← Line items table
    POApprovalTab.tsx                           ← Approval/rejection flow
    POETATab.tsx                                ← ETA change history
    PODocumentsTab.tsx                          ← Documents
src/services/procurement.service.ts            ← Supabase queries (already partially done)
```

---

### 6. `FactoryProjectWorkspace.tsx` — 714 lines (MEDIUM RISK)

**Current Responsibility:**
Per-project factory workspace: BOQ/BOM/drawing requirements, raw material requests, progress tracking.

**Proposed Split:**

```
src/pages/factory/FactoryProjectWorkspace.tsx   ← Container + tabs (~120 lines)
src/pages/factory/tabs/
    FactoryWorkspaceOverviewTab.tsx             ← WO gate status, progress
    FactoryRequirementsTab.tsx                  ← BOQ/BOM/Drawing requirements
    FactoryRawMaterialsTab.tsx                  ← Raw material requests
    FactoryMonthlyUpdateTab.tsx                 ← Monthly update status
```

---

### 7. `AdminApprovals.tsx` — 706 lines (MEDIUM RISK)

**Current Responsibility:**
Approval queue for admin/ops. Handles project status transitions (approve, reject, send back for revision) with route and medical items selection.

**Proposed Split:**

```
src/pages/admin/AdminApprovals.tsx              ← Queue list + filter (~200 lines)
src/components/projects/ApprovalActionDialog.tsx ← Modal for approve/reject/revise action
src/services/projects.service.ts               ← approveProject(), rejectProject() functions
```

---

### 8. `src/types/index.ts` — 1,672 lines (MEDIUM RISK, different nature)

Not a page file but equally risky. 1,672 lines of TypeScript interfaces in a single file create:
- Merge conflict risk (any PR touching types touches the same file)
- Slow IDE performance on large files
- No module boundary — QC types are visible in procurement imports

**Proposed Split Strategy:**

Keep `index.ts` as a re-export barrel. Add domain-specific type files:

```
src/types/
├── index.ts               ← re-exports all domain types (backward compatible)
├── auth.types.ts          ← UserRole, RoleConfig, PermissionKey
├── project.types.ts       ← Project, ProjectVehicleLine, ProjectDocument, ProjectStatus, etc.
├── quotation.types.ts     ← QuotationRequest, QuotationLine, etc.
├── procurement.types.ts   ← PurchaseOrder, ProcurementRequest, etc.
├── factory.types.ts       ← FactoryRecord, FactoryRequirement, RawMaterialRequest, etc.
├── store.types.ts         ← StoreReceipt, StoreReceiptItem, MedicalSerialNumber, etc.
├── qc.types.ts            ← MaterialQcInspection, ProjectQcFinding, ReleaseNote, etc.
├── afs.types.ts           ← DubaiProjectFollowup, AfsArrivalReport, etc.
├── admin.types.ts         ← AuditLog, TimelineEvent, Template, Notification, etc.
├── customer.types.ts      ← Customer (NEW — from migration 079)
└── database.ts            ← auto-generated (unchanged)
```

**Safe migration path:**
1. Create the domain files with the correct interfaces.
2. In `index.ts`, replace all interface definitions with re-exports: `export type { Project } from './project.types'`.
3. No existing import paths break — all still resolve through `index.ts`.

---

## Report Pages — Special Case

All 13 report pages (`ReportsAFS.tsx` 545 lines, `ReportsFactory.tsx` 484 lines, etc.) contain large blocks of mock static data. These are NOT candidates for decomposition in the traditional sense. They need **live data wiring** (Phase 10), not splitting.

- **Do not decompose report pages now.** The static structure they show is actually correct UX scaffolding.
- **Do remove the static mock data constants** from within these files when live wiring begins.
- **Target state:** each report page becomes a ~100-line data-fetching + rendering shell with the heavy state coming from a `useReport<X>()` hook.

---

## Files That Must Not Be Changed Yet

| File | Reason |
|------|--------|
| `src/lib/executionGate.ts` | Contains tested, correct gate logic. Do not move or refactor until Phase 4. |
| `src/lib/slaEngine.ts` | Client-side SLA engine. Defer until Phase 10 when SLA goes server-side. |
| `src/context/AuthContext.tsx` | Any change here risks breaking auth for all users. Phase 1 only if RBAC extension is needed. |
| `src/app/App.tsx` | Route structure is complete. Adding routes is safe; restructuring all imports is Phase 2. |
| Any page not listed above | If it is not in the large file inventory and not mocked, leave it alone. |

---

## Suggested Decomposition Order

1. **Phase 1:** Split `src/types/index.ts` (lowest risk — additive re-exports)
2. **Phase 1:** Create `src/services/` layer with stub files
3. **Phase 2:** Decompose `ProjectDetail.tsx` → highest ROI; all other modules follow its pattern
4. **Phase 2:** Decompose `AdminApprovals.tsx` → needed for approval flow
5. **Phase 2:** Decompose `ProjectNew.tsx` → needed for SO registration wizard
6. **Phase 3:** Decompose `QuotationDetail.tsx`
7. **Phase 4:** Decompose `WoPnGate.tsx`
8. **Phase 5:** Decompose `ProcurementPODetail.tsx`, `ProcurementRequestDetail.tsx`
9. **Phase 6:** Decompose `FactoryProjectWorkspace.tsx`
10. **Phase 10:** Wire and simplify all report pages
