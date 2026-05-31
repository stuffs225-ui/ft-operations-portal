# Role Testing Guide

Manual checks to run after assigning real roles. Log in as each role and verify
both **navigation** (what's in the sidebar) and **access** (what the role can
actually do / see).

> ⚠️ Two known caveats while testing (see `RLS_SECURITY_REVIEW.md`):
> 1. **No route-level guards yet** — a role can deep-link to a page hidden from
>    its sidebar. Test by typing the URL directly, not just clicking the menu.
> 2. **Cost columns are hidden in UI only** — to test true protection, query the
>    table via the API (e.g. browser devtools / `curl` with the user's JWT), not
>    just the rendered page.

## Per-role checklist

### admin
- [ ] Sees all sidebar sections incl. Settings, Admin Approvals, Control Tower.
- [ ] Can approve/reject/route projects; can see all costs and sales values.

### operations_manager
- [ ] Same operational access as admin; sees costs, approvals, Control Tower.

### sales_user
- [ ] Sees Projects, Quotations, Sales; **not** Procurement/Factory/Store/QC/AFS.
- [ ] Sees only **own** projects/quotations (not other sales users').
- [ ] Cannot approve a project. Cannot see purchase costs (UI).

### sales_coordinator
- [ ] Sees Quotations/Sales coordination; cannot edit unrelated operational data.

### procurement_user
- [ ] Sees Procurement (PR, PO to Supplier, Suppliers, ETA). Sees purchase costs.
- [ ] Cannot approve their own >10,000 SAR PO via the UI approval queue.
      *(DB guard not yet in place — see security review.)*

### factory_user
- [ ] Sees Factory module. **No** purchase cost columns. Saudi projects show WO
      gate; Dubai projects show the AFS-route message.

### store_user
- [ ] Sees Store / Vehicle Receiving / Custody. No purchase costs.
- [ ] Cannot approve temporary custody (admin/ops only).

### qc_user
- [ ] Sees Material QC / Project QC / NCR / Findings / Release Notes. No costs.
- [ ] Can issue a Release Note only when all blocking checks pass.

### afs_user
- [ ] Sees Dubai/AFS + After-Sales Maintenance. No costs.
- [ ] Dubai follow-up blocked until PN; maintenance closure needs resolution notes.

### viewer
- [ ] Read-only everywhere visible. No create/edit/approve buttons.
- [ ] Cannot mutate any table (RLS denies writes).

## Cross-cutting security spot checks

- [ ] Log in as `factory_user`, open devtools → Network, load a procurement page,
      inspect the API response — confirm whether `purchase_value` is present.
      *(Today it will be present — this is the documented critical gap.)*
- [ ] As `sales_user`, query `projects` via the API — confirm only own rows return.
- [ ] As `viewer`, attempt a PATCH to any table via the API — confirm 401/403.
- [ ] Unauthenticated request to any table — confirm denied.

## Empty-database behavior

- [ ] On a freshly migrated project (no data), every list page renders an empty
      state (not a crash, not an infinite spinner).
