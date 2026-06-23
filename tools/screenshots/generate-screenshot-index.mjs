#!/usr/bin/env node
/**
 * generate-screenshot-index.mjs
 *
 * Reads the screenshot run results and the captured image files,
 * then writes:
 *   docs/artifact-context/screenshots/index.html   — visual review gallery
 *   docs/artifact-context/screenshots/screenshot-run-summary.md
 *
 * Usage:
 *   node tools/screenshots/generate-screenshot-index.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ACCOUNTS } from './screenshot-accounts.mjs';
import { MODULES } from './screenshot-modules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_ROOT = path.join(ROOT, 'docs', 'artifact-context', 'screenshots');
const RESULTS_FILE = path.join(__dirname, 'screenshot-run-results.json');
const INDEX_FILE = path.join(OUTPUT_ROOT, 'index.html');
const SUMMARY_FILE = path.join(OUTPUT_ROOT, 'screenshot-run-summary.md');

// ---------------------------------------------------------------------------
// Load results
// ---------------------------------------------------------------------------
let runResults = null;
if (fs.existsSync(RESULTS_FILE)) {
  runResults = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
}

// ---------------------------------------------------------------------------
// Discover screenshots on disk (fallback if no results file)
// ---------------------------------------------------------------------------
function discoverScreenshots() {
  const discovered = {};
  if (!fs.existsSync(OUTPUT_ROOT)) return discovered;

  for (const accountDir of fs.readdirSync(OUTPUT_ROOT)) {
    if (accountDir === '.auth' || accountDir.startsWith('index') || accountDir.endsWith('.md')) continue;
    const accountPath = path.join(OUTPUT_ROOT, accountDir);
    if (!fs.statSync(accountPath).isDirectory()) continue;
    discovered[accountDir] = {};

    for (const moduleDir of fs.readdirSync(accountPath)) {
      const modulePath = path.join(accountPath, moduleDir);
      if (!fs.statSync(modulePath).isDirectory()) continue;
      const pngs = fs.readdirSync(modulePath).filter((f) => f.endsWith('.png'));
      if (pngs.length > 0) {
        discovered[accountDir][moduleDir] = pngs.map((f) => path.join(modulePath, f));
      }
    }
  }
  return discovered;
}

const discovered = discoverScreenshots();

// ---------------------------------------------------------------------------
// Build data structure
// ---------------------------------------------------------------------------
function buildData() {
  const data = {};

  for (const account of ACCOUNTS) {
    const acctDiscovered = discovered[account.key] || {};
    const acctResults = runResults?.accounts?.find((r) => r.account === account.key);

    const modules = {};
    const allModuleSlugs = new Set([
      ...Object.keys(acctDiscovered),
      ...(acctResults?.screenshots?.map((s) => s.module) || []),
    ]);

    for (const slug of allModuleSlugs) {
      const mod = MODULES.find((m) => m.slug === slug);
      const screenshots = [];

      // From results file
      if (acctResults) {
        for (const shot of acctResults.screenshots.filter((s) => s.module === slug)) {
          const absPath = path.join(ROOT, shot.file);
          screenshots.push({
            route: shot.route,
            name: shot.name,
            file: shot.file,
            absPath,
            exists: fs.existsSync(absPath),
            status: shot.status,
          });
        }
      }

      // Add any discovered files not in results
      for (const absPath of (acctDiscovered[slug] || [])) {
        const relPath = path.relative(ROOT, absPath);
        if (!screenshots.find((s) => s.absPath === absPath)) {
          screenshots.push({
            route: path.basename(absPath, '.png').replace(/--/g, '/').replace(/^/, '/'),
            name: path.basename(absPath, '.png'),
            file: relPath,
            absPath,
            exists: true,
            status: 'discovered',
          });
        }
      }

      modules[slug] = { mod, screenshots };
    }

    data[account.key] = { account, results: acctResults, modules };
  }

  return data;
}

const data = buildData();

// ---------------------------------------------------------------------------
// Count totals
// ---------------------------------------------------------------------------
let grandTotal = 0;
let grandOk = 0;
for (const acctKey of Object.keys(data)) {
  for (const slug of Object.keys(data[acctKey].modules)) {
    for (const shot of data[acctKey].modules[slug].screenshots) {
      grandTotal++;
      if (shot.exists && shot.status !== 'error' && shot.status !== 'redirect_login') grandOk++;
    }
  }
}

// ---------------------------------------------------------------------------
// Generate HTML
// ---------------------------------------------------------------------------
function relativeToIndex(absPath) {
  return path.relative(OUTPUT_ROOT, absPath).replace(/\\/g, '/');
}

function statusBadge(status) {
  const map = {
    ok: '<span class="badge ok">OK</span>',
    access_denied_visible: '<span class="badge warn">Access Denied</span>',
    redirect_login: '<span class="badge err">→ Login</span>',
    error: '<span class="badge err">Error</span>',
    dry_run: '<span class="badge info">Dry Run</span>',
    discovered: '<span class="badge info">Found</span>',
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

const accountSidebar = ACCOUNTS.map((a) => {
  const acctData = data[a.key];
  const totalShots = Object.values(acctData?.modules || {}).reduce((s, m) => s + m.screenshots.length, 0);
  return `<li><a href="#acct-${a.key}">${a.label} <span class="count">${totalShots}</span></a></li>`;
}).join('\n');

const accountSections = ACCOUNTS.map((a) => {
  const acctData = data[a.key];
  if (!acctData) return '';

  const moduleHtml = Object.entries(acctData.modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, { mod, screenshots }]) => {
      if (screenshots.length === 0) return '';
      const modLabel = mod?.label || slug;
      const cards = screenshots.map((shot) => {
        const imgSrc = shot.exists ? relativeToIndex(shot.absPath) : '';
        const imgEl = imgSrc
          ? `<a href="${imgSrc}" target="_blank"><img src="${imgSrc}" alt="${shot.name}" loading="lazy" /></a>`
          : `<div class="no-img">No image</div>`;
        return `<div class="card">
          ${imgEl}
          <div class="card-meta">
            <span class="route">${shot.route}</span>
            ${statusBadge(shot.status)}
          </div>
        </div>`;
      }).join('\n');

      return `<section class="module">
        <h3>${modLabel}</h3>
        <div class="grid">${cards}</div>
      </section>`;
    }).join('\n');

  return `<section id="acct-${a.key}" class="account">
    <h2>${a.label} <small class="role-tag">${a.role}</small></h2>
    ${moduleHtml || '<p class="empty">No screenshots captured.</p>'}
  </section>`;
}).join('\n');

const runMeta = runResults
  ? `Run at: ${runResults.runAt} &nbsp;|&nbsp; ${runResults.elapsed}s &nbsp;|&nbsp; ${runResults.totalCaptured} captured`
  : 'No run results file found — showing discovered screenshots only.';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>FT Operations Portal — Screenshot Review</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1a1a2e; background: #f8f9fa; }
  a { color: #0078d4; text-decoration: none; }
  a:hover { text-decoration: underline; }

  .layout { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar { width: 240px; flex-shrink: 0; background: #1a1a2e; color: #e0e0ef; position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 20px 0; }
  .sidebar h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8888aa; padding: 0 20px 12px; border-bottom: 1px solid #2a2a4a; margin-bottom: 12px; }
  .sidebar ul { list-style: none; }
  .sidebar li a { display: flex; justify-content: space-between; align-items: center; padding: 7px 20px; color: #c0c0d8; font-size: 13px; transition: background 0.15s; }
  .sidebar li a:hover { background: #2a2a4a; text-decoration: none; color: #fff; }
  .sidebar .count { font-size: 11px; background: #2a2a4a; border-radius: 8px; padding: 1px 6px; color: #8888aa; }

  /* Main */
  .main { flex: 1; padding: 32px; overflow-y: auto; }
  .run-meta { background: #e8f4fd; border: 1px solid #b3d7f5; border-radius: 6px; padding: 10px 16px; font-size: 13px; color: #0056a0; margin-bottom: 24px; }
  .stats { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 20px; min-width: 140px; }
  .stat-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .stat-label { font-size: 12px; color: #666; margin-top: 2px; }

  /* Account sections */
  .account { margin-bottom: 56px; }
  .account h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; border-bottom: 2px solid #0078d4; padding-bottom: 8px; margin-bottom: 20px; }
  .role-tag { font-size: 12px; font-weight: 400; color: #666; background: #f0f0f0; border-radius: 4px; padding: 2px 8px; margin-left: 8px; }
  .module { margin-bottom: 28px; }
  .module h3 { font-size: 14px; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .empty { color: #999; font-style: italic; padding: 16px 0; }

  /* Grid */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #e4e4e4; border-radius: 6px; overflow: hidden; transition: box-shadow 0.15s; }
  .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
  .card img { width: 100%; display: block; border-bottom: 1px solid #f0f0f0; aspect-ratio: 1440/1000; object-fit: cover; object-position: top; }
  .no-img { height: 120px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #999; font-size: 12px; border-bottom: 1px solid #eee; }
  .card-meta { padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .route { font-size: 12px; font-family: monospace; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Badges */
  .badge { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
  .badge.ok { background: #e6f4ea; color: #1e7e34; }
  .badge.warn { background: #fff3cd; color: #856404; }
  .badge.err { background: #fce8e8; color: #c0392b; }
  .badge.info { background: #e8f0fe; color: #1a73e8; }

  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { padding: 16px; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <h1>FT Operations Portal</h1>
    <ul>
${accountSidebar}
    </ul>
  </nav>
  <main class="main">
    <div class="run-meta">${runMeta}</div>
    <div class="stats">
      <div class="stat"><div class="stat-value">${ACCOUNTS.length}</div><div class="stat-label">Accounts</div></div>
      <div class="stat"><div class="stat-value">${grandTotal}</div><div class="stat-label">Total Routes</div></div>
      <div class="stat"><div class="stat-value">${grandOk}</div><div class="stat-label">Captured OK</div></div>
      <div class="stat"><div class="stat-value">${grandTotal - grandOk}</div><div class="stat-label">Failed / Missing</div></div>
    </div>
${accountSections}
  </main>
</div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Generate Markdown summary
// ---------------------------------------------------------------------------
const runDate = runResults?.runAt ? new Date(runResults.runAt).toLocaleString() : new Date().toLocaleString();

const devModeSkipped = runResults?.accounts?.some((a) => a.status === 'skipped_dev_mode_duplicate');

let mdRows = '';
for (const account of ACCOUNTS) {
  const acctData = data[account.key];
  const res = acctData?.results;
  const total = Object.values(acctData?.modules || {}).reduce((s, m) => s + m.screenshots.length, 0);
  let statusIcon;
  if (res?.status === 'complete') statusIcon = '✅';
  else if (res?.status === 'skipped_dev_mode_duplicate') statusIcon = '⏭ dev mode';
  else if (res?.status?.startsWith('skipped')) statusIcon = '⏭ skipped';
  else statusIcon = res ? '⚠️' : '—';
  mdRows += `| ${account.key} | ${account.label} | ${account.role} | ${total} | ${res?.errored || 0} | ${statusIcon} |\n`;
}

const devModeNote = devModeSkipped
  ? '\n> **Dev Mode:** App ran without Supabase credentials — all 96 routes captured under the `admin` account using the auto-authenticated admin profile. Other accounts were skipped as duplicates. To capture per-role screenshots, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.\n'
  : '';

const md = `# Screenshot Run Summary

**Run date:** ${runDate}
**Total screenshots captured:** ${grandOk} / ${grandTotal}
${runResults ? `**Elapsed:** ${runResults.elapsed}s` : ''}
${devModeNote}
## Account Summary

| Key | Label | Role | Routes | Errors | Status |
|-----|-------|------|--------|--------|--------|
${mdRows}
## Notes

- Screenshots are stored under \`docs/artifact-context/screenshots/<account-key>/<module>/\`
- Auth states are stored under \`docs/artifact-context/screenshots/.auth/\` (gitignored)
- Dynamic routes (requiring sample IDs) are skipped unless \`SAMPLE_*\` env vars are set
- Review the visual gallery: \`docs/artifact-context/screenshots/index.html\`
`;

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
fs.writeFileSync(INDEX_FILE, html, 'utf8');
fs.writeFileSync(SUMMARY_FILE, md, 'utf8');

console.log(`Written: ${path.relative(ROOT, INDEX_FILE)}`);
console.log(`Written: ${path.relative(ROOT, SUMMARY_FILE)}`);
console.log(`Stats: ${grandOk} ok / ${grandTotal} total`);
