# Claude Code Project Rules — FT Operations Portal

**Applies to:** All Claude Code sessions working on `stuffs225-ui/ft-operations-portal`  
**Last updated:** 2026-06-13  
**Branch when created:** `docs/reference-library-bridge`

---

## Purpose

This file contains standing rules that every Claude Code session must follow when working on this repository. Read this file at the start of every session before making any changes.

---

## Rule 1 — Never Modify Production Code Without Explicit Instruction

The following directories contain production application code. Do NOT modify them unless the user explicitly asks for a code change:

- `src/` — React application source code
- `supabase/migrations/` — PostgreSQL migration files
- `supabase/functions/` — Supabase Edge Functions
- `public/` — Static assets

**Documentation tasks** (anything under `docs/`) do NOT require user approval to modify, as long as they are documentation-only changes.

---

## Rule 2 — Never Modify Database Schema Without Explicit Instruction

- Do NOT create new migration files unless the user explicitly asks
- Do NOT alter existing migration files (migrations are immutable once applied)
- Do NOT modify RLS policies, triggers, or functions in existing migration files
- Migration gold standard: `supabase/migrations/061_po_approval_guard.sql` — dual-layer enforcement with RLS + trigger

---

## Rule 3 — License Safety

Before recommending any third-party library or pattern:

1. Check `docs/reference-library/05-license-risk-notes.md` for license classification
2. Do NOT recommend GPL, AGPL, or BSL-licensed code for production use
3. Safe choices: shadcn/ui (MIT), refine (MIT), react-admin (MIT), BullMQ (MIT), Novu SDK (MIT)
4. Reference-only: ERPNext (GPL v3), Twenty CRM (AGPL v3), Plane (AGPL v3), Inngest (BSL), Trigger.dev (BSL)

Full license analysis: `docs/reference-library/05-license-risk-notes.md`

---

## Rule 4 — Repository Is in Documentation + Audit Mode

The repository is currently being documented and audited. The audit is in `docs/system-audit/`. Until the audit is complete and finalization phases begin:

- Do NOT refactor existing code
- Do NOT add new features
- Do NOT change any UI behavior
- Do NOT add any new dependencies to `package.json`
- Documentation changes in `docs/` are permitted

---

## Rule 5 — Understand the Tech Stack Before Coding

The FT Operations Portal is:
- **React 18.3.1 SPA** (NOT Next.js — Vite-based, no server-side rendering)
- **TypeScript 5.7.2** — zero compiler errors required
- **Supabase** for auth, database (PostgreSQL), and storage
- **React Router DOM 6.28.0** for client-side routing
- **Tailwind CSS 3.4.17** for styling (no shadcn/ui yet — see backlog)
- **lucide-react** for icons

Key files:
- `src/app/App.tsx` — all routes (105+ lazy-loaded routes)
- `src/lib/roles.ts` — 10 roles with `ROLE_CONFIGS`
- `src/lib/supabase.ts` — `isSupabaseConfigured` flag
- `src/context/AuthContext.tsx` — auth context with dev-mode injection
- `src/lib/dataMode.ts` — `mockOrEmpty<T>()` pattern for live vs dev-mock

---

## Rule 6 — The 10 Roles

The system has exactly 10 user roles. Do not add, remove, or rename roles without explicit instruction:

| Role | Key Capability |
|---|---|
| `admin` | Full access; always passes `RequireRole` |
| `operations_manager` | PO approval, Dubai, escalation |
| `sales_user` | Quotations, Hot Projects, SO, Invoicing |
| `sales_coordinator` | Process quotations, upload PDF + values |
| `procurement_user` | PR, PO to Supplier, ETA, Suppliers |
| `factory_user` | WO, BOQ, BOM, Raw Material Requests |
| `store_user` | Material/vehicle receiving, custody, issuance |
| `qc_user` | QC inspections, NCR, Release Notes |
| `afs_user` | Dubai projects, AFS arrival, post-delivery |
| `viewer` | Read-only, reports |

---

## Rule 7 — Critical Governance Rules (Non-Negotiable)

These governance rules are from Playbook v3.2. Never implement features that bypass them:

1. **WO Gate:** Saudi factory cannot start without WO number entered after SO approval
2. **PN Gate:** Dubai follow-up cannot start without PN number entered after SO approval
3. **PO Approval:** PO > 10,000 SAR requires Admin or Operations Manager approval
4. **Release Note Gate:** Release Note cannot be issued while any QC finding or rework is open
5. **Medical Serial:** Medical items cannot pass QC without serial number registration
6. **Vehicle Receipt:** Vehicle receipt is not complete without Chassis Number + photos
7. **Temporary Custody:** Requires Admin or Operations Manager approval before handover

---

## Rule 8 — Audit Documents Are Source of Truth

The audit documents in `docs/system-audit/` are the most recent assessment of the production system. Before implementing any feature, check:

- `docs/system-audit/11-prioritized-gap-backlog.md` — 50 prioritized backlog items (B-001 to B-050)
- `docs/system-audit/07-governance-rules-gap-analysis.md` — 19 governance rules (R-001 to R-019)
- `docs/system-audit/06-playbook-module-coverage-matrix.md` — module coverage status
- `docs/system-audit/05-roles-permissions-rls-audit.md` — 6 high-risk access issues (HRA-01 to HRA-06)

---

## Rule 9 — Reference Library Files Are Read-Only

The files in `docs/reference-library/` are a bridge from the external reference library. They should be treated as **read-only** reference material in this repository. Do not modify them unless re-syncing from a new bridge export.

To understand which patterns to use for any implementation, read:
1. `docs/reference-library/02-ft-ops-module-to-reference-mapping.md` — module-level guidance
2. `docs/reference-library/04-implementation-opportunities-backlog.md` — implementation priorities
3. `docs/reference-library/03-design-system-recommendation.md` — UI/UX standards
4. `docs/reference-library/05-license-risk-notes.md` — license verification

---

## Rule 10 — Branch Naming Convention

| Work Type | Branch Prefix | Example |
|---|---|---|
| Documentation / Audit | `docs/` | `docs/reference-library-bridge` |
| Audit only | `audit/` | `audit/playbook-mapping` |
| Feature implementation | `feature/` | `feature/shadcn-ui-setup` |
| Bug fix | `fix/` | `fix/release-note-gate` |
| Phase work | `phase/` | `phase/1-foundation` |
| Claude Code sessions | `claude/` | `claude/audit-production-system-review-5v330i` |

---

## Quick Reference: Critical File Paths

| What You Need | Where to Find It |
|---|---|
| All routes | `src/app/App.tsx` |
| Role definitions | `src/lib/roles.ts` |
| Auth context | `src/context/AuthContext.tsx` |
| Supabase client | `src/lib/supabase.ts` |
| Data mode (live vs mock) | `src/lib/dataMode.ts` |
| WO/PN gate logic | `src/lib/executionGate.ts` |
| All TypeScript types | `src/types/index.ts` |
| SLA engine (client-side) | `src/lib/slaEngine.ts` |
| DB migrations | `supabase/migrations/` (001–075) |
| Gold standard migration | `supabase/migrations/061_po_approval_guard.sql` |
| System audit | `docs/system-audit/00-executive-summary.md` |
| Backlog | `docs/system-audit/11-prioritized-gap-backlog.md` |
| Reference library | `docs/reference-library/README.md` |

---

## Finalization Phase Plan

The repository is following a 10-phase finalization plan. Current status as of 2026-06-13:

| Phase | Name | Status |
|---|---|---|
| Step 2 | Full System Audit | ✅ Complete (`docs/system-audit/`) |
| Step 2.5 | Reference Library Bridge | ✅ Complete (`docs/reference-library/`) |
| Step 3 | Playbook-to-System Mapping | ⏳ Not started (`docs/governance/`) |
| Phases 1–10 | Implementation | Not started |

Step 3 brief: `docs/system-audit/12-step-3-playbook-mapping-brief.md`
