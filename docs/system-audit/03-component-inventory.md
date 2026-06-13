# 03 — Component Inventory

---

## Layout Components

| Component | Path | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `AppLayout` | `src/layouts/AppLayout.tsx` | Root layout with Sidebar + Header + Outlet | ✅ | Wraps all protected routes |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation sidebar | ✅ | Role-filtered nav links |
| `Header` | `src/components/layout/Header.tsx` | Top bar with user info | ✅ | Role badge + logout |

---

## Authentication Components

| Component | Path | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.tsx` | Redirects unauthenticated users to /login | ✅ | Clean, minimal |
| `RequireRole` | `src/components/auth/RequireRole.tsx` | Route-level role enforcement | ✅ | Admin always passes; 403 panel on deny |

---

## Shared UI Components

| Component | Path | Purpose | Issues |
|-----------|------|---------|--------|
| `Badge` | `src/components/ui/Badge.tsx` | Status / label badges | Custom; not accessible (no ARIA); no shadcn/ui |
| `Button` | `src/components/ui/Button.tsx` | Action buttons | Custom; no variant system matching shadcn/ui |
| `Card` / `CardHeader` | `src/components/ui/Card.tsx` | Content containers | Custom; no shadcn/ui Card |
| `Drawer` | `src/components/ui/Drawer.tsx` | Slide-out panel | Custom; no Radix Dialog primitive |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | Empty result state | ✅ Good pattern |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | Page title + breadcrumbs | ✅ Present |
| `PageLoader` | `src/components/ui/PageLoader.tsx` | Full-page loading spinner | ✅ Used in Suspense fallback |
| `BrandLogo` | `src/components/ui/BrandLogo.tsx` | FT/NAFFCO logo | ✅ |
| `DataSourceBadge` | `src/components/ui/DataSourceBadge.tsx` | Live/Mock indicator | ✅ Dev helper |
| `DevModeBanner` | `src/components/ui/DevModeBanner.tsx` | Dev mode warning banner | ✅ Dev helper |

---

## Feature Components

| Component | Path | Purpose | Issues |
|-----------|------|---------|--------|
| `DocumentPanel` | `src/components/documents/DocumentPanel.tsx` | Document upload/view panel | Partial — upload is metadata only |
| `DocumentList` | `src/components/features/DocumentList.tsx` | List of documents for a record | Partial |
| `ReportExportBar` | `src/components/features/ReportExportBar.tsx` | Export actions for reports | Partial — no real export yet |

---

## Missing Shared Components

The following components are needed but do not exist as reusable shared components. Each module builds its own version:

| Missing Component | Impact | Reference Pattern |
|-------------------|--------|-------------------|
| **Data Table** with sort/filter/search/export | Every list page is bespoke HTML table | shadcn/ui + TanStack Table (MIT) |
| **Form field components** (Input, Select, Textarea, DatePicker) | Each form uses raw HTML inputs | shadcn/ui Form components (MIT) |
| **Dialog / Modal** | Custom `Drawer` used inconsistently; no confirmation dialog | shadcn/ui Dialog + Radix (MIT) |
| **Timeline / Audit feed** | Each module that needs timeline re-implements it | Custom or Plane-inspired (pattern only) |
| **Status badge dictionary** | Badge colors defined per-page | Shared `StatusBadge` with central status→color map |
| **FileUpload card** | Upload UX varies per module | shadcn/ui + `@uploader` pattern |
| **Wizard / Stepper** | Only `QuotationNew` has a stepper | shadcn/ui Steps (MIT) |
| **Skeleton loaders** | Pages show nothing while loading | shadcn/ui Skeleton (MIT) |
| **Alert / Toast** | No toast notification system | shadcn/ui Toast / Sonner (MIT) |
| **Confirmation Dialog** | Destructive actions have no confirm step | shadcn/ui AlertDialog (MIT) |
| **KPI / Stat Card** | Dashboard uses `Card` + custom markup | refine Dashboard pattern (MIT) |
| **Combobox / Search Select** | Dropdowns are raw `<select>` | shadcn/ui Command/Combobox (MIT) |

---

## Data Table Situation

No shared data table component exists. Every list page (`Projects`, `Quotations`, `ProcurementRequests`, etc.) renders its own bespoke HTML `<table>`. Observations:

- No shared column definition
- No shared filter/search bar
- No pagination component
- No export hook
- No row-click-to-navigate abstraction
- Status columns repeat badge logic on each page

**Recommendation:** Adopt `shadcn/ui DataTable` pattern backed by `@tanstack/react-table` (MIT). This is the single highest-ROI component addition.

---

## Form Situation

No shared form library or schema validation. Each form uses local `useState`:

- Field validation is manual string checks
- No `required` field schema
- No server-side error surfacing from Supabase into fields
- No `dirty` / `touched` state management
- Complex multi-step forms (QuotationNew, ProjectNew) re-implement stepper logic independently

**Recommendation:** `react-hook-form` + `zod` (both MIT) with shadcn/ui Form wrappers.

---

## Duplicate or Inconsistent Components

| Issue | Details |
|-------|---------|
| Badge color logic duplicated | Each page defines `badgeVariant()` or similar locally |
| Status label formatting duplicated | `formatStatus()` helpers exist in multiple pages |
| Loading spinner duplicated | `PageLoader` shared, but many pages inline their own spinner |
| Card layout varies | Some pages use `<Card>`, others use raw `<div className="bg-white rounded-lg">` |
| Empty state inconsistent | `EmptyState` component exists but not used everywhere; many pages use custom empty divs |

---

## Refactor Candidates (Do Not Refactor Yet)

| Component | Issue | Future Action |
|-----------|-------|---------------|
| `src/pages/ProjectDetail.tsx` | 64.5 KB — largest page; has timeline, documents, vehicle lines, gate status, approval all in one | Split into tab sub-components |
| `src/pages/QuotationDetail.tsx` | 30.7 KB — similar multi-concern page | Split into feature components |
| `src/pages/WoPnGate.tsx` | 21.7 KB — gate logic + table mixed | Extract gate logic to hook |
| `src/types/index.ts` | 1,673 lines — all types in one file | Split per module |
| `src/data/` (15 mock files) | Present in production bundle | Move to test fixtures; exclude from bundle |

---

## Alignment with Reference Library

| Reference | What to Adopt | Priority |
|-----------|---------------|----------|
| **shadcn/ui** (MIT) | DataTable, Form, Dialog, Badge, Button, Skeleton, Toast, Combobox, Calendar, Sheet (Drawer) | Critical |
| **refine** (MIT) | Resource routing pattern, List/Show/Create/Edit page structure, RBAC hooks | High |
| **react-admin** (MIT) | DataGrid, FilterForm, ReferenceInput, Show layout | Medium |
| **Plane** (AGPL — pattern only) | Timeline/Activity feed UI, finding/rework kanban card | Low |
