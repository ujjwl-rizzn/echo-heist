import type { SettingsData } from "../types";
type MusicMode = "menu" | "stealth" | "alarm" | "result" | null;

export class AudioManager {
  private context: AudioContext | null = null;
  private settings: SettingsData;
  private musicMode: MusicMode = null;
  private desiredMode: MusicMode = null;
  private musicTimers: number[] = [];

  constructor(s: SettingsData) { this.settings = s; }

  applySettings(s: SettingsData): void { this.settings = s; this.refreshMusic(true); }

  async prime(): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    this.refreshMusic(true);
  }

  setMusicMode(mode: MusicMode): void { this.desiredMode = mode; this.refreshMusic(); }

  playUi():      void { this.beep(880,  0.05, "triangle", 0.04); }
  playEcho():    void { this.beep(520, 0.12, "sawtooth", 0.07); this.beep(760, 0.08, "triangle", 0.05, 0.03); }
  playDetect():  void { this.beep(180, 0.18, "square",   0.08); this.beep(240, 0.2,  "square",   0.05, 0.06); }
  playHack():    void { this.beep(420, 0.08, "triangle", 0.05); this.beep(620, 0.08, "triangle", 0.04, 0.06); }
  playSuccess(): void { this.beep(660, 0.10, "triangle", 0.08); this.beep(880, 0.14, "triangle", 0.06, 0.07); }
  playDoor():    void { this.beep(290, 0.07, "sawtooth", 0.05); }
  playAlarm():   void { this.beep(180, 0.22, "square",   0.10); this.beep(360, 0.18, "square",   0.07, 0.08); }
  playPickup():  void { this.beep(740, 0.06, "triangle", 0.04); this.beep(980, 0.05, "triangle", 0.03, 0.04); }
  playFootstep(rate = 1): void { this.beep(110 * rate, 0.03, "square", 0.015); }

  setAlarmMix(_v: number): void { /* reserved for future audio bus mixing */ }

  private refreshMusic(force = false): void {
    const ctx = this.ensureCtx();
    if (!ctx || ctx.state !== "running") return;
    if (!force && this.musicMode === this.desiredMode) return;
    this.stopMusic();
    this.musicMode = this.desiredMode;
    if (!this.musicMode || this.settings.masterVolume <= 0 || this.settings.musicVolume <= 0) return;
    switch (this.musicMode) {
      case "menu":    this.startMenuMusic();    break;
      case "stealth": this.startStealthMusic(); break;
      case "alarm":   this.startAlarmMusic();   break;
      case "result":  this.startResultMusic();  break;
    }
  }

  private startMenuMusic(): void {
    this.loop(2100, () => {
      this.tone(130.81, 1.8, "triangle", 0.055, 0, "music");
      this.tone(196,    1.6, "sine",     0.04,  0.08, "music");
    }, true);
    this.loop(1050, () => {
      this.tone(392,    0.18, "triangle", 0.025, 0,    "music");
      this.tone(523.25, 0.16, "sine",     0.016, 0.08, "music");
    }, true);
  }

  private startStealthMusic(): void {
    const bass = [98,98,110,146.83,98,98,123.47,110];
    let bi = 0;
    this.loop(520, () => {
      const f = bass[bi % bass.length]!;
      this.tone(f,   0.2,  "triangle", 0.048, 0,    "music");
      this.tone(f*2, 0.06, "square",   0.01,  0.03, "music");
      bi++;
    }, true);
    const shimmer = [392,440,523.25,466.16];
    let si = 0;
    this.loop(2080, () => {
      this.tone(164.81,              1.9,  "sine",     0.022, 0,    "music");
      this.tone(shimmer[si % shimmer.length]!, 0.24, "triangle", 0.026, 0.12, "music");
      si++;
    }, true);
    this.loop(260, () => this.tone(73.42, 0.05, "square", 0.012, 0, "music"), false);
  }

  private startAlarmMusic(): void {
    const pat = [174.61,233.08,196,261.63];
    let i = 0;
    this.loop(300, () => {
      const f = pat[i % pat.length]!;
      this.tone(f,     0.14, "square",   0.075, 0,    "music");
      this.tone(f*0.5, 0.22, "sawtooth", 0.038, 0,    "music");
      i++;
    }, true);
    this.loop(1200, () => {
      this.tone(92.5,  0.6, "triangle", 0.025, 0,    "music");
      this.tone(369.99,0.3, "sine",     0.022, 0.08, "music");
    }, true);
  }

  private startResultMusic(): void {
    const notes = [392,523.25,659.25,783.99];
    let i = 0;
    this.loop(760, () => {
      const f = notes[i % notes.length]!;
      this.tone(f,     0.18, "triangle", 0.055, 0, "music");
      this.tone(f*0.5, 0.4,  "sine",     0.022, 0, "music");
      i++;
    }, true);
  }

  private loop(ms: number, cb: () => void, fireNow: boolean): void {
    if (fireNow) cb();
    this.musicTimers.push(window.setInterval(cb, ms));
  }

  private stopMusic(): void {
    this.musicTimers.forEach(t => window.clearInterval(t));
    this.musicTimers = [];
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
    this.tone(freq, dur, type, vol, delay, "sfx");
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay: number, bus: "music"|"sfx"): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => { this.refreshMusic(true); this.tone(freq,dur,type,vol,delay,bus); });
      return;
    }
    const busVol = bus === "music"
      ? this.settings.masterVolume * this.settings.musicVolume
      : this.settings.masterVolume * this.settings.sfxVolume;
    if (busVol <= 0) return;
    const t0  = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    const flt = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    flt.type = bus === "music" ? "lowpass" : "bandpass";
    flt.frequency.setValueAtTime(bus === "music" ? 1200 : 2400, t0);
    flt.Q.setValueAtTime(0.9, t0);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.linearRampToValueAtTime(vol * busVol, t0 + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(flt); flt.connect(gn); gn.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
    }
    return this.context;
  }
}
