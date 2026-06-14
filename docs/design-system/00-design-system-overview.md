# 00 — Design System Overview

**Step:** 5A — Design System Foundation  
**Date:** 2026-06-14  
**Status:** Complete

---

## What Was Built

Step 5A installs the shared design system foundation for the FT Operations Portal. All new components are additive — no existing page was modified.

### Layer 1 — shadcn/ui Primitives

Installed to `src/components/ui/` and `src/components/ui/primitives/`:

| File | Purpose |
|------|---------|
| `primitives/button.tsx` | CVA button with 6 variants (default, destructive, outline, secondary, ghost, link) |
| `primitives/badge.tsx` | CVA badge with 4 variants (default, secondary, destructive, outline) |
| `primitives/card.tsx` | Card + CardHeader + CardTitle + CardContent + CardFooter |
| `alert.tsx` | Alert + AlertTitle + AlertDescription |
| `checkbox.tsx` | Radix Checkbox primitive |
| `dialog.tsx` | Radix Dialog with overlay, content, header, footer |
| `dropdown-menu.tsx` | Radix DropdownMenu with all sub-components |
| `form.tsx` | react-hook-form wrapper with FormField, FormItem, FormLabel, FormControl |
| `input.tsx` | Text input with ring + border styling |
| `label.tsx` | Radix Label primitive |
| `progress.tsx` | Radix Progress bar |
| `select.tsx` | Radix Select with scroll buttons and item indicator |
| `separator.tsx` | Radix Separator (horizontal/vertical) |
| `sheet.tsx` | Radix Sheet (side panel) with 4 side variants |
| `skeleton.tsx` | Animated skeleton loader |
| `table.tsx` | Table + TableHeader + TableBody + TableHead + TableCell |
| `tabs.tsx` | Radix Tabs with List, Trigger, Content |
| `textarea.tsx` | Multi-line text input |
| `tooltip.tsx` | Radix Tooltip with portal |

**Coexistence note:** The three new shadcn primitives that share names with existing custom components (`Button.tsx`, `Badge.tsx`, `Card.tsx`) are placed in `src/components/ui/primitives/` to avoid TypeScript TS1149 casing collision errors. Existing pages continue using the PascalCase custom components. Phase 5B will migrate existing pages to the shadcn primitives and remove the legacy custom components.

### Layer 2 — Status Components

`src/components/status/`:
- `status-config.ts` — Central source of truth mapping all FT Portal status strings → badge variant + label
- `status-badge.tsx` — `<StatusBadge status="approved" />` renders color-coded badge
- `priority-badge.tsx` — `<PriorityBadge priority="critical" />` for NCR/CAPA severity
- `role-badge.tsx` — `<RoleBadge role="qc_user" />` with role-specific colors

### Layer 3 — Common Components

`src/components/common/`:
- `page-header.tsx` — Title + breadcrumb + subtitle + action slot
- `section-card.tsx` — Card wrapper with optional title, description, and actions slot
- `metric-card.tsx` — KPI tile with value, icon, trend indicator, and optional href
- `detail-header.tsx` — Record detail page header with title, status badge, meta fields, actions
- `timeline-item.tsx` — Timeline event row with actor, timestamp, and icon
- `checklist-item.tsx` — Checklist row with checked/unchecked/NA states
- `confirm-dialog.tsx` — Confirmation modal (uses Radix AlertDialog — accessible by default)

### Layer 4 — Feedback States

`src/components/feedback/`:
- `empty-state.tsx` — Icon + title + description + optional CTA
- `loading-state.tsx` — Skeleton variants: table (default), cards, detail
- `error-state.tsx` — Error display with optional retry button

### Layer 5 — Data Display

`src/components/data-display/`:
- `data-table.tsx` — TanStack Table wrapper: sort, filter, search, pagination
- `data-table-shell.tsx` — Raw table container for custom table implementations
- `filter-bar.tsx` — Composite search + filter dropdown toolbar

### Layer 6 — Document Components

`src/components/documents/`:
- `document-card.tsx` — File card with type, version, uploader, download, delete actions

---

## Configuration Files Added

| File | Purpose |
|------|---------|
| `components.json` | shadcn/ui project config (style, CSS variables, alias) |
| `eslint.config.js` | ESLint v10 flat config with TypeScript + React Hooks rules |
| `tsconfig.app.json` | Added `baseUrl: "."`, `paths: { "@/*": ["./src/*"] }` |
| `vite.config.ts` | Added `resolve.alias: { "@": "./src" }` |
| `tailwind.config.js` | Added `darkMode: ["class"]`, shadcn/ui CSS variable tokens, accordion keyframes, `tailwindcss-animate` |
| `src/styles/index.css` | Added shadcn/ui CSS variable definitions (`:root` block) |
| `src/lib/utils.ts` | Upgraded `cn()` from simple join to `clsx` + `tailwind-merge` |

---

## Dependencies Installed

All MIT licensed:

| Package | Purpose |
|---------|---------|
| `class-variance-authority` | CVA — component variant management |
| `clsx` | Class name utility |
| `tailwind-merge` | Safe Tailwind class merging |
| `tailwindcss-animate` | Tailwind animation plugin (shadcn/ui animations) |
| `@radix-ui/react-*` | Radix UI headless primitives |
| `@tanstack/react-table` | DataTable engine |
| `react-hook-form` | Form state management |
| `zod` | Schema validation |
| `@hookform/resolvers` | zod/yup resolvers for react-hook-form |

Dev dependencies:
- `eslint`, `@eslint/js`, `globals`, `typescript-eslint`
- `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

---

## What Was NOT Done (Out of Scope for Step 5A)

- No existing pages were modified
- No Supabase queries were changed
- No migrations were created
- No RBAC changes were made
- No business logic was changed
- No existing component was deleted
