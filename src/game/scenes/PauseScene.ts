import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import { getServices } from "../utils/services";

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PAUSE);
  }

  create(data: { levelId: string } | undefined): void {
    const { uiManager, audioManager } = getServices(this);
    const levelId = data?.levelId ?? "tutorial-split";
    audioManager.setMusicMode("menu");

    uiManager.showPause({
      onResume: () => {
        audioManager.playUi();
        audioManager.setMusicMode("stealth");
        uiManager.clearScreen();
        this.scene.stop();
        this.scene.resume(SCENE_KEYS.GAME);
      },
      onRetry: () => {
        audioManager.playUi();
        uiManager.clearScreen();
        this.scene.stop(SCENE_KEYS.GAME);
        this.scene.stop();
        this.scene.start(SCENE_KEYS.GAME, { levelId });
      },
      onSettings: () => {
        audioManager.playUi();
        uiManager.clearScreen();
        this.scene.stop();
        this.scene.launch(SCENE_KEYS.SETTINGS, { returnScene: SCENE_KEYS.PAUSE, levelId });
      },
      onMenu: () => {
        audioManager.playUi();
        audioManager.setMusicMode("menu");
        uiManager.clearScreen();
        this.scene.stop(SCENE_KEYS.GAME);
        this.scene.stop();
        this.scene.start(SCENE_KEYS.MENU);
      }
    });
  }
}
