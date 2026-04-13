import type { SettingsData } from "../types";

type MusicMode = "menu" | "stealth" | "alarm" | "result" | null;

export class AudioManager {
  private context: AudioContext | null = null;
  private settings: SettingsData;
  private musicMode: MusicMode = null;
  private desiredMusicMode: MusicMode = null;
  private musicTimers: number[] = [];

  constructor(initialSettings: SettingsData) {
    this.settings = initialSettings;
  }

  applySettings(next: SettingsData): void {
    this.settings = next;
    this.refreshMusic(true);
  }

  async prime(): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }
    this.refreshMusic(true);
  }

  setMusicMode(mode: MusicMode): void {
    this.desiredMusicMode = mode;
    this.refreshMusic();
  }

  playUi(): void {
    this.beep(880, 0.05, "triangle", 0.04);
  }

  playEcho(): void {
    this.beep(520, 0.12, "sawtooth", 0.07);
    this.beep(760, 0.08, "triangle", 0.05, 0.03);
  }

  playDetect(): void {
    this.beep(180, 0.18, "square", 0.08);
    this.beep(240, 0.2, "square", 0.05, 0.06);
  }

  playHack(): void {
    this.beep(420, 0.08, "triangle", 0.05);
    this.beep(620, 0.08, "triangle", 0.04, 0.06);
  }

  playSuccess(): void {
    this.beep(660, 0.1, "triangle", 0.08);
    this.beep(880, 0.14, "triangle", 0.06, 0.07);
  }

  playDoor(): void {
    this.beep(290, 0.07, "sawtooth", 0.05);
  }

  playFootstep(rate = 1): void {
    this.beep(120 * rate, 0.03, "square", 0.02);
  }

  private refreshMusic(force = false): void {
    const context = this.ensureContext();
    if (!context || context.state !== "running") {
      return;
    }

    if (!force && this.musicMode === this.desiredMusicMode) {
      return;
    }

    this.stopMusic();
    this.musicMode = this.desiredMusicMode;

    if (!this.musicMode || this.settings.masterVolume <= 0 || this.settings.musicVolume <= 0) {
      return;
    }

    switch (this.musicMode) {
      case "menu":
        this.startMenuMusic();
        break;
      case "stealth":
        this.startStealthMusic();
        break;
      case "alarm":
        this.startAlarmMusic();
        break;
      case "result":
        this.startResultMusic();
        break;
      default:
        break;
    }
  }

  private startMenuMusic(): void {
    this.startLoop(
      2100,
      () => {
        this.playMusicTone(130.81, 1.8, "triangle", 0.06);
        this.playMusicTone(196, 1.6, "sine", 0.045, 0.08);
      },
      true
    );
    this.startLoop(
      1050,
      () => {
        this.playMusicTone(392, 0.18, "triangle", 0.03);
        this.playMusicTone(523.25, 0.16, "sine", 0.018, 0.08);
      },
      true
    );
  }

  private startStealthMusic(): void {
    const bassline = [98, 98, 110, 146.83, 98, 98, 123.47, 110];
    let bassIndex = 0;
    this.startLoop(
      520,
      () => {
        const frequency = bassline[bassIndex % bassline.length]!;
        this.playMusicTone(frequency, 0.2, "triangle", 0.05);
        this.playMusicTone(frequency * 2, 0.06, "square", 0.01, 0.03);
        bassIndex += 1;
      },
      true
    );

    const shimmer = [392, 440, 523.25, 466.16];
    let shimmerIndex = 0;
    this.startLoop(
      2080,
      () => {
        const frequency = shimmer[shimmerIndex % shimmer.length]!;
        this.playMusicTone(164.81, 1.9, "sine", 0.024);
        this.playMusicTone(frequency, 0.24, "triangle", 0.028, 0.12);
        shimmerIndex += 1;
      },
      true
    );

    this.startLoop(
      260,
      () => {
        this.playMusicTone(73.42, 0.05, "square", 0.014);
      },
      false
    );
  }

  private startAlarmMusic(): void {
    const pattern = [174.61, 233.08, 196, 261.63];
    let index = 0;
    this.startLoop(
      300,
      () => {
        const frequency = pattern[index % pattern.length]!;
        this.playMusicTone(frequency, 0.14, "square", 0.08);
        this.playMusicTone(frequency * 0.5, 0.22, "sawtooth", 0.04);
        index += 1;
      },
      true
    );

    this.startLoop(
      1200,
      () => {
        this.playMusicTone(92.5, 0.6, "triangle", 0.028);
        this.playMusicTone(369.99, 0.3, "sine", 0.024, 0.08);
      },
      true
    );
  }

  private startResultMusic(): void {
    const notes = [392, 523.25, 659.25, 783.99];
    let index = 0;
    this.startLoop(
      760,
      () => {
        const frequency = notes[index % notes.length]!;
        this.playMusicTone(frequency, 0.18, "triangle", 0.06);
        this.playMusicTone(frequency * 0.5, 0.4, "sine", 0.024);
        index += 1;
      },
      true
    );
  }

  private startLoop(intervalMs: number, callback: () => void, fireImmediately = false): void {
    if (fireImmediately) {
      callback();
    }
    const timer = window.setInterval(callback, intervalMs);
    this.musicTimers.push(timer);
  }

  private stopMusic(): void {
    this.musicTimers.forEach((timer) => window.clearInterval(timer));
    this.musicTimers = [];
  }

  private playMusicTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    this.tone(frequency, duration, type, volume, delay, "music");
  }

  private beep(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    this.tone(frequency, duration, type, volume, delay, "sfx");
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay: number,
    bus: "music" | "sfx"
  ): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume().then(() => {
        this.refreshMusic(true);
        this.tone(frequency, duration, type, volume, delay, bus);
      });
      return;
    }

    const busVolume =
      bus === "music"
        ? this.settings.masterVolume * this.settings.musicVolume
        : this.settings.masterVolume * this.settings.sfxVolume;

    if (busVolume <= 0) {
      return;
    }

    const startAt = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);

    filter.type = bus === "music" ? "lowpass" : "bandpass";
    filter.frequency.setValueAtTime(bus === "music" ? 1200 : 2400, startAt);
    filter.Q.setValueAtTime(bus === "music" ? 0.9 : 1.1, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(volume * busVolume, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        return null;
      }
      this.context = new Ctor();
    }

    return this.context;
  }
}
