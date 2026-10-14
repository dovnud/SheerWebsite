import { gsap } from 'gsap';
import type Lenis from 'lenis';
import { qs, qsa } from './util';
import type { AudioEngine } from './audio';

/** Fullscreen contact overlay (a dialog, not a page). The footer's contact block is cloned into it. */
export function initContact(opts: { reduced: boolean; lenis: Lenis | null; audio: AudioEngine }) {
  const ov = qs('#contact')!, body = qs('.contact-body', ov)!, openBtn = qs('#contact-open')!, closeBtn = qs('#contact-close')!;
  const src = qs('[data-contact-src]')!; const clone = src.cloneNode(true) as HTMLElement; clone.removeAttribute('data-contact-src'); body.append(clone);
  const inertEls = [qs('#main')!, qs('#site-header')!, qs('#bottom')!];
  let open = false, returnFocus: HTMLElement | null = null;
  const set = (v: boolean) => {
    if (v === open) return; open = v;
    if (v) {
      returnFocus = document.activeElement as HTMLElement; ov.hidden = false; ov.style.visibility = 'visible';
      inertEls.forEach((e) => e.setAttribute('inert', '')); opts.lenis?.stop(); document.documentElement.style.overflow = 'hidden'; opts.audio.blip(520, 0.12, 0.09);
      gsap.to(ov, { clipPath: 'inset(0% 0 0 0)', duration: opts.reduced ? 0 : 0.9, ease: 'power3.inOut' }); closeBtn.focus();
    } else {
      inertEls.forEach((e) => e.removeAttribute('inert')); opts.audio.blip(420, 0.1, 0.07);
      gsap.to(ov, { clipPath: 'inset(100% 0 0 0)', duration: opts.reduced ? 0 : 0.8, ease: 'power3.inOut', onComplete: () => { ov.hidden = true; ov.style.visibility = ''; opts.lenis?.start(); document.documentElement.style.overflow = ''; returnFocus?.focus(); } });
    }
  };
  openBtn.addEventListener('click', () => set(true)); closeBtn.addEventListener('click', () => set(false));
  addEventListener('keydown', (e) => {
    if (!open) return; if (e.key === 'Escape') set(false);
    if (e.key === 'Tab') { const f = qsa<HTMLElement>('button, a[href], input', ov).filter((x) => !x.hasAttribute('disabled')); if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
  });
}
