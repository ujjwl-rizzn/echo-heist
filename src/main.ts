import Phaser from "phaser";
import "./style.css";
import { createGameConfig } from "./game/config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found.");

app.innerHTML = `
  <div id="app-shell" class="app-shell">
    <div id="game-root"  class="game-root"></div>
    <div id="ui-root"    class="ui-root" aria-live="polite">
      <div id="ui-screen-layer"   class="ui-layer ui-screen-layer"></div>
      <div id="ui-hud-layer"      class="ui-layer ui-hud-layer"></div>
      <div id="ui-controls-layer" class="ui-layer ui-controls-layer"></div>
    </div>
  </div>`;

const game = new Phaser.Game(createGameConfig("game-root"));
window.addEventListener("beforeunload", () => game.destroy(true));
