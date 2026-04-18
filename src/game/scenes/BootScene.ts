import Phaser from "phaser";
import { COLORS, SCENE_KEYS } from "../constants";
import { AudioManager }      from "../managers/AudioManager";
import { LevelManager }      from "../managers/LevelManager";
import { RewardedAdManager } from "../managers/RewardedAdManager";
import { SaveManager }       from "../managers/SaveManager";
import { UIManager }         from "../managers/UIManager";
import { setServices }       from "../utils/services";

export class BootScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.BOOT); }

  create(): void {
    this.buildTextures();
    const saveManager   = new SaveManager();
    const audioManager  = new AudioManager(saveManager.getSettings());
    const levelManager  = new LevelManager();
    const uiManager     = new UIManager();
    const rewardManager = new RewardedAdManager(saveManager, uiManager);
    setServices(this, { saveManager, audioManager, levelManager, rewardManager, uiManager });
    this.scene.start(SCENE_KEYS.PRELOAD);
  }

  private buildTextures(): void {
    const g = this.add.graphics({ x:0, y:0 });
    g.setVisible(false);

    /* player */
    g.fillStyle(COLORS.player, 0.12); g.fillCircle(24,24,20);
    g.fillStyle(COLORS.player, 1);    g.fillCircle(24,14,6); g.fillRoundedRect(17,20,14,18,5);
    g.fillStyle(0xeef8ff, 0.9);       g.fillRoundedRect(19,22,10,8,3);
    g.fillStyle(COLORS.player, 0.9);
    g.fillRoundedRect(15,21,3,14,2); g.fillRoundedRect(30,21,3,14,2);
    g.fillRoundedRect(18,36,4,8,2);  g.fillRoundedRect(26,36,4,8,2);
    g.lineStyle(1,0xffffff,0.18); g.strokeCircle(24,24,18);
    g.generateTexture("player",48,48); g.clear();

    /* echo clone */
    g.fillStyle(COLORS.echo, 0.12); g.fillCircle(24,24,20);
    g.fillStyle(COLORS.echo, 0.86); g.fillCircle(24,14,6); g.fillRoundedRect(17,20,14,18,5);
    g.fillRoundedRect(15,21,3,14,2); g.fillRoundedRect(30,21,3,14,2);
    g.fillRoundedRect(18,36,4,8,2);  g.fillRoundedRect(26,36,4,8,2);
    g.lineStyle(2,0xffffff,0.38); g.strokeCircle(24,24,18);
    g.lineStyle(1,0xffffff,0.2);  g.lineBetween(16,22,32,22); g.lineBetween(16,30,32,30);
    g.generateTexture("echo",48,48); g.clear();

    /* guard */
    g.fillStyle(COLORS.guard, 0.18); g.fillCircle(24,24,19);
    g.fillStyle(COLORS.guard, 1);    g.fillCircle(24,14,6); g.fillRoundedRect(16,20,16,19,6);
    g.fillRoundedRect(14,22,4,14,2); g.fillRoundedRect(30,22,4,14,2);
    g.fillRoundedRect(18,37,4,7,2);  g.fillRoundedRect(26,37,4,7,2);
    g.fillStyle(0x1d0811,0.9);       g.fillRoundedRect(14,18,20,10,5);
    g.fillStyle(0xffffff,0.88);      g.fillRoundedRect(17,21,14,3,2);
    g.generateTexture("guard",48,48); g.clear();

    /* core / data payload */
    g.fillStyle(COLORS.core, 0.08);   g.fillCircle(28,28,24);
    g.lineStyle(2,COLORS.player,0.2); g.strokeCircle(28,28,22);
    g.fillStyle(0x0d1623,0.95);       g.fillRoundedRect(10,16,36,24,8);
    g.fillStyle(COLORS.core,0.9);     g.fillRoundedRect(15,20,26,16,6);
    g.lineStyle(2,0xffffff,0.2);      g.strokeRoundedRect(15,20,26,16,6);
    g.lineStyle(2,0xffffff,0.42);
    g.lineBetween(19,24,37,24); g.lineBetween(19,28,35,28); g.lineBetween(19,32,37,32);
    g.fillStyle(COLORS.player,0.8);   g.fillCircle(44,28,4);
    g.lineStyle(2,0xffffff,0.28);     g.strokeCircle(28,28,24);
    g.generateTexture("core",56,56); g.clear();

    g.destroy();
  }
}
