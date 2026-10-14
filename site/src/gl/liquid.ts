import * as THREE from 'three';
import { MONOGRAM, MONOGRAM_HEIGHT, MONOGRAM_WIDTH } from './monogram-paths';

/** Screen-space liquid. The glass SD hands off to this layer, which spreads the film across the screen, pulls it into
    dripping fingers, breaks it into droplets and drains it off the bottom, refracting the headline underneath.
    The scene is rendered to a target first, then composited through the liquid field. One-way: it never re-forms. */
const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tMask;
uniform vec2 uRes;
uniform float uTime;
uniform float uP;
uniform float uAspect;
varying vec2 vUv;

float hash(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float vnoise(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(hash(i), hash(i + 1.), f); }

float field(vec2 uv, float bias){
  float P = uP;
  // each column of the film lets go at its own moment, so the metal drains in uneven fingers
  float colN = vnoise(uv.x * 8.0 + 1.3) * 0.6 + vnoise(uv.x * 21.0 + 9.1) * 0.4;
  float lp = clamp(P * 1.65 - colN * 0.65, 0., 1.);
  vec2 q = uv;
  q.y += lp * lp * 1.9 * (0.8 + 0.4 * vnoise(uv.x * 5.0));                       // falls (down is -y, so sample from above)
  float spread = smoothstep(0.05, 0.9, P);
  q.x = 0.5 + (q.x - 0.5) / (1.0 + 1.5 * spread * lp) + sin(uv.y * 11.0 + uTime * 2.6) * 0.010 * lp;   // crawls outward across the screen
  q += vec2(sin(uv.y * 18. + uTime * 7.), cos(uv.x * 14. + uTime * 6.)) * 0.004 * smoothstep(0., 0.15, P) * (1. - lp);  // first ripples
  float f = texture2D(tMask, q, bias).r;
  f *= 1.0 - 0.5 * smoothstep(0.4, 1.0, lp);                                      // the film thins until it breaks
  for (int i = 0; i < 10; i++) {                                                  // droplets pinch off and run down the screen
    float fi = float(i);
    float dp = clamp((P - 0.04 - fi * 0.06) / 0.62, 0., 1.);
    if (dp > 0. && dp < 1.) {
      vec2 p0 = vec2(0.30 + 0.40 * hash(fi + 3.), 0.46 + 0.08 * hash(fi + 8.));
      vec2 p = p0 + vec2((hash(fi + 1.) - 0.5) * 0.55 * dp, -dp * dp * 1.5);
      float r = 0.010 + 0.014 * hash(fi + 5.);
      vec2 d = (uv - p) * vec2(uAspect, 1.0);
      f += 1.3 * exp(-dot(d, d) / (r * r));
    }
  }
  return f;
}

void main(){
  vec2 uv = vUv; vec2 e = vec2(8.0) / uRes; float thr = 0.5;
  float f = field(uv, 1.2);                                   // crisp silhouette
  vec3 scene = texture2D(tScene, uv).rgb;
  vec3 outc = scene;
  if (f >= 0.1) {
    // rounded body: normals come from a much softer copy of the same moving field
    float fx = field(uv + vec2(e.x, 0.), 4.2), fl = field(uv - vec2(e.x, 0.), 4.2), fu = field(uv + vec2(0., e.y), 4.2), fd = field(uv - vec2(0., e.y), 4.2);
    float a = smoothstep(thr - 0.02, thr + 0.02, f);
    vec3 n = normalize(vec3(-vec2(fx - fl, fu - fd) * 2.4, 1.0));
    float h = smoothstep(thr, thr + 0.6, f);
    vec3 refr = texture2D(tScene, uv + n.xy * 0.07 * (0.5 + h)).rgb;
    vec3 body = refr * vec3(0.99, 0.88, 0.80) + vec3(0.04, 0.03, 0.02);            // warm, slightly smoky glass
    vec3 r = reflect(vec3(0., 0., -1.), n);
    vec3 env = mix(vec3(0.55, 0.20, 0.08), vec3(1.0, 0.82, 0.62), smoothstep(-0.3, 0.9, r.y));   // chrome-like sky and floor
    float fres = pow(1.0 - n.z, 2.2);
    vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
    float spec = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 34.0);
    vec3 liquid = mix(body, env, clamp(fres * 1.5, 0., 0.85)) + vec3(1.0, 0.94, 0.86) * spec * 1.2;
    liquid *= 1.0 - 0.14 * (1.0 - smoothstep(thr, thr + 0.16, f));                  // darker where the surface rolls under
    outc = mix(scene, liquid, a);
  }
  gl_FragColor = vec4(outc, 1.);
  #include <colorspace_fragment>
}`;

export class LiquidPass {
  readonly P = { value: 0 };
  private rt: THREE.WebGLRenderTarget;
  private maskTex = new THREE.CanvasTexture(document.createElement('canvas'));
  private mat: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private timeU = { value: 0 };

  constructor(w: number, h: number, dpr: number) {
    this.rt = new THREE.WebGLRenderTarget(Math.round(w * dpr), Math.round(h * dpr), { samples: 4, type: THREE.HalfFloatType });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, tMask: { value: this.maskTex }, uRes: { value: new THREE.Vector2(w * dpr, h * dpr) }, uTime: this.timeU, uP: this.P, uAspect: { value: w / h } },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false; this.scene.add(this.quad);
    this.maskTex.minFilter = THREE.LinearMipmapLinearFilter; this.maskTex.generateMipmaps = true; this.maskTex.wrapS = this.maskTex.wrapT = THREE.ClampToEdgeWrapping;
  }

  /** Draw the SD silhouette where the 3D monogram sits: `unit` is px per monogram unit, centred on the viewport. */
  resize(w: number, h: number, dpr: number, unit: number) {
    this.rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
    (this.mat.uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr); this.mat.uniforms.uAspect.value = w / h;
    const c = document.createElement('canvas'); const k = 0.5; c.width = Math.round(w * k); c.height = Math.round(h * k);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.save(); ctx.translate(c.width / 2, c.height / 2); ctx.scale(unit * k, -unit * k); ctx.translate(-MONOGRAM_WIDTH / 2, -MONOGRAM_HEIGHT / 2);
    ctx.fillStyle = '#fff';
    for (const key of ['S', 'D'] as const) {
      const p = new Path2D();
      for (const cmd of MONOGRAM[key]) {
        if (cmd.type === 'M') p.moveTo(cmd.x!, cmd.y!);
        else if (cmd.type === 'L') p.lineTo(cmd.x!, cmd.y!);
        else if (cmd.type === 'Q') p.quadraticCurveTo(cmd.x1!, cmd.y1!, cmd.x!, cmd.y!);
        else if (cmd.type === 'C') p.bezierCurveTo(cmd.x1!, cmd.y1!, cmd.x2!, cmd.y2!, cmd.x!, cmd.y!);
        else if (cmd.type === 'Z') p.closePath();
      }
      ctx.fill(p, 'evenodd');
    }
    ctx.restore();
    this.maskTex.image = c; this.maskTex.needsUpdate = true;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, t: number) {
    this.timeU.value = t;
    renderer.setRenderTarget(this.rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
    renderer.render(this.scene, this.cam);
  }
}
