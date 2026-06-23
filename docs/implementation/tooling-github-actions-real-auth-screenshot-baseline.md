# Tooling — GitHub Actions Real-Auth Screenshot Baseline

**Branch:** `tooling/github-actions-real-auth-screenshot-baseline`
**Base:** `main` @ `c668d3f5cda309805297501c222d67aec456b60d`
**Workflow file:** `.github/workflows/role-screenshot-baseline.yml`

---

## Purpose

This document describes the GitHub Actions workflow that runs the full role-based screenshot capture process automatically — without requiring the developer to run it locally.

---

## Why GitHub Actions Is Needed

The screenshot baseline tool (`tools/screenshots/capture-all-role-pages.mjs`) requires:

1. A running Vite dev server with real Supabase credentials (`.env.local`)
2. A `.env.screenshots.local` file containing credentials for 12 test accounts
3. Playwright Chromium with access to the Supabase project API

When running inside Claude Code's remote execution environment, the Anthropic egress proxy blocks outbound connections to `*.supabase.co` ("Host not in allowlist"). GitHub Actions runners have direct internet access and can reach Supabase without restriction.

---

## Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Required | Description |
|--------|----------|-------------|
| `VITE_SUPABASE_URL` | Required | Supabase project URL (`https://<project>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Required | Supabase anon key (public) |
| `SCREENSHOT_SHARED_PASSWORD` | Required | Shared password for all 12 test accounts |
| `SCREENSHOT_ADMIN_PASSWORD` | Optional | Overrides shared password for admin account |
| `SCREENSHOT_STUFFS_PASSWORD` | Optional | Overrides shared password for stuffs account |
| `SCREENSHOT_COO_PASSWORD` | Optional | Overrides shared password for coo account |
| `SCREENSHOT_OPS_PASSWORD` | Optional | Overrides shared password for ops account |
| `SCREENSHOT_SALES_TEST_PASSWORD` | Optional | Overrides shared password for sales-test account |
| `SCREENSHOT_TESTSALES_PASSWORD` | Optional | Overrides shared password for testsales account |
| `SCREENSHOT_PROCUREMENT_PASSWORD` | Optional | Overrides shared password for procurement account |
| `SCREENSHOT_FACTORY_PASSWORD` | Optional | Overrides shared password for factory account |
| `SCREENSHOT_STORE_PASSWORD` | Optional | Overrides shared password for store account |
| `SCREENSHOT_QC_PASSWORD` | Optional | Overrides shared password for qc account |
| `SCREENSHOT_AFS_PASSWORD` | Optional | Overrides shared password for afs account |
| `SCREENSHOT_VIEWER_PASSWORD` | Optional | Overrides shared password for viewer account |

---

## Workflow Behaviour

**Trigger:** Manual only (`workflow_dispatch`)

**Inputs:**

| Input | Default | Description |
|-------|---------|-------------|
| `app_base_url` | `http://localhost:5173` | App URL the capture tool connects to |
| `capture_mode` | `full` | Capture mode (full = all 12 accounts) |
| `upload_screenshots` | `true` | Whether to upload screenshots as an artifact |

**Steps:**

1. Checkout repository
2. Setup Node.js 20 with npm cache
3. `npm ci` — install all dependencies including Playwright
4. `npx playwright install chromium --with-deps` — install Chromium + system deps
5. Create `.env.local` from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets
6. Create `.env.screenshots.local` from email constants + password secrets (individual per-account passwords override the shared password via shell `${INDIVIDUAL:-${SHARED}}`)
7. Start Vite dev server in background on `127.0.0.1:5173`
8. Wait up to 60 seconds for app server to respond
9. Dry-run (`--dry-run`) — validates env files, prints route catalogue, no screenshots taken
10. Full capture — REAL_AUTH is verified at startup (exits code 2 if dev/admin-only mode detected, code 1 if any login fails)
11. Generate `index.html` gallery and `screenshot-run-summary.md`
12. Create `full-role-page-screenshot-baseline.zip`
13. Write job summary from `screenshot-run-summary.md`
14. Upload artifact `full-role-page-screenshot-baseline` (if `upload_screenshots != 'false'`)

---

## Uploaded Artifact Contents

Artifact name: `full-role-page-screenshot-baseline`

```
docs/artifact-context/screenshots/
  index.html                              — visual gallery
  screenshot-run-summary.md              — text summary
  full-role-page-screenshot-baseline.zip — all screenshots in one archive
  <account-key>/
    <module-slug>/
      <route-name>.png                   — individual screenshots
```

Excluded from artifact:
- `.auth/` (Playwright storage state — contains session tokens)
- `.env.local`, `.env.screenshots.local` (never uploaded)

---

## Security Protections

- Secrets are passed as env vars (masked by GitHub Actions in all logs)
- Credential files are created via shell variable substitution (values never echoed as literal strings)
- `.env.local` and `.env.screenshots.local` are gitignored and not committed
- `.auth/` (Playwright storage state) is gitignored and excluded from artifacts
- Passwords never appear in screenshots, logs, summaries, or the HTML gallery
- The artifact does not contain any credential files

---

## How to Run the Workflow

1. Go to **Actions → Role/Page Screenshot Baseline** in GitHub
2. Click **Run workflow**
3. Leave inputs at defaults (or adjust as needed)
4. Click **Run workflow**
5. Wait ~30–40 minutes for the job to complete
6. Download the artifact from the job summary page

---

## How to Use the Output

### View locally

Unzip `full-role-page-screenshot-baseline.zip`. Open `index.html` in a browser to browse the gallery organised by account and module.

### Use with Claude Artifacts

1. Download and unzip the artifact
2. Open `index.html` — it is self-contained (no external dependencies)
3. Upload `index.html` to Claude as an artifact for UX review
4. Upload individual module screenshots to Claude for module-level review
5. Use the per-module briefs in `docs/artifact-context/{01..13}/artifact-brief.md` alongside screenshots as review context

---

## Tool Changes (CI Hardening)

`tools/screenshots/screenshot-accounts.mjs`:
- `resolveCredentials` now falls back to `SCREENSHOT_SHARED_PASSWORD` if the per-account password env var is unset (belt-and-suspenders alongside the workflow's shell fallback)

`tools/screenshots/capture-all-role-pages.mjs`:
- `IS_CI` detection via `process.env.CI` (set automatically by GitHub Actions)
- `waitForApp` timeout extended to 90s in CI (GitHub Actions runners boot slower)
- CI-friendly output: replace `process.stdout.write('.')` dots with line-per-attempt log lines
- GitHub Actions workflow command `::notice::` emitted at end of CI run with captured/error counts
- Current SHA read from `git rev-parse --short HEAD` and stored in `screenshot-run-results.json` (instead of hardcoded string)
