import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replace(/\\/g, "/");
          if (path.includes("/node_modules/phaser/")) return "phaser";
          if (path.includes("/src/game/scenes/")) return "game-scenes";
          if (path.includes("/src/game/managers/")) return "game-managers";
          if (path.includes("/src/game/data/")) return "game-data";
        }
      }
    }
  }
});
