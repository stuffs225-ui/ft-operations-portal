-- ── Migration 087: Quotation Required Document Gates ──────────────────────────
--
-- Implements two DB-level governance gates on quotation_requests:
--
--   R-001 (PARTIAL): Quotation cannot be submitted without a specification file.
--       Gap source: Step 7A dependency doc §4.2 / governance register R-001 /
--                   backlog B-008.
--       Enforcement: BEFORE UPDATE trigger only.
--
--       KNOWN STRUCTURAL LIMITATION — INSERT PATH:
--           QuotationNew.tsx inserts the quotation with quotation_status =
--           'submitted_by_sales' in a single INSERT, then inserts documents in
--           a separate API call afterward.  A BEFORE UPDATE trigger cannot
--           intercept an INSERT, and a BEFORE INSERT trigger cannot check
--           documents that do not yet exist.  R-001 for the INSERT path is
--           therefore TIER-3 (UI validation in QuotationNew.tsx line 183:
--           form.documents.length === 0 check).  Full DB-level enforcement
--           requires changing the submission flow to a two-step pattern
--           (INSERT as 'draft' → UPDATE to 'submitted_by_sales'), which is
--           outside the scope of this migration.
--
--           Paths covered by this trigger (TIER-1):
--             • Any direct API UPDATE that changes quotation_status to
--               'submitted_by_sales' — e.g., draft → submitted_by_sales,
--               need_clarification → submitted_by_sales.
--             • Any future UI path that UPDATEs the status (resubmit after
--               clarification, batch admin status set, etc.).
--
--   R-002 (FULL): Quotation cannot be returned to Sales without:
--       (a) quotation number, and (b) quotation PDF document.
--       Gap source: governance register R-002 / backlog B-009.
--       Enforcement: BEFORE UPDATE trigger — covers all paths because
--       'returned_to_sales' is always set via UPDATE in the current system
--       (handleReturnToSales in QuotationDetail.tsx).
--
-- Document evidence used:
--   R-001: EXISTS row in quotation_documents where
--              quotation_request_id = NEW.id
--          AND document_type = 'specification_file'
--   R-002: NEW.quotation_number IS NOT NULL AND trim(NEW.quotation_number) != ''
--          AND EXISTS row in quotation_documents where
--              quotation_request_id = NEW.id
--          AND document_type = 'quotation_pdf'
--
-- Role impact:
--   Enforced for ALL roles — including admin and operations_manager.
--   Neither gate has a role override because both are DATA COMPLETENESS rules,
--   not access-control rules.  Admin can satisfy the gate by uploading the
--   required document before triggering the status change.
--
-- No RLS policies modified.  No schema changed.
-- This is a belt-and-suspenders guard on top of existing UI validation.
--
-- Trigger ordering on quotation_requests (alphabetical, all BEFORE UPDATE):
--   1. quotation_updated_at          (migration 015) — sets updated_at, passthrough
--   2. trg_quotation_document_gates  (this migration) — R-001 + R-002 gate
--   3. trg_quotation_status_transition_guard (migration 086) — coordinator block
--
--   Ordering is safe: the document gate checks 'submitted_by_sales' and
--   'returned_to_sales' only; the coordinator guard checks 'converted_to_so',
--   'cancelled', 'closed_lost', 'converted_to_hot_project' only.  No overlap.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_quotation_document_gates ON public.quotation_requests;
--   DROP FUNCTION IF EXISTS public.enforce_quotation_document_gates();

-- ── Trigger function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_quotation_document_gates()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Pass-through: quotation_status is not changing.
  -- Covers all non-status updates (remarks, coordinator notes, line values, etc.)
  IF NEW.quotation_status IS NOT DISTINCT FROM OLD.quotation_status THEN
    RETURN NEW;
  END IF;

  -- ── R-001: Submission gate ─────────────────────────────────────────────────
  --
  -- Block status transition TO 'submitted_by_sales' when no specification file
  -- exists in quotation_documents for this quotation.
  --
  -- Applies on all UPDATE paths (draft → submitted, need_clarification →
  -- submitted, any direct API UPDATE).
  --
  -- NOTE: Does NOT apply to the INSERT path in QuotationNew.tsx — see header
  -- comment for the structural limitation explanation.
  IF NEW.quotation_status = 'submitted_by_sales'
     AND OLD.quotation_status IS DISTINCT FROM 'submitted_by_sales'
  THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.quotation_documents
       WHERE quotation_request_id = NEW.id
         AND document_type = 'specification_file'
    ) THEN
      RAISE EXCEPTION
        'Governance violation (R-001): Quotation % cannot be submitted without '
        'at least one specification file. Upload a specification document '
        '(document type: specification_file) before submitting.',
        NEW.quotation_code
        USING errcode = 'P0001';
    END IF;
  END IF;

  -- ── R-002: Return-to-sales gate ────────────────────────────────────────────
  --
  -- Block status transition TO 'returned_to_sales' unless:
  --   (a) quotation_number is present (non-null, non-blank), AND
  --   (b) at least one quotation PDF document exists in quotation_documents.
  --
  -- Fully enforced: handleReturnToSales in QuotationDetail.tsx always reaches
  -- this trigger via UPDATE.  No INSERT path exists for this transition.
  IF NEW.quotation_status = 'returned_to_sales'
     AND OLD.quotation_status IS DISTINCT FROM 'returned_to_sales'
  THEN
    -- (a) Quotation number check
    IF NEW.quotation_number IS NULL OR trim(NEW.quotation_number) = '' THEN
      RAISE EXCEPTION
        'Governance violation (R-002): Quotation % cannot be returned to Sales '
        'without a quotation number. Enter the quotation number before returning.',
        NEW.quotation_code
        USING errcode = 'P0001';
    END IF;

    -- (b) Quotation PDF document check
    IF NOT EXISTS (
      SELECT 1
        FROM public.quotation_documents
       WHERE quotation_request_id = NEW.id
         AND document_type = 'quotation_pdf'
    ) THEN
      RAISE EXCEPTION
        'Governance violation (R-002): Quotation % cannot be returned to Sales '
        'without a quotation PDF. Upload the quotation PDF document '
        '(document type: quotation_pdf) before returning.',
        NEW.quotation_code
        USING errcode = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger attachment ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_quotation_document_gates ON public.quotation_requests;
CREATE TRIGGER trg_quotation_document_gates
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quotation_document_gates();
