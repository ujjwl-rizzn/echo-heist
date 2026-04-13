import Phaser from "phaser";
import type { PressurePlateData, Vector2Like } from "../types";

export class PressurePlate {
  private readonly plate: Phaser.GameObjects.Rectangle;
  private readonly rim: Phaser.GameObjects.Rectangle;
  private active = false;

  constructor(scene: Phaser.Scene, private readonly data: PressurePlateData) {
    const centerX = data.x + data.w / 2;
    const centerY = data.y + data.h / 2;
    this.rim = scene.add.rectangle(centerX, centerY, data.w + 6, data.h + 6, 0x7ef6ff, 0.07);
    this.plate = scene.add.rectangle(centerX, centerY, data.w, data.h, 0x081423, 0.92);
  }

  get channel(): string {
    return this.data.channel;
  }

  contains(position: Vector2Like): boolean {
    return (
      position.x >= this.data.x &&
      position.x <= this.data.x + this.data.w &&
      position.y >= this.data.y &&
      position.y <= this.data.y + this.data.h
    );
  }

  setActive(active: boolean): void {
    if (this.active === active) {
      return;
    }

    this.active = active;
    this.plate.setFillStyle(active ? 0x7ef6ff : 0x081423, active ? 0.34 : 0.92);
    this.rim.setFillStyle(active ? 0xffd76f : 0x7ef6ff, active ? 0.18 : 0.07);
  }

  isActive(): boolean {
    return this.active;
  }
}
