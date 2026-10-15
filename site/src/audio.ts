import { store } from './util';

/** "Backstage hush": a synthesised sound design with no audio files and no licensing.
    A very quiet room tone, a distant murmur of a house filling and a faint ghost-light hum form the bed.
    Events: curtain rustle (transitions), a soft pour of glass (the liquid exit), a stage-light switch (hover),
    a wooden knock (steps, footer). Starts only from a user gesture. */
export class AudioEngine {
  private ctx?: BaseAudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;
  private verbSend?: GainNode;
  private murmurBus?: GainNode;
  private humG?: GainNode;
  /** Master kill switch: sound is parked until a design is chosen that suits the work. */
  private static readonly ENABLED = false;
  on = AudioEngine.ENABLED && store('replica.sound') !== 'off';
  started = false;
  private lastTick = 0;
  private timers: number[] = [];
  private static readonly HUM_BASE = 0.0045;
  /** overall level: the bed sits near -36 dBFS (a hush) and events peak near -14 dBFS */
  private static readonly LEVEL = 2.0;

  async start() {
    if (!AudioEngine.ENABLED || this.started) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.attach(ctx, false);
    this.started = true;
    try { await ctx.resume(); } catch { /* ignore */ }
    this.apply();
    this.scheduleRoomEvents();
  }

  /** Build the graph on any audio context. `immediate` skips the fade-in (used for offline renders). */
  attach(ctx: BaseAudioContext, immediate: boolean) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master = ctx.createGain(); this.master.gain.value = immediate ? (this.on ? AudioEngine.LEVEL : 0) : 0;
    this.master.connect(comp).connect(ctx.destination);
    this.noiseBuf = this.makeNoise(4);
    const conv = ctx.createConvolver(); conv.buffer = this.makeImpulse(2.4); conv.connect(this.master);
    this.verbSend = ctx.createGain(); this.verbSend.gain.value = 1; this.verbSend.connect(conv);
    this.bed();
  }

  setOn(v: boolean) { this.on = v; store('replica.sound', v ? 'on' : 'off'); this.apply(); if (v) this.blip(); }
  private apply() { if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.on ? AudioEngine.LEVEL : 0, this.ctx.currentTime, 0.25); }

  // ---------- building blocks ----------
  private makeNoise(sec: number) {
    const c = this.ctx!; const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate); const d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = 0.97 * last + 0.03 * w; d[i] = w * 0.6 + last * 6 * 0.4; }   // soft, slightly pink
    return b;
  }
  private makeImpulse(sec: number) {
    const c = this.ctx!; const n = Math.floor(c.sampleRate * sec); const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    return b;
  }
  private noiseSrc(loop: boolean) { const s = this.ctx!.createBufferSource(); s.buffer = this.noiseBuf!; s.loop = loop; return s; }
  private send(node: AudioNode, amount: number) { const g = this.ctx!.createGain(); g.gain.value = amount; node.connect(g).connect(this.verbSend!); }
  private lfo(rate: number, depth: number, target: AudioParam) { const c = this.ctx!; const o = c.createOscillator(); o.frequency.value = rate; const g = c.createGain(); g.gain.value = depth; o.connect(g).connect(target); o.start(); }

  // ---------- the bed ----------
  private bed() {
    const c = this.ctx!;
    // room tone
    const room = this.noiseSrc(true); const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 650; rlp.Q.value = 0.3;
    const rg = c.createGain(); rg.gain.value = 0.02; room.connect(rlp).connect(rg).connect(this.master!); room.start();
    // a house filling, far away: band-limited noise shaped by slow, syllable-like modulation
    this.murmurBus = c.createGain(); this.murmurBus.gain.value = 1; this.murmurBus.connect(this.master!); this.send(this.murmurBus, 0.5);
    [{ f: 380, q: 0.9, syl: 3.1, swell: 0.21, g: 0.03 }, { f: 820, q: 1.1, syl: 4.3, swell: 0.17, g: 0.017 }].forEach((L) => {
      const s = this.noiseSrc(true); s.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = L.f; bp.Q.value = L.q;
      this.lfo(0.4, L.f * 0.35, bp.frequency);
      const syl = c.createGain(); syl.gain.value = 0.55; this.lfo(L.syl, 0.35, syl.gain);
      const swell = c.createGain(); swell.gain.value = 0.6; this.lfo(L.swell, 0.4, swell.gain);
      const out = c.createGain(); out.gain.value = L.g; s.connect(bp).connect(syl).connect(swell).connect(out).connect(this.murmurBus!); s.start();
    });
    // ghost light: the faint electrical hum of the one lamp left burning
    const sum = c.createGain(); sum.gain.value = 1;
    [[60, 'sine', 0.5], [120, 'sine', 1], [180, 'triangle', 0.22]].forEach(([f, type, a]) => { const o = c.createOscillator(); o.type = type as OscillatorType; o.frequency.value = f as number; const g = c.createGain(); g.gain.value = a as number; o.connect(g).connect(sum); o.start(); });
    const hlp = c.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 400;
    this.humG = c.createGain(); this.humG.gain.value = AudioEngine.HUM_BASE; sum.connect(hlp).connect(this.humG).connect(this.master!);
    this.lfo(0.13, 0.0012, this.humG.gain);
  }

  /** Scroll progress 0..1: the murmur recedes and the ghost-light hum comes forward toward the contact footer. */
  setMood(p: number) {
    if (!this.ctx || !this.murmurBus || !this.humG) return;
    const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const t = this.ctx.currentTime;
    this.murmurBus.gain.setTargetAtTime(1 - 0.75 * sm(0.7, 1, p), t, 0.8);
    this.humG.gain.setTargetAtTime(AudioEngine.HUM_BASE + 0.011 * sm(0.75, 1, p), t, 0.8);
  }

  /** occasional far-off seat or door knocks, so the room feels inhabited */
  private scheduleRoomEvents() {
    const next = () => {
      const id = window.setTimeout(() => {
        if (this.on && this.ctx && this.ctx.state === 'running') this.farKnock();
        next();
      }, 6000 + Math.random() * 8000);
      this.timers.push(id);
    };
    next();
  }
  private farKnock(when = 0) {
    const c = this.ctx!, t = c.currentTime + when; const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95 + Math.random() * 30, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.master!); this.send(g, 1.2); o.start(t); o.stop(t + 0.35);
  }

  // ---------- events ----------
  /** curtain rustle: a slow swell of fabric noise */
  curtain(when = 0) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime + when; const s = this.noiseSrc(false);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7; bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(2800, t + 0.95);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    s.connect(bp).connect(g).connect(this.master!); this.send(g, 0.7); s.start(t, Math.random() * 2, 1.4);
  }
  whoosh() { this.curtain(); }

  /** a soft pour of glass with droplet tinks, for the liquid exit (about 3.8 s) */
  pour(when = 0) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime + when;
    const layer = (f: number, q: number, peak: number, wob: number) => {
      const s = this.noiseSrc(true); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = f; this.lfo(5.5, wob, bp.frequency);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.6); g.gain.setValueAtTime(peak, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.9);
      s.connect(bp).connect(g).connect(this.master!); this.send(g, 0.5); s.start(t); s.stop(t + 4);
    };
    layer(3200, 1.1, 0.03, 900); layer(1200, 0.9, 0.02, 300);
    for (let i = 0; i < 9; i++) this.ping(1600 + Math.random() * 1800, 0.03, when + 0.3 + Math.random() * 3.1);
  }
  private ping(freq: number, vol: number, when: number) {
    const c = this.ctx!, t = c.currentTime + when; const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(this.master!); this.send(g, 1.0); o.start(t); o.stop(t + 0.45);
  }

  /** stage-light switch: a soft relay click with a small thump (hover, toggles). The arguments are kept for the old call sites. */
  blip(_freq = 880, _dur = 0.08, vol = 0.08, when = 0) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime + when, v = Math.min(vol, 0.1);
    const s = this.noiseSrc(false); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(bp).connect(g).connect(this.master!); s.start(t, Math.random() * 2, 0.05);
    const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.07);
    og.gain.setValueAtTime(v * 0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(og).connect(this.master!); o.start(t); o.stop(t + 0.1);
  }

  /** a soft wooden knock (chapter steps, the footer pile). Throttled. */
  tick(vol = 0.05, _band = 2400, when = 0) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, now = c.currentTime; if (when === 0 && now - this.lastTick < 0.05) return; if (when === 0) this.lastTick = now;
    const t = now + when, v = Math.min(vol, 0.08);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(240 * (0.8 + Math.random() * 0.4), t); o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); o.connect(g).connect(this.master!); this.send(g, 0.3); o.start(t); o.stop(t + 0.12);
    const s = this.noiseSrc(false); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const ng = c.createGain();
    ng.gain.setValueAtTime(v * 0.4, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(lp).connect(ng).connect(this.master!); s.start(t, Math.random() * 2, 0.06);
  }
}
