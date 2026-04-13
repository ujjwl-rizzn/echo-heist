import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import type { SettingsData } from "../types";
import { getServices } from "../utils/services";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.SETTINGS);
  }

  create(data: { returnScene?: string; levelId?: string } | undefined): void {
    const { saveManager, uiManager, audioManager } = getServices(this);
    const returnScene = data?.returnScene ?? SCENE_KEYS.MENU;
    const levelId = data?.levelId;
    uiManager.applySettings(saveManager.getSettings());
    audioManager.setMusicMode("menu");

    uiManager.showSettings(saveManager.getSettings(), {
      onBack: () => {
        audioManager.playUi();
        if (returnScene === SCENE_KEYS.PAUSE) {
          this.scene.start(returnScene, { levelId });
          return;
        }
        this.scene.start(returnScene);
      },
      onSave: (settings: SettingsData) => {
        saveManager.updateSettings(settings);
        audioManager.applySettings(settings);
        uiManager.applySettings(settings);
        audioManager.playUi();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      uiManager.clearScreen();
    });
  }
}
