import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import { getServices } from "../utils/services";

export class MainMenuScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.MENU); }

  create(): void {
    const { saveManager, uiManager, audioManager, levelManager, rewardManager } = getServices(this);
    uiManager.clearHud();
    uiManager.applySettings(saveManager.getSettings());
    audioManager.setMusicMode("menu");
    void audioManager.prime();

    const levels = levelManager.getLevels().sort((a,b) => a.order - b.order);

    const render = (notice?: { tone: "info"|"success"|"warning"; text: string }) => {
      const save = saveManager.getData();
      const defaultId = levels[Math.min(save.unlockedLevelOrder, levels.length - 1)]?.id ?? levels[0]?.id ?? "tutorial-split";
      uiManager.showMainMenu(save, {
        onPlay:     () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.GAME, { levelId: defaultId }); },
        onLevels:   () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.LEVEL_SELECT); },
        onHow:      () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.TUTORIAL); },
        onSettings: () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.SETTINGS, { returnScene: SCENE_KEYS.MENU }); },
        onSponsorDrop: async () => {
          audioManager.playUi();
          const r = await rewardManager.claimMainMenuDrop();
          r.status === "granted" ? audioManager.playSuccess() : audioManager.playUi();
          render({ tone: r.status === "granted" ? "success" : r.status === "unavailable" ? "warning" : "info", text: r.message });
        }
      }, rewardManager.getMainMenuPanel(), notice);
    };

    render();
    this.drawBackdrop();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => uiManager.clearScreen());
  }

  private drawBackdrop(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width/2, height/2, width, height, 0x050611, 1).setDepth(-20);
    for (let i = 0; i < 16; i++) {
      const line = this.add.rectangle(
        Phaser.Math.Between(0, width), Phaser.Math.Between(0, height),
        Phaser.Math.Between(100, 240), 2,
        Phaser.Math.RND.pick([0x7ef6ff, 0xff3a88]), 0.14
      ).setAngle(Phaser.Math.Between(-35, 35)).setDepth(-10);
      this.tweens.add({ targets: line, alpha:{from:0.06,to:0.2}, duration:900+i*70, yoyo:true, repeat:-1 });
    }
  }
}
