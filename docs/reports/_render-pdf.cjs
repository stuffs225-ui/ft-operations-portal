/* Render the transformation-study Markdown into a print-ready HTML file and a PDF.
   Self-contained: a focused Markdown converter (headings, tables, lists, code,
   blockquotes, hr, bold, inline code, links) + Playwright Chromium for PDF.
   Usage: node docs/reports/_render-pdf.cjs */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const BASE = 'ft-operations-frontend-design-ux-transformation-study';
const mdPath = path.join(DIR, BASE + '.md');
const htmlPath = path.join(DIR, BASE + '.html');
const pdfPath = path.join(DIR, BASE + '.pdf');

const md = fs.readFileSync(mdPath, 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  // escape first, then apply inline markup
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

const lines = md.split('\n');
let html = '';
let i = 0;
let inCode = false, codeBuf = [];
let listType = null; // 'ul' | 'ol'

function closeList() { if (listType) { html += `</${listType}>\n`; listType = null; } }

while (i < lines.length) {
  let line = lines[i];

  // fenced code blocks
  if (/^```/.test(line)) {
    if (!inCode) { closeList(); inCode = true; codeBuf = []; }
    else { html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>\n`; inCode = false; }
    i++; continue;
  }
  if (inCode) { codeBuf.push(line); i++; continue; }

  // table: a line with | followed by a separator row of ---
  if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
    closeList();
    const header = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    i += 2; // skip separator
    let rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      i++;
    }
    html += '<table><thead><tr>' + header.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows) html += '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
    html += '</tbody></table>\n';
    continue;
  }

  // headings
  let m = /^(#{1,6})\s+(.*)$/.exec(line);
  if (m) { closeList(); const lv = m[1].length; html += `<h${lv}>${inline(m[2])}</h${lv}>\n`; i++; continue; }

  // hr
  if (/^---+\s*$/.test(line)) { closeList(); html += '<hr/>\n'; i++; continue; }

  // blockquote
  if (/^>\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>\n`; i++; continue; }

  // ordered list
  m = /^(\d+)\.\s+(.*)$/.exec(line);
  if (m) { if (listType !== 'ol') { closeList(); html += '<ol>\n'; listType = 'ol'; } html += `<li>${inline(m[2])}</li>\n`; i++; continue; }

  // unordered list
  m = /^[-*]\s+(.*)$/.exec(line);
  if (m) { if (listType !== 'ul') { closeList(); html += '<ul>\n'; listType = 'ul'; } html += `<li>${inline(m[1])}</li>\n`; i++; continue; }

  // blank
  if (/^\s*$/.test(line)) { closeList(); i++; continue; }

  // paragraph
  closeList();
  html += `<p>${inline(line)}</p>\n`;
  i++;
}
closeList();

const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>FT Operations Portal — Frontend Transformation Study</title>
<style>
  :root { --red:#cf1f29; --ink:#1d2125; --muted:#67727d; --line:#e3e6e9; --bg:#ffffff; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter','Segoe UI',system-ui,sans-serif; color:var(--ink); background:var(--bg);
         font-size:10.5px; line-height:1.5; margin:0; padding:32px 40px; }
  h1 { font-size:21px; color:var(--red); border-bottom:3px solid var(--red); padding-bottom:8px; margin:0 0 14px; letter-spacing:-0.01em; }
  h2 { font-size:15px; color:var(--ink); margin:22px 0 8px; padding-top:6px; border-top:1px solid var(--line); letter-spacing:-0.01em; }
  h3 { font-size:12.5px; color:#8f1a20; margin:14px 0 5px; }
  h4 { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin:10px 0 4px; }
  p { margin:5px 0; }
  ul,ol { margin:5px 0 5px 18px; padding:0; }
  li { margin:2px 0; }
  code { background:#f3f4f6; padding:1px 4px; border-radius:3px; font-family:'SF Mono',Consolas,monospace; font-size:9.5px; color:#ad1a22; }
  pre { background:#f6f7f8; border:1px solid var(--line); border-radius:6px; padding:10px 12px; overflow:auto; }
  pre code { background:none; color:var(--ink); padding:0; }
  table { width:100%; border-collapse:collapse; margin:8px 0; font-size:9.5px; }
  th { background:#f6f7f8; text-align:left; font-weight:600; color:var(--muted);
       text-transform:uppercase; letter-spacing:0.04em; font-size:8.5px; padding:6px 8px; border:1px solid var(--line); }
  td { padding:5px 8px; border:1px solid var(--line); vertical-align:top; }
  tr:nth-child(even) td { background:#fafbfc; }
  hr { border:none; border-top:1px solid var(--line); margin:16px 0; }
  blockquote { border-left:3px solid var(--red); margin:8px 0; padding:4px 12px; color:var(--muted); background:#fdf3f3; border-radius:0 4px 4px 0; }
  a { color:var(--red); text-decoration:none; }
  strong { color:var(--ink); font-weight:600; }
  h2, h3 { page-break-after:avoid; }
  table, pre, blockquote { page-break-inside:avoid; }
</style></head>
<body class="report-print-root">
${html}
</body></html>`;

fs.writeFileSync(htmlPath, doc, 'utf8');
console.log('HTML written:', path.relative(process.cwd(), htmlPath), `(${doc.length} bytes)`);

(async () => {
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ];
  const exe = candidates.find((p) => fs.existsSync(p));
  if (!exe) { console.log('PDF SKIPPED: no Chromium binary found'); return; }
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch { try { ({ chromium } = require('@playwright/test')); } catch { console.log('PDF SKIPPED: playwright not available'); return; } }
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage();
  await page.setContent(doc, { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath, format: 'A4', printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#999;padding:0 12mm;display:flex;justify-content:space-between;"><span>FT Operations Portal — Frontend Transformation Study · SHA 1ed145a</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await browser.close();
  const kb = (fs.statSync(pdfPath).size / 1024).toFixed(0);
  console.log('PDF written:', path.relative(process.cwd(), pdfPath), `(${kb} KB)`);
})();
