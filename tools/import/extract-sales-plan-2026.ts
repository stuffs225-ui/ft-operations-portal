/* ─────────────────────────────────────────────────────────────────────────────
 * 2026 Sales Plan — workbook → dataset extractor.
 *
 * Deterministically converts tools/import/data/Trucks_and_Vehicles_2026_June.xlsx
 * into tools/import/data/sales-plan-2026.json (the reviewed dataset the importer
 * reads). Pure file-to-file: NO database connection, NO network.
 *
 * Source of truth: sheet "Invoicing plan 2026" (rows 2–64; row with No.=TOTAL is
 * used for reconciliation only). Sheet "Under production Orders" only ENRICHES
 * matched projects (sector, delay-penalty text, VAT detection) — it is never an
 * import source. Nothing is guessed silently: every fallback lands in
 * dataset.needsReview.
 *
 * Run:  npx tsx tools/import/extract-sales-plan-2026.ts
 * ──────────────────────────────────────────────────────────────────────────── */

import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  salesmanByName, fail, log,
  type Dataset, type DatasetLine, type DatasetProject, type DatasetSchedule,
} from './lib';

const XLSX_PATH = path.join(process.cwd(), 'tools', 'import', 'data', 'Trucks_and_Vehicles_2026_June.xlsx');
const JSON_PATH = path.join(process.cwd(), 'tools', 'import', 'data', 'sales-plan-2026.json');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ── Cell helpers ──────────────────────────────────────────────────────────────

type Ws = ExcelJS.Worksheet;

/** Raw cell value: unwraps formula results and rich text. */
function cellVal(ws: Ws, r: number, c: number): unknown {
  const v = ws.getCell(r, c).value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>;
    if ('result' in o) return o.result ?? null;
    if ('richText' in o) {
      return (o.richText as { text: string }[]).map((t) => t.text).join('');
    }
    if (v instanceof Date) return v;
    if ('error' in o) return null;
  }
  return v;
}

function cellStr(ws: Ws, r: number, c: number): string {
  const v = cellVal(ws, r, c);
  if (v === null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/\s+/g, ' ').trim();
}

function cellNum(ws: Ws, r: number, c: number): number | null {
  const v = cellVal(ws, r, c);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Leading integer out of messy cells like "7\nAug\n". */
function leadingInt(ws: Ws, r: number, c: number): number | null {
  const v = cellVal(ws, r, c);
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  const m = String(v ?? '').match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

const money = (n: number) => Math.round(n * 100) / 100;

/** Normalized SO key for cross-sheet matching: first 5–6 digit run in the cell. */
function soKey(raw: string): string | null {
  const m = raw.match(/\d{5,6}/);
  return m ? m[0] : null;
}

/** Latest d-Mon-yyyy or ISO yyyy-mm-dd date in a text blob (also accepts Date cells). */
function latestDateIn(raw: unknown): string | null {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const text = String(raw ?? '');
  const isoDates = [...text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)].map((m) => m[0]).sort();
  const re = /(\d{1,2})[\s,.-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]*(\d{4})/gi;
  const monthIdx: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  let latest: string | null = isoDates.at(-1) ?? null;
  for (const m of text.matchAll(re)) {
    const d = new Date(Date.UTC(parseInt(m[3], 10), monthIdx[m[2].slice(0, 3).toLowerCase()], parseInt(m[1], 10)));
    if (Number.isNaN(d.getTime())) continue;
    const iso = d.toISOString().slice(0, 10);
    if (!latest || iso > latest) latest = iso;
  }
  return latest;
}

function lastDayOfMonth2026(month: number): string {
  const d = new Date(Date.UTC(2026, month, 0)); // day 0 of next month
  return d.toISOString().slice(0, 10);
}

/** "…up to a maximum of 10%." → 10 */
function parsePenaltyPercent(text: string): number | null {
  const m = text.match(/maximum of\s*([\d.]+)\s*%/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

const collapse = (s: string) => s.replace(/\s*\n\s*/g, ' / ').replace(/\s+/g, ' ').trim();

// ── Raw row shapes ────────────────────────────────────────────────────────────

interface PlanRow {
  row: number;
  doneBy: string;       // carried
  orderYear: string;    // carried
  po: string;           // carried
  projNo: string;       // per-line (NOT carried)
  so: string;           // carried
  customer: string;     // carried
  joh: string;
  qty: number | null;
  total: number | null;
  pending: number | null;
  location: string;
  deliveryRaw: string;
  status: string;
  remarks: string;
  months: number[];     // index 0..11 → Jan..Dec amounts
  y2027: number | null;
}

interface EnrichRow {
  row: number;
  doneBy: string;       // carried
  so: string;           // carried
  soK: string | null;
  projNo: string;
  customer: string;     // carried
  joh: string;
  qty: number | null;
  sector: string;       // carried within group
  penaltyText: string;  // carried within group
  safeFlag: string;     // carried within group
  totalWithVat: number | null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const xlsxBytes = readFileSync(XLSX_PATH);
  const sha256 = createHash('sha256').update(xlsxBytes).digest('hex');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsxBytes as unknown as ArrayBuffer);

  const plan = wb.getWorksheet('Invoicing plan 2026');
  const under = wb.getWorksheet('Under production Orders');
  if (!plan || !under) fail('Workbook is missing "Invoicing plan 2026" / "Under production Orders" sheets.');

  const needsReview: string[] = [];

  // ── 1+2. Read "Invoicing plan 2026" rows and group them into projects ───────
  // A NEW group starts when the row's own (raw) cells introduce a new salesman,
  // a new PO#, a new SO number, or a new Customer. PO/SO/Customer carry down
  // only WITHIN a group (the sheet's visual grouping); rows with all
  // identifying cells blank inherit the group above. Salesman and order-year
  // carry across groups (one salesman owns many consecutive groups).
  const planRows: PlanRow[] = [];
  const groups: PlanRow[][] = [];
  let totalRow: { qty: number; totalNet: number; pending: number } | null = null;
  let doneByCarry = '';
  let orderYearCarry = '';
  let group = { po: '', so: '', customer: '' };

  for (let r = 2; r <= plan.rowCount; r++) {
    const no = cellStr(plan, r, 1);
    if (no.toUpperCase() === 'TOTAL') {
      totalRow = {
        qty: cellNum(plan, r, 9) ?? 0,
        totalNet: money(cellNum(plan, r, 10) ?? 0),
        pending: money(cellNum(plan, r, 11) ?? 0),
      };
      break; // everything below TOTAL is summary formulas, not data
    }
    const joh = cellStr(plan, r, 8);
    const total = cellNum(plan, r, 10);
    if (!joh && total === null) continue; // spacer row

    const rawDoneBy = cellStr(plan, r, 2);
    const rawYear = cellStr(plan, r, 3);
    const rawPo = cellStr(plan, r, 4);
    const rawSo = cellStr(plan, r, 6);
    const rawCust = cellStr(plan, r, 7).replace(/^\|\s*/, '');

    const boundary =
      groups.length === 0 ||
      (rawDoneBy !== '' && rawDoneBy !== doneByCarry) ||
      (rawPo !== '' && rawPo !== group.po) ||
      (rawSo !== '' && rawSo !== group.so) ||
      (rawCust !== '' && rawCust !== group.customer);

    if (rawDoneBy) doneByCarry = rawDoneBy;
    if (rawYear) orderYearCarry = rawYear;
    if (boundary) group = { po: rawPo, so: rawSo, customer: rawCust };

    const months: number[] = [];
    for (let m = 0; m < 12; m++) months.push(money(cellNum(plan, r, 16 + m) ?? 0));

    const pr: PlanRow = {
      row: r, doneBy: doneByCarry, orderYear: orderYearCarry,
      po: group.po, projNo: cellStr(plan, r, 5), so: group.so, customer: group.customer,
      joh, qty: leadingInt(plan, r, 9), total: total === null ? null : money(total),
      pending: cellNum(plan, r, 11) === null ? null : money(cellNum(plan, r, 11) as number),
      location: cellStr(plan, r, 12),
      // Preserve real Date cells as ISO — String(Date) is not parseable later.
      deliveryRaw: (() => {
        const v = cellVal(plan, r, 13);
        return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '');
      })(),
      status: cellStr(plan, r, 14), remarks: cellStr(plan, r, 15),
      months, y2027: cellNum(plan, r, 29),
    };
    planRows.push(pr);
    if (boundary) groups.push([pr]);
    else groups[groups.length - 1].push(pr);
  }
  if (!totalRow) fail('Could not find the TOTAL row in "Invoicing plan 2026".');

  // ── 3. Read "Under production Orders" (enrichment only) ─────────────────────
  const enrichRows: EnrichRow[] = [];
  let ec = { doneBy: '', so: '', customer: '', sector: '', penaltyText: '', safeFlag: '' };
  for (let r = 2; r <= under.rowCount; r++) {
    const joh = cellStr(under, r, 8);
    const val38 = cellNum(under, r, 38);
    if (!joh && val38 === null) continue;

    const doneBy = cellStr(under, r, 2) || ec.doneBy;
    const soCell = cellStr(under, r, 6);
    const custCell = cellStr(under, r, 7);
    const newGroup = Boolean(cellStr(under, r, 2)) || Boolean(soCell && soCell !== ec.so) || Boolean(custCell && custCell !== ec.customer);
    const so = soCell || (newGroup ? soCell : ec.so);
    const customer = custCell || (newGroup ? custCell : ec.customer);
    const sector = cellStr(under, r, 10) || (newGroup ? '' : ec.sector);
    const penaltyText = collapse(cellStr(under, r, 35)) || (newGroup ? '' : ec.penaltyText);
    const safeFlag = cellStr(under, r, 36) || (newGroup ? '' : ec.safeFlag);
    ec = { doneBy, so, customer, sector, penaltyText, safeFlag };

    enrichRows.push({
      row: r, doneBy, so, soK: soKey(so), projNo: cellStr(under, r, 5), customer, joh,
      qty: leadingInt(under, r, 9), sector, penaltyText, safeFlag,
      totalWithVat: val38 === null ? null : money(val38),
    });
  }

  const enrichByProjNo = new Map<string, EnrichRow>();
  for (const er of enrichRows) {
    if (er.projNo && !enrichByProjNo.has(er.projNo)) enrichByProjNo.set(er.projNo, er);
  }
  const enrichBySoKey = new Map<string, EnrichRow[]>();
  for (const er of enrichRows) {
    if (!er.soK) continue;
    const list = enrichBySoKey.get(er.soK) ?? [];
    list.push(er);
    enrichBySoKey.set(er.soK, list);
  }

  // ── 4. Build dataset projects ────────────────────────────────────────────────
  const STATUS_MAP: Record<string, DatasetProject['projectStatus']> = {
    'completed': 'completed', 'in progress': 'active', 'delayed': 'active', 'pending': 'approved',
  };
  const SECTOR_MAP: Record<string, DatasetProject['sector']> = {
    'private': 'private', 'gov.': 'gov', 'gov': 'gov', 'semi-gov.': 'semi_gov', 'semi-gov': 'semi_gov',
  };

  const projects: DatasetProject[] = [];
  const usedSo = new Set<string>();

  for (const g of groups) {
    const head = g[0];
    const sm = salesmanByName(head.doneBy);
    if (!sm) {
      needsReview.push(`Plan rows ${g.map((x) => x.row).join(',')}: salesman "${head.doneBy}" is not one of the 10 mapped accounts — group NOT imported.`);
      continue;
    }

    // SO number (synthetic when the sheet has none for the group)
    let soNumber = head.so;
    let soIsSynthetic = false;
    if (!soNumber) {
      const poSlug = head.po.replace(/[^A-Za-z0-9#-]+/g, '').slice(0, 24);
      soNumber = poSlug ? `PLAN26-${poSlug}` : `PLAN26-R${head.row}`;
      soIsSynthetic = true;
      needsReview.push(`Plan rows ${g.map((x) => x.row).join(',')}: no SO number in the sheet — synthetic so_number "${soNumber}" used (customer ${head.customer}).`);
    }
    if (usedSo.has(soNumber)) {
      needsReview.push(`Plan row ${head.row}: duplicate SO number "${soNumber}" in the sheet — group NOT imported (first occurrence wins).`);
      continue;
    }
    usedSo.add(soNumber);

    // Project-level status / location: first non-empty in the group; divergence flagged.
    const statuses = [...new Set(g.map((x) => x.status).filter(Boolean))];
    const sheetStatus = statuses[0] ?? '';
    if (statuses.length > 1) needsReview.push(`SO ${soNumber}: mixed sheet statuses (${statuses.join(' / ')}) — first one used.`);
    const projectStatus = STATUS_MAP[sheetStatus.toLowerCase()] ?? 'active';
    if (!sheetStatus) needsReview.push(`SO ${soNumber}: blank status in the sheet — imported as 'active'.`);

    const locations = [...new Set(g.map((x) => x.location).filter(Boolean))];
    const locRaw = (locations[0] ?? '').toLowerCase();
    if (locations.length > 1) needsReview.push(`SO ${soNumber}: mixed locations (${locations.join(' / ')}) — first one used.`);
    const manufacturingLocation = locRaw === 'dubai' ? 'dubai' : locRaw === 'ksa' ? 'saudi' : 'not_set';
    if (!locRaw) needsReview.push(`SO ${soNumber}: blank Dubai/KSA column — manufacturing_location imported as 'not_set'.`);

    const medicalItems = g.some((x) => /medical item/i.test(x.joh)) ? 'yes' : 'no';

    // Enrichment: prefer a Proj.-No line match, then the SO-key group.
    const enrichLineMatches = g
      .map((x) => (x.projNo ? enrichByProjNo.get(x.projNo) : undefined))
      .filter((x): x is EnrichRow => Boolean(x));
    const soK = soKey(soNumber);
    const enrichGroup = (soK ? enrichBySoKey.get(soK) : undefined) ?? [];
    const enrichAny = enrichLineMatches[0] ?? enrichGroup[0];

    const sector = enrichAny ? (SECTOR_MAP[enrichAny.sector.toLowerCase()] ?? null) : null;
    if (enrichAny && enrichAny.sector && !sector) {
      needsReview.push(`SO ${soNumber}: unrecognized sector "${enrichAny.sector}" in Under-production sheet — imported without sector.`);
    }
    if (!enrichAny) needsReview.push(`SO ${soNumber}: no match in "Under production Orders" — imported without sector / penalty / VAT (all default).`);

    const delayPenaltyText = enrichAny?.penaltyText || null;
    const delayPenaltyPercent = delayPenaltyText ? parsePenaltyPercent(delayPenaltyText) : null;
    if (delayPenaltyText && delayPenaltyPercent === null && delayPenaltyText !== '-') {
      needsReview.push(`SO ${soNumber}: penalty text not parseable to a % ("${delayPenaltyText}") — kept in notes only.`);
    }

    // Delivery date: latest contract date across the group.
    const contractDates = g.map((x) => latestDateIn(x.deliveryRaw)).filter((x): x is string => Boolean(x));
    const lastPlanMonth = Math.max(0, ...g.flatMap((x) => x.months.map((amt, i) => (amt > 0 ? i + 1 : 0))));
    let customerDeliveryDate: string;
    let deliveryDateSource: DatasetProject['deliveryDateSource'];
    if (contractDates.length) {
      customerDeliveryDate = contractDates.sort().at(-1) as string;
      deliveryDateSource = 'contract_text';
    } else if (lastPlanMonth > 0) {
      customerDeliveryDate = lastDayOfMonth2026(lastPlanMonth);
      deliveryDateSource = 'last_plan_month';
      needsReview.push(`SO ${soNumber}: no parseable contract delivery date — used end of last planned invoicing month (${customerDeliveryDate}).`);
    } else {
      customerDeliveryDate = '2026-12-31';
      deliveryDateSource = 'default_2026_12_31';
      needsReview.push(`SO ${soNumber}: no contract date and no monthly plan — delivery date defaulted to 2026-12-31.`);
    }

    // Lines + VAT decision.
    const lines: DatasetLine[] = [];
    const lineRatios: ('vat' | 'novat' | 'unknown')[] = [];
    for (const x of g) {
      const netValue = x.total ?? 0;
      const sheetQuantity = x.qty ?? 0;
      let quantity = sheetQuantity;
      if (quantity < 1) {
        quantity = 1;
        needsReview.push(`SO ${soNumber} row ${x.row} ("${x.joh}"): sheet quantity is ${sheetQuantity} — imported as 1 (DB requires quantity > 0).`);
      }
      const unitValue = money(netValue / quantity);
      const roundingDrift = money(quantity * unitValue - netValue);
      if (Math.abs(roundingDrift) > 0.001) {
        needsReview.push(`SO ${soNumber} row ${x.row}: unit value rounding drift of ${roundingDrift.toFixed(2)} SAR (net ${netValue} / qty ${quantity}).`);
      }

      // Per-line VAT via Proj.-No match against the enrichment sheet.
      let ratioClass: 'vat' | 'novat' | 'unknown' = 'unknown';
      const em = x.projNo ? enrichByProjNo.get(x.projNo) : undefined;
      if (em && em.totalWithVat && em.qty && em.qty > 0 && sheetQuantity > 0 && netValue > 0) {
        const ratio = (em.totalWithVat / em.qty) / (netValue / sheetQuantity);
        if (ratio >= 1.15 * 0.99 && ratio <= 1.15 * 1.01) ratioClass = 'vat';
        else if (ratio >= 0.99 && ratio <= 1.01) ratioClass = 'novat';
      }
      lineRatios.push(ratioClass);
      lines.push({
        sheetRow: x.row, vehicleType: collapse(x.joh), quantity, sheetQuantity,
        netValue, unitValue, roundingDrift,
        vatApplicable: ratioClass === 'vat',
        vatSource: ratioClass === 'unknown' ? 'unmatched_default_false' : 'proj_no_match',
        pendingValue: x.pending,
      });
    }

    // Project-aggregate VAT fallback for lines that had no Proj.-No match.
    if (lineRatios.some((rc) => rc === 'unknown') && enrichGroup.length) {
      const enrNet = enrichGroup.reduce((s, e) => s + (e.totalWithVat ?? 0), 0);
      const invNet = lines.reduce((s, l) => s + l.netValue, 0);
      if (enrNet > 0 && invNet > 0) {
        const ratio = enrNet / invNet;
        const cls: 'vat' | 'novat' | 'unknown' =
          ratio >= 1.15 * 0.99 && ratio <= 1.15 * 1.01 ? 'vat'
          : ratio >= 0.99 && ratio <= 1.01 ? 'novat' : 'unknown';
        if (cls !== 'unknown') {
          lines.forEach((l, i) => {
            if (lineRatios[i] === 'unknown') {
              l.vatApplicable = cls === 'vat';
              l.vatSource = 'so_group_match';
            }
          });
        } else {
          needsReview.push(`SO ${soNumber}: VAT ambiguous (enrichment/plan aggregate ratio ${ratio.toFixed(3)}) — VAT left OFF for unmatched lines.`);
        }
      }
    } else if (lineRatios.some((rc) => rc === 'unknown') && enrichAny) {
      needsReview.push(`SO ${soNumber}: some lines had no Proj.-No match for VAT detection — VAT left OFF for those lines.`);
    }

    // Monthly plan → schedule rows (aggregated across the group's lines).
    const schedules: DatasetSchedule[] = [];
    for (let m = 0; m < 12; m++) {
      const amount = money(g.reduce((s, x) => s + x.months[m], 0));
      if (amount > 0) {
        schedules.push({ month: m + 1, monthName: MONTHS[m], amount, invoiceDate: lastDayOfMonth2026(m + 1) });
      }
    }
    if (!schedules.length) {
      needsReview.push(`SO ${soNumber}: no 2026 monthly invoicing breakdown — the default delivery-date schedule line is kept instead.`);
    }
    const y2027 = money(g.reduce((s, x) => s + (x.y2027 ?? 0), 0));
    if (y2027 > 0) needsReview.push(`SO ${soNumber}: ${y2027.toFixed(2)} SAR planned in 2027 — NOT imported (2026 plan only).`);

    const totalNet = money(lines.reduce((s, l) => s + l.netValue, 0));
    const totalSalesValue = money(lines.reduce((s, l) => s + l.netValue * (l.vatApplicable ? 1.15 : 1), 0));

    const noteParts = [
      '[2026 Plan Import]',
      head.po ? `PO#: ${head.po}` : null,
      g.some((x) => x.projNo) ? `Proj. No: ${[...new Set(g.map((x) => x.projNo).filter(Boolean))].join(', ')}` : null,
      head.orderYear ? `Order year (sheet #): ${head.orderYear}` : null,
      sheetStatus ? `Sheet status: ${sheetStatus}` : 'Sheet status: (blank)',
      delayPenaltyText ? `Delay penalty (sheet): ${delayPenaltyText}` : null,
      enrichAny?.safeFlag ? `Penalty risk flag (sheet): ${enrichAny.safeFlag}` : null,
      ...g.filter((x) => x.deliveryRaw.trim()).map((x) => `Delivery (contract, row ${x.row}): ${collapse(String(x.deliveryRaw))}`),
      ...g.filter((x) => x.remarks).map((x) => `Remarks (row ${x.row}): ${x.remarks}`),
    ].filter((s): s is string => Boolean(s));

    projects.push({
      soNumber, soIsSynthetic, salesmanName: sm.name, salesmanEmail: sm.email,
      customerName: collapse(head.customer) || `(unnamed — row ${head.row})`,
      projectStatus, sheetStatus, manufacturingLocation, medicalItems,
      sector, delayPenaltyPercent, delayPenaltyText,
      customerDeliveryDate, deliveryDateSource,
      totalNet, totalSalesValue, notes: noteParts.join('\n'),
      lines, schedules, sheetRows: g.map((x) => x.row),
    });
  }

  // ── 5. Skipped Under-production-only rows (non-10 salesmen, no plan match) ──
  const importedSoKeys = new Set(projects.map((p) => soKey(p.soNumber)).filter(Boolean));
  const importedProjNos = new Set(projects.flatMap((p) => p.sheetRows)); // rows only; proj-no set below
  void importedProjNos;
  const planProjNos = new Set(planRows.map((x) => x.projNo).filter(Boolean));
  const skipped = enrichRows
    .filter((er) => !salesmanByName(er.doneBy))
    .filter((er) => !(er.soK && importedSoKeys.has(er.soK)) && !(er.projNo && planProjNos.has(er.projNo)))
    .map((er) => ({
      salesman: collapse(er.doneBy), soNumber: er.so || '(none)', customer: collapse(er.customer),
      item: collapse(er.joh), totalWithVat: er.totalWithVat,
    }));

  // ── 6. Reconciliation against the sheet TOTAL row ────────────────────────────
  const sumQty = planRows.reduce((s, x) => s + (x.qty ?? 0), 0);
  const sumNet = money(planRows.reduce((s, x) => s + (x.total ?? 0), 0));
  const sumPending = money(planRows.reduce((s, x) => s + (x.pending ?? 0), 0));
  const datasetNet = money(projects.reduce((s, p) => s + p.totalNet, 0));
  const importedSheetQty = projects.reduce((s, p) => s + p.lines.reduce((q, l) => q + l.sheetQuantity, 0), 0);

  if (sumQty !== totalRow.qty) fail(`QTY reconciliation failed: rows sum ${sumQty} ≠ TOTAL row ${totalRow.qty}.`);
  if (Math.abs(sumNet - totalRow.totalNet) > 1) fail(`Value reconciliation failed: rows sum ${sumNet} ≠ TOTAL row ${totalRow.totalNet}.`);
  if (Math.abs(sumPending - totalRow.pending) > 1) fail(`Pending reconciliation failed: rows sum ${sumPending} ≠ TOTAL row ${totalRow.pending}.`);
  if (importedSheetQty !== sumQty || Math.abs(datasetNet - sumNet) > 1) {
    fail(`Dataset drift: imported qty ${importedSheetQty}/net ${datasetNet} ≠ sheet qty ${sumQty}/net ${sumNet} (a group was dropped?).`);
  }

  const perSalesmanNet: Record<string, number> = {};
  for (const p of projects) {
    perSalesmanNet[p.salesmanName] = money((perSalesmanNet[p.salesmanName] ?? 0) + p.totalNet);
  }

  const dataset: Dataset = {
    meta: {
      generatedFrom: path.basename(XLSX_PATH),
      xlsxSha256: sha256,
      generatedAt: new Date().toISOString(),
      sheetTotals: totalRow,
      perSalesmanNet,
    },
    projects,
    needsReview,
    skippedUnderProductionOnly: skipped,
  };

  writeFileSync(JSON_PATH, JSON.stringify(dataset, null, 2) + '\n');

  // ── 7. Summary ────────────────────────────────────────────────────────────────
  log(`\n─── EXTRACTION COMPLETE → ${path.relative(process.cwd(), JSON_PATH)} ───`);
  log(`xlsx sha256:      ${sha256}`);
  log(`Projects:         ${projects.length}`);
  log(`Vehicle lines:    ${projects.reduce((s, p) => s + p.lines.length, 0)}`);
  log(`Sheet qty total:  ${importedSheetQty}  (TOTAL row: ${totalRow.qty})`);
  log(`NET value total:  ${datasetNet.toLocaleString('en-US')}  (TOTAL row: ${totalRow.totalNet.toLocaleString('en-US')})`);
  log(`Schedule rows:    ${projects.reduce((s, p) => s + p.schedules.length, 0)}`);
  log(`Sector set:       ${projects.filter((p) => p.sector).length}/${projects.length}`);
  log(`Penalty % set:    ${projects.filter((p) => p.delayPenaltyPercent !== null).length}/${projects.length}`);
  log(`VAT lines:        ${projects.reduce((s, p) => s + p.lines.filter((l) => l.vatApplicable).length, 0)}`);
  log(`Needs review:     ${needsReview.length}`);
  log(`Skipped (non-10): ${skipped.length}`);
  log('\nPer-salesman NET:');
  for (const [k, v] of Object.entries(perSalesmanNet)) log(`  ${k.padEnd(14)} ${v.toLocaleString('en-US')}`);
  log('');
}

main().catch((e) => fail(e instanceof Error ? e.stack ?? e.message : String(e)));
