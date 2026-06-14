-- ── Migration 086: Quotation Status Transition Guard ──────────────────────────
--
-- Problem:
--   qr_coordinator_update (migration 060) grants sales_coordinator UPDATE
--   on ALL quotation_requests rows with no restriction on which quotation_status
--   values can be set. A coordinator can therefore directly write:
--
--     UPDATE quotation_requests SET quotation_status = 'converted_to_so'  ...
--     UPDATE quotation_requests SET quotation_status = 'cancelled'        ...
--     UPDATE quotation_requests SET quotation_status = 'closed_lost'      ...
--     UPDATE quotation_requests SET quotation_status = 'converted_to_hot_project' ...
--
--   bypassing:
--     • The formal SO conversion workflow (convert_quotation_to_so /
--       link_quotation_to_project — SECURITY DEFINER functions that enforce
--       "returned_to_sales" gate and create the project atomically).
--     • The admin / operations_manager authorization required for cancellations
--       and deal-disposition decisions (cancelled, closed_lost).
--
--   Identified as: Step 6B Class-B gap / Step 6E mandatory Step 7 pre-work item.
--
-- Fix:
--   BEFORE UPDATE trigger on quotation_requests that:
--     1. Passes through immediately when quotation_status is NOT changing.
--     2. Allows admin and operations_manager to set any status.
--     3. Blocks sales_coordinator from directly writing to the four
--        forbidden terminal / conversion statuses.
--     4. Does not restrict sales_user (sales_user RLS already limits which
--        rows they can update; the conversion path uses SECURITY DEFINER
--        functions that fire the trigger under the caller's original role).
--
-- No RLS policies are modified. No schema is changed.
-- This is a belt-and-suspenders guard on top of existing RLS.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_quotation_status_transition_guard ON public.quotation_requests;
--   DROP FUNCTION IF EXISTS public.enforce_quotation_status_transitions();

-- ── Trigger function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_quotation_status_transitions()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Pass-through: quotation_status is not changing.
  -- Covers all non-status updates (remarks, coordinator notes, line values, etc.)
  IF NEW.quotation_status IS NOT DISTINCT FROM OLD.quotation_status THEN
    RETURN NEW;
  END IF;

  v_role := public.current_user_role();

  -- admin / operations_manager retain full, unrestricted control over status.
  IF v_role IN ('admin', 'operations_manager') THEN
    RETURN NEW;
  END IF;

  -- sales_coordinator: block direct write to conversion / disposition statuses.
  --
  -- Forbidden targets and why:
  --
  --   converted_to_so
  --       Must be set exclusively by convert_quotation_to_so() or
  --       link_quotation_to_project() (SECURITY DEFINER). Those functions:
  --       (a) verify quotation is in 'returned_to_sales' first,
  --       (b) create the project / SO atomically,
  --       (c) require the caller to be admin / operations_manager / sales_user.
  --       A direct coordinator UPDATE skips all three requirements.
  --
  --   cancelled
  --       Cancellation of a live quotation requires admin or operations_manager
  --       authorization (governance rule — deals in flight cannot be silently
  --       cancelled by the coordinator).
  --
  --   closed_lost
  --       Deal-disposition decision. Must be recorded by admin/ops after
  --       commercial review — not a unilateral coordinator action.
  --
  --   converted_to_hot_project
  --       Conversion to a hot project opportunity must go through the Hot
  --       Project creation workflow or admin/ops authorization.
  --
  IF v_role = 'sales_coordinator'
     AND NEW.quotation_status IN (
       'converted_to_so',
       'cancelled',
       'closed_lost',
       'converted_to_hot_project'
     )
  THEN
    RAISE EXCEPTION
      'Governance violation: sales_coordinator may not directly set '
      'quotation_status = ''%''. % requires admin or operations_manager '
      'authorization (or the formal SO conversion workflow for converted_to_so).',
      NEW.quotation_status,
      CASE NEW.quotation_status
        WHEN 'converted_to_so'          THEN 'SO conversion'
        WHEN 'cancelled'                THEN 'Cancellation'
        WHEN 'closed_lost'              THEN 'Closed Lost deal disposition'
        WHEN 'converted_to_hot_project' THEN 'Hot Project conversion'
        ELSE                                 'This status transition'
      END
      USING errcode = 'P0001';
  END IF;

  -- All other roles / status combinations: pass through.
  -- Notes:
  --   • sales_user: RLS (qr_sales_update) already constrains direct updates to
  --     rows where status IN ('draft', 'need_clarification'). The returned_to_sales
  --     → converted_to_so transition is executed by SECURITY DEFINER functions
  --     which bypass RLS and fire this trigger under the original caller's role
  --     (sales_user) — that path remains unblocked.
  --   • viewer: has no UPDATE policy; cannot reach this trigger.
  RETURN NEW;
END;
$$;

-- ── Trigger attachment ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_quotation_status_transition_guard ON public.quotation_requests;
CREATE TRIGGER trg_quotation_status_transition_guard
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_quotation_status_transitions();
