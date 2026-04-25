import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  css: read("src/style.css"),
  immersive: read("src/game/utils/immersive.ts"),
  input: read("src/game/managers/InputManager.ts"),
  ui: read("src/game/managers/UIManager.ts"),
  game: read("src/game/scenes/GameScene.ts")
};

const checks = [
  ["compact touch shell CSS", files.css.includes(".app-shell[data-compact-touch]")],
  ["immersive fallback attribute", files.immersive.includes("data-immersive-fallback")],
  ["fullscreen request helper", files.immersive.includes("requestImmersiveMode")],
  ["DOM field hint overlay", files.css.includes(".field-hint") && files.ui.includes("data-field-hint")],
  ["DOM field banner overlay", files.css.includes(".field-banner") && files.ui.includes("showFieldBanner")],
  ["DOM alarm flash overlay", files.css.includes(".field-flash") && files.game.includes("setFieldAlarm")],
  ["actual joystick radius", files.input.includes("getBoundingClientRect") && files.input.includes("touchRadius")],
  ["phone command deck", files.css.includes("--phone-deck") && files.css.includes(".touch-button--pause")],
  ["reserved phone camera viewport", files.game.includes("phoneViewportChrome") && files.game.includes("cam.setViewport")],
  ["mobile hint copy", files.game.includes("Tap Hack") && files.game.includes("tap Echo")],
  ["reduced motion data attribute", files.css.includes("data-reduced-motion") && files.ui.includes("data-reduced-motion")],
  ["phone portrait camera branch", files.game.includes("phonePortrait") && files.game.includes("tabletPortrait")]
];

let failed = false;
for (const [name, ok] of checks) {
  if (ok) {
    console.log(`pass ${name}`);
  } else {
    failed = true;
    console.error(`FAIL ${name}`);
  }
}

if (failed) {
  console.error("\nViewport contract smoke failed.");
  process.exit(1);
}

console.log(`\nAll ${checks.length} viewport contracts passed.`);
