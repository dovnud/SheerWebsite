import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { qsa } from './util';

/** Word-by-word brightening on the justified statements, per-character typewriter on body copy. */
export function initReveals() {
  qsa('[data-statement], [data-statement2]').forEach((sec) => {
    const vis = qsa('.just', sec).find((j) => getComputedStyle(j).display !== 'none') ?? sec;
    const words = qsa('.line > span', sec);
    gsap.set(words, { opacity: 0.14 });
    ScrollTrigger.create({ trigger: sec, start: 'top 75%', end: 'bottom 55%', scrub: true, animation: gsap.to(words, { opacity: 1, stagger: 0.12, ease: 'none' }) });
    void vis;
  });
  qsa('[data-typewriter]').forEach((el) => {
    const chars: HTMLElement[] = [];
    qsa('p', el).forEach((p) => {
      const text = p.textContent ?? ''; p.setAttribute('aria-label', text); p.textContent = '';
      text.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { const sp = document.createElement('span'); sp.className = 'sp'; sp.setAttribute('aria-hidden', 'true'); p.append(sp, document.createTextNode('​')); return; }
        const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        [...tok].forEach((ch) => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.append(c); chars.push(c); });
        p.append(w);
      });
    });
    gsap.set(chars, { opacity: 0 });
    ScrollTrigger.create({ trigger: el, start: 'top 88%', end: 'top 38%', scrub: true, animation: gsap.to(chars, { opacity: 1, stagger: 0.04, ease: 'none' }) });
  });
}
