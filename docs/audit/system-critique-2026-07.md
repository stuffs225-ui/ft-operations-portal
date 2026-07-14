# NAFFCO Operations Portal — Full System Critique & Remediation Plan

_Date: 2026-07-14 · Scope: whole app (138 pages, 131 routes, 10 roles, Supabase schema/RLS)_

This is a system-wide critique: **errors, contradictions, missing pieces, non-working
controls, and dead/fake buttons** — each with a concrete solution and a priority.
Findings are grouped by category. Items marked **✅ FIXED** were resolved in this
audit's PRs; items marked **▢ OPEN** are recommendations with an owner-ready fix.

---

## Method (how the audit was run)

Automated, repo-wide scans (not spot checks):

| Check | Command | Result |
|---|---|---|
| Empty click handlers | `onClick={() => {}}` etc. | **0 remaining** (all fixed) |
| Dead navigation | every `<Link to="…">` cross-checked vs the 131 defined routes | **0 dead links** |
| Stubs / placeholders | `TODO`/`FIXME`/`coming soon`/`not implemented` | 0 in routed code |
| Buttons with no action | 123 `<Button>` candidates parsed for `onClick`/`type=submit`/`<Link>` wrapper | all resolve to a real action |
| KPI row-cap undercount | dashboards counting via client `.filter()` on ≤1000-row fetches | Store fixed; QC/others use `head:true` counts |
| Enum/vocabulary drift | code status strings vs DB enums | Store QC handoff fixed |
| Hardcoded role badges | dashboards showing a fixed role label | Sales + Factory fixed |

**Headline:** the "dead/fake button" problem is effectively **solved** — the only
real dead controls that existed (Factory) were fixed and merged. The remaining work
is correctness hardening and UX polish, catalogued below.

---

## 1. Non-working controls / dead buttons

| # | Finding | Fix | Status |
|---|---|---|---|
| 1.1 | `FactorySendToQC` "Send to QC" was `onClick={() => {}}` — the page's primary action did nothing | Wired to transition `factory_records.production_status → 'sent_to_qc'` (RLS-scoped), with sending state + error surface | ✅ FIXED (PR #202) |
| 1.2 | `FactoryRawMaterialRequests` "View" button had no destination (no RMR detail route) | Removed the misleading button + its empty column; row already surfaces status/next-action/dates | ✅ FIXED (PR #202) |
| 1.3 | `PlaceholderPage.tsx` "Coming Soon" component — never routed, dead code | Removed | ✅ FIXED (this PR) |
| 1.4 | 5 submit validations use blocking browser `alert()` (functional but thread-blocking, non-enterprise UX): `MaterialQcInspectionDetail:132`, `ProjectQcFindingDetail:148-149`, `MaterialNcrDetail:128-129`, `AfterSalesMaintenanceDetail:184`, `AfterSalesMaintenanceNew:62,92` | Replace with an inline field/error state near the action | ▢ OPEN (next) |

## 2. Data-correctness errors (silently wrong, not visibly broken)

| # | Finding | Fix | Status |
|---|---|---|---|
| 2.1 | Unallocated store receipt "Assign to project" updated only `store_receipts.project_id`, never the `store_receipt_items.project_id` that custody/QC/serials/Project-Detail read — items stayed orphaned forever | Assign now updates receipt **and** items in sync | ✅ FIXED (PR #200) |
| 2.2 | QC Handoff Accepted/Rejected tabs filtered by `'pass'`/`'fail'`/`'conditional_pass'` — values that don't exist in the live `material_inspection_result_enum` — so both tabs were **always empty** in production | Rewrote to the real enum (`accepted`/`accepted_with_comments`/`rejected`) | ✅ FIXED (PR #200) |
| 2.3 | Store dashboard KPIs counted via client `.filter()` on ≤1000-row fetches — undercount once the store passes 1000 items | Converted to server-side `head:true` COUNT queries | ✅ FIXED (PR #200) |
| 2.4 | `store_receipt_items.Update` TS type omitted `project_id`/`project_vehicle_line_id` (blocked the 2.1 write) | Completed the generated type | ✅ FIXED (PR #200) |
| 2.5 | Sales broad-view targets queried the admin's own `sales_user_id` (always null) instead of summing all salesmen | Sum across all salesmen for broad view | ✅ FIXED (earlier) |

## 3. Contradictions & inconsistencies

| # | Finding | Fix | Status |
|---|---|---|---|
| 3.1 | Role badge hardcoded to one role for everyone: Sales showed "Sales User", Factory showed "Factory User" — even to admin/ops | Badge now reflects the actual role | ✅ FIXED (Sales earlier, Factory PR #202) |
| 3.2 | "My …" labels ("My Pipeline", "My Quotations", "My Invoicing Plan") shown to admin viewing all salesmen | Broad-view labels drop "My" | ✅ FIXED (earlier) |
| 3.3 | `Projects / SO` lived in a standalone sidebar section away from the rest of the commercial workflow | Relocated under Sales Workspace in SALES & COMMERCIAL; empty section auto-hides | ✅ FIXED (PR #201) |
| 3.4 | Two definitions of "unallocated" (receipt-level vs item-level project_id) diverged after assignment | Kept in sync by 2.1 | ✅ FIXED (PR #200) |

## 4. Missing capabilities (present in workflow, absent in UI)

| # | Finding | Fix | Status |
|---|---|---|---|
| 4.1 | No admin oversight console per role — admin saw the same pages as staff | Built per-role admin consoles: Sales (#198), Procurement (#199), Store (#200), Factory (#202) | ✅ 4/7 done |
| 4.2 | No salesman breakdown on Pipeline / Quotations / Collection for admin | Added salesman filter + column + open-first/closed-bottom sorting | ✅ FIXED (PR #201) |
| 4.3 | Invoicing plan could not be re-spread across months without editing each line | Double-click a project → monthly redistribution editor + carry-over, atomic RPC | ✅ FIXED (PR #201, migration 113) |
| 4.4 | QC and Dubai/AFS still have no dedicated admin console | Build `QcAdminConsole` + `AfsAdminConsole` (same pattern) | ▢ OPEN (next) |

## 5. UX / polish debt (works, could be better)

| # | Finding | Suggestion | Priority |
|---|---|---|---|
| 5.1 | 5 `alert()` dialogs (see 1.4) | Inline error state | High |
| 5.2 | Main bundle 531 kB + exceljs 940 kB in one chunk | `manualChunks` split exceljs/report libs; lazy-load the report/export path | Medium |
| 5.3 | Several list pages fetch with `.limit(300/500)` and count client-side | Where a KPI must be exact, use `head:true` counts (as QC/Store now do) | Medium |
| 5.4 | Mixed money formatting helpers across pages (`formatSAR`, `sar`, `sarK`) | Consolidate into one currency util | Low |

## 6. Governance / security (verified sound)

- **RLS not weakened** anywhere in this work; every new write rides existing policies.
- Admin-only RPCs (`split_…`, `redistribute_…`) re-check `user_roles.role = 'admin'`
  server-side (SECURITY DEFINER), not just in the UI.
- Suspended/inactive accounts are blocked at login (enforced earlier).
- Supervised migrations only — SQL is delivered in chat and applied manually; no
  auto-migration. Every deferred query degrades to empty/"migration pending" instead
  of a hard error.

---

## Prioritised remediation plan (open items only)

1. **P1 — `alert()` → inline errors** (5 files, §1.4/5.1). Small, contained, high polish.
2. **P1 — QC & AFS admin consoles** (§4.4). Same proven pattern as the other four.
3. **P2 — Bundle split** (§5.2). `manualChunks` for exceljs + report export.
4. **P2 — Exact counts on remaining list KPIs** (§5.3).
5. **P3 — Currency util consolidation** (§5.4).

Nothing in this plan requires weakening RLS, and only the redistribution feature
(already shipped) needed a migration (113). The system is structurally healthy —
this is hardening and completeness work, not rescue work.
