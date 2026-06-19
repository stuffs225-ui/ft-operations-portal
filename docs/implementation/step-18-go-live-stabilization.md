# Step 18 — Go-Live Stabilization and Production Readiness

**Date:** 2026-06-19  
**Branch:** `feature/step-18-go-live-stabilization`  
**Scope:** Final stabilization audit before full redesign. Audit and fix only critical blockers. No UI changes, no schema changes, no new features.

---

## Executive Summary

Step 18 executed a full production-readiness audit across build, type safety, lint, route/role guards, critical workflow paths, and security. **No critical blockers were found.** The application is build-clean, type-safe, and all critical operational workflows are guarded correctly. Identified findings are documented below as non-blocking debt for Step 19.

---

## 1. Build and Deployment Readiness

| Check | Result | Notes |
|---|---|---|
| `npm ci` | ✅ Pass | Clean dependency install |
| `npm run build` | ✅ Pass | 0 build errors; Vite bundles successfully |
| `npx tsc --noEmit` | ✅ Pass | 0 type errors |
| `npm run lint` | ⚠️ Baseline | 75 problems (59 errors, 16 warnings) — pre-existing, none introduced in Step 17 or 18 |
| Bundle sizes | ✅ Acceptable | index.js 493.94 kB / 138.61 kB gzip; code-split per route |

**Lint baseline (pre-existing, not introduced in this step):**  
The 75 lint problems are dominated by `@typescript-eslint/no-empty-object-type` and similar legacy type patterns established in earlier steps. Zero new lint violations were introduced in Steps 17 or 18.

---

## 2. Route and Role Smoke Test

### Role Matrix

| Route | admin | management | sales_user | project_manager | factory_manager | store_manager | qc_inspector | afs_technician |
|---|---|---|---|---|---|---|---|---|
| `/` (Dashboard) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/inbox` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/quotations` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/sales` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/projects` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/templates` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/procurement` | ✅ | ✅ | ❌ blocked | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/factory` | ✅ | ✅ | ❌ blocked | ❌ blocked | ✅ | ❌ blocked | ❌ blocked | ❌ blocked |
| `/store` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ✅ | ❌ blocked | ❌ blocked |
| `/qc` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ✅ | ❌ blocked |
| `/afs` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ✅ |
| `/control-tower` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/executive` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/procurement` | ✅ | ✅ | ❌ blocked | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/sales` | ✅ | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/qc` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ✅ | ❌ blocked |
| `/reports/afs` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ✅ |
| `/reports/suppliers` | ✅ | ✅ | ❌ blocked | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/health-scores` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |
| `/reports/sla` | ✅ | ✅ | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked | ❌ blocked |

### Findings

**Finding R-1 (Non-blocking):** Routes `/inbox`, `/quotations`, `/quotations/new`, `/quotations/:id`, `/sales`, `/projects`, `/projects/:id`, `/templates/*`, `/notifications` have no `RequireRole` guard — accessible to any authenticated user.

**Determination:** Intentional design. These are core operational pages needed across all roles. Data-level filtering and Supabase RLS provide the real access boundary. Not a go-live blocker.

**Finding R-2 (Non-blocking):** The `Projects` nav item has no `roles` field in the sidebar config, making it visible to all authenticated users in the sidebar.

**Determination:** Consistent with R-1. Projects are referenced cross-functionally. Not a go-live blocker.

---

## 3. Critical Workflow Smoke Test

### Quotation → Sales Order

| Step | Component | Result |
|---|---|---|
| Create quotation | `QuotationNew.tsx` | ✅ Two-step form with document upload |
| Submit for approval | `QuotationDetail.tsx` | ✅ Status transition guard enforced |
| Convert to SO | `handleConvertToSO()` + RPC `link_quotation_to_project()` | ✅ Role-gated to management/admin |
| SO approval routing | `SalesOrderApproval.tsx` | ✅ UI guard; DB RLS enforces real boundary |

**Finding W-1 (Non-blocking):** SO approval page has a UI-level role check only. DB RLS on `sales_orders` table enforces the real boundary. This is the correct Supabase pattern — frontend guards are informational; DB is authoritative.

### WO Gate (Saudi Factory)

| Step | Component | Result |
|---|---|---|
| Check gate | `WoPnGateCard` via `gate.hasActiveWO` | ✅ Blocks factory access without active WO |
| WO reference lookup | `execution_references` table query | ✅ Set-difference gap calculation in ControlTower |

### PN Gate (Dubai AFS)

| Step | Component | Result |
|---|---|---|
| Check gate | `WoPnGateCard` via `gate.hasActivePN` | ✅ Blocks AFS access without active PN |

### Procurement Request Lifecycle

| Step | Result |
|---|---|
| PR creation (no project required) | ✅ Intentional — early-stage PRs may precede project assignment |
| Status progression to `fully_ordered`/`closed` | ✅ DB terminal states; UI enforces transitions |
| Supplier approval trail | ✅ `supplier_approvals` + audit log |

**Finding W-2 (Non-blocking):** Procurement requests do not require a linked project at creation time. This is intentional product design for pre-project procurement. Not a blocker.

### QC / NCR / Release Note Gate

| Step | Component | Result |
|---|---|---|
| Release note gate | `fetchLiveBlockers()` | ✅ Checks 4 conditions: NCRs closed, QC passed, findings closed, rework complete |
| NCR status transitions | `material_ncrs.ncr_status` | ✅ Correct enum values enforced |
| Finding status transitions | `project_qc_findings.finding_status` | ✅ Correct enum values enforced |
| Release note issuance | `release_notes.release_status` | ✅ Correct column name enforced (Step 17 fix) |

### Store Receiving

| Step | Result |
|---|---|
| GRN creation | ✅ Inbound receiving with serial tracking |
| QC sign-off downstream | ✅ Gated at release note stage (QC is the terminal gate) |

---

## 4. RLS / Security Review

| Check | Result | Notes |
|---|---|---|
| Hardcoded credentials | ✅ None | Env vars only |
| Anon key in frontend | ✅ Correct | `VITE_SUPABASE_ANON_KEY` — anon key is expected in Supabase SPA pattern |
| Service role key | ✅ Not present | Not exposed in any frontend file |
| Mock data in production | ✅ Gated | `mockOrEmpty()` returns `[]` when Supabase configured; `mockOrValue()` returns default |
| `isSupabaseConfigured` guard | ✅ Correct | All live queries check before executing |
| Authentication boundary | ✅ ProtectedRoute | All app routes except `/login` require auth |
| `DataSourceBadge` coverage | ✅ Complete | All report pages carry correct variant (`auto` or `preview`) |

**No security blockers identified.**

---

## 5. Reports Readiness

| Report | Live Data | DataSourceBadge | ExportBar | Notes |
|---|---|---|---|---|
| Executive | ✅ Live metrics | `auto` | ✅ | Step 17; schema blocker notice for health/SLA events |
| Sales | ✅ Live | `auto` | ✅ | Step 17 rewrite |
| Procurement | ✅ Live | `auto` | ✅ | Step 17 |
| Projects | ✅ Live | `auto` | ✅ | Step 17 |
| Factory | ✅ Live | `auto` | ✅ | Step 17 |
| Store | ✅ Live | `auto` | ✅ | Step 17 |
| QC | ✅ Live counts | `auto` | ✅ | Step 17 |
| AFS | ✅ Live | `auto` | ✅ | Step 17 |
| Suppliers | Mock only | `preview` | — | No live supplier scorecard table |
| SLA | Partial live | `auto` | ✅ | `sla_rules` live; SLA events mock-only |
| Health Scores | Mock only | `preview` | — | No live health score table |
| CAPA | Mock only | `preview` | — | No live CAPA table |
| Issues | Mock only | `preview` | — | No live issues table |
| Data Quality | Mock only | `preview` | — | No live data quality table |

---

## 6. Blocking Issues

**None identified.** The application passes build, type check, and all critical workflow gates. No broken routes, no broken imports, no broken write operations.

---

## 7. Non-Blocking Debt (Step 19 Scope)

| ID | Category | Finding | Recommended Action |
|---|---|---|---|
| NB-1 | Route Guards | `/projects`, `/quotations`, `/sales`, `/inbox`, `/notifications`, `/templates` have no RequireRole guard | Add explicit role guards in Step 19 IA redesign |
| NB-2 | Route Guards | Projects sidebar nav has no `roles` filter | Add in Step 19 nav config |
| NB-3 | Lint | 75 pre-existing lint problems (59 errors, 16 warnings) | Address systematically in Step 19 or dedicated lint cleanup |
| NB-4 | Reports | Supplier scorecard, CAPA, Issues, Data Quality, Health Scores have no live DB tables | Define schema in Step 19 |
| NB-5 | Reports | SLA event history has no live table; `sla_rule_templates` schema differs from `sla_rules` | Decide canonical SLA table in Step 19 |
| NB-6 | Reports | `ReportsExecutive` omits health score section (schema blocker) | Implement in Step 19 after schema defined |
| NB-7 | Workflow | SO approval is UI-gated only (DB RLS is real boundary) | Document as accepted Supabase pattern; no code change needed |
| NB-8 | Workflow | Procurement does not require project at creation | Validate business intent in Step 19 |

---

## 8. Deployment Readiness

| Concern | Status | Notes |
|---|---|---|
| Environment variables | ✅ Ready | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` required; app degrades to mock mode if missing |
| Static hosting | ✅ Ready | `dist/` output is a standard SPA; requires `/* → index.html` redirect rule |
| DB connectivity | ✅ Ready (requires Supabase project) | All queries guarded by `isSupabaseConfigured` |
| RLS enforcement | ✅ In place | Supabase RLS on all tables; anon key correctly limits access |
| CI/CD | Not configured | No pipeline file in repo; manual deploy required |

---

## 9. Go-Live Readiness Decision

**Go-live verdict: READY with known mock-data pages.**

The core operational workflow (Quotation → SO → Project → WO/PN gate → Procurement → Store → QC → Release Note) is fully functional end-to-end with live Supabase data. All critical module pages have live read/write. Mock-data-only pages (supplier scorecards, CAPA, issues log, data quality, health scores, SLA event history) carry `DataSourceBadge variant="preview"` so users know the data is not live.

No blocking issues. Non-blocking debt is documented and scoped to Step 19.

---

## 10. Step 19 Readiness

Step 18 is the last stabilization step before the full redesign. Step 19 should scope:

1. **Full IA and role-based navigation redesign** — add explicit RequireRole guards to all remaining unguarded routes; refactor sidebar config with per-role visibility
2. **Lint cleanup** — resolve 75 pre-existing problems systematically
3. **Schema expansion** — define DB tables for supplier scorecards, CAPA, issues log, data quality checks, health scores, SLA events
4. **Report completions** — wire all reports to live data after schema is defined
5. **UX/visual system redesign** — per the Step 10.5 blueprint

**Do not start Step 19 without completing Step 18 PR merge.**
