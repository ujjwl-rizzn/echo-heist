import Phaser from "phaser";
import type { Vector2Like } from "../types";

export class DataCore {
  private readonly halo: Phaser.GameObjects.Arc;
  private readonly gem: Phaser.GameObjects.Sprite;
  private collected = false;

  constructor(scene: Phaser.Scene, position: Vector2Like) {
    this.halo = scene.add.circle(position.x, position.y, 24, 0x7ef6ff, 0.14);
    this.gem = scene.add.sprite(position.x, position.y, "data-core");
    scene.tweens.add({
      targets: [this.halo, this.gem],
      y: "-=8",
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut"
    });
  }

  getPosition(): Vector2Like {
    return { x: this.gem.x, y: this.gem.y };
  }

  isCollected(): boolean {
    return this.collected;
  }

  collect(): void {
    if (this.collected) {
      return;
    }

    this.collected = true;
    this.gem.scene.tweens.add({
      targets: [this.halo, this.gem],
      scale: 0,
      alpha: 0,
      duration: 220,
      ease: "Back.easeIn",
      onComplete: () => {
        this.halo.setVisible(false);
        this.gem.setVisible(false);
      }
    });
  }
}
