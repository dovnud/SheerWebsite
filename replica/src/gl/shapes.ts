import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Procedural placeholder geometry. Nothing here is derived from the reference's models. */
export function chevronGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-1.0, 1.5); s.lineTo(-0.3, 1.5); s.lineTo(1.0, 0); s.lineTo(-0.3, -1.5); s.lineTo(-1.0, -1.5); s.lineTo(0.3, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.17, bevelSegments: 10, curveSegments: 1 });
  g.center();
  return g;
}

export function ringGeometry(): THREE.BufferGeometry { return new THREE.TorusGeometry(1, 0.42, 40, 88); }

function box(w: number, h: number, d: number, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); return g;
}
export function plusGeometry(): THREE.BufferGeometry {
  return mergeGeometries([box(2, 0.62, 0.62), box(0.62, 2, 0.62)].map((g) => g.toNonIndexed()))!;
}
export function asteriskGeometry(): THREE.BufferGeometry {
  return mergeGeometries([box(2, 0.56, 0.56), box(2, 0.56, 0.56, 0, 0, Math.PI / 3), box(2, 0.56, 0.56, 0, 0, -Math.PI / 3)].map((g) => g.toNonIndexed()))!;
}
export function orbGeometry(): THREE.BufferGeometry {
  const s = new THREE.SphereGeometry(1, 64, 48).toNonIndexed();
  const tip = new THREE.ConeGeometry(0.22, 0.4, 32).toNonIndexed(); tip.translate(0, -1.2, 0);
  return mergeGeometries([s, tip])!;
}
