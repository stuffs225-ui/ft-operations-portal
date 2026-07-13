-- ── 110_quotation_document_type_customer_docs.sql ────────────────────────────
-- Bug fix: QuotationDetail's "Specification Documents" upload panel offers
-- 'customer_po' and 'customer_contract' as document types (copied from the
-- project_document_type set), but quotation_document_type (migration 017)
-- never had those values — uploading with either fails with
-- "invalid input value for enum quotation_document_type: customer_po/customer_contract".
-- Apply supervised in the SQL Editor. Idempotent (ADD VALUE IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'customer_po';
ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'customer_contract';
