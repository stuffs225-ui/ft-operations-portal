/* ─────────────────────────────────────────────────────────────────────────────
 * Minimal dependency-free .xlsx reader.
 *
 * WHY NOT A LIBRARY: this repo does not currently depend on any spreadsheet
 * package, and the only two workbooks this tool ever needs to read are
 * internal sales-plan exports with a known, simple shape (shared strings,
 * per-sheet cell/row XML, merged-cell ranges — no formulas, no pivot tables,
 * no external references). A ~250-line reader using only Node's built-in
 * `zlib` (for the DEFLATE-compressed ZIP entries) and `node:buffer` avoids
 * adding a new supply-chain dependency for a narrow, controlled input format.
 *
 * Supports exactly what real .xlsx workbooks produced by Excel contain:
 *   - ZIP container (STORED or DEFLATE entries, found via the End Of Central
 *     Directory record — no reliance on ZIP64, not needed at this file size)
 *   - xl/workbook.xml + xl/_rels/workbook.xml.rels (sheet name → part path)
 *   - xl/sharedStrings.xml (shared string table, incl. multi-run <r><t> text)
 *   - xl/worksheets/sheetN.xml (rows, cells, mergeCells)
 *
 * Does NOT support: formulas (returns the last computed <v> value, same as
 * every other reader when a cell has both <f> and <v>), charts, images,
 * password-protected workbooks, or ZIP64.
 * ──────────────────────────────────────────────────────────────────────────── */

import { inflateRawSync } from 'node:zlib';

// ── ZIP container ─────────────────────────────────────────────────────────────

interface ZipEntry {
  name: string;
  data: Buffer;
}

function readZipEntries(buf: Buffer): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  const CENTRAL_SIG = 0x02014b50;
  const LOCAL_SIG = 0x04034b50;

  // Find End Of Central Directory (search backward — allows a trailing comment).
  let eocd = -1;
  const minPos = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid .xlsx file (End Of Central Directory record not found).');

  const totalEntries = buf.readUInt16LE(eocd + 10);
  const centralDirOffset = buf.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  let p = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL_SIG) throw new Error(`Corrupt ZIP central directory at entry ${i}.`);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const fileNameLength = buf.readUInt16LE(p + 28);
    const extraLength = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + fileNameLength);
    p += 46 + fileNameLength + extraLength + commentLength;

    // Resolve the local header to find the true data start (extra field length
    // can differ between the local and central directory records).
    if (buf.readUInt32LE(localHeaderOffset) !== LOCAL_SIG) {
      throw new Error(`Corrupt ZIP local header for "${name}".`);
    }
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw);
    else throw new Error(`Unsupported ZIP compression method ${method} for "${name}" (only STORED/DEFLATE supported).`);

    entries.push({ name, data });
  }
  return new Map(entries.map(e => [e.name, e.data]));
}

// ── Minimal XML text extraction (narrow, well-known schema only) ─────────────

function extractAttr(tag: string, attr: string): string | undefined {
  const m = tag.match(new RegExp(`${attr}="([^"]*)"`));
  return m?.[1];
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Parses xl/sharedStrings.xml into an index → string array. */
function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const siRe = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const body = m[1];
    const texts: string[] = [];
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(body))) texts.push(unescapeXml(tm[1]));
    out.push(texts.join(''));
  }
  return out;
}

function colLettersToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseCellRef(ref: string): { row: number; col: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`Unrecognized cell reference "${ref}".`);
  return { col: colLettersToNumber(m[1]), row: parseInt(m[2], 10) };
}

export interface SheetGrid {
  name: string;
  maxRow: number;
  maxCol: number;
  /** Merged ranges as raw "A1:B2" strings, exactly as declared in the sheet XML. */
  merges: string[];
  /** Cell value with merged ranges resolved to their top-left cell. */
  get(row: number, col: number): string | number | null;
}

function parseSheet(name: string, xml: string, sharedStrings: string[]): SheetGrid {
  const cells = new Map<string, string | number>();
  let maxRow = 0;
  let maxCol = 0;

  const rowRe = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml))) {
    const rowNum = parseInt(rm[1], 10);
    maxRow = Math.max(maxRow, rowNum);
    const rowBody = rm[2];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowBody))) {
      const attrs = cm[1];
      const inner = cm[2] ?? '';
      const ref = extractAttr(attrs, 'r');
      if (!ref) continue;
      const { row, col } = parseCellRef(ref);
      maxCol = Math.max(maxCol, col);
      const type = extractAttr(attrs, 't');

      let value: string | number | null = null;
      const isMatch = inner.match(/<is>([\s\S]*?)<\/is>/);
      if (isMatch) {
        const texts: string[] = [];
        const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = tRe.exec(isMatch[1]))) texts.push(unescapeXml(tm[1]));
        value = texts.join('');
      } else {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) {
          const raw = vMatch[1];
          if (type === 's') {
            const idx = parseInt(raw, 10);
            value = sharedStrings[idx] ?? '';
          } else if (type === 'str' || type === 'b') {
            value = unescapeXml(raw);
          } else {
            const n = Number(raw);
            value = Number.isNaN(n) ? raw : n;
          }
        }
      }
      if (value !== null && value !== '') cells.set(`${row},${col}`, value);
    }
  }

  const merges: string[] = [];
  const mergeRe = /<mergeCell\s+ref="([^"]+)"\s*\/>/g;
  let mm: RegExpExecArray | null;
  while ((mm = mergeRe.exec(xml))) merges.push(mm[1]);

  // row/col of every merged range → its top-left anchor cell.
  const mergeAnchor = new Map<string, { row: number; col: number }>();
  for (const range of merges) {
    const [a, b] = range.split(':');
    const start = parseCellRef(a);
    const end = parseCellRef(b);
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        mergeAnchor.set(`${r},${c}`, start);
      }
    }
  }

  return {
    name,
    maxRow,
    maxCol,
    merges,
    get(row: number, col: number): string | number | null {
      const anchor = mergeAnchor.get(`${row},${col}`);
      const key = anchor ? `${anchor.row},${anchor.col}` : `${row},${col}`;
      return cells.get(key) ?? null;
    },
  };
}

/** Reads every worksheet in an .xlsx file, keyed by its visible sheet name. */
export function readXlsxWorkbook(buf: Buffer): Map<string, SheetGrid> {
  const entries = readZipEntries(buf);

  const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8');
  const relsXml = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8');
  if (!workbookXml) throw new Error('xl/workbook.xml not found — not a valid .xlsx file.');
  if (!relsXml) throw new Error('xl/_rels/workbook.xml.rels not found — not a valid .xlsx file.');

  const sharedStrings = parseSharedStrings(sharedStringsXml);

  // r:id → part path (e.g. "rId2" → "worksheets/sheet2.xml")
  const ridToTarget = new Map<string, string>();
  const relRe = /<Relationship\s+Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let relm: RegExpExecArray | null;
  while ((relm = relRe.exec(relsXml))) ridToTarget.set(relm[1], relm[2]);

  // sheet name → r:id
  const sheetRe = /<sheet\s+name="([^"]+)"[^>]*r:id="([^"]+)"/g;
  const sheets = new Map<string, SheetGrid>();
  let sm: RegExpExecArray | null;
  while ((sm = sheetRe.exec(workbookXml))) {
    const sheetName = unescapeXml(sm[1]);
    const rid = sm[2];
    const target = ridToTarget.get(rid);
    if (!target) continue;
    const partPath = `xl/${target.replace(/^\.?\/?/, '')}`;
    const sheetXml = entries.get(partPath)?.toString('utf8');
    if (!sheetXml) continue;
    sheets.set(sheetName, parseSheet(sheetName, sheetXml, sharedStrings));
  }
  return sheets;
}
