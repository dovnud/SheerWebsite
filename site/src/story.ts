import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** The about text under a moving spotlight. Every line starts dim; a warm light travels down the page as you scroll,
    and lines it has passed stay lit. Reduced motion and no-JS show the plain text. */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);

export function initStory(reduced: boolean) {
  const sec = document.getElementById('story'); const card = sec?.querySelector<HTMLElement>('.story-card'); const text = sec?.querySelector<HTMLElement>('.story-text');
  if (!sec || !card || !text || reduced) return;

  // split each paragraph into its wrapped lines (redone on resize), keeping the full sentence for screen readers
  const paras = [...text.querySelectorAll<HTMLElement>('p')]; const originals = paras.map((p) => p.textContent ?? '');
  type L = { ln: HTMLElement; inner: HTMLElement; y: number; h: number };
  let lines: L[] = []; let cardY = 0; let beam: HTMLElement | undefined;

  const measure = () => {
    cardY = card.getBoundingClientRect().top + scrollY;
    lines.forEach((L) => { const r = L.ln.getBoundingClientRect(); L.y = r.top + scrollY; L.h = r.height; });
  };

  const update = () => {
    const vh = innerHeight, y = scrollY, T = vh * 0.62; let head = -1;
    lines.forEach((L, i) => {
      const top = L.y - y, lit = 1 - clamp((top - T) / (vh * 0.2)); L.inner.style.opacity = (0.12 + 0.88 * ease(lit)).toFixed(3);
      if (top <= T) head = i;
    });
    if (!beam) return;
    const L = lines[Math.max(0, head)]; const over = lines.length > 0 && lines[lines.length - 1].y - y < T - vh * 0.12;
    beam.style.transform = `translateY(${(L ? L.y - cardY + L.h / 2 : 0) - beam.offsetHeight / 2}px)`; beam.style.opacity = head < 0 || over ? '0' : '1';
  };

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
        p.append(ln); lines.push({ ln, inner, y: 0, h: 0 });
      });
    });
    if (!beam) { beam = document.createElement('div'); beam.className = 'story-beam'; beam.setAttribute('aria-hidden', 'true'); card.prepend(beam); }
    measure(); update();
  };

  sec.classList.add('split');
  document.fonts.ready.then(() => { build(); ScrollTrigger.refresh(); });
  let rw = 0; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; build(); } });
  addEventListener('scroll', update, { passive: true });
  ScrollTrigger.addEventListener('refresh', () => { measure(); update(); });
}
