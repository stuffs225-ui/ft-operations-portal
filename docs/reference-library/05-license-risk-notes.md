# Analysis 05 — License Risk Notes

**Purpose:** Clearly identify the license of each reference repository, what can be used directly, what must be treated as inspiration only, and the risks of GPL/AGPL/BSL code in the company production system.

---

## Critical Warning

> **Do NOT copy code from GPL, AGPL, or BSL-licensed repositories into the FT Operations Portal production system without written legal approval from company management.**
>
> License violations in software can expose the company to:
> - Forced open-sourcing of the entire production codebase
> - Copyright infringement claims
> - Financial penalties
> - Reputational damage

---

## License Summary Table

| Repository | License | Risk Level | Can Use Code Directly | Can Use as Inspiration |
|---|---|---|---|---|
| shadcn/ui | MIT | None | Yes — copy and customize | Yes |
| refine | MIT | None | Yes — as a framework dependency | Yes |
| react-admin | MIT | None | Yes — as a framework dependency | Yes |
| Appsmith | Apache 2.0 | None | Yes — patterns only (low-code) | Yes |
| ERPNext | GPL v3 | HIGH | **No** | Yes — workflow and data model study |
| Twenty CRM | AGPL v3 | VERY HIGH | **No** | Yes — UX patterns only |
| Plane | AGPL v3 | VERY HIGH | **No** | Yes — issue tracking UX only |
| Novu (SDK/Notification Center) | MIT | None | Yes — as a library import | Yes |
| Novu (Self-hosted server) | AGPL v3 | VERY HIGH | **No** | Yes |
| Inngest | BSL 1.1 | HIGH | **No** (current version) | Yes — architecture patterns |
| Trigger.dev | BSL 1.1 | HIGH | **No** (current version) | Yes — job pattern reference |

---

## Detailed License Analysis

### MIT License — shadcn/ui, refine, react-admin, Novu SDK

**What MIT means:**
- Permissive license — allows use, copy, modification, distribution in commercial products
- Only requirement: retain the original copyright notice and license text
- No copyleft — code can be integrated into proprietary systems without restrictions

**What you can do:**
- Copy components from shadcn/ui and modify them for FT Portal
- Import refine or react-admin as npm dependencies in the production codebase
- Import and use the Novu Notification Center React component
- Create derived works and keep them proprietary

**What you must do:**
- Keep the MIT license header in any copied files
- Include the license in the project's third-party license acknowledgement list

**Risk:** None, provided the attribution requirements are met.

---

### Apache 2.0 License — Appsmith

**What Apache 2.0 means:**
- Permissive license, similar to MIT
- Allows commercial use, modification, distribution
- Requires: retain copyright notices, provide NOTICE file, state changes made
- Includes an explicit patent grant (stronger than MIT)

**What you can do:**
- Use code patterns from Appsmith's open-source code as reference
- Build inspired UI in the FT Portal codebase

**Risk:** None for pattern reference. Appsmith's code is not directly useful as a library anyway (it is a low-code platform builder, not a component library).

---

### GPL v3 — ERPNext / Frappe

**What GPL v3 means:**
- Strong copyleft license
- If you incorporate GPL v3 code into your software, the entire software must be released under GPL v3
- This means your **proprietary FT Operations Portal codebase could be forced to become open source** if GPL code is copied into it
- Affects static linking, dynamic linking in most interpretations, and direct code inclusion

**What you CAN do safely:**
- Study ERPNext's codebase to understand workflow patterns, data models, and business logic
- Read ERPNext source code to understand how a Sales Order → Work Order → Material Request chain works
- Use the business knowledge you gain from reading to write your own original code
- Reference ERPNext documentation and screenshots for requirements analysis

**What you MUST NOT do:**
- Copy any ERPNext Python files into the FT Portal backend
- Copy any ERPNext Frappe doctype definitions into the FT Portal schema
- Copy any ERPNext HTML/JS/Vue templates into the FT Portal frontend
- Paraphrase code structure too closely (depends on jurisdiction, but avoid it)

**Risk Level: HIGH**

> ERPNext is the single most valuable business reference in this library due to domain similarity. It is also the most dangerous to copy from. Study it extensively, write all code from scratch.

---

### AGPL v3 — Twenty CRM, Plane, Novu Server

**What AGPL v3 means:**
- The "Affero" version of GPL extends copyleft to **network/SaaS use**
- If you run an AGPL-licensed service on a server and users access it over a network, you must release the source code of your combined work
- Even if you don't distribute the software, just running it as a web service triggers the license
- This means incorporating AGPL code into the FT Operations Portal backend (which is accessed over a network by users) would **require the entire FT Portal source code to be made public**

**What you CAN do safely:**
- Study the AGPL codebase to understand UX patterns, component structures, and architecture
- Take inspiration from the visual design and interaction patterns
- Reference the data models conceptually

**What you MUST NOT do:**
- Copy any code from Twenty CRM, Plane, or Novu Server into the FT Portal
- Even copying a small utility function carries risk

**Risk Level: VERY HIGH**

> AGPL is specifically designed to close the "SaaS loophole" in GPL. The FT Portal is a web application. Any AGPL code incorporated into it would trigger full source disclosure obligations.

---

### Business Source License (BSL 1.1) — Inngest, Trigger.dev

**What BSL 1.1 means:**
- Not an open-source license in the OSI sense
- The source code is publicly viewable but has restricted commercial use for a defined period (typically 4 years)
- After the Change Date, the code automatically converts to a specified open-source license (usually Apache 2.0)
- During the restriction period, commercial production use requires a commercial license

**What you CAN do safely:**
- Read the BSL-licensed source code to study architecture patterns and job workflow designs
- Test in a non-production, non-commercial context
- Use after the Change Date when the code has converted to Apache 2.0

**What you MUST NOT do:**
- Copy BSL code into the FT Portal production system without purchasing a commercial license
- Include BSL code as a dependency in a commercial product during the restriction period without a commercial license agreement

**Risk Level: HIGH**

> BSL is a commercial restriction, not a copyleft issue. The risk here is a commercial licensing violation rather than forced open-sourcing. Still serious.

**Practical alternative:** Both Inngest and Trigger.dev have open-source alternatives with MIT/ISC licenses:
- **BullMQ** (MIT) — Redis-based job queue for Node.js
- **pg-boss** (MIT) — PostgreSQL-based job queue for Node.js
- **Agenda** (MIT) — MongoDB-based job scheduler

Use BullMQ or pg-boss to implement the SLA scheduler and background job system for the FT Portal, using the architectural patterns studied from Inngest/Trigger.dev.

---

## What Can Be Used Directly in FT Operations Portal Production

| What | Source | License | Usage |
|---|---|---|---|
| UI components (Button, Table, Dialog, Badge, Form, etc.) | shadcn/ui | MIT | Copy, customize, use in production |
| Admin framework (resource/data provider/CRUD/RBAC) | refine | MIT | npm dependency |
| Alternative admin framework | react-admin | MIT | npm dependency (alternative to refine) |
| Notification Center React component | Novu SDK | MIT | npm dependency |

## What Must Be Used as Inspiration Only

| What | Source | License | What to Extract |
|---|---|---|---|
| SO → WO → PR → PO workflow model | ERPNext | GPL v3 | Business logic patterns → write from scratch |
| Sales Order data model (items, quantities, values, status) | ERPNext | GPL v3 | Data model design → design your own schema |
| Warehouse and stock movement patterns | ERPNext | GPL v3 | Inventory patterns → write from scratch |
| Serial number tracking patterns | ERPNext | GPL v3 | Serial tracking model → design your own |
| Supplier qualification lifecycle | ERPNext | GPL v3 | Workflow patterns → write from scratch |
| Record view layout (header, timeline, related records) | Twenty CRM | AGPL v3 | UX design inspiration only |
| Issue/CAPA data model and state machine | Plane | AGPL v3 | Conceptual model → design your own |
| Priority/assignee/status badge UI | Plane | AGPL v3 | UX/design inspiration only |
| Notification workflow architecture | Novu Server | AGPL v3 | Architecture pattern → implement with BullMQ/custom |
| Durable function / retry-on-failure job pattern | Inngest | BSL 1.1 | Architecture pattern → implement with BullMQ/MIT |
| TypeScript-native job definitions | Trigger.dev | BSL 1.1 | Pattern inspiration → implement with BullMQ/MIT |
| Dashboard widget layout | Appsmith | Apache 2.0 | UX inspiration → implement with shadcn Card |

---

## Clear Warning Summary

1. **ERPNext (GPL v3):** Never copy code. Study and rewrite everything from scratch.
2. **Twenty CRM (AGPL v3):** Never copy code. UX screenshots and pattern analysis only.
3. **Plane (AGPL v3):** Never copy code. CAPA data model and issue UX inspiration only.
4. **Novu Server (AGPL v3):** Do not self-host with your code integrated. Use Novu's MIT SDK or cloud service, or implement your own notification service.
5. **Inngest (BSL 1.1):** Cannot use in commercial production. Use BullMQ (MIT) instead.
6. **Trigger.dev (BSL 1.1):** Cannot use in commercial production. Use BullMQ (MIT) instead.

---

## Recommended Safe Alternatives for Restricted-License Capabilities

| Capability Needed | Restricted Reference | Safe Alternative | License |
|---|---|---|---|
| Background job queue with retries | Inngest, Trigger.dev | BullMQ | MIT |
| Scheduled job runner | Inngest, Trigger.dev | pg-boss | MIT |
| Notification center (React) | Novu (MIT SDK available) | Novu SDK or build custom | MIT |
| ERP workflow logic | ERPNext | Write from scratch inspired by patterns | N/A |
| CAPA/Issue tracking UI | Plane | Build with shadcn/ui components | MIT |
| Record view with timeline | Twenty CRM | Build with shadcn/ui + refine | MIT |
