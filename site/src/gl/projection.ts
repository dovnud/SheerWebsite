import * as THREE from 'three';

/** A film projected onto the SD glass. The skin is a second copy of the monogram, planar-mapped (front-on, like a
    projector aimed at the letters) and drawn additively at low opacity, so it reads as light landing on the glass:
    dark parts of the film vanish and the refraction, bevels and highlights underneath stay visible. */
export class Projection {
  readonly mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  private video?: HTMLVideoElement;
  private canvas?: HTMLCanvasElement; private ctx?: CanvasRenderingContext2D; private last = -1;

  constructor(base: THREE.Mesh, private reduced: boolean, opacity = 0.55) {
    const g = base.geometry.clone();
    g.computeBoundingBox(); const bb = g.boundingBox!; const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x); uv[i * 2 + 1] = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.mat = new THREE.MeshBasicMaterial({ transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.scale.setScalar(1.004); this.mesh.renderOrder = 2;
    this.useFallback();
  }

  /** Abstract placeholder light (slow stage beams and curtain folds), used until real show footage is supplied. Nothing depicts people. */
  private useFallback() {
    this.canvas = document.createElement('canvas'); this.canvas.width = 640; this.canvas.height = 400; this.ctx = this.canvas.getContext('2d')!;
    const tex = new THREE.CanvasTexture(this.canvas); tex.colorSpace = THREE.SRGBColorSpace; this.setTexture(tex); this.paint(0);
  }

  private paint(t: number) {
    const c = this.ctx!, w = 640, h = 400;
    c.globalCompositeOperation = 'source-over'; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {                                   // sweeping spotlight cones from the top
      const x = w * (0.5 + 0.42 * Math.sin(t * (0.23 + i * 0.07) + i * 1.9)), spread = 90 + 40 * Math.sin(t * 0.4 + i);
      const gr = c.createLinearGradient(x, 0, x, h); gr.addColorStop(0, 'rgba(255,214,150,0.85)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(x - 6, 0); c.lineTo(x + 6, 0); c.lineTo(x + spread, h); c.lineTo(x - spread, h); c.closePath(); c.fill();
    }
    for (let x = 0; x < w; x += 8) {                                // slow velvet-curtain folds
      const a = 0.10 + 0.10 * Math.sin(x * 0.045 + t * 0.7) * Math.sin(x * 0.013 - t * 0.3);
      c.fillStyle = `rgba(255,120,110,${Math.max(0, a)})`; c.fillRect(x, 0, 8, h);
    }
    (this.mat.map as THREE.CanvasTexture).needsUpdate = true;
  }

  private setTexture(tex: THREE.Texture) { tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; this.mat.map?.dispose(); this.mat.map = tex; this.mat.needsUpdate = true; }

  /** Real footage replaces the placeholder. Plays muted and looped; under reduced motion it holds its first frame. */
  setVideo(src: string, poster?: string) {
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; if (poster) v.poster = poster;
    v.addEventListener('loadeddata', () => {
      this.video = v; this.canvas = undefined;
      const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace; this.setTexture(tex);
      if (this.reduced) { v.currentTime = 0.1; v.pause(); } else void v.play().catch(() => undefined);
    }, { once: true });
    v.addEventListener('error', () => undefined, { once: true });   // keep the placeholder on failure
    v.src = src; v.load();
  }

  /** Called each frame while the hero is on screen. */
  update(t: number) {
    if (this.reduced || this.video) return;                         // VideoTexture updates itself
    if (t - this.last < 1 / 24) return; this.last = t; this.paint(t);
  }

  set visible(v: boolean) { this.mesh.visible = v; if (this.video) { if (v && !this.reduced) void this.video.play().catch(() => undefined); else this.video.pause(); } }
}
