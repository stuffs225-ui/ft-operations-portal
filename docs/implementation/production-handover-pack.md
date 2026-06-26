# Production Handover Pack — FT Operations Portal

**Branch:** `feature/final-production-readiness-screenshot-smoke-go-no-go`
**Base main SHA:** `1a385a6f2bfbb9c2a3d27ef51cba7b932b2f20f7`

---

## 1. Current release status

**🟡 CONDITIONAL GO.** All DB blockers are resolved (migrations 099 + 100 applied & verified), the
codebase is green (build / typecheck / lint baseline), no role-access or route blockers exist, and
no key route crashes were found in static + code-path review. The post-migration screenshot baseline
(run #2) was **triggered this sprint** and a final live UI smoke remains as the last manual
confirmation before unconditional GO.

## 2. Confirmed DB readiness

- 099 `sales_user_targets`: Present · RLS Enabled · 3 policies.
- 100: `project_invoicing_schedule` + `_history` + `_alerts_view` + `create_default_invoicing_schedule`
  + `reschedule_project_invoicing_schedule` + `update_project_invoicing_schedule_amount` + default
  schedule trigger — all Present; RLS Enabled on both tables; 3 + 3 policies.
- 068 `hot_projects`, 069 `project_invoice_milestones`, 070 `receivables_aging_view`: Present.
- Storage buckets (afs-attachments, project-documents, qc-documents, quotation-documents,
  raw-material-files, vehicle-photos): Present.

## 3. Confirmed module readiness

Sales, Sales Coordinator, Projects/SO, Procurement, Store, Factory, QC, Dubai/AFS, After Sales,
Reports, Control Tower, Admin, Viewer/Management — all stabilized across prior sprints; routes,
guards, deep-links, and empty/loading/error states static-verified. Commercial pages
(`/sales`, `/admin/invoicing-schedule`, `/admin/sales-targets`) auto-activate now that 099/100 exist.

## 4. Smoke / screenshot status

- **UI smoke:** all 15 critical routes static + code-path verified; **live render pending** (manual
  packet `post-migration-099-100-ui-smoke-test.md`).
- **Screenshot baseline:** run #2 triggered on `main` (post-migration), setup/auth healthy, capture
  in progress; review the `full-role-page-screenshot-baseline` artifact when complete.

## 5. Remaining manual checks (before unconditional GO)

1. Review screenshot run #2 artifact — confirm the 3 commercial pages show real data; no blank/error
   pages on any role landing route.
2. Execute the 15-minute minimum smoke test (the manual packet).
3. Sign-off per §7.

## 6. Rollback plan

- **App:** revert the offending PR on `main` (Vercel redeploys the previous build). All UX PRs are
  additive/independent; reverting one does not affect DB state.
- **DB:** migrations 099 + 100 are additive and non-destructive. If a serious issue is traced to
  them, restore the pre-application Supabase backup (taken before activation). Do **not** drop
  objects ad-hoc in production.
- **Trigger note:** the migration-100 `AFTER INSERT` trigger on `projects` auto-creates one default
  schedule line per new project. If that behavior must be paused, disable the trigger via a reviewed
  migration (not an ad-hoc production change).

## 7. Sign-off

| Stakeholder | Sign-off |
|-------------|----------|
| DB owner (099/100 verified + backup) | ☐ |
| Release approver (smoke + screenshot reviewed) | ☐ |
| Admin | ☐ · Sales ☐ · Procurement ☐ · Store ☐ · Factory ☐ · QC ☐ · AFS ☐ · Management ☐ |

## 8. First-day monitoring checklist

- ☐ Login success by each role (12 accounts).
- ☐ `/sales` — no error; invoicing plan + KPIs render.
- ☐ Admin commercial pages load (`/admin/invoicing-schedule`, `/admin/sales-targets`).
- ☐ Document uploads (procurement / AFS / QC / vehicle photos / quotation).
- ☐ Quotation / project creation smoke (if allowed) — confirm the default schedule line is created.
- ☐ Procurement PO / PR / Supplier pages + `?status=` deep-links.
- ☐ Store / Factory / QC / Dubai-AFS dashboards (real counts, gate alerts).
- ☐ Control Tower (cross-module KPIs + exceptions).
- ☐ Management dashboard (read-only).
- ☐ Vercel logs (no runtime errors / 500s).
- ☐ Supabase logs (no RLS-denied storms, no failed RPCs).
- ☐ User feedback channel monitored.

## 9. Known non-blocking issues

- Lint baseline = 56 problems (22 pre-existing `database.ts` `{}` empty-object-type errors + 34
  warnings) — cosmetic, not runtime.
- Live UI smoke + screenshot artifact review still pending (operational).
- Split-installment modal on Admin Invoicing Schedule remains intentionally disabled (needs a future
  `split_project_invoicing_schedule` RPC).

## 10. Final recommendation

**Proceed under CONDITIONAL GO:** ship is supportable now with manual monitoring and the rollback
plan above, on the condition that the screenshot run #2 artifact and the 15-minute smoke test are
reviewed and clean. Move to **unconditional GO** once both pass with no blocker-severity findings.
