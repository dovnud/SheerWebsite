# Sheer Davidai — site

Single-page, WebGL-driven personal site. Plan, decisions and the facts audit: `../ADAPTATION_PLAN.md`. Reference teardown: `../TECH_TEARDOWN.md`.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build  -> dist/   (SITE_URL=https://… sets absolute social-image URLs)
npm run preview    # serve dist/ on :4173
```

- **Show media**: drop real footage in `public/media/` and edit `manifest.json` (see `public/media/README.md`). Until then each production chapter shows an abstract 3D object.
- **Deploy**: Cloudflare Pages, build `npm run build`, root `site`, output `dist`. Headers are in `public/_headers`.
- **Degrades gracefully**: `prefers-reduced-motion` (no smooth scroll, no pin, no trail, static frame), JavaScript disabled (all copy readable), WebGL unavailable (plain DOM), and a gate that cannot trap a visitor.
- **Checks** (headless Chromium, `tools/`): `shoot.mjs` (renders at desktop/mobile), `shoot-fallbacks.mjs` (reduced motion, no-JS, overflow at 320–1440 px), `make-og.mjs` (social image).
