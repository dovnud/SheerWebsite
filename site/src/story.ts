import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { urlTokens } from './theme';

/** The about text, revealed as you scroll. Four treatments live here so they can be compared; the default is the spotlight.
    Open the page with #spotlight, #curtain, #sweep or #foil on the address to see each. Reduced motion and no-JS show plain text. */
type Mode = 'spotlight' | 'curtain' | 'sweep' | 'foil';
const MODES: Mode[] = ['spotlight', 'curtain', 'sweep', 'foil'];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

export function initStory(reduced: boolean) {
  const sec = document.getElementById('story'); const card = sec?.querySelector<HTMLElement>('.story-card'); const text = sec?.querySelector<HTMLElement>('.story-text');
  const cv = sec?.querySelector<HTMLCanvasElement>('.story-foil'); if (!sec || !card || !text || !cv || reduced) return;
  const mode = (urlTokens().find((t) => (MODES as string[]).includes(t)) ?? 'spotlight') as Mode;
  sec.dataset.reveal = mode;
  if (mode === 'foil') return initFoil(sec, card, cv);
  cv.remove();

  // split each paragraph into its wrapped lines (re-done on resize), keeping the full sentence for screen readers
  const paras = [...text.querySelectorAll<HTMLElement>('p')]; const originals = paras.map((p) => p.textContent ?? '');
  type L = { ln: HTMLElement; inner: HTMLElement; bar?: HTMLElement; y: number; h: number };
  let lines: L[] = []; let cardY = 0; let beam: HTMLElement | undefined; let curtain: HTMLElement | undefined; let panels: HTMLElement[] = [];

  const build = () => {
    lines = [];
    paras.forEach((p, pi) => {
      p.textContent = ''; p.setAttribute('aria-label', originals[pi]);
      const words = originals[pi].split(/\s+/).filter(Boolean).map((w) => { const s = document.createElement('span'); s.className = 'wd'; s.textContent = w + ' '; p.append(s); return s; });
      const groups: string[] = []; let cur = '', top = -99;
      words.forEach((w) => { if (Math.abs(w.offsetTop - top) > 4) { if (cur) groups.push(cur); cur = ''; top = w.offsetTop; } cur += w.textContent; });
      if (cur) groups.push(cur);
      p.textContent = '';
      groups.forEach((g) => {
        const ln = document.createElement('span'); ln.className = 'ln'; ln.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span'); inner.className = 'li'; inner.textContent = g.trimEnd(); ln.append(inner);
        let bar: HTMLElement | undefined; if (mode === 'sweep') { bar = document.createElement('i'); bar.className = 'bar'; ln.append(bar); }
        p.append(ln); lines.push({ ln, inner, bar, y: 0, h: 0 });
      });
    });
    const cr = card.getBoundingClientRect(); cardY = cr.top + scrollY;
    lines.forEach((L) => { const r = L.ln.getBoundingClientRect(); L.y = r.top + scrollY; L.h = r.height; });
    if (mode === 'spotlight' && !beam) { beam = document.createElement('div'); beam.className = 'story-beam'; beam.setAttribute('aria-hidden', 'true'); card.prepend(beam); }
    if (mode === 'curtain' && !curtain) {
      curtain = document.createElement('div'); curtain.className = 'curtain'; curtain.setAttribute('aria-hidden', 'true');
      panels = ['l', 'r'].map((s) => { const d = document.createElement('div'); d.className = `cp ${s}`; curtain!.append(d); return d; }); card.append(curtain);
    }
    update();
  };

  const update = () => {
    const vh = innerHeight, y = scrollY;
    if (mode === 'spotlight') {
      const T = vh * 0.62; let head = -1;
      lines.forEach((L, i) => {
        const top = L.y - y, lit = 1 - clamp((top - T) / (vh * 0.2)); L.inner.style.opacity = (0.12 + 0.88 * ease(lit)).toFixed(3);
        if (top <= T) head = i;
      });
      if (beam) {
        const L = lines[Math.max(0, head)]; const over = lines.length && lines[lines.length - 1].y - y < T - vh * 0.12;
        beam.style.transform = `translateY(${(L ? L.y - cardY + L.h / 2 : 0) - beam.offsetHeight / 2}px)`; beam.style.opacity = head < 0 || over ? '0' : '1';
      }
    } else if (mode === 'sweep') {
      lines.forEach((L) => {
        const lp = clamp((vh * 0.9 - (L.y - y)) / (vh * 0.2));
        L.inner.style.clipPath = `inset(-4px ${((1 - lp) * 100).toFixed(2)}% -4px 0)`;
        if (L.bar) { const w = L.inner.offsetWidth; L.bar.style.transform = `translateX(${(lp * w).toFixed(1)}px)`; L.bar.style.opacity = lp > 0.001 && lp < 0.999 ? '1' : '0'; }
      });
    } else if (mode === 'curtain' && curtain) {
      const p = ease(clamp((vh * 0.88 - (cardY - y)) / (vh * 0.62)));
      panels[0].style.transform = `translateX(${(-p * 101).toFixed(2)}%)`; panels[1].style.transform = `translateX(${(p * 101).toFixed(2)}%)`;
      curtain.style.visibility = p >= 0.999 ? 'hidden' : 'visible';
    }
  };

  sec.classList.add('split');
  document.fonts.ready.then(() => { build(); ScrollTrigger.refresh(); });
  let rw = 0; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; build(); } });
  addEventListener('scroll', update, { passive: true });
  ScrollTrigger.addEventListener('refresh', () => { const cr = card.getBoundingClientRect(); cardY = cr.top + scrollY; lines.forEach((L) => { const r = L.ln.getBoundingClientRect(); L.y = r.top + scrollY; L.h = r.height; }); update(); });
}

/** Gold foil, scratched clear by an automatic hand-drawn path as the section scrolls. */
function initFoil(sec: HTMLElement, card: HTMLElement, cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!; let w = 0, h = 0, dpr = 1, pts: number[] = [], brush = 40, drawn = 0, prog = 0;
  const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const foil = () => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e2c27a'); g.addColorStop(0.35, '#b98d38'); g.addColorStop(0.55, '#e9cf8d'); g.addColorStop(1, '#a87a2a');
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = seeded(7);
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, l = 8 + r() * 40; ctx.strokeStyle = r() > 0.5 ? 'rgba(255,240,200,.16)' : 'rgba(90,55,10,.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 2); ctx.stroke(); }
  };
  const path = () => {
    const r = seeded(21), rows = Math.ceil(h / (brush * 0.62)) + 1, per = 14; pts = [];
    for (let i = 0; i < rows; i++) { const y0 = Math.min(h, i * brush * 0.62) + (r() - 0.5) * brush * 0.2, dir = i % 2 ? -1 : 1;
      for (let k = 0; k <= per; k++) { const t = k / per, x = (dir > 0 ? t : 1 - t) * (w + brush * 2) - brush; pts.push(x + (r() - 0.5) * brush * 0.5, y0 + Math.sin(t * 9 + i) * brush * 0.28 + (r() - 0.5) * brush * 0.3); } }
  };
  const strokeTo = (n: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = Math.max(1, drawn); i < n; i++) { ctx.lineWidth = brush * (0.9 + 0.35 * Math.sin(i * 1.7)); ctx.beginPath(); ctx.moveTo(pts[(i - 1) * 2], pts[(i - 1) * 2 + 1]); ctx.lineTo(pts[i * 2], pts[i * 2 + 1]); ctx.stroke(); }
    drawn = Math.max(drawn, n);
  };
  const apply = (p: number) => { prog = p; const total = pts.length / 2; if (p >= 0.985) { cv.style.opacity = '0'; strokeTo(total); return; } cv.style.opacity = '1'; strokeTo(Math.floor(p / 0.985 * total)); };
  const build = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = card.clientWidth; h = card.clientHeight; brush = Math.max(30, Math.min(56, w * 0.05)); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); foil(); path(); drawn = 0; apply(prog); };
  sec.classList.add('foiled'); document.fonts.ready.then(() => { build(); ScrollTrigger.refresh(); });
  let rw = 0; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; build(); } });
  ScrollTrigger.create({ trigger: card, start: 'top 82%', end: 'top 14%', scrub: 0.5, onUpdate: (s) => apply(s.progress) });
}
