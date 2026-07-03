# Store / Warehouse Workspace Artifact Polish

**Branch:** `feature/store-workspace-artifact-polish`
**Base main SHA:** `09a1facaffb0574b9314077d9bbc535e608b9c60`
**Scope:** **UI-only** polish of the Store / Warehouse (`store_user`) workspace from
the approved Artifact. No business-workflow, DB/RLS, migration, permission,
`roleMatrix`, or route-guard changes. No new backend queries, no new mutations, no
fake data. All guardrails remain display-only unless already enforced.

---

## Artifact summary

Apply one consistent skeleton across the store pages: header → guardrail/role
context → priority queue → compact KPI band → filterable table with status →
empty/loading/error. De-duplicate the dashboard into a 6-KPI band + one
urgency-ordered priority queue. Make the role's guardrails **visible states** rather
than footnotes: a photo-completeness meter (n/5) on vehicle rows, serial/QC
issuance preconditions, an explicit read-only banner on QC Handoff, and the custody
approval/acceptance gates. Add counts to status tabs. Standardise on semantic colors
(red missing/blocked/rejected · amber pending/partial · green received/available ·
slate neutral) and neutralise the decorative cyan module accent.

The Artifact page-selector / current-improved / density controls were design-review
devices and are **not** implemented in production.

---

## Approved execution decisions (this pass)

- **One workspace PR** (matches Sales & Procurement).
- **Wizards left untouched** — `/store/receipts/new`, `/store/vehicle-receiving/new`,
  `/custody/new`: no changes to steps, fields, validation, or submit.
- **Density toggle deferred** (not added).
- **Real routes used:** `/store/receipts` (`+ /new`, `+ /:id`),
  `/store/vehicle-receiving`, etc. `/store/material-receiving` does **not** exist.
- **Returns / Transfers is a nav alias to `/store/receipts`** — no separate page was
  built or invented (see below).
- **Vehicle Receiving** scoped to `/store/vehicle-receiving` (`StoreVehicleReceiving.tsx`)
  only; the separate admin/exec `/vehicle-receiving` (`VehicleReceiving.tsx`) was not
  touched — flagged as a future consistency item.

---

## Inspected routes / files

| Route | File | Notes |
|-------|------|-------|
| `/store` | `Store.tsx` | dashboard — live KPI counts |
| `/store/receipts` | `StoreReceipts.tsx` | Material Receiving |
| `/store/vehicle-receiving` | `StoreVehicleReceiving.tsx` | photo gate (n/5 already computed) |
| `/store/inventory` | `StoreInventory.tsx` | items + status/category/serialized filters |
| `/store/issuance` | `StoreIssuance.tsx` | issued-out tracking |
| `/custody` | `MaterialCustody.tsx` | custody lifecycle + approval/acceptance |
| `/store/unallocated` | `StoreUnallocated.tsx` | worklist + Assign CTA (existing mutation) |
| `/store/serials` | `StoreSerials.tsx` | serialized/medical register |
| `/store/qc-handoff` | `StoreQCHandoff.tsx` | read-only QC status |
| `/reports/store` | `ReportsStore.tsx` | **not modified** this pass (see below) |

New local helper: `src/components/store/StoreUI.tsx` — `StatusTabsWithCounts`,
`PhotoMeter`, `AcceptGateFlag`, `ReadOnlyBanner` (store-only, presentational).

---

## What was implemented

**Dashboard (`/store`):** replaced the overlapping 8-KPI + 8-queue + module grid with
a **compact 6-KPI band**, **one urgency-ordered Priority Queue** (Vehicles Missing
Photos → Materials Pending QC → Missing Serials → Unallocated → Custody Pending
Approval → QC-Accepted Ready to Issue → Custody Pending Acceptance → QC Rejected/NCR),
and a **compact module row**. Every existing count and destination is preserved; the
governance rules card is retained; decorative cyan replaced with restrained
brand/neutral. Both receive CTAs kept.

**Vehicle Receiving:** status tabs now show **counts**; the photo cell renders a
**PhotoMeter (n/5)**; an **AcceptGateFlag** ("Accept blocked — photos incomplete")
surfaces the 5-photo acceptance gate on pre-accept rows. Enforcement is **already
present on the detail page** (it blocks acceptance until all 5 photos are uploaded —
`StoreVehicleReceivingDetail.tsx`), so this only mirrors real state; no new
enforcement was added. Cyan neutralised.

**Material Receiving / Custody:** counted status tabs (`StatusTabsWithCounts`); the
existing pending-QC and custody approval/acceptance notes and columns retained; cyan
neutralised. Custody already surfaces the approval + receiver-acceptance gates (KPI
strip + note + columns).

**Issuance:** added a display-only **precondition note** (QC-accepted first;
serial registered for medical/serialized; custody needs Admin/Ops approval +
acceptance); counted tabs retained; cyan neutralised.

**QC Handoff:** added an explicit **read-only banner** (QC owns pass/fail/NCR; Store
cannot change outcomes) while keeping the "Go to Material QC" link and the
"must not be issued before QC acceptance" caveat; counted tabs retained.

**Unallocated / Serials / Inventory:** these were already worklist/filtered tables
with honest empty states and the register-from-Receiving hint (Serials) and Assign
CTA (Unallocated); cyan/sky decorative accents neutralised, semantic colors kept.

---

## What was intentionally NOT implemented

- **The 3 `/new` wizards** — untouched (decision above).
- **Returns / Transfers page** — it is a nav alias to `/store/receipts`; not built.
- **`/reports/store`** — held for a later pass; it already has tabs + an export bar,
  and touching it was out of the agreed batch. Flagged as follow-up.
- **Density toggle**, **Artifact page-selector/toggle** — not in production.
- **No data-model, query, calculation, permission, guard, or route changes.**

---

## Safety notes / guardrails (all preserved)

- **5-photo vehicle gate:** surfaced (meter + flag); enforcement confirmed present on
  the detail page — mirrored, not re-implemented.
- **Chassis-unique, serial-before-issuance, custody approval + acceptance,
  assign-before-issue:** unchanged; several made *more visible* only.
- **QC Handoff:** remains read-only; no mutation added; QC ownership intact.
- Routes, route guards, `roleMatrix`, permissions, RLS: untouched.
- No service-role usage; no new mutations; existing Unallocated "Assign" mutation
  unchanged.
- No sidebar/navigation change (no duplicate-nav risk introduced).

---

## Validation

- [x] `npx tsc --noEmit` — clean.
- [x] changed-file ESLint — no new issues (only pre-existing `no-explicit-any`
      warnings on untouched `as any` casts).
- [x] `npm run lint` — 56 problems (22 errors / 34 warnings), unchanged baseline.
- [x] `npm run build` — clean.

**Manual/static review (static only — no live data run in this environment):**
- [ ] All store routes render; tabs render with counts; no broken links.
- [ ] Dashboard: 6-KPI band + single priority queue + compact modules; all links resolve.
- [ ] Vehicle rows show n/5 meter; incomplete rows show the accept-blocked flag.
- [ ] QC Handoff shows the read-only banner; no mutating controls.
- [ ] Issuance shows the precondition note; Custody shows approval/acceptance gates.
- [ ] Semantic colors only; no heavy dark / cyan-rainbow UI; contained empty/loading states.
