import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ringGeometry, asteriskGeometry, orbGeometry } from './shapes';
import { buildHeroObject, HERO_VARIANTS, type HeroObject, type HeroVariant } from './hero-objects';
import { FooterPhysics } from './footer';
import { clamp } from '../util';

const BG_VERT = 'void main(){gl_Position=vec4(position.xy,0.,1.);}';
const BG_FRAG = /* glsl */ `
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uEdge;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float t=uTime*.045; float asp=uRes.x/uRes.y;
  float f=fbm(uv*vec2(1.5,1.2)+vec2(t,-t*.7)); float g=smoothstep(.25,.8,f);
  vec3 a=vec3(1.,.298,0.), b=vec3(.98,.19,0.), c=vec3(1.,.36,.02);
  vec3 col=mix(mix(a,b,g),c,smoothstep(.5,.95,n(uv*3.+t))*.35);
  float d=distance(uv*vec2(asp,1.),uMouse*vec2(asp,1.)); col+=vec3(.06,.035,0.)*smoothstep(.55,0.,d);
  float y=uRes.y-gl_FragCoord.y;               /* px from the top of the canvas */
  col=mix(col,vec3(0.),step(uEdge,y));         /* hard black edge tracks the footer's top */
  col=pow(col,vec3(2.2));                      /* author in sRGB, hand linear to three's output stage */
  gl_FragColor=vec4(col,1.);
  #include <colorspace_fragment>
}`;

export interface WorldOpts { canvas: HTMLCanvasElement; reduced: boolean; heroLines: string[] }

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
  private vw = 1; private vh = 1; private dpr = 1;
  private bg: THREE.Mesh; private bgU: Record<string, THREE.IUniform>;
  private hero = new THREE.Group(); private plane!: THREE.Mesh; private chevron!: THREE.Object3D; private heroObj!: HeroObject;
  private svc = new THREE.Group(); private svcObjs: THREE.Mesh[] = []; private svcTarget = [1, 0, 0]; private svcScale = [0, 0, 0];
  readonly footer = new FooterPhysics();
  private heroEl = document.querySelector<HTMLElement>('[data-hero]')!;
  private svcEl = document.querySelector<HTMLElement>('.services-pin')!;
  private footerEl = document.querySelector<HTMLElement>('[data-footer]')!;
  private whiteEls = Array.from(document.querySelectorAll<HTMLElement>('.white-zone'));
  private pointer = { x: 0, y: 0, sx: 0, sy: 0, px: -999, py: -999 };
  private intro = { t: 0 };
  /** liquid reveal: melt.p 0 = formed over the name, 1 = poured away */
  private melt = { p: 0 }; private meltU = { value: 0 }; private timeU = { value: 0 }; private armed = true; private meltTl?: gsap.core.Timeline; private drops: THREE.Mesh[] = [];
  private heroTex?: THREE.CanvasTexture;
  private lastScroll = -1; private dirty = true;
  ready = false;

  constructor(private o: WorldOpts) {
    this.renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0xff4c00, 1);
    this.renderer.localClippingEnabled = true;
    (this.renderer as unknown as { transmissionResolutionScale: number }).transmissionResolutionScale = innerWidth < 768 ? 0.5 : 1;

    this.bgU = { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uEdge: { value: 1e6 } };
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: this.bgU, depthTest: false, depthWrite: false }));
    this.bg.frustumCulled = false; this.bg.renderOrder = -10; this.scene.add(this.bg);
    this.scene.add(this.hero, this.svc, this.footer.group);
  }

  async init() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envTex = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    this.scene.environment = envTex; (this.scene as unknown as { environmentIntensity: number }).environmentIntensity = 1.0;
    pm.dispose();

    // hero: headline drawn to a texture (so the glass can refract it) + procedural glass chevron
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.4, toneMapped: false }));
    this.hero.add(this.plane);
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xfff3ea, transmission: 1, thickness: 0.8, ior: 1.45, roughness: 0.12, metalness: 0,
      attenuationColor: new THREE.Color(0xffffff), attenuationDistance: Infinity, clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 0.75, specularIntensity: 0.9,
    });
    glass.customProgramCacheKey = () => 'melt-glass';
    glass.onBeforeCompile = (shader) => {
      shader.uniforms.uMelt = this.meltU; shader.uniforms.uTime = this.timeU;
      shader.vertexShader = 'uniform float uMelt;\nuniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { float h = clamp((transformed.y + 1.2) / 2.4, 0.0, 1.0);
          float m = uMelt;
          float w = sin(transformed.x * 3.2 + uTime * 4.0 + transformed.y * 2.2) * 0.09 * m;
          float drip = pow(1.0 - h, 1.5) * m * (1.1 + 0.9 * sin(transformed.x * 4.3 + 1.7));
          transformed.y -= drip + m * m * 0.5;
          transformed.x += w + transformed.x * m * 0.18;
          transformed.z += w * 0.6; }`);
    };
    const dropMat = glass.clone(); dropMat.onBeforeCompile = () => undefined;
    for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), dropMat); d.visible = false; this.hero.add(d); this.drops.push(d); }
    const asked = (new URLSearchParams(location.search).get('obj') || location.hash.replace('#', '')) as HeroVariant;
    this.heroObj = buildHeroObject(HERO_VARIANTS.includes(asked) ? asked : 'sd', glass);
    this.chevron = this.heroObj.obj;
    this.chevron.position.z = 70; this.hero.add(this.chevron);

    // services: three abstract objects, one per chapter, shown only while that chapter has no real show media
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.34, metalness: 0.1, envMapIntensity: 0.8 });
    [ringGeometry(), asteriskGeometry(), orbGeometry()].forEach((g) => { const m = new THREE.Mesh(g, dark); m.scale.setScalar(0.0001); this.svc.add(m); this.svcObjs.push(m); });

    this.resize();
    this.footer.onKick = () => this.onKick?.();
    await this.footer.init(this.vw, Math.max(this.footerEl.offsetHeight, this.vh));
    if (this.o.reduced) this.footer.settle();
    this.ready = true;
  }
  onKick?: () => void;

  private chevronBase() { return this.vw < 768 ? 0.24 * this.vw : Math.min(0.185 * this.vh, 0.12 * this.vw); }

  private drawHeadline() {
    const lines = this.o.heroLines, vw = this.vw, vh = this.vh, d = Math.min(this.dpr, 2);
    const c = document.createElement('canvas'); c.width = Math.round(vw * d); c.height = Math.round(vh * d);
    const ctx = c.getContext('2d')!; ctx.scale(d, d);
    const fam = '"Bodoni Moda", serif'; ctx.font = `400 100px ${fam}`;
    const sx = vw < 768 ? 0.78 : 1;                    // on a phone the name is condensed so it can be set larger
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width)) * sx;
    const fs = Math.min((vw * (vw < 768 ? 0.92 : 0.82)) / widest * 100, (vh * 0.74) / (lines.length * 0.92));
    ctx.font = `400 ${fs}px ${fam}`; ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lh = fs * 0.92, y0 = vh / 2 - (lines.length - 1) * lh / 2 + fs * 0.03;
    ctx.save(); ctx.translate(vw / 2, 0); ctx.scale(sx, 1);
    lines.forEach((l, i) => ctx.fillText(l, 0, y0 + i * lh));
    ctx.restore();
    this.heroTex?.dispose();
    this.heroTex = new THREE.CanvasTexture(c); this.heroTex.colorSpace = THREE.SRGBColorSpace; this.heroTex.generateMipmaps = false; this.heroTex.minFilter = THREE.LinearFilter;
    const m = this.plane.material as THREE.MeshBasicMaterial; m.map = this.heroTex; m.needsUpdate = true;
  }

  resize() {
    this.vw = innerWidth; this.vh = innerHeight; this.dpr = Math.min(devicePixelRatio || 1, this.vw < 768 ? 1.5 : 2);
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(this.vw, this.vh, false);
    this.camera.aspect = this.vw / this.vh; this.camera.position.z = this.vh / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)); this.camera.far = this.camera.position.z * 4; this.camera.updateProjectionMatrix();
    const sz = new THREE.Vector2(); this.renderer.getDrawingBufferSize(sz); (this.bgU.uRes.value as THREE.Vector2).copy(sz);
    if (this.plane) {
      this.plane.scale.set(this.vw, this.vh, 1); this.drawHeadline();
      this.chevron.scale.setScalar(this.chevronBase() * this.heroObj.size);
    }
    this.footer.layout(this.vw, Math.max(this.footerEl.offsetHeight, this.vh));
    this.dirty = true;
  }

  setPointer(cx: number, cy: number) {
    this.pointer.x = (cx / this.vw) * 2 - 1; this.pointer.y = -((cy / this.vh) * 2 - 1); this.pointer.px = cx; this.pointer.py = cy; this.dirty = true;
  }
  private hasMedia = [false, false, false]; private step = 0;
  setHasMedia(i: number, v: boolean) { this.hasMedia[i] = v; this.setStep(this.step); }
  /** the abstract object stands in for a chapter only while that chapter has no real show media */
  setStep(i: number) { this.step = i; this.svcTarget = [0, 0, 0].map((_, k) => (k === i && !this.hasMedia[k] ? 1 : 0)); this.dirty = true; }
  introHero() {
    this.intro.t = this.o.reduced ? 1 : 0;
    if (!this.o.reduced) gsap.to(this.intro, { t: 1, duration: 2.2, ease: 'expo.out', onUpdate: () => { this.dirty = true; } });
    this.dirty = true;
  }
  isHeroIn() { return this.intro.t > 0; }
  /** Review hook: freeze the liquid at a chosen point (0 formed, 1 poured away). */
  debugMelt(p: number) { this.meltTl?.kill(); this.armed = false; this.melt.p = p; this.dirty = true; }
  /** First scroll away from the top: the glass monogram melts off, the name stays clear for a beat, then the metal flows back and re-forms. */
  onScroll(y: number) {
    if (this.o.reduced || !this.ready) return;
    if (y <= 2) { this.armed = true; return; }
    if (!this.armed || this.intro.t < 0.95 || y > this.vh * 0.7) return;
    this.armed = false; this.meltTl?.kill();
    this.meltTl = gsap.timeline({ onUpdate: () => { this.dirty = true; } })
      .to(this.melt, { p: 1, duration: 1.7, ease: 'power2.inOut' })
      .to(this.melt, { p: 1, duration: 1.3 })
      .to(this.melt, { p: 0, duration: 2.0, ease: 'power2.inOut' });
  }

  update(time: number) {
    if (!this.ready) return;
    const { vw, vh, o } = this;
    const scrollY = scrollY_();
    for (const el of this.whiteEls) { const r = el.getBoundingClientRect(); if (r.top <= 0 && r.bottom >= vh) return; } // a white panel fully covers the canvas: skip the frame
    if (o.reduced && !this.dirty && scrollY === this.lastScroll) return;  // reduced motion: only draw on change
    this.lastScroll = scrollY; this.dirty = false;
    const t = o.reduced ? 0 : time;

    this.pointer.sx += (this.pointer.x - this.pointer.sx) * 0.06; this.pointer.sy += (this.pointer.y - this.pointer.sy) * 0.06;
    this.bgU.uTime.value = t;
    (this.bgU.uMouse.value as THREE.Vector2).set(this.pointer.sx * 0.5 + 0.5, this.pointer.sy * 0.5 + 0.5);

    // hero anchored to its DOM box
    const hr = this.heroEl.getBoundingClientRect();
    this.hero.position.y = vh / 2 - (hr.top + hr.height / 2);
    this.hero.visible = hr.bottom > -vh * 0.25 && this.intro.t > 0.001;
    const k = this.intro.t;
    const idle = o.reduced ? 0 : 1;
    this.heroObj.pose(this.chevron, t, this.pointer.sx * idle, this.pointer.sy * idle, k, idle);
    const p = this.melt.p; this.meltU.value = p; this.timeU.value = t;
    const s = this.chevronBase() * this.heroObj.size * (0.2 + 0.8 * k), bob = Math.sin(t * 0.6) * 14 * idle;
    const exit = THREE.MathUtils.smoothstep(p, 0.3, 1);                         // the whole mass pours off the bottom
    this.chevron.position.y = bob - exit * vh * 1.05;
    this.chevron.scale.set(s * (1 - 0.55 * exit), s * (1 + 0.35 * exit), s * (1 - 0.3 * exit));
    this.chevron.rotation.z += Math.sin(t * 3 + p * 6) * 0.04 * p;
    this.chevron.visible = k > 0.01;
    const n = this.drops.length;
    this.drops.forEach((d, i) => {                                               // droplets fall as it melts and rise as it re-forms
      const dp = THREE.MathUtils.clamp((p - 0.1 - i * 0.07) / 0.55, 0, 1), r = s * (0.1 + 0.07 * (((i * 37) % 5) / 4));
      d.visible = k > 0.5 && dp > 0.001 && dp < 0.999;
      d.position.set((i / (n - 1) - 0.5) * s * 3.2 + Math.sin(i * 2.1) * s * 0.2, -s * 1.15 + bob - dp * dp * vh * 1.25, 70);
      d.scale.set(r * (1 - 0.3 * dp), r * (1 + 1.8 * dp), r * (1 - 0.3 * dp));
    });
    (this.plane.material as THREE.MeshBasicMaterial).opacity = 1;

    // services anchored to the pinned frame
    const sr = this.svcEl.getBoundingClientRect();
    const inView = sr.bottom > 0 && sr.top < vh;
    this.svc.visible = inView; this.svc.position.set(vw >= 768 ? -vw * 0.1 : vw * 0.12, vh / 2 - (sr.top + sr.height / 2) - (vw >= 768 ? vh * 0.02 : vh * 0.2), 0);
    const base = vw >= 768 ? Math.min(0.2 * vh, 0.3 * vw) : 0.2 * vw;
    this.svcObjs.forEach((m, i) => {
      this.svcScale[i] += ((this.svcTarget[i] * base) - this.svcScale[i]) * (o.reduced ? 1 : 0.1);
      m.scale.setScalar(Math.max(this.svcScale[i], 0.0001)); m.visible = this.svcScale[i] > 0.5;
      m.rotation.set(t * 0.2 + this.pointer.sy * 0.4 + i, t * 0.28 + this.pointer.sx * 0.5, i * 0.5);
    });

    // footer pile + black edge
    const fr = this.footerEl.getBoundingClientRect();
    this.bgU.uEdge.value = fr.top < vh ? Math.max(fr.top, 0) * this.dpr : 1e6;
    const showFooter = fr.top < vh * 1.1;
    this.footer.group.visible = showFooter;
    if (showFooter) {
      this.footer.group.position.set(0, vh / 2 - fr.top, 0);
      // keep only what is below the footer's top edge (world y <= edge)
      this.footer.clip.constant = vh / 2 - Math.max(fr.top, 0);
      if (!o.reduced) this.footer.step(this.pointer.px > -900 ? { x: this.pointer.px, y: this.pointer.py - fr.top } : null);
      this.footer.sync();
    }
    this.renderer.render(this.scene, this.camera);
  }
}

function scrollY_() { return window.scrollY; }
