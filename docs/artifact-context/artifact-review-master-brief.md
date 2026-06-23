# FT Operations Portal — Artifact Review Master Brief

## Purpose

This directory contains real-auth role-based screenshots of every accessible page in the FT Operations Portal, captured as a visual baseline before any UX redesign work begins. The screenshots are used with Claude Artifacts to produce current-state designs and improvement proposals.

## How to Use Screenshots for Artifact-Based UX Redesign

1. Open `screenshots/index.html` for the full visual gallery.
2. Pick a module (start with 01-Sales, work in order).
3. Open the per-module `artifact-brief.md` for review checklist.
4. Paste relevant screenshots into Claude and use this prompt pattern:
   > "Here are the current screenshots of [Module] for the [Role] user. Redesign the [page] as an HTML/CSS Artifact. Preserve all existing actions, data fields, and role capabilities. Improve visual hierarchy, information density, and modern enterprise SaaS aesthetics. Do not invent new features."
5. Review the Artifact output against the original.
6. If satisfied, request an implementation spec from the Artifact.

## Module Improvement Order

| # | Module | Status |
|---|--------|--------|
| 01 | Sales | → Start here |
| 02 | Sales Coordinator | |
| 03 | Projects / Sales Orders | |
| 04 | Procurement | |
| 05 | Store / Warehouse | |
| 06 | Factory / Production | |
| 07 | QC / NCR / Release | |
| 08 | Dubai / AFS | |
| 09 | After Sales | |
| 10 | Reports | |
| 11 | Control Tower | |
| 12 | Admin | |
| 13 | Viewer / Management | |
| 14 | Shared | |

## Non-Negotiable Artifact Rules

- **Use screenshots as source of truth** — do not redesign from imagination.
- **Preserve all visible actions** — every button, link, form field that exists must remain.
- **Preserve role capabilities** — a sales_user cannot gain procurement features from a redesign.
- **Do not invent features** — if it's not in the screenshot, it doesn't exist yet.
- **Produce Artifact first** — always generate the HTML/CSS Artifact before writing implementation spec.
- **Implementation spec second** — only after the Artifact is reviewed and approved.

## Screenshot Auth Mode

Screenshots must be captured in REAL_AUTH mode (real Supabase credentials). Dev-mode admin-only screenshots are not valid for role-based review.

## Technical Notes

- Viewport: 1440×1000 desktop
- Auth: per-account Supabase login via Playwright
- Route source: `src/app/App.tsx` + `src/lib/roleMatrix.ts`
- Access-restricted screenshots show the RequireRole 403 panel (intentional — documents access boundaries)
