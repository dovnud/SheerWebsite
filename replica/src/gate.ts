import { gsap } from 'gsap';
import { qs, pad3 } from './util';
import type { AudioEngine } from './audio';

/** Click-to-enter gate. The counter follows real task completion; ENTER is the user gesture that unlocks audio. */
export function runGate(tasks: Promise<unknown>[], opts: { reduced: boolean; audio: AudioEngine; onEnter: () => void; minMs?: number }) {
  const count = qs('#gate-count')!, enter = qs<HTMLButtonElement>('#enter')!, mark = qs<SVGTextElement>('.gate-mark-text')!, wipe = qs('#wipe')!;
  const p = { v: 0 }; let done = 0; const total = tasks.length + 1;
  const render = () => { count.textContent = pad3(p.v); };
  const bump = () => { done++; gsap.to(p, { v: (done / total) * 100, duration: opts.reduced ? 0 : 0.9, ease: 'power2.out', overwrite: true, onUpdate: render, onComplete: () => { if (done >= total) ready(); } }); };
  let isReady = false;
  const ready = () => { if (isReady) return; isReady = true; p.v = 100; render(); enter.hidden = false; gsap.fromTo(enter, { opacity: 0 }, { opacity: 1, duration: opts.reduced ? 0 : 0.6 }); enter.focus({ preventScroll: true }); };
  gsap.to(mark, { strokeDashoffset: 0, fill: '#fff', duration: opts.reduced ? 0 : 2.4, ease: 'power2.inOut', delay: 0.1 });
  const min = new Promise((r) => setTimeout(r, opts.reduced ? 0 : (opts.minMs ?? 1600)));
  Promise.all([min]).then(bump);
  tasks.forEach((t) => Promise.resolve(t).catch(() => undefined).then(bump));
  setTimeout(ready, 15000); // never trap a visitor behind a stalled asset

  enter.addEventListener('click', async () => {
    enter.disabled = true;
    void opts.audio.start();           // inside the click: this is the gesture that unlocks audio
    opts.audio.whoosh();
    const tl = gsap.timeline();
    tl.set(wipe, { scaleY: 0, transformOrigin: 'bottom' })
      .to(wipe, { scaleY: 1, duration: opts.reduced ? 0 : 0.8, ease: 'power3.inOut' })
      .add(() => { document.body.classList.add('entered'); opts.onEnter(); })
      .set(wipe, { transformOrigin: 'top' })
      .to(wipe, { scaleY: 0, duration: opts.reduced ? 0 : 0.9, ease: 'power3.inOut' }, '+=0.05');
  }, { once: true });
}
