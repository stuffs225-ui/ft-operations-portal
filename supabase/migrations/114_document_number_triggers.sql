-- ── 114_document_number_triggers.sql ──────────────────────────────────────────
-- System-critique v2 fix: three document numbers were generated CLIENT-SIDE with
-- broken patterns, while every QC entity already generates numbers server-side
-- (migrations 035–038). This migration brings MNT / PO / PR up to the same
-- standard:
--
--   • afs_maintenance_requests.maintenance_request_number was count+1 in the
--     browser against a NOT NULL UNIQUE column → two users submitting together
--     collided ("Failed to submit"), and the sequence counted ALL years while
--     the label used the current year (wrong after a year rollover).
--   • purchase_orders_to_supplier.po_number was Math.random() with 900 possible
--     values per month and NO unique constraint → silent duplicate PO numbers.
--   • procurement_requests.pr_number — same random pattern; UNIQUE(project_id,
--     pr_number) turned collisions into confusing insert errors.
--
-- Each trigger fires BEFORE INSERT only when the client sends NULL/'' — numbers
-- typed by the user (e.g. externally-issued PO numbers) are never overridden.
-- The client now prefills MAX+1 itself (src/lib/docNumbers.ts), so these
-- triggers are the safety net for any other insert path.
--
-- Also adds a GUARDED unique index on po_number: created only if no duplicates
-- already exist (otherwise it raises a NOTICE listing how many duplicates need
-- manual cleanup first — the migration still succeeds).
--
-- Idempotent. Apply supervised in the SQL Editor.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Maintenance request numbers: MNT-YYYY-#### (per-year sequence) ─────────
CREATE OR REPLACE FUNCTION generate_mnt_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(maintenance_request_number FROM 10) AS int)), 0) + 1
    INTO seq
    FROM afs_maintenance_requests
    WHERE maintenance_request_number ~ ('^MNT-' || to_char(now(), 'YYYY') || '-\d+$');
  NEW.maintenance_request_number := 'MNT-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mnt_number ON afs_maintenance_requests;
CREATE TRIGGER trg_mnt_number BEFORE INSERT ON afs_maintenance_requests
  FOR EACH ROW WHEN (NEW.maintenance_request_number IS NULL OR NEW.maintenance_request_number = '')
  EXECUTE FUNCTION generate_mnt_number();

-- ── 2. PO numbers: PO-YYMM-#### (per-month sequence) ──────────────────────────
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS int)), 0) + 1
    INTO seq
    FROM purchase_orders_to_supplier
    WHERE po_number ~ ('^PO-' || to_char(now(), 'YYMM') || '-\d+$');
  NEW.po_number := 'PO-' || to_char(now(), 'YYMM') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_po_number ON purchase_orders_to_supplier;
CREATE TRIGGER trg_po_number BEFORE INSERT ON purchase_orders_to_supplier
  FOR EACH ROW WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION generate_po_number();

-- ── 3. PR numbers: PR-YYMM-#### (per-month sequence) ──────────────────────────
CREATE OR REPLACE FUNCTION generate_pr_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 9) AS int)), 0) + 1
    INTO seq
    FROM procurement_requests
    WHERE pr_number ~ ('^PR-' || to_char(now(), 'YYMM') || '-\d+$');
  NEW.pr_number := 'PR-' || to_char(now(), 'YYMM') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pr_number ON procurement_requests;
CREATE TRIGGER trg_pr_number BEFORE INSERT ON procurement_requests
  FOR EACH ROW WHEN (NEW.pr_number IS NULL OR NEW.pr_number = '')
  EXECUTE FUNCTION generate_pr_number();

-- ── 4. Guarded unique index on po_number ──────────────────────────────────────
-- Only created when the data is already clean; otherwise reports the duplicates
-- and leaves them for manual cleanup (re-run this migration afterwards).
DO $$
DECLARE dup_count int;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT po_number FROM purchase_orders_to_supplier
    GROUP BY po_number HAVING COUNT(*) > 1
  ) d;
  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_po_number
      ON purchase_orders_to_supplier (po_number);
    RAISE NOTICE 'Unique index on po_number created.';
  ELSE
    RAISE NOTICE 'SKIPPED unique index: % duplicate po_number value(s) exist. Clean them up (SELECT po_number, COUNT(*) FROM purchase_orders_to_supplier GROUP BY po_number HAVING COUNT(*) > 1) and re-run.', dup_count;
  END IF;
END $$;
