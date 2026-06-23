# Screenshot Baseline Tool

Playwright-based tool that logs into the FT Operations Portal as each test account and captures full-viewport screenshots of every accessible static route.

## Quick Start

```bash
# 1. Copy and fill in credentials
cp .env.screenshots.example .env.screenshots.local
# edit .env.screenshots.local with real credentials

# 2. Install Playwright (if not already installed)
npm install @playwright/test

# 3. Start the dev server
npm run dev &

# 4. Run screenshot capture
node tools/screenshots/capture-all-role-pages.mjs

# 5. Generate the HTML review gallery + summary
node tools/screenshots/generate-screenshot-index.mjs

# 6. Open the gallery
open docs/artifact-context/screenshots/index.html
```

## CLI Options

```bash
# Capture only one account
node tools/screenshots/capture-all-role-pages.mjs --account admin

# Dry run (no browser, no screenshots — just logs what would be captured)
node tools/screenshots/capture-all-role-pages.mjs --dry-run
```

## Output

| Path | Contents |
|------|----------|
| `docs/artifact-context/screenshots/<account>/<module>/<route>.png` | Captured screenshots (gitignored) |
| `docs/artifact-context/screenshots/.auth/<account>.json` | Playwright auth state (gitignored) |
| `docs/artifact-context/screenshots/index.html` | HTML visual review gallery |
| `docs/artifact-context/screenshots/screenshot-run-summary.md` | Run summary report |
| `tools/screenshots/screenshot-run-results.json` | Raw JSON results (gitignored) |

## Files

| File | Purpose |
|------|---------|
| `capture-all-role-pages.mjs` | Main runner — launches browser, logs in, captures |
| `generate-screenshot-index.mjs` | Generates `index.html` and `screenshot-run-summary.md` |
| `screenshot-routes.mjs` | Route catalogue mapping paths → roles → modules |
| `screenshot-accounts.mjs` | Account registry with role/env-key metadata |
| `screenshot-modules.mjs` | Module metadata (order, slug, label) |

## Security

- Credentials come from `.env.screenshots.local` only — never hardcoded
- `.env.screenshots.local` is gitignored
- Auth state files (`.auth/`) are gitignored
- Screenshot images are gitignored
- Passwords are never logged

## Adding Routes

Edit `screenshot-routes.mjs` and add entries to `ROUTE_CATALOGUE`. Each entry needs:

```js
{
  path: '/your-route',
  name: 'Human readable name',
  module: 'Module Label',
  moduleSlug: '01-sales',   // matches docs/artifact-context/screenshots/<slug>
  moduleOrder: 1,
  roles: ['admin', 'sales_user'],  // which roles can access this route
  dynamic: false,
}
```

For dynamic routes (requiring an ID), set `dynamic: true` and `sampleEnvKey: 'SAMPLE_PROJECT_ID'`. These are skipped unless the env var is set.
