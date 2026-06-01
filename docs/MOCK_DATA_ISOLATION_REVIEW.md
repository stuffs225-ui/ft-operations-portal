# Mock Data Isolation Review (Wave A)

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Scope:** Real-mode mock-data isolation — guarantee that mock/sample records NEVER render when Supabase is configured.

---

## 1. Background

A full audit of the FT Operations Portal found that a number of pages rendered
static mock data unconditionally, including in **live mode** (when a real
Supabase project is configured via environment variables). This is dangerous:
operators could mistake sample records for real records, and an empty production
database would still appear "full".

Wave A introduces a single, explicit data-mode strategy and applies it to every
leaking page so that **mock data is confined to local development only**.

---

## 2. Data-mode strategy

There are two global data modes plus one per-module presentation flag.

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| `live` | `isSupabaseConfigured === true` (env vars present) | Pages query Supabase and show a clean empty state when a table is empty. **Mock data is never rendered.** |
| `dev-mock` | Supabase not configured (local dev) | Pages render static mock data and surface the Dev Mode badge. |
| `preview` | Per-module flag (not a global mode) | A module whose real back-end/aggregation is not yet wired shows sample data **only in dev-mock mode**, and a clean "Preview — not yet connected" state in live mode. |

### 2.1 Shared helpers — `src/lib/dataMode.ts`

Single source of truth for mode detection and mock gating:

- `getDataMode(): 'live' | 'dev-mock'`
- `isLiveMode(): boolean`
- `isDevMockMode(): boolean`
- `mockOrEmpty<T>(mock: T[]): T[]` — returns the mock array in dev, `[]` in live. Use for list/table pages whose live query is not yet wired.
- `mockOrValue<T>(mock, liveFallback): T` — returns the mock value in dev, the supplied fallback (typically `null`) in live. Use for single-object / scalar sources.

### 2.2 DataSourceBadge — `src/components/ui/DataSourceBadge.tsx`

A small inline badge that tells the user exactly where the data on the page
comes from, so sample data is never mistaken for live records.

- `variant="auto"` — shows **"Live data"** (green) when configured, otherwise **"Dev mode — sample data"** (amber).
- `variant="preview"` — shows **"Preview — not yet connected"** (indigo) in live mode, **"Dev mode — sample data"** (amber) in dev mode.

Every page fixed in Wave A renders `<DataSourceBadge variant="preview" />` so
the live-mode empty state is unambiguous.

---

## 3. The rule

> **Mock data must NEVER appear in live mode.**

Every page that previously rendered mock unconditionally now routes its mock
source through `mockOrEmpty` / `mockOrValue`. In live mode the data collapses to
an empty array / null and the page shows its empty state plus the preview badge.

---

## 4. Pages fixed (25)

All 25 pages below previously rendered mock data even in live mode. Each now:
sources its mock via `mockOrEmpty`/`mockOrValue` (→ empty in live mode) and
renders `<DataSourceBadge variant="preview" />`.

| # | Page | Live-mode behaviour now |
|---|------|-------------------------|
| 1 | `ActionInbox` | Empty inbox state + preview badge |
| 2 | `AdminNotificationRules` | Empty rule list + preview badge |
| 3 | `AdminReportSubscriptionDetail` | Empty detail + preview badge |
| 4 | `AfterSales` | Empty list + preview badge |
| 5 | `AfterSalesMaintenance` | Empty list + preview badge |
| 6 | `ControlTower` | "Aggregation not yet connected to live data" notice instead of fake KPIs |
| 7 | `Dashboard` | "Aggregation not yet connected to live data" notice instead of fake KPIs |
| 8 | `DubaiAFS` | Empty list + preview badge |
| 9 | `DubaiAfsArrivalReports` | Empty list + preview badge |
| 10 | `DubaiAfsConditionReports` | Empty list + preview badge |
| 11 | `DubaiAfsEta` | Empty list + preview badge |
| 12 | `DubaiAfsMissingItems` | Empty list + preview badge |
| 13 | `DubaiAfsPredeliveryReports` | Empty list + preview badge |
| 14 | `DubaiAfsProjects` | Empty list + preview badge |
| 15 | `MaterialCustody` | Empty list + preview badge |
| 16 | `MaterialNcrs` | Empty list + preview badge |
| 17 | `MaterialQcInspections` | Empty list + preview badge |
| 18 | `ProjectQcFindings` | Empty list + preview badge |
| 19 | `ProjectQcInspections` | Empty list + preview badge |
| 20 | `ProjectQcReleaseNotes` | Empty list + preview badge |
| 21 | `StoreInventory` | Empty list + preview badge |
| 22 | `StoreReceipts` | Empty list + preview badge |
| 23 | `StoreVehicleReceiving` | Empty list + preview badge |
| 24 | `ReportsAFS` | Empty analytics + preview badge (was a true leak; fixed) |
| 25 | `NotificationSettings` | Empty prefs + preview badge (also crash-hardened — see §6) |

### 4.1 Dashboard & ControlTower

These two pages previously computed KPIs from mock arrays. In live mode they now
show an **"aggregation not yet connected to live data"** notice rather than
fabricated metrics. Real aggregation is a follow-up wave item.

### 4.2 ProjectDetail Store/QC sub-tabs (GAP-03)

`ProjectDetail` contains in-component Store and QC sub-tabs that previously
injected mock via `getMock*` helpers. These now render **empty in live mode**,
pending real reads. Tracked as **GAP-03** (see §7).

---

## 5. Cost-view fix

`ProjectDetail.tsx` now queries the `project_vehicle_lines_safe` view instead of
the base `project_vehicle_lines` table. The base table exposed
`unit_sales_value` / `line_total_value` (revenue) to **all** project-participant
roles. The `_safe` view strips revenue columns for non-commercial roles, so
factory / store / QC / AFS / viewer no longer see revenue figures.

(Reference: `src/pages/ProjectDetail.tsx:608`.)

---

## 6. Crash fix

`NotificationSettings.tsx` removed an unsafe `.find(...)!` non-null assertion
that would crash when the preferences list was empty (the common live-mode
case). It now guards with `if (!pref) return null`.

---

## 7. Remaining items (not in Wave A)

| Ref | Item | Status |
|-----|------|--------|
| GAP-03 | `ProjectDetail` Store/QC sub-tabs render empty in live mode pending real reads | Open — needs real Supabase reads |
| GAP-05 | 13 reports pages still show sample analytics in live mode | Open — needs same preview treatment in a later wave (Wave F) |

The 13 mock-only reports pages (deliberately mock today, flagged for Wave F):
`ReportsExecutive`, `ReportsProjects`, `ReportsSales`, `ReportsProcurement`,
`ReportsFactory`, `ReportsStore`, `ReportsQC`, `ReportsSuppliers`, `ReportsSLA`,
`ReportsDataQuality`, `ReportsHealthScores`, `ReportsIssues`, `ReportsCapa`.

> `ReportsAFS` was a true leak and was fixed in Wave A; the 13 above were
> mock-only-by-design and still need the `mockOrEmpty` + preview treatment.

---

## 8. Verification

- **Build:** `npm run build` passes.
- **Grep confirms helper adoption in all 25 pages:**

  ```bash
  grep -rl "mockOrEmpty\|mockOrValue" src/pages | wc -l   # → 25
  ```

  The 25 files returned match the table in §4 exactly.

- **Cost view:** `grep -n "project_vehicle_lines_safe" src/pages/ProjectDetail.tsx` confirms the `_safe` view is used.

- **Manual smoke:** see `docs/FINAL_ROUTE_TEST_PLAN.md` (Part B — live mode, empty DB, no mock records shown).
