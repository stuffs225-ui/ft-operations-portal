# 13 — Full Critical System Audit (Workflow-First)
**Audit date:** 2026-07-11 · **Baseline:** `main` @ 23fd6bc (post PR #168) · **Predecessor:** audit docs 00–12 (2026-06-13)

**Mandate (owner's words):** analyze the whole system critically, surface every workflow
problem, hide nothing — "even if the whole system is wrong, say so."

---

## 0. The honest verdict first

The system is **not** all wrong. The security/governance foundation (10 roles, RLS,
101 migrations, DB guards 061/076/077/078/086–095) is genuinely solid — better than most
internal tools. **The core defect is different: this is an *approvals* system that has not
yet become an *execution* system.** It models "who may create/approve what" very well, and
models "what actually happens after approval — delivery batches, invoicing truth, chasing,
alerts" weakly or not at all. That is exactly why the operations team still lives in the
Excel workbook.

Three subsystems need decisive surgery (not cosmetic fixes). Nothing needs a full rewrite.

---

## 1. CRITICAL — workflow-breaking defects

### C1. The project lifecycle dead-ends at `approved` — projects can never finish
`project_status` enum: `draft → submitted_for_approval → approved / rejected /
sent_back_for_revision → active → completed → cancelled`. The **only** transitions the UI
ever performs are approve / send back / reject (`src/pages/ProjectDetail.tsx:225–322`).
**No screen anywhere sets `active`, `completed`, or `cancelled`.** Consequences:
- A Sales Order approved in 2024 still says "approved" today. There is no closure, no
  "in execution", no cancellation path. Three enum values are unreachable dead code.
- Every downstream module (factory %, store receipts, QC, AFS delivery) advances
  independently while the SO record itself never changes state — the one field that
  should summarize a project's life is frozen on day one.

### C2. RLS makes executing/finished projects INVISIBLE to the people executing them
`can_read_project()` (`supabase/migrations/013_project_rls.sql:29–32`) grants
sales_coordinator / procurement / factory / store / QC / AFS / viewer access **only when
`project_status = 'approved'`**. Same pattern in the vehicle-lines policy
(`010_project_vehicle_lines.sql:74–88`). So the moment anything (an import, a future
lifecycle feature, a manual SQL fix) moves a project to `active` or `completed`, it
**vanishes for every operational role**.

**Immediate collision:** the 2026 plan import (PR #169) creates 25 `active` + 15
`completed` projects — under today's RLS the entire imported book is invisible to
procurement/store/factory/QC/AFS. **This must be fixed before (or together with) running
the import**: one small supervised migration widening the readable statuses to
`('approved','active','completed')` for operational roles (write rules unchanged).

### C3. The Action Inbox — the "what must I do now" page — is fake
`src/pages/ActionInbox.tsx` renders `mockOrEmpty(...)` only and **never queries
Supabase**. In production it is permanently empty. The one page meant to drive daily work
across all 10 roles does nothing. (Same mock-only status: `ReportsProjects`,
`ReportsProcurement`, `ReportsStore`, `ReportsSuppliers`, `AdminNotificationRules`,
`AdminReportSubscriptionDetail`.)

### C4. Notifications exist as furniture — nothing ever sends one
`src/lib/notifications.ts:86` has a working insert helper with **zero callers** anywhere
in the app. Approvals, send-backs, QC failures, PO approvals, delivery events — none
create a notification. The bell icon and Notifications page are an empty shell; the
Admin "notification rules" page is mock-only. Every hand-off in the workflow is silent:
people must *poll* screens to discover work (and per C3, the inbox they'd poll is fake).

### C5. SLA is a data model without an engine
`sla_rules` / `sla_events` tables (051/052) exist; `quotationSla.ts` computes overdue
client-side for quotations only. **Nothing in the codebase ever writes `sla_events`**, and
there is no scheduler (no cron, no edge function, no Inngest). Escalation, breach history,
and SLA reporting are structurally impossible today. (Known since the June audit — R-02 —
still open; nothing moved.)

---

## 2. HIGH — financial-truth risks

### H1. Three parallel "financial truths" that never reconcile
1. `project_invoicing_plans` + `project_invoice_milestones` (069) → `ProjectInvoicing.tsx`
2. `project_invoicing_schedule` (100) → `AdminInvoicingSchedule.tsx`, Sales dashboard
3. `receivables_aging_view` (070)

Nothing synchronizes them. A milestone can be `paid` while the schedule line sits
`scheduled`; the aging view aggregates its own way. "How much is invoiced / pending for
project X?" has up to three different answers depending on the screen. **Decision
required: crown ONE source (recommendation: the schedule, 100) and demote/derive the
others.** The 2026 import writes only the schedule — widening the divergence for imported
projects.

### H2. VAT semantics are inconsistent across money fields
Post-#167: wizard `total_sales_value` = **VAT-inclusive**; `line_total_value` = **NET**
(trigger 010); schedule amounts = whatever was entered (import = NET sheet numbers);
milestones = free-entry. Any report that sums or compares these mixes gross and net
silently. Migration 100's own diagnostic (`total_sales_value` vs Σ schedule) will now
flag *every* imported VAT project as a variance. Needed: a single documented convention +
derived views exposing `net / vat / gross` explicitly per project.

### H3. Customers are free text — per-customer truth is impossible
A customer master exists (079) but `ProjectNew` / `QuotationNew` don't reference it:
`customer_name` is typed by hand. The real book already contains variants ("Afras",
"Afras - Custom project", "AFRAS - SEAFTY", "SRCA", "SRCA - Ambulances"). Receivables by
customer, customer history, sector-by-customer — all permanently broken until forms bind
to the master table (B-026, still open since June).

### H4. Expected Delay Penalty is a dead-end field
Entered by ops (#167), displayed on the Commercial tab — and never used again. Nothing
compares expected vs actual delivery, nothing computes exposure (the Excel literally
tracks "Penalty (Safe / Applied / Critical)" per order), no report, no alert. As shipped,
it's a sticky note with a percent sign.

### H5. PO numbers live in two disjoint places
Imported projects: `PO#: …` inside `notes` (deliberate — number-requires-PDF rule).
New projects: `neg_po_number` + mandatory PDF. Until a backfill pass attaches the PDFs
and promotes the numbers, any "which projects have a customer PO?" query misses the
imported majority. Needs an explicit post-import backfill task, not just a doc note.

---

## 3. MEDIUM — the system ≠ the company's real workflow (the Excel gap)

This is the deepest product finding. The workbook the team actually manages by contains,
per order: **monthly delivered-unit counts, FAT-readiness dates, chassis/purchase ETA
chains, JED vs Dubai vs Purchase routing, penalty risk states, and multi-batch contract
deliveries** ("3 units Dec + 3 Feb + 3 Apr"). The portal's model of the same reality:

| Excel reality | Portal today |
|---|---|
| Delivery in dated batches per line | one `customer_delivery_date` per project |
| Delivered counts per month | nothing (only store/vehicle receipts, not per-line delivery) |
| FAT readiness / ETA chain (Dubai → JED → site) | `dubai_project_followups` (thin), free-text remarks |
| Routing: Dubai / JED / Dubai-JED / Purchase | enum `saudi / dubai / not_set` only |
| Penalty risk (Safe / Applied / Critical) + amount | one static expected % (H4) |
| 2027 spillover amounts | not representable (import flagged & skipped them) |

Until delivery batches + per-line delivered tracking exist, **the Excel cannot die** —
the team will keep dual-entering, and the portal will drift stale. Recommended shape: a
`project_line_deliveries` table (line_id, batch qty, contractual date, actual date,
FAT date) + roll-ups; extend the location enum; wire penalty status from actual vs
contractual batch dates. That single cluster converts the portal from "approval記録" to
the team's daily tool.

Also medium:
- **M4.** Sector/penalty editable only at creation/detail-card level — no bulk/admin edit
  for the 19 imported projects without sector.
- **M5.** 56 pages still use `mockOrEmpty` (live mode → silently empty rather than
  wrong — acceptable pattern, but 7 of them are mock-ONLY, see C3).
- **M6.** Single-role model (`user_roles.user_id` unique) — no ops+admin combos; and the
  10 salesmen launch with one shared password and **no forced-password-change flow**.
- **M7.** No pagination anywhere (`Projects.tsx:92` fetches `select('*')` of the world) —
  fine at 41 projects, degrades at thousands of rows; 31 `.limit/.range` across 307
  selects.

---

## 4. LOW — tech debt (real, not urgent)

| # | Item | Evidence |
|---|---|---|
| L1 | Two parallel component systems (Button/Badge/Card/PageHeader/EmptyState × 2 + shadcn primitives) — the Phase-1 design-tokens plan exists but was never executed | `src/components/ui/*` vs `ui/primitives/*` vs `common/*` |
| L2 | Main bundle 524 KB (was 464 KB at the June audit — growing, no manualChunks) | build output |
| L3 | `.nvmrc` pins Node 20 while CI enforces Node 24 — permanent drift trap (bit us in PR #161/#162) | `.nvmrc` |
| L4 | Lint baseline tolerates 55 problems incl. 18 `{}`-type errors in `database.ts` | `npm run lint` |
| L5 | Zero unit tests — business math (VAT, penalty %, SLA due dates) untested; only E2E seeder + Playwright | repo |
| L6 | Staging/production separation is env-var discipline (`E2E_NON_PRODUCTION_HOSTS`), not separate projects | tools/e2e, tools/import |
| L7 | `MOCK_QUOTATIONS` still imported by live `Quotations.tsx` (gated, but ships in bundle — B-050 open) | `src/pages/Quotations.tsx` |

---

## 5. Improve vs Replace — the explicit call

| Subsystem | Verdict | Why |
|---|---|---|
| Auth / roles / RLS foundation | **Keep** (one surgical fix: C2) | Well built, dual-layer guards proven |
| Quotation module (gates 086–088) | **Keep** | Strongest module in the system |
| Project (SO) lifecycle | **Improve decisively** — add active/complete/cancel transitions + RLS widening + closure rules | C1+C2; small, high-leverage |
| Invoicing (3 systems) | **Replace 2 with 1** — schedule (100) becomes the only source; milestones become a view or are migrated then dropped | H1/H2 unfixable by patching |
| Action Inbox / Notifications / SLA | **Replace the stubs with a real engine** — one event → notification + inbox item + SLA timer pipeline (DB triggers or scheduled edge function). Current code is scaffolding, not a base | C3+C4+C5 |
| Delivery execution (batches/FAT/ETA) | **Build new** (doesn't exist) — this is what retires the Excel | §3 |
| Reports (6 mock pages) | **Rewrite queries page-by-page** onto live data or delete the pages — a fake report is worse than none | C3/M5 |
| Customer identity | **Improve**: bind forms to customer master + one-time dedupe of existing names | H3 |
| UI component layer | **Consolidate later** via the existing Phase-1 plan — cosmetic, don't let it jump the queue | L1 |

## 6. Recommended sequence (each = one reviewable PR)

1. **Unblock now:** resolve the #168/#169 duplicate-importer conflict (one importer
   survives); apply migrations 099–101.
2. **RLS + lifecycle mini-migration (102):** widen `can_read_project`/line policy to
   `('approved','active','completed')`; add UI transitions approve→active→completed (+
   cancel, admin/ops-gated, reason required). *Must land before the real import runs.*
3. Run the 2026 import (accounts → dry-run → run → validate) — after step 2.
4. **One financial truth:** reconcile schedule vs milestones (pick schedule), add
   net/vat/gross view, fix the variance the import will create.
5. **Signal engine v1:** DB triggers emit `notifications` + inbox rows on the 8 core
   events (submitted, approved, sent back, PO pending approval, QC fail, NCR, release
   note, invoice due); nightly scheduled function writes `sla_events`.
6. **Delivery batches module** (§3) — the Excel-killer.
7. Customer master binding + dedupe; sector/penalty bulk-edit for imported rows.
8. Reports rewrite (live queries) or removal; then the design-system Phase-1 plan.

---
*Method: every finding above was verified in-code this session (file:line cited).
Predecessor-audit items were re-tested — fixed ones (ESLint config, release-note gate 076,
serial gate 077, SO checks 078, Control Tower live wiring) are deliberately absent here.*
