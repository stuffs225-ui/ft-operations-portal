# Reference Repository Index

This file documents all 10 reference repositories for the FT Operations Portal research library.

Submodule addition was attempted for each repository. Results are documented below.
For repositories where submodules could not be added (network constraints, repository size), the URL and analysis link are documented here.

**Analysis documents:** See the `analysis/` folder for detailed evaluation of each repository.

---

## Repository List

| # | Name | GitHub URL | License | Usage Category | Fit Score | Priority |
|---|---|---|---|---|---|---|
| 1 | shadcn/ui | https://github.com/shadcn-ui/ui | MIT | Direct Code | 5/5 | Use now |
| 2 | refine | https://github.com/refinedev/refine | MIT | Framework Integration | 5/5 | Use now |
| 3 | react-admin | https://github.com/marmelab/react-admin | MIT | Framework Pattern | 4/5 | Reference |
| 4 | ERPNext | https://github.com/frappe/erpnext | GPL v3 | Data Model + Workflow Reference | 5/5 | Reference only |
| 5 | Twenty CRM | https://github.com/twentyhq/twenty | AGPL v3 | UX + Architecture Reference | 4/5 | Reference only |
| 6 | Plane | https://github.com/makeplane/plane | AGPL v3 | Workflow + UX Reference | 4/5 | Reference only |
| 7 | Novu | https://github.com/novuhq/novu | MIT (SDK) / AGPL (server) | MIT SDK: Direct; Server: Reference only | 4/5 | Use later |
| 8 | Inngest | https://github.com/inngest/inngest | BSL 1.1 | Architecture Reference | 3/5 | Reference only |
| 9 | Trigger.dev | https://github.com/triggerdotdev/trigger.dev | BSL 1.1 | Architecture Reference | 3/5 | Reference only |
| 10 | Appsmith | https://github.com/appsmithorg/appsmith | Apache 2.0 | UX Pattern Reference | 3/5 | Reference only |

---

## Submodule Status

> Note: Git submodules with `--depth 1` were attempted. Given the size of several repositories
> (ERPNext ~1.5GB, Appsmith ~2GB, Twenty ~500MB) and the ephemeral cloud environment,
> submodules were documented as URL references to keep the repository lightweight and
> to avoid storage constraints. This is the recommended approach per the task brief:
> "If submodules are too heavy or not practical, create a references/repository-index.md file."

For local development environments, developers may add any submodule with:

```bash
git submodule add --depth 1 https://github.com/shadcn-ui/ui references/shadcn-ui
git submodule add --depth 1 https://github.com/refinedev/refine references/refine
git submodule add --depth 1 https://github.com/marmelab/react-admin references/react-admin
git submodule add --depth 1 https://github.com/frappe/erpnext references/erpnext
git submodule add --depth 1 https://github.com/twentyhq/twenty references/twenty
git submodule add --depth 1 https://github.com/makeplane/plane references/plane
git submodule add --depth 1 https://github.com/novuhq/novu references/novu
git submodule add --depth 1 https://github.com/inngest/inngest references/inngest
git submodule add --depth 1 https://github.com/triggerdotdev/trigger.dev references/trigger-dev
git submodule add --depth 1 https://github.com/appsmithorg/appsmith references/appsmith
```

**Recommendation:** Only add submodules for the repositories you actively need to read locally. shadcn/ui and refine are the most immediately useful.

---

## Repository Details

### 1. shadcn/ui
- **URL:** https://github.com/shadcn-ui/ui
- **License:** MIT
- **Stars:** ~80,000+
- **Tech Stack:** React, TypeScript, Tailwind CSS, Radix UI
- **Key path to study:** `apps/www/registry/default/ui/` — the component source files
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 1)
- **Module Mapping:** `analysis/02-ft-ops-module-to-reference-mapping.md` (Module 1: Design System)
- **Backlog Items:** #1 (shadcn/ui Setup), #7 (Status Badges)

---

### 2. refine
- **URL:** https://github.com/refinedev/refine
- **License:** MIT
- **Stars:** ~30,000+
- **Tech Stack:** React, TypeScript (framework-agnostic UI)
- **Key paths to study:**
  - `packages/core/` — core hooks and providers
  - `packages/shadcn/` — shadcn/ui integration
  - `examples/` — working examples with shadcn
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 2)
- **Module Mapping:** `analysis/02-ft-ops-module-to-reference-mapping.md` (all modules)
- **Backlog Items:** #2 (refine Setup), #3 (RBAC)

---

### 3. react-admin
- **URL:** https://github.com/marmelab/react-admin
- **License:** MIT
- **Stars:** ~25,000+
- **Tech Stack:** React, TypeScript, Material UI
- **Key paths to study:**
  - `packages/ra-core/` — data provider, auth provider, resource model
  - `packages/ra-ui-materialui/` — list, edit, show, create components
  - `examples/` — working demos
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 3)
- **Backlog Items:** Reference for datagrid and filter patterns

---

### 4. ERPNext
- **URL:** https://github.com/frappe/erpnext
- **License:** GPL v3 — **DO NOT COPY CODE**
- **Stars:** ~22,000+
- **Tech Stack:** Python (Frappe), Vue.js, MariaDB
- **Key paths to study (reference only):**
  - `erpnext/selling/doctype/sales_order/` — Sales Order data model
  - `erpnext/manufacturing/doctype/work_order/` — Work Order
  - `erpnext/buying/doctype/purchase_order/` — Purchase Order
  - `erpnext/stock/doctype/` — Warehouse, Stock Entry, Material Request
  - `erpnext/quality_management/doctype/` — Quality Inspection, NCR
  - `erpnext/maintenance/doctype/` — Maintenance Request
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 4)
- **License Risk:** `analysis/05-license-risk-notes.md` (GPL v3 section)

---

### 5. Twenty CRM
- **URL:** https://github.com/twentyhq/twenty
- **License:** AGPL v3 — **DO NOT COPY CODE**
- **Stars:** ~24,000+
- **Tech Stack:** React, NestJS, PostgreSQL, TypeScript
- **Key paths to study (reference only):**
  - `packages/twenty-front/src/pages/` — page layouts
  - `packages/twenty-front/src/modules/object-record/` — record view layout
  - `packages/twenty-front/src/modules/activities/timeline/` — timeline component design
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 5)
- **License Risk:** `analysis/05-license-risk-notes.md` (AGPL v3 section)

---

### 6. Plane
- **URL:** https://github.com/makeplane/plane
- **License:** AGPL v3 — **DO NOT COPY CODE**
- **Stars:** ~32,000+
- **Tech Stack:** React, Django, PostgreSQL, Redis
- **Key paths to study (reference only):**
  - `web/components/issues/` — issue card, list view components (UX only)
  - `web/components/states/` — state machine UI
  - `apiserver/plane/db/models/issue.py` — issue data model concepts
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 6)
- **License Risk:** `analysis/05-license-risk-notes.md` (AGPL v3 section)

---

### 7. Novu
- **URL:** https://github.com/novuhq/novu
- **License:** MIT (SDK / Notification Center), AGPL v3 (self-hosted server)
- **Stars:** ~36,000+
- **Tech Stack:** React (Notification Center), NestJS (server), TypeScript
- **Key paths to study:**
  - `packages/notification-center/` — MIT-licensed React component (can use directly)
  - `apps/api/src/app/notifications/` — notification workflow architecture (AGPL — reference only)
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 7)
- **License Risk:** `analysis/05-license-risk-notes.md` (MIT SDK / AGPL server distinction)

---

### 8. Inngest
- **URL:** https://github.com/inngest/inngest
- **License:** BSL 1.1 — **DO NOT USE IN COMMERCIAL PRODUCTION**
- **Stars:** ~13,000+
- **Tech Stack:** Go (server), TypeScript (SDK)
- **Key paths to study (architecture reference only):**
  - `pkg/execution/` — durable execution model
  - `examples/` — job definition patterns
  - TypeScript SDK: `inngest/src/` — how jobs are defined in TypeScript
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 8)
- **License Risk:** `analysis/05-license-risk-notes.md` (BSL section)

---

### 9. Trigger.dev
- **URL:** https://github.com/triggerdotdev/trigger.dev
- **License:** BSL 1.1 — **DO NOT USE IN COMMERCIAL PRODUCTION**
- **Stars:** ~12,000+
- **Tech Stack:** TypeScript, Node.js
- **Key paths to study (architecture reference only):**
  - `packages/trigger-sdk/src/` — TypeScript job definition patterns
  - `examples/` — real-world job examples
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 9)
- **License Risk:** `analysis/05-license-risk-notes.md` (BSL section)

---

### 10. Appsmith
- **URL:** https://github.com/appsmithorg/appsmith
- **License:** Apache 2.0 (Community Edition)
- **Stars:** ~35,000+
- **Tech Stack:** Java (backend), React (frontend builder), low-code
- **Key paths to study (UX reference only):**
  - Appsmith documentation and live demo for dashboard widget layout patterns
  - The codebase itself is a low-code builder — not relevant for code extraction
- **Analysis:** `analysis/01-reference-repositories-evaluation.md` (Repository 10)

---

## Cross-Reference: Analysis Documents

| Analysis Document | What It Covers |
|---|---|
| `analysis/01-reference-repositories-evaluation.md` | Full evaluation matrix, license, tech stack, fit scores, recommendations for all 10 repos |
| `analysis/02-ft-ops-module-to-reference-mapping.md` | Maps each of the 26 FT Portal modules to specific repos and patterns |
| `analysis/03-design-system-recommendation.md` | UI direction, component standards, layout standards, form/table/dialog standards |
| `analysis/04-implementation-opportunities-backlog.md` | 30 implementation opportunities organized by priority tier and phase |
| `analysis/05-license-risk-notes.md` | License details, risks, what can/cannot be used, safe alternatives |
| `analysis/06-next-step-system-audit-brief.md` | Checklist and brief for auditing the production FT Portal repository |
