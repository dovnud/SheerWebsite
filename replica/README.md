# Replica scaffold (internal, never published)

Clean-room reproduction of the techniques catalogued in `../TECH_TEARDOWN.md`, with neutral placeholder content.
No reference assets are used: no logo, copy, fonts, models, audio or video from the original. Everything is
procedural geometry, hand-written shaders and synthesised sound. Fonts are open-source stand-ins (see `GAPS.md`).

```
npm install
npm run dev        # http://localhost:5173  (type comparison at /type-lab.html)
npm run build      # tsc --noEmit && vite build  -> dist/
npm run preview    # production build on :4173
```

| Piece | File |
|---|---|
| Gate: real-progress counter 0→100, ENTER, orange wipe, audio unlock | `src/gate.ts` |
| WebGL world: shader background, glass chevron refracting the headline, pinned-section objects, footer pile | `src/gl/world.ts`, `shapes.ts`, `footer.ts` |
| Rapier physics (attractor + pointer repulsion) | `src/gl/footer.ts` |
| Grain overlay (own WebGL fragment shader) | `src/grain.ts` |
| Smooth scroll, ScrollTrigger, counter, theme switch | `src/main.ts` |
| Pinned 3-step section, numeral roll, per-character title swap | `src/services.ts` |
| Word-by-word and typewriter reveals | `src/reveals.ts` |
| Scratch-to-reveal canvas | `src/scratch.ts` |
| Two-canvas pointer trail + cursor | `src/trail.ts` |
| Contact overlay (dialog, focus trap, Esc) | `src/contact.ts` |
| Synthesised audio | `src/audio.ts` |

Review tooling (needs a local Playwright; paths are for this sandbox): `tools/shoot.mjs`, `tools/shoot-fallbacks.mjs`.
