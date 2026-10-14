import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { qs, qsa, clamp } from './util';
import type { World } from './gl/world';
import type { AudioEngine } from './audio';
type MediaCtl = { show: (step: number) => void } | null;

/** Pinned three-step section: ~9 viewports of scroll, numeral roll, per-character title swap, Prev/Next. */
export function initServices(opts: { reduced: boolean; lenis: Lenis | null; world: World | null; audio: AudioEngine; media: () => MediaCtl }) {
  const sec = qs('#services')!, pin = qs('.services-pin', sec)!;
  const titles = qsa('[data-title]', sec), descs = qsa('[data-desc]', sec), lists = qsa('[data-list]', sec);
  const col = qsa('.roll > span', sec), prev = qs<HTMLButtonElement>('#svc-prev')!, next = qs<HTMLButtonElement>('#svc-next')!;
  const steps = titles.length;
  titles.forEach((t) => { const txt = t.textContent ?? ''; t.setAttribute('aria-label', txt); t.textContent = ''; [...txt].forEach((ch) => { const c = document.createElement('span'); c.className = 'c'; c.setAttribute('aria-hidden', 'true'); c.textContent = ch === ' ' ? ' ' : ch; t.append(c); }); });
  gsap.set(col, { yPercent: (i) => i * 100 });
  // titles differ in length (ROUGE … EXTRAVAGANZA): size each so it fits beside the numeral
  const head = qs('.svc-head', sec)!, num = qs('.svc-num', sec)!, tcol = qs('.svc-titles', sec)!;
  const fit = () => {
    const base = parseFloat(getComputedStyle(head).fontSize); const avail = head.clientWidth - num.getBoundingClientRect().width - base * 0.4;
    titles.forEach((t) => { t.style.fontSize = ''; t.style.width = 'max-content'; t.style.justifySelf = 'end'; const wd = t.getBoundingClientRect().width; if (wd > avail) t.style.fontSize = `${Math.floor(base * (avail / wd))}px`; });
    tcol.style.height = '';
  };
  document.fonts.ready.then(fit); addEventListener('resize', fit);
  let cur = -1;
  const show = (i: number, first = false) => {
    if (i === cur) return; const dir = i > cur ? 1 : -1; const prevI = cur; cur = i;
    prev.disabled = i === 0; next.disabled = i === steps - 1;
    opts.world?.setStep(i); opts.media()?.show(i);
    if (!first) opts.audio.tick(0.07, 3200 + i * 500);
    const dur = opts.reduced ? 0 : 0.7;
    gsap.to(col, { yPercent: (k) => (k - i) * 100, duration: dur, ease: 'power2.out' });
    [titles, descs, lists].forEach((set, si) => set.forEach((el, k) => {
      const on = k === i; const was = k === prevI;
      if (on) { el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); }
      if (opts.reduced || first) { gsap.set(el, { opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' }); if (!on) el.classList.remove('on'); return; }
      if (on) {
        const kids = si === 0 ? qsa('.c', el) : [el];
        gsap.fromTo(kids, { yPercent: 60 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: si === 0 ? 0.025 : 0, ease: 'power2.out', overwrite: true });
        gsap.set(el, { visibility: 'visible', opacity: 1 });
      } else if (was) {
        gsap.to(el, { opacity: 0, duration: 0.25, ease: 'power1.out', onComplete: () => { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); gsap.set(el, { visibility: 'hidden' }); } });
      } else { el.setAttribute('aria-hidden', 'true'); gsap.set(el, { opacity: 0, visibility: 'hidden' }); }
    }));
  };
  show(0, true);
  if (opts.reduced) { /* no pin, no scrub: Prev/Next just switch the visible step */
    prev.addEventListener('click', () => show(clamp(cur - 1, 0, steps - 1))); next.addEventListener('click', () => show(clamp(cur + 1, 0, steps - 1)));
    return;
  }
  const per = () => innerHeight * 3;
  const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: () => `+=${per() * steps}`, pin: pin, pinSpacing: true, anticipatePin: 1, scrub: true, invalidateOnRefresh: true,
    onUpdate: (self) => show(clamp(Math.floor(self.progress * steps), 0, steps - 1)) });
  const go = (i: number) => { const y = st.start + (st.end - st.start) * (i / steps + 0.5 / steps); opts.lenis ? opts.lenis.scrollTo(y, { duration: 1.1 }) : scrollTo({ top: y }); };
  prev.addEventListener('click', () => go(clamp(cur - 1, 0, steps - 1)));
  next.addEventListener('click', () => go(clamp(cur + 1, 0, steps - 1)));
}
