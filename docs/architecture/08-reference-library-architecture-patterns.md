# 08 — Reference Library Architecture Patterns

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no code changed

---

## Overview

This document maps the Reference Library sources (`docs/reference-library/`) to concrete architecture recommendations for the FT Operations Portal. License risk is assessed for each pattern. No reference source code has been copied into the repository — all patterns are inspiration or direct MIT-licensed library adoption.

---

## Pattern 1 — shadcn/ui (Component Library)

**Source:** shadcn/ui  
**License:** MIT — direct use permitted  
**Usage Category:** Direct — copy components into `src/components/ui/`  
**License Risk:** None

### What to Adopt

shadcn/ui components replace all current custom components in `src/components/ui/`. Key replacements:

| Custom Component | shadcn/ui Replacement | Priority |
|-----------------|----------------------|---------|
| `Badge.tsx` (custom, not accessible) | `badge.tsx` (Radix primitive, ARIA compliant) | Phase 1 / Step 5 |
| `Button.tsx` (custom, no variants) | `button.tsx` (CVA variants: default, destructive, outline, ghost) | Phase 1 / Step 5 |
| `Card.tsx` | `card.tsx` (structured header/content/footer) | Phase 1 / Step 5 |
| `Drawer.tsx` (custom slide-out) | `sheet.tsx` (Radix Sheet — side panel) | Phase 1 / Step 5 |
| None | `dialog.tsx` (Radix Dialog — confirmation modals) | Phase 1 / Step 5 |
| None | `data-table.tsx` (TanStack Table wrapper) | Phase 1 / Step 5 |
| None | `form.tsx` (react-hook-form integration) | Phase 1 / Step 5 |
| None | `input.tsx` | Phase 1 / Step 5 |
| None | `select.tsx` | Phase 1 / Step 5 |
| None | `skeleton.tsx` | Phase 1 / Step 5 |
| None | `toast.tsx` / `sonner.tsx` | Phase 1 / Step 5 |
| None | `tabs.tsx` (for detail page tabs) | Phase 1 / Step 5 |
| None | `command.tsx` (global search / combobox) | Phase 2 |
| None | `calendar.tsx` / `date-picker.tsx` | Phase 2 |

### How It Guides the Architecture

1. **Design system baseline** — once shadcn/ui is installed, all new components inherit consistent Radix primitives, ARIA compliance, and Tailwind class composition.
2. **Replaces bespoke component per page** — all 155 page files currently import from `src/components/ui/` (custom). Replacing Badge, Button, and Card first cascades to every page with minimal effort.
3. **RTL support** — shadcn/ui with Tailwind's `rtl:` modifier supports Arabic RTL layout per the design system requirement.
4. **`tailwind-merge` and `class-variance-authority` (CVA)** — required peer dependencies; add to `package.json` in Step 5.

### Supporting Libraries (MIT, safe to install)
- `@radix-ui/react-*` — shadcn/ui peer dependencies
- `class-variance-authority` — component variant management
- `tailwind-merge` — safe Tailwind class merging
- `cmdk` — command palette (included in shadcn/ui Command)
- `@tanstack/react-table` — DataTable engine (MIT)
- `react-hook-form` — form state management (MIT)
- `zod` — schema validation (MIT)

---

## Pattern 2 — refine (CRUD Framework)

**Source:** refine  
**License:** MIT — direct use permitted (as npm dependency)  
**Usage Category:** Pattern-first; optional direct use in Phase 1+  
**License Risk:** None

### What to Adopt as Patterns (Without Installing refine)

refine introduces a resource-based model where each DB entity has a resource (list, create, edit, show). The FT Portal can adopt the pattern without the full refine framework:

| refine Pattern | FT Portal Adoption | Phase |
|---------------|-------------------|-------|
| Resource-based routing | `src/services/<module>.service.ts` = resource layer | Phase 1 |
| `useList()` hook | `useProjects()`, `useQuotations()` etc. fetching hooks | Phase 1+ |
| `useCreate()` hook | Extracted from page components into service functions | Phase 1+ |
| `useShow()` hook | `useProject(id)`, `useQuotation(id)` etc. | Phase 2 |
| `accessControlProvider` | `usePermission()` hook backed by `PERMISSION_KEYS` | Phase 1 |
| Role workspace pattern | Role-specific dashboard home pages | Phase 1 |
| List page with filter + sort | DataTable component with column definitions | Phase 1 |

### How It Guides Architecture Cleanup

1. **Service layer shape** — refine's data provider interface defines `getList`, `getOne`, `create`, `update`, `deleteOne`. This is the target shape for `src/services/*.service.ts` functions.
2. **RBAC hook pattern** — refine's `CanAccess` component maps to the `usePermission()` hook proposed in document 06.
3. **Detail page (Show) structure** — refine's `Show` layout = container with tabs. This directly informs the `ProjectDetail.tsx` decomposition plan in document 02.

---

## Pattern 3 — react-admin (List/Detail Patterns)

**Source:** react-admin  
**License:** MIT — direct use permitted (as npm dependency)  
**Usage Category:** Pattern inspiration — structural patterns  
**License Risk:** None

### What to Adopt as Patterns

| react-admin Pattern | FT Portal Application |
|--------------------|----------------------|
| `<Datagrid>` pattern | Standard DataTable structure for all list pages (adopted via shadcn/ui + TanStack) |
| `<FilterForm>` pattern | Reusable filter bar component for all list pages |
| `<ReferenceInput>` | Customer, Project, Supplier select components that query live Supabase |
| `<Show>` page layout | Detail page structure: title, edit button, data panels |
| Bulk actions | Batch approve, batch export on list pages (Phase 2+) |

### How It Guides Architecture Cleanup

react-admin's `<Datagrid>` confirms the investment in a shared DataTable component (B-017). Every list page in the portal should adopt the same table structure with consistent filter, search, sort, and export patterns — not bespoke HTML tables as currently implemented.

---

## Pattern 4 — ERPNext (Business Logic Reference)

**Source:** ERPNext (Frappe Framework)  
**License:** GPL v3 — **do NOT copy any code**  
**Usage Category:** Inspiration only — workflow models, data patterns  
**License Risk:** HIGH if any code is copied

### What to Study (Inspiration Only)

| ERPNext Concept | FT Portal Application | What We Write from Scratch |
|-----------------|----------------------|---------------------------|
| Sales Order → Work Order chain | `projects` → `project_execution_references` | DB triggers (migrations 078, future 025) |
| BOM item structure | `factory_requirements` table | Custom schema (B-029) |
| Serial Number tracking | `medical_serial_numbers` + `store_receipt_items.serial_required` | Migration 077 trigger pattern |
| Quality Inspection workflow | `material_qc_inspections` + `project_qc_inspections` | Migration 076 release note gate |
| Supplier qualification | `approved_suppliers` lifecycle | Custom trigger (B-011 extension) |
| Customer master data | `customers` table (migration 079) | Original schema based on business need |
| Stock Entry / movement | Planned `store_receipts` + inventory ledger | To be designed in Phase 7 (B-027) |

### Confirmed: No ERPNext Code Copied

All migrations (076–080) were written from scratch following the repository's established patterns (`supabase/migrations/061_po_approval_guard.sql`). The `customers` table schema in migration 079 notes: "The customers table schema is original. No ERPNext code was copied. ERPNext customer model was referenced for field selection only."

---

## Pattern 5 — Plane (Issue Tracking UX)

**Source:** Plane  
**License:** AGPL v3 — **do NOT copy any code**  
**Usage Category:** UX inspiration only — visual design, interaction patterns  
**License Risk:** VERY HIGH if any code is copied

### What to Study (UI Design Inspiration Only)

| Plane Pattern | FT Portal Application |
|--------------|----------------------|
| Issue card in kanban board | QC Finding card in finding list (status, priority, assignee badge) |
| Status state machine transitions | QC finding status flow: open → assigned → rework → closed |
| CAPA record detail view | FT Portal `capa_records` detail page (Phase 8) |
| Activity timeline on issue | Per-finding timeline events (Phase 8) |
| Priority badge (critical/high/medium/low) | Material NCR severity badge |

### Implementation Rule

All Plane-inspired UI is built using shadcn/ui components (MIT). The visual similarity to Plane is in the design; the code is entirely original.

---

## Pattern 6 — Twenty CRM (Record View UX)

**Source:** Twenty CRM  
**License:** AGPL v3 — **do NOT copy any code**  
**Usage Category:** UX inspiration only — record page layout  
**License Risk:** VERY HIGH if any code is copied

### What to Study (UI Design Inspiration Only)

| Twenty CRM Pattern | FT Portal Application |
|-------------------|----------------------|
| Record page: title header + status bar + property panels | `ProjectDetail.tsx` decomposed structure (doc 02) |
| Activity feed sidebar on record | Timeline tab in ProjectDetail |
| Related records section | Vehicle lines, documents, QC findings in ProjectDetail |
| Action bar at top right | Approval/rejection action buttons on ProjectDetail |
| Hot Projects CRM pipeline view | `HotProjects.tsx` stage card view (Phase 3) |

---

## Pattern 7 — Inngest / Trigger.dev (Background Jobs)

**Source:** Inngest, Trigger.dev  
**License:** BSL 1.1 — **do NOT use in commercial production**  
**Usage Category:** Architecture reference — job queue patterns  
**License Risk:** HIGH if used in production without commercial license

### What to Study (Architecture Inspiration Only)

| BSL Pattern | FT Portal Application | Safe Alternative |
|-------------|----------------------|-----------------|
| Durable function with step-by-step execution | SLA evaluation background job | BullMQ (MIT) |
| Automatic retry on failure | Failed notification delivery | BullMQ retry |
| Cron-style scheduled job | Monthly factory update reminder (B-037) | pg-boss (MIT, PostgreSQL-backed) |
| Event-driven job trigger | SLA breach → notification | BullMQ event queue |

**Safe implementation:** Use BullMQ (MIT) for job queue + pg-boss (MIT) for scheduled jobs. The architectural pattern (step functions, retry logic, structured logging) is studied from Inngest/Trigger.dev but implemented from scratch with MIT alternatives.

---

## Pattern 8 — Novu (Notification Center)

**Source:** Novu (SDK is MIT; server is AGPL)  
**License:** SDK is MIT — safe to install  
**Usage Category:** SDK is direct use; server is inspiration only  
**License Risk:** None for Novu SDK; HIGH for Novu self-hosted server

### Recommended Usage

```typescript
// Safe: Use Novu's MIT notification center React component
import { NovuProvider, NotificationBell, PopoverNotificationCenter } from '@novu/notification-center';
```

The Novu SDK renders an in-app notification bell and popover with unread counts and notification list. This replaces the planned custom `Notifications.tsx` page.

**Do NOT self-host the Novu server** (AGPL). Use Novu Cloud or build a simple custom notification delivery service with BullMQ.

---

## Pattern 9 — Appsmith (Dashboard Layout)

**Source:** Appsmith  
**License:** Apache 2.0 — patterns can be referenced  
**Usage Category:** UX inspiration — dashboard tile layout  
**License Risk:** None

### What to Study

| Appsmith Pattern | FT Portal Application |
|-----------------|----------------------|
| KPI tiles with count + link | Control Tower 9-tile layout (Phase 10) |
| Auto-refresh dashboard | Control Tower 30-second refresh (Phase 10) |
| Chart widgets in dashboard | Reports KPI charts with recharts (Phase 10) |

---

## License Risk Summary

| Source | License | Can Copy Code | Can Use as Pattern |
|--------|---------|--------------|-------------------|
| shadcn/ui | MIT | ✅ Yes | ✅ Yes |
| refine | MIT | ✅ Yes (as dep) | ✅ Yes |
| react-admin | MIT | ✅ Yes (as dep) | ✅ Yes |
| Appsmith | Apache 2.0 | ✅ Patterns only | ✅ Yes |
| ERPNext | GPL v3 | ❌ Never | ✅ Yes (study only) |
| Twenty CRM | AGPL v3 | ❌ Never | ✅ Yes (study only) |
| Plane | AGPL v3 | ❌ Never | ✅ Yes (study only) |
| Novu (SDK) | MIT | ✅ Yes (install SDK) | ✅ Yes |
| Novu (server) | AGPL v3 | ❌ Never | ✅ Yes (study only) |
| Inngest | BSL 1.1 | ❌ Not in production | ✅ Yes (study only) |
| Trigger.dev | BSL 1.1 | ❌ Not in production | ✅ Yes (study only) |
| BullMQ | MIT | ✅ Yes | ✅ Yes |
| pg-boss | MIT | ✅ Yes | ✅ Yes |

---

## Confirmed: No External Source Code in Repository

All files in `supabase/migrations/` (076–080) and `docs/` are original work. No code from any of the reference sources (ERPNext, Twenty CRM, Plane, Inngest, Trigger.dev, Novu server) has been copied. All SQL trigger functions follow the pattern established in `supabase/migrations/061_po_approval_guard.sql` which is original code in this repository.
