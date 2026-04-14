import Phaser from "phaser";
import { COLORS, SCENE_KEYS } from "../constants";
import { AudioManager } from "../managers/AudioManager";
import { LevelManager } from "../managers/LevelManager";
import { RewardedAdManager } from "../managers/RewardedAdManager";
import { SaveManager } from "../managers/SaveManager";
import { UIManager } from "../managers/UIManager";
import { setServices } from "../utils/services";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create(): void {
    this.createTextures();

    const saveManager = new SaveManager();
    const audioManager = new AudioManager(saveManager.getSettings());
    const levelManager = new LevelManager();
    const uiManager = new UIManager();
    const rewardManager = new RewardedAdManager(saveManager, uiManager);

    setServices(this, {
      saveManager,
      audioManager,
      levelManager,
      rewardManager,
      uiManager
    });

    this.scene.start(SCENE_KEYS.PRELOAD);
  }

  private createTextures(): void {
    const graphics = this.add.graphics({ x: 0, y: 0 });
    graphics.setVisible(false);

    graphics.fillStyle(COLORS.player, 0.14);
    graphics.fillCircle(24, 24, 20);
    graphics.fillStyle(COLORS.player, 1);
    graphics.fillCircle(24, 14, 6);
    graphics.fillRoundedRect(17, 20, 14, 18, 5);
    graphics.fillStyle(0xeef8ff, 0.92);
    graphics.fillRoundedRect(19, 22, 10, 8, 3);
    graphics.fillStyle(COLORS.player, 0.92);
    graphics.fillRoundedRect(15, 21, 3, 14, 2);
    graphics.fillRoundedRect(30, 21, 3, 14, 2);
    graphics.fillRoundedRect(18, 36, 4, 8, 2);
    graphics.fillRoundedRect(26, 36, 4, 8, 2);
    graphics.lineStyle(2, 0xffffff, 0.2);
    graphics.strokeCircle(24, 24, 18);
    graphics.generateTexture("player", 48, 48);

    graphics.clear();
    graphics.fillStyle(COLORS.echo, 0.14);
    graphics.fillCircle(24, 24, 20);
    graphics.fillStyle(COLORS.echo, 0.88);
    graphics.fillCircle(24, 14, 6);
    graphics.fillRoundedRect(17, 20, 14, 18, 5);
    graphics.fillRoundedRect(15, 21, 3, 14, 2);
    graphics.fillRoundedRect(30, 21, 3, 14, 2);
    graphics.fillRoundedRect(18, 36, 4, 8, 2);
    graphics.fillRoundedRect(26, 36, 4, 8, 2);
    graphics.lineStyle(2, 0xffffff, 0.42);
    graphics.strokeCircle(24, 24, 18);
    graphics.lineStyle(1, 0xffffff, 0.22);
    graphics.lineBetween(16, 22, 32, 22);
    graphics.lineBetween(16, 30, 32, 30);
    graphics.generateTexture("echo", 48, 48);

    graphics.clear();
    graphics.fillStyle(COLORS.guard, 0.2);
    graphics.fillCircle(24, 24, 19);
    graphics.fillStyle(COLORS.guard, 1);
    graphics.fillCircle(24, 14, 6);
    graphics.fillRoundedRect(16, 20, 16, 19, 6);
    graphics.fillRoundedRect(14, 22, 4, 14, 2);
    graphics.fillRoundedRect(30, 22, 4, 14, 2);
    graphics.fillRoundedRect(18, 37, 4, 7, 2);
    graphics.fillRoundedRect(26, 37, 4, 7, 2);
    graphics.fillStyle(0x1d0811, 0.92);
    graphics.fillRoundedRect(14, 18, 20, 10, 5);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRoundedRect(17, 21, 14, 3, 2);
    graphics.generateTexture("guard", 48, 48);

    graphics.clear();
    graphics.fillStyle(COLORS.camera, 0.16);
    graphics.fillCircle(24, 24, 20);
    graphics.fillStyle(0x1b1b29, 1);
    graphics.fillRoundedRect(8, 16, 32, 18, 9);
    graphics.fillStyle(COLORS.camera, 1);
    graphics.fillRoundedRect(12, 18, 24, 14, 7);
    graphics.fillStyle(0x0d1523, 1);
    graphics.fillCircle(24, 25, 6);
    graphics.lineStyle(2, 0xffffff, 0.28);
    graphics.strokeCircle(24, 25, 10);
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillCircle(27, 22, 2);
    graphics.generateTexture("camera", 48, 48);

    graphics.clear();
    graphics.fillStyle(COLORS.core, 0.08);
    graphics.fillCircle(28, 28, 24);
    graphics.lineStyle(2, COLORS.player, 0.22);
    graphics.strokeCircle(28, 28, 22);
    graphics.fillStyle(0x0d1623, 0.96);
    graphics.fillRoundedRect(10, 16, 36, 24, 8);
    graphics.fillStyle(COLORS.core, 0.92);
    graphics.fillRoundedRect(15, 20, 26, 16, 6);
    graphics.lineStyle(2, 0xffffff, 0.22);
    graphics.strokeRoundedRect(15, 20, 26, 16, 6);
    graphics.lineStyle(2, 0xffffff, 0.44);
    graphics.lineBetween(19, 24, 37, 24);
    graphics.lineBetween(19, 28, 35, 28);
    graphics.lineBetween(19, 32, 37, 32);
    graphics.fillStyle(COLORS.player, 0.8);
    graphics.fillCircle(44, 28, 4);
    graphics.fillStyle(COLORS.core, 0.16);
    graphics.fillCircle(12, 28, 5);
    graphics.lineStyle(2, 0xffffff, 0.3);
    graphics.strokeCircle(28, 28, 24);
    graphics.generateTexture("core", 56, 56);

    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(5, 5, 4);
    graphics.generateTexture("spark", 10, 10);

    graphics.destroy();
  }
}
