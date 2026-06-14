# Step 6C — QC SELECT RLS Restriction

**Branch:** `fix/qc-select-rls-restriction`  
**Migration:** `supabase/migrations/081_qc_select_restriction.sql`  
**Date:** 2026-06-14  
**Based on:** Step 6B evidence review (`docs/security/step-6b-rls-hardening-evidence-review.md`)  
**Classification:** Class A — safe first migration

---

## 1. Summary of Change

Replaced five overly-broad `FOR SELECT USING (true)` policies on the QC/release table group
with narrower role-aware policies. Before this migration, every authenticated user could
read all QC inspection results, NCR records, project QC findings, and release notes,
regardless of their role or project ownership.

After this migration, SELECT access is limited to:
- **Operational roles** (admin, operations_manager, qc_user, factory_user, store_user,
  afs_user, viewer) — full read access to all rows
- **sales_user** — own-project-only access, linked via `projects.sales_owner_id = auth.uid()`
- **sales_coordinator, procurement_user** — no access (zero rows returned)

Only SELECT policies were changed. INSERT, UPDATE, DELETE policies are untouched.
No schema changes. No application code changes.

---

## 2. Tables Changed

| # | Table | Migration | Old SELECT Policy | Action |
|---|-------|-----------|-------------------|--------|
| 1 | `material_qc_inspections` | 035 | `mqc_select USING (true)` | Dropped → replaced |
| 2 | `material_ncrs` | 036 | `ncr_select USING (true)` | Dropped → replaced |
| 3 | `project_qc_inspections` | 037 | `pqc_select USING (true)` | Dropped → replaced |
| 4 | `project_qc_findings` | 038 | `fnd_select USING (true)` | Dropped → replaced |
| 5 | `release_notes` | 040 | `rn_select USING (true)` | Dropped → replaced |

---

## 3. Policies Dropped

| Policy Name | Table | Reason |
|-------------|-------|--------|
| `mqc_select` | `material_qc_inspections` | `USING (true)` — no role restriction |
| `ncr_select` | `material_ncrs` | `USING (true)` — no role restriction |
| `pqc_select` | `project_qc_inspections` | `USING (true)` — no role restriction |
| `fnd_select` | `project_qc_findings` | `USING (true)` — no role restriction |
| `rn_select` | `release_notes` | `USING (true)` — no role restriction |

---

## 4. New Policies Created

Ten new SELECT policies replace the five dropped policies (two per table):

| Policy Name | Table | Scope |
|-------------|-------|-------|
| `mqc_select_operational` | `material_qc_inspections` | Operational roles — all rows |
| `mqc_select_sales` | `material_qc_inspections` | sales_user — own project only |
| `ncr_select_operational` | `material_ncrs` | Operational roles — all rows |
| `ncr_select_sales` | `material_ncrs` | sales_user — own project only |
| `pqc_select_operational` | `project_qc_inspections` | Operational roles — all rows |
| `pqc_select_sales` | `project_qc_inspections` | sales_user — own project only |
| `fnd_select_operational` | `project_qc_findings` | Operational roles — all rows |
| `fnd_select_sales` | `project_qc_findings` | sales_user — own project only |
| `rn_select_operational` | `release_notes` | Operational roles — all rows |
| `rn_select_sales` | `release_notes` | sales_user — own project only |

All new policies use `public.current_user_role()` (SECURITY DEFINER), consistent with
the pattern established in migration 061.

---

## 5. Role Access Matrix

`✅` = all rows · `⊂` = own project rows only · `✗` = no access

| Role | `material_qc_inspections` | `material_ncrs` | `project_qc_inspections` | `project_qc_findings` | `release_notes` |
|------|---------------------------|-----------------|--------------------------|----------------------|-----------------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `operations_manager` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `qc_user` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `factory_user` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `store_user` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `afs_user` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `viewer` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sales_user` | ⊂ | ⊂ | ⊂ | ⊂ | ⊂ |
| `sales_coordinator` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `procurement_user` | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 6. sales_user Access Decision and Rationale

**Decision:** Own-project-only access via `project_id IN (SELECT id FROM public.projects WHERE sales_owner_id = auth.uid())`.

**Rationale:**
- Sales users need visibility into the QC status and release authorization of their own projects — this is a legitimate operational need for sales tracking and customer communication.
- Blanket access to all QC records across all projects would expose sensitive quality data from competitor projects managed by other sales users.
- `project_id` is available on all five tables and reliably links to `projects.sales_owner_id`.
- The subquery is the same pattern established for sales_user access in migrations 010, 011, 012 (project sub-tables).

**Edge case — nullable project_id:**
`material_qc_inspections.project_id` and `material_ncrs.project_id` are nullable. A QC inspection or NCR with `project_id = NULL` would be excluded from sales_user visibility (`NULL IN (...)` evaluates to false in SQL). This is the correct conservative behavior — unlinked records have no identifiable project owner.

---

## 7. sales_coordinator Access Decision and Rationale

**Decision:** No SELECT access granted (zero rows).

**Rationale:**
- The sales_coordinator role covers "Quotation processing, PDF upload, line values" — this is a pre-sales function with no operational involvement in QC inspections, NCRs, findings, or release notes.
- No QC-related routes in `src/app/App.tsx` include `sales_coordinator` in their `RequireRole` guards.
- Granting access without evidence of operational need would be inconsistent with the principle of least privilege.
- If future pages require coordinator QC visibility, the `ncr_select_sales_coordinator` policy can be added in a targeted Step 6D.

---

## 8. procurement_user Access Decision and Rationale

**Decision:** No SELECT access granted (zero rows).

**Rationale:**
- The procurement_user role covers "PR, PO to Supplier, ETA, Suppliers." Their domain is upstream (purchasing) and post-receipt (ETA tracking), not QC quality disposition.
- NCRs may reference supplier issues, but there is no evidence of a Procurement NCR view in the current application (`src/pages/`), and existing procurement routes do not include QC tables in their Supabase queries.
- Granting broad NCR access would expose quality failure data about other suppliers and projects.
- Procurement visibility into NCRs (for supplier follow-up) is a future enhancement that should be addressed as a targeted policy with a specific business rule (e.g., `supplier_id` match) rather than broad access.

---

## 9. Write Policies — Unchanged

The following policies were NOT modified by this migration:

| Table | Policy | Operation | Unchanged |
|-------|--------|-----------|-----------|
| `material_qc_inspections` | `mqc_insert` | INSERT | ✅ |
| `material_qc_inspections` | `mqc_update` | UPDATE | ✅ |
| `material_ncrs` | `ncr_insert` | INSERT | ✅ |
| `material_ncrs` | `ncr_update` | UPDATE | ✅ |
| `project_qc_inspections` | `pqc_insert` | INSERT | ✅ |
| `project_qc_inspections` | `pqc_update` | UPDATE | ✅ |
| `project_qc_findings` | `fnd_insert` | INSERT | ✅ |
| `project_qc_findings` | `fnd_update` | UPDATE | ✅ |
| `release_notes` | `rn_insert` | INSERT | ✅ |
| `release_notes` | `rn_update` | UPDATE | ✅ |

No DELETE policies existed on any of the five tables (blocked by default — correct). None were added.

---

## 10. Governance Trigger Compatibility

The following triggers on these tables use `SECURITY DEFINER` and bypass RLS entirely.
They are NOT affected by this SELECT restriction.

| Trigger | Table | Security Model |
|---------|-------|---------------|
| `enforce_release_note_gate` | `release_notes` | SECURITY DEFINER — bypasses RLS |
| `append_audit_log` | `release_notes` | SECURITY DEFINER — bypasses RLS |

The release note gate (migration 076) queries `project_qc_findings` directly via
SECURITY DEFINER. Restricting who can SELECT from `project_qc_findings` has no effect on
the gate's ability to check for open findings.

---

## 11. Manual Test Scenarios

Execute these tests in a staging environment with the migration applied:

### Core Access Tests

| # | Role | Table | Action | Expected |
|---|------|-------|--------|----------|
| 1 | `admin` | All five tables | SELECT * | All rows returned |
| 2 | `operations_manager` | All five tables | SELECT * | All rows returned |
| 3 | `qc_user` | All five tables | SELECT * | All rows returned |
| 4 | `factory_user` | `project_qc_findings` | SELECT * | All rows returned |
| 5 | `store_user` | `material_qc_inspections` | SELECT * | All rows returned |
| 6 | `afs_user` | `release_notes` | SELECT * | All rows returned |
| 7 | `viewer` | All five tables | SELECT * | All rows returned |

### sales_user Isolation Tests

| # | Role | Test | Expected |
|---|------|------|----------|
| 8 | `sales_user` | SELECT from `release_notes` WHERE project_id = own project | Rows returned |
| 9 | `sales_user` | SELECT from `release_notes` WHERE project_id = other project | Zero rows |
| 10 | `sales_user` | SELECT from `material_qc_inspections` WHERE project_id = own | Rows returned |
| 11 | `sales_user` | SELECT from `material_qc_inspections` WHERE project_id IS NULL | Zero rows (nullable) |
| 12 | `sales_user` | SELECT from `material_ncrs` WHERE project_id = other project | Zero rows |

### Excluded Role Tests

| # | Role | Table | Expected |
|---|------|-------|----------|
| 13 | `sales_coordinator` | Any of the five tables | Zero rows |
| 14 | `procurement_user` | Any of the five tables | Zero rows |
| 15 | Unauthenticated | Any of the five tables | RLS blocks entirely |

### Write Operation Regression Tests (must still work)

| # | Role | Operation | Expected |
|---|------|-----------|----------|
| 16 | `qc_user` | INSERT into `material_qc_inspections` | Succeeds |
| 17 | `qc_user` | UPDATE `material_qc_inspections` | Succeeds |
| 18 | `qc_user` | INSERT into `release_notes` | Succeeds |
| 19 | `factory_user` | UPDATE `project_qc_inspections` | Succeeds |
| 20 | `factory_user` | UPDATE `project_qc_findings` | Succeeds |
| 21 | `admin` | All operations on all tables | All succeed |

### Release Note Gate Tests (governance regression)

| # | Scenario | Expected |
|---|----------|----------|
| 22 | qc_user tries to set release_status = 'issued' when open findings exist | BLOCKED by trigger 076 |
| 23 | qc_user sets release_status = 'issued' when no open findings | Succeeds |

---

## 12. Known Assumptions

1. **`projects.sales_owner_id` is correctly populated.** The own-project subquery
   depends on `projects.sales_owner_id = auth.uid()`. If a project was created without
   setting `sales_owner_id`, a sales_user assigned to that project will not see its
   QC records via RLS. This is a data quality issue, not an RLS bug.

2. **Operational roles need full QC visibility.** The assumption that factory_user,
   store_user, afs_user, and viewer need to read all QC/release records (not just
   their own project) is based on their operational roles as defined in the Playbook
   and `src/lib/roles.ts`. This was not explicitly confirmed with the product owner.
   If a role needs further restriction, the `_select_operational` policy can be
   updated in a future step.

3. **sales_coordinator and procurement_user have no QC page routes.** Confirmed by
   inspection of `src/app/App.tsx` — no QC-related routes include these roles in
   `RequireRole` guards. Their zero-row access should cause no visible regressions.

4. **SECURITY DEFINER triggers are not impacted.** The release note gate (076) and
   audit trigger (080) both use SECURITY DEFINER and bypass RLS. This has been
   verified by reading the trigger code.

---

## 13. Known Limitations

1. **sales_coordinator procurement follow-up on NCRs is blocked.** If the product
   owner later determines that sales_coordinator needs to see NCRs related to their
   quotations (e.g., for customer-facing reporting), a targeted `ncr_select_coordinator`
   policy can be added in Step 6D.

2. **procurement_user supplier NCR follow-up is blocked.** If the product owner
   wants procurement to see NCRs for materials they purchased, a policy using a supplier
   linkage (through `purchase_orders_to_supplier.supplier_id` → `approved_suppliers`) would
   be needed. This is deferred — the linkage path requires a subquery joining multiple
   tables and should be separately tested.

3. **material_qc_inspections and material_ncrs have nullable project_id.** QC records
   with no project_id will not be visible to sales_user. This is the correct
   conservative behavior. However, if the app creates QC records without project linkage
   in scenarios where the sales_user should still see them, this may need revisiting.

4. **No Supabase CLI available.** The migration could not be run locally against a
   live Supabase instance for integration testing. Manual SQL validation steps are
   provided in the rollback section. The migration SQL is syntactically valid PostgreSQL.

---

## 14. Rollback Notes

The rollback is low-risk: reverting replaces restrictive policies with the original
broad `USING (true)` policies. No data is at risk during rollback — only read access
temporarily broadens back to the original state.

**To roll back (run in Supabase SQL editor):**

```sql
-- Step 1: Drop the new policies
DROP POLICY IF EXISTS mqc_select_operational ON public.material_qc_inspections;
DROP POLICY IF EXISTS mqc_select_sales       ON public.material_qc_inspections;
DROP POLICY IF EXISTS ncr_select_operational ON public.material_ncrs;
DROP POLICY IF EXISTS ncr_select_sales       ON public.material_ncrs;
DROP POLICY IF EXISTS pqc_select_operational ON public.project_qc_inspections;
DROP POLICY IF EXISTS pqc_select_sales       ON public.project_qc_inspections;
DROP POLICY IF EXISTS fnd_select_operational ON public.project_qc_findings;
DROP POLICY IF EXISTS fnd_select_sales       ON public.project_qc_findings;
DROP POLICY IF EXISTS rn_select_operational  ON public.release_notes;
DROP POLICY IF EXISTS rn_select_sales        ON public.release_notes;

-- Step 2: Restore original broad policies
CREATE POLICY mqc_select ON public.material_qc_inspections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ncr_select ON public.material_ncrs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY pqc_select ON public.project_qc_inspections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY fnd_select ON public.project_qc_findings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rn_select ON public.release_notes
  FOR SELECT TO authenticated USING (true);
```

---

## 15. Validation Results

```
npm run build        → ✅ Built successfully
npx tsc --noEmit     → ✅ No type errors
npm run lint         → ⚠️ 79 pre-existing errors (identical to base branch, not introduced by this PR)
Supabase CLI         → Not available in this environment; SQL validated syntactically
```

---

## 16. What Was NOT Changed

- ✅ No INSERT policies changed
- ✅ No UPDATE policies changed
- ✅ No DELETE policies changed
- ✅ No schema changes (no ALTER TABLE, no new columns)
- ✅ No trigger changes
- ✅ No application code changes (`src/` untouched)
- ✅ No existing migration files modified (migrations are immutable)
- ✅ No business logic changes
- ✅ No Supabase query changes

---

## 17. Recommended Next Step (Step 6D)

Step 6D should address the eight Class-B tables from the Step 6B evidence review.
These require per-table clarification before implementation.

**Step 6D focus area — write policy hardening:**

Highest priority (in order):

1. **`medical_serial_numbers`** — Split `medical_serials_broad_all` (FOR ALL, no WITH CHECK,
   includes DELETE for qc_user) into role-split INSERT/UPDATE/SELECT policies. Block
   DELETE for qc_user. Confirm product owner: should qc_user ever delete a serial number?

2. **`factory_records`** — Restrict `factory_viewer_select` to approved projects only
   (currently reads all regardless of project_status). Split `factory_user_all` into
   INSERT + UPDATE (no DELETE).

3. **`approved_suppliers`** — Add WITH CHECK to `sup_procurement_all` to prevent
   self-approving medical/critical suppliers. Add WITH CHECK to `sup_qc_update` to
   restrict qc_user to QC-only fields. Confirm field list with product owner.

4. **`material_custody_records`** — Add WITH CHECK to store_all to prevent
   self-approval of custody. Confirm approved_by chain.

5. **`procurement_requests`** — Add WITH CHECK to `pr_procurement_all` to prevent
   deletion of closed/cancelled PRs.

**Prerequisite for Step 6D:** Product owner must confirm:
- Which fields may `qc_user` update on `approved_suppliers`?
- Should `factory_user` be able to delete factory_records?
- Should procurement_user be able to delete PRs?
- Should store_user be restricted from updating receipt_number after creation?

Step 6D should NOT touch the five tables changed in Step 6C.
Step 6D should NOT touch `projects`, `purchase_orders_to_supplier`, or `audit_log`.
