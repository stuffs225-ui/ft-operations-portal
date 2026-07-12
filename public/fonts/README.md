# Self-hosted fonts (Visual Identity D3)

Drop these woff2 files here to activate the identity typography (Inter + IBM
Plex Sans Arabic). Until they exist, the app falls through to the system UI font
(visually near-identical to Inter). No runtime CDN is used either way.

Expected files (both SIL OFL — download from the projects' GitHub releases or
`@fontsource` packages, then serve the woff2 from here):

- `Inter-roman.var.woff2`            (Inter variable, Latin)
- `IBMPlexSansArabic.woff2`          (IBM Plex Sans Arabic, weights 400–700)

Then uncomment the two `@font-face` blocks in `src/styles/index.css`.
