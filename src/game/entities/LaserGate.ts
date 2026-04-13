import Phaser from "phaser";
import type { LaserData, RectLike, Vector2Like } from "../types";

export class LaserGate {
  private readonly beam: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private active = true;

  constructor(scene: Phaser.Scene, private readonly data: LaserData) {
    const width = data.orientation === "horizontal" ? data.length : 8;
    const height = data.orientation === "horizontal" ? 8 : data.length;
    this.glow = scene.add.rectangle(data.x, data.y, width + 10, height + 10, 0xff3a88, 0.12);
    this.beam = scene.add.rectangle(data.x, data.y, width, height, 0xff556e, 0.92);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  get id(): string {
    return this.data.id;
  }

  update(timeMs: number, channelActive: boolean): void {
    const channelState = this.data.channel
      ? this.data.activeWhen === "inactive"
        ? !channelActive
        : channelActive
      : true;

    const cycleState = this.data.cycle
      ? ((timeMs + (this.data.cycle.offsetMs ?? 0)) %
          (this.data.cycle.onMs + this.data.cycle.offMs)) <
        this.data.cycle.onMs
      : true;

    this.active = channelState && cycleState;
    this.beam.setAlpha(this.active ? 0.92 : 0.1);
    this.glow.setAlpha(this.active ? 0.25 : 0.04);
  }

  isActive(): boolean {
    return this.active;
  }

  contains(position: Vector2Like): boolean {
    if (!this.active) {
      return false;
    }
    const bounds = this.getBounds();
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.w &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.h
    );
  }

  getBounds(): RectLike {
    return {
      x: this.beam.x - this.beam.width / 2,
      y: this.beam.y - this.beam.height / 2,
      w: this.beam.width,
      h: this.beam.height
    };
  }
}
