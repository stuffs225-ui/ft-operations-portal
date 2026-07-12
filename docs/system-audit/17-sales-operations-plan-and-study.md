# 17 — Sales: Operations Notes → Plan, and a Critical Study
**Date:** 2026-07-12 · **Inputs:** operations PDF notes (11 pages) + the final sales audit (doc #16) + P1 points.
This document (a) turns every note into a concrete, sequenced plan, (b) records what is already implemented, and (c) is a critical study of the sales area versus world-class CRM/ERP systems, ending with a **show / hide** recommendation for the salesman.

---

## Part A — Notes → Plan

### ✅ Phase 1 — shipped (this PR)
| # | Note (PDF) | What was done |
|---|-----------|---------------|
| A1 | Reorder/rename the SALES & COMMERCIAL sidebar | Now **Projects · Pipeline Projects · Quotations · Collection & Aging · Sales Reports**. "Hot Projects"→"Pipeline Projects", "Quotation Requests"→"Quotations", "Receivables & Aging"→"Collection & Aging" globally. |
| A2 | Remove the "Hot Project" name | "Hot Project(s)" → "Pipeline Project(s)" in titles, dashboard pillar, buttons, report titles. |
| A3 | Sales shouldn't author the SO / invoicing — view only | Direct **"Create SO / Project"** hidden for sales (dashboard + Projects page). Editable **invoicing planner** hidden for sales (Admin/Ops only). |
| A4 | Project page: keep only the essentials (X-marked cards removed) | Sales project **Overview** now shows only **Project Info, Commercial Details, Vehicle Lines, Documents**. Removed for sales: Execution Gate, Project Health, invoicing planner, Approval & Routing. |
| P1a | Pipeline number differs between pages | Dashboard **Pipeline Value** card now also shows the **weighted** figure, matching the Pipeline Projects page. |
| P1b | "Won This Period" had no period | Now **"Won This Year"**, filtered to wins whose transition landed this calendar year. |

### 🔬 Phase 2 — needs investigation / small backend (next PR, pre- or post-demo)
| # | Note | Plan | Risk |
|---|------|------|------|
| B1 | **Dashboard invoicing table: "Pending" (6.0M) > "Total Value" (3.0M)** — a real calculation bug you and I both caught. | The plan row shows Jul ×1 (1.0M) + Sep ×2 (2.0M) = **3.0M**, but Pending reads **6.0M** (exactly 2×). Investigate `set_line_invoicing_plan` (migration 104) and `calcPendingSchedule` — the quantity multiplier is likely applied twice (once in the amount, once per unit-line). Fix the RPC/query so Pending ≤ Total. | Data-integrity — must fix before management sees it. |
| B2 | Sales can't edit invoicing dates anywhere | Phase 1 removed the planner from the sales project page; **verify** no other sales surface can PATCH `project_invoicing_schedule`. Confirm RLS already blocks it (defence in depth). | Low. |

### 🏗️ Phase 3 — real features (design below; each needs a migration + a PR; confirm before building)
| # | Note | Proposed design |
|---|------|-----------------|
| C1 | **Quotation clarification thread** — when the coordinator requests clarification, the salesman must be able to reply **with attachments**, multi-round, everything logged. | New table `quotation_clarifications(id, quotation_id, author_id, author_role, body, created_at)` + reuse `DocumentPanel`/storage for attachments (`quotation-clarification` bucket). A thread UI on the Quotation detail page; each "need_clarification" → reply toggles status back; full history retained. RLS: salesman (owner) + coordinator + admin/ops read/write. |
| C2 | **Pipeline Projects: split by probability** — ≥80% (high) vs <80%, on the page and in the report. | Add a grouping/segmented control ("High ≥80% / Low <80%") driven by `probability`; mirror the split in the printable report. No DB change (probability already stored). |
| C3 | **Collection & Aging = two parts.** | **Collection:** a mechanism where a periodic finance report is uploaded (a few times a year); on upload the data refreshes and is shown to staff. **Aging:** a **monthly** finance report is uploaded; the system diffs it against last month — **new** items are surfaced to the salesman, **recurring** items require the salesman to add a clarification ("why not collected yet"). New tables: `collection_uploads`, `aging_snapshots(month)`, `aging_items(snapshot_id, invoice_ref, amount, first_seen_month, …)`, `aging_clarifications(aging_item_id, author_id, body, created_at)`; a diff job (new vs recurring by invoice_ref). This is the largest item — a mini-module. |

**Sequencing recommendation:** B1 (bug) → C2 (probability split, cheap) → C1 (clarification thread) → C3 (aging/collection module, largest).

---

## Part B — Critical study vs world-class systems

Benchmarks: **Salesforce Sales Cloud, HubSpot, Microsoft Dynamics 365 Sales, Pipedrive, SAP S/4HANA Sales**.

### Where NAFFCO's portal already matches world-class practice
- **Stage-based pipeline with weighted value** (probability × amount) — the core of every serious CRM. ✅ Now consistent across dashboard + pipeline page.
- **SLA on quotations** with overdue flags and an "Action Required" queue — mirrors Salesforce/HubSpot task queues. ✅
- **Role-scoped views + RLS** (a salesman sees only their own book) — enterprise-grade tenancy. ✅
- **Aging buckets** (Not-Yet-Due / 0-30 / 31-60 / 61-90 / 90+) — standard AR aging, same as SAP/Dynamics. ✅
- **Printable, period-scoped reports** — parity with CRM "report snapshots". ✅

### Gaps vs world-class (ranked by impact for NAFFCO)
1. **No two-way clarification thread on quotations** (your note C1). World-class systems keep an auditable activity/timeline on every record. **Highest-value gap.**
2. **No weighted *forecast* by close date** — top CRMs roll weighted pipeline into a time-phased forecast ("commit / best-case / pipeline"). NAFFCO has weighted total but not a monthly forecast curve.
3. **No activity capture** (calls/emails/next-step reminders) on pipeline projects — Pipedrive's core loop is "every deal always has a next action". NAFFCO has a "No Next Action" flag (good) but no logged activities.
4. **Collection is manual** (your note C3) — world-class AR has dunning workflows and promise-to-pay tracking. Your planned Aging clarification loop is exactly the right direction.
5. **No lead source / win-loss analytics** — `opportunity_source` and `lost_reason` are captured but not reported. Cheap win: a win/loss + source breakdown in Sales Reports.
6. **Invoicing correctness (B1)** — world-class systems never show Pending > Contract value; this bug must be fixed to preserve trust.

### Verdict
The portal is **structurally at enterprise level** for a focused fire-trucks sales operation — stages, weighted pipeline, SLAs, aging, RLS, printable reports. The differences from Salesforce/Dynamics are **depth features** (activity timeline, time-phased forecast, dunning), not missing foundations. Closing C1 (clarification thread) and C3 (aging loop) would put the sales area on par with a mid-market CRM tailored to NAFFCO's process.

---

## Part C — What to SHOW vs HIDE for the salesman

Principle (world-class): a salesman sees **their commercial reality and their next action**; they do **not** see internal execution mechanics or things they cannot act on.

### Show ✅
- Their **projects/SOs** (read-only), customer, value, delivery date, status.
- **Pipeline Projects** they own — stage, probability, weighted value, next action.
- **Quotations** they own — status, SLA, and (Phase 3) the clarification thread.
- Their **invoicing plan** (read-only) and **Collection & Aging** for their customers, with the clarification loop.
- **Commercial details**: NEG PO, delay-penalty %, vehicle lines, documents (with preview/download).
- Their **targets vs actuals** (invoicing / SO / collection).

### Hide 🚫 (moved off the sales view in Phase 1, or recommended)
- **Execution mechanics**: WO/PN execution gate, factory/procurement editing, QC — sales get only the read-only "Progress" glance. ✅ done.
- **Approval & Routing** internals and **Project Health/SLA/blocker** scoring — operations concern. ✅ done.
- **Editable invoicing dates / SO authoring** — Admin/Ops only. ✅ done.
- **Cost/supplier pricing** — already masked by cost-masking views/RLS. ✅
- **Other salesmen's books** — already role-scoped. ✅

### Borderline (decide)
- **Weighted vs unweighted pipeline**: keep both but label clearly (done) — managers want weighted, salesmen think in unweighted.
- **Delay-penalty %**: currently visible read-only to sales; world-class would show it (it affects their deal) — keep, read-only. ✅

---

## Open decisions for you
1. **Direct SO creation for sales** — Phase 1 hides the *button*; the route still exists so quotation→SO conversion keeps working. Do you want the route fully blocked for sales too (conversion routed through Ops), or is hiding the button enough?
2. **B1 invoicing double-count** — fix before the demo? (Recommended yes — it's the one number a manager will question.)
3. **Phase 3 order** — confirm C2 → C1 → C3, or reprioritise.
