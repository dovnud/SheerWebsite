import { qs } from './util';
import type { World } from './gl/world';

/** Real show-media slots. public/media/manifest.json maps a chapter key to {src, poster?}. A chapter with no entry
    (or a file that fails to load) keeps its slot hidden and the abstract 3D object stays on screen: nothing is faked. */
type Entry = { src: string; poster?: string } | null;
const KEYS = ['rouge', 'wow', 'extravaganza'] as const;

export function createMedia(world: World | null, reduced: boolean) {
  let cur = 0; let map: Record<string, Entry> = {};
  const slot = (k: string) => { const fig = qs<HTMLElement>(`[data-slot="${k}"]`); return { fig, v: fig ? qs<HTMLVideoElement>('video', fig) : null }; };

  const apply = () => KEYS.forEach((k, i) => {
    const { fig, v } = slot(k); const entry = map[k];
    if (!fig || !v || !entry) return;
    if (i === cur) {
      if (!v.src) { if (entry.poster) v.poster = entry.poster; v.src = entry.src; v.load(); }
      fig.hidden = false; fig.classList.add('on');
      if (reduced) v.pause(); else void v.play().catch(() => undefined);
    } else { fig.classList.remove('on'); v.pause(); }
  });

  return {
    show(step: number) { cur = step; apply(); },
    async load() {
      try { const r = await fetch(new URL('media/manifest.json', document.baseURI), { cache: 'no-cache' }); if (r.ok) map = await r.json(); } catch { return; }
      KEYS.forEach((k, i) => {
        const { fig, v } = slot(k); if (!fig || !v || !map[k]) return;
        v.addEventListener('loadeddata', () => { fig.dataset.ready = 'true'; world?.setHasMedia(i, true); }, { once: true });
        v.addEventListener('error', () => { delete map[k]; fig.hidden = true; fig.removeAttribute('data-ready'); world?.setHasMedia(i, false); }, { once: true });
      });
      apply();
    },
  };
}
