-- ─────────────────────────────────────────────────────────────────────────────
-- E2E Full-Workflow Validation — SELECT-ONLY
--
-- Validates the records created by tools/e2e/e2e-full-workflow.ts for ONE run.
-- Replace <RUN_ID> below with the run id printed by the seeder
-- (e.g. e2e-20260703142255-a1b2), then run in the Supabase SQL editor.
--
-- Every seeded row carries the tag  E2E_SCENARIO_SEED run_id=<RUN_ID> scenario=…
-- in a remarks/notes column, and an  E2E-<shortid>  prefix in every number/code
-- column the seeder controls. This file contains SELECT statements only —
-- no INSERT / UPDATE / DELETE / TRUNCATE / DDL.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Set your run id once (psql-style; in the SQL editor just search-replace) ─
-- \set run_id 'e2e-20260703142255-a1b2'
-- Everywhere below, replace <RUN_ID> with the actual run id.

-- ── 1. Per-table tagged record counts for the run ─────────────────────────────
SELECT 'quotation_requests' AS tbl, count(*) AS seeded
  FROM quotation_requests           WHERE sales_remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'projects', count(*)
  FROM projects                     WHERE notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'procurement_requests', count(*)
  FROM procurement_requests         WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'procurement_request_items', count(*)
  FROM procurement_request_items    WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'purchase_orders_to_supplier', count(*)
  FROM purchase_orders_to_supplier  WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'store_receipts', count(*)
  FROM store_receipts               WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'store_receipt_items', count(*)
  FROM store_receipt_items          WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'medical_serial_numbers', count(*)
  FROM medical_serial_numbers       WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'vehicle_receipts', count(*)
  FROM vehicle_receipts             WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'vehicle_receipt_photos', count(*)
  FROM vehicle_receipt_photos       WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'material_custody_records', count(*)
  FROM material_custody_records     WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'material_qc_inspections', count(*)
  FROM material_qc_inspections      WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'material_ncrs', count(*)
  FROM material_ncrs                WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'project_invoicing_plans', count(*)
  FROM project_invoicing_plans      WHERE notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'project_invoice_milestones', count(*)
  FROM project_invoice_milestones   WHERE notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
UNION ALL
SELECT 'project_invoicing_schedule (manual)', count(*)
  FROM project_invoicing_schedule   WHERE schedule_description LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\';

-- ── 2. Workflow-chain integrity for the run's projects ────────────────────────
-- Every tagged project with its downstream chain counts.
SELECT
  p.project_code,
  p.so_number,
  p.project_status,
  (SELECT count(*) FROM procurement_requests pr        WHERE pr.project_id = p.id)  AS prs,
  (SELECT count(*) FROM purchase_orders_to_supplier po WHERE po.project_id = p.id)  AS pos,
  (SELECT count(*) FROM store_receipts sr              WHERE sr.project_id = p.id)  AS receipts,
  (SELECT count(*) FROM material_qc_inspections qi     WHERE qi.project_id = p.id)  AS qc_inspections,
  (SELECT count(*) FROM material_ncrs n                WHERE n.project_id = p.id)   AS ncrs,
  (SELECT count(*) FROM dubai_project_followups df     WHERE df.project_id = p.id)  AS afs_followups,
  (SELECT count(*) FROM project_invoicing_schedule s   WHERE s.project_id = p.id)   AS invoicing_lines,
  (SELECT count(*) FROM project_invoice_milestones m   WHERE m.project_id = p.id)   AS milestones
FROM projects p
WHERE p.notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
ORDER BY p.so_number;

-- ── 3. Vehicle photo completeness (5-photo gate) ──────────────────────────────
-- S05 must show < 5; S06 must show 5.
SELECT
  v.chassis_number,
  v.status,
  count(ph.id) FILTER (
    WHERE ph.photo_type IN ('front','rear','left_side','right_side','chassis_plate')
      AND ph.storage_path IS NOT NULL
  ) AS required_photos_uploaded
FROM vehicle_receipts v
LEFT JOIN vehicle_receipt_photos ph ON ph.vehicle_receipt_id = v.id
WHERE v.remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
GROUP BY v.id, v.chassis_number, v.status
ORDER BY v.chassis_number;

-- ── 4. High-value PO approval gate (S04) ──────────────────────────────────────
-- Expect: approval_required = true, approval_status = 'pending', value >= 10000.
SELECT po_number, purchase_value, currency, approval_required, approval_status, po_status
FROM purchase_orders_to_supplier
WHERE remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
ORDER BY po_number;

-- ── 5. Serial / custody gates (S03, S07) ──────────────────────────────────────
SELECT ms.serial_number, ms.qc_status, ms.current_status
FROM medical_serial_numbers ms
WHERE ms.remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\';

SELECT c.custody_number, c.issue_type, c.approval_required, c.approval_status,
       c.receiver_decision, c.status
FROM material_custody_records c
WHERE c.remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\';

-- ── 6. QC failure / NCR chain (S08) ──────────────────────────────────────────
SELECT qi.inspection_number, qi.inspection_status, qi.inspection_result,
       n.ncr_number, n.ncr_status, n.severity
FROM material_qc_inspections qi
LEFT JOIN material_ncrs n ON n.material_qc_inspection_id = qi.id
WHERE qi.remarks LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
ORDER BY qi.inspection_number;

-- ── 7. Invoicing / receivables risk (S10) ─────────────────────────────────────
-- Overdue schedule lines for the run's projects (includes trigger-created rows).
SELECT s.project_id, s.sequence_no, s.schedule_label, s.invoice_amount,
       s.current_invoice_date, s.status, s.source,
       (current_date - s.current_invoice_date) AS days_past_date
FROM project_invoicing_schedule s
JOIN projects p ON p.id = s.project_id
WHERE p.notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
ORDER BY s.project_id, s.sequence_no;

-- Outstanding / overdue receivables milestones for the run.
SELECT m.milestone_name, m.milestone_status, m.amount, m.paid_amount, m.due_date
FROM project_invoice_milestones m
WHERE m.notes LIKE 'E2E_SCENARIO_SEED run\_id=<RUN_ID>%' ESCAPE '\'
ORDER BY m.milestone_name;

-- ── 8. Post-cleanup check — every count here must be 0 after cleanup ──────────
-- Re-run section 1 after `e2e:workflow:cleanup --run-id <RUN_ID>`:
-- every `seeded` value must be 0, and section 2 must return no rows.
