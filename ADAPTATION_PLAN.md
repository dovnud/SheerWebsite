# ADAPTATION_PLAN.md — from the reference to Sheer Davidai's site

The site is in `site/` (the clean-room replica scaffold is in `replica/`). The owner delegated every decision on 2026-10-14
("take all the decisions yourself, most beautiful result, nearest to the original"), so this document records **what I decided and why**,
so each call can be reversed later. Evidence for every claim about the reference is in `TECH_TEARDOWN.md`; renders are in `docs/site-evidence/`.

## 1. Decisions taken

| # | Decision | Why |
|---|---|---|
| 1 | **Keep the reference's real profile**: click-to-enter gate, shader background, glass 3D hero, pinned chapters, physics footer, grain, pointer trail, synthesised sound. | The teardown showed these are what make the original feel expensive (silence before the click, one accent colour, hard colour cuts, long pin, tactile 3D). Dropping them would drop the quality bar. |
| 2 | **Hero object: a glass SD monogram, chosen by the owner from four options (stage-light lens, fluted curtain, ghost light, SD).** The outlines are the real Bodoni S and D, extruded into bevelled glass that refracts her name. | KODE's chevron is their logo, so it is not copied. The owner picked SD for being unmistakably hers. The other three remain switchable with `?obj=lens|curtain|ghost|halo` for later; renders are in `docs/hero-options/`. |
| 2b | **Liquid exit on first scroll, one-way.** The first scroll away from the top hands the glass SD to a screen-space liquid layer: the metal ripples, spreads and crawls across the screen, pulls into dripping fingers, breaks into droplets and drains off the bottom, refracting the headline so her name appears as it leaves. It never comes back (including when scrolling back to the top). Under reduced motion the SD simply disappears on first scroll. | Owner request: "even more liquid, crawling on the screen, and it should not come back". Implemented as a full-screen fluid-style shader (`site/src/gl/liquid.ts`) over a render of the scene, about 3.8 s. |
| 3 | **Hero headline is her name**, `SHEER` / `DAVIDAI`, in the display serif; tagline `Producer \| Director & Choreographer` and the `(SHIR)` pronunciation under it. | Brand spelling is "Sheer"; the pronunciation is in the verified facts. |
| 4 | **Productions become three pinned full-screen chapters** (ROUGE, WOW, Extravaganza). **This is an invention on top of the reference**, which has no work pages. | The reference's pinned "Ideate / Create / Deliver" section is the nearest mechanism (numeral roll, per-character title swap, Prev/Next, one 3D object per step), and her three productions each carry real proof. Reusing the mechanism keeps the single-page feel and avoids template-style work pages. |
| 5 | **Real show media plugs into each chapter automatically** (`public/media/manifest.json`). Until a file exists, the chapter shows an abstract black 3D object. **No stock or generated imagery of people anywhere.** | Hard constraint. The site is fully designed to work without media and gets better the moment real footage exists. |
| 6 | **The reference's "Scratch around" canvas becomes a reveal of `WORKSHOP / READING / REVISION`**, beside the line about in-house development. | It carries the verified fact about how her work is developed, and it signals "new-work development", the strategic destination. |
| 7 | **The Lincoln Center application is not mentioned on the site.** The New York chapter says "New York nonprofit theater, with new-work development as the destination." | An application in progress should not be announced publicly. The owner can add a line later. |
| 8 | **Numbers appear only inside sentences** (`$8M+`, `80+`, `15–20 shows a week`, `13 years`, `30+ countries`). No stats band, no icon cards. | Hard constraint. |
| 9 | **The reference's `[ AR ]` becomes `[ PHONE ]`**: a QR of the live URL on desktop. | There is no AR experience to hand off to; the QR keeps the pattern honestly. |
| 10 | **Fonts: open-source stand-ins, Bodoni Moda (display) + Instrument Sans (UI/body).** | Closest open match found in the type lab (`docs/replica-evidence/type-lab.jpg`). Nothing purchased. See §6 for what is lost and the licensed alternative. |
| 11 | **Stack: Vite + TypeScript + three.js + GSAP/ScrollTrigger + Lenis, with a hand-written physics solver instead of Rapier.** Not Nuxt. | Same libraries as the reference except physics. The site is one static page with no data; Nuxt would add a framework with nothing to do. Rapier shipped as a 4.3 MB WebAssembly blob (1.7 MB gzipped) that a strict content-security policy can block; the footer pile is 26 spheres, so a ~90-line solver looks the same, costs a few KB and runs anywhere. Total JavaScript is now about 215 KB gzipped. |
| 12 | **Deploy target: Cloudflare Pages**, static `dist/`. Config and a manual workflow are in the repo; **I did not deploy** (no credentials; not mine to publish without the owner's account). | See §5. |
| 13 | **Copy is third-person, declarative, and uses only the verified facts.** No quotes, no testimonials, no invented dates. | Hard constraint. Positioning lines ("Vegas is the proof. New work is the destination.") restate the brief's strategic framing; they are drafts for her to approve. |

## 2. Pattern mapping (reference → Sheer)

| Reference pattern (verified in `TECH_TEARDOWN.md`) | Transfers to a one-person site? | What it becomes | Dropped / invented |
|---|---|---|---|
| Single page, no work pages | Yes | Single page | The three production chapters are invented (decision 4). |
| Click-to-enter gate, real asset counter, wordmark draws in | Yes | Gate with her name; the counter tracks fonts + WebGL init | Reference's Lottie logo replaced with an SVG stroke draw. |
| Orange wipe into hero, sound starts on the click | Yes | Same | — |
| Hero: shader gradient, giant serif, glass 3D | Yes | Gradient + `SHEER DAVIDAI` + glass SD monogram that exits as liquid | Chevron replaced (decision 2); the reveal is the owner's addition. |
| Palette: black, white, one orange `#FF4C00` | Yes | Same three colours + the same orange | Orange is the reference's brand colour; kept because it is the look the owner asked for. Her own palette can replace it with one variable change. |
| Fluid type scale (display 60→120 px, numerals up to 200 px, body 14–16 px) | Yes | Same measured scale | — |
| Statement panels on white, justified per-word lines, hard colour cuts | Yes | "Vegas is the proof. New work is the destination."; "Kept running while others were dark."; "New York." | Copy invented to carry verified facts. |
| Typewriter body copy at display size | Yes | The proof paragraphs | — |
| "Scratch around" canvas | Yes | Reveals WORKSHOP / READING / REVISION | Meaning added (decision 6). |
| Pinned 3-step services section | Yes | Productions chapters | The reference lists capabilities; ours lists verified facts per production. |
| Per-step 3D object | Partly | Abstract black objects until real footage exists | Reference objects were commissioned models; ours are procedural primitives. |
| Physics footer pile (the reference uses Rapier; ours is a custom solver) + giant wordmark + contact | Yes | Pile + `SHEER DAVIDAI` + email | The reference's newsletter box, studio address and team list are dropped: she is one person and has not asked for a mailing list. |
| CONTACT opens a fullscreen overlay | Yes | Same overlay (same markup as the footer) | — |
| Section counter `[ 001 ]–[ 099 ]` | Yes | Same (scroll percentage) | — |
| Two-canvas pointer trail, dot-in-ring cursor | Yes (desktop only) | Same | — |
| Film grain overlay | Yes | Same | — |
| `[ SOUND ON ]` toggle, ~29 designed sounds | Partly | Synthesised ambient + blips; toggle persisted | **Sound design is not copied.** If she wants a signature sound, it needs a composer and her sign-off. |
| `[ AR ]` → QR to AR site | Partly | `[ PHONE ]` → QR of this site | AR experience dropped. |
| No reduced-motion handling, same 30 MB on mobile | **No** | Reduced-motion mode, JS-off and WebGL-off fallbacks, lighter mobile settings | These are additions, not copies. |
| Studio team, address, "Our services", client logos | **No** | Not used | Studio-only. |
| Not in the reference: a career narrative | n/a | `Performer to producer` ledger | Invented structure, factual content only. |

## 3. Information architecture and the visitor's path

One page. Colour is the chapter marker (orange → white → orange → white → orange → white → black).

1. **Gate** (black): her name draws in, `[ ENTER ]`, sound unlocks.
2. **Opening** (orange): `SHEER DAVIDAI` with the glass SD monogram over it, tagline, `Las Vegas` in the bar. First scroll: the SD turns to liquid, crawls across the screen and drains away for good, leaving the name.
3. **The proof, in a paragraph** (orange): the two current roles, the combined scale, in-house development.
4. **"Vegas is the proof. New work is the destination."** (white) and the **scratch canvas** (white): in-house development, workshops, readings, revision.
5. **The productions** (orange, pinned, about 9 screens): ROUGE → WOW → Extravaganza, each with her role and the verified facts. Real footage appears here.
6. **Performer to producer** (white): a typographic ledger 2002 → now, plus education.
7. **Recognition** (orange): "Kept running while others were dark." with the COVID protocols, Inside Edition (March 2021), Best of Las Vegas Awards, *The Last Showgirl*, EB-1A.
8. **"New York."** (white): the next chapter.
9. **Contact** (black): the physics pile, `Sheer@shows-pro.com`, the overlay, a giant wordmark.

## 4. Asset list (real show media only)

The design works with none of this, and every item below is a place the design **depends on real media to reach its best state**.
Do not substitute stock or generated imagery of people. Rights must be held for everything supplied.

| Slot | Where it appears | What to supply | Spec |
|---|---|---|---|
| **ROUGE chapter video** | Pinned chapter 001, centre-left frame | A seamless 8–15 s loop: a wide stage shot of a full-company number (the moment where the whole cast is visible) | Landscape 16:9, H.264 MP4, 1920×1080, under ~6 MB, no audio needed |
| **ROUGE poster** | Same frame until video loads | One still from the same number | 16:9 JPG |
| **WOW chapter video + poster** | Chapter 002 | Same shape of footage from WOW — The Vegas Spectacular | Same |
| **Extravaganza chapter video + poster** | Chapter 003 | Footage from Extravaganza (2020–2023), ideally one that reflects the pandemic-era production | Same |
| *(optional)* Inside Edition clip link | Recognition paragraph | The URL of the March 2021 segment, so the mention can link out | `[NEEDS SOURCE]` |
| *(optional)* A portrait of Sheer | Contact overlay | One environmental portrait, shot by a photographer she chooses | 4:5 JPG; **not used today** — the design works without it |

Orientation note: all three videos are landscape because the chapter frame is landscape on desktop and re-fits to 84% width on mobile.
Where to put files and how to switch a chapter on: `site/public/media/README.md`.

## 5. Build plan

- **Repo**: `site/` = the site (`index.html`, `src/` modules for gate, world, services, reveals, scratch, trail, audio, media, contact; `public/` static files; `tools/` render scripts).
  `replica/` = the clean-room scaffold, kept as a reference.
- **Animation approach**: Lenis (smooth wheel, native touch) driving GSAP ScrollTrigger; one fixed WebGL canvas for the background, hero and chapter objects; a small custom sphere solver for the footer pile.
- **Iteration loop used**: build → render at 1440×900 and 390×844 in headless Chromium → review screenshots → adjust (screenshots in `docs/site-evidence/`).
- **Deploy to Cloudflare Pages**: build command `npm run build`, root `site`, output `dist`. A manual workflow is in `.github/workflows/deploy-site.yml` and needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Social-image URLs use `SITE_URL` (default `https://sheerdavidai.com`).
  **Not deployed by me.**

## 6. Type: what is lost, and the licensed alternative

| Role | Used now (open) | Reference (commercial) | What is lost |
|---|---|---|---|
| Display serif | Bodoni Moda | OT Brut | Wedge, stencil-like serifs and narrower proportions |
| UI / body sans | Instrument Sans | Aeonik Pro | Aeonik's tighter metrics (so line-height is 1.05, not 0.75) |

If she wants the exact reference look, the owner can buy those two families (or a similar Didone with wedge serifs plus a grotesque). Swapping is a change in `src/main.ts` imports and two CSS variables.

## 7. Facts audit: every claim on the page and its source

All sources are the owner's brief. "Interpretation" marks the places where I had to phrase something the brief leaves open.

| On the page | Source in the brief |
|---|---|
| Sheer (Shir) Davidai; Producer \| Director & Choreographer; Las Vegas | Identity / based in Las Vegas |
| Producing Artistic Director of ROUGE (The STRAT) and WOW — The Vegas Spectacular (Rio) | Current roles |
| $8M+ combined annual budgets; 80+ artists and staff; 15–20 shows per week | Current roles. **Interpretation:** stated as "between them" / "across both productions", reading the brief's "combined" as covering both. |
| All productions developed in-house; no licensed material; workshops, readings, revision | Development facts |
| Touring performer and dance captain 2002–2019; 13 years lead dancer, Sheketak, 30+ countries, Eurovision | Career arc |
| Associate director/choreographer 2006–2019: WOW franchise, Aqua Circus, Rome Circus | Career arc |
| Head of Artistic Development & Producing 2018–2020 | Career arc |
| Extravaganza 2020–2023 ("Formerly") | Current roles. **Interpretation:** her title there is not stated, so none is given. |
| EB-1A; Best of Las Vegas Awards; Special Advisor on *The Last Showgirl* (Gia Coppola) | Recognition |
| COVID safety protocols kept Extravaganza running while other large US productions were dark; Inside Edition, March 2021 | Recognition |
| Kibbutzim College of Education, performing arts | Education |
| New York nonprofit theater; new-work development as the destination | Strategic job (the Lincoln Center application is deliberately omitted) |
| Sheer@shows-pro.com | Professional contact |
| "Vegas is the proof. New work is the destination." | Restates "Vegas spectacle is the proof; new work development is the destination". **Positioning copy: a draft for her approval.** |
| © 2026 Sheer Davidai | The current year; not a historical claim |

Nothing on the page is a quote, testimonial, press line or invented credit.

## 8. Open items, with the call I made

Nothing here blocks the site. Each item has a default that ships today and a one-step change.

| Item | Call made | How to change it later |
|---|---|---|
| Real show footage | Chapters show abstract 3D objects until footage exists; the slot activates automatically. | Drop files in `site/public/media/` and edit `manifest.json`. Shot list in §4. |
| Positioning copy | Shipped as written in §7; the Lincoln Center line is omitted. | Edit `index.html`. |
| Scope of "$8M+ / 80+ / 15–20 shows" | Read as covering ROUGE and WOW together, matching the brief's word "combined". | Edit the three places in `index.html` if the brief meant something else. |
| Her title at Extravaganza | Not stated in the brief, so none is shown. | Add it to the chapter text. |
| Fonts | Open-source stand-ins (§6). Nothing purchased. | Swap imports and two CSS variables. |
| Domain and social image | `https://sheerdavidai.com` is the default `SITE_URL`; override at build time. | `SITE_URL=… npm run build`. |
| Going live | **Not possible from this environment**: there are no Cloudflare credentials here, and the sandbox proxy blocks the GitHub API path that enables Pages. A zero-secrets GitHub Pages workflow is ready (`.github/workflows/deploy-pages.yml`: set Settings → Pages → Source to GitHub Actions once, then run it). Everything else is ready: `npm run build` produces `dist/`, `public/_headers` sets caching, and `.github/workflows/deploy-site.yml` deploys it once `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets exist (or connect the repo in Cloudflare Pages: root `site`, build `npm run build`, output `dist`). | — |
| Private preview | Published as a private artifact: https://claude.ai/artifact/LnC8Aeg89v8Jq8NS55GJAp (same build, relative paths). | Republish from `site/` after any change. |
