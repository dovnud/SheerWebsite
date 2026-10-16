import { qs } from './util';

/** Decorative background film in the section after the hero. Muted, looped, no controls, never focusable or clickable.
    manifest.json key "backdrop" supplies the real footage; until then a slow abstract light canvas stands in. It only
    runs while on screen, and holds a still frame under reduced motion. */
export function initBackdrop(reduced: boolean) {
  const box = qs<HTMLElement>('[data-bgvid]'); if (!box) return;
  const v = qs<HTMLVideoElement>('video', box)!, cv = qs<HTMLCanvasElement>('canvas', box)!, c = cv.getContext('2d')!;
  let on = false, raf = 0, real = false;

  const paint = (t: number) => {
    const w = cv.width, h = cv.height; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#12040a'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const x = w * (0.5 + 0.38 * Math.sin(t * (0.18 + i * 0.06) + i * 2.1)), s = 70 + 40 * Math.sin(t * 0.35 + i);
      const g = c.createLinearGradient(x, 0, x, h); g.addColorStop(0, 'rgba(255,205,140,.55)'); g.addColorStop(1, 'rgba(255,205,140,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 5, 0); c.lineTo(x + 5, 0); c.lineTo(x + s, h); c.lineTo(x - s, h); c.closePath(); c.fill();
    }
    for (let x = 0; x < w; x += 8) { const a = 0.07 + 0.07 * Math.sin(x * 0.04 + t * 0.6) * Math.sin(x * 0.012 - t * 0.25); c.fillStyle = `rgba(255,110,100,${Math.max(0, a)})`; c.fillRect(x, 0, 8, h); }
  };
  const loop = (ms: number) => { if (!on) return; if (!real) paint(ms / 1000); raf = requestAnimationFrame(loop); };
  paint(1.2);

  const sync = () => {
    cancelAnimationFrame(raf);
    if (real) { if (on && !reduced) void v.play().catch(() => undefined); else v.pause(); }
    else if (on && !reduced) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => { on = e.isIntersecting; sync(); }, { rootMargin: '10% 0px' }).observe(box);

  void (async () => {
    try {
      const r = await fetch(new URL('media/manifest.json', document.baseURI), { cache: 'no-cache' }); if (!r.ok) return;
      const m = (await r.json()) as Record<string, { src: string; poster?: string } | null>; const e = m.backdrop; if (!e) return;
      v.addEventListener('loadeddata', () => { real = true; box.classList.add('live'); cv.style.display = 'none'; if (reduced) v.currentTime = 0.1; sync(); }, { once: true });
      v.addEventListener('error', () => undefined, { once: true });   // keep the placeholder on failure
      if (e.poster) v.poster = new URL(e.poster, document.baseURI).href;
      v.preload = 'auto'; v.src = new URL(e.src, document.baseURI).href; v.load();
    } catch { /* placeholder stays */ }
  })();
}
