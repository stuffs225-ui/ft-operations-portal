# 00 — Architecture Cleanup Executive Summary

**Document:** Step 4C — Architecture Cleanup and Code Structure Review  
**Branch:** `audit/architecture-cleanup-review`  
**Date:** 2026-06-13  
**Status:** Assessment complete — no production code changed

---

## Overall Architecture Health: YELLOW — Structurally Sound, Strategically Incomplete

The FT Operations Portal has a **solid technical foundation** (TypeScript + React 18 + Supabase + Vite) with zero compiler errors and a clean production build. The core infrastructure is production-grade. However, the application is architecturally incomplete in four critical areas:

1. **Mock data is the primary data source for ~50% of pages in live Supabase mode** — reports, Control Tower, AFS module, factory module, custody, and several other modules show empty or mock data in production.
2. **Business logic is distributed inconsistently** across UI components, lib utilities, and DB triggers with no service layer to normalize it.
3. **TypeScript types have not been updated** to reflect migrations 076–080 (customer_id, audit trigger fields, release note gate status).
4. **The design system is a collection of one-off custom components** with no shadcn/ui foundation, making every new screen more expensive to build than it should be.

The Step 4A and 4B migrations (076–080) have addressed the two most critical governance guardrails at the DB level. The code architecture is now the limiting factor before Phase 1 implementation begins.

---

## Architecture Scorecard

| Area | Health | Risk | Phase to Fix |
|------|--------|------|--------------|
| TypeScript build | ✅ Zero errors | None | — |
| DB schema (post-076–080) | ✅ Core governance enforced | Low | — |
| Folder structure | ⚠️ Flat — no feature boundaries | Medium | Phase 1 |
| Large file complexity | 🔴 ProjectDetail 1,829 lines | High | Phase 2 |
| Type/schema alignment | ⚠️ 5 gaps from migrations 076–080 | Medium | Phase 1 |
| Mock/live data separation | 🔴 ~50% pages are mock-only in live mode | Critical | Phase 2 + Phase 10 |
| Business logic placement | ⚠️ Mixed UI/lib/DB with no service layer | Medium | Phase 1–2 |
| RBAC wiring | ⚠️ `PERMISSION_KEYS` defined but not consumed | Medium | Phase 1 |
| Design system | 🔴 No shadcn/ui; fully custom components | High | Phase 1 (Step 5) |
| Test coverage | 🔴 Zero automated tests | Critical | Phase 1 |
| ESLint config | 🔴 `eslint.config.js` missing (B-005) | High | Phase 1 |

---

## Biggest Risks (Priority Order)

### Risk 1 — ~50% of Pages Show No Data in Live Supabase Mode (CRITICAL)
`mockOrEmpty()` is called 96 times across 40+ page files. In live mode these all return empty arrays. Reports, Control Tower, AFS, factory workspace summary, action inbox, dashboard KPI cards, and more show nothing to real users. This is the highest UX risk in the system.

### Risk 2 — `ProjectDetail.tsx` is 1,829 Lines (HIGH)
The largest page in the system mixes data fetching (11 direct Supabase calls), business logic (WO/PN gate evaluation, approval state), and UI rendering in one file. Any change to this file risks breaking project core functionality.

### Risk 3 — No Service Layer — Supabase SDK Calls Scattered in Pages (HIGH)
Direct `supabase.from()` calls exist inside page components. ProjectDetail alone has 11 direct Supabase queries. This makes queries impossible to reuse, test, or cache without touching every page.

### Risk 4 — TypeScript `Project` Type Missing `customer_id` (MEDIUM)
Migration 079 added `customer_id uuid` to the `projects` table. The `Project` interface in `src/types/index.ts` does not include this field. Any code that serializes/deserializes projects from Supabase will silently drop the new field.

### Risk 5 — `MOCK_CURRENT_USER` in `roles.ts` (LOW but confusing)
A legacy mock constant `MOCK_CURRENT_USER` exists in `src/lib/roles.ts`. It is never consumed by any component (auth flows use `AuthContext`). It is dead code that creates confusion for new developers.

### Risk 6 — Mock Data Files in Production Bundle (MEDIUM)
`mockStore.js` (24 KB), `mockReports.js` (28 KB), and `mockQuotations.js` (23 KB) are shipped as named chunks in the production bundle. While `mockOrEmpty()` returns `[]` in live mode, these files are still downloaded. Main bundle is 464 KB — oversized.

### Risk 7 — Zero Tests (CRITICAL for Implementation Phases)
No unit tests, integration tests, or end-to-end tests exist. Every Phase 1–10 implementation is untested. The first regression could be silent. Before Phase 1 ships any code to production, a testing baseline must be established.

---

## Safest Cleanup Order

This is the recommended sequence for architectural cleanup before or during Phase 1 implementation:

### Immediate (Pre-Phase 1, Documentation + Types Only)

| Priority | Action | Risk | Files |
|----------|--------|------|-------|
| 1 | Add `customer_id` to `Project` type | Zero — additive only | `src/types/index.ts` |
| 2 | Add `Customer` interface to `src/types/index.ts` | Zero — new type | `src/types/index.ts` |
| 3 | Add `before_data`/`after_data` to `AuditLog` type | Zero — additive only | `src/types/index.ts` |
| 4 | Remove `MOCK_CURRENT_USER` from `roles.ts` | Minimal — unused | `src/lib/roles.ts` |
| 5 | Add `eslint.config.js` (B-005) | None — config only | new file |

### Phase 1 Foundation (During Phase 1 Implementation)

| Priority | Action | Risk |
|----------|--------|------|
| 6 | Create `src/services/` layer — extract Supabase calls from pages | Medium (requires page changes) |
| 7 | Create `src/features/` folder structure | Low — organizational |
| 8 | Install shadcn/ui, create component library | Low — additive |
| 9 | Exclude mock data files from production bundle (B-050) | Low — Vite config |

### Phase 2+ (During Module Implementation)

| Priority | Action | Risk |
|----------|--------|------|
| 10 | Decompose `ProjectDetail.tsx` into tab sub-components | High — requires testing |
| 11 | Wire `mockOrEmpty` pages to live Supabase queries | High — per-module |
| 12 | Wire `PERMISSION_KEYS` into `RequireRole` and action guards | Medium |

---

## What Not to Touch Yet

The following must remain unchanged until the corresponding implementation phase is ready:

| Item | Reason |
|------|--------|
| `src/lib/executionGate.ts` | WO/PN gate logic is correct and tested; do not refactor before Phase 4 |
| `src/context/AuthContext.tsx` | Auth works correctly; touching it risks breaking auth for all users |
| `src/app/App.tsx` | Route structure is complete; adding routes is fine, restructuring is not |
| All existing `supabase/migrations/` | Immutable; never edit applied migrations |
| `src/components/auth/RequireRole.tsx` | Role enforcement works; extend it in Phase 1 but do not break the current guard |
| `src/lib/dataMode.ts` | The `mockOrEmpty()` pattern is architecturally sound; only the callers need updating |

---

## Recommended Next Steps

| Step | Name | Content |
|------|------|---------|
| **Step 5** | Design System Setup | Install shadcn/ui, create component library, define status badges, DataTable, Form, Dialog patterns |
| **Phase 1** | Foundation Implementation | ESLint config, type updates, service layer, RBAC wiring, customer master data UI |
| **Phase 2** | Core Workflow | SO registration wizard, approval flow, audit log UI, sales workspace live query |

**Step 5 (Design System) should begin immediately after this review is reviewed and approved.**

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compile | `npx tsc --noEmit` | ✅ Zero errors |
| Vite production build | `npm run build` | ✅ 1,783 modules, 5.30s, clean |
| ESLint | `npm run lint` | ⚠️ Pre-existing B-005: `eslint.config.js` missing |

**No production code was modified in this step.**
