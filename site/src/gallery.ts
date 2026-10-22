import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { qsa } from './util';

/** Picture-only gallery. public/media/manifest.json key "gallery" lists files in order; tiles without a file stay as empty frames. */
type Item = string | { src: string; alt?: string };
export function initGallery(reduced: boolean) {
  const tiles = qsa<HTMLElement>('[data-gallery] .gal-tile'); if (!tiles.length) return;

  if (!reduced) tiles.forEach((t, i) => {
    gsap.set(t, { clipPath: 'inset(0 0 100% 0)' });
    ScrollTrigger.create({ trigger: t, start: 'top 92%', once: true, onEnter: () => { gsap.to(t, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, delay: (i % 2) * 0.12, ease: 'power3.out', clearProps: 'clipPath' }); } });
  });

  void (async () => {
    try {
      const r = await fetch(new URL('media/manifest.json', document.baseURI), { cache: 'no-cache' }); if (!r.ok) return;
      const list = ((await r.json()) as { gallery?: Item[] }).gallery; if (!Array.isArray(list)) return;
      list.slice(0, tiles.length).forEach((it, i) => {
        const o = typeof it === 'string' ? { src: it } : it; if (!o?.src) return;
        const url = new URL(o.src, document.baseURI).href;
        if (/\.(mp4|webm|mov)$/i.test(o.src)) {
          const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
          v.addEventListener('loadeddata', () => { tiles[i].classList.add('has'); tiles[i].append(v); new IntersectionObserver(([e]) => { if (e.isIntersecting && !reduced) void v.play().catch(() => undefined); else v.pause(); }).observe(tiles[i]); }, { once: true }); v.src = url; v.load();
        } else {
          const im = new Image(); im.alt = o.alt ?? ''; im.decoding = 'async'; im.loading = 'lazy';
          im.addEventListener('load', () => { tiles[i].classList.add('has'); tiles[i].append(im); }, { once: true }); im.src = url;
        }
      });
    } catch { /* empty frames stay */ }
  })();
}
