import Phaser from "phaser";
import { COLORS, SCENE_KEYS } from "../constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#060914");

    const glow = this.add.circle(width / 2, height * 0.32, 140, COLORS.player, 0.08);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.16 },
      scale: { from: 0.92, to: 1.08 },
      duration: 950,
      yoyo: true,
      repeat: -1
    });

    this.add
      .text(width / 2, height * 0.22, "ECHO HEIST", {
        fontFamily: "Chakra Petch, sans-serif",
        fontSize: "46px",
        color: "#eef8ff"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.3, "Linking ghost threads...", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "18px",
        color: "#8ba5bf"
      })
      .setOrigin(0.5);

    const barWidth = 320;
    const shell = this.add.rectangle(width / 2, height * 0.52, barWidth, 14, 0xffffff, 0.08);
    const fill = this.add.rectangle(width / 2 - barWidth / 2, height * 0.52, 0, 14, COLORS.player, 0.95).setOrigin(0, 0.5);

    const progress = { value: 0 };
    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 680,
      onUpdate: () => {
        fill.displayWidth = barWidth * progress.value;
      },
      onComplete: () => {
        shell.destroy();
        fill.destroy();
        this.scene.start(SCENE_KEYS.MENU);
      }
    });
  }
}
