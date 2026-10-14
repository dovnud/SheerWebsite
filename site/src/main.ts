import '@fontsource/bodoni-moda/400.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/700.css';
import 'lenis/dist/lenis.css';
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { qs, qsa, pad3, reducedMotion, hasWebGL2 } from './util';
import { AudioEngine } from './audio';
import { initGrain } from './grain';
import { initTrail } from './trail';
import { initScratch } from './scratch';
import { initReveals } from './reveals';
import { initServices } from './services';
import { initContact } from './contact';
import { createMedia } from './media';
import { runGate } from './gate';
import type { World } from './gl/world';

const root = document.documentElement;
root.classList.remove('no-js'); root.classList.add('js');
const reduced = reducedMotion();
const audio = new AudioEngine();
gsap.registerPlugin(ScrollTrigger);

async function boot() {
  const useGL = hasWebGL2();
  root.classList.add(useGL ? 'has-gl' : 'no-gl');
  if (!reduced) root.classList.add('has-trail');
  root.classList.add('has-grain');

  // smooth scroll (native when reduced motion is requested); held until ENTER
  let lenis: Lenis | null = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    lenis.stop();
  } else { root.style.overflow = 'hidden'; }

  // world (WebGL) — optional: the page stays usable without it
  let world: World | null = null;
  const tasks: Promise<unknown>[] = [document.fonts.load('400 100px "Bodoni Moda"'), document.fonts.load('400 16px "Instrument Sans"'), document.fonts.load('700 16px "Instrument Sans"')];
  if (useGL) {
    try {
      const { World } = await import('./gl/world');
      world = new World({ canvas: qs<HTMLCanvasElement>('#gl')!, reduced, heroLines: ['SHEER', 'DAVIDAI'] });
      world.onKick = () => audio.tick(0.035, 1800);
      const w = world;
      tasks.push(document.fonts.ready.then(() => w.init()));
    } catch (e) { console.warn('WebGL world failed; falling back to DOM only', e); (root.classList.remove('has-gl'), root.classList.add('no-gl')); world = null; }
  }

  const grainTick = initGrain(qs<HTMLCanvasElement>('#grain')!, !reduced);
  const trailTick = reduced ? null : initTrail();
  initReveals(); initScratch(reduced);
  const media = createMedia(world, reduced);
  initServices({ reduced, lenis, world, audio, media: () => media });
  void media.load();
  initContact({ reduced, lenis, audio });

  // header state
  const counter = qs('#counter')!, soundBtn = qs('#sound')!, soundLabel = qs('#sound-label')!;
  const syncSound = () => { soundLabel.textContent = audio.on ? 'SOUND ON' : 'SOUND OFF'; soundBtn.setAttribute('aria-pressed', String(audio.on)); };
  syncSound();
  soundBtn.addEventListener('click', () => { audio.setOn(!audio.on); syncSound(); });
  qsa('.btn-br, .lnk, #contact-open').forEach((b) => b.addEventListener('pointerenter', () => audio.blip(980, 0.05, 0.035)));
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { counter.textContent = `[ ${pad3(1 + s.progress * 98)} ]`; } });

  // theme: header / AR switch to black ink while over the white zone, hint hides after the hero
  const whites = qsa('.white-zone'), hint = qs('.scroll-hint')!;
  const theme = () => { root.classList.toggle('on-light', whites.some((z) => { const r = z.getBoundingClientRect(); return r.top <= 40 && r.bottom >= 40; })); (hint as HTMLElement).style.opacity = scrollY > innerHeight * 0.4 ? '0' : '1'; };
  addEventListener('scroll', theme, { passive: true }); theme();

  // phone hand-off: a QR panel for the current URL (desktop only)
  const ar = qs('#ar')!, panel = qs('#ar-panel')!; let qrDone = false;
  ar.addEventListener('click', async () => {
    const open = panel.hasAttribute('hidden'); panel.toggleAttribute('hidden', !open); ar.setAttribute('aria-expanded', String(open));
    if (open && !qrDone) { qrDone = true; const QR = await import('qrcode'); await QR.toCanvas(qs<HTMLCanvasElement>('#qr')!, location.href, { width: 200, margin: 1 }); }
  });

  // pointer + frame loop
  addEventListener('pointermove', (e) => world?.setPointer(e.clientX, e.clientY), { passive: true });
  addEventListener('scroll', () => world?.onScroll(scrollY), { passive: true });
  addEventListener('resize', () => { world?.resize(); ScrollTrigger.refresh(); });
  gsap.ticker.add((time) => { world?.update(time); trailTick?.(performance.now()); grainTick?.(); });

  runGate(tasks, {
    reduced, audio,
    onEnter: () => { world?.introHero(); if (lenis) lenis.start(); else root.style.overflow = ''; ScrollTrigger.refresh(); },
  });
  (window as unknown as { __replica: unknown }).__replica = { world, lenis };
}

boot().catch((e) => {
  // never leave a visitor stuck: drop the gate and show the plain page
  console.error(e); root.classList.add('no-gl'); root.style.overflow = ''; document.body.classList.add('entered');
});
