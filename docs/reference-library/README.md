# FT-Ops-Reference-Library

## Purpose

This repository is a **reference and research library** for the FT Operations Portal project (NAFFCO Fire Trucks / Vehicles Operations).

It collects, organizes, and analyzes external open-source repositories and product patterns that can help improve the FT Operations Portal — covering the full vehicle operations lifecycle from Quotation Request through SO, WO/PN Gate, Procurement, Factory, Store, QC, Release, Delivery, and After-Sales.

## What This Repository Is

- A curated reference library of open-source projects relevant to FT Operations Portal modules
- A set of analysis documents mapping external patterns to FT Portal business needs
- A research baseline for the development team to draw patterns, architecture inspiration, and UX ideas from
- A governance-aware research record with license risk assessment

## What This Repository Is NOT

- This is **not** the production FT Operations Portal repository
- This does **not** contain production application code
- This does **not** modify any production system, database, or UI
- External code must **not** be copied blindly into the production system

## How It Supports FT Operations Portal

The FT Operations Portal is an operational control center for NAFFCO fire truck and vehicle projects. The portal covers:

- Pre-sale: Quotation Request → Sales Coordinator → Quotation Return → Hot Project / SO
- Project execution: SO Registration → Admin Approval → Saudi (WO) or Dubai (PN) Routing
- Manufacturing: BOQ, BOM, GA Drawings, Raw Material Requests, Production Progress
- Procurement: PR → PO to Supplier → High-Value Approval → ETA → Store Receiving
- Store & Custody: Material Receiving, Vehicle Receiving, Serial Tracking, Material Issuance
- Quality: Material QC, Vehicle QC, NCR, Rework, Release Note
- Dubai / AFS: PN Gate, Dubai Tracking, AFS Arrival, Pre-delivery Reports
- After-Sales: AFS Maintenance Requests after delivery
- Governance: SLA & Escalation, Timeline & Audit, Reports & KPIs, Control Tower

This library maps each of these operational areas to relevant external open-source references.

## Repository Structure

```
references/           External repository submodules or links
  repository-index.md   Index of all reference repositories with URLs and analysis links
analysis/             Deep-dive analysis documents
  01-reference-repositories-evaluation.md
  02-ft-ops-module-to-reference-mapping.md
  03-design-system-recommendation.md
  04-implementation-opportunities-backlog.md
  05-license-risk-notes.md
  06-next-step-system-audit-brief.md
docs/                 Rules, playbook summary, and research guidelines
  research-rules.md
  ft-ops-playbook-summary.md
```

## Business Reference

The primary governance reference for all analysis in this library is:

**FT Operations Portal Governance Playbook v3.2** — the official system charter covering all 29 operational modules, governance principles, data hierarchy, roles, SLA rules, and the implementation roadmap.

## Golden Rule (from the Playbook)

> Any operational event not recorded in the system is not considered an official record for reporting, tracking, or performance measurement.

## Important Rule for Developers

Before using any pattern or component from a reference in this library, check:

1. The license classification in `analysis/05-license-risk-notes.md`
2. The usage category (Direct Code / Component Pattern / Inspiration Only) in `analysis/01-reference-repositories-evaluation.md`
3. Get legal approval before using code from GPL, AGPL, or BSL-licensed projects in the production system

---

Maintained as part of FT Operations Portal Step 1A / 1B — Reference Repository Build.
