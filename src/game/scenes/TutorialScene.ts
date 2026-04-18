import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import { getServices } from "../utils/services";

export class TutorialScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.TUTORIAL); }
  create(): void {
    const { uiManager, audioManager } = getServices(this);
    audioManager.setMusicMode("menu");
    uiManager.showHowToPlay({
      onBack:     () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.MENU); },
      onTutorial: () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.GAME, { levelId:"tutorial-split" }); }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => uiManager.clearScreen());
  }
}
