import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import type { LevelCardData } from "../types";
import { getServices } from "../utils/services";

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.LEVEL_SELECT); }
  create(): void {
    const { levelManager, saveManager, uiManager, audioManager } = getServices(this);
    uiManager.applySettings(saveManager.getSettings());
    audioManager.setMusicMode("menu");
    const cards: LevelCardData[] = levelManager.getLevels().map(lv => {
      const best = saveManager.getLevelBest(lv.id);
      return { id:lv.id, order:lv.order, name:lv.name, brief:lv.brief,
               locked:!saveManager.isLevelUnlocked(lv.order),
               bestRank:best.bestRank, bestTimeMs:best.bestTimeMs };
    });
    uiManager.showLevelSelect(cards,
      id => { audioManager.playUi(); this.scene.start(SCENE_KEYS.GAME, { levelId:id }); },
      ()  => { audioManager.playUi(); this.scene.start(SCENE_KEYS.MENU); }
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => uiManager.clearScreen());
  }
}
