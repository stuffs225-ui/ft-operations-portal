/* ─────────────────────────────────────────────────────────────────────────────
 * 2026 Sales Plan — one-shot importer.
 *
 * Reads ONLY the committed dataset (tools/import/data/sales-plan-2026.json,
 * produced by extract-sales-plan-2026.ts) and loads the 2026 book into the
 * portal: projects + vehicle lines (with VAT flags) + sector + delay penalty +
 * the monthly invoicing schedule.
 *
 * SAFETY MODEL (mirrors tools/e2e/e2e-full-workflow.ts):
 *   • --mode dry-run (default): read-only. Runs the precondition checks,
 *     resolves profiles, detects already-existing SO numbers, prints every
 *     intended insert, writes a report. Writes NOTHING.
 *   • --mode run: requires IMPORT_CONFIRM=true (+ production guard). Inserts
 *     projects/lines/schedules; idempotent by so_number (existing SO → skip,
 *     never update). Every created row is tagged "PLAN2026_IMPORT run_id=<id>"
 *     in its notes/description; a manifest of created ids is written.
 *   • --mode validate: read-only reconciliation of the DB against the dataset.
 *   • --mode rollback --run-id <id>: deletes ONLY the rows recorded in that
 *     run's manifest (children before parents), re-checking the tag on each
 *     project before deleting. Never touches pre-existing data.
 *
 * DB guards respected (never bypassed, never disabled):
 *   • projects.project_code is trigger-generated (072) — we never send one.
 *   • SO approval gate (078) applies to status 'approved' — the dataset maps
 *     only sheet-"Pending" rows there, and they carry route + medical flags.
 *   • Migration 100's AFTER INSERT trigger auto-creates ONE default schedule
 *     line per project. When the plan has monthly rows for that project, the
 *     importer replaces that just-created default line (created by OUR insert
 *     a moment earlier — no pre-existing row is ever touched) with the plan
 *     lines. When the plan has no monthly breakdown it is kept as-is.
 *
 * Run:  npx tsx tools/import/import-sales-plan-2026.ts --mode dry-run
 * ──────────────────────────────────────────────────────────────────────────── */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  IMPORT_TAG, SALESMEN, assertWriteAllowed, cliArg, fail, isProductionTarget,
  log, makeServiceClient, supabaseHost,
  type Dataset, type DatasetProject,
} from './lib';

const MODE = (cliArg('mode') ?? 'dry-run') as 'dry-run' | 'run' | 'validate' | 'rollback';
const RUN_ID_ARG = cliArg('run-id');

const DATA_DIR = path.join(process.cwd(), 'tools', 'import', 'data');
const REPORT_DIR = path.join(process.cwd(), 'tools', 'import', 'reports');
const JSON_PATH = path.join(DATA_DIR, 'sales-plan-2026.json');
const XLSX_PATH = path.join(DATA_DIR, 'Trucks_and_Vehicles_2026_June.xlsx');

interface Manifest {
  run_id: string;
  tag: string;
  created_at: string;
  supabase_host: string;
  projects: { id: string; so_number: string }[];
  vehicle_lines: string[];
  schedules: string[];
  /** Trigger-created default schedule lines we kept (not replaced). */
  kept_default_schedules: string[];
  errors: { so_number: string; step: string; error: string }[];
}

// ── Dataset loading + checksum ────────────────────────────────────────────────

function loadDataset(): Dataset {
  if (!existsSync(JSON_PATH)) fail(`Dataset not found: ${JSON_PATH} — run extract-sales-plan-2026.ts first.`);
  const ds = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Dataset;
  if (existsSync(XLSX_PATH)) {
    const sha = createHash('sha256').update(readFileSync(XLSX_PATH)).digest('hex');
    if (sha !== ds.meta.xlsxSha256) {
      fail(
        'The workbook on disk does not match the committed dataset (sha256 mismatch).\n' +
        '  Re-run extract-sales-plan-2026.ts and review the diff before importing.',
      );
    }
  }
  // Internal consistency gates (same numbers the extractor verified vs the sheet TOTAL row).
  const qty = ds.projects.reduce((s, p) => s + p.lines.reduce((q, l) => q + l.sheetQuantity, 0), 0);
  const net = Math.round(ds.projects.reduce((s, p) => s + p.totalNet, 0) * 100) / 100;
  if (qty !== ds.meta.sheetTotals.qty) fail(`Dataset gate failed: qty ${qty} ≠ sheet TOTAL ${ds.meta.sheetTotals.qty}.`);
  if (Math.abs(net - ds.meta.sheetTotals.totalNet) > 1) fail(`Dataset gate failed: net ${net} ≠ sheet TOTAL ${ds.meta.sheetTotals.totalNet}.`);
  for (const p of ds.projects) {
    const schedSum = Math.round(p.schedules.reduce((s, x) => s + x.amount, 0) * 100) / 100;
    const monthCap = Math.round((p.totalNet + 1) * 100) / 100;
    if (p.schedules.length && schedSum > monthCap * 1.16) {
      fail(`Dataset gate failed: SO ${p.soNumber} schedule sum ${schedSum} exceeds plausible total (${p.totalNet}).`);
    }
  }
  return ds;
}

// ── Preconditions ─────────────────────────────────────────────────────────────

async function checkPreconditions(db: SupabaseClient, forRun: boolean): Promise<string[]> {
  const problems: string[] = [];
  const columnChecks: { table: string; column: string; migration: string }[] = [
    { table: 'projects', column: 'sector', migration: '101' },
    { table: 'projects', column: 'neg_po_number', migration: '101' },
    { table: 'projects', column: 'expected_delay_penalty_percent', migration: '101' },
    { table: 'project_vehicle_lines', column: 'vat_applicable', migration: '101' },
    { table: 'project_invoicing_schedule', column: 'id', migration: '100' },
    { table: 'sales_user_targets', column: 'id', migration: '099' },
  ];
  for (const c of columnChecks) {
    const { error } = await db.from(c.table).select(c.column).limit(1);
    if (error) {
      problems.push(`${c.table}.${c.column} is not queryable (${error.message}) — apply migration ${c.migration} first (see docs/implementation/).`);
    }
  }

  const emails = SALESMEN.map((s) => s.email);
  const { data: profs, error: profErr } = await db.from('profiles').select('id, email').in('email', emails);
  if (profErr) {
    problems.push(`profiles lookup failed: ${profErr.message}`);
  } else {
    const found = new Set((profs ?? []).map((p: { email: string }) => p.email.toLowerCase()));
    const missing = SALESMEN.filter((s) => !found.has(s.email.toLowerCase()));
    if (missing.length) {
      const msg = `${missing.length} salesman profile(s) missing: ${missing.map((m) => m.name).join(', ')} — run create-sales-users.ts first.`;
      if (forRun) problems.push(msg);
      else log(`  ⚠ ${msg}`);
    }
  }
  return problems;
}

async function resolveProfiles(db: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db.from('profiles').select('id, email').in('email', SALESMEN.map((s) => s.email));
  if (error) fail(`profiles lookup failed: ${error.message}`);
  return new Map((data ?? []).map((p: { id: string; email: string }) => [p.email.toLowerCase(), p.id]));
}

async function findExistingSoNumbers(db: SupabaseClient, ds: Dataset): Promise<Map<string, { id: string; notes: string | null }>> {
  const sos = ds.projects.map((p) => p.soNumber);
  const out = new Map<string, { id: string; notes: string | null }>();
  for (let i = 0; i < sos.length; i += 50) {
    const { data, error } = await db.from('projects').select('id, so_number, notes').in('so_number', sos.slice(i, i + 50));
    if (error) fail(`projects so_number lookup failed: ${error.message}`);
    for (const row of data ?? []) out.set(row.so_number as string, { id: row.id as string, notes: row.notes as string | null });
  }
  return out;
}

// ── Report ────────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function writeReport(name: string, sections: string[]): string {
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  writeFileSync(file, sections.join('\n\n') + '\n');
  return file;
}

function datasetSummary(ds: Dataset, existing: Map<string, unknown>, profiles: Map<string, string>): string[] {
  const bySalesman = new Map<string, { projects: number; lines: number; net: number; vat: number; sched: number }>();
  for (const p of ds.projects) {
    const b = bySalesman.get(p.salesmanName) ?? { projects: 0, lines: 0, net: 0, vat: 0, sched: 0 };
    b.projects += 1; b.lines += p.lines.length; b.net += p.totalNet;
    b.vat += p.lines.filter((l) => l.vatApplicable).length; b.sched += p.schedules.length;
    bySalesman.set(p.salesmanName, b);
  }
  const rows = [...bySalesman.entries()].map(([name, b]) =>
    `| ${name} | ${b.projects} | ${b.lines} | ${fmt(b.net)} | ${b.vat} | ${b.sched} | ${profiles.has(SALESMEN.find((s) => s.name === name)?.email ?? '') ? '✓' : 'MISSING'} |`);

  const skippedExisting = ds.projects.filter((p) => existing.has(p.soNumber));
  return [
    `## Dataset (${path.basename(JSON_PATH)})\n\n` +
    `- Workbook sha256: \`${ds.meta.xlsxSha256}\`\n` +
    `- Projects: **${ds.projects.length}** · vehicle lines: **${ds.projects.reduce((s, p) => s + p.lines.length, 0)}** · ` +
    `sheet qty: **${ds.meta.sheetTotals.qty}** · NET total: **${fmt(ds.meta.sheetTotals.totalNet)} SAR**\n` +
    `- Schedule rows planned: **${ds.projects.reduce((s, p) => s + p.schedules.length, 0)}** ` +
    `(sum ${fmt(ds.projects.reduce((s, p) => s + p.schedules.reduce((q, x) => q + x.amount, 0), 0))} SAR)\n` +
    `- VAT-flagged lines: **${ds.projects.reduce((s, p) => s + p.lines.filter((l) => l.vatApplicable).length, 0)}** · ` +
    `sector set: ${ds.projects.filter((p) => p.sector).length}/${ds.projects.length} · ` +
    `penalty % set: ${ds.projects.filter((p) => p.delayPenaltyPercent !== null).length}/${ds.projects.length}`,

    '## Per-salesman\n\n| Salesman | Projects | Lines | NET (SAR) | VAT lines | Sched rows | Profile |\n|---|---|---|---|---|---|---|\n' + rows.join('\n'),

    `## Already in the system (skipped — idempotency by so_number): ${skippedExisting.length}\n\n` +
    (skippedExisting.length ? skippedExisting.map((p) => `- ${p.soNumber} — ${p.customerName}`).join('\n') : '(none)'),

    `## Needs review (${ds.needsReview.length})\n\n` + ds.needsReview.map((n) => `- ${n}`).join('\n'),

    `## Under-production-only rows NOT imported (non-10 salesmen): ${ds.skippedUnderProductionOnly.length}\n\n` +
    '| Salesman | SO | Customer | Item | Total+VAT |\n|---|---|---|---|---|\n' +
    ds.skippedUnderProductionOnly.map((s) =>
      `| ${s.salesman} | ${s.soNumber} | ${s.customer} | ${s.item} | ${s.totalWithVat === null ? '—' : fmt(s.totalWithVat)} |`).join('\n'),
  ];
}

// ── dry-run / run ─────────────────────────────────────────────────────────────

function projectPayload(p: DatasetProject, profileId: string, tagLine: string): Record<string, unknown> {
  return {
    // project_code intentionally omitted — trigger-generated (FT-<year>-####).
    so_number: p.soNumber,
    customer_name: p.customerName,
    sales_owner_id: profileId,
    created_by: profileId,
    customer_delivery_date: p.customerDeliveryDate,
    project_status: p.projectStatus,
    manufacturing_location: p.manufacturingLocation,
    medical_items: p.medicalItems,
    total_sales_value: p.totalSalesValue,
    notes: `${tagLine}\n${p.notes}`,
    ...(p.sector ? { sector: p.sector } : {}),
    ...(p.delayPenaltyPercent !== null ? { expected_delay_penalty_percent: p.delayPenaltyPercent } : {}),
  };
}

async function dryRunOrRun(ds: Dataset) {
  const write = MODE === 'run';
  if (write) assertWriteAllowed('run (import 2026 plan)');

  const db = makeServiceClient();
  log(`\n─── 2026 PLAN IMPORT — ${write ? 'RUN (writes enabled)' : 'DRY-RUN (read-only)'} on ${supabaseHost()} ` +
      `${isProductionTarget() ? '[PRODUCTION-classified host]' : '[non-production host]'} ───`);

  log('\nPrecondition checks…');
  const problems = await checkPreconditions(db, write);
  if (problems.length) fail('Preconditions failed:\n' + problems.map((p) => `  • ${p}`).join('\n'));
  log('  ✓ migrations 099 / 100 / 101 present');

  const profiles = await resolveProfiles(db);
  const existing = await findExistingSoNumbers(db, ds);
  log(`  ✓ profiles resolved: ${profiles.size}/10 · SO numbers already in DB: ${existing.size}/${ds.projects.length}`);

  const runId = `plan26-${new Date().toISOString().slice(0, 10)}-${randomBytes(3).toString('hex')}`;
  const tagLine = `${IMPORT_TAG} run_id=${runId}`;
  const manifest: Manifest = {
    run_id: runId, tag: tagLine, created_at: new Date().toISOString(), supabase_host: supabaseHost(),
    projects: [], vehicle_lines: [], schedules: [], kept_default_schedules: [], errors: [],
  };

  const toImport = ds.projects.filter((p) => !existing.has(p.soNumber));
  log(`\n${write ? 'Importing' : 'Would import'} ${toImport.length} project(s) (${ds.projects.length - toImport.length} skipped as already present):`);

  for (const p of toImport) {
    const profileId = profiles.get(p.salesmanEmail.toLowerCase());
    if (!profileId) {
      manifest.errors.push({ so_number: p.soNumber, step: 'profile', error: `no profile for ${p.salesmanEmail}` });
      log(`  ✗ ${p.soNumber} — no profile for ${p.salesmanName} (run create-sales-users.ts first)`);
      continue;
    }
    log(`  ${write ? '→' : '·'} ${p.soNumber.padEnd(18)} ${p.salesmanName.padEnd(13)} ${p.customerName.slice(0, 34).padEnd(36)} ` +
        `${String(p.lines.length).padStart(2)} line(s)  ${fmt(p.totalSalesValue).padStart(15)} SAR  ` +
        `[${p.projectStatus}${p.sector ? `, ${p.sector}` : ''}${p.delayPenaltyPercent !== null ? `, penalty ${p.delayPenaltyPercent}%` : ''}]  ` +
        `${p.schedules.length ? `${p.schedules.length} plan month(s)` : 'default schedule kept'}`);
    if (!write) continue;

    // 1. Project
    const { data: proj, error: projErr } = await db.from('projects')
      .insert(projectPayload(p, profileId, tagLine)).select('id').single();
    if (projErr || !proj) {
      manifest.errors.push({ so_number: p.soNumber, step: 'project', error: projErr?.message ?? 'no row returned' });
      log(`    ✗ project insert failed: ${projErr?.message}`);
      continue;
    }
    manifest.projects.push({ id: proj.id as string, so_number: p.soNumber });

    // 2. Vehicle lines
    const linePayload = p.lines.map((l, i) => ({
      project_id: proj.id,
      line_number: i + 1,
      vehicle_type: l.vehicleType,
      description: l.vehicleType,
      quantity: l.quantity,
      unit_sales_value: l.unitValue,
      vat_applicable: l.vatApplicable,
      notes: `${tagLine} | 2026 plan sheet row ${l.sheetRow}` +
        (l.sheetQuantity !== l.quantity ? ` | sheet qty was ${l.sheetQuantity}` : '') +
        (l.pendingValue !== null ? ` | pending ${fmt(l.pendingValue)}` : ''),
    }));
    const { data: lineRows, error: lineErr } = await db.from('project_vehicle_lines').insert(linePayload).select('id');
    if (lineErr) {
      manifest.errors.push({ so_number: p.soNumber, step: 'vehicle_lines', error: lineErr.message });
      log(`    ✗ vehicle lines insert failed: ${lineErr.message}`);
    } else {
      manifest.vehicle_lines.push(...(lineRows ?? []).map((r: { id: string }) => r.id));
    }

    // 3. Invoicing schedule — replace OUR trigger-created default line with the
    //    plan months (or keep it when the plan has no monthly breakdown).
    const { data: autoRows, error: autoErr } = await db.from('project_invoicing_schedule')
      .select('id').eq('project_id', proj.id);
    if (autoErr) {
      manifest.errors.push({ so_number: p.soNumber, step: 'schedule_lookup', error: autoErr.message });
      continue;
    }
    if (p.schedules.length) {
      if (autoRows?.length) {
        const { error: delErr } = await db.from('project_invoicing_schedule')
          .delete().eq('project_id', proj.id).eq('source', 'delivery_date');
        if (delErr) {
          manifest.errors.push({ so_number: p.soNumber, step: 'schedule_default_replace', error: delErr.message });
        }
      }
      const schedPayload = p.schedules.map((s, i) => ({
        project_id: proj.id,
        sales_user_id: profileId,
        sequence_no: i + 1,
        schedule_label: `2026 plan — ${s.monthName}`,
        schedule_description: tagLine,
        invoice_amount: s.amount,
        original_delivery_date: p.customerDeliveryDate,
        original_invoice_date: s.invoiceDate,
        current_invoice_date: s.invoiceDate,
        status: 'scheduled',
        source: 'migration_backfill',
        created_by: profileId,
      }));
      const { data: schedRows, error: schedErr } = await db.from('project_invoicing_schedule')
        .insert(schedPayload).select('id');
      if (schedErr) {
        manifest.errors.push({ so_number: p.soNumber, step: 'schedule', error: schedErr.message });
        log(`    ✗ schedule insert failed: ${schedErr.message}`);
      } else {
        manifest.schedules.push(...(schedRows ?? []).map((r: { id: string }) => r.id));
      }
    } else {
      manifest.kept_default_schedules.push(...(autoRows ?? []).map((r: { id: string }) => r.id));
    }
  }

  // ── Reconciliation + report ──────────────────────────────────────────────────
  const importable = toImport.filter((p) => profiles.has(p.salesmanEmail.toLowerCase()));
  const sections = [
    `# 2026 Sales Plan import — ${write ? 'RUN' : 'DRY-RUN'}\n\n` +
    `- Date: ${new Date().toISOString()}\n- Host: ${supabaseHost()}\n- Mode: ${MODE}\n` +
    (write ? `- Run id: \`${runId}\`\n- Tag: \`${tagLine}\`` : '- Run id: (dry-run — nothing written)'),
    ...datasetSummary(ds, existing, profiles),
    `## ${write ? 'Result' : 'Plan'}\n\n` +
    (write
      ? `- Projects created: **${manifest.projects.length}/${importable.length}**\n` +
        `- Vehicle lines created: **${manifest.vehicle_lines.length}**\n` +
        `- Schedule rows created: **${manifest.schedules.length}** (kept default lines: ${manifest.kept_default_schedules.length})\n` +
        `- Errors: **${manifest.errors.length}**` +
        (manifest.errors.length ? '\n\n' + manifest.errors.map((e) => `  - ${e.so_number} [${e.step}]: ${e.error}`).join('\n') : '')
      : `- Would create **${importable.length}** projects, ` +
        `**${importable.reduce((s, p) => s + p.lines.length, 0)}** vehicle lines, ` +
        `**${importable.reduce((s, p) => s + p.schedules.length, 0)}** schedule rows.\n` +
        `- Profiles missing: ${toImport.length - importable.length ? toImport.filter((p) => !profiles.has(p.salesmanEmail.toLowerCase())).map((p) => p.soNumber).join(', ') : 'none'}`),
  ];
  const reportFile = writeReport(write ? 'run' : 'dry-run', sections);

  if (write) {
    const manifestFile = path.join(REPORT_DIR, `manifest-${runId}.json`);
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    log(`\nManifest: ${path.relative(process.cwd(), manifestFile)}`);
    if (manifest.errors.length) {
      log(`\n⚠ Completed with ${manifest.errors.length} error(s) — see the report. ` +
          `Rollback: npm run import:plan2026:rollback -- --run-id ${runId}`);
    } else {
      log(`\n✓ Import complete: ${manifest.projects.length} projects, ${manifest.vehicle_lines.length} lines, ${manifest.schedules.length} schedule rows.`);
      log(`  Validate: npm run import:plan2026:validate`);
    }
  }
  log(`Report:   ${path.relative(process.cwd(), reportFile)}\n`);
  if (write && manifest.errors.length) process.exit(1);
}

// ── validate ──────────────────────────────────────────────────────────────────

async function validate(ds: Dataset) {
  const db = makeServiceClient();
  log(`\n─── 2026 PLAN IMPORT — VALIDATE (read-only) on ${supabaseHost()} ───\n`);

  const issues: string[] = [];
  let found = 0;
  let tagged = 0;
  const perSalesmanDb = new Map<string, number>();

  for (const p of ds.projects) {
    const { data: proj, error } = await db.from('projects')
      .select('id, so_number, notes, total_sales_value, project_status, sector, expected_delay_penalty_percent')
      .eq('so_number', p.soNumber).maybeSingle();
    if (error) { issues.push(`${p.soNumber}: query failed — ${error.message}`); continue; }
    if (!proj) { issues.push(`${p.soNumber}: NOT in the database.`); continue; }
    found += 1;
    const isOurs = typeof proj.notes === 'string' && proj.notes.includes(IMPORT_TAG);
    if (isOurs) tagged += 1;

    if (Math.abs(Number(proj.total_sales_value) - p.totalSalesValue) > 1) {
      issues.push(`${p.soNumber}: total_sales_value ${proj.total_sales_value} ≠ dataset ${p.totalSalesValue}.`);
    }
    perSalesmanDb.set(p.salesmanName, (perSalesmanDb.get(p.salesmanName) ?? 0) + Number(proj.total_sales_value));

    const { data: lines, error: lineErr } = await db.from('project_vehicle_lines')
      .select('id, quantity, unit_sales_value, line_total_value, vat_applicable').eq('project_id', proj.id);
    if (lineErr) { issues.push(`${p.soNumber}: lines query failed — ${lineErr.message}`); continue; }
    if ((lines?.length ?? 0) !== p.lines.length) {
      issues.push(`${p.soNumber}: ${lines?.length ?? 0} lines in DB ≠ ${p.lines.length} in dataset.`);
    } else {
      const dbNet = (lines ?? []).reduce((s: number, l: { line_total_value: number }) => s + Number(l.line_total_value), 0);
      const expectedNet = p.lines.reduce((s, l) => s + l.netValue + l.roundingDrift, 0);
      if (Math.abs(dbNet - expectedNet) > 1) issues.push(`${p.soNumber}: Σ line_total_value ${dbNet} ≠ expected ${expectedNet.toFixed(2)}.`);
      const dbVat = (lines ?? []).filter((l: { vat_applicable: boolean }) => l.vat_applicable).length;
      const dsVat = p.lines.filter((l) => l.vatApplicable).length;
      if (dbVat !== dsVat) issues.push(`${p.soNumber}: ${dbVat} VAT lines in DB ≠ ${dsVat} in dataset.`);
    }

    if (p.schedules.length) {
      const { data: sched, error: schedErr } = await db.from('project_invoicing_schedule')
        .select('invoice_amount, current_invoice_date').eq('project_id', proj.id);
      if (schedErr) { issues.push(`${p.soNumber}: schedule query failed — ${schedErr.message}`); continue; }
      const dbSum = (sched ?? []).reduce((s: number, x: { invoice_amount: number }) => s + Number(x.invoice_amount), 0);
      const dsSum = p.schedules.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(dbSum - dsSum) > 1) issues.push(`${p.soNumber}: schedule sum ${dbSum} ≠ plan ${dsSum.toFixed(2)} (rows: ${sched?.length}).`);
    }
  }

  const sections = [
    `# 2026 Sales Plan import — VALIDATE\n\n- Date: ${new Date().toISOString()}\n- Host: ${supabaseHost()}`,
    `## Result\n\n- Dataset projects found in DB: **${found}/${ds.projects.length}** (tagged as imported: ${tagged})\n` +
    `- Issues: **${issues.length}**` + (issues.length ? '\n\n' + issues.map((i) => `- ${i}`).join('\n') : ' — all totals, line counts, VAT flags and schedule sums reconcile. ✓'),
    '## Per-salesman totals in DB (imported SOs, VAT-inclusive)\n\n' +
    [...perSalesmanDb.entries()].map(([k, v]) => `- ${k}: ${fmt(v)} SAR`).join('\n'),
  ];
  const reportFile = writeReport('validate', sections);
  log(`Found ${found}/${ds.projects.length} projects (${tagged} tagged) · issues: ${issues.length}`);
  for (const i of issues.slice(0, 20)) log(`  • ${i}`);
  log(`Report: ${path.relative(process.cwd(), reportFile)}\n`);
  if (issues.length) process.exit(1);
}

// ── rollback ──────────────────────────────────────────────────────────────────

async function rollback() {
  if (!RUN_ID_ARG) fail('rollback requires --run-id <id> (see the manifest file name from the run).');
  assertWriteAllowed('rollback (delete imported rows)');
  const db = makeServiceClient();

  // Prefer the local manifest; when it is absent (e.g. rollback runs in a fresh
  // GitHub Actions environment), rebuild the target set from the run tag in the
  // database itself. Both paths delete ONLY rows carrying this run's tag.
  let manifest: Manifest;
  const manifestFile = path.join(REPORT_DIR, `manifest-${RUN_ID_ARG}.json`);
  if (existsSync(manifestFile)) {
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Manifest;
    if (manifest.run_id !== RUN_ID_ARG) fail('Manifest run_id mismatch.');
  } else {
    log(`Manifest not found locally — rebuilding the target set from the "${IMPORT_TAG} run_id=${RUN_ID_ARG}" tag in the database.`);
    const { data, error } = await db.from('projects')
      .select('id, so_number')
      .like('notes', `%${IMPORT_TAG} run_id=${RUN_ID_ARG}%`);
    if (error) fail(`Tagged-project lookup failed: ${error.message}`);
    if (!data?.length) fail(`No projects carry run_id=${RUN_ID_ARG} — nothing to roll back.`);
    manifest = {
      run_id: RUN_ID_ARG,
      tag: `${IMPORT_TAG} run_id=${RUN_ID_ARG}`,
      created_at: '(rebuilt from tag)',
      supabase_host: supabaseHost(),
      projects: data.map((p: { id: string; so_number: string }) => ({ id: p.id, so_number: p.so_number })),
      vehicle_lines: [], schedules: [], kept_default_schedules: [], errors: [],
    };
    log(`Rebuilt manifest: ${manifest.projects.length} tagged project(s).`);
  }
  log(`\n─── ROLLBACK run ${RUN_ID_ARG} on ${supabaseHost()} — deletes ONLY manifest rows ───\n`);

  const projectIds = manifest.projects.map((p) => p.id);
  const deleted: Record<string, number> = {};

  // Children first. Schedule rows: everything under this run's projects
  // (covers both our plan rows and the trigger-created default lines).
  for (let i = 0; i < projectIds.length; i += 50) {
    const chunk = projectIds.slice(i, i + 50);
    const { data: d1, error: e1 } = await db.from('project_invoicing_schedule')
      .delete().in('project_id', chunk).select('id');
    if (e1) fail(`schedule delete failed: ${e1.message}`);
    deleted['project_invoicing_schedule'] = (deleted['project_invoicing_schedule'] ?? 0) + (d1?.length ?? 0);

    const { data: d2, error: e2 } = await db.from('project_vehicle_lines')
      .delete().in('project_id', chunk).select('id');
    if (e2) fail(`vehicle lines delete failed: ${e2.message}`);
    deleted['project_vehicle_lines'] = (deleted['project_vehicle_lines'] ?? 0) + (d2?.length ?? 0);

    // Tag re-checked on the project rows themselves (defense in depth).
    const { data: d3, error: e3 } = await db.from('projects')
      .delete().in('id', chunk).like('notes', `%run_id=${RUN_ID_ARG}%`).select('id');
    if (e3) fail(`projects delete failed: ${e3.message}`);
    deleted['projects'] = (deleted['projects'] ?? 0) + (d3?.length ?? 0);
  }

  log(`Deleted: ${Object.entries(deleted).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
  if ((deleted['projects'] ?? 0) !== projectIds.length) {
    log(`⚠ ${projectIds.length - (deleted['projects'] ?? 0)} project(s) were NOT deleted (tag mismatch or already removed).`);
  }
  writeReport(`rollback-${RUN_ID_ARG}`, [
    `# Rollback ${RUN_ID_ARG}\n\n- Date: ${new Date().toISOString()}\n- Host: ${supabaseHost()}`,
    '## Deleted\n\n' + Object.entries(deleted).map(([k, v]) => `- ${k}: ${v}`).join('\n'),
  ]);
  log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  if (MODE === 'rollback') return rollback();
  const ds = loadDataset();
  if (MODE === 'dry-run' || MODE === 'run') return dryRunOrRun(ds);
  if (MODE === 'validate') return validate(ds);
  fail(`Unknown --mode "${MODE}". Valid: dry-run | run | validate | rollback`);
})().catch((e) => fail(e instanceof Error ? e.stack ?? e.message : String(e)));
