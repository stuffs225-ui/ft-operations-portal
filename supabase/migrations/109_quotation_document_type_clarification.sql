-- ── 109_quotation_document_type_clarification.sql ────────────────────────────
-- Bug fix: the Clarifications thread (migration 106 / quotationClarifications.ts)
-- attaches an optional file to quotation_documents with document_type =
-- 'clarification', but the quotation_document_type enum (migration 017) never
-- had that value — every attachment on a clarification message fails with
-- "invalid input value for enum quotation_document_type: clarification".
-- Apply supervised in the SQL Editor. Idempotent (ADD VALUE IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'clarification';
