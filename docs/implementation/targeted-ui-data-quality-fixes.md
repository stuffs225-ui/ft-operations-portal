# Targeted UI & Data Quality Fixes (Before Page Redesign Phase)

**Branch:** `claude/naffco-portal-modernization-a8gtg1`
**Scope:** five targeted bug/consistency fixes — **not** a redesign. No business
workflow, DB/RLS, migration, permission, route-guard, or calculation changes
(except the one confirmed overdue date-math defect). No fake/demo data.

This document records, per issue: the symptom, the route/files inspected, the
root cause, the fix, why it is safe, and how it was validated.

---

## Issue 1 (B) — Impossible "days overdue" on Admin Invoicing Schedule

**Symptom:** `/admin/invoicing-schedule` renders impossible figures such as
**"730317 days overdue"** (~2000 years) in the Overdue Alerts table.

**Files inspected:**
- `src/pages/AdminInvoicingSchedule.tsx` — Overdue Alerts table renders
  `{a.daysOverdue}` and `{formatDate(a.currentInvoiceDate)}`.
- `src/lib/projectInvoicingScheduleQueries.ts` — `getProjectInvoicingScheduleAlerts`
  reads `project_invoicing_schedule_alerts_view` and passes `days_overdue` straight
  through (`daysOverdue: r.days_overdue`).
- Migration 100 — the view defines
  `days_overdue: (current_date - pis.current_invoice_date)::integer`.

**Root cause:** the arithmetic in the view is correct, but it is computed over an
**implausible source `current_invoice_date`** — a placeholder / epoch / year-0001
value (or a malformed date that slipped past validation). Subtracting such a date
from `current_date` produces an astronomically large integer. The UI then trusted
and rendered that raw number. This is a **data-quality defect surfaced as a UI
defect**, not a calculation error in the schedule logic.

**Fix (root-cause display hardening, no DB change):**
- New pure, timezone-safe utility `src/lib/overdueDisplay.ts`:
  - `parseScheduleDate(value)` — strict ISO/date-only parse at UTC midnight;
    rejects empty, malformed, and calendar-overflow dates (e.g. `2026-02-31`).
  - `describeOverdue(invoiceDate)` — returns a controlled state, never a raw
    figure: **No due date** · **Invalid date** · **Due today** · **Due in X days**
    · **X days overdue**. Any date more than ~50 years from today (in either
    direction) is treated as **Invalid date** instead of emitting a huge number.
  - `formatScheduleDate(value)` — safe date formatter: `—` for empty,
    **Invalid date** for unparseable/implausible, otherwise `dd Mon yyyy`.
- `AdminInvoicingSchedule.tsx`:
  - Overdue Alerts "Days Overdue" cell now renders via a new `OverdueCell` that
    recomputes from `current_invoice_date` with `describeOverdue` — so it shows a
    plausible number or a controlled label, never "730317".
  - Invoice-date cells in both the Overdue Alerts and Schedule Lines tables use
    `formatScheduleDate`, so a placeholder date shows **Invalid date** rather than
    a nonsensical year.

**Why the DB view was not changed:** changing the view is out of scope, requires a
reviewed migration, and would *mask* bad data rather than make the UI resilient to
it. The correct durable fix here is (a) defensive display, now shipped, and (b) a
**data-quality follow-up** to find/repair schedule rows with implausible
`current_invoice_date` values and tighten write-time validation. The follow-up is
recommended, not performed in this PR (no data mutation in scope).

**Safety:** pure functions; no network/DB/calculation change; when the source date
is valid the displayed number is identical to before. KPI math
(`computeInvoicingScheduleKpis`) is untouched.

**Validation:** see the checklist at the end of this document (no unit-test runner
is configured — only Playwright e2e — so a manual checklist is provided per the
task instruction).

---

## Issue 2 (C) — Heavy dark "ADMIN — ACTIVE RULES" panel on Management Dashboard

**Symptom:** `/management-dashboard` ends with a heavy dark purple/indigo
governance panel that clashes with the light dashboard above it.

**Files inspected:** `src/pages/ManagementDashboard.tsx` (renders `<RoleRulesCard />`),
`src/components/ui/RoleRulesCard.tsx` (the dark panel source — `bg-purple-950` /
`bg-indigo-950`).

**Fix:** `RoleRulesCard` rewritten as a **light executive card** — white background,
subtle `border-gray-200/80`, `shadow-sm`, charcoal body text, with a single
restrained NAFFCO-red accent on the heading icon and bullet markers. **Content and
meaning are unchanged** (same heading, same rule list, same role-driven source).
The dashboard layout is otherwise untouched.

**Safety:** presentational-only; same data, same component contract/props.

---

## Issue 3 (D) — Inconsistent decorative module accent colors

**Symptom:** module accents form a rainbow (e.g. Sales, Procurement, QC each a
different decorative hue).

**Audit finding:** the central `moduleAccentColor` field in `src/lib/roleMatrix.ts`
carried a per-role rainbow (`purple/indigo/emerald/teal/amber/orange/cyan/violet/
sky/slate`). A repo-wide search confirms this field currently has **no component
consumer** — the visible per-module accents are **page-local** (PageHeader icon
tints, `SectionHeader` accent props, card `border-l` colors).

**Fix (centralized + minimal):**
- Normalized the single source of truth `moduleAccentColor` to a restrained scheme:
  **NAFFCO red (`bg-brand-600`)** for the admin/primary emphasis, **neutral
  `bg-slate-600`** for every other role — removing the rainbow from the token.
- Neutralized the most prominent decorative offender already in hand: the dark
  `RoleRulesCard` panel (Issue 2).

**Deliberately deferred (out of scope here):** recoloring the page-local decorative
accents across ~138 pages **is the redesign phase** and is explicitly excluded by
this PR's constraints. This PR normalizes the central token and documents the
convergence target so the redesign can apply it uniformly.

**Semantic colors preserved:** status colors (red = critical/overdue/error, amber/
orange = warning/pending, green = success, blue/grey = neutral) and the role-identity
`badgeClass` values were **not** touched — only the decorative module accent token.

---

## Issue 4 (E) — Duplicate sidebar items

**Symptom:** "Receivables & Aging" and "Quotation Requests" each appear **twice**
in the sidebar.

**Files inspected:** `src/data/navigation.ts`, `src/components/layout/Sidebar.tsx`.

**Root cause:** the duplicates are produced for the **admin** role by the admin
bypass in `isItemVisible` (`role === 'admin' && !item.strict`). Admin's own entries
(`receivables`, `quotations`) coexist with role-specific entries that carry the
**identical label and route** (`sales-receivables` for sales_user → "Receivables &
Aging" `/receivables`; `coord-quotations` for sales_coordinator → "Quotation
Requests" `/quotations`). Both pass the bypass, so both render.

**Fix:** new exported helper `dedupeNavItems(items)` in `Sidebar.tsx`, applied
inside `buildVisibleNav` **after** role-filtering and **before** separator pruning.
It removes rows whose **route _and_ label** both duplicate an earlier visible row
(first occurrence wins). This deduplicates at the source of the rendered list:
- Removes the two reported duplicates (and other identical admin-bypass rows, e.g.
  the "Projects / SO" triple and "Hot Projects").
- **Preserves** differently-labeled links to the same route (e.g. "Approvals
  Center" vs "Admin Approvals") — distinct affordances, not duplicates.
- Preserves ordering, section placement, role access (operates only on the
  already-role-filtered list), and produces no broken links (each route still has a
  valid entry).

**Safety:** no route, guard, or `roleMatrix`/permission change. Pure list transform.

---

## Issue 5 (F) — Screenshot baseline was captured on a near-empty DB

Documented (not "fixed") in:
- `docs/implementation/final-readiness-summary.md`
- `docs/implementation/final-screenshot-baseline-results.md`
- `docs/artifact-briefs/README.md`

The prior screenshot baseline reflects a **near-empty database**. It is valid for
**empty-state / layout / navigation** review but **not** for dense-table or
data-volume validation (precisely the conditions under which Issue 1 surfaced).
Recommendation recorded: add an **E2E scenario seeder** (a handful of projects with
schedules across valid/edge/invalid dates, quotations, NCRs, etc.) so a future
baseline exercises populated tables.

---

## Validation checklist (manual — no unit-test runner configured)

**Build / types / lint**
- [ ] `npm run build` — clean (tsc -b + vite build).
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx eslint <changed files>` — no new issues.
- [ ] `npm run lint` — full-repo count unchanged from the 56-problem baseline.

**Issue 1 — overdue display (`describeOverdue` / `formatScheduleDate`):**
- [ ] `null`/empty invoice date → "No due date" / "—".
- [ ] `'0001-01-01'`, epoch, or any date >50y away → "Invalid date" (never a huge number).
- [ ] `'2026-02-31'` (overflow) → "Invalid date".
- [ ] Today's date → "Due today".
- [ ] Future date → "Due in X days".
- [ ] Past date within range → "X days overdue" with the correct count; the number
      shown equals the prior correct value for valid rows.

**Issue 2 — RoleRulesCard:** `/management-dashboard` shows a light white card with a
red heading icon; all rule text present; no dark panel.

**Issue 3 — accents:** `roleMatrix.moduleAccentColor` is brand-red for admin, slate
for all other roles; no semantic status color or role badge changed.

**Issue 4 — sidebar dedupe:** as admin, "Receivables & Aging" and "Quotation
Requests" each appear exactly once; no section is missing; all links resolve.
