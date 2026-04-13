import Phaser from "phaser";
import { distanceBetween } from "../utils/math";
import type { TerminalData, Vector2Like } from "../types";

export class Terminal {
  private readonly base: Phaser.GameObjects.Rectangle;
  private readonly screen: Phaser.GameObjects.Rectangle;
  private readonly progress: Phaser.GameObjects.Rectangle;
  private busyUntil = 0;
  private active = false;

  constructor(
    scene: Phaser.Scene,
    private readonly data: TerminalData,
    private readonly onResolve: (value: boolean) => void
  ) {
    this.base = scene.add.rectangle(data.x, data.y, 34, 42, 0x0d1b2f, 0.96);
    this.screen = scene.add.rectangle(data.x, data.y - 4, 20, 18, 0x7ef6ff, 0.3);
    this.progress = scene.add.rectangle(data.x, data.y + 18, 2, 4, 0x7ef6ff, 0.95);
  }

  getPosition(): Vector2Like {
    return { x: this.data.x, y: this.data.y };
  }

  getPrompt(): string {
    return this.busyUntil > 0 ? "Hacking..." : this.data.label;
  }

  canInteract(position: Vector2Like, range: number): boolean {
    return this.busyUntil <= 0 && distanceBetween(position, this.getPosition()) <= range;
  }

  startHack(now: number): void {
    if (this.busyUntil > now) {
      return;
    }

    const duration = this.data.hackTimeMs ?? 700;
    this.busyUntil = now + duration;
    this.progress.setSize(2, 4);
    this.screen.scene.tweens.add({
      targets: this.screen,
      alpha: { from: 0.32, to: 0.9 },
      duration,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
  }

  update(now: number): boolean {
    if (this.busyUntil <= 0) {
      return false;
    }

    const duration = this.data.hackTimeMs ?? 700;
    const remaining = this.busyUntil - now;
    const progress = Phaser.Math.Clamp(1 - remaining / duration, 0, 1);
    this.progress.setSize(22 * progress, 4);
    this.progress.setFillStyle(0x7ef6ff, 0.95);

    if (remaining > 0) {
      return false;
    }

    this.busyUntil = 0;
    this.progress.setSize(2, 4);
    this.active = this.data.mode === "set" ? this.data.value ?? true : !this.active;
    this.screen.setFillStyle(this.active ? 0x71ffb7 : 0x7ef6ff, this.active ? 0.8 : 0.3);
    this.onResolve(this.active);
    return true;
  }
}
