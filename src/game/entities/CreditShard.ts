import Phaser from "phaser";
import type { CollectibleData, Vector2Like } from "../types";

export class CreditShard {
  private readonly halo: Phaser.GameObjects.Arc;
  private readonly shard: Phaser.GameObjects.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, private readonly data: CollectibleData) {
    this.halo = scene.add.circle(data.x, data.y, 16, 0xffd76f, 0.12);
    this.shard = scene.add.sprite(data.x, data.y, "credit-shard");
    this.shard.setScale(0.9);
  }

  get id(): string {
    return this.data.id;
  }

  get value(): number {
    return this.data.value;
  }

  getPosition(): Vector2Like {
    return { x: this.data.x, y: this.data.y };
  }

  isCollected(): boolean {
    return this.collected;
  }

  collect(): void {
    if (this.collected) {
      return;
    }

    this.collected = true;
    this.shard.scene.tweens.add({
      targets: [this.halo, this.shard],
      alpha: 0,
      scale: 0,
      duration: 180,
      ease: "Back.easeIn"
    });
  }
}
