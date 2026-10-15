import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** "Scratch around": pointer strokes reveal WORKSHOP / READING / REVISION through a mask canvas. */
import type { Theme } from './theme';
export function initScratch(reduced: boolean, theme: Theme) {
  const sec = document.getElementById('scratch') as HTMLElement, cv = document.getElementById('scratch-canvas') as HTMLCanvasElement;
  const ctx = cv.getContext('2d')!; const mask = document.createElement('canvas'), mctx = mask.getContext('2d')!;
  let w = 0, h = 0, dpr = 1, logo: HTMLCanvasElement | null = null, last: { x: number; y: number } | null = null, queued = false;

  const build = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = sec.clientWidth; h = sec.clientHeight;
    [cv, mask].forEach((c) => { c.width = w * dpr; c.height = h * dpr; });
    logo = document.createElement('canvas'); logo.width = w * dpr; logo.height = h * dpr;
    const l = logo.getContext('2d')!; l.scale(dpr, dpr);
    const words = ['WORKSHOP', 'READING', 'REVISION']; l.fillStyle = theme.accent; l.textAlign = w < 768 ? 'center' : 'left'; l.textBaseline = 'middle';
    l.font = '400 100px "Bodoni Moda", serif'; const widest = Math.max(...words.map((x) => l.measureText(x).width));
    const fs = Math.min((w * (w < 768 ? 0.86 : 0.58)) / widest * 100, (h * 0.62) / (words.length * 0.92));
    l.font = `400 ${fs}px "Bodoni Moda", serif`; const lh = fs * 0.92, y0 = h * (w < 768 ? 0.4 : 0.5) - (words.length - 1) * lh / 2;
    words.forEach((x, i) => l.fillText(x, w < 768 ? w / 2 : w * 0.04, y0 + i * lh));
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0); mctx.clearRect(0, 0, w, h);
    if (reduced) { mctx.fillStyle = '#000'; mctx.fillRect(0, 0, w, h); }
    paint();
  };
  const paint = () => {
    queued = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over'; if (logo) ctx.drawImage(logo, 0, 0);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0); ctx.globalCompositeOperation = 'source-over';
  };
  const stroke = (x: number, y: number) => {
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0); mctx.strokeStyle = '#000'; mctx.lineCap = 'round'; mctx.lineWidth = Math.max(26, w * 0.028);
    mctx.beginPath(); mctx.moveTo((last ?? { x, y }).x, (last ?? { x, y }).y); mctx.lineTo(x, y); mctx.stroke(); last = { x, y };
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  };
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let down = false;
  sec.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && !down) return; const p = pos(e); stroke(p.x, p.y); }, { passive: true });
  sec.addEventListener('pointerleave', () => { last = null; });
  sec.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { down = true; last = null; } });
  addEventListener('pointerup', () => { down = false; last = null; });
  document.fonts.ready.then(build);
  let rw = 0; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; build(); } });

  if (!reduced) {
    // one self-playing scribble when the section first scrolls in, so touch users see what the canvas does
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', once: true, onEnter: () => {
      const o = { t: 0 }; last = null;
      gsap.to(o, { t: 1, duration: 1.8, ease: 'power1.inOut', onUpdate: () => stroke(w * (0.18 + 0.4 * o.t) + Math.sin(o.t * 11) * w * 0.05, h * (0.4 + 0.18 * Math.sin(o.t * 7))), onComplete: () => { last = null; } });
    } });
  }
}
