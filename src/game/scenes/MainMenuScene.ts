import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import { getServices } from "../utils/services";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    const { saveManager, uiManager, audioManager, levelManager, rewardManager } = getServices(this);
    uiManager.clearHud();
    uiManager.applySettings(saveManager.getSettings());
    audioManager.setMusicMode("menu");
    void audioManager.prime();
    const orderedLevels = levelManager.getLevels().sort((a, b) => a.order - b.order);

    const openTutorial = (): void => {
      audioManager.playUi();
      this.scene.start(SCENE_KEYS.TUTORIAL);
    };

    const render = (message?: { tone: "info" | "success" | "warning"; text: string }): void => {
      const saveData = saveManager.getData();
      const defaultLevel =
        orderedLevels[Math.min(saveData.unlockedLevelOrder, orderedLevels.length - 1)]?.id ??
        orderedLevels[0]?.id ??
        "tutorial-split";

      uiManager.showMainMenu(
        saveData,
        {
          onPlay: () => {
            audioManager.playUi();
            this.scene.start(SCENE_KEYS.GAME, { levelId: defaultLevel });
          },
          onLevels: () => {
            audioManager.playUi();
            this.scene.start(SCENE_KEYS.LEVEL_SELECT);
          },
          onHow: openTutorial,
          onSettings: () => {
            audioManager.playUi();
            this.scene.start(SCENE_KEYS.SETTINGS, { returnScene: SCENE_KEYS.MENU });
          },
          onSponsorDrop: async () => {
            audioManager.playUi();
            const reward = await rewardManager.claimMainMenuDrop();
            if (reward.status === "granted") {
              audioManager.playSuccess();
            } else {
              audioManager.playUi();
            }
            render({
              tone: reward.status === "granted" ? "success" : reward.status === "unavailable" ? "warning" : "info",
              text: reward.message
            });
          }
        },
        rewardManager.getMainMenuPanel(),
        message
      );
    };

    render();

    this.drawBackdrop();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      uiManager.clearScreen();
    });
  }

  private drawBackdrop(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x050611, 1).setDepth(-20);
    for (let i = 0; i < 18; i += 1) {
      const line = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(120, 260),
        2,
        Phaser.Math.RND.pick([0x7ef6ff, 0xff3a88]),
        0.18
      );
      line.setAngle(Phaser.Math.Between(-35, 35)).setDepth(-10);
      this.tweens.add({
        targets: line,
        alpha: { from: 0.06, to: 0.22 },
        duration: 1000 + i * 60,
        yoyo: true,
        repeat: -1
      });
    }
  }
}
