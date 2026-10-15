import { store } from './util';

/** The low drone bed was judged too dramatic and unrelated to her world; it is off until a related sound design is chosen. */
const AMBIENT_BED = false;

/** Synthesised sound: no audio files are shipped. Starts only from a user gesture. */
export class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;
  on = store('replica.sound') !== 'off';
  started = false;
  private lastTick = 0;

  async start() {
    if (this.started) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this.makeNoise();
    if (AMBIENT_BED) this.ambient();
    this.started = true;
    try { await this.ctx.resume(); } catch { /* ignore */ }
    this.apply();
  }

  setOn(v: boolean) { this.on = v; store('replica.sound', v ? 'on' : 'off'); this.apply(); if (v) this.blip(660, 0.09, 0.1); }
  private apply() { if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.2); }

  private makeNoise() {
    const c = this.ctx!; const b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private ambient() {
    const c = this.ctx!; const out = c.createGain(); out.gain.value = 0.0; out.connect(this.master!);
    out.gain.linearRampToValueAtTime(0.16, c.currentTime + 4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.6; lp.connect(out);
    [55, 82.41, 110.3, 164.8].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6;
      const g = c.createGain(); g.gain.value = 0.25 / (i + 1); o.connect(g).connect(lp); o.start();
    });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start();
  }

  blip(freq = 880, dur = 0.08, vol = 0.08) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!); o.start(t); o.stop(t + dur + 0.02);
  }

  /** soft glassy tick for collisions / step changes */
  tick(vol = 0.05, band = 2400) {
    if (!this.ctx || !this.on || !this.noiseBuf) return;
    const c = this.ctx; const now = c.currentTime; if (now - this.lastTick < 0.045) return; this.lastTick = now;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = band * (0.8 + Math.random() * 0.5); bp.Q.value = 8;
    const g = c.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    s.connect(bp).connect(g).connect(this.master!); s.start(now, Math.random() * 0.5, 0.16);
  }

  whoosh() {
    if (!this.ctx || !this.on || !this.noiseBuf) return;
    const c = this.ctx, t = c.currentTime; const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.9);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    s.connect(f).connect(g).connect(this.master!); s.start(t); s.stop(t + 1.3);
  }
}
