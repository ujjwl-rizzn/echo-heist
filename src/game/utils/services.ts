import Phaser from "phaser";
import type { Services } from "../types";

const KEY = "echo-heist.services";

export const setServices = (scene: Phaser.Scene, services: Services): void => {
  scene.game.registry.set(KEY, services);
};

export const getServices = (scene: Phaser.Scene): Services => {
  const services = scene.game.registry.get(KEY) as Services | undefined;
  if (!services) {
    throw new Error("Game services are not initialized.");
  }
  return services;
};
