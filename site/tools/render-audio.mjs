// Renders the sound design offline (no speakers needed): level checks plus a WAV sample. usage: node tools/render-audio.mjs <baseUrl> <out.wav>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [base, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
await p.goto(base); await p.waitForFunction(() => window.__replica && window.__replica.audio, null, { timeout: 60000 });
const res = await p.evaluate(async () => {
  const sr = 32000, secs = 24; const oc = new OfflineAudioContext(2, sr * secs, sr);
  const E = window.__replica.audio.constructor; const eng = new E(); eng.on = true; eng.attach(oc, true);
  eng.blip(0, 0, 0.08, 6); eng.blip(0, 0, 0.08, 6.7);      // stage-light switch (hover)
  eng.curtain(8.5);                                          // curtain rustle (enter / overlay)
  eng.pour(12);                                              // the liquid exit, about 3.8 s
  eng.tick(0.06, 0, 17.5); eng.tick(0.06, 0, 18.2);          // wooden knocks (chapter steps)
  eng.farKnock(20);                                          // a far-off seat or door
  const buf = await oc.startRendering(); const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const mono = new Int16Array(L.length); let peak = 0;
  for (let i = 0; i < L.length; i++) { const v = (L[i] + R[i]) / 2; peak = Math.max(peak, Math.abs(v)); mono[i] = Math.max(-1, Math.min(1, v)) * 32767; }
  const bytes = new Uint8Array(mono.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { sr, b64: btoa(s), peak };
});
const pcm = Buffer.from(res.b64, 'base64'); const n = pcm.length / 2;
const wav = Buffer.alloc(44 + pcm.length); wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(res.sr, 24); wav.writeUInt32LE(res.sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
fs.writeFileSync(out, wav);
const rms = []; for (let s = 0; s < 24; s++) { let acc = 0; for (let i = s * res.sr; i < (s + 1) * res.sr; i++) { const v = pcm.readInt16LE(i * 2) / 32768; acc += v * v; } rms.push((20 * Math.log10(Math.sqrt(acc / res.sr) + 1e-9)).toFixed(1)); }
console.log('peak dBFS', (20 * Math.log10(res.peak)).toFixed(1)); console.log('RMS per second (dBFS):', rms.join(' ')); console.log('errors:', errs.join('|') || 'none'); await b.close();
