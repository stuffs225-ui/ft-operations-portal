-- ── Migration 088: Quotation Insert Draft-Only Policy ──────────────────────────
--
-- Closes the remaining R-001 INSERT-path gap identified in Step 7C §10 and
-- documented in docs/implementation/step-7c-quotation-new-two-step-submission.md §9.
--
-- Problem:
--   qr_sales_insert (migration 015) grants sales_user INSERT on quotation_requests
--   with no restriction on quotation_status.  A caller using the Supabase client
--   directly can therefore INSERT a row with:
--
--     quotation_status = 'submitted_by_sales'
--
--   bypassing:
--     • The Step 7C two-step submission flow in QuotationNew.tsx (which always
--       inserts as 'draft' first, then UPDATEs to 'submitted_by_sales').
--     • The migration 087 BEFORE UPDATE trigger (trg_quotation_document_gates),
--       which enforces R-001 only on UPDATE — not on INSERT.
--
--   A direct INSERT with 'submitted_by_sales' and no documents would create a
--   submitted quotation with no Specification File, violating R-001 at the
--   INSERT level.
--
-- Fix:
--   Recreate qr_sales_insert with an additional WITH CHECK condition:
--
--     quotation_status = 'draft'
--
--   This restricts sales_user to INSERT only with quotation_status = 'draft'.
--   All other values ('submitted_by_sales', 'received_by_coordinator',
--   'sent_to_estimation', 'waiting_for_estimation', 'need_clarification',
--   'quotation_received', 'returned_to_sales', 'converted_to_hot_project',
--   'converted_to_so', 'cancelled', 'closed_lost') are blocked at INSERT.
--
--   After this migration, the full R-001 submission path is:
--     1. INSERT with quotation_status = 'draft'        ← this policy allows it
--     2. INSERT documents (specification_file required) ← QuotationNew.tsx step 3
--     3. UPDATE quotation_status → 'submitted_by_sales' ← migration 087 enforces R-001
--
--   The Step 7C application flow (QuotationNew.tsx) already inserts as 'draft',
--   so this RLS change does not break any current UI flow.
--
-- Impact:
--   • qr_sales_insert: dropped and recreated with quotation_status = 'draft' condition.
--   • qr_sales_update: NOT modified.
--   • qr_coordinator_update: NOT modified.
--   • qr_admin_all: NOT modified — admin/operations_manager bypass RLS and can
--     INSERT any status (needed for data migrations and admin tooling).
--   • No schema changes. No trigger changes. No other RLS policies changed.
--
-- Governance rules addressed:
--   R-001 (INSERT path): fully closed after this migration.
--   After Step 7A (migration 086) + Step 7B (migration 087) + Step 7C (application)
--   + this migration, R-001 is enforced at TIER-1 (DB level) across all paths.
--
-- Rollback:
--   DROP POLICY IF EXISTS qr_sales_insert ON public.quotation_requests;
--   CREATE POLICY qr_sales_insert ON public.quotation_requests
--     FOR INSERT WITH CHECK (
--       EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sales_user')
--     );

-- ── Policy replacement ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS qr_sales_insert ON public.quotation_requests;

CREATE POLICY qr_sales_insert ON public.quotation_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.user_roles
       WHERE user_id = auth.uid()
         AND role = 'sales_user'
    )
    AND quotation_status = 'draft'
  );
