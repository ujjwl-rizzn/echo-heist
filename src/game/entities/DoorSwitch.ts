import Phaser from "phaser";
import { distanceBetween } from "../utils/math";
import type { DoorSwitchData, Vector2Like } from "../types";

export class DoorSwitch {
  private readonly ring: Phaser.GameObjects.Arc;
  private readonly core: Phaser.GameObjects.Arc;
  private active = false;
  private used = false;

  constructor(
    scene: Phaser.Scene,
    private readonly data: DoorSwitchData,
    private readonly onToggle: (value: boolean) => void
  ) {
    this.ring = scene.add.circle(data.x, data.y, 20, 0xff3a88, 0.12);
    this.core = scene.add.circle(data.x, data.y, 12, 0xff3a88, 0.85);
  }

  getPosition(): Vector2Like {
    return { x: this.data.x, y: this.data.y };
  }

  getPrompt(): string {
    return this.data.label;
  }

  canInteract(position: Vector2Like, range: number): boolean {
    if (this.data.oneShot && this.used) {
      return false;
    }
    return distanceBetween(position, this.getPosition()) <= range;
  }

  interact(): void {
    if (this.data.oneShot && this.used) {
      return;
    }

    this.active = !this.active;
    this.used = true;
    this.core.setFillStyle(this.active ? 0x7ef6ff : 0xff3a88, 0.95);
    this.ring.setFillStyle(this.active ? 0x7ef6ff : 0xff3a88, 0.18);
    this.onToggle(this.active);
  }
}
