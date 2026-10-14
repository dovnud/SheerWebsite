import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { haloGeometry } from './shapes';
import { MONOGRAM } from './monogram-paths';

/** Candidate hero objects, all procedural glass that refracts the headline behind it.
    Pick one with ?obj=halo|lens|curtain|ghost (or #lens etc. in the URL). */
export type HeroVariant = 'halo' | 'lens' | 'curtain' | 'ghost' | 'sd';
export const HERO_VARIANTS: HeroVariant[] = ['halo', 'lens', 'curtain', 'ghost', 'sd'];

export interface HeroObject {
  obj: THREE.Object3D;
  /** size relative to the halo (whose diameter is the reference) */
  size: number;
  /** per-frame pose: tilt/spin from time, pointer (-1..1) and the intro progress k (0..1) */
  pose(o: THREE.Object3D, t: number, px: number, py: number, k: number, idle: number): void;
}

/** Stage-light lens: a stepped (Fresnel) glass disc, built as a lathe of sloped zones with hard steps between them. */
function lensGeometry(): THREE.BufferGeometry {
  const R = 1.5, zones = 8, base = 0.2, pitch = R / zones;
  const p: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(R, 0), new THREE.Vector2(R, base)];
  for (let i = 0; i < zones; i++) {
    const ro = R - i * pitch, ri = ro - pitch, tooth = 0.1 + 0.16 * (1 - i / zones);   // outer zones are steeper
    p.push(new THREE.Vector2(ro, base), new THREE.Vector2(Math.max(ri, 0.0001), base + tooth));
    if (i < zones - 1) p.push(new THREE.Vector2(ri, base));
  }
  const g = new THREE.LatheGeometry(p, 160);
  g.rotateX(Math.PI / 2);                  // axis toward the camera
  return toCreasedNormals(g, 0.5);
}

/** Fluted curtain: a glass slab whose front face is a row of half-round flutes. */
function curtainGeometry(): THREE.BufferGeometry {
  const W = 2.6, H = 3.3, ribs = 12, amp = 0.2, base = 0.14, N = ribs * 18;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, base);
  for (let i = N; i >= 0; i--) {
    const ph = (i / N * ribs) % 1, x = -W / 2 + (W * i) / N;
    s.lineTo(x, base + amp * Math.sqrt(Math.max(0, 1 - (2 * ph - 1) ** 2)));
  }
  s.lineTo(-W / 2, base); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.rotateX(Math.PI / 2); g.center();      // flutes face the camera, extrusion becomes the vertical axis
  return toCreasedNormals(g, 0.55);
}

/** SD monogram: her initials, the real Bodoni S and D outlines, extruded into thick bevelled glass. */
function monogramGeometry(): THREE.BufferGeometry {
  const shapes: THREE.Shape[] = [];
  for (const k of ['S', 'D'] as const) {
    const sp = new THREE.ShapePath();
    for (const c of MONOGRAM[k]) {
      if (c.type === 'M') sp.moveTo(c.x!, c.y!);
      else if (c.type === 'L') sp.lineTo(c.x!, c.y!);
      else if (c.type === 'Q') sp.quadraticCurveTo(c.x1!, c.y1!, c.x!, c.y!);
      else if (c.type === 'C') sp.bezierCurveTo(c.x1!, c.y1!, c.x2!, c.y2!, c.x!, c.y!);
    }
    shapes.push(...sp.toShapes());
  }
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.07, bevelSegments: 8, curveSegments: 14 });
  g.center();
  return toCreasedNormals(g, 0.5);
}

/** Ghost light: a solid glass bulb on a dark screw base, with a small glowing filament (the single light left on in an empty theater). */
function ghostGroup(glass: THREE.Material): THREE.Group {
  const prof: THREE.Vector2[] = [new THREE.Vector2(0, -1.2), new THREE.Vector2(0.4, -1.2), new THREE.Vector2(0.42, -0.95), new THREE.Vector2(0.55, -0.7)];
  const y0 = 0.35, r0 = 1.05;
  for (let a = Math.asin((-0.45 - y0) / r0); a <= Math.PI / 2 + 1e-6; a += 0.04) prof.push(new THREE.Vector2(Math.max(r0 * Math.cos(a), 0.0001), y0 + r0 * Math.sin(a)));
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glass);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.62, 48, 1), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.7, envMapIntensity: 0.9 }));
  base.position.y = -1.52;
  const fil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 16, 48), new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false }));
  fil.position.y = 0.35;
  const g = new THREE.Group(); g.add(bulb, base, fil); g.position.y = 0.2;
  const wrap = new THREE.Group(); wrap.add(g);
  return wrap;
}

export function buildHeroObject(v: HeroVariant, glass: THREE.Material): HeroObject {
  if (v === 'lens') return {
    obj: new THREE.Mesh(lensGeometry(), glass), size: 1.05,
    pose: (o, t, px, py, k, idle) => o.rotation.set(0.28 + py * -0.3 + Math.sin(t * 0.3) * 0.1 * idle + (1 - k) * 2.2, px * 0.45 + Math.sin(t * 0.23) * 0.2 * idle, t * 0.16 * idle),
  };
  if (v === 'curtain') return {
    obj: new THREE.Mesh(curtainGeometry(), glass), size: 0.92,
    pose: (o, t, px, py, k, idle) => o.rotation.set(py * -0.08, Math.sin(t * 0.4) * 0.55 * idle + px * 0.5 + (1 - k) * -2.4, Math.sin(t * 0.2) * 0.04 * idle),
  };
  if (v === 'sd') return {
    obj: new THREE.Mesh(monogramGeometry(), glass), size: 0.8,
    pose: (o, t, px, py, k, idle) => o.rotation.set(py * -0.12 + (1 - k) * -1.2, Math.sin(t * 0.45) * 0.4 * idle + px * 0.5 + (1 - k) * 2.6, Math.sin(t * 0.3) * 0.03 * idle),
  };
  if (v === 'ghost') return {
    obj: ghostGroup(glass), size: 0.95,
    pose: (o, t, px, py, k, idle) => o.rotation.set(py * -0.12 + 0.05, (1 - k) * 3 + px * 0.3, Math.sin(t * 0.5) * 0.07 * idle + px * 0.06),
  };
  return {
    obj: new THREE.Mesh(haloGeometry(), glass), size: 1,
    pose: (o, t, px, py, k, idle) => o.rotation.set(0.9 + py * -0.35 * idle + Math.sin(t * 0.31) * 0.12 * idle + (1 - k) * 2.6, px * 0.5 * idle + Math.sin(t * 0.23) * 0.18 * idle, t * 0.12 * idle),
  };
}
