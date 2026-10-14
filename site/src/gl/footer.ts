import * as THREE from 'three';
import { haloGeometry, ringGeometry, plusGeometry, asteriskGeometry } from './shapes';

interface Body { x: number; y: number; vx: number; vy: number; r: number; m: number; q: THREE.Quaternion; w: THREE.Vector3; mesh: THREE.Mesh }

/** Footer pile: a small hand-written solid-sphere solver. Bodies are pulled toward a centre point, push each other apart,
    spin when they touch, and are repelled by the pointer. Pure JS: no WebAssembly, so it runs under any content-security policy. */
export class FooterPhysics {
  group = new THREE.Group();
  private bodies: Body[] = [];
  private center = { x: 0, y: 0 };
  private vw = 1;
  ready = false;
  onKick?: () => void;
  readonly clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  private tmpQ = new THREE.Quaternion(); private tmpA = new THREE.Vector3();

  async init(vw: number, fh: number) {
    this.vw = vw;
    const geos = [ringGeometry(), plusGeometry(), asteriskGeometry(), haloGeometry(), ringGeometry(), plusGeometry()];
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.26, metalness: 0.18, envMapIntensity: 1.0 });
    mat.clippingPlanes = [this.clip];
    const u = Math.min(64, Math.max(26, vw * 0.042));
    const N = vw < 768 ? 16 : 26;
    this.layout(vw, fh);
    for (let i = 0; i < N; i++) {
      const mesh = new THREE.Mesh(geos[i % geos.length], mat);
      const s = u * (0.8 + Math.random() * 0.55);
      mesh.scale.setScalar(s); this.group.add(mesh);
      const a = Math.random() * Math.PI * 2, rad = Math.random() * Math.min(vw, fh) * 0.34;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      this.bodies.push({ x: vw * 0.5 + Math.cos(a) * rad, y: fh * 0.45 + Math.sin(a) * rad, vx: 0, vy: 0, r: s * 0.82, m: s * s, q, w: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2), mesh });
    }
    this.ready = true; this.sync();
  }

  layout(vw: number, fh: number) { this.vw = vw; this.center = { x: vw * 0.5, y: fh * (vw < 768 ? 0.42 : 0.45) }; }

  /** settle the pile without animating (reduced motion) */
  settle(steps = 260) { for (let i = 0; i < steps; i++) this.step(null); this.sync(); }

  step(pointer: { x: number; y: number } | null) {
    if (!this.ready) return;
    const dt = 1 / 60, B = this.bodies; let kicked = false;
    for (const b of B) {
      b.vx += (this.center.x - b.x) * 3.4 * dt; b.vy += (this.center.y - b.y) * 3.4 * dt;
      if (pointer) {
        const dx = b.x - pointer.x, dy = b.y - pointer.y, d = Math.hypot(dx, dy), reach = 170 + b.r;
        if (d < reach && d > 0.001) { const k = (1 - d / reach) * 1500 * dt; b.vx += (dx / d) * k; b.vy += (dy / d) * k; b.w.x += (Math.random() - 0.5) * 0.6; b.w.y += (Math.random() - 0.5) * 0.6; kicked = true; }
      }
    }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j]; const dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r; const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = min - d, ia = 1 / a.m, ic = 1 / c.m, sum = ia + ic;
      a.x -= nx * over * (ia / sum); a.y -= ny * over * (ia / sum); c.x += nx * over * (ic / sum); c.y += ny * over * (ic / sum);
      const rvx = c.vx - a.vx, rvy = c.vy - a.vy, vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const jn = -(1 + 0.25) * vn / sum; a.vx -= jn * nx * ia; a.vy -= jn * ny * ia; c.vx += jn * nx * ic; c.vy += jn * ny * ic;
        const spin = (rvx * -ny + rvy * nx) * 0.012; a.w.z -= spin; c.w.z -= spin; a.w.x += ny * 0.4; c.w.y -= nx * 0.4;
      }
    }
    const damp = Math.exp(-2.4 * dt), wd = Math.exp(-1.3 * dt);
    for (const b of B) {
      b.vx *= damp; b.vy *= damp; b.x += b.vx * dt; b.y += b.vy * dt; b.w.multiplyScalar(wd);
      const ang = b.w.length() * dt; if (ang > 1e-5) { this.tmpA.copy(b.w).normalize(); this.tmpQ.setFromAxisAngle(this.tmpA, ang); b.q.premultiply(this.tmpQ).normalize(); }
    }
    if (kicked) this.onKick?.();
  }

  sync() { for (const b of this.bodies) { b.mesh.position.set(b.x - this.vw / 2, -b.y, 0); b.mesh.quaternion.copy(b.q); } }
}
