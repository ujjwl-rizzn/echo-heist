import { markViewportMode } from "./game/utils/immersive";

export const bootGame = async (parent: string) => {
  const [{ default: Phaser }, { createGameConfig }] = await Promise.all([
    import("phaser"),
    import("./game/config")
  ]);

  const syncViewportMode = () => markViewportMode();
  syncViewportMode();
  window.addEventListener("resize", syncViewportMode, { passive: true });
  window.addEventListener("orientationchange", syncViewportMode, { passive: true });
  window.visualViewport?.addEventListener("resize", syncViewportMode);
  document.addEventListener("fullscreenchange", syncViewportMode);
  document.addEventListener("webkitfullscreenchange", syncViewportMode);

  const game = new Phaser.Game(createGameConfig(parent));
  window.addEventListener(
    "beforeunload",
    () => {
      window.removeEventListener("resize", syncViewportMode);
      window.removeEventListener("orientationchange", syncViewportMode);
      window.visualViewport?.removeEventListener("resize", syncViewportMode);
      document.removeEventListener("fullscreenchange", syncViewportMode);
      document.removeEventListener("webkitfullscreenchange", syncViewportMode);
      game.destroy(true);
    },
    { once: true }
  );
  return game;
};
