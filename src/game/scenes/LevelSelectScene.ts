import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import type { LevelCardData } from "../types";
import { getServices } from "../utils/services";

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.LEVEL_SELECT);
  }

  create(): void {
    const { levelManager, saveManager, uiManager, audioManager } = getServices(this);
    uiManager.applySettings(saveManager.getSettings());
    audioManager.setMusicMode("menu");
    const cards: LevelCardData[] = levelManager.getLevels().map((level) => {
      const best = saveManager.getLevelBest(level.id);
      return {
        id: level.id,
        order: level.order,
        name: level.name,
        brief: level.brief,
        locked: !saveManager.isLevelUnlocked(level.order),
        bestRank: best.bestRank,
        bestTimeMs: best.bestTimeMs
      };
    });

    uiManager.showLevelSelect(
      cards,
      (levelId) => {
        audioManager.playUi();
        this.scene.start(SCENE_KEYS.GAME, { levelId });
      },
      () => {
        audioManager.playUi();
        this.scene.start(SCENE_KEYS.MENU);
      }
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      uiManager.clearScreen();
    });
  }
}
