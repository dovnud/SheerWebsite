import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** The about text sits under a gold foil. As the section scrolls through, a hand-scratch path (rows of loose zig-zag strokes,
    top to bottom) wipes the foil away until every word is clear. It never needs the pointer. Without JS, or with reduced
    motion, there is no foil and the text is simply there. */
export function initStory(reduced: boolean) {
  const sec = document.getElementById('story'); const cv = sec?.querySelector<HTMLCanvasElement>('.story-foil'); if (!sec || !cv || reduced) return;
  const card = cv.parentElement as HTMLElement; const ctx = cv.getContext('2d')!;
  let w = 0, h = 0, dpr = 1, pts: number[] = [], brush = 40, drawn = 0, prog = 0;

  const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const foil = () => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e2c27a'); g.addColorStop(0.35, '#b98d38'); g.addColorStop(0.55, '#e9cf8d'); g.addColorStop(1, '#a87a2a');
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = seeded(7);
    for (let i = 0; i < 900; i++) {                         // fine brushed-metal flecks
      const x = r() * w, y = r() * h, l = 8 + r() * 40; ctx.strokeStyle = r() > 0.5 ? 'rgba(255,240,200,.16)' : 'rgba(90,55,10,.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 2); ctx.stroke();
    }
  };

  const path = () => {
    // rows of a loose zig-zag, spaced so neighbouring strokes overlap: every pixel is covered by the end
    const r = seeded(21), rows = Math.ceil(h / (brush * 0.62)) + 1, per = 14; pts = [];
    for (let i = 0; i < rows; i++) {
      const y0 = Math.min(h, i * brush * 0.62) + (r() - 0.5) * brush * 0.2, dir = i % 2 ? -1 : 1;
      for (let k = 0; k <= per; k++) {
        const t = k / per, x = (dir > 0 ? t : 1 - t) * (w + brush * 2) - brush;
        pts.push(x + (r() - 0.5) * brush * 0.5, y0 + Math.sin(t * 9 + i) * brush * 0.28 + (r() - 0.5) * brush * 0.3);
      }
    }
  };

  const strokeTo = (n: number) => {                          // draw point pairs [drawn, n)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = Math.max(1, drawn); i < n; i++) {
      ctx.lineWidth = brush * (0.9 + 0.35 * Math.sin(i * 1.7));
      ctx.beginPath(); ctx.moveTo(pts[(i - 1) * 2], pts[(i - 1) * 2 + 1]); ctx.lineTo(pts[i * 2], pts[i * 2 + 1]); ctx.stroke();
    }
    drawn = Math.max(drawn, n);
  };

  const apply = (p: number) => {
    prog = p; const total = pts.length / 2;
    if (p >= 0.985) { cv.style.opacity = '0'; cv.style.pointerEvents = 'none'; strokeTo(total); return; }
    cv.style.opacity = '1'; strokeTo(Math.floor(p / 0.985 * total));
  };

  const build = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = card.clientWidth; h = card.clientHeight; brush = Math.max(30, Math.min(56, w * 0.05));
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    foil(); path(); drawn = 0; apply(prog);
  };

  sec.classList.add('foiled');
  document.fonts.ready.then(() => { build(); ScrollTrigger.refresh(); });
  let rw = 0; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; build(); } });
  ScrollTrigger.create({ trigger: card, start: 'top 82%', end: 'top 14%', scrub: 0.5, onUpdate: (s) => apply(s.progress) });
}
