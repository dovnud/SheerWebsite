# TECH_TEARDOWN.md — kodeimmersive.com

Phase 1 of the Sheer Davidai site brief. No site code has been written.

**Method.** All findings come from the live site on 2026-10-14: the served HTML and response headers, all 15 JS chunks, the CSS, `_payload.json`, `Signature.js`, and a headless Chromium (Playwright 1.56, software WebGL) run at 1440×900 and 390×844, with and without `prefers-reduced-motion`. Evidence images are in `docs/teardown-evidence/`.

**Tags.** `[code]` = read in the served source. `[net]` = observed in the network log or headers. `[render]` = seen in a rendered screenshot. `[inferred]` = my reading, not directly confirmed.

**Limits.** I could not hear audio, so what the sounds do is inferred from file names and call sites. Software WebGL is slow, so I did not measure frame rate. A few screenshots show the fixed header offset mid-scroll. I believe that is a headless artifact of the lerped scroll, so I draw no conclusion from it. The CONTACT click did not complete in my script, so the overlay's open animation is **not verified**. Its markup is in the HTML.

---

## 0. Corrections to the brief (read this first)

The brief's behavioral notes describe a different site from the one served today. The live build is `88fa3ad8…`, timestamped 2026-08-17 in `meta.json`. Several claims in the brief fail verification, and they change what Phase 2 has to be.

| Brief says | What I found | Tag |
|---|---|---|
| "No WebGL/3D scenes or particle effects" | **Heavily WebGL.** three.js **r178** with custom `ShaderMaterial`s, five Draco-compressed GLB models (about 20.6 MB), matcap textures, an HDR environment map, and **Rapier 0.18 physics** in the footer. One fixed full-viewport WebGL2 canvas is confirmed live. Further canvases named `webgl-noise`, `webgl-chevron` and a services canvas are in the DOM, but I did not confirm each one's GL context. | code, net, render |
| "Spectacle is editorial: video, type at extreme scale… changes the difficulty profile" | The difficulty profile is the opposite. The site is a **real-time 3D and audio build**, with type as one layer of it. | all |
| Full-screen background **video** in the hero; **video masked inside the letterforms** | **There is no video.** There is no `<video>` in the SSR HTML or the live DOM. The JS and network log contain no `.mp4`, `.webm` or `.m3u8` references. The hero is the headline **"INNOVATE WITH PURPOSE"** over a shader gradient with a **3D glass chevron** passing in front of it. "STEP RIGHT INTO THE STORIES" is a justified, black-on-white statement with no video in the glyphs. | code, net, render |
| "Showreel embedded in the page" | No showreel exists. | net |
| "No Lenis detected" | **Lenis 1.2.3 is present.** `window.lenisVersion` is set and the `<html>` element carries the `lenis` class. | code, render |
| Section counter `[001]–[009]` | It is a **scroll-progress percentage**: `[001]` at the top, `[099]` at the end. I logged 002, 007, 023, 050, 057, 065, 089, 092, 095, 098 and 099 across the page. It does not count sections. | render |
| Click-to-enter gate with a 0→100 counter | The gate exists: a black screen, an animated Lottie logo, and `[ ENTER ]`. A `000` counter element exists in the DOM but is `display:none`, and I did not see a visible 0→100 count. | code, render |
| Brand orange `#FF2E00` | The theme colour and Tailwind `orange` are **`#FF4C00`** (`rgb(255 76 0)`). Sampled gradient pixels run from `#F04804` to `#FF5200`, and about `#FF3700` toward the edges. | code, render |
| "Mobile collapse could not be verified" | Verified, see §3.7 and §6. The page still ships the same 3D and audio payload on mobile. | net, render |
| "Walkthrough of the homepage **and one inner page**" | **There are no inner pages.** `/work`, `/contact`, `/about`, `/projects`, `/services` and `/sitemap.xml` all return 404, and `prerendered` is `["/"]`. See §2. | net |
| Fonts: Aeonik Pro and OT Brut | Confirmed. | code, net |
| `Signature.js` credits Malvah and Francesco Michelini | Confirmed. | net |
| Nuxt, Cloudflare, `__NUXT__`, `_payload.json` | Confirmed, with detail below. | net |

**Decision needed.** The brief's premise ("the spectacle is editorial video and type, so the build is easier") does not hold for the site as served today. If you were looking at an older version of the site, or at a different site, tell me which. Phase 2 should be planned against the real profile in §7: this is a **3D, shader, physics and sound** site.

---

## 1. Stack and rendering

- **Framework.** Nuxt 3 on **Vue 3.5.13**, with Pinia `[code]`. The bundle has `nuxt-app` and `nuxt-root` markers, `/_nuxt/` assets with content hashes, and `builds/meta/<id>.json` `[net]`.
- **Rendering.** The site is **fully prerendered (SSG)**. `meta.json` reports `"prerendered":["/"]`, and `_payload.json` is 69 bytes (`[{"data":1,"prerenderedAt":3},…,{}]`). There is **no runtime data fetching**: all content is hard-coded in the components, and no CMS or API sits behind the page `[net]`.
- **Styling.** **Tailwind 3.4.17** utilities plus scoped component CSS, inlined in the HTML (about 42 KB of CSS inline) `[code]`.
- **Hosting.** `server: cloudflare`, HTTP/2 and HTTP/3 (`alt-svc: h3`) `[net]`. The og:image points to `kode-immersive.pages.dev`, so it is **Cloudflare Pages** `[inferred]`. The HTML is `cache-control: public, max-age=0, must-revalidate` and the hashed `/_nuxt/*` files are `max-age=31536000, immutable` `[net]`.
- **Telemetry and third parties.** Cloudflare Web Analytics and RUM, Google Tag Manager and Analytics (`G-L2FPSKRDHS`), and Cloudflare's challenge script `[net]`.
- **Runtime CDN dependencies.** Two things load from **jsDelivr at runtime, not from the site's own origin**: `@dimforge/rapier3d-compat@0.18.0` (about 784 KB) and the `@lottiefiles/dotlottie-web@0.49.0` WASM (about 568 KB) `[net]`. If that CDN is slow or blocked, the physics or the preloader may fail `[inferred]`.
- **Credits.** `Signature.js` logs "Developed by francescomichelini.com / Designed by malvah.co" `[net]`.

## 2. Route and page inventory

- **One route, `/`.** Every other path I tried returns 404 `[net]`. There are no work, case-study, project or detail pages, so **there is no inner-page pattern to copy**. This matters for Phase 2, because the reference gives no structure for project pages at all.
- **Navigation** `[render]`: a fixed bar. On desktop it shows a `KODE` link at the left, the wordmark in the centre, `[ SOUND ON ]`, a scroll-percentage counter, and `CONTACT`. On mobile it collapses to the wordmark, the counter, and `MENU`. A fixed `[ AR ]` button sits bottom right, and "SCROLL FOR MORE" sits bottom centre.
- **Sections in order** `[render, code]`:
  1. **Preloader and gate.** A black screen with an animated Lottie logo, then `[ ENTER ]`.
  2. **Hero.** "INNOVATE WITH PURPOSE" in OT Brut over an orange shader gradient, with a 3D glass chevron.
  3. **Sub-hero statement.** A typewriter-style reveal of "We see no limit to the potential of emerging technology…".
  4. **Justified statement 01.** "With the help of technology, you can now step right into the stories. The emotional impact is off the scale. Tell stories people love, share & remember." It is set in huge OT Brut caps on white, with a separate line-broken markup for mobile.
  5. **"Scratch around".** A canvas where the visitor scratches to reveal a logo drawing. Orange strokes appear under the cursor, and a typewriter paragraph follows.
  6. **Services, pinned.** The container is `h-[1100svh]`, about **11 viewports of scroll** `[code]`. It steps through "001 Ideate / 002 Create / 003 Deliver". Each step has a giant numeral, a title, a short description and a list of capabilities, with **Prev / Next** buttons. Each step has its own 3D object (a ring, an asterisk, a balloon) `[render, net]`.
  7. **Justified statement 02.** "Creating new physical and virtual worlds, where creativity knows no bounds", then "We help our clients stay bold…".
  8. **Footer and contact panel.** A black screen where a pile of 3D symbols (chevron, ring, plus, asterisk) is physics-driven, with names, address, email sign-up and a huge wordmark. The same markup is the `connect-overlay` that CONTACT opens `[code]`. At the end of the page I saw the same content, so I believe the footer is that panel scrolled into view `[inferred]`.
- **How project or work pages are structured.** They do not exist on this site. The only "work" content is the services list. Any Phase 2 production chapters are our own invention.

## 3. Motion system

### 3.1 Libraries and versions `[code]`
- **GSAP 3.12.5** with ScrollTrigger and Observer. Flip and Draggable are also bundled, and strings for ScrollSmoother and SplitText appear, but I did not confirm that those two are used.
- **Lenis 1.2.3** for smooth scroll. The defaults are `smoothWheel: true`, `syncTouch: false` and `lerp: 0.1`. I did not isolate the app's own instance options.
- **three.js r178**, **Rapier 0.18.0** (from jsDelivr), **dotLottie 0.49.0**, and Draco decoding (`/draco/`).
- Four web workers (`worker-*.js`) are loaded `[net]`. I did not map each to a task. They are likely used for physics and decoding `[inferred]`.

### 3.2 Preloader `[net, render]`
- The gate is a **real asset gate, not a fake timer**. Before Enter the page loads the HDR environment (1.7 MB), the chevron model (2.9 MB), the ring and symbols models, Draco, Rapier, the dotLottie WASM and the four workers, roughly **7–8 MB** in total. `[ ENTER ]` appears about 1.2–1.4 s into my runs. Here, "visible" means the button appeared; it does not mean everything had finished downloading.
- Enter is a **user gesture**, which also unlocks audio.

### 3.3 After Enter `[net]`
- The two large models (`asterisk.glb` 9.4 MB and `baloon.glb` 7.5 MB) and **29 audio files** (about 4.8 MB) start downloading **only after the click**. The audio set is an ambient loop, button-hover, "glass smash" ×5, an asterisk magnet-static loop, a circle loop, "plus" ×~12 and footer icon sounds ×6.
- The audio engine uses `createBufferSource` (the Web Audio API). I did not hear it, so what the sounds do is `[inferred]` from file names and call sites.
- The full orange wipe from the gate into the hero is **not captured**. My first post-click frame, at 300 ms, already showed the finished orange hero.

### 3.4 Scroll model `[code, render]`
- **Lenis smooth scroll**, with GSAP ScrollTrigger, `scrub: true` in most places, and one `scrub: false`. The services section is pinned for about 11 viewports (`h-[1100svh]`).
- The counter is bound to scroll progress. The page measures **14,443 px** on desktop and **12,270 px** on a 390 px phone.
- **Statements.** The justified text is built from per-word spans on per-line spans (see the markup in §2). A typewriter class handles the body paragraphs. I did not capture the word-by-word brightening live.

### 3.5 Easing and timing character `[code]`
- The easings in the code are mostly **`power2.out`** (18 uses) and **`power1.out`**, with `sine.out`, `circ.out`, `power1.inOut`, `expo` and `none` (scrubs) used sparingly.
- Durations are mostly **1 s**, with 0.4–0.6 s for micro-states, plus **2.3 s** and **1.1 s** for set pieces.
- CSS transitions use Tailwind's `cubic-bezier(.4,0,.2,1)` and `cubic-bezier(0,0,.2,1)`. Button brackets shift ±50% on hover over 0.3 s, and colour changes take 0.5 s.
- The character is **soft-landing and unhurried**: there are no springy overshoots in the code I read.

### 3.6 Cursor and hover `[code, render]`
- Two **full-screen 2D canvases** (`MouseTrail`, `trail-lifetime: 400`) draw a trail in white and a trail in orange `#FF4C00`. The orange one is clipped by a `clip-path` polygon, so the trail changes colour depending on the section underneath.
- There is also a `.mouse-cursor` layer.
- Buttons use `[ bracket ]` styling, where the brackets slide outward on hover. This is gated by `@media (hover:hover) and (pointer:fine)`.
- **Scratch to reveal.** The "Scratch around" canvas is pointer-driven.
- **AR.** On desktop it opens a QR panel (`/qrcode.webp`). On touch devices it is a plain link to `kodeimmersive-ar.pages.dev` `[code]`. The AR experience is a separate site.

### 3.7 Mobile and `prefers-reduced-motion`
- **Mobile layout** `[code, render]`:
  - The grid is 6 columns on mobile and 5 columns at ≥768 px.
  - The nav collapses to wordmark, counter and `MENU`.
  - The mouse trail and custom cursor are hidden below 768 px (`md-down:invisible`, cursor `display: none`).
  - Justified statements have their own mobile markup with different line breaks.
  - `syncTouch: false` means touch scroll stays native.
- **Mobile cost** `[net, render]`: nothing is reduced. Mobile downloads the **same ~20 MB of models and ~4.8 MB of audio**. In my 390 px render the 3D chevron is scaled up and **covers most of the headline**, so legibility suffers.
- **`prefers-reduced-motion`**: **there is no handling at all.** The string does not appear in any CSS or JS file. With reduced motion emulated, the page loaded the same assets and Lenis still ran `[net]`. For Sheer's site this is a requirement we must **add**, not copy.

## 4. Visual system

- **Typefaces** `[code, net]`:
  - **Aeonik Pro** Regular 400 (sans) for UI and body, and **OT Brut** Regular 400 (serif display) for the large headlines, each as woff2 with a woff fallback (47 KB and 20 KB), `font-display: swap`. Only **two weights in total, both 400**. The hierarchy comes from size and case, not weight.
  - Both are commercial fonts.
- **Scale** `[code]`: fluid sizes that interpolate between 390 px and 1440 px viewports.

  | Style | Min | Max (≥1440) | Notes |
  |---|---|---|---|
  | `display-4` (giant numerals) | 60 px | 200 px | letter-spacing +0.08em |
  | `display-0` (statements) | 60 px | 120 px | line-height 0.9 |
  | `display-1` | 30 px | 60 px | letter-spacing −0.08em |
  | `display-3` | 24 px | 34 px | typewriter paragraphs |
  | `display-2` | 22 px | 34 px | line-height 0.75 |
  | `body-3` | 16 px | 22 px | |
  | `body-1` | 14 px | 16 px | line-height 0.75 |

  Line heights are tight (0.75–0.95), so the type sets as dense blocks.
- **Palette** `[code, render]`: black `#000`, white `#FFF`, orange **`#FF4C00`**, and a gradient that moves between roughly `#F04804` and `#FF3700`. There is one accent green, `#33CA7F` (Tailwind `green`), whose use I did not find on screen. The theme colour meta is `#FF4C00`.
- **Surface** `[render]`: white sections and the orange gradient carry film grain (the `webgl-noise` overlay is a full-screen fixed canvas at `z-[70]`).
- **Grid and spacing** `[code]`: `site-grid` with 10 px gaps, 5 or 6 columns, and page padding of 10 px on mobile and 22 px at ≥768 px. The body bar is `py-[1.125rem]`.
- **The canvases' role** `[code, render]`. In the live DOM there are about 10 canvases:
  - `webgl-background` is a fixed full-viewport canvas with a confirmed WebGL2 context. It holds the orange gradient and, I believe, the chevron `[inferred]`.
  - `webgl-noise` is the grain overlay (class name and `z-[70]` fixed layer; context not confirmed).
  - `webgl-chevron` is a section canvas for the hero chevron (context not confirmed).
  - Services has its own canvas for the ring, asterisk and balloon, with a mobile wrapper (context not confirmed).
  - A 2D canvas draws the Lottie preloader.
  - A 2D canvas handles the scratch reveal.
  - Two 2D canvases draw the mouse trails.
  - The footer's canvas runs the Rapier physics pile.
- **Overlays.** There are no dark image scrims, because there is no photography. Everything is flat colour, shader and 3D.

## 5. Media strategy

- **No photographs and no video** `[net]`. Imagery is limited to the QR code (`qrcode.webp`, 8 KB), four matcap textures (about 36–53 KB each, WebP) and the 3D models.
- **3D models** `[net]`: Draco-compressed GLBs served uncompressed by the CDN: `circle` 0.6 MB, `symbols` 0.2 MB, `Chevron_BaseState` 2.9 MB, `baloon` 7.5 MB, `asterisk` 9.4 MB.
- **HDR.** `option_8.hdr` is 1.7 MB.
- **Audio** is 29 mp3 files, about 4.8 MB.
- **Caching.** The models, HDR, audio and the Draco WASM are served `max-age=0, must-revalidate` or 14400 s, **not immutable**. Repeat visits revalidate the 17 MB of GLBs (`[net]`).
- **Poster or fallback.** I found no poster image or static fallback. If WebGL fails, the page logic for that case was not verified `[not verified]`.

## 6. Performance shape

| Item | Size on the wire | When |
|---|---|---|
| HTML (SSR, br) | about 14 KB wire (65.7 KB decoded) | first |
| Main JS `Dn5CFQ0G.js` | **453 KB br** (3.09 MB decoded) | before paint |
| Other JS chunks | about 0.2 MB | before and after |
| Fonts | 67 KB | early |
| Pre-Enter assets (HDR, chevron, circle, symbols, Draco, Rapier, Lottie WASM, workers) | **~8 MB** | gated by the preloader |
| `asterisk.glb` + `baloon.glb` | **16.9 MB** | after Enter |
| Audio (29 files) | **4.8 MB** | after Enter |

- Total transferred on a first visit is on the order of **30 MB**, the same on desktop and mobile `[net]`. This is my sum of per-file sizes, not a measured total transfer.
- First paint depends on the HTML and the inline CSS, then the 453 KB main bundle. The first screen (a black gate) paints quickly because it needs nothing heavy. The preloader exists to hide the remaining 8 MB `[inferred]`.
- Everything big is deferred behind the gate and the click. This is the central performance idea of the site.
- Not measured: frame rate, GPU memory, Lighthouse and Core Web Vitals. Software WebGL makes my numbers meaningless for that.

## 7. Custom vs library

| Effect | Library default or bespoke |
|---|---|
| Smooth scroll | **Library** (Lenis), configuration only |
| Pinned services, scrubbed motion | **Library** (GSAP ScrollTrigger), bespoke timelines |
| Word and line reveal, typewriter | Bespoke markup (per-word spans) driven by GSAP |
| Hero gradient, grain overlay, glass chevron material | **Bespoke shaders** (three.js `ShaderMaterial`, matcap, HDR env) |
| 3D models | **Commissioned or custom assets** (Draco GLBs) |
| Footer physics pile | Rapier (library) with bespoke scene |
| Mouse trail (white and orange) | **Bespoke 2D canvas** |
| "Scratch around" reveal | **Bespoke canvas** |
| Preloader logo | **Lottie file** (custom artwork, library player) |
| Sound design | **Bespoke audio assets**, custom Web Audio code |
| Bracket buttons, grid, type scale | Bespoke CSS on Tailwind |
| AR handoff | **Separate project** (`kodeimmersive-ar.pages.dev`) |

- **What this decides.** Almost everything that makes the site read as distinctive is **bespoke**: the shaders, the models, the sound, the trail and scratch canvases. The libraries (Nuxt, GSAP, Lenis, three, Rapier) are all free and standard.
- **The expensive part is assets, not code.** Models, sound design and artwork are where the budget would go. For Sheer's site the equivalent asset is **real show photography and video**, which only the shows can supply.
- None of the heavy 3D can be reused for a person's site without an equivalent reason to exist. See §9.

## 8. Behavioral walkthrough (homepage; there is no inner page)

1. **First 1–2 s.** A black screen. The logo draws in as a Lottie animation, and nothing else is on the page.
2. **About 1.3 s.** `[ ENTER ]` appears. The page is waiting for a click and is quiet. This silence is deliberate.
3. **Click.** Audio starts, the screen goes orange, and the hero arrives: "INNOVATE WITH PURPOSE" in tall black serif caps with the glass chevron floating through the letters. I did not capture the wipe itself.
4. **Scroll 1.** The counter ticks up. The hero gives way to a typewriter paragraph in sans caps on orange, bottom right.
5. **Scroll 2.** A hard cut to **white** with enormous justified serif caps, where the hero's wordmark message turns into a statement.
6. **Scroll 3.** "Scratch around": the visitor draws orange strokes on a white field. A sentence appears beside it.
7. **Scroll 4, the long middle.** The page pins for about 11 screens while "001 Ideate" becomes 002 and 003. Each step has a giant numeral, a 3D object, and a short list.
8. **Scroll 5.** A closing statement, then a hard cut to **black**.
9. **End.** A pile of 3D symbols is shown with contact details, and the wordmark stands at huge scale across the bottom edge.

**Pacing.** Roughly one idea per screen, separated by hard colour changes (orange → white → orange → black).

## 9. What makes this site feel expensive

1. **Silence before the click.** The page loads in silence behind a gate, so audio and heavy assets start on the visitor's own gesture. Sound arrives with the reveal (§3.3).
2. **Two typefaces at two extremes.** A condensed high-contrast serif at up to 200 px against a plain grotesque at 14–16 px, both at weight 400 only. Hierarchy comes from scale contrast, not weights (§4).
3. **Type set at leading 0.75–0.95.** Lines nearly touch, so statements read as solid blocks rather than text (§4).
4. **A near-monochrome palette: black, white and one orange.** One accent colour (`#FF4C00`) is used as a surface, so nothing competes with it. The green is never seen (§4).
5. **Hard colour cuts, not fades, between sections.** Orange to white to orange to black reads as chapters (§8).
6. **A real 3D object that interacts with the type.** The glass chevron refracts the letters behind it. Its material is a shader with an HDR environment, which is why it looks like glass and not a PNG (§4, §7).
7. **Film grain over everything.** A full-screen noise canvas at the top z-index unifies the flat colour, the 3D and the type (§4).
8. **The pin is long, about 11 screens for three steps.** Slow scroll-scrubbed pacing, plus Lenis lerp, makes the page feel heavy and deliberate (§3.4).
9. **Interaction with sound.** There are 29 sound files for hover, glass and magnet effects. Pointer events have audible consequences (§3.3).
10. **The cursor leaves a coloured trail that changes by section.** It is two canvases, clipped, and shows the visitor that the page is aware of them (§3.6).

**What does *not* make it expensive, so we should not copy it:** the ~30 MB payload, the identical weight on mobile, the missing reduced-motion support, and the 3D chevron overpowering the headline at 390 px.

---

## Open questions for review

1. **Which version of KODE did the brief describe?** The video-in-letters hero and the 001–009 section counter are not in the build served today. If there is an archived or staging version you want me to use, send me the URL or captures.
2. Does the owner want the **3D and sound profile** (§7), or an editorial profile built on **real show video**? The reference as served is the former, and it is not "easier".
3. Fonts and any purchase decisions are the owner's; I will propose options in Phase 2 only after this review.

Phase 2 does not start until you say so.
