# Where the videos and pictures go

Everything lives in this folder: `site/public/media/`. Drop the files here, then list them in `manifest.json` in the same folder.
Use relative paths (no leading slash), for example `media/reel.mp4`. Nothing else needs to change; `npm run build` copies this folder.

```
site/public/media/
  manifest.json
  sd.mp4        (+ sd.jpg)       plays INSIDE the 3D SD letters on the first screen
  reel.mp4      (+ reel.jpg)     plays on the rectangular reel screen under the first screen
  rouge.mp4, wow.mp4, extravaganza.mp4   (+ .jpg posters)   optional: replace the gold shape on a production screen
  gallery/01.jpg ... 07.jpg      the gallery (pictures or short mp4/webm clips)
```

```json
{
  "sd":   { "src": "media/sd.mp4",   "poster": "media/sd.jpg" },
  "reel": { "src": "media/reel.mp4", "poster": "media/reel.jpg" },
  "gallery": ["media/gallery/01.jpg", "media/gallery/02.jpg", { "src": "media/gallery/03.jpg", "alt": "Short description for screen readers" }],
  "rouge": null, "wow": null, "extravaganza": null
}
```

A `null` (or a missing file) keeps the built-in placeholder. The gallery has seven frames; empty frames stay as dark outlines.

## Specs

| Slot | Shape | Look | Length and size |
| --- | --- | --- | --- |
| `sd` | landscape 16:9 | dark or low-key; it is shown at about 55% over the glass, bright flat footage washes the glass out | 6–12 s seamless loop, under ~5 MB |
| `reel` | landscape 16:9 | the reel, shown at full strength, no controls, muted, looping, not clickable | 10–20 s loop, under ~6 MB |
| gallery | any; frames are 4:5, 16:10, 1:1 and 16:9 and crop to fit | stills or short silent clips | JPG/WebP under ~400 KB each |

All video: H.264 MP4 (or WebM), **no audio track needed** (it plays muted), 1280×720 or 1920×1080. Add a `.jpg` poster so there is a picture before the video loads.
Videos play only while on screen and show a still frame when the visitor has reduced motion turned on.

---

# Details for the production screens

The three production chapters play real footage the moment a file exists. Until then the chapter shows an abstract 3D
object. Nothing here is stock or generated: only footage and stills of the actual shows, which the owner has the rights to use.

1. Put the files in this folder, for example `rouge.mp4`, `rouge.jpg`, `wow.mp4`, `wow.jpg`, `extravaganza.mp4`, `extravaganza.jpg`.
2. Edit `manifest.json` so each key points at its files (a `null` keeps the 3D object):

```json
{
  "rouge": { "src": "media/rouge.mp4", "poster": "media/rouge.jpg" },
  "wow": { "src": "media/wow.mp4", "poster": "media/wow.jpg" },
  "extravaganza": null
}
```

3. No code change and no rebuild logic: `npm run build` copies this folder to `dist/media/`.

Specs, per chapter: landscape 16:9, H.264 MP4, 1920×1080 or 1280×720, 8–15 s seamless loop, no audio track needed (it plays muted),
under about 6 MB, plus a 16:9 JPG poster. The full shot list is in `../../ADAPTATION_PLAN.md` §4.
