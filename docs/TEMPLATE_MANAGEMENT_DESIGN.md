# Template Management — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer
**Migration:** `064_document_templates.sql`

## Purpose
Departments use standard letters, forms, checklists, and reports. This module
lets any department submit a template, routes it through Admin approval, and
makes approved templates available per a visibility scope.

## Tables
- **document_templates** — `template_code` (unique), `template_name`,
  `template_type` (letter/report/form/checklist/pdf_template/word_template/
  email_template/operational/other), `department`, `template_body`,
  `template_format` (rich_text/plain_text/html/file/pdf/docx/other),
  `approval_status` (draft/submitted_for_approval/approved/rejected/archived),
  submit/approve/reject actor+timestamps, `rejection_reason`, `version`,
  `is_active`, `visibility_scope` (department/all_departments/admin_only).
- **template_fields** — placeholder definitions: `field_key`, `field_label`,
  `field_type`, `is_required`, `default_value`, `help_text`, `display_order`,
  `options_json`. Unique on `(template_id, field_key)`.
- **generated_documents** — saved rendered copies (see
  `FILLABLE_TEMPLATES_DESIGN.md`).

## Governance
- Any authenticated department user may submit a template (`draft` →
  `submitted_for_approval`).
- Only **admin / operations_manager** may approve / reject / archive.
- Rejection **requires a reason** (`rejection_reason`).
- Approved templates become visible per `visibility_scope`.
- **Approved templates cannot be edited directly** — users create a new
  version / new submission. RLS blocks submitter UPDATE once `approved`.
- Versions are tracked via `version` (`v1`, `v2`, …).

## RLS (migration 064)
- `dt_admin_all` — admin/ops full access.
- `dt_user_insert` — `submitted_by = auth.uid()` and status in
  draft/submitted_for_approval.
- `dt_user_update_own` — submitter may edit only while
  draft/submitted_for_approval/rejected and cannot self-approve.
- `dt_select_scope` — submitter sees own; otherwise approved+active templates per
  visibility scope (`all_departments` to all; `admin_only` to admin/ops;
  `department` visible to authenticated users with department filtering applied in
  the application layer to avoid RLS recursion on `profiles`).
- `template_fields` follow parent-template access.

## Pages
- `/templates` — library (Approved / Department / Pending / My Submitted).
- `/templates/new` — create template + define fields.
- `/templates/:id` — template detail + approve/reject (admin/ops).
- `/templates/approvals` — admin approval queue.
- `/templates/generate/:id`, `/templates/generated`, `/templates/generated/:id`
  — see fillable-templates doc.

## Dev mode
All pages fall back to `src/data/mockTemplates.ts`. Writes simulate with
`setTimeout` and show "Dev mode — changes not persisted".

## Files / storage
Template `file_name` / `storage_path` support file-based templates, but the
upload UI is **not yet wired** (same gap as the rest of the app — see
`DOCUMENT_UPLOAD_GOVERNANCE.md`). Text/placeholder templates work fully today.
