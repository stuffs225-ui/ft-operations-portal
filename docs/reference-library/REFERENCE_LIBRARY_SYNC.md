# Reference Library Sync Record

**Sync Method:** Bridge Export (Step 2.5B)  
**Export Date:** 2026-06-13  
**Target Branch:** `docs/reference-library-bridge`  
**Production Repository:** `stuffs225-ui/ft-operations-portal`  
**Source Repository:** `stuffs225-ui/FT-Ops-Reference-Library`  
**Source Branch:** `claude/ft-ops-reference-library-7yjdla`

---

## Why This Bridge Exists

The FT-Ops-Reference-Library is a separate GitHub repository containing research and analysis files. Claude Code sessions working on `ft-operations-portal` cannot access it directly (cross-repository access is not available in a single session scope).

This bridge copies the **documentation-only** content from the reference library into the production repository so that all future Claude Code sessions have access to the research findings without needing the external repository.

**No external source code was copied.** All files in this folder are original analysis documents authored in the reference library. They contain patterns, recommendations, and references — not code extracted from any third-party repository.

---

## Files Synced

| Target File | Source File | Contents |
|---|---|---|
| `README.md` | `README.md` | Reference library overview and purpose |
| `research-rules.md` | `docs/research-rules.md` | 6 rules for license-safe pattern transfer |
| `ft-ops-playbook-summary.md` | `docs/ft-ops-playbook-summary.md` | 20 permanent rules + all 29 module summaries |
| `01-reference-repositories-evaluation.md` | `analysis/01-reference-repositories-evaluation.md` | Full evaluation of 10 reference repositories |
| `02-ft-ops-module-to-reference-mapping.md` | `analysis/02-ft-ops-module-to-reference-mapping.md` | 26 FT Portal modules mapped to reference patterns |
| `03-design-system-recommendation.md` | `analysis/03-design-system-recommendation.md` | UI direction, component library, layout standards |
| `04-implementation-opportunities-backlog.md` | `analysis/04-implementation-opportunities-backlog.md` | 30 implementation opportunities with phases |
| `05-license-risk-notes.md` | `analysis/05-license-risk-notes.md` | License risks for all 10 repositories |
| `06-next-step-system-audit-brief.md` | `analysis/06-next-step-system-audit-brief.md` | Audit checklist and deliverables guide |
| `repository-index.md` | `references/repository-index.md` | Index of all 10 reference repositories with URLs |

---

## Key Findings from the Reference Library

### Recommended Stack
- **UI Components:** shadcn/ui (MIT) — copy-paste component library
- **Admin Framework:** refine (MIT) — CRUD/RBAC/data provider framework
- **Background Jobs:** BullMQ (MIT) — for SLA engine and 30-day factory rule
- **Notifications:** Novu MIT SDK or custom — for in-app notification center

### License Summary
| License | Repositories | Usage |
|---|---|---|
| MIT (safe) | shadcn/ui, refine, react-admin, Novu SDK | Direct code use permitted |
| Apache 2.0 (safe) | Appsmith | Pattern reference only (low-code tool) |
| GPL v3 (restricted) | ERPNext | Business patterns only — no code copy |
| AGPL v3 (restricted) | Twenty CRM, Plane, Novu Server | UX inspiration only — no code copy |
| BSL 1.1 (restricted) | Inngest, Trigger.dev | Architecture reference only — no code copy |

### Implementation Phases (from backlog)
| Phase | Focus |
|---|---|
| 1 — Foundation | shadcn/ui, refine, RBAC, master data, status badges |
| 2 — Project Core | SO Registration, Approval/Routing Engine, Timeline |
| 3 — Quotation | Quotation workflow, Sales Coordinator workspace |
| 4 — WO/PN Gate | WO/PN blocking enforcement |
| 5 — Procurement | PR→PO flow, high-value approval, supplier registry |
| 6 — Factory/Dubai/AFS | Saudi factory workspace, Dubai tracking, AFS |
| 7 — Store/Custody | Vehicle receiving, medical serial tracking |
| 8 — QC/Release | QC checklists, NCR, Release Note gate |
| 9 — After Sales | AFS maintenance requests post-delivery |
| 10 — Excellence | Control Tower, SLA engine, reports, notifications |

---

## How to Use These Files

### For Implementation Planning
1. Start with `02-ft-ops-module-to-reference-mapping.md` — find your module and see which references apply
2. Check `05-license-risk-notes.md` — verify the license before using any pattern
3. Consult `04-implementation-opportunities-backlog.md` — find the relevant backlog item and its phase

### For Design Decisions
1. Read `03-design-system-recommendation.md` — UI direction, component standards, layout patterns
2. Verify all component choices use MIT-licensed sources only
3. Use ERPNext/Twenty CRM/Plane as inspiration only — never copy code

### For New Claude Code Sessions
Reference these files at the start of any session that involves:
- Implementing a new module
- Deciding on a UI component approach
- Planning a database schema for an FT Portal entity
- Choosing between framework options

---

## What Was NOT Synced

The following content does not exist in the bridge and was not synced:
- External source code from any of the 10 reference repositories
- Git submodule data (too large for ephemeral container)
- Any production FT Operations Portal code
- Any database schema or migration files

---

## Next Sync

If the reference library is updated in `stuffs225-ui/FT-Ops-Reference-Library`, the updated files should be re-exported using the same bridge export process and re-synced to this folder.

To re-sync:
1. Export updated files from the reference library as `BRIDGE_EXPORT_FOR_FT_OPERATIONS_PORTAL.md`
2. Upload to a new Claude Code session for `ft-operations-portal`
3. Parse the `SOURCE_FILE:` / `TARGET_FILE:` markers and overwrite the files in this folder
4. Update this sync record with the new export date and source branch
