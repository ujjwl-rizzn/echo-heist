import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import type { LevelResult } from "../types";
import { getServices } from "../utils/services";

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.RESULTS);
  }

  create(data: { result: LevelResult } | undefined): void {
    const result = data?.result;
    if (!result) {
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    const { uiManager, audioManager } = getServices(this);
    audioManager.setMusicMode("result");

    uiManager.showResults(result, {
      onRetry: () => {
        audioManager.playUi();
        this.scene.start(SCENE_KEYS.GAME, { levelId: result.levelId });
      },
      onNext: result.nextLevelId
        ? () => {
            audioManager.playUi();
            this.scene.start(SCENE_KEYS.GAME, { levelId: result.nextLevelId });
          }
        : null,
      onLevels: () => {
        audioManager.playUi();
        this.scene.start(SCENE_KEYS.LEVEL_SELECT);
      },
      onMenu: () => {
        audioManager.playUi();
        this.scene.start(SCENE_KEYS.MENU);
      }
    });
  }
}
