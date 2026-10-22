# Brand assets

- `public/favicon.svg` — the logo mark (three rows merging into one). `Logo` in `src/ui/Icon.tsx` draws the same mark.
- `public/og.png` (1200×630 social preview) and `public/apple-touch-icon.png` are rendered from `og.html` and the logo:
  `PW=$(npm root -g)/playwright node scripts/brand/render.mjs`
- Colours: mint `#19D3A2` → violet `#7C5CFF`; dark background `#0B0B12`.
