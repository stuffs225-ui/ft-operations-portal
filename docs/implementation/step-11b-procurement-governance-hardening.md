# Step 11B — Procurement Governance Hardening

**Date:** 2026-06-16
**Branch:** `feature/step-11b-procurement-governance-hardening`
**Status:** COMPLETE — migration added, documentation complete, build passing
**Prerequisite:** Step 11A audit merged at `abb3fd9`

---

## Executive Summary

Step 11A identified two governance gaps in the procurement module:

1. **Supplier approval authority (PARTIAL):** `procurement_user` could set `procurement_status` to `'approved'`, `'approved_with_conditions'`, `'suspended'`, or `'blacklisted'` via direct Supabase API call. Application-layer role checks existed but no DB trigger enforced this boundary.

2. **PR item terminal-state guard (MISSING):** `procurement_request_items` had no DB-level guard preventing inserts or updates after the parent `procurement_request` reached a terminal state (`'closed'`, `'cancelled'`). Migration 085 locked the PR header but not PR items.

This step adds one migration (`093_procurement_governance_hardening.sql`) that closes both gaps without changing any application code, routes, or UI.

---

## A. Baseline Build Result

```
Branch: feature/step-11b-procurement-governance-hardening (off main @ abb3fd9)
npm ci:           ✅ success
npm run build:    ✅ 7.51 s — 0 errors, 0 warnings
tsc --noEmit:     ✅ 0 errors
npm run lint:     ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
```

Pre-existing lint errors are in existing source files unrelated to this step. No lint errors introduced by migration 093.

---

## B. Files Inspected

### B.1 Source pages
- `src/pages/ProcurementSupplierDetail.tsx` — confirmed `handleProcStatusSave()` calls Supabase update with no pre-call role restriction on approval states; no audit event fired
- `src/pages/ProcurementRequestDetail.tsx` — confirmed no PR item insert/update UI (header status only); `recordProcurementEvent()` called on PR status change

### B.2 Migrations
- `supabase/migrations/024_approved_suppliers.sql` — original schema + `sup_procurement_all` FOR ALL
- `supabase/migrations/084_approved_suppliers_rls_hardening.sql` — split policies + `enforce_qc_supplier_fields()` trigger (qc_user field restriction + procurement_user medical/critical guard)
- `supabase/migrations/019_procurement_requests.sql` — PR schema + `pr_procurement_all` FOR ALL
- `supabase/migrations/020_procurement_request_items.sql` — PR items schema + `pri_procurement_all` FOR ALL (no terminal-state guard)
- `supabase/migrations/085_procurement_and_store_write_rls_hardening.sql` — locks PR header (not items)
- `supabase/migrations/061_po_approval_guard.sql` — reference pattern for dual-layer enforcement

### B.3 Helpers and types
- `supabase/migrations/003_rls_profiles.sql` — `current_user_role()` helper confirmed
- `src/types/index.ts` — `PRStatus`, `SupplierProcurementStatus` confirmed
- `src/lib/procurementAudit.ts` — `recordProcurementEvent()` / `recordEtaChange()` signatures

### B.4 Governance docs not found (non-blocking)
- `docs/governance/governance-rules.md` — not present; using `docs/CLAUDE_PROJECT_RULES.md` and system-audit references
- `docs/reference-library/05-license-risk-notes.md` — not relevant (no new dependencies)

---

## C. Supplier Approval Baseline

| Property | Before migration 093 | After migration 093 |
|---|---|---|
| `procurement_user` sets `procurement_status = 'approved'` | **Allowed** (no trigger block) | **Blocked** (trigger raises exception) |
| `procurement_user` sets `procurement_status = 'approved_with_conditions'` | **Allowed** | **Blocked** |
| `procurement_user` sets `procurement_status = 'suspended'` | **Allowed** | **Blocked** |
| `procurement_user` sets `procurement_status = 'blacklisted'` | **Allowed** | **Blocked** |
| `procurement_user` sets `procurement_status = 'pending_review'` | Allowed | Allowed (unchanged) |
| `procurement_user` sets `procurement_status = 'inactive'` | Allowed | Allowed (unchanged) |
| Self-approval: creator approves own supplier | **Allowed** | **Blocked** for `'approved'` and `'approved_with_conditions'` |
| `procurement_user` medical/critical flag self-approval | Blocked (migration 084) | Blocked (preserved) |
| `qc_user` field restriction | Blocked (migration 084) | Blocked (preserved) |

**DB enforcement path:** `enforce_qc_supplier_fields()` BEFORE UPDATE trigger on `approved_suppliers`, called by `trg_enforce_qc_supplier_fields` (created in migration 084, trigger unchanged — only function body replaced).

**`created_by` field:** `approved_suppliers.created_by uuid REFERENCES profiles(id)` — confirmed present. Self-approval guard activates only when `created_by IS NOT NULL` AND `auth.uid() IS NOT NULL` — null-safe.

---

## D. Supplier Approval DB Guardrail Implemented

**Yes.** Migration 093 Part A extends `enforce_qc_supplier_fields()` using `CREATE OR REPLACE FUNCTION`. The existing trigger `trg_enforce_qc_supplier_fields` is not recreated — it continues to fire and calls the updated function body.

New checks added:
1. `procurement_user` cannot change `procurement_status` to `'approved'`, `'approved_with_conditions'`, `'suspended'`, or `'blacklisted'`
2. Any user (admin/ops) approving a supplier (`'approved'` or `'approved_with_conditions'`) where they are the `created_by` is blocked

All checks from migration 084 are preserved unchanged.

---

## E. PR Item Terminal-State Baseline

| Property | Before migration 093 | After migration 093 |
|---|---|---|
| PR items INSERT when parent PR is `'closed'` | **Allowed** (`pri_procurement_all` FOR ALL) | **Blocked** (trigger raises exception) |
| PR items INSERT when parent PR is `'cancelled'` | **Allowed** | **Blocked** |
| PR items UPDATE when parent PR is `'closed'` | **Allowed** | **Blocked** |
| PR items UPDATE when parent PR is `'cancelled'` | **Allowed** | **Blocked** |
| PR items DELETE by `procurement_user` | Allowed (via `pri_procurement_all`) | **Blocked** (no DELETE policy) |
| PR items operations by admin/ops | Allowed | Allowed (trigger bypassed for admin/ops) |
| PR items operations on open/in-progress PRs | Allowed | Allowed (unchanged) |

---

## F. PR Item Terminal-State Guard Implemented

**Yes.** Migration 093 Part B:

1. **RLS split:** `pri_procurement_all` (FOR ALL) replaced with `pri_procurement_select`, `pri_procurement_insert`, `pri_procurement_update`. No DELETE policy — `procurement_user` cannot delete PR items (audit trail preservation, consistent with PR header policy from migration 085).

2. **Trigger:** `enforce_pr_item_terminal_state()` BEFORE INSERT OR UPDATE on `procurement_request_items`. Reads parent `procurement_requests.status`. Raises exception for non-admin/ops users when parent is `'closed'` or `'cancelled'`. Admin/ops bypass at first line of trigger body.

Terminal states used: `'closed'`, `'cancelled'` — sourced from `pr_status` ENUM in migration 019.

---

## G. Migration Details

**File:** `supabase/migrations/093_procurement_governance_hardening.sql`

| Aspect | Detail |
|---|---|
| Migration number | 093 (sequential after 092) |
| Tables affected | `approved_suppliers`, `procurement_request_items` |
| Functions created | `enforce_pr_item_terminal_state()` (new) |
| Functions replaced | `enforce_qc_supplier_fields()` (CREATE OR REPLACE — replaces migration 084 version) |
| Triggers created | `trg_pr_item_terminal_state` on `procurement_request_items` |
| Triggers modified | None — `trg_enforce_qc_supplier_fields` fires unchanged, calls updated function |
| Policies dropped | `pri_procurement_all` |
| Policies created | `pri_procurement_select`, `pri_procurement_insert`, `pri_procurement_update` |
| Policies preserved | All other supplier and PR item policies (see rollback comments in migration) |
| Schema changes | None (no new columns, tables, types, or indexes) |
| Idempotent | Yes — DROP IF EXISTS before CREATE, CREATE OR REPLACE for functions |
| Rollback | SQL comments at end of migration file |

---

## H. RLS / Security Impact

**No weakening of existing RLS.** All changes are additive restrictions:

- `sup_procurement_all` was already dropped in migration 084. Part A does not touch any existing policies.
- `pri_procurement_all` (FOR ALL) is replaced by three scoped policies (SELECT + INSERT + UPDATE). This removes DELETE access for `procurement_user`, which is a tightening, not a weakening.
- Existing `pri_admin_all` (admin + operations_manager FOR ALL) is unchanged — admins retain full access.
- Existing `pri_ops_roles_select` (factory/store/qc/afs/viewer/sales SELECT) is unchanged.

---

## I. Audit Trail Impact

**No reduction in existing audit coverage.** The new triggers add guardrails but do not intercept or remove any existing audit events.

**Known gap (not addressed in this step, flagged for Step 11C):**
- `ProcurementSupplierDetail.handleProcStatusSave()` does NOT call `recordProcurementEvent()` when changing `procurement_status`
- `ProcurementSupplierDetail.handleQCStatusSave()` does NOT call `recordProcurementEvent()` when changing `qc_status`
- Supplier status changes are not recorded to `audit_log`
- This is application-layer coverage, not a DB-trigger gap
- Addressed in Step 11C scope (Section K below)

---

## J. Migration Safety Review

| Check | Result |
|---|---|
| Additive or narrowly protective | ✅ Yes — only adds restrictions, removes no existing protections |
| Drops tables or columns | ✅ No |
| Weakens RLS | ✅ No — removes FOR ALL DELETE from `pri_procurement_all` (tightening) |
| Removes existing triggers or policies | ✅ No — trigger `trg_enforce_qc_supplier_fields` preserved; `pri_procurement_all` replaced with scoped policies |
| Follows naming convention | ✅ Yes — 093 sequential after 092, snake_case function names, trg_ prefix for triggers |
| Uses established patterns | ✅ Yes — mirrors migration 061 (PO approval), 084 (qc field guard), 085 (PR terminal-state) |
| `current_user_role()` helper available | ✅ Yes — defined in migration 003 |
| `auth.uid()` in SECURITY DEFINER context | ✅ Safe — established pattern in migrations 061, 084, 085 |
| Local DB execution available | Not available — SQL reasoning review performed |
| Rollback provided | ✅ Yes — rollback SQL in migration comments |

---

## K. Validation Results

```
npm ci:               ✅ success (no new dependencies added)
npm run build:        ✅ 6.87 s — 0 errors, 0 warnings (migration adds only SQL file)
npx tsc --noEmit:     ✅ 0 errors
npm run lint:         ⚠️  80 problems (64 errors, 16 warnings) — all pre-existing
                          No errors in migration 093 or any changed file
Vercel check:         Not available in this environment
```

---

## L. Remaining Procurement Governance Gaps

| Gap | Severity | Notes |
|---|---|---|
| Supplier status change audit trail | LOW | `handleProcStatusSave()` and `handleQCStatusSave()` in `ProcurementSupplierDetail.tsx` do not call `recordProcurementEvent()` — no `audit_log` entry for supplier status changes |
| `ProcurementRequestDetail` + `ProcurementPODetail` legacy `ui/PageHeader` | COSMETIC | 2 procurement detail pages still on legacy component — not a governance issue |
| Supplier `approved_for_medical_items` / `approved_for_critical_items` — no QC sign-off workflow | LOW-MEDIUM | DB blocks procurement_user from self-approving, but no requirement that QC must approve before medical flag can be set |
| `procurement_request_items` DELETE by admin/ops — no terminal-state restriction | ACCEPTABLE | Admin/ops intentionally bypass all guardrails per established pattern (all existing guards use same bypass). Documented as known behavior. |

---

## M. Recommended Step 11C Scope

Step 11C should be narrowly scoped to the one actionable gap from this step:

### M.1 (MEDIUM) Supplier status change audit events

**Problem:** `handleProcStatusSave()` and `handleQCStatusSave()` in `ProcurementSupplierDetail.tsx` do not call `recordProcurementEvent()`. Supplier approval and QC status changes are not recorded to `audit_log`.

**Recommended fix:**
- In `handleProcStatusSave()`: call `recordProcurementEvent('supplier', supplier.id, null, 'procurement_status_updated', ...)` after successful Supabase update, passing `old_status` and `new_status` in metadata
- In `handleQCStatusSave()`: call `recordProcurementEvent('supplier', supplier.id, null, 'qc_status_updated', ...)` similarly
- No new library, no schema change — uses existing `recordProcurementEvent()` from `src/lib/procurementAudit.ts`

**Scope constraint:** Change only `ProcurementSupplierDetail.tsx`. Do not touch other pages or add new audit infrastructure.

### M.2 (LOW, deferred) PageHeader migration

Migrate `ProcurementRequestDetail.tsx` and `ProcurementPODetail.tsx` from `ui/PageHeader` to `common/page-header`. This is UI consistency debt, not governance, and can be batched with other UI consistency work.

### M.3 Out of scope for Step 11C

- Medical/critical item approval workflow (QC sign-off requirement) — requires product decision
- Factory, store, QC, AFS, quotation, SO, WO/PN module changes
- Any new dependencies or schema changes beyond what M.1 requires
