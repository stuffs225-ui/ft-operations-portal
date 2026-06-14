# Research Rules — FT-Ops-Reference-Library

## Purpose of This Document

This document defines the rules for how external repositories in this library should be researched, evaluated, and used. These rules protect the company from license violations, ensure code quality, and maintain a clean boundary between reference material and the production FT Operations Portal system.

---

## Rule 1 — Repository Classification

Every reference repository must be classified into one of the following usage categories before any pattern is transferred to production:

| Category | Description |
|---|---|
| **Direct Code** | Code can be used as-is or with minor modifications. MIT or Apache 2.0 license required. |
| **Component Pattern** | The structural pattern (props, composition, state flow) can be replicated in new code. |
| **Workflow Pattern** | The business workflow logic can be replicated in new business logic code. |
| **UX Pattern** | The user interface layout, interaction pattern, or visual design can be used as design inspiration. |
| **Data Model Reference** | The entity/table structure or field design can inform our own schema. |
| **Architecture Reference** | The system architecture, service boundaries, or module design can inform our own architecture. |
| **Inspiration Only** | The project gives ideas and direction but no code, pattern, or model should be directly extracted. |

---

## Rule 2 — License Caution Rules

### MIT / Apache 2.0 — Green
- Code can be used directly with attribution
- Components can be integrated as-is
- Must retain license header and attribution

### BSD 2-Clause / BSD 3-Clause — Green
- Same as MIT for practical purposes
- Retain license header

### Business Source License (BSL) — Yellow / Caution
- Code converts to open source after a defined period (usually 4 years)
- Current version may NOT be used in commercial production without a commercial license
- Use as architecture/pattern reference only
- Do NOT copy BSL code into the production system

### GPL v2 / GPL v3 — Red / Restricted
- Copying GPL code into a proprietary system creates "copyleft contamination"
- The entire production codebase could be required to become GPL
- **Use as reference and inspiration only — never copy GPL code into the production system**
- Data model analysis and workflow pattern analysis are acceptable

### AGPL v3 — Red / Restricted
- More restrictive than GPL — includes server-side / SaaS use cases
- Even running an AGPL system that users connect to over a network triggers copyleft obligations
- **Use as inspiration only — no code extraction, no data model direct copy without legal review**

### Commercial / Proprietary — Not in this library
- If a reference turns out to require a commercial license for pattern use, flag it and exclude it

---

## Rule 3 — Transfer Rules to Production

When a pattern from a reference is ready to be transferred to the production FT Operations Portal repository, follow these steps:

1. **Document the source** in the implementation ticket:
   - Reference repository name
   - Specific file or pattern being referenced
   - License of the source
   - Usage category (from Rule 1)

2. **Write new code** — do not copy-paste. Understand the pattern and implement it in our own codebase from scratch, unless the license is MIT/Apache 2.0 and the code is being used as a library (imported, not copied).

3. **Verify license** in `analysis/05-license-risk-notes.md` before transfer.

4. **For GPL/AGPL references** — get written approval from company legal/management before any transfer, even if you believe it is "inspiration only."

5. **For BSL references** — note in the implementation ticket that the pattern is inspired by a BSL project and no code was copied.

---

## Rule 4 — Submodule / Link Update Rules

If reference repositories are added as git submodules:
- Submodules are pinned to a specific commit — update intentionally, never automatically
- Document the commit SHA and date of any submodule update
- Re-run license analysis after any submodule update

If reference repositories are documented as links in `references/repository-index.md`:
- Note the repository state as of the analysis date (commit SHA or release version if available)
- Re-review if significant time passes before the pattern is used in production

---

## Rule 5 — Scope Boundary

This library must never contain:
- Production FT Operations Portal application code
- Production database schemas or migration files
- Production environment configuration
- Customer data or operational data
- Any code intended to be deployed directly to production

---

## Rule 6 — Documentation Standard for New References

When adding a new reference repository to this library, always document:

1. Repository name and GitHub URL
2. License
3. Tech stack
4. Main purpose
5. Which FT Operations Portal modules it maps to
6. Usage category (from Rule 1)
7. Fit score (1–5)
8. Priority (Use now / Use later / Reference only / Avoid)
9. Key risks
10. Recommendation
