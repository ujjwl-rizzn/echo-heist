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

    const { uiManager, audioManager, rewardManager } = getServices(this);
    audioManager.setMusicMode("result");
    let rewardClaimed = false;

    const render = (message?: { tone: "info" | "success" | "warning"; text: string }): void => {
      uiManager.showResults(
        result,
        {
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
          },
          onSponsorBoost: rewardClaimed
            ? undefined
            : async () => {
                audioManager.playUi();
                const reward = await rewardManager.claimResultBoost(result);
                if (reward.status === "granted") {
                  rewardClaimed = true;
                  audioManager.playSuccess();
                } else {
                  audioManager.playUi();
                }
                render({
                  tone: reward.status === "granted" ? "success" : reward.status === "unavailable" ? "warning" : "info",
                  text:
                    reward.status === "granted"
                      ? `${reward.message} Total credits: ${reward.totalCredits}.`
                      : reward.message
                });
              }
        },
        rewardManager.getResultPanel(result, rewardClaimed),
        message
      );
    };

    render();
  }
}
