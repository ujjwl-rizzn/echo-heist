import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";
import type { LevelResult } from "../types";
import { getServices } from "../utils/services";

export class ResultsScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.RESULTS); }

  create(data: { result?:LevelResult } | undefined): void {
    const result = data?.result;
    if (!result) { this.scene.start(SCENE_KEYS.MENU); return; }

    const { uiManager, audioManager, rewardManager, saveManager } = getServices(this);
    audioManager.setMusicMode("result");
    let rewardClaimed = false;

    /* check if all 8 levels are now complete */
    const save = saveManager.getData();
    const allDone = Object.values(save.levels).filter(l => l.completed).length >= 8;

    const render = (notice?: { tone:"info"|"success"|"warning"; text:string }) => {
      uiManager.showResults(
        result,
        {
          onRetry:  () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.GAME, { levelId:result.levelId }); },
          onNext:   result.nextLevelId
            ? () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.GAME, { levelId:result.nextLevelId }); }
            : null,
          onLevels: () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.LEVEL_SELECT); },
          onMenu:   () => { audioManager.playUi(); this.scene.start(SCENE_KEYS.MENU); },
          onSponsorBoost: rewardClaimed ? undefined : async () => {
            audioManager.playUi();
            const r = await rewardManager.claimResultBoost(result);
            if (r.status === "granted") { rewardClaimed = true; audioManager.playSuccess(); }
            render({
              tone: r.status==="granted"?"success":r.status==="unavailable"?"warning":"info",
              text: r.status==="granted" ? `${r.message} Total: ${r.totalCredits} credits.` : r.message
            });
          }
        },
        rewardManager.getResultPanel(result, rewardClaimed),
        allDone && !result.nextLevelId
          ? { tone:"success", text:"All 8 payloads recovered. The Eidolon Charter is exposed. Helix Ark can't rewrite the city now." }
          : notice
      );
    };

    render();
  }
}
