# FT Operations Portal — Artifact Review Master Brief

## Purpose

This directory contains per-module artifact review briefs and the screenshot baseline for the FT Operations Portal design and UX transformation. The screenshots capture the current state of the application for every accessible route, per user role, before any UX improvements are made.

## How to Use This Review

1. Open `screenshots/index.html` in a browser to view the visual gallery.
2. Refer to each module's `artifact-brief.md` for the review checklist and open issues.
3. The master brief (this file) tracks cross-cutting concerns that span modules.

## Modules

| # | Slug | Module | Primary Roles |
|---|------|--------|--------------|
| 01 | `01-sales` | Sales | sales_user, sales_coordinator, admin |
| 02 | `02-sales-coordinator` | Sales Coordinator | sales_coordinator, admin |
| 03 | `03-projects-so` | Projects / Sales Orders | admin, ops_manager, sales_user, procurement, factory, store, qc |
| 04 | `04-procurement` | Procurement | procurement_user, admin |
| 05 | `05-store-warehouse` | Store / Warehouse | store_user, admin |
| 06 | `06-factory` | Factory | factory_user, admin |
| 07 | `07-qc` | Quality Control | qc_user, admin |
| 08 | `08-dubai-afs` | Dubai AFS | afs_user, admin |
| 09 | `09-after-sales` | After Sales | sales_user, afs_user, admin |
| 10 | `10-reports` | Reports | admin, operations_manager |
| 11 | `11-control-tower` | Control Tower | admin, operations_manager |
| 12 | `12-admin` | Admin | admin |
| 13 | `13-viewer-management` | Viewer / Management | viewer, admin |
| 14 | `14-shared` | Shared | all roles |

## Cross-Cutting Issues to Review

### Design System
- [ ] Inconsistent button radius across pages
- [ ] Badge variants used inconsistently (pill vs. rectangle)
- [ ] Card borders and shadow inconsistencies
- [ ] Typography: heading weight and letter-spacing

### Navigation
- [ ] Active sidebar indicator visibility
- [ ] Role-based menu item visibility per account
- [ ] Mobile/responsive breakpoints

### Data Tables
- [ ] Table header treatment (uppercase, tracking)
- [ ] Row hover states
- [ ] Empty state quality per module

### Forms
- [ ] Input focus rings
- [ ] Form layout density
- [ ] Error state rendering

### Accessibility
- [ ] Focus-visible rings on interactive elements
- [ ] Colour contrast on badge/status variants
- [ ] ARIA labels on icon-only buttons

## Screenshot Baseline Date

Generated as part of the Phase 1 design system modernisation initiative.
See `docs/implementation/tooling-full-role-page-screenshot-baseline.md` for full methodology.
