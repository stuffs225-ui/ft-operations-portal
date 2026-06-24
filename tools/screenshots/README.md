# Screenshot Baseline Tool

Captures per-role, per-page screenshots from a running local dev server using real Supabase auth.
Used to generate a visual baseline for UX review before starting the Phase 19 UI modernisation.

## Running via GitHub Actions (recommended)

The easiest way to generate the baseline is the manual workflow — no local setup required.

1. Go to **Actions → Role/Page Screenshot Baseline** in GitHub
2. Click **Run workflow** → **Run workflow**
3. Wait ~30–40 minutes
4. Download the `full-role-page-screenshot-baseline` artifact from the job page

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SCREENSHOT_SHARED_PASSWORD` | Shared password for all 12 test accounts |

Optional per-account overrides: `SCREENSHOT_ADMIN_PASSWORD`, `SCREENSHOT_AFS_PASSWORD`,
`SCREENSHOT_COO_PASSWORD`, `SCREENSHOT_FACTORY_PASSWORD`, `SCREENSHOT_OPS_PASSWORD`,
`SCREENSHOT_PROCUREMENT_PASSWORD`, `SCREENSHOT_QC_PASSWORD`, `SCREENSHOT_SALES_TEST_PASSWORD`,
`SCREENSHOT_STORE_PASSWORD`, `SCREENSHOT_STUFFS_PASSWORD`, `SCREENSHOT_TESTSALES_PASSWORD`,
`SCREENSHOT_VIEWER_PASSWORD`.

**Artifact contents:**
- `index.html` — visual gallery, self-contained, open directly in browser
- `screenshot-run-summary.md` — text summary with counts per account
- `full-role-page-screenshot-baseline.zip` — all screenshots in one archive

**Using the output with Claude Artifacts:**
1. Download the artifact and unzip
2. Upload `index.html` to Claude as an artifact for a complete gallery review
3. Upload individual `<module-slug>/*.png` files for module-level review
4. Include the matching `docs/artifact-context/{01..13}/artifact-brief.md` as context

## Running Locally

#- Node.js 18+
- `@playwright/test` installed (`npx playwright install chromium` if Chromium binary is missing)
- Local dev server running on `http://localhost:5173` (or set `APP_BASE_URL`)
- `.env.screenshots.local` with credentials for all 12 test accounts (see format below)
- Real Supabase credentials in `.env.local` (so app is NOT in dev/admin-only mode)

### Quick Start

```bash
# 1. Start the dev server (must have .env.local with real Supabase creds)
npm run dev &

# 2. Dry-run — verifies REAL_AUTH mode and prints what would be captured
node tools/screenshots/capture-all-role-pages.mjs --dry-run

# 3. Full capture (all 12 accounts)
node tools/screenshots/capture-all-role-pages.mjs

# 4. Generate HTML gallery + summary
node tools/screenshots/generate-screenshot-index.mjs
```

## Credential Files (NOT committed)

**`.env.local`** — Supabase project URL and anon key (gitignored)
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**`.env.screenshots.local`** — test account credentials (gitignored)
```
SCREENSHOT_ACCOUNT_ADMIN_EMAIL=admin@ft.com
SCREENSHOT_ACCOUNT_ADMIN_PASSWORD=<password>
# ... one EMAIL/PASSWORD pair per account key
# Keys: admin, stuffs, coo, ops, sales-test, testsales,
#       procurement, factory, store, qc, afs, viewer
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Print routes per account, skip all logins and screenshots |
| `--account <key>` | Capture one account only (e.g. `--account admin`) |
| `--allow-dev-mode-admin-only` | Skip the REAL_AUTH guard (for CI without Supabase) |

## Output

```
docs/artifact-context/screenshots/
  <account-key>/
    <module-slug>/
      <route-name>.png
  index.html           — visual gallery (generated)
  screenshot-run-summary.md — text summary (generated)
  full-role-page-screenshot-baseline.zip  — local archive (gitignored)
```

## REAL_AUTH Guard

The tool navigates to `/login` in a fresh browser context before any logins.
If the app redirects away from `/login` immediately (dev mode — no Supabase configured),
the tool exits with code `2`. Pass `--allow-dev-mode-admin-only` to bypass.

## Test Accounts

| Key | Role | Landing |
|-----|------|---------|
| admin | admin | /admin-dashboard |
| stuffs | admin | /admin-dashboard |
| coo | operations_manager | /control-tower |
| ops | operations_manager | /control-tower |
| sales-test | sales_user | /sales |
| testsales | sales_user or sales_coordinator | /sales or /sales-coordinator |
| procurement | procurement_user | /procurement |
| factory | factory_user | /factory |
| store | store_user | /store |
| qc | qc_user | /qc |
| afs | afs_user | /dubai-afs |
| viewer | viewer | /management-dashboard |

## Files

| File | Purpose |
|------|---------|
| `capture-all-role-pages.mjs` | Main runner — login, navigate, screenshot |
| `screenshot-routes.mjs` | Full route catalogue derived from App.tsx |
| `screenshot-accounts.mjs` | 12 test account registry |
| `screenshot-modules.mjs` | 14 module metadata (order, slug, label) |
| `generate-screenshot-index.mjs` | HTML gallery + summary generator |

## Security

- Do not commit `.env.local`, `.env.screenshots.local`, or any screenshot images.
- Auth state JSON files (`docs/artifact-context/screenshots/.auth/`) are gitignored.
- Passwords are never logged or included in screenshots, summaries, or reports.
