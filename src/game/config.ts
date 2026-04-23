import Phaser from "phaser";
import { WORLD } from "./constants";
import { BootScene }        from "./scenes/BootScene";
import { PreloadScene }     from "./scenes/PreloadScene";
import { MainMenuScene }    from "./scenes/MainMenuScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { TutorialScene }    from "./scenes/TutorialScene";
import { GameScene }        from "./scenes/GameScene";
import { PauseScene }       from "./scenes/PauseScene";
import { ResultsScene }     from "./scenes/ResultsScene";
import { SettingsScene }    from "./scenes/SettingsScene";

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width:  WORLD.WIDTH,
  height: WORLD.HEIGHT,
  backgroundColor: "#050611",
  scene: [BootScene,PreloadScene,MainMenuScene,LevelSelectScene,TutorialScene,GameScene,PauseScene,ResultsScene,SettingsScene],
  scale:  { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  physics: { default: "arcade", arcade: { debug: false } }
});
