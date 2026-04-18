import Phaser from "phaser";
import type { Services } from "../types";
const KEY = "echo-heist.services";
export const setServices = (scene: Phaser.Scene, s: Services) => scene.game.registry.set(KEY, s);
export const getServices = (scene: Phaser.Scene): Services => {
  const s = scene.game.registry.get(KEY) as Services | undefined;
  if (!s) throw new Error("Game services not initialised.");
  return s;
};
