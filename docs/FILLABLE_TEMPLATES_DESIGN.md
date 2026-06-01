# Fillable Document Templates — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer

## Concept
Approved templates contain `{{placeholder}}` tokens in `template_body`. Each
placeholder maps to a `template_fields` row. A user fills the fields, previews the
rendered document, generates it, and the system saves a copy in
`generated_documents`.

### Example body
```
Dear {{recipient_name}},

Please process the ownership transfer for vehicle chassis number
{{chassis_number}} under project {{project_code}} for {{customer_name}},
commercial registration number {{commercial_registration_number}}.

Date: {{date}}
```

## Render engine
`src/lib/templateRender.ts` (pure, no network):
- `extractPlaceholders(body)` → distinct `{{key}}` names (used by the template
  editor to auto-detect fields).
- `renderTemplate(body, values)` → substitutes values; **unfilled** placeholders
  render as `[key]` so missing data is obvious.
- `validateRequiredFields(fields, values)` → `{ valid, missing[] }`.
- `defaultValuesFor(fields)` → seed map from each field's `default_value`.

## Field types
text, number, date, email, phone, dropdown, textarea, and the selector types
project_selector / customer_selector / vehicle_selector / employee_selector. The
selector types render as assisted text inputs in this foundation (full pickers
can be wired to projects/customers/vehicles/profiles later).

## Workflow
1. User picks an approved template (`/templates/generate/:id`).
2. System shows the required fields (from `template_fields`).
3. User fills values; a live preview renders on the right.
4. "Generate Document" validates required fields, then inserts a
   `generated_documents` row: `generated_document_number` (`GEN-<year>-<seq>`),
   `output_title`, `filled_values_json`, `rendered_content`, `status='generated'`,
   `generated_by`, optional `project_id` / `related_module` link.
5. The generated copy is saved and listed at `/templates/generated`.
6. User can print (browser print) or download the rendered text. PDF follows the
   same options as report export (browser Print → Save as PDF, or server-side).

## RLS
`generated_documents`: users create + read their **own** documents; admin/ops see
all. `generated_by = auth.uid()` enforced on insert.

## Dev mode
Falls back to `src/data/mockTemplates.ts` (`MOCK_GENERATED_DOCUMENTS`); generate
simulates with `setTimeout`.
