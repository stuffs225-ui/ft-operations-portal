# Screenshot Baseline — Execution Status

**Branch:** `feature/post-qa-verification-critical-readiness-fixes`
**Base main SHA:** `b579fdc3199478b9c6eb049fa3c6827cc5d5135c`

> Real authentication is required and preserved. No demo auth, no weakened security.

---

## Status

| Item | Value |
|------|-------|
| Workflow | `.github/workflows/role-screenshot-baseline.yml` ("Role/Page Screenshot Baseline") |
| Trigger | `workflow_dispatch` (manual) |
| Required secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SCREENSHOT_SHARED_PASSWORD` (+ optional per-account `SCREENSHOT_<KEY>_EMAIL/_PASSWORD`) |
| Artifact | `full-role-page-screenshot-baseline` (`index.html` + summary + zip) |
| Route count (manifest) | **98 static / 121 total** |
| Critical routes included | `/sales`, `/admin/invoicing-schedule`, `/admin/sales-targets`, all module dashboards, deep-linked lists |
| Local run possible? | **No** — build sandbox has no Supabase secrets and the Supabase host is blocked by network egress (see live-verification results) |
| Manifest parse check | ✅ passes |
| Workflow reference check | ✅ no broken references found; **workflow file unchanged** |

---

## Manifest / workflow checks performed

- Parsed `tools/screenshots/screenshot-routes.mjs` → 98 static + 23 dynamic = 121 routes; both
  admin commercial-control routes present (added PR #148). No missing critical routes identified
  this sprint, so **no manifest change was needed**.
- Verified the workflow trigger, secret names, and artifact name are internally consistent.
- **No change** to the workflow YAML or auth mode (real auth preserved).

---

## Exact next manual action for the user

1. Ensure GitHub secrets are configured (table above).
2. GitHub → **Actions** → **Role/Page Screenshot Baseline** → **Run workflow** (`capture_mode = full`).
3. Download the **`full-role-page-screenshot-baseline`** artifact; open `index.html`.
4. Review, with special attention to:
   - `/sales` — should render the dashboard (data), **or** the new amber "migration pending" banner
     if migration 100 is absent (graceful, not a crash).
   - `/admin/invoicing-schedule`, `/admin/sales-targets` — data **or** calm "migration pending".
   - Each role landing page — no blank screens / console errors.
5. File any blank/error pages as blockers per the go/no-go matrix.
