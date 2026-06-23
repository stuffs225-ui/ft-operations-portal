# Sales Dashboard v2 — Data Availability & Implementation Study

**Prepared:** 2026-06-23  
**Branch:** `claude/naffco-portal-modernization-a8gtg1`  
**Status:** Analysis only — no code changed, no migrations created  

---

## Part A — Current Sales Implementation

### Primary File

| File | Lines | Role |
|------|-------|------|
| `src/pages/Sales.tsx` | 573 | Sales workspace / My Work landing page for `sales_user`, `admin`, `operations_manager` |
| `src/pages/ProjectInvoicing.tsx` | ~400 | Per-project invoicing milestone management (separate page, not part of Sales dashboard) |

### Current Queries in `Sales.tsx`

```typescript
// Query 1 — Quotation Requests
supabase
  .from('quotation_requests')
  .select('id, quotation_status, project_name, customer_name, created_at, requested_by')
  .order('created_at', { ascending: false })

// Query 2 — Projects (SOs)
supabase
  .from('projects')
  .select('id, project_code, so_number, customer_name, project_status,
           total_sales_value, customer_delivery_date, sales_owner_id, created_at')
  .order('created_at', { ascending: false })
```

**Role filter applied after fetch:**
- `isBroadView` = `role in ('admin', 'operations_manager')` → sees all records
- `sales_user` → filtered client-side to `sales_owner_id = uid OR requested_by = uid`

### What the Current Dashboard Does NOT Query

- `hot_projects` — pipeline/opportunity stage; KPI shows hardcoded `0`
- `project_invoice_milestones` — milestone amounts / monthly schedule
- `project_invoicing_plans` — contract value per project
- `receivables_aging_view` — outstanding / aging data

### Current KPI Computation (Sales.tsx lines 121–143)

```typescript
const openQuotations = quotations.filter(q =>
  ['draft','submitted_by_sales','received_by_coordinator',
   'sent_to_estimation','waiting_for_estimation','quotation_received']
  .includes(q.quotation_status)
).length;

const returnedToSales    = quotations.filter(q => q.quotation_status === 'returned_to_sales').length;
const needClarification  = quotations.filter(q => q.quotation_status === 'need_clarification').length;
const openHotProjects    = 0;   // hot_projects not loaded — hardcoded
const approvedSOs        = projects.filter(p => ['approved','active'].includes(p.project_status)).length;
const atRisk             = projects.filter(p => p.project_status === 'sent_back_for_revision').length;
```

**"Projects At Risk" current definition:** `project_status = 'sent_back_for_revision'`  
→ This means "admin sent the SO back for revision", **not** commercial/delivery risk.  
→ v2 design likely intends delivery/invoicing risk. **This is a blocking clarification item** (see Part F).

---

## Part B — Database & Migration Audit

### Tables Used by v2 Design

#### `public.projects` (migration 009)

| Column | Type | Relevance |
|--------|------|-----------|
| `id` | uuid | PK |
| `project_status` | enum | Filter: approved/active = confirmed SO |
| `total_sales_value` | numeric(15,2) | Total Project Value KPI |
| `customer_delivery_date` | date | Delivery risk detection |
| `sales_owner_id` | uuid | Ownership filter for sales_user |
| `created_by` | uuid | Fallback ownership filter |
| `created_at` | timestamptz | YTD filter |

**Project status enum:** `draft → submitted_for_approval → sent_back_for_revision / approved → active → completed / cancelled / rejected`  
**Active SOs definition:** `project_status IN ('approved', 'active')` (excludes draft, rejected, cancelled)

**RLS (migration 009):**  
- admin/ops: full access  
- sales_user: own records where `sales_owner_id = auth.uid() OR created_by = auth.uid()`  
- sales_coordinator: SELECT all  
- viewer: SELECT all  

#### `public.hot_projects` (migration 068)

| Column | Type | Relevance |
|--------|------|-----------|
| `stage` | hot_project_stage enum | Pipeline filter |
| `estimated_value` | numeric(15,2) | Pipeline Value KPI |
| `probability` | int (0–100) | Weighted pipeline value |
| `sales_owner_id` | uuid | Ownership filter |
| `expected_close_date` | date | Pipeline timing |

**Pipeline stage enum:** `lead → qualified → proposal_required → quotation_requested → negotiation → won / lost / cancelled`  
**Active pipeline:** `stage NOT IN ('won', 'lost', 'cancelled')`  
**Weighted value formula:** `SUM(estimated_value * probability / 100.0)`

**RLS (migration 068):**  
- admin/ops: full access  
- sales_user: own records where `sales_owner_id = auth.uid() OR created_by = auth.uid()`  
- sales_coordinator: SELECT all  

#### `public.project_invoicing_plans` (migration 069)

| Column | Type | Relevance |
|--------|------|-----------|
| `project_id` | uuid | Join to projects |
| `total_contract_value` | numeric(15,2) | Contract value baseline |

One plan per project (UNIQUE constraint on project_id). Not all projects have a plan.

#### `public.project_invoice_milestones` (migration 069)

| Column | Type | Relevance |
|--------|------|-----------|
| `plan_id` | uuid | FK to invoicing plan |
| `project_id` | uuid | Direct FK to project |
| `milestone_status` | milestone_status enum | Status filter |
| `amount` | numeric(15,2) | Invoice amount |
| `due_date` | date | Month derivation (EXTRACT month) |
| `paid_amount` | numeric(15,2) | Actual received |
| `paid_at` | timestamptz | Payment date |

**Milestone status enum:** `planned → ready_to_invoice → submitted → approved → paid / overdue / cancelled`

**Critical definitions:**
- **Receivables Outstanding** (invoiced, not yet paid): `status IN ('submitted', 'approved', 'overdue')`  
- **Pending Invoicing / Unbilled**: `status IN ('planned', 'ready_to_invoice')`  
- **Paid YTD**: `status = 'paid' AND EXTRACT(year FROM paid_at) = EXTRACT(year FROM NOW())`

> `receivables_aging_view` (migration 070) combines **both** categories (all non-paid, non-cancelled milestones). It is NOT a pure receivables view. Do not use it as a label for "receivables only."

**Monthly schedule derivation:** No explicit month column. Requires:
```sql
SELECT EXTRACT(month FROM due_date)::int AS month,
       SUM(amount) AS planned_amount
FROM project_invoice_milestones
WHERE status != 'cancelled'
GROUP BY 1
ORDER BY 1;
```

**RLS (migration 069):**  
- admin/ops: full access  
- sales_user: own projects only (`created_by = auth.uid()` on joined `projects` table)  
- sales_coordinator/viewer: SELECT only  

#### `public.receivables_aging_view` (migration 070)

Pre-built SQL view. Joins `project_invoice_milestones + project_invoicing_plans + projects`.  
Adds `aging_bucket` (not_due / due_0_30 / due_31_60 / due_61_90 / due_90_plus) and `days_overdue`.  
**Scope:** All non-paid, non-cancelled milestones.  
Inherits RLS from base tables via `SECURITY INVOKER`.

### Tables That Do NOT Exist

> Searched all 98 migrations (`001` through `098`) for: `sales_targets`, `commercial_targets`, `forecast`, `budget`, `goal`, `target`, `achievement`.

| Expected Table | Migration Search Result |
|----------------|------------------------|
| `sales_targets` | **Not found** — does not exist |
| `invoicing_targets` | **Not found** — does not exist |
| `so_targets` | **Not found** — does not exist |
| `commercial_targets` | **Not found** — does not exist |
| Any budget/forecast table | **Not found** — does not exist |

Files that mention "target" in migrations: `051_sla_rules.sql`, `065_notifications.sql`, `084_approved_suppliers_rls_hardening.sql`, `086_quotation_status_transition_guard.sql`, `090_project_department_routing.sql`, `094_store_governance_hardening.sql` — none define a targets table.

**Conclusion:** Target-vs-actual KPIs (Invoicing Target, SO Target, % vs Target) require a new `sales_targets` table (Option 3 below) or must be removed from the v2 design.

---

## Part C — Metric Mapping Table

Legend for **Source** column:  
`EX` = Exists exactly as shown · `PARTIAL` = Data exists but needs transform/filter · `MISSING` = No data exists in schema · `BLOCKING` = Definition unclear, product decision required

| # | Metric (v2 Design) | Source Table(s) | Column(s) | Transform | Availability | Notes |
|---|-------------------|-----------------|-----------|-----------|--------------|-------|
| 1 | Number of Projects | `projects` | `id`, `project_status` | COUNT WHERE status IN ('approved','active','completed') | **EX** | Exclude draft/rejected/cancelled |
| 2 | Total Project Value | `projects` | `total_sales_value` | SUM WHERE status IN ('approved','active','completed') | **EX** | Numeric(15,2) |
| 3 | Number of Pipeline Projects | `hot_projects` | `id`, `stage` | COUNT WHERE stage NOT IN ('won','lost','cancelled') | **EX** | Not currently loaded in Sales.tsx |
| 4 | Total Pipeline Value | `hot_projects` | `estimated_value`, `probability` | SUM(estimated_value * probability / 100) OR SUM(estimated_value) — TBD | **EX** | Weighted vs unweighted: product decision |
| 5 | Projects At Risk | `projects` | `project_status`, `customer_delivery_date` | Definition unclear — see note | **BLOCKING** | Current = sent_back_for_revision; v2 likely = overdue delivery or overdue milestones |
| 6 | Receivables Outstanding | `project_invoice_milestones` | `amount`, `paid_amount`, `milestone_status` | SUM(amount - paid_amount) WHERE status IN ('submitted','approved','overdue') | **PARTIAL** | Must NOT use aging_view label — this is invoiced-but-unpaid only |
| 7 | Pending Invoicing (Unbilled) | `project_invoice_milestones` | `amount`, `milestone_status` | SUM(amount) WHERE status IN ('planned','ready_to_invoice') | **PARTIAL** | Separate KPI from #6 |
| 8 | Invoicing Plan — Jan amount | `project_invoice_milestones` | `amount`, `due_date` | SUM(amount) WHERE EXTRACT(month FROM due_date) = 1 | **PARTIAL** | No month column; must GROUP BY month |
| 9 | Invoicing Plan — Feb–Dec | `project_invoice_milestones` | `amount`, `due_date` | Same as #8 per month | **PARTIAL** | Same approach, 11 more columns |
| 10 | Invoicing Target — Monthly | *(none)* | — | — | **MISSING** | No targets table exists |
| 11 | Invoicing Up To Date (YTD Paid) | `project_invoice_milestones` | `paid_amount`, `paid_at` | SUM(paid_amount) WHERE EXTRACT(year FROM paid_at) = current_year | **EX** | Column name: `paid_amount`, date: `paid_at` |
| 12 | Invoicing Year Plan | `project_invoice_milestones` | `amount`, `due_date` | SUM(amount) WHERE EXTRACT(year FROM due_date) = current_year AND status != 'cancelled' | **PARTIAL** | Derivable as total scheduled for year — NOT a "target" |
| 13 | Expected Total Invoicing | `project_invoice_milestones` | `amount`, `milestone_status` | SUM(amount) WHERE status NOT IN ('cancelled','paid') | **EX** | All unbilled + all in-flight outstanding |
| 14 | % vs Target (Invoicing) | *(none)* | — | YTD paid ÷ invoicing target × 100 | **MISSING** | Requires target value from missing table |
| 15 | Actual % Invoiced of Year Plan | `project_invoice_milestones` | `paid_amount`, `amount`, `due_date` | SUM(paid_amount) ÷ SUM(amount WHERE year=current_year) | **PARTIAL** | Achievable without targets table — different KPI |
| 16 | SO Target | *(none)* | — | — | **MISSING** | No targets table |
| 17 | SO Achieved (Count / Value) | `projects` | `id`, `total_sales_value`, `project_status` | COUNT/SUM WHERE status IN ('approved','active','completed') AND EXTRACT(year FROM approved_at) = year | **EX** | `approved_at` column exists |
| 18 | SO Year Plan | *(none)* | — | — | **MISSING** | Not derivable without target |
| 19 | Total Expected SO (pipeline) | `hot_projects` | `estimated_value`, `probability` | SUM(estimated_value * probability/100) WHERE stage NOT IN ('won','lost','cancelled') | **EX** | Same as metric #4 |

**Summary:**
- **EX (exists):** 6 metrics (1, 2, 3, 11, 13, 17, 19) — 7 total  
- **PARTIAL (derivable):** 5 metrics (4, 6, 7, 8–9 group, 12, 15) — 5 total  
- **MISSING (no data):** 4 metrics (10, 14, 16, 18) — all target-based  
- **BLOCKING (unclear definition):** 1 metric (5 — Projects At Risk)

---

## Part D — TypeScript Type Proposals

### `SalesDashboardSummary`

```typescript
// Aggregated KPI summary returned by a single Supabase RPC or computed from parallel queries
export interface SalesDashboardSummary {
  // Projects / SOs
  projectCount: number;
  totalProjectValue: number;
  approvedSoCount: number;      // status IN ('approved','active')
  approvedSoValueYtd: number;   // approved_at in current year

  // Pipeline
  pipelineCount: number;
  pipelineValueTotal: number;   // SUM(estimated_value) — unweighted
  pipelineValueWeighted: number; // SUM(estimated_value * probability / 100)

  // Risk — definition TBD (see Part F)
  projectsAtRisk: number;

  // Invoicing aggregates
  receivablesOutstanding: number;   // status IN ('submitted','approved','overdue'): SUM(amount - paid_amount)
  pendingInvoicing: number;         // status IN ('planned','ready_to_invoice'): SUM(amount)
  paidYtd: number;                  // status='paid', EXTRACT(year FROM paid_at)=current_year: SUM(paid_amount)
  expectedTotalInvoicing: number;   // status NOT IN ('cancelled','paid'): SUM(amount)
  yearPlanInvoicing: number;        // EXTRACT(year FROM due_date)=current_year, status!='cancelled': SUM(amount)

  // Targets (null when no targets table exists — Phase 1 will be null for all)
  invoicingTarget: number | null;
  soTarget: number | null;
}
```

### `SalesInvoicingPlanRow`

```typescript
// One row in the Jan–Dec monthly invoicing schedule table
export interface SalesInvoicingPlanRow {
  projectId: string;
  projectCode: string;
  soNumber: string;
  customerName: string;
  totalContractValue: number;
  customerDeliveryDate: string | null;

  // Per-month planned invoice amounts (null = no milestone due that month)
  jan: number | null;
  feb: number | null;
  mar: number | null;
  apr: number | null;
  may: number | null;
  jun: number | null;
  jul: number | null;
  aug: number | null;
  sep: number | null;
  oct: number | null;
  nov: number | null;
  dec: number | null;

  // Totals
  totalScheduled: number;   // SUM of all monthly amounts
  totalPaid: number;        // SUM(paid_amount WHERE status='paid')
  milestoneStatuses: MilestoneStatus[]; // for inline status badge
}
```

### `SalesTargetSummary`

```typescript
// Only populated once migration 099 (sales_targets) is applied (Option 3)
// Until then, all fields are null and target KPIs are hidden with "--"
export interface SalesTargetSummary {
  periodYear: number;
  periodMonth: number | null;  // null = annual target

  // Invoicing targets
  invoicingTarget: number;
  invoicingActual: number;
  invoicingPct: number;          // actual / target * 100

  // SO targets
  soCountTarget: number;
  soValueTarget: number;
  soCountActual: number;
  soValueActual: number;
  soValuePct: number;
}

// Union for dashboard — used when targets table does not yet exist
export type SalesTargetSummaryOrNull = SalesTargetSummary | null;
```

---

## Part E — Implementation Strategy Options

### Option 1 — Extend `Sales.tsx` with Additional Inline Queries

**Approach:** Keep the existing `Sales.tsx` single-file pattern. Add 2–3 more `useEffect`/`useState` blocks to fetch `hot_projects` and `project_invoice_milestones`. Compute everything client-side.

**Pros:**
- No new files, no new hooks, consistent with existing pattern
- Fast to ship

**Cons:**
- Sales.tsx is already 573 lines; adding 3 more queries + monthly pivot logic will push it past 900 lines
- Monthly pivot (Jan–Dec per project) involves significant client-side data transformation
- Harder to unit-test KPI logic buried in a page component
- No reuse across roles (admin also sees a Sales summary)

**Verdict:** Viable for metrics 1–9 only. Not recommended for the full v2 design.

---

### Option 2 — Extract a `useSalesDashboard` Custom Hook

**Approach:** Create `src/hooks/useSalesDashboard.ts` that owns all 4–5 queries and returns a typed `SalesDashboardSummary`. `Sales.tsx` calls the hook and renders only.

**Pros:**
- Separates data from UI — `Sales.tsx` stays clean
- Hook can be reused in future admin/ops dashboard
- All KPI logic is testable in isolation
- No database changes needed for metrics 1–9, 11–13, 15, 17, 19

**Cons:**
- Monthly invoicing pivot still requires significant JS transformation on the client
- Metrics 10, 14, 16, 18 (targets) remain `null` until Option 3 is added
- N+1 query risk for project-level monthly rows (mitigate with a single `project_invoice_milestones` fetch and client-side grouping)

**Verdict:** Recommended for Phase 1 (all non-target metrics). Composable with Option 3 later.

---

### Option 3 — Add `sales_targets` Table + `get_sales_dashboard_summary` RPC

**Approach (additive):** New migration (`099_sales_targets.sql`) creates `sales_targets` table with `(year, month, invoicing_target, so_count_target, so_value_target, owner_id)`. New migration (`100_sales_dashboard_rpc.sql`) creates a `get_sales_dashboard_summary(p_year int, p_owner_id uuid)` Postgres function that returns a single JSON row with all 19 metric values pre-aggregated server-side.

**Pros:**
- Enables % vs target KPIs (metrics 10, 14, 16, 18)
- Monthly pivot done in SQL — efficient, no client-side transformation
- Single RPC call replaces 4–5 separate queries
- Performant for all roles (admin sees all; sales_user scoped by owner_id)

**Cons:**
- Requires 2 new migrations — outside current task scope (analysis only)
- Must be reviewed and applied to production Supabase
- Admin UI needed to enter targets (out of scope for Phase 1)

**Verdict:** Required for target KPIs. Implement as Phase 2 after Phase 1 non-target metrics are live.

---

## Part F — Recommended Approach

### Recommendation: Option 2 (Phase 1) → Option 3 (Phase 2)

**Phase 1 — Hook-based dashboard (all non-target metrics):**

1. Create `src/hooks/useSalesDashboard.ts` with 4 parallel queries:
   - Query A: `projects` (filtered by role) → metrics 1, 2, 17
   - Query B: `hot_projects` (filtered by role) → metrics 3, 4, 19
   - Query C: `project_invoice_milestones` (all statuses, filtered by role via RLS) → metrics 6, 7, 8–9, 11, 12, 13, 15
   - Query D: `quotation_requests` (existing) → open quotations, returned, needs clarification

2. Update `Sales.tsx` to import `useSalesDashboard` and render the v2 layout.

3. Target KPIs (10, 14, 16, 18) render as `—` (em-dash) with a tooltip "Targets not yet configured."

4. "Projects At Risk" — **requires product clarification before implementing.** Proposed v2 definition options:
   - Option A: `project_status = 'sent_back_for_revision'` (current, keep as-is)
   - Option B: Projects with `customer_delivery_date < today AND project_status NOT IN ('completed','cancelled')`
   - Option C: Projects with at least one milestone `status = 'overdue'`
   - **Recommended: Option C** (invoicing-risk view) — but confirm with stakeholder before writing code.

**Phase 2 — Target metrics:**
- Add `099_sales_targets.sql` migration
- Add `100_sales_dashboard_rpc.sql` RPC
- Admin UI to set annual / monthly targets per sales user
- Update hook to call RPC and populate `SalesTargetSummary`

**Phase 3 — Monthly invoicing plan table:**
- Add `src/components/sales/MonthlyInvoicingPlanTable.tsx`
- Renders `SalesInvoicingPlanRow[]` with Jan–Dec columns
- Pivots `project_invoice_milestones` by month client-side (or via view added in Phase 2 RPC)

---

## Part G — Implementation Plan (PR 1–4)

### PR 1 — Hook Foundation (no UI change)

**Files changed (new):**
- `src/hooks/useSalesDashboard.ts` — 4 parallel queries, returns `SalesDashboardSummary`
- `src/types/sales-dashboard.ts` — `SalesDashboardSummary`, `SalesInvoicingPlanRow`, `SalesTargetSummaryOrNull`

**Files changed (existing):**
- None — hook is new, nothing imports it yet

**Safety:** No page changes. Build must pass. No migrations.

---

### PR 2 — Sales.tsx v2 Layout (KPI cards + invoicing table, no targets)

**Files changed:**
- `src/pages/Sales.tsx` — replace current KPI section with v2 design; import `useSalesDashboard`; render metrics 1–9, 11–13, 15, 17, 19; target KPIs show `—`
- `src/components/sales/MonthlyInvoicingPlanTable.tsx` *(new)* — Jan–Dec grid component

**Safety:** RLS unchanged. Routes unchanged. Role filtering unchanged.  
**Gating:** "Projects At Risk" definition must be confirmed before this PR.

---

### PR 3 — Target Table Migration (Phase 2)

**Files changed (new):**
- `supabase/migrations/099_sales_targets.sql`
- `supabase/migrations/100_sales_dashboard_rpc.sql`

**Safety:** Additive-only migrations. No existing table altered. RLS policies scoped to admin/ops + sales_user (own).

---

### PR 4 — Target KPIs Live

**Files changed:**
- `src/hooks/useSalesDashboard.ts` — add RPC call, merge into summary
- `src/pages/Sales.tsx` — unhide target KPI cards (metrics 10, 14, 16, 18)
- Admin UI for target entry *(scope TBD)*

---

## Part H — Safety Checks

Confirming that this analysis document does not change any of the following:

| Protected Item | Status |
|----------------|--------|
| Application source code (`src/`) | **Unchanged** — analysis only |
| Supabase migrations (`supabase/migrations/`) | **Unchanged** — no new SQL files |
| Routes (`src/app/App.tsx`) | **Unchanged** |
| Navigation data (`src/data/navigation.ts`) | **Unchanged** |
| roleMatrix / RequireRole guards | **Unchanged** |
| RLS policies | **Unchanged** |
| Business logic / approval flows | **Unchanged** |
| Auth context / hooks | **Unchanged** |
| `docs/implementation/README.md` | Updated to add this document's entry (documentation only) |

### Open Questions (Blocking for PR 2)

| # | Question | Impact |
|---|----------|--------|
| Q1 | What is the v2 definition of "Projects At Risk"? (sent_back_for_revision / past delivery date / overdue milestones) | Blocks PR 2 `atRisk` KPI |
| Q2 | Is "Total Pipeline Value" weighted (×probability) or unweighted? | Metric #4 formula |
| Q3 | Should `Sales.tsx` v2 be visible to `sales_coordinator` read-only? Currently Sales.tsx is visible to sales_user, admin, ops. | Role access for v2 page |
| Q4 | Is "Invoicing Year Plan" the same concept as "Invoicing Target"? (derivable from milestones vs admin-entered target) | Determines whether migration 099 is needed for Year Plan column |

### Confirmed Non-Blockers

- Monthly pivot (Jan–Dec) is derivable from existing `project_invoice_milestones.due_date` — no migration needed for the table itself
- `hot_projects` data is available via existing RLS; Sales.tsx just needs to query it
- `project_invoice_milestones` is already scoped per sales_user by RLS — no policy changes needed
- `receivables_aging_view` can be used for aging bucket display; just requires correct label (not "receivables only")

---

*End of study. No code was changed. No migrations were created.*
