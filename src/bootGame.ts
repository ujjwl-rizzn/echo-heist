export const bootGame = async (parent: string) => {
  const [{ default: Phaser }, { createGameConfig }] = await Promise.all([
    import("phaser"),
    import("./game/config")
  ]);

  const game = new Phaser.Game(createGameConfig(parent));
  window.addEventListener("beforeunload", () => game.destroy(true), { once: true });
  return game;
};
