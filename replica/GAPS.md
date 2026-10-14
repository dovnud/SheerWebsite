# Replica gap list

What the replica does not match in the reference, and why. The reference is documented in `../TECH_TEARDOWN.md`
(`[code]` / `[net]` / `[render]` tags there mean "verified on the live site"). Everything here was rendered and
checked in headless Chromium with **software WebGL** only. I have not seen it on a real GPU or a real phone.

## What is reproduced (checked in renders)

| Reference behaviour | Replica | Evidence |
|---|---|---|
| Black gate, drawn wordmark, `[ ENTER ]` | Same structure; counter follows real task completion (fonts, WebGL init, Rapier init); ENTER is the audio-unlock gesture | `docs/replica-evidence/01…` |
| Orange wipe into the hero | Bottom-up `scaleY` wipe, then reveal | not captured mid-wipe (software GL too slow to time it) |
| Hero: huge serif headline, 3D glass chevron refracting the letters, orange shader gradient | Headline drawn to a texture inside the scene; procedural chevron with a transmission material refracts it; gradient is a hand-written fbm shader that follows the pointer | `02…` |
| Fixed bar: wordmark, `[ SOUND ON ]`, scroll-percentage counter `[ 001 ]`–`[ 099 ]`, CONTACT; `[ AR ]` bottom right; "SCROLL FOR MORE" | Same; header and AR switch to black ink over the white zone | `02…`, `03…` |
| Typewriter body copy, justified giant statements, white panels with hard colour cuts | Same technique (per-character / per-word spans scrubbed by ScrollTrigger; lines justified with flex) | `03…` |
| "Scratch around" canvas | Pointer strokes reveal a placeholder wordmark through a mask; one self-playing scribble so touch users see it | `04…` |
| Pinned three-step section, ~9 viewports of scroll, numeral roll, per-character title swap, Prev/Next, a different 3D object per step | Same, with a torus, an asterisk and a sphere | `05…` |
| Footer: pile of 3D symbols on Rapier, black field, huge wordmark | Same; pointer pushes the pile; black edge tracks the footer's top | `06…` |
| CONTACT → fullscreen overlay (not a page) | Dialog with focus trap, Esc, inert page behind it | `contact_overlay` |
| Two-canvas pointer trail (white and orange, orange clipped to white panels) | Same idea; orange canvas clip-path follows the white zone's rectangle each frame | not visible in static shots |
| `[ AR ]` opens a QR panel | Opens a QR of the current URL | `ar_panel` |
| Film-grain overlay | Own fragment shader on a fixed canvas | all shots |
| Lenis + GSAP ScrollTrigger + three.js + Rapier | Same libraries (current versions: three r186, GSAP 3.15, Lenis 1.3, Rapier 0.21) | `package.json` |

## Where the replica falls short, and why

1. **No authored 3D assets.** The reference ships commissioned, Draco-compressed models (about 20 MB), matcap textures and an HDR environment. I cannot and should not copy them, so the replica uses primitives: an extruded chevron, a torus, merged boxes, a sphere with a cone. The glass chevron uses three's built-in `RoomEnvironment` instead of an authored HDR. Result: it reads as glass, but with less surface detail and a harder edge than the original. On software GL the transmission pass also shows blocky refraction at the edges; that may be better on a real GPU (unverified).
2. **Footer physics uses ball colliders.** Plus and asterisk shapes can visually overlap where their arms reach past the sphere. The reference's collider shapes were not inspected.
3. **Sound is synthesised.** Ambient pad, hover blip, step tick and a wipe whoosh from Web Audio. The reference ships 29 designed mp3s, and I could not listen to them, so I cannot say how close the character is. Collision sounds are a single throttled tick.
4. **Preloader.** The reference uses a Lottie logo animation and (in the DOM) a hidden counter. The replica draws an SVG stroke wordmark and shows a visible counter, because the brief asks for one. I did not observe a visible counter on the original.
5. **Orange wipe timing** is my interpretation: I did not capture the original's wipe.
6. **Scroll feel.** Lenis `lerp: 0.1` is the library default and a guess: I did not isolate the original's instance options. Pin length is 3 viewports per step (9 total) against roughly 11 on the original. Eases are `power2.out`/`none`, matching the dominant ones counted in the original's code, not measured per effect.
7. **Effects named in the brief but not found in the reference's code or renders** (so not built): marquee strip, ghosted outline typography. The word-by-word brightening and per-character reveals are implemented from the brief's description; I did not capture them live on the original, so their fidelity is **unverified**. The dot-in-ring cursor is also from the brief (the original's DOM has a `.mouse-cursor` layer I did not inspect).
8. **Type.** Display: **Bodoni Moda**. UI/body: **Instrument Sans** (700 for the footer wordmark only). See the comparison render `docs/replica-evidence/type-lab.jpg`. What each loses against the reference (OT Brut, Aeonik Pro, both commercial):
   - Bodoni Moda is wider and rounder than OT Brut; it lacks OT Brut's wedge, stencil-like serifs. Instrument Serif was narrower and closer in proportion but too light. Gloock and Rozha One are heavier than the reference, and Playfair is softer.
   - Instrument Sans has taller caps and a larger ascent than Aeonik, so the reference's 0.75 line-height collapses lines into each other; the replica uses 1.05.
   - Licensed equivalents (for the owner to decide, nothing purchased): buy OT Brut and Aeonik Pro themselves, or pick a similar commercial display serif (a Didone-style with wedge serifs) and grotesque. Not evaluated here.
9. **Mobile differs on purpose.** On a 390 px phone the original scales its chevron so it covers most of the headline. The replica re-flows the headline to six stacked lines and shrinks the chevron. The replica's mobile payload is far lighter only because it has no authored models. It is **not** a like-for-like comparison.
10. **Rapier ships inside the bundle as base64 WASM** (about 4.3 MB, 1.67 MB gzipped), loaded lazily. The original loads Rapier from a CDN. A real build should serve the `.wasm` file directly.
11. **Not measured:** frame rate, GPU memory, Lighthouse/Web Vitals, real-device mobile behaviour, Safari/Firefox. Software GL only.
12. **Stack deviates from my earlier recommendation.** Vite + TypeScript, not Nuxt. The reference is one prerendered page with an empty payload and no data fetching, so Nuxt adds nothing the replica can use. Phase 3 can choose again.
13. **AR is a QR to this page only.** The reference hands off to a separate AR project.
14. **Headline text lives in the canvas** (an off-screen `<h1>` keeps it accessible and visible without JS). I did not check whether the original does the same.

## Additions the reference does not have (required by the brief)

- `prefers-reduced-motion` support: no Lenis, no pin, no trail, static GL frame, static footer pile. The original has none.
- Works without JS (headline and all copy readable, gate hidden) and without WebGL (falls back to plain DOM).
- No horizontal overflow at 320, 390, 768, 1024 or 1440 px (checked on the production build).
- Gate cannot trap a visitor: ENTER appears after 15 s even if an asset stalls; a failed boot drops the gate.

## Checks run

`tsc --noEmit` clean · `vite build` succeeds · no page errors in desktop, mobile or reduced-motion runs (only software-GL performance warnings) · overflow test at five widths · reduced-motion run · JS-disabled run against the production build. A bug found and fixed along the way: author CSS overrode the `hidden` attribute, so ENTER was clickable before the gate's handler existed.
