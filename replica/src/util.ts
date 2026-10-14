export const qs = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
export const qsa = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches && matchMedia('(min-width: 768px)').matches;
export function store(key: string, val?: string): string | null {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch { /* storage can throw in private windows */ }
  return null;
}
export function hasWebGL2(): boolean {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
