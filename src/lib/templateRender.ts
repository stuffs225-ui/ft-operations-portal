// Fillable-template rendering: substitute {{field_key}} placeholders with
// user-supplied values. Pure functions, no DB / no network.

import type { TemplateField } from '../types';

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Extract the distinct placeholder keys referenced in a template body. */
export function extractPlaceholders(body: string | null | undefined): string[] {
  if (!body) return [];
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(body)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

/**
 * Render a template body by replacing each {{key}} with the matching value.
 * Unfilled placeholders are left visibly bracketed (e.g. "[recipient_name]") so
 * missing data is obvious in the preview and the generated copy.
 */
export function renderTemplate(
  body: string | null | undefined,
  values: Record<string, string>,
): string {
  if (!body) return '';
  return body.replace(PLACEHOLDER_RE, (_full, key: string) => {
    const v = values[key];
    if (v === undefined || v === null || v === '') return `[${key}]`;
    return v;
  });
}

/** True when every required field has a non-empty value. */
export function validateRequiredFields(
  fields: TemplateField[],
  values: Record<string, string>,
): { valid: boolean; missing: string[] } {
  const missing = fields
    .filter((f) => f.is_required)
    .filter((f) => {
      const v = values[f.field_key];
      return v === undefined || v === null || v.trim() === '';
    })
    .map((f) => f.field_label);
  return { valid: missing.length === 0, missing };
}

/** Seed a values map from each field's default_value. */
export function defaultValuesFor(fields: TemplateField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    out[f.field_key] = f.default_value ?? '';
  }
  return out;
}
