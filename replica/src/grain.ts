/** Film-grain overlay: a tiny hand-written WebGL fragment shader on its own fixed canvas. */
export function initGrain(canvas: HTMLCanvasElement, animated: boolean): (() => void) | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false });
  if (!gl) return null;
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = 'precision mediump float;uniform float t;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){float n=h(gl_FragCoord.xy+t*vec2(37.,91.));gl_FragColor=vec4(vec3(step(.5,n)),abs(n-.5)*.17);}';
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram()!; gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tl = gl.getUniformLocation(pr, 't'); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const size = () => { canvas.width = Math.ceil(innerWidth); canvas.height = Math.ceil(innerHeight); gl.viewport(0, 0, canvas.width, canvas.height); };
  size(); addEventListener('resize', size);
  let last = 0, t = 0;
  const draw = (time: number) => {
    if (animated && time - last < 80) return; last = time; t = (t + 1) % 97;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(tl, t); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  draw(1000);
  return animated ? () => draw(performance.now()) : null;
}
