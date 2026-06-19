# Step 17 — Control Tower / SLA / Reports Full Closure

**Branch:** `feature/step-17-control-tower-sla-reports`
**Date:** 2026-06-19
**Lint baseline before:** 75 problems (59 errors, 16 warnings)
**Lint after:** 75 problems (59 errors, 16 warnings) — no change, no new issues

---

## Executive Summary

Built the final management layer for cross-module visibility, SLA monitoring, and report completeness.

1. **ControlTower.tsx** — Complete rewrite: 17+ parallel Supabase live queries, WO/PN gap calculation, overdue project table, department workload links, `PageLoader`, `DataSourceBadge variant="auto"`, `ReportExportBar`
2. **Dashboard.tsx** — Project summary strip wired with 8 live queries (was showing zeros in live mode)
3. **ReportsSales.tsx** — Converted from module-level mock constants to `useState/useEffect` live queries, `PageLoader`, `DataSourceBadge variant="auto"`
4. **ReportsExecutive.tsx** — Complete rewrite: 13 parallel live queries for lifecycle + delivery readiness, schema blocker notice for health/issues/SLA sections
5. **ReportsQC.tsx** — Added `DataSourceBadge`, `ReportExportBar`, live summary counts (NCRs, findings, release notes)
6. **ReportsSLA.tsx** — Added `DataSourceBadge`, live query for `sla_rules` table in SLA Rules tab
7. **10 remaining report pages** — Added `DataSourceBadge` (auto or preview) to all pages, removed amber dev-mode banners

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/ControlTower.tsx` | Complete rewrite — live Supabase queries, WO/PN gap, overdue table, export, DataSourceBadge |
| `src/pages/Dashboard.tsx` | Project summary strip live-wired (8 queries), corrected release_notes column names |
| `src/pages/ReportsSales.tsx` | useState/useEffect for quotations + projects, PageLoader, DataSourceBadge |
| `src/pages/ReportsExecutive.tsx` | Complete rewrite — 13 live queries, DataSourceBadge, schema blocker notice |
| `src/pages/ReportsQC.tsx` | Added DataSourceBadge, ReportExportBar, live summary counts via 4 queries |
| `src/pages/ReportsSLA.tsx` | Added DataSourceBadge, live `sla_rules` query for Rules tab |
| `src/pages/ReportsProcurement.tsx` | Added DataSourceBadge variant="auto", removed banner |
| `src/pages/ReportsFactory.tsx` | Added DataSourceBadge variant="auto", removed banner |
| `src/pages/ReportsAFS.tsx` | Changed DataSourceBadge variant from "preview" to "auto", removed banner |
| `src/pages/ReportsStore.tsx` | Added DataSourceBadge variant="auto", removed banner |
| `src/pages/ReportsProjects.tsx` | Added DataSourceBadge variant="auto", replaced "Export coming soon" button with ReportExportBar |
| `src/pages/ReportsHealthScores.tsx` | Added DataSourceBadge variant="preview" |
| `src/pages/ReportsSuppliers.tsx` | Added DataSourceBadge variant="preview", removed banner |
| `src/pages/ReportsCapa.tsx` | Added DataSourceBadge variant="preview" alongside existing action button |
| `src/pages/ReportsDataQuality.tsx` | Added DataSourceBadge variant="preview" |
| `src/pages/ReportsIssues.tsx` | Added DataSourceBadge variant="preview" alongside existing action button |

---

## Live Metrics Implemented

### ControlTower (17 parallel queries + sequential WO/PN gap)
- Total active projects (active + approved + submitted)
- Pending approval count
- Approved + active count
- Overdue projects (active status + delivery date < today)
- Missing WO: Saudi approved/active projects without active execution reference of type `wo`
- Missing PN: Dubai approved/active projects without active execution reference of type `pn`
- Open QC findings (`finding_status` in open/assigned/rework_in_progress/pending_reinspection)
- Critical open maintenance requests
- Open procurement requests
- Open material NCRs (`ncr_status` in open/assigned/corrective_action_in_progress/pending_evidence)
- Release notes issued, pending (draft), blocked
- Hot projects open pipeline
- Open quotation requests

### Dashboard Project Summary Strip (8 queries)
- Total active projects, Saudi count, Dubai count
- WO reference count, PN reference count
- In production (factory_records), In QC (project_qc_inspections active), Ready (release_notes issued)

### ReportsExecutive (13 queries, same pattern as ControlTower)
- Full lifecycle cards: total active, pending approval, approved, missing WO/PN, hot pipeline
- Delivery readiness: release notes issued, pending, blocked, open QC findings
- Critical exceptions auto-computed from live counts

### ReportsQC (4 count queries)
- Open NCRs, open findings, release notes pending, release notes issued

### ReportsSLA
- SLA Rules tab: live query from `sla_rules` table (note: `sla_rule_templates` has different schema)
- Open Breaches and All Events tabs remain mock-only (no `sla_events` table)

---

## Schema Findings (Blockers)

| Feature | Blocker | Disposition |
|---|---|---|
| SLA event tracking | No `sla_events` table (only `sla_rule_templates` with different schema) | Documented; Open Breaches/All Events tabs remain mock-only |
| Project health scores | No `project_health_scores` computed table | Documented; ReportsHealthScores remains mock-only with `variant="preview"` badge |
| Department health scores | No `department_health_scores` computed table | Same |
| Operational issues | No `operational_issues` table | Documented; ReportsIssues remains mock-only with `variant="preview"` badge |
| CAPA records | No `capa_records` table in schema | ReportsCapa remains mock-only with `variant="preview"` badge |
| Data quality checks | No `data_quality_checks` table | ReportsDataQuality remains mock-only with `variant="preview"` badge |

### Column Name Fixes Applied
Several Supabase queries in pre-existing code used incorrect column names based on mock type assumptions:
- `release_notes` — column is `release_status` (not `status`); valid values: `draft | blocked | ready_to_issue | issued | cancelled`
- `project_qc_findings` — column is `finding_status` (not `status`); valid values: `open | assigned | rework_in_progress | pending_reinspection | closed | cancelled`
- `material_ncrs` — valid `ncr_status` values: `open | assigned | corrective_action_in_progress | pending_evidence | closed | rejected_closure | cancelled` (not `in_progress` or `pending_closure`)
- `project_qc_inspections` — valid `inspection_status` values: `pending | in_progress | completed | cancelled` (not `pending_review`)
- `procurement_requests` — open status filter uses valid `PRStatus` values: `draft | pr_received | in_progress | partially_ordered`
- `sla_rule_templates` — has `trigger_event`, `required_action`, `sla_hours` (not `rule_name` etc.); the `sla_rules` table has the named-rule schema

---

## DataSourceBadge Coverage

| Page | Badge Variant | Rationale |
|---|---|---|
| ControlTower | auto | All metrics live |
| Dashboard | — | No badge (app homepage) |
| ReportsSales | auto | Live quotation + project queries |
| ReportsExecutive | auto | 13 live queries |
| ReportsQC | auto | Live summary counts + mock tables |
| ReportsSLA | auto | Rules tab live; events mock-only |
| ReportsProcurement | auto | Mock tables, live schema exists |
| ReportsFactory | auto | Mock tables, live schema exists |
| ReportsAFS | auto | Mock tables (mockOrEmpty → empty in live) |
| ReportsStore | auto | Mock tables, live schema exists |
| ReportsProjects | auto | Mock tables, live schema exists |
| ReportsHealthScores | preview | No live schema for health scores |
| ReportsSuppliers | preview | No live schema for supplier scorecards |
| ReportsCapa | preview | No live schema for CAPA records |
| ReportsDataQuality | preview | No live schema for data quality checks |
| ReportsIssues | preview | No live schema for operational issues |

---

## Export / Print Support

| Page | CSV Export | Print |
|---|---|---|
| ControlTower | ✅ Overdue projects export | `.report-print-root` pattern |
| ReportsSales | ✅ Quotations or projects per active tab | ✅ |
| ReportsQC | ✅ NCRs export | — |
| ReportsProcurement | ✅ Pre-existing | — |
| ReportsFactory | ✅ Pre-existing | — |
| ReportsProjects | ✅ Filtered project list | — |

---

## Role-Based Visibility

No route guard changes. ControlTower and ReportsExecutive show live counts aggregated at the system level (no per-user scoping — these are admin/ops_manager pages). DataSourceBadge shows "Live" or "Dev" to all users.

---

## DB / RLS / Migration Changes

**None.** No new migrations, no schema changes, no RLS changes.

---

## Governance Constraints Preserved

| Constraint | Status |
|---|---|
| Route paths unchanged | ✅ |
| Route guards unchanged | ✅ |
| Approval logic unchanged | ✅ |
| SO/WO/PN logic unchanged | ✅ |
| Non-sales modules unchanged | ✅ |
| No new dependencies | ✅ |

---

## Validation Results

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors |
| `npx tsc --noEmit` | ✅ 0 type errors |
| `npm run lint` | ✅ 75 problems — unchanged from baseline |
| Routes changed | ✅ None |
| Route guards changed | ✅ None |

---

## Remaining Non-Blocking Debt

| Item | Reason |
|---|---|
| SLA breach tracking | Requires `sla_events` table (per-event tracking) — not in current schema |
| Health score distribution | Requires computed `project_health_scores` / `department_health_scores` tables |
| Operational issues register | Requires `operational_issues` table |
| CAPA records | Requires `capa_records` table |
| AFS/Dubai report detail rows | Tables (dubai_followups, arrival_reports, etc.) exist in mock only — no live Supabase equivalents in current schema |
| Store report detail rows | Store receipt tables exist but live queries not wired in ReportsStore (empty in live mode) |
| Factory report detail rows | factory_records / factory_requirements exist but live queries not wired in ReportsFactory |
