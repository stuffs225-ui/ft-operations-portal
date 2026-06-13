# 11 — Prioritized Gap Backlog

---

## Tier 0 — Critical Blockers (Must Fix Before Any Module Sign-Off)

| # | Gap | Risk | Dependency | Reference Source | Usage | License Risk |
|---|-----|------|-----------|-----------------|-------|-------------|
| B-001 | DB trigger: Release Note blocked until all QC findings closed | 🔴 Critical | None | Custom (model on migration 061) | Direct | Low |
| B-002 | DB trigger/constraint: Medical serial required before item status = accepted/installed | 🔴 Critical | None | Custom trigger | Direct | Low |
| B-003 | Control Tower wired to live Supabase aggregations | 🔴 Critical | B-006, B-007 | refine pattern | Pattern only | Low |
| B-004 | All report pages wired to live Supabase queries | 🔴 Critical | None (per page) | refine / react-admin | Pattern only | Low |
| B-005 | ESLint config (`eslint.config.js`) created for v9/v10 | 🔴 High | None | None needed | Direct | Low |

---

## Tier 1 — High Priority (Phase 1–2 Foundation & Sales Cluster)

| # | Gap | Risk | Module | Reference Source | Usage | License Risk |
|---|-----|------|--------|-----------------|-------|-------------|
| B-006 | SLA background scheduler (Inngest/Trigger.dev) creates `sla_events` | 🔴 Critical | SLA | Inngest | Direct | Low (MIT) |
| B-007 | Inngest job: SLA breach notifications / escalation rules | 🟠 High | SLA / Notifications | Inngest | Direct | Low (MIT) |
| B-008 | DB trigger: Quotation status gate — spec file required for `submitted_by_sales` | 🟠 High | Quotation | Custom trigger | Direct | Low |
| B-009 | DB trigger: Coordinator return gate — PDF + quotation_number required | 🟠 High | Sales Coordinator | Custom trigger | Direct | Low |
| B-010 | DB CHECK: SO cannot be approved with `manufacturing_location = 'not_set'` | 🟡 Medium | Admin Approval | DB CHECK constraint | Direct | Low |
| B-011 | DB CHECK: SO cannot be approved with `medical_items = 'not_set'` | 🟡 Medium | Admin Approval | DB CHECK constraint | Direct | Low |
| B-012 | RLS on `quotation_requests`: sales_user sees own quotations only | 🟠 High | Quotation | Supabase RLS pattern | Direct | Low |
| B-013 | RequireRole on `/projects/new`: not all authenticated users should create SOs | 🟠 High | SO | Current pattern | Direct | Low |
| B-014 | Sales Workspace (`/sales`) wired to live Supabase | 🟠 High | Sales | None | Direct | Low |
| B-015 | Action Inbox wired to live SLA events and pending tasks | 🟠 High | Foundation | Inngest | Direct | Low |
| B-016 | shadcn/ui adopted for design system baseline | 🟡 Medium | Foundation | shadcn/ui | Direct | Low (MIT) |
| B-017 | Shared DataTable component (shadcn/ui + TanStack Table) | 🟡 Medium | Foundation | shadcn/ui | Direct | Low (MIT) |

---

## Tier 2 — High Priority (Phase 3–6 SO, Procurement, Store Cluster)

| # | Gap | Module | Reference Source | Usage | License Risk |
|---|-----|--------|-----------------|-------|-------------|
| B-018 | DB trigger: Vehicle receipt chassis_number NOT NULL on completion | Vehicle Receiving | Custom trigger | Direct | Low |
| B-019 | DB trigger: Required photos (5 types) before vehicle receipt status=accepted | Vehicle Receiving | Custom trigger | Direct | Low |
| B-020 | DB trigger: Temporary custody approval_required enforced at DB (mirror migration 061) | Material Custody | Custom trigger | Direct | Low |
| B-021 | DB trigger: Custody status cannot be in_custody while receiver_decision=pending | Material Custody | Custom trigger | Direct | Low |
| B-022 | RLS on `material_custody_records` | Material Custody | Supabase RLS | Direct | Low |
| B-023 | Verify `approval_required=true` auto-set when PO value > 10,000 SAR | Procurement | Migration 061 extension | Direct | Low |
| B-024 | DB trigger: Dubai followup blocked without active PN at DB level | Dubai | Custom trigger | Direct | Low |
| B-025 | DB trigger: Factory records blocked without active WO at DB level | Factory | Custom trigger | Direct | Low |
| B-026 | Customer master table — replace free-text customer_name | Master Data | ERPNext (inspiration) | Inspiration only | High (GPL) |
| B-027 | Inventory stock balance ledger (quantity tracking) | Store | ERPNext (inspiration) | Inspiration only | High (GPL) |

---

## Tier 3 — Medium Priority (Phase 7–9 Factory, Dubai, QC Cluster)

| # | Gap | Module | Reference Source | Usage | License Risk |
|---|-----|--------|-----------------|-------|-------------|
| B-028 | Excel BOM/BOQ parser (async background job) | Factory | Trigger.dev | Direct | Low (Apache) |
| B-029 | BOM item-level line tracking table | Factory | ERPNext (inspiration) | Inspiration only | High (GPL) |
| B-030 | DB trigger: raw_material_requests blocked without WO | Factory | Custom trigger | Direct | Low |
| B-031 | NCR → CAPA auto-creation linkage | QC / CAPA | Plane (inspiration) | Inspiration only | High (AGPL) |
| B-032 | Issues / CAPA management pages (create/edit, not just reports) | CAPA | Plane (inspiration) | Inspiration only | High (AGPL) |
| B-033 | CAPA status workflow enforcement | CAPA | Custom | Direct | Low |
| B-034 | Document versioning with supersedes_id FK | Documents | Custom | Direct | Low |
| B-035 | Required document checklist table and DB enforcement | Documents | ERPNext (inspiration) | Inspiration only | High (GPL) |
| B-036 | Template/generated-document storage buckets | Documents | Supabase | Direct | Low |
| B-037 | Monthly factory update auto-reminder (Inngest cron) | Factory | Inngest | Direct | Low (MIT) |

---

## Tier 4 — Low Priority / Nice to Have (Phase 10–11 Reporting & Polish)

| # | Gap | Module | Reference Source | Usage | License Risk |
|---|-----|--------|-----------------|-------|-------------|
| B-038 | KPI chart visualizations (bar, line, pie) | Reports | Recharts (MIT) | Direct | Low (MIT) |
| B-039 | Health score calculation background job (Inngest cron) | Reports | Inngest | Direct | Low (MIT) |
| B-040 | Supplier scorecard auto-calculation from NCRs and PO history | Reports | Custom | Direct | Low |
| B-041 | Scheduled report email delivery (Novu or Resend) | Reports | Novu | Direct | Medium (AGPL) |
| B-042 | Drill-down click handlers on all KPI cards | Reports | refine pattern | Pattern only | Low (MIT) |
| B-043 | Global search / command palette | Foundation | shadcn/ui Command | Direct | Low (MIT) |
| B-044 | Notification inbox UI with read/unread | Notifications | Novu pattern | Inspiration only | Medium (AGPL) |
| B-045 | Pagination / virtual scroll on all list pages | Foundation | TanStack Table | Direct | Low (MIT) |
| B-046 | Skeleton loaders on all async pages | Foundation | shadcn/ui Skeleton | Direct | Low (MIT) |
| B-047 | Toast notification system | Foundation | shadcn/ui Toast / Sonner | Direct | Low (MIT) |
| B-048 | Audit log trigger for role change events | Roles | Custom DB trigger | Direct | Low |
| B-049 | TypeScript strict null refinement on database.ts | Foundation | None | Direct | Low |
| B-050 | Mock data files excluded from production bundle | Foundation | Vite exclude pattern | Direct | Low |

---

## Suggested Implementation Order

```
Phase 1 (Foundation Complete)
├── B-005  ESLint config
├── B-016  shadcn/ui adoption
├── B-017  Shared DataTable
├── B-006  Inngest SLA scheduler
├── B-007  SLA breach notifications
├── B-015  Action Inbox live wiring

Phase 2 (Sales Cluster)
├── B-001  Release Note DB trigger ← CRITICAL
├── B-002  Medical serial DB trigger ← CRITICAL
├── B-008  Quotation spec file DB trigger
├── B-009  Coordinator return DB trigger
├── B-010  SO route CHECK
├── B-011  SO medical CHECK
├── B-012  RLS on quotation_requests
├── B-013  RequireRole on /projects/new
├── B-014  Sales Workspace live query
├── B-003  Control Tower live wiring
├── B-004  All reports live queries

Phase 3 (SO/Approval)
├── B-023  PO 10k auto-flag verify
├── B-022  RLS on custody records

Phase 4 (WO/PN Gate)
├── B-025  Factory records DB trigger (WO)
├── B-024  Dubai followup DB trigger (PN)
├── B-030  Raw material requests DB trigger

Phase 5 (Procurement/Suppliers)
└── B-026  Customer master table

Phase 6 (Store/Custody)
├── B-018  Vehicle chassis DB constraint
├── B-019  Vehicle photos DB trigger
├── B-020  Custody approval DB trigger
├── B-021  Custody receiver DB trigger
└── B-027  Inventory stock balance

Phase 7 (Factory)
├── B-028  Excel parser (Trigger.dev)
└── B-037  Monthly update reminder (Inngest)

Phase 9 (QC/Release)
├── B-031  NCR → CAPA linkage
├── B-032  Issues/CAPA management pages
└── B-034  Document versioning

Phase 11 (Reports/KPIs)
├── B-038  Chart visualizations
├── B-039  Health score cron job
├── B-042  Drill-down handlers
└── B-041  Scheduled report delivery
```
