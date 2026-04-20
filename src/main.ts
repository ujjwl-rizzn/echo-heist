import "./style.css";

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

void import("./bootGame").then(({ bootGame }) => bootGame("game-root"));
