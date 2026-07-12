# Visual Identity v1.0 — Implementation Notes

Applies `FTOperationsIdentity.md` (NAFFCO Vehicles Division brand system) to the
portal. **Phase 1 — Foundation** (this change) restyles the whole app from the
token layer plus the app shell and shared components; no page logic, query, or
RLS is touched.

## The one big decision
Working primary = **Executive Navy `#2A4572`**, not red. NAFFCO Emergency Red
`#C8102E` appears in exactly three places: the logo mark, the sidebar active
bar, and the Danger semantic family. This keeps red readable as "attention".

## How it recolors 138 pages with no page edits
The identity is applied at the **Tailwind token layer** (`tailwind.config.js`),
so the ~5,000 existing color classes remap automatically:

| Tailwind scale | Remapped to | Effect |
|---|---|---|
| `brand-*` | Executive Navy | primary buttons, links, focus, active states |
| `gray-*` / `slate-*` / `charcoal-*` | cool-steel neutral | all surfaces, borders, text (blue-cast, sits next to navy) |
| `red-*` / `rose-*` | Danger (`#C8102E`) | error/danger only |
| `green-*` / `emerald-*` / `teal-*` | Success | positive states |
| `amber-*` / `yellow-*` / `orange-*` | Warning | attention states |
| `sky-*` / `blue-*` / `indigo-*` | Info = navy | unifies all blues into one "system" hue (kills the rainbow) |

Named tokens `success/warning/danger/info` (each `tint/border/text/DEFAULT`) and
`action` back the chip and button styles.

## Shell + components
- `index.css`: shadcn/Radix HSL vars → navy/steel, `--radius: 6px`, navy-tinted
  shadow scale, font stack (`Inter, "IBM Plex Sans Arabic", system…`), `.num`
  tabular-numeral utility, Google-Fonts CDN import removed (identity D3 — zero
  runtime CDN).
- **Sidebar** → dark navy `#16294A`, dim-white section labels, 36px items,
  active `#20375E` + 3px red left bar.
- **Header** → 56px, sticky, Navy Ink title.
- **BrandLogo** → identity interim FT mark (red square + "FT Operations").
- **Button** → navy primary / red danger / neutral secondary, 4px radius.
- **Badge** → rectangle chip (4px), tint+border+text, UPPERCASE; new
  `dangerSolid` (overdue / CRITICAL) and `outline` (sectors) variants.
- **Card** → 6px radius, neutral-200 border, `shadow-xs`.
- **`src/lib/statusChip.ts`** → `statusVariant()` maps every real status to a
  Badge variant (identity D2). Powers the Phase-2 page sweep.

## Fonts
Self-hosted per identity (no CDN). Drop the two woff2 files into
`/public/fonts/` (see its README) and uncomment the `@font-face` blocks in
`index.css`. Until then the stack falls through to the system UI font
(near-identical to Inter) — no failed requests.

## Phase 2 (follow-up, not in this PR)
Page sweep: replace ad-hoc status colors with `statusVariant()` + `Badge`,
restyle the printable reports to the A4 identity (D7), swap the login/report
logo when the official NAFFCO asset arrives, and consolidate the two component
families. The token remap already handles the bulk; Phase 2 is polish.
