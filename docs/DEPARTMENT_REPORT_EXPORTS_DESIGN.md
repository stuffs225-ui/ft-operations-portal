# Department Reporting & Exports — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer

## Goal
Let each department generate clean, professional reports from the data they
already work on (no duplicate manual entry), preview in a print-friendly layout,
and export them. Reports read existing workflow tables / mock data.

## Report registry
`src/data/departmentReports.ts` (`DEPARTMENT_REPORTS`) is the single source of
truth for the 20 report types (sales project, quotation status, PR/PO, ETA delay,
supplier, factory progress, raw material request, store receipt, vehicle
receiving, custody, medical serial tracking, material QC, NCR, project QC,
release-note readiness, Dubai/AFS follow-up, after-sales maintenance, department
performance, SLA breach, data-quality gap). Each entry carries `report_key`,
`title`, `department`, `description`, and the `roles` allowed.

## Export foundation
`src/lib/reportExport.ts`:
- `buildCsv` / `exportRowsToCsv` — RFC-4180 CSV from typed rows + column defs.
- `downloadTextFile` — client-side blob download (no network).
- `printReport` — `window.print()`; the print stylesheet in `styles/index.css`
  hides everything except `.report-print-root`.
- `saveReportSnapshot` — persists a snapshot to `report_snapshots`
  (`summary_json`, `metrics_json`, `rows_json`, filters, date range). Dev mode
  returns a synthetic id and never hits the network.

`src/components/features/ReportExportBar.tsx` is a drop-in toolbar (Print, Export
CSV, Save Snapshot, + a future "share by email" badge). It is `no-print`.

## Report layout blocks
A report view contains: title, department, owner, date range, filters,
generated-by/at, status, executive-summary block, key-metrics block, detail
table, notes/remarks. Pages wrap the printable region in `.report-print-root`.

## What is wired now
- Export bar + CSV + print + snapshot are wired into representative existing
  report pages (Procurement, Factory, Sales, SLA). The same three-line pattern
  (`import ReportExportBar`, render it under the header, wrap content in
  `.report-print-root`, pass an `onExportCsv`) extends to the remaining report
  pages incrementally.
- All other report pages continue to function unchanged.

## PDF export
No heavy PDF library is bundled. Two safe paths are documented:
1. **Browser**: Print → "Save as PDF" (works today via the print stylesheet).
2. **Server-side**: a Supabase Edge Function renders the snapshot HTML to PDF
   (e.g. with a headless renderer) and stores it in a private bucket. This keeps
   any heavy/native dependency off the client and is the recommended production
   path. `report_snapshots.rows_json` already stores everything a renderer needs.

## Sharing / scheduling
Sending a report by email/SMS is **provider-gated** — see
`SCHEDULED_REPORTS_AND_ESCALATION_DESIGN.md` and `EMAIL_SMS_INTEGRATION_PLAN.md`.
Until a provider is configured, snapshots can be generated and downloaded but not
auto-sent; the UI shows a clear "provider not configured" badge.
