# 09 — Step 5 Design System Brief

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Brief ready — Step 5 may begin after Step 4C PR is reviewed

---

## What Step 5 Should Cover

Step 5 is the **Design System Setup** phase. Its goal is to install shadcn/ui as the component library baseline, define all shared UI primitives, establish status badge conventions, create a shared DataTable component, and produce the Form architecture before any module-level page work begins in Phase 1–10.

Step 5 is **not** a module feature. It is infrastructure. When Step 5 is complete, every subsequent phase implementation has a ready-made component toolkit to use.

**Step 5 does NOT:**
- Wire any page to live Supabase data
- Implement any business logic
- Build any new features
- Modify existing migrations or RLS policies
- Redesign any existing page

---

## Recommended Branch Name

```
feature/shadcn-ui-design-system
```

---

## Design System Sources

| Source | License | Usage |
|--------|---------|-------|
| shadcn/ui | MIT | Primary component library — direct adoption |
| Radix UI primitives | MIT | Included via shadcn/ui |
| class-variance-authority (CVA) | MIT | Component variant management |
| tailwind-merge | MIT | Safe Tailwind class composition |
| @tanstack/react-table | MIT | DataTable engine |
| lucide-react | MIT | Icons (already installed) |
| recharts | MIT | Charts for Phase 10 reports |

**Do not install:**
- refine or react-admin (framework decision is separate; patterns are sufficient)
- Novu (defer to Phase 10)
- BullMQ (defer to Phase 10)

---

## shadcn/ui Integration Approach

### Step 1 — Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Configuration choices:
- Style: `default` (works with existing Tailwind config)
- Base color: Slate (neutral — matches the dark navy/white design vocabulary)
- CSS variables: Yes (enables theme tokens)
- Tailwind config path: `tailwind.config.js`
- Import alias: `@/` → `src/`

### Step 2 — Install Core Components (in order)

```bash
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add form
npx shadcn@latest add skeleton
npx shadcn@latest add toast
npx shadcn@latest add tooltip
npx shadcn@latest add separator
npx shadcn@latest add table
npx shadcn@latest add dropdown-menu
```

Each component copies into `src/components/ui/` as a fully owned TypeScript file.

### Step 3 — Coexistence with Existing Custom Components

Do NOT delete existing custom components in `src/components/ui/` during Step 5. Adopt the following coexistence strategy:
- shadcn/ui files use lowercase kebab-case names: `badge.tsx`, `button.tsx`
- Existing custom files use PascalCase: `Badge.tsx`, `Button.tsx`
- During Step 5, both coexist. Phase 1+ implementation uses shadcn/ui components.
- Phase 2 removes custom components once all callers are migrated.

---

## Component Inventory to Create (Step 5 Deliverables)

### Core Primitives (from shadcn/ui install)

| Component | File | Purpose | Priority |
|-----------|------|---------|---------|
| Button | `src/components/ui/button.tsx` | All action buttons | Critical |
| Badge | `src/components/ui/badge.tsx` | Status indicators | Critical |
| Card | `src/components/ui/card.tsx` | Content containers | Critical |
| Dialog | `src/components/ui/dialog.tsx` | Confirmation modals | Critical |
| Sheet | `src/components/ui/sheet.tsx` | Side panels (replaces Drawer) | Critical |
| Tabs | `src/components/ui/tabs.tsx` | Detail page navigation | Critical |
| Input | `src/components/ui/input.tsx` | Form fields | Critical |
| Select | `src/components/ui/select.tsx` | Dropdowns | Critical |
| Form | `src/components/ui/form.tsx` | react-hook-form wrapper | Critical |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading states | High |
| Toast | `src/components/ui/toast.tsx` | Feedback notifications | High |
| Tooltip | `src/components/ui/tooltip.tsx` | Help text, truncated labels | Medium |
| Separator | `src/components/ui/separator.tsx` | Visual dividers | Low |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | Action menus | Medium |

### FT Portal Custom Components (build on top of shadcn/ui)

These are FT-Portal-specific components built using the shadcn/ui primitives:

| Component | File | Purpose | Built From |
|-----------|------|---------|-----------|
| StatusBadge | `src/components/ui/status-badge.tsx` | Central status → color mapping | shadcn/ui Badge |
| DataTable | `src/components/ui/data-table.tsx` | Shared table with sort/filter/search | TanStack Table + shadcn/ui Table |
| DataTableToolbar | `src/components/ui/data-table-toolbar.tsx` | Search + filter bar | shadcn/ui Input + Select |
| ConfirmDialog | `src/components/ui/confirm-dialog.tsx` | "Are you sure?" modal | shadcn/ui Dialog |
| PageSection | `src/components/ui/page-section.tsx` | Labeled content section | shadcn/ui Card |
| FormField* | Handled by shadcn/ui Form | — | shadcn/ui Form |

### StatusBadge — Critical Deliverable

`StatusBadge` maps status strings to semantic colors. This replaces all per-page badge color logic:

```typescript
// src/components/ui/status-badge.tsx
import { Badge } from './badge';
import { cva } from 'class-variance-authority';

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  // Projects
  draft: 'secondary',
  submitted_for_approval: 'default',   // amber
  approved: 'default',                  // green
  rejected: 'destructive',
  active: 'default',                    // green
  completed: 'secondary',              // muted green
  cancelled: 'secondary',
  sent_back_for_revision: 'outline',
  // Release Notes
  ready_to_issue: 'default',
  issued: 'default',
  blocked: 'destructive',
  // POs
  pending_approval: 'default',         // amber
  // Store items
  accepted_by_qc: 'default',
  rejected_by_qc: 'destructive',
  installed: 'default',
  // Suppliers
  active_approved: 'default',
  blacklisted: 'destructive',
  // add all values from docs/reference-library/03-design-system-recommendation.md
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT_MAP[status] ?? 'outline'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
```

### DataTable — Critical Deliverable

All 40+ list pages currently use bespoke HTML tables. A shared DataTable eliminates per-page table code:

```typescript
// src/components/ui/data-table.tsx
// Built on TanStack Table + shadcn/ui Table
// Props: columns (ColumnDef[]), data (T[]), searchColumn?, filters?
```

Usage in any list page:
```typescript
<DataTable
  columns={projectColumns}
  data={projects}
  searchColumn="project_code"
/>
```

---

## UI Standards to Define in Step 5

### 1. Color Tokens (via shadcn/ui CSS variables)

Define in `src/styles/index.css`:
- Background: `--background: white`
- Sidebar: `--sidebar: #0f172a` (dark navy)
- Accent: `--accent: #0ea5e9` (teal/sky-500)
- Destructive: red-600
- Muted: slate-100

### 2. Typography Standards

| Context | Class | Font |
|---------|-------|------|
| Page title | `text-2xl font-semibold` | System sans-serif |
| Section header | `text-lg font-medium` | System sans-serif |
| Table header | `text-sm font-medium text-muted-foreground` | System sans-serif |
| Table cell | `text-sm` | System sans-serif |
| Badge | `text-xs font-medium` | System sans-serif |
| Caption/help | `text-xs text-muted-foreground` | System sans-serif |

### 3. Spacing Grid

Use Tailwind's 4px grid throughout:
- Card padding: `p-6` (24px)
- Section gaps: `gap-4` (16px)
- Form field gaps: `space-y-4` (16px)
- Table row height: `h-12` (48px)

### 4. Page Layout Standards

All protected pages:
```
<AppLayout>
  <div className="p-6 space-y-6">
    <PageHeader title="..." breadcrumb={[...]} actions={<Button>...</Button>} />
    <div className="grid gap-4">
      {/* content */}
    </div>
  </div>
</AppLayout>
```

---

## Acceptance Criteria for Step 5

- [ ] `npx shadcn@latest init` completed — `components.json` created
- [ ] All 14 core components installed to `src/components/ui/`
- [ ] `StatusBadge` component created with all FT Portal status values mapped
- [ ] `DataTable` component created using TanStack Table + shadcn/ui Table
- [ ] `ConfirmDialog` component created using shadcn/ui Dialog
- [ ] `eslint.config.js` created (B-005) — ESLint now functional
- [ ] Tailwind config updated with shadcn/ui CSS variable tokens
- [ ] `npm run build` passes with zero errors
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes (or reports only known pre-existing issues)
- [ ] Type updates from migrations 079–080 added to `src/types/index.ts`
- [ ] `MOCK_CURRENT_USER` removed from `src/lib/roles.ts`
- [ ] No existing page behavior changed
- [ ] No existing Supabase queries changed
- [ ] No migrations created

---

## Copy-Ready Step 5 Prompt

```
You are working on the FT Operations Portal repository (stuffs225-ui/ft-operations-portal).
Read docs/CLAUDE_PROJECT_RULES.md first before making any changes.

TASK: Step 5 — Design System Setup

This is a setup-and-configuration task, not a feature implementation. Your job is to:
1. Install shadcn/ui as the component library baseline
2. Create the FT Portal's shared UI components (StatusBadge, DataTable, ConfirmDialog)
3. Add the missing TypeScript types from migrations 079 and 080
4. Create the ESLint config (B-005)
5. Make one small cleanup: remove MOCK_CURRENT_USER from src/lib/roles.ts

IMPORTANT: This task is additive only. Do NOT:
- Delete any existing custom components (Badge.tsx, Button.tsx, Card.tsx etc.)
- Change any page behavior or business logic
- Wire any page to live Supabase
- Create new migrations
- Modify existing pages beyond adding imports of new components

REQUIRED READING:
1. docs/CLAUDE_PROJECT_RULES.md
2. docs/architecture/09-step-5-design-system-brief.md (this brief)
3. docs/architecture/03-type-safety-and-db-alignment.md (type gaps to fix)
4. docs/reference-library/03-design-system-recommendation.md (design tokens, colors)
5. docs/reference-library/05-license-risk-notes.md (all new dependencies must be MIT)
6. src/types/index.ts (current types — read before editing)
7. src/lib/roles.ts (MOCK_CURRENT_USER location — read before editing)

WORK TO DO (in order):

1. CREATE BRANCH: feature/shadcn-ui-design-system

2. SHADCN/UI SETUP:
   Run: npx shadcn@latest init
   Use style: default, base color: slate, CSS variables: yes, alias: @/components = src/components
   Install components: button, badge, card, dialog, sheet, tabs, input, select, form,
     skeleton, toast, tooltip, separator, table, dropdown-menu

3. INSTALL PEER DEPENDENCIES:
   npm install @tanstack/react-table class-variance-authority tailwind-merge
   npm install react-hook-form zod @hookform/resolvers
   (All MIT licensed)

4. CREATE CUSTOM FT PORTAL COMPONENTS:
   - src/components/ui/status-badge.tsx — maps all status strings to Badge variants
     (Use docs/reference-library/03-design-system-recommendation.md Status Badge Standards)
   - src/components/ui/data-table.tsx — TanStack Table wrapper with shadcn Table
   - src/components/ui/data-table-toolbar.tsx — search input + filter dropdowns
   - src/components/ui/confirm-dialog.tsx — confirmation modal with title/description/confirm/cancel

5. ADD TYPE UPDATES (docs/architecture/03-type-safety-and-db-alignment.md):
   - Add Customer interface to src/types/index.ts
   - Add customer_id: string | null to Project interface
   - Add customer?: Pick<Customer,...> | null join field to Project
   - Add AuditLogEntry interface with before_data / after_data fields

6. REMOVE DEAD CODE:
   - Remove MOCK_CURRENT_USER constant from src/lib/roles.ts (lines 77-83)
     Verify: grep -rn "MOCK_CURRENT_USER" src/ — should appear only in roles.ts

7. CREATE ESLINT CONFIG (B-005):
   - Create eslint.config.js for ESLint v9/v10 flat config format
   - Include @typescript-eslint rules
   - Include react-hooks rules
   - Run npm run lint and document results

8. VALIDATION:
   - npm run build — must produce zero errors
   - npx tsc --noEmit — must produce zero errors
   - npm run lint — document all output (fix clear errors, document pre-existing ones)

9. COMMIT AND PUSH to branch: feature/shadcn-ui-design-system

10. OPEN PR titled: "Step 5 — Design System Setup (shadcn/ui + Type Updates)"

PR DESCRIPTION MUST INCLUDE:
- Components installed
- Custom FT Portal components created
- Type updates made
- Dead code removed
- ESLint config result
- Build validation result
- Confirmation that no existing page behavior changed

ACCEPTANCE CRITERIA (all must be true before creating PR):
- components.json exists (shadcn init complete)
- All 14 shadcn/ui components installed to src/components/ui/
- StatusBadge component maps all portal status values
- DataTable component wraps TanStack Table
- ConfirmDialog component exists
- Customer interface exists in src/types/index.ts
- Project interface includes customer_id
- AuditLogEntry interface exists in src/types/index.ts
- MOCK_CURRENT_USER removed from roles.ts
- eslint.config.js created
- npm run build passes
- npx tsc --noEmit passes
- No existing page broken
- No existing migration created or modified
```

---

## Recommended Next Steps After Step 5

| Step | Name | Branch |
|------|------|--------|
| **Phase 1** | Foundation Implementation | `phase/1-foundation` |
| Phase 1A | Service layer + type split + RBAC hooks | — |
| Phase 1B | Customer master data UI (search, select in SO form) | — |
| Phase 2 | Core workflow — SO registration wizard, approval flow | `phase/2-core-workflow` |
