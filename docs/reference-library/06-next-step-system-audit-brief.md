# Analysis 06 — Next Step: System Audit Brief

**Purpose:** Prepare the brief for the next step — a full audit of the existing FT Operations Portal production repository to assess current implementation status, gaps, and readiness for the improvements identified in this reference library.

---

## What the Full System Audit Should Inspect

The production FT Operations Portal repository audit should answer these questions:

1. **What is already built?** — Which of the 26+ modules from the playbook are implemented, even partially?
2. **What is correctly built?** — Which existing implementations align with the governance rules in the v3.2 playbook?
3. **What is missing?** — Which playbook modules, data fields, governance rules, or blocking logic are not yet implemented?
4. **What is incorrectly built?** — Which existing implementations violate playbook rules (e.g., factory can act before WO, no SLA tracking, status without stage-gate)?
5. **What is the tech stack?** — What framework, database, and UI library is currently in use?
6. **What are the data quality gaps?** — Are mandatory fields enforced? Are blocking rules implemented at DB level or only UI level?
7. **What is the license situation?** — Are any third-party libraries in the production codebase that carry license risks?

---

## Suggested Audit Checklist

### Section A — Codebase Structure

- [ ] Identify the frontend framework (React / Next.js / Vue / other)
- [ ] Identify the backend framework (Node.js / Python / .NET / other)
- [ ] Identify the database (PostgreSQL / MySQL / MongoDB / other)
- [ ] Identify current UI component library in use
- [ ] Identify ORM / query layer in use
- [ ] Identify authentication system
- [ ] Identify file storage solution
- [ ] Review folder structure and module organization
- [ ] Check for existing CI/CD pipeline
- [ ] Check for existing test coverage (unit, integration, E2E)

### Section B — Business Module Implementation Status

For each module, determine: Not Started / Partially Built / Built but Incorrect / Built and Correct

- [ ] Quotation Management (Section 05 of playbook)
- [ ] Sales Coordinator Workspace (Section 06)
- [ ] SO Registration (Section 07 and 02)
- [ ] Approval and Routing Engine (Section 08)
- [ ] Sales Workspace (Section 09)
- [ ] Procurement and PO Approval (Section 10) — including 10,000 SAR gate
- [ ] Approved Supplier Management (Section 11)
- [ ] Saudi Factory Workspace (Section 12) — including 30-Day Rule
- [ ] Dubai Projects and AFS (Section 13)
- [ ] Store and Warehouse (Section 14)
- [ ] Material Custody and Issuance (Section 15)
- [ ] Vehicle Receiving (Section 16) — including chassis + photos required
- [ ] Medical Serial Number Tracking (Section 17)
- [ ] Raw Material Requests (Section 18)
- [ ] Excel Upload (Section 19)
- [ ] Quality Control — Material QC + NCR (Section 20)
- [ ] Quality Control — Vehicle QC + Release Note (Section 20)
- [ ] AFS Maintenance (Section 21)
- [ ] Documents and Checklist Engine (Section 22)
- [ ] Risks, Issues, Root Cause, CAPA (Section 23)
- [ ] SLA and Escalation (Section 24)
- [ ] Reports and KPIs (Section 25)
- [ ] Operations Control Tower (Section 26)
- [ ] Data Quality Blocking Rules (Section 27)
- [ ] Timeline and Audit Log (Section 28)
- [ ] Roles and Permissions (Section 29)

### Section C — Governance Rule Compliance

Check whether the following hard rules from the playbook are enforced:

- [ ] **SO-WO Gate:** Is factory workspace blocked before WO creation?
- [ ] **SO-PN Gate:** Is Dubai workspace blocked before PN creation?
- [ ] **QTN Submission:** Is submission blocked without Specification Files?
- [ ] **SO Approval:** Does approval enforce Saudi/Dubai and Medical Yes/No selection?
- [ ] **PO High-Value Gate:** Is PO > 10,000 SAR blocked from "Sent to Supplier" without approval?
- [ ] **Medical Item Gate:** Is QC acceptance blocked for medical items without serial number?
- [ ] **Vehicle Receiving Gate:** Is vehicle receipt blocked without Chassis Number and photos?
- [ ] **Temporary Custody Gate:** Is material handover blocked without Admin/Ops Manager approval?
- [ ] **Release Note Gate:** Is Release Note blocked while any QC observation or Rework is open?
- [ ] **30-Day Factory Rule:** Are vehicle lines flagged in Control Tower if not updated in 30 days?

### Section D — Data Quality and Schema Audit

- [ ] Are all mandatory fields enforced at the **database level** (NOT NULL constraints), not just at the UI?
- [ ] Are status transitions enforced at the **API level** (state machine), not just by hiding buttons?
- [ ] Is there a proper audit log table capturing field-level changes with user, timestamp, old value, new value?
- [ ] Is there a timeline events table for project-level event logging?
- [ ] Are foreign key constraints properly defined for SO → WO, SO → PN, PO → Supplier, Material → Project?
- [ ] Are serial numbers unique-constrained at DB level for medical items?
- [ ] Are chassis numbers unique-constrained or at least validated for vehicle records?

### Section E — Role and Permission Audit

- [ ] Are all 10 roles from the playbook implemented?
- [ ] Is financial visibility enforced at API level (not just UI)?
  - Store User should not receive financial values in API responses
  - QC, Factory, AFS users should not see financial values
- [ ] Is data scoping enforced? (Sales User should only see their own projects by default)
- [ ] Are admin-only actions (delete, blacklist, system settings) protected at API level?

### Section F — Third-Party License Audit

- [ ] List all npm/pip/composer dependencies with their licenses
- [ ] Flag any GPL, AGPL, or BSL dependencies
- [ ] Verify no direct code copies from GPL/AGPL repositories exist in the codebase
- [ ] Document the license file for all MIT/Apache dependencies

---

## Suggested Branch Name

```
audit/production-system-review
```

or

```
research/step-2-system-audit
```

**Naming convention:** Use `audit/` prefix to distinguish audit branches from feature branches.

---

## Suggested Deliverables from the System Audit

1. **Audit Report Document** — Answers all checklist sections above with specific file references and evidence
2. **Module Status Matrix** — Table showing each module's implementation status (Not Started / Partial / Incorrect / Correct)
3. **Governance Rule Compliance Matrix** — Table showing each hard rule's compliance status
4. **Gap List** — Prioritized list of what is missing or incorrect
5. **Schema Assessment** — Notes on database schema quality, missing constraints, naming conventions
6. **License Inventory** — Full list of third-party dependencies with license classification
7. **Tech Stack Summary** — Current framework, database, and infrastructure overview
8. **Refactor Risk Assessment** — Which existing modules would be disrupted by framework changes (if the team decides to adopt refine or shadcn/ui)

---

## Risks to Watch for During Audit

### Risk 1 — Governance Rules Implemented Only at UI Level
**What to watch for:** Approval gates that are enforced by hiding or disabling buttons, but the API accepts the same request from any caller. This means the gate can be bypassed by calling the API directly.

**Mitigation:** All stage-gate rules must be enforced at the API / service layer level, not only in the UI.

---

### Risk 2 — Factory or Dubai Modules Working Without WO / PN
**What to watch for:** If the factory workspace or Dubai tracking screens exist and are functional without requiring a WO or PN number, the most critical governance rule of the playbook is violated.

**Mitigation:** Add WO/PN gate enforcement as the highest priority fix if this is found.

---

### Risk 3 — Missing Audit Trail
**What to watch for:** Records can be edited or deleted without any log of what changed, who changed it, and when.

**Mitigation:** Add an audit log table and hook it into all write operations before adding more features. Audit logs cannot be retroactively added without losing historical data.

---

### Risk 4 — Status as Free Text vs Controlled Enum
**What to watch for:** Status fields stored as free-text strings without a controlled enum, allowing "Pending", "pending", "PENDING", and "Pending Approval" to all mean the same thing — breaking filters and reports.

**Mitigation:** Define status enums in the backend and enforce them at DB level (CHECK constraint or lookup table).

---

### Risk 5 — Monolithic Architecture That Is Difficult to Module-ize
**What to watch for:** All 25+ modules' logic mixed in a few large files, making it hard to add new modules or modify existing ones without touching unrelated code.

**Mitigation:** Define a module boundary plan (one service/module per playbook section) before adding new features.

---

### Risk 6 — Performance at Line-Level Scale
**What to watch for:** List views that load all records without pagination; queries that join across many tables without indexes; no caching for Control Tower aggregations.

**Mitigation:** Every list endpoint must support pagination and filtering server-side. Control Tower aggregations should be cached or precomputed, not computed on every page load.

---

### Risk 7 — File Storage Without Metadata
**What to watch for:** Files stored in a filesystem or S3 without database records tracking document type, version, status, linked entity, and uploader. This makes document management, versioning, and checklist enforcement impossible.

**Mitigation:** Every file upload must create a document record in the database with full metadata before the reference library patterns can be applied to document management.

---

## Recommended Audit Order

Inspect in this order to build context progressively:

1. **Read the production README and setup documentation** — Understand what the team believes they've built
2. **Map the database schema** — This reveals what data is actually stored; schema is ground truth
3. **Audit the API endpoints** — List all routes; check what is implemented
4. **Check role enforcement** — Test API endpoints with different role tokens
5. **Audit the SO-WO/PN gate** — This is the highest-priority governance rule; check it first
6. **Audit the high-value PO gate** — Second highest priority financial governance rule
7. **Review the frontend module coverage** — Which screens exist
8. **Run license scan** — `npx license-checker` for npm, `pip-licenses` for Python
9. **Check test coverage** — What has tests, what doesn't
10. **Document the gaps** — Compile the final audit report

---

## Audit Entry Points

When starting the audit, look for these files first:

| What to Find | Where to Look |
|---|---|
| Database schema | `/migrations/`, `/prisma/schema.prisma`, `/models/`, `/entities/`, `schema.sql` |
| API routes | `/routes/`, `/controllers/`, `/api/`, `/pages/api/` (Next.js) |
| Role definitions | `auth.js`, `permissions.js`, `roles.ts`, middleware files |
| Frontend pages | `/pages/`, `/views/`, `/screens/`, `/app/` (Next.js App Router) |
| Business logic | `/services/`, `/lib/`, `/core/`, `/domain/` |
| File upload handling | Search for `multer`, `formidable`, `s3`, `uploadthing` |
| Background jobs | Search for `bull`, `bullmq`, `agenda`, `cron`, `schedule` |
| Notifications | Search for `nodemailer`, `sendgrid`, `novu`, `resend` |

---

## Suggested Audit Start Command

```bash
# Create the audit branch
git checkout -b audit/production-system-review

# Generate a dependency license report (Node.js projects)
npx license-checker --csv --out licenses.csv

# Count lines of code by file type (install cloc if needed)
cloc . --exclude-dir=node_modules,dist,.git

# List all database migration files
find . -name "*.sql" -o -name "*.migration.*" | sort

# Search for WO gate enforcement
grep -r "WO" --include="*.ts" --include="*.js" -l
grep -r "SO_WO_gate\|woCre\|wONumber\|work_order" --include="*.ts" -l

# Search for role checks in API
grep -r "role\|permission\|authorize" --include="*.ts" --include="*.js" -l | head -20
```

---

## Connection to This Reference Library

After the production audit is complete, return to this reference library and use:

- `analysis/02-ft-ops-module-to-reference-mapping.md` — to match audit gaps to reference solutions
- `analysis/04-implementation-opportunities-backlog.md` — to prioritize which gaps to address first
- `analysis/03-design-system-recommendation.md` — to plan any UI redesign or component migration
- `analysis/05-license-risk-notes.md` — to check any existing third-party library risks found during audit
- `docs/research-rules.md` — to guide how patterns from references are transferred to the production fix
