#!/usr/bin/env node
/**
 * generate-screenshot-index.mjs
 *
 * Reads screenshot-run-results.json and discovered .png files then writes:
 *   docs/artifact-context/screenshots/index.html
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
let run = null;
if (fs.existsSync(RESULTS_FILE)) {
  run = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
}

// ---------------------------------------------------------------------------
// Discover screenshots on disk
// ---------------------------------------------------------------------------
function discoverScreenshots() {
  const out = {};
  if (!fs.existsSync(OUTPUT_ROOT)) return out;
  for (const acctDir of fs.readdirSync(OUTPUT_ROOT)) {
    const acctPath = path.join(OUTPUT_ROOT, acctDir);
    if (!fs.statSync(acctPath).isDirectory()) continue;
    if (acctDir === '.auth') continue;
    out[acctDir] = {};
    for (const modDir of fs.readdirSync(acctPath)) {
      const modPath = path.join(acctPath, modDir);
      if (!fs.statSync(modPath).isDirectory()) continue;
      const pngs = fs.readdirSync(modPath).filter((f) => f.endsWith('.png'));
      if (pngs.length) out[acctDir][modDir] = pngs.map((f) => path.join(modPath, f));
    }
  }
  return out;
}
const discovered = discoverScreenshots();

// ---------------------------------------------------------------------------
// Build data model
// ---------------------------------------------------------------------------
function buildAccountData(account) {
  const runAcct = run?.accounts?.find((r) => r.account === account.key);
  const discAcct = discovered[account.key] || {};
  const moduleSlugs = new Set([
    ...Object.keys(discAcct),
    ...(runAcct?.screenshots?.map((s) => s.module) || []),
  ]);
  const modules = {};
  for (const slug of moduleSlugs) {
    const mod = MODULES.find((m) => m.slug === slug);
    const shots = [];
    if (runAcct) {
      for (const s of runAcct.screenshots.filter((s) => s.module === slug)) {
        shots.push({ ...s, absPath: path.join(ROOT, s.file), exists: fs.existsSync(path.join(ROOT, s.file)) });
      }
    }
    for (const absPath of (discAcct[slug] || [])) {
      if (!shots.find((s) => s.absPath === absPath)) {
        shots.push({ route: '/' + path.basename(absPath, '.png').replace(/--/g, '/'), name: path.basename(absPath, '.png'), module: slug, file: path.relative(ROOT, absPath), absPath, exists: true, status: 'discovered' });
      }
    }
    modules[slug] = { mod, shots };
  }
  return { account, runAcct, modules };
}

const allData = ACCOUNTS.map(buildAccountData);

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------
let grand = 0, grandOk = 0, grandRestricted = 0, grandFailed = 0;
for (const d of allData) {
  for (const { shots } of Object.values(d.modules)) {
    for (const s of shots) {
      grand++;
      if (s.status === 'captured') grandOk++;
      else if (s.status === 'access_restricted') grandRestricted++;
      else if (s.status === 'error' || s.status === 'session_expired') grandFailed++;
    }
  }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
function relToIndex(absPath) { return path.relative(OUTPUT_ROOT, absPath).replace(/\\/g, '/'); }

function badge(status) {
  const m = {
    captured: '<span class="badge ok">OK</span>',
    access_restricted: '<span class="badge warn">Restricted</span>',
    session_expired: '<span class="badge err">Session Exp.</span>',
    error: '<span class="badge err">Error</span>',
    dry_run: '<span class="badge info">Dry Run</span>',
    discovered: '<span class="badge info">Found</span>',
    skipped_dynamic: '<span class="badge skip">Skipped (dynamic)</span>',
    login_failed: '<span class="badge err">Login Failed</span>',
  };
  return m[status] || `<span class="badge">${status}</span>`;
}

// ---------------------------------------------------------------------------
// Build HTML
// ---------------------------------------------------------------------------
const authMode = run?.authMode ?? 'UNKNOWN';
const authBadgeClass = authMode === 'REAL_AUTH' ? 'auth-real' : 'auth-dev';
const runMeta = run
  ? `Auth: <strong class="${authBadgeClass}">${authMode}</strong> &nbsp;|&nbsp; ${run.runAt} &nbsp;|&nbsp; ${run.elapsed}s &nbsp;|&nbsp; ${run.totalCaptured} captured`
  : 'No run results file — showing discovered screenshots only.';

const sidebar = ACCOUNTS.map((a) => {
  const d = allData.find((x) => x.account.key === a.key);
  const total = Object.values(d?.modules || {}).reduce((s, m) => s + m.shots.length, 0);
  const ra = d?.runAcct;
  const cls = ra?.loginStatus === 'failed' ? 'failed' : '';
  return `<li class="${cls}"><a href="#acct-${a.key}">${a.label} <span class="count">${total}</span></a></li>`;
}).join('\n');

const mainContent = allData.map(({ account, runAcct, modules }) => {
  const loginStatus = runAcct?.loginStatus ?? 'unknown';
  const detectedLanding = runAcct?.detectedLanding ?? '—';
  const detectedRole = runAcct?.detectedRole ?? '—';

  const metaRow = `
    <div class="acct-meta">
      <span>Login: <strong class="${loginStatus === 'ok' ? 'ok' : 'err'}">${loginStatus}</strong></span>
      <span>Landing: <code>${detectedLanding}</code></span>
      <span>Detected role: ${detectedRole}</span>
      <span>Intended: ${account.intendedRole}</span>
    </div>`;

  if (loginStatus === 'failed') {
    return `<section id="acct-${account.key}" class="account">
      <h2>${account.label}</h2>${metaRow}
      <p class="err-msg">Login failed: ${runAcct?.loginError ?? 'unknown error'}</p>
    </section>`;
  }

  const moduleHtml = Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, { mod, shots }]) => {
      if (!shots.length) return '';
      const cards = shots.map((s) => {
        const img = s.exists
          ? `<a href="${relToIndex(s.absPath)}" target="_blank"><img src="${relToIndex(s.absPath)}" alt="${s.name}" loading="lazy" /></a>`
          : `<div class="no-img">No image</div>`;
        return `<div class="card">
          ${img}
          <div class="card-meta">
            <span class="route" title="${s.route}">${s.route}</span>
            ${badge(s.status)}
          </div>
        </div>`;
      }).join('');
      return `<section class="module"><h3>${mod?.label ?? slug}</h3><div class="grid">${cards}</div></section>`;
    }).join('');

  return `<section id="acct-${account.key}" class="account">
    <h2>${account.label} <small class="role-tag">${account.intendedRole}</small></h2>
    ${metaRow}
    ${moduleHtml || '<p class="empty">No screenshots.</p>'}
  </section>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>FT Operations Portal — Screenshot Baseline Review</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#1a1a2e;background:#f4f5f7}
a{color:#0078d4;text-decoration:none}a:hover{text-decoration:underline}
.layout{display:flex;min-height:100vh}
.sidebar{width:240px;flex-shrink:0;background:#1a1a2e;color:#e0e0ef;position:sticky;top:0;height:100vh;overflow-y:auto;padding:16px 0}
.sidebar h1{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6666aa;padding:0 16px 10px;border-bottom:1px solid #2a2a4a;margin-bottom:10px}
.sidebar ul{list-style:none}
.sidebar li a{display:flex;justify-content:space-between;padding:6px 16px;color:#c0c0d8;font-size:12px;transition:background .15s}
.sidebar li a:hover{background:#2a2a4a;color:#fff;text-decoration:none}
.sidebar li.failed a{color:#ff8888}
.sidebar .count{font-size:10px;background:#2a2a4a;border-radius:8px;padding:1px 5px;color:#8888aa}
.main{flex:1;padding:28px;overflow-y:auto}
.run-meta{background:#e8f4fd;border:1px solid #b3d7f5;border-radius:6px;padding:9px 14px;font-size:12px;color:#0056a0;margin-bottom:20px}
.auth-real{color:#1e7e34}
.auth-dev{color:#856404}
.stats{display:flex;gap:12px;margin-bottom:28px;flex-wrap:wrap}
.stat{background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px 18px;min-width:120px}
.stat-value{font-size:26px;font-weight:700;color:#1a1a2e}
.stat-label{font-size:11px;color:#666;margin-top:2px}
.account{margin-bottom:48px}
.account h2{font-size:18px;font-weight:700;border-bottom:2px solid #0078d4;padding-bottom:7px;margin-bottom:14px}
.role-tag{font-size:11px;font-weight:400;color:#666;background:#f0f0f0;border-radius:3px;padding:2px 7px;margin-left:8px}
.acct-meta{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;font-size:12px;color:#555;background:#f8f9fa;border:1px solid #e0e0e0;border-radius:5px;padding:8px 12px}
.acct-meta .ok{color:#1e7e34;font-weight:600}
.acct-meta .err{color:#c0392b;font-weight:600}
.acct-meta code{font-size:11px;background:#e8eaf0;padding:1px 4px;border-radius:3px}
.err-msg{color:#c0392b;font-size:13px;padding:8px 0}
.module{margin-bottom:24px}
.module h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:10px}
.empty{color:#999;font-style:italic;padding:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.card{background:#fff;border:1px solid #e4e4e4;border-radius:5px;overflow:hidden;transition:box-shadow .15s}
.card:hover{box-shadow:0 3px 12px rgba(0,0,0,.1)}
.card img{width:100%;display:block;border-bottom:1px solid #f0f0f0;aspect-ratio:1440/1000;object-fit:cover;object-position:top}
.no-img{height:100px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#999;font-size:11px;border-bottom:1px solid #eee}
.card-meta{padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:6px}
.route{font-size:11px;font-family:monospace;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 5px;border-radius:3px;flex-shrink:0}
.badge.ok{background:#e6f4ea;color:#1e7e34}
.badge.warn{background:#fff3cd;color:#856404}
.badge.err{background:#fce8e8;color:#c0392b}
.badge.info{background:#e8f0fe;color:#1a73e8}
.badge.skip{background:#f0f0f0;color:#666}
@media(max-width:768px){.sidebar{display:none}.main{padding:14px}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="layout">
<nav class="sidebar"><h1>FT Operations Portal</h1><ul>${sidebar}</ul></nav>
<main class="main">
<div class="run-meta">${runMeta}</div>
<div class="stats">
<div class="stat"><div class="stat-value">${ACCOUNTS.length}</div><div class="stat-label">Accounts</div></div>
<div class="stat"><div class="stat-value">${grandOk}</div><div class="stat-label">Captured OK</div></div>
<div class="stat"><div class="stat-value">${grandRestricted}</div><div class="stat-label">Restricted</div></div>
<div class="stat"><div class="stat-value">${grandFailed}</div><div class="stat-label">Failed</div></div>
</div>
${mainContent}
</main>
</div>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Build Markdown summary
// ---------------------------------------------------------------------------
const runDate = run?.runAt ? new Date(run.runAt).toLocaleString() : new Date().toLocaleString();

let tableRows = '';
for (const d of allData) {
  const ra = d.runAcct;
  const total = Object.values(d.modules).reduce((s, m) => s + m.shots.length, 0);
  const loginIcon = !ra ? '—' : ra.loginStatus === 'ok' ? '✅' : '❌';
  const captured = ra?.captured ?? 0;
  const restricted = ra?.accessRestricted ?? 0;
  const errors = ra?.errored ?? 0;
  tableRows += `| ${d.account.key} | ${d.account.intendedRole} | ${ra?.detectedLanding ?? '—'} | ${ra?.detectedRole ?? '—'} | ${loginIcon} | ${total} | ${captured} | ${restricted} | ${errors} |\n`;
}

const perModule = {};
for (const d of allData) {
  for (const [slug, { shots }] of Object.entries(d.modules)) {
    if (!perModule[slug]) perModule[slug] = 0;
    perModule[slug] += shots.filter((s) => s.status === 'captured').length;
  }
}

let moduleRows = '';
for (const mod of MODULES) {
  moduleRows += `| ${mod.order}. ${mod.label} | ${perModule[mod.slug] ?? 0} |\n`;
}

const md = `# Screenshot Run Summary — Real-Auth Baseline

**Date:** ${runDate}
**Main SHA:** ${run?.mainSha ?? 'f9e2f5d'}
**APP_BASE_URL:** ${process.env.APP_BASE_URL || 'http://localhost:5173'}
**AUTH_MODE:** ${authMode}

## Totals

| Metric | Count |
|--------|-------|
| Accounts configured | ${ACCOUNTS.length} |
| Login successes | ${run?.loginSuccesses ?? '—'} |
| Login failures | ${run?.loginFailures ?? '—'} |
| Screenshots captured (OK) | ${grandOk} |
| Access restricted (shown) | ${grandRestricted} |
| Errors / failures | ${grandFailed} |
| Elapsed | ${run?.elapsed ?? '—'}s |

## Account Summary

| Key | Intended Role | Detected Landing | Detected Role | Login | Routes | OK | Restricted | Errors |
|-----|--------------|-----------------|---------------|-------|--------|----|------------|--------|
${tableRows}

## Screenshots Per Module

| Module | Captured |
|--------|----------|
${moduleRows}

## Notes

- AUTH_MODE must be REAL_AUTH for this baseline to be valid for role-based Artifact review
- Access-restricted screenshots show the RequireRole 403 panel for the account's role
- Dynamic routes skipped unless SAMPLE_* env vars are set
- Screenshots path: \`docs/artifact-context/screenshots/<account>/<module>/<route>.png\`
- HTML gallery: \`docs/artifact-context/screenshots/index.html\`

## Recommended First Module to Improve

**01 — Sales** (first in improvement order)
`;

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
fs.writeFileSync(INDEX_FILE, html, 'utf8');
fs.writeFileSync(SUMMARY_FILE, md, 'utf8');

console.log(`Written: ${path.relative(ROOT, INDEX_FILE)}`);
console.log(`Written: ${path.relative(ROOT, SUMMARY_FILE)}`);
console.log(`Stats: ${grandOk} captured, ${grandRestricted} restricted, ${grandFailed} failed`);
