import Phaser from "phaser";
import type { DoorData, RectLike } from "../types";

export class Door {
  private readonly base: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private open = false;

  constructor(scene: Phaser.Scene, private readonly data: DoorData) {
    const centerX = data.x + data.w / 2;
    const centerY = data.y + data.h / 2;

    this.glow = scene.add
      .rectangle(centerX, centerY, data.w + 10, data.h + 10, 0x7ef6ff, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.base = scene.add.rectangle(centerX, centerY, data.w, data.h, 0x12253a, 0.92);
    this.blocker = scene.add.rectangle(centerX, centerY, data.w, data.h, 0x000000, 0);
    scene.physics.add.existing(this.blocker, true);
  }

  get channel(): string {
    return this.data.channel;
  }

  shouldBeOpen(channelActive: boolean): boolean {
    return this.data.openWhen === "inactive" ? !channelActive : channelActive;
  }

  setOpen(open: boolean): void {
    if (this.open === open) {
      return;
    }

    this.open = open;
    const body = this.blocker.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = !open;
    body.updateFromGameObject();

    this.base.setFillStyle(open ? 0x21474f : 0x12253a, open ? 0.35 : 0.92);
    this.glow.setFillStyle(open ? 0x7ef6ff : 0xff3a88, open ? 0.16 : 0.08);
    this.base.scene.tweens.add({
      targets: this.base,
      alpha: open ? 0.45 : 1,
      duration: 180,
      ease: "Sine.easeOut"
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  getBlocker(): Phaser.GameObjects.Rectangle {
    return this.blocker;
  }

  getOccluderRect(): RectLike {
    return {
      x: this.data.x,
      y: this.data.y,
      w: this.data.w,
      h: this.data.h
    };
  }

  destroy(): void {
    this.base.destroy();
    this.glow.destroy();
    this.blocker.destroy();
  }
}
