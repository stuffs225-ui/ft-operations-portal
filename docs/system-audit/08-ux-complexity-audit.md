# 08 — UX & Complexity Audit

---

## Pages That Are Too Complex

### ProjectDetail.tsx (64.5 KB)
**Problem:** The largest page in the system handles: project header, status line, WO/PN gate status, vehicle lines tab, documents tab, timeline tab, approval action, revision action, and rejection action — all in one component.
**Risk:** Hard to maintain; any feature addition makes it larger. Users see too much at once.
**Recommendation:** Redesign as a tabbed detail page:
- Tab 1: Project Overview (header, status, key fields)
- Tab 2: Vehicle Lines
- Tab 3: Documents
- Tab 4: Approvals & History
- Tab 5: WO/PN Gate
- Tab 6: Invoicing
**Reference Pattern:** refine `Show` layout (Pattern only, MIT, Low risk)

### QuotationDetail.tsx (30.7 KB)
**Problem:** Handles quotation info, coordinator processing, status transitions, document list, and timeline in one component.
**Recommendation:** Same tabbed approach — Overview, Documents, Status History, Coordinator Actions
**Reference Pattern:** refine `Show` (Pattern only, MIT, Low risk)

### WoPnGate.tsx (21.7 KB)
**Problem:** Gate dashboard + WO entry + PN entry + table all in one. Factory and ops manager see the same complex view.
**Recommendation:** Split into: Dashboard (summary cards) + separate entry flows per route type
**Reference Pattern:** react-admin list + create (Pattern only, MIT, Low risk)

---

## Pages Where Users May Not Know What Action to Take

| Page | Problem | Fix |
|------|---------|-----|
| `Dashboard` | Generic "welcome" when Supabase is live; no role-specific "your tasks" | Role workspace: "You have 3 quotations pending. 1 PO awaiting approval." |
| `Store` hub | Just a hub page; no clear next action | Show pending receipts, pending QC, pending custody in summary cards |
| `Factory` hub | Hub page without task summary | Show active projects, pending BOQ, overdue monthly updates |
| `ActionInbox` | Uses mock tasks in live mode | Wire to real SLA events and pending actions from DB |
| `ControlTower` | Empty in live mode | Wire to real aggregations |

---

## Forms That Are Too Long

| Form | Problem | Fix |
|------|---------|-----|
| `ProjectNew` (SO Registration) | Long single-scroll form with customer info, vehicle lines, documents | Multi-step wizard like QuotationNew — Customer → Lines → Documents → Review |
| `StoreVehicleReceivingNew` | Vehicle info + photos + condition all in one form | Step 1: Basic info + chassis. Step 2: Photos upload. Step 3: Condition review. |
| `CustodyNew` | Item selection + recipient + approval in one form | Step 1: Select item. Step 2: Select recipient + type. Step 3: Review + approval flag. |
| `FactoryRawMaterialRequestNew` | File upload + item list + remarks | Step 1: Upload Excel. Step 2: Review parsed items (future). Step 3: Submit. |

---

## Where Tables Need Filtering / Search / Status Badges

Currently, every list page is a basic HTML table. All of the following need:

| Page | Missing Features |
|------|-----------------|
| `Projects` | Filter by: status, manufacturing_location, medical_items, sales_owner, date range |
| `Quotations` | Filter by: status, priority, sales owner, date, coordinator |
| `ProcurementRequests` | Filter by: status, project, date |
| `ProcurementPurchaseOrders` | Filter by: approval_status, po_status, supplier, value range |
| `ProcurementSuppliers` | Filter by: procurement_status, qc_status, category |
| `MaterialCustody` | Filter by: status, project, issued_to role, date |
| `FactoryProjects` | Filter by: production_status, monthly_update_required |
| `StoreReceipts` | Filter by: status, project, supplier, date |
| `MaterialQcInspections` | Filter by: inspection_result, project |
| `ProjectQcFindings` | Filter by: finding_status, severity, rework_required |
| `ProjectQcReleaseNotes` | Filter by: release_status |
| `AfterSalesMaintenance` | Filter by: maintenance_status, priority, issue_type |

**All tables should have:**
- Search input (filters across key text fields)
- Status badge column (color-coded by severity)
- Column sort
- Pagination (or virtual scroll for large datasets)
- Export button (CSV at minimum)

**Reference Pattern:** shadcn/ui DataTable + TanStack Table (Direct, MIT, Low risk)

---

## Where Wizards/Steppers Are Needed

Currently only `QuotationNew` has a multi-step wizard. All of the following should use wizard/stepper pattern:

| Page | Steps Needed |
|------|-------------|
| `ProjectNew` (SO) | Customer Info → Vehicle Lines → Documents → Review & Submit |
| `StoreVehicleReceivingNew` | Vehicle Info → Photos → Condition → Submit |
| `CustodyNew` | Item Selection → Recipient → Approval → Review |
| `ProcurementPODetail` (create) | PO Header → Line Items → Supplier → Review |
| `FactoryRawMaterialRequestNew` | Upload File → Review Items → Submit |

**Reference Pattern:** shadcn/ui Steps (Direct, MIT, Low risk)

---

## Where Page Layout Is Inconsistent

| Inconsistency | Affected Pages |
|---------------|----------------|
| Some pages use `PageHeader` component; others use raw `<h1>` | Factory pages, some Store pages |
| Some detail pages have `Back` buttons; others don't | Mixed across all modules |
| Some hub pages (Store, Factory, Dubai) have metric cards; others show empty | Inconsistent first impression |
| Status badges vary in color scheme between modules | QC uses different colors than Procurement |
| Card spacing and padding vary across pages | No standardized layout grid |

---

## Where Role Workspaces Are Unclear

| Role | Problem |
|------|---------|
| `sales_user` | Redirected to `/sales` but the page is mock-only; no clear action queue |
| `factory_user` | Lands on main dashboard; no factory-specific home |
| `qc_user` | No dedicated QC workspace; must navigate to material-qc or project-qc manually |
| `afs_user` | No dedicated AFS workspace home |
| `store_user` | Lands on main dashboard; no store-specific task queue |
| `viewer` | Lands on full dashboard; no reports-focused entry point |

**Recommendation:** Implement role-specific workspace home pages. Pattern: `sales_user` → Sales Workspace, `factory_user` → Factory workspace with today's WO tasks, `qc_user` → QC queue view.
**Reference Pattern:** refine `useResource()` + role workspace pattern (Pattern only, MIT, Low risk)

---

## Mobile Responsiveness

The system is explicitly described as "desktop-first" for heavy operations. However:

| Issue | Detail |
|-------|--------|
| Data tables overflow on mobile | `<table>` elements are not scrollable on small screens |
| Long forms not optimized for touch | Date pickers and file uploads may be awkward |
| Sidebar is likely collapsed or hidden on mobile | Not verified — needs testing |
| Photo upload in vehicle receiving requires mobile | Store users may need mobile for vehicle condition photos |

**Recommendation:** Mark tables as `overflow-x-auto`. Make vehicle receiving photo upload mobile-friendly. Keep all approval actions desktop-only.

---

## Reference Library UX Patterns to Adopt

| Pattern | Source | Usage | Benefit |
|---------|--------|-------|---------|
| DataTable with column filter + search | shadcn/ui + TanStack | Direct, MIT | Replaces all bespoke tables |
| Multi-step Form wizard | shadcn/ui Steps | Direct, MIT | ProjectNew, CustodyNew, VehicleReceivingNew |
| Detail page with tabs | refine Show | Pattern only, MIT | ProjectDetail, QuotationDetail |
| Activity/Timeline feed | Plane | Inspiration only, AGPL | Timeline tab in all detail pages |
| Kanban card for QC findings | Plane | Inspiration only, AGPL | QC rework board |
| CRM pipeline stage selector | Twenty CRM | Inspiration only, AGPL | Hot Projects stage view |
| Dashboard KPI cards | refine | Pattern only, MIT | Role workspace home pages |
| Command palette / search | shadcn/ui Command | Direct, MIT | Global search across projects/quotations |
