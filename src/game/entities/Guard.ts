import Phaser from "phaser";
import type { GuardData, Vector2Like } from "../types";

type GuardState = "patrol" | "investigate" | "chase";

export class Guard extends Phaser.Physics.Arcade.Sprite {
  private readonly patrol: Vector2Like[];
  private readonly visionCone: Phaser.GameObjects.Graphics;
  private patrolIndex = 0;
  private state: GuardState = "patrol";
  private investigateTarget?: Vector2Like;
  private chaseTarget?: Vector2Like;
  private investigateTimerMs = 0;
  private chaseTimerMs = 0;
  private facingAngle = 0;

  constructor(scene: Phaser.Scene, private readonly data: GuardData) {
    super(scene, data.x, data.y, "guard");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.patrol = data.patrol.length ? data.patrol : [{ x: data.x, y: data.y }];
    this.visionCone = scene.add.graphics().setDepth(10);
    this.setDepth(25);
    this.setCircle(18);
    this.setDamping(true);
    this.setDrag(0.001);
  }

  getVisionOrigin(): Vector2Like {
    return { x: this.x, y: this.y };
  }

  getVisionRange(): number {
    return this.data.visionRange;
  }

  getVisionHalfAngle(): number {
    return this.data.visionAngle / 2;
  }

  getFacingAngle(): number {
    return this.facingAngle;
  }

  setInvestigateTarget(target: Vector2Like): void {
    if (this.chaseTimerMs > 0) {
      return;
    }

    this.investigateTarget = { ...target };
    this.investigateTimerMs = 1400;
    this.state = "investigate";
  }

  setChaseTarget(target: Vector2Like): void {
    this.chaseTarget = { ...target };
    this.chaseTimerMs = 1800;
    this.state = "chase";
  }

  updateGuard(deltaMs: number): void {
    this.chaseTimerMs = Math.max(0, this.chaseTimerMs - deltaMs);
    this.investigateTimerMs = Math.max(0, this.investigateTimerMs - deltaMs);

    let target = this.patrol[this.patrolIndex];
    let speed = this.data.speed ?? 94;

    if (this.chaseTimerMs > 0 && this.chaseTarget) {
      target = this.chaseTarget;
      speed *= 1.45;
      this.state = "chase";
    } else if (this.investigateTimerMs > 0 && this.investigateTarget) {
      target = this.investigateTarget;
      speed *= 1.15;
      this.state = "investigate";
    } else {
      this.state = "patrol";
      if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < 14) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
        target = this.patrol[this.patrolIndex];
      }
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.facingAngle = angle;
    this.rotation = angle + Math.PI / 2;
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < 16) {
      this.setVelocity(0, 0);
    }

    this.drawVision();
  }

  private drawVision(): void {
    const range = this.data.visionRange;
    const halfAngle = this.getVisionHalfAngle();
    const color =
      this.state === "chase" ? 0xff556e : this.state === "investigate" ? 0xffd76f : 0x7ef6ff;

    const left = this.facingAngle - halfAngle;
    const right = this.facingAngle + halfAngle;

    this.visionCone.clear();
    this.visionCone.fillStyle(color, this.state === "patrol" ? 0.08 : 0.13);
    this.visionCone.beginPath();
    this.visionCone.moveTo(this.x, this.y);
    this.visionCone.lineTo(this.x + Math.cos(left) * range, this.y + Math.sin(left) * range);
    this.visionCone.lineTo(this.x + Math.cos(right) * range, this.y + Math.sin(right) * range);
    this.visionCone.closePath();
    this.visionCone.fillPath();
  }

  override destroy(fromScene?: boolean): void {
    this.visionCone.destroy();
    super.destroy(fromScene);
  }
}
