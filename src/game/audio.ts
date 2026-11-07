export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private next = 0;
  private step = 0;
  muted = false;
  musicOn = true;

  unlock() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.bus = this.ctx.createGain();
      this.master.gain.value = 1;
      this.music.gain.value = 0.045;
      this.bus.gain.value = 0.22;
      this.music.connect(this.master);
      this.bus.connect(this.master);
      this.master.connect(this.ctx.destination);
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
      const data = n.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = n;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  play(event: string) {
    if (!this.ctx || this.muted || !this.bus) return;
    if (event === "jump") this.glide(420, 680, 0.12, "sine", 0.35);
    else if (event === "djump") this.glide(560, 920, 0.14, "triangle", 0.32);
    else if (event === "coin") {
      this.tone(880, 0.08, "sine", 0.28);
      this.tone(1320, 0.12, "sine", 0.22);
    } else if (event === "die") this.noiseBurst(0.28, 180);
    else if (event === "check") {
      this.tone(523, 0.1, "sine", 0.22);
      window.setTimeout(() => this.tone(659, 0.1, "sine", 0.2), 90);
      window.setTimeout(() => this.tone(784, 0.16, "sine", 0.18), 180);
    } else if (event === "win") {
      [523, 659, 784, 1046].forEach((f, i) => {
        window.setTimeout(() => this.tone(f, 0.18, "triangle", 0.24), i * 120);
      });
    } else if (event === "land") this.noiseBurst(0.05, 40);
  }

  pump() {
    if (!this.ctx || !this.music || this.muted || !this.musicOn) return;
    const t = this.ctx.currentTime;
    if (this.next < t) this.next = t + 0.02;
    const scale = [392, 440, 494, 587, 659, 587, 494, 440];
    while (this.next < t + 0.5) {
      const f = scale[this.step % scale.length]! / 2;
      this.toneAt(this.next, f, 1.05, "sine", 0.5, this.music);
      this.step++;
      this.next += 0.72;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.bus) return;
    this.toneAt(this.ctx.currentTime, freq, dur, type, gain, this.bus);
  }

  private glide(a: number, b: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.bus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(a, t);
    o.frequency.exponentialRampToValueAtTime(b, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  private toneAt(when: number, freq: number, dur: number, type: OscillatorType, gain: number, dest: GainNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  private noiseBurst(dur: number, cents: number) {
    if (!this.ctx || !this.bus || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.detune.setValueAtTime(cents, t);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
}
