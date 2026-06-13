# 12 — Step 3: Playbook-to-System Mapping Brief

This document prepares the next step of the finalization process.

---

## What is Step 3?

Step 3 is the **Playbook-to-System Mapping** phase.

The purpose is to create a precise mapping document showing, for each section of the FT Operations Portal Governance Playbook v3.2, exactly:
- What the playbook requires
- What exists in the system today
- What is missing
- What must be built, in which order

This is NOT an implementation step. It produces a structured reference document that Claude Code uses in all subsequent implementation phases to ensure every feature built is aligned with the Playbook.

---

## Primary Output File

Create:
```
docs/governance/playbook-to-system-mapping.md
```

---

## Suggested Structure for the Mapping File

For each Playbook section, create one entry in this format:

```markdown
## Playbook Section: [Section Number — Section Name]

**Playbook Reference:** [brief quote of key requirement]

### Current Screens
- [page name] at [route]
- [page name] at [route]

### Current Tables
- [table_name] — [purpose]

### Current Gaps
- [gap description]
- [gap description]

### Required Validations
- [rule ID from 07-governance-rules-gap-analysis.md]

### Required Reports
- [report name]

### Required Permissions
- [role] can [action]
- [role] cannot [action]

### Required Audit Events
- [event that must appear in timeline]

### Required Documents
- [document type that must be uploaded]

### SLA Rules
- [SLA description and duration]

### Status: Not Started / Partial / Complete
```

---

## Playbook Sections to Map (in Order)

Based on the Playbook PDF (FT Operations Portal Governance Playbook Arabic v3.2) and the finalization master plan:

1. Company & Operations Overview
2. User Roles & Permissions
3. Sales Workspace & Pipeline
4. Quotation Request Workflow
5. Quotation Management (Coordinator)
6. Sales Order (SO) Registration
7. SO Admin Approval & Routing
8. WO Gate (Saudi Route)
9. PN Gate (Dubai Route)
10. Procurement Request (PR)
11. Purchase Order (PO) to Supplier
12. Approved Supplier Registry
13. Saudi Factory Workspace
14. BOQ / BOM / Drawing Requirements
15. Raw Material Requests & Excel Upload
16. Dubai Project Follow-Up
17. AFS (After-Sales / Field Service)
18. Store / Warehouse Operations
19. Material Receiving
20. Medical Serial Tracking
21. Vehicle Receiving & Inspection
22. Material Custody & Issuance
23. Material QC Inspection
24. NCR (Non-Conformance Report)
25. Project (Vehicle) QC Inspection
26. QC Findings & Rework
27. Release Note Governance
28. After-Sales Maintenance
29. Documents & Checklists
30. Risks / Issues / CAPA
31. SLA & Escalation
32. Notifications
33. Reports & KPIs
34. Control Tower
35. Master Data & Data Quality
36. Timeline & Audit Log
37. Invoicing Plan & Milestones
38. Receivables Aging

---

## Inputs Needed for Step 3

| Input | Source | Status |
|-------|--------|--------|
| Governance Playbook PDF v3.2 | Already uploaded (Arabic) | ✅ Available |
| Finalization Master Plan text | Already uploaded (text.txt) | ✅ Available |
| This audit (all 12 files in docs/system-audit/) | Step 2 output | ✅ Complete |
| Reference Library analysis files | stuffs225-ui/FT-Ops-Reference-Library | ❌ Not accessible |
| Supabase migrations (001–075) | Local repo | ✅ Available |
| App.tsx routing | Local repo | ✅ Available |

---

## Approach for Step 3

### Before Starting
1. Reconnect access to `stuffs225-ui/FT-Ops-Reference-Library` and read:
   - `analysis/02-ft-ops-module-to-reference-mapping.md`
   - `analysis/04-implementation-opportunities-backlog.md`
   - `analysis/06-next-step-system-audit-brief.md`
2. Re-read the Playbook PDF (key sections) for each module being mapped

### During Step 3
- Process one Playbook section at a time
- Do NOT implement anything
- Create only the mapping document
- Mark each item: ✅ Complete | ⚠️ Partial | 🔴 Missing
- Reference the gap IDs from `07-governance-rules-gap-analysis.md`
- Reference the backlog IDs from `11-prioritized-gap-backlog.md`

### Validation
- Cross-reference every mapping entry with the migration files in `supabase/migrations/`
- Cross-reference with all page routes in `App.tsx`
- Cross-reference with the module coverage matrix in `06-playbook-module-coverage-matrix.md`

---

## Branch Convention for Step 3

Use branch: `audit/playbook-mapping`

```bash
git checkout -b audit/playbook-mapping
```

---

## Risks to Watch For

| Risk | Mitigation |
|------|-----------|
| Playbook sections in Arabic may require translation context | Use the uploaded PDF + finalization plan text together |
| Playbook may have sections with no current system equivalent | Mark as 🔴 Missing; add to backlog with phase assignment |
| Reference Library still inaccessible | Document unavailability; continue with playbook + audit files |
| Over-implementation temptation | Step 3 is DOCUMENTATION ONLY — no code changes |
| Scope creep to cover all 38 sections at once | Process maximum 5 sections per Claude Code session |

---

## How to Continue Using the Reference Library in Step 3

Once access is restored, for each Playbook module:

1. Check `analysis/02-ft-ops-module-to-reference-mapping.md` for the recommended reference
2. Note the usage category (Direct / Pattern only / Inspiration only / Avoid)
3. Note the license risk (Low / Medium / High)
4. Include in the mapping entry under a "Reference Pattern" field
5. Do NOT copy reference library code — only patterns and designs

---

## Suggested Step 3 Prompt (for Claude Chat → Claude Code)

```
You are working on the FT Operations Portal production repository.

Task: Step 3 — Playbook-to-System Mapping

Branch: audit/playbook-mapping

Read:
- docs/system-audit/00-executive-summary.md through 12-step-3-playbook-mapping-brief.md
- All supabase/migrations/*.sql files
- src/app/App.tsx for routing
- The Governance Playbook (already in context)

Create: docs/governance/playbook-to-system-mapping.md

For each Playbook module (start with modules 1–5 from the finalization plan):
- Document what the Playbook requires
- Map to current screens, tables, and components
- List gaps with reference to audit gap IDs (B-001 to B-050)
- Include required permissions, documents, validations, SLA, audit events
- Mark status: Not Started / Partial / Complete

Rules:
- Do NOT implement any features
- Do NOT change any code
- Do NOT change any database schema
- Documentation only

Reconnect the Reference Library (stuffs225-ui/FT-Ops-Reference-Library) if possible.
If not accessible, note it and continue without it.
```

---

## Expected Step 3 Deliverables

1. `docs/governance/playbook-to-system-mapping.md` — Main mapping document
2. Optionally: `docs/governance/rule-register.md` — All governance rules with R-ID, description, location
3. Optionally: `docs/governance/status-dictionary.md` — Unified status definitions across all modules

Step 3 is complete when every Playbook section has a mapping entry with current status, gaps, and a clear path to completion.
