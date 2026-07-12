// ── Quotation clarification thread (C1) ───────────────────────────────────────
// Append-only, multi-round thread between the sales coordinator and the salesman
// on a quotation. Text + optional attachment (reuses the quotation-documents
// bucket / quotation_documents table). Rides quotation_clarifications' RLS.
//
// Deferred-migration safety: if migration 106 is not applied yet, reads return
// `unavailable: true` (never an error) so the page renders a "pending" notice.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';
import type { UserRole } from '../types';

export type ClarificationDirection = 'coordinator_request' | 'sales_reply';

export interface QuotationClarification {
  id: string;
  quotation_id: string;
  author_id: string | null;
  author_name: string | null;
  author_role: UserRole | null;
  direction: ClarificationDirection;
  body: string;
  document_id: string | null;
  document_name?: string | null;
  document_url?: string | null;
  created_at: string;
}

export interface ClarificationListResult {
  data: QuotationClarification[];
  /** True when migration 106 is not applied — show a "pending" notice, not an error. */
  unavailable: boolean;
  error: string | null;
}

export async function listClarifications(quotationId: string): Promise<ClarificationListResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], unavailable: false, error: null };
  }
  const { data, error } = await supabase
    .from('quotation_clarifications')
    .select('*, quotation_documents(document_name, file_path)')
    .eq('quotation_id', quotationId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) return { data: [], unavailable: true, error: null };
    return { data: [], unavailable: false, error: error.message };
  }

  const rows = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const doc = row.quotation_documents as { document_name?: string; file_path?: string } | null;
    return {
      ...(row as unknown as QuotationClarification),
      document_name: doc?.document_name ?? null,
      document_url: doc?.file_path ?? null,
    };
  });
  return { data: rows, unavailable: false, error: null };
}

export interface AddClarificationInput {
  quotationId: string;
  direction: ClarificationDirection;
  body: string;
  authorId: string | null;
  authorName: string | null;
  authorRole: UserRole | null;
  /** Optional attachment — uploaded to the quotation-documents bucket. */
  file?: File | null;
}

export async function addClarification(
  input: AddClarificationInput,
): Promise<{ ok: boolean; unavailable: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, unavailable: false, error: 'Supabase is not configured.' };
  }
  const db = supabase;

  let documentId: string | null = null;
  if (input.file) {
    const path = `${input.quotationId}/clarifications/${Date.now()}-${input.file.name}`;
    const up = await db.storage.from('quotation-documents').upload(path, input.file);
    if (up.error) return { ok: false, unavailable: false, error: up.error.message };
    const { data: doc, error: docErr } = await db
      .from('quotation_documents')
      .insert({
        quotation_request_id: input.quotationId,
        document_name: input.file.name,
        file_path: path,
        document_type: 'clarification',
        uploaded_by: input.authorId,
      })
      .select('id')
      .single();
    if (docErr) return { ok: false, unavailable: false, error: docErr.message };
    documentId = (doc as { id: string }).id;
  }

  const { error } = await db.from('quotation_clarifications').insert({
    quotation_id: input.quotationId,
    author_id: input.authorId,
    author_name: input.authorName,
    author_role: input.authorRole,
    direction: input.direction,
    body: input.body.trim(),
    document_id: documentId,
  });

  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}
