# Show media: drop files here

The three production chapters play real footage the moment a file exists. Until then the chapter shows an abstract 3D
object. Nothing here is stock or generated: only footage and stills of the actual shows, which the owner has the rights to use.

1. Put the files in this folder, for example `rouge.mp4`, `rouge.jpg`, `wow.mp4`, `wow.jpg`, `extravaganza.mp4`, `extravaganza.jpg`.
2. Edit `manifest.json` so each key points at its files (a `null` keeps the 3D object):

```json
{
  "rouge": { "src": "/media/rouge.mp4", "poster": "/media/rouge.jpg" },
  "wow": { "src": "/media/wow.mp4", "poster": "/media/wow.jpg" },
  "extravaganza": null
}
```

3. No code change and no rebuild logic: `npm run build` copies this folder to `dist/media/`.

Specs, per chapter: landscape 16:9, H.264 MP4, 1920×1080 or 1280×720, 8–15 s seamless loop, no audio track needed (it plays muted),
under about 6 MB, plus a 16:9 JPG poster. The full shot list is in `../../ADAPTATION_PLAN.md` §4.
