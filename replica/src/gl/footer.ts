import * as THREE from 'three';
import { chevronGeometry, ringGeometry, plusGeometry, asteriskGeometry } from './shapes';

type RB = import('@dimforge/rapier3d-compat').RigidBody;
const S = 100; // px per physics unit

/** Footer pile: Rapier rigid bodies pulled to a centre point, repelled by the pointer. */
export class FooterPhysics {
  group = new THREE.Group();
  private items: { body: RB; mesh: THREE.Mesh; r: number }[] = [];
  private world?: import('@dimforge/rapier3d-compat').World;
  private R?: typeof import('@dimforge/rapier3d-compat').default;
  private center = { x: 0, y: 0 };
  private vw = 1; private fh = 1;
  ready = false;
  onKick?: () => void;
  readonly clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  async init(vw: number, fh: number) {
    const mod = await import('@dimforge/rapier3d-compat');
    this.R = mod.default; await this.R.init();
    this.world = new this.R.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = 1 / 60;
    this.vw = vw; this.fh = fh;
    const geos = [ringGeometry(), plusGeometry(), asteriskGeometry(), chevronGeometry(), ringGeometry(), plusGeometry()];
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.26, metalness: 0.18, envMapIntensity: 1.0 });
    mat.clippingPlanes = [this.clip];
    const u = Math.min(64, Math.max(26, vw * 0.042));
    const N = vw < 768 ? 16 : 26;
    for (let i = 0; i < N; i++) {
      const g = geos[i % geos.length];
      const mesh = new THREE.Mesh(g, mat);
      const s = u * (0.8 + Math.random() * 0.55);
      mesh.scale.setScalar(s);
      this.group.add(mesh);
      const a = Math.random() * Math.PI * 2, rad = Math.random() * Math.min(vw, fh) * 0.34;
      const body = this.world.createRigidBody(
        this.R.RigidBodyDesc.dynamic()
          .setTranslation((vw * 0.5 + Math.cos(a) * rad) / S, -(fh * 0.45 + Math.sin(a) * rad) / S, 0)
          .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)))
          .setLinearDamping(2.4).setAngularDamping(1.4).enabledTranslations(true, true, false),
      );
      this.world.createCollider(this.R.ColliderDesc.ball((s * 0.82) / S).setRestitution(0.25).setFriction(0.4), body);
      this.items.push({ body, mesh, r: s });
    }
    this.layout(vw, fh);
    this.ready = true;
    this.sync();
  }

  layout(vw: number, fh: number) { this.vw = vw; this.fh = fh; this.center = { x: vw * 0.5, y: fh * (vw < 768 ? 0.42 : 0.45) }; }

  /** settle the pile without animating (used for reduced motion) */
  settle(steps = 240) { for (let i = 0; i < steps; i++) this.step(null); this.sync(); }

  step(pointer: { x: number; y: number } | null) {
    if (!this.ready || !this.world) return;
    let kicked = false;
    for (const { body, r } of this.items) {
      const p = body.translation();
      const px = p.x * S, py = -p.y * S;
      const m = body.mass();
      body.addForce({ x: ((this.center.x - px) / S) * 5.5 * m, y: (-(this.center.y - py) / S) * 5.5 * m, z: 0 }, true);
      if (pointer) {
        const dx = px - pointer.x, dy = py - pointer.y, d = Math.hypot(dx, dy);
        const reach = 170 + r;
        if (d < reach && d > 0.001) {
          const k = (1 - d / reach) * 0.9 * m;
          body.applyImpulse({ x: (dx / d) * k, y: (-dy / d) * k, z: 0 }, true); kicked = true;
        }
      }
    }
    this.world.step();
    if (kicked) this.onKick?.();
  }

  sync() {
    for (const { body, mesh } of this.items) {
      const p = body.translation(), q = body.rotation();
      mesh.position.set(p.x * S - this.vw / 2, p.y * S, 0);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }
}
