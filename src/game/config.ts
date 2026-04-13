import Phaser from "phaser";
import { WORLD } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { PauseScene } from "./scenes/PauseScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { TutorialScene } from "./scenes/TutorialScene";

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: WORLD.WIDTH,
  height: WORLD.HEIGHT,
  backgroundColor: "#050611",
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelSelectScene,
    TutorialScene,
    GameScene,
    PauseScene,
    ResultsScene,
    SettingsScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    roundPixels: false
  }
});
