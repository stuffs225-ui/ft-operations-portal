# Environment Variables

## Required (frontend — browser-safe)

| Variable | Where used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts:4`, `src/pages/Settings.tsx:466` | Your project URL. The app treats the placeholder `https://your-project-ref.supabase.co` as "not configured". |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:5` | Public anon key. Safe to ship to the browser (RLS enforces access). |

These are the **only** two variables the application bundle reads (verified by
grepping `import.meta.env` across `src/`). When both are set to real values the
app runs in **real Supabase mode**; otherwise it runs in **mock/dev mode**.

```ts
// src/lib/supabase.ts
export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey) &&
  supabaseUrl !== 'https://your-project-ref.supabase.co';
export const supabase = isSupabaseConfigured ? createClient(...) : null;
```
When unconfigured, `supabase` is `null` and every call site falls back to mock
data (49 guarded `supabase.from` sites).

## Optional (local-only / server-only — NEVER in the bundle)

| Variable | Where used | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/create-dev-users.ts` | Bypasses RLS. Local/CI only. **Never** prefix with `VITE_`. Never deploy. |
| `SUPABASE_URL` | `scripts/create-dev-users.ts` | Non-VITE project URL for the local admin script. |
| `SEED_USER_PASSWORD` | `scripts/create-dev-users.ts` | Optional default password for seeded users. |

`scripts/` is outside `tsconfig.app.json` (`include: ["src"]`) and is not bundled
by Vite, so these secrets cannot reach the browser.

## Security rules

- ✅ The anon key is the **only** Supabase credential in client code. Confirmed:
  no service-role key is referenced anywhere in `src/`.
- ❌ Never add a `VITE_` prefix to a secret — Vite inlines every `VITE_*` var
  into the public bundle.
- ❌ Never commit `.env` (already git-ignored alongside `.env.local`, `.env.*.local`).

## Hosting (Vercel / Netlify / Cloudflare Pages)

Set the two `VITE_` variables in the platform's environment settings (Production
+ Preview). Do **not** set `SUPABASE_SERVICE_ROLE_KEY` in any hosted environment.

| Setting | Value |
|---|---|
| Node version | `20` (pinned via `.nvmrc` and `package.json` `engines`) |
| Install | `npm install` |
| Build | `npm run build` (`tsc -b && vite build`) |
| Output dir | `dist` |

## Graceful degradation

If env vars are missing in a deployed build, the app **does not crash** — it
boots into mock/dev mode (hardcoded admin, static data) and shows the
`DevModeBanner` plus per-page "Dev mode — mock data" notices. For production this
means: if you forget to set the vars, you will see mock data with a dev banner
rather than an error — verify the banner is **absent** after deploying.
