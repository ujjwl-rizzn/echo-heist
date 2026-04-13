import Phaser from "phaser";
import type { CameraData, Vector2Like } from "../types";

export class CameraSensor {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly eye: Phaser.GameObjects.Arc;
  private readonly cone: Phaser.GameObjects.Graphics;
  private currentAngle = 0;
  private active = true;

  constructor(scene: Phaser.Scene, private readonly data: CameraData) {
    this.base = scene.add.circle(data.x, data.y, 18, 0x0f2237, 0.95);
    this.eye = scene.add.circle(data.x, data.y, 7, 0x7ef6ff, 0.95);
    this.cone = scene.add.graphics().setDepth(9);
  }

  update(timeMs: number, channelActive: boolean): void {
    this.active = this.data.channel
      ? this.data.activeWhen === "inactive"
        ? !channelActive
        : channelActive
      : true;

    const sweepRadians = Phaser.Math.DegToRad(this.data.sweep);
    const baseRadians = Phaser.Math.DegToRad(this.data.baseAngle);
    this.currentAngle = baseRadians + Math.sin((timeMs / 1000) * this.data.speed) * sweepRadians;

    this.eye.setFillStyle(this.active ? 0x7ef6ff : 0x32485f, this.active ? 0.95 : 0.6);
    this.drawCone();
  }

  isActive(): boolean {
    return this.active;
  }

  getVisionOrigin(): Vector2Like {
    return { x: this.data.x, y: this.data.y };
  }

  getAngle(): number {
    return this.currentAngle;
  }

  getRange(): number {
    return this.data.range;
  }

  private drawCone(): void {
    this.cone.clear();
    if (!this.active) {
      return;
    }

    const halfAngle = Phaser.Math.DegToRad(18);
    this.cone.fillStyle(0x7ef6ff, 0.08);
    this.cone.beginPath();
    this.cone.moveTo(this.data.x, this.data.y);
    this.cone.lineTo(
      this.data.x + Math.cos(this.currentAngle - halfAngle) * this.data.range,
      this.data.y + Math.sin(this.currentAngle - halfAngle) * this.data.range
    );
    this.cone.lineTo(
      this.data.x + Math.cos(this.currentAngle + halfAngle) * this.data.range,
      this.data.y + Math.sin(this.currentAngle + halfAngle) * this.data.range
    );
    this.cone.closePath();
    this.cone.fillPath();
  }
}
