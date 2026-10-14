import { finePointer } from './util';

/** Two stacked 2D canvases draw the same pointer trail: white over orange/black, orange over the white panels
    (the orange one is clipped to the white zone's rectangle each frame). Plus a small dot-in-ring cursor. */
export function initTrail(): ((t: number) => void) | null {
  if (!finePointer()) return null;
  const cw = document.getElementById('trail-white') as HTMLCanvasElement, co = document.getElementById('trail-orange') as HTMLCanvasElement;
  const cur = document.getElementById('cursor') as HTMLElement, zone = document.getElementById('white-zone') as HTMLElement;
  const ctxs = [cw.getContext('2d')!, co.getContext('2d')!];
  const colors = ['#ffffff', '#ff4c00'];
  let dpr = Math.min(devicePixelRatio || 1, 2);
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); [cw, co].forEach((c) => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }); };
  size(); addEventListener('resize', size);
  const pts: { x: number; y: number; t: number }[] = [];
  let cx = -100, cy = -100, rx = -100, ry = -100;
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); cx = e.clientX; cy = e.clientY; if (pts.length > 80) pts.shift(); }, { passive: true });
  const LIFE = 400;
  return (now: number) => {
    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    const z = zone.getBoundingClientRect(), top = Math.max(0, z.top), bot = Math.min(innerHeight, z.bottom);
    co.style.clipPath = bot > top ? `polygon(0 ${top}px, 100% ${top}px, 100% ${bot}px, 0 ${bot}px)` : 'polygon(0 0,0 0,0 0,0 0)';
    ctxs.forEach((c, k) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
      c.strokeStyle = colors[k]; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], age = 1 - (now - b.t) / LIFE;
        c.globalAlpha = Math.max(0, age); c.lineWidth = 1 + 9 * Math.max(0, age);
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    });
    rx += (cx - rx) * 0.22; ry += (cy - ry) * 0.22;
    cur.style.transform = `translate3d(${rx}px,${ry}px,0)`;
  };
}
