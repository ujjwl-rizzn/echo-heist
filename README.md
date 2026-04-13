# ECHO HEIST

ECHO HEIST is a short-form stealth heist game built for the browser.

You break into compact cyber-facility rooms, read patrol patterns, crack open a route, steal live memory payloads before Helix Ark can erase them, and get out before the place seals behind you. The signature mechanic is the Time Echo: every few seconds your recent movement becomes a holographic clone that can replay your route, trigger systems, and buy you the opening you need.

The whole game is built around quick retries and clean execution. A good run should feel sharp, deliberate, and a little bit sneaky-smart.

## What's in the project

- Phaser 3 + TypeScript + Vite
- desktop and mobile browser support
- keyboard and touch controls
- local save data with `localStorage`
- runtime-generated art, no paid assets required
- synth-style audio generated in code
- level-based structure with replayable score chasing
- a light narrative frame about recovering proof before the city archive is rewritten

## Core idea

This is not an endless survival game and it is not a shooter wearing neon paint.

The fun comes from planning a route, printing a useful echo, creating a temporary breach, and turning a dangerous room into a solvable timing problem. The player is strongest when they think one step ahead, and each stolen payload should feel like it matters.

## Running it locally

You need Node.js installed first.

```bash
npm install
npm run dev
```

Vite will print a local address in the terminal. Open that address in your browser to play.

## Production build

```bash
npm run build
```

The final web build is written to `dist/`.

If you want to sanity-check the production build locally:

```bash
npm run preview
```

## Controls

### Desktop

- `WASD` or arrow keys: move
- `Shift`: stealth walk
- `E`, `Space`, or `Enter`: interact
- `Q`: deploy Time Echo
- `Esc`: pause
- `R`: restart room

### Mobile

- left joystick: move
- `Hack`: interact
- `Echo`: deploy Time Echo
- `Stealth`: hold for quiet movement
- `Pause`: open the pause menu

## Hosting

This project is static after build, so it works well on free hosts.

### Vercel

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Use:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`

### Netlify

1. Run `npm run build`
2. Upload the `dist` folder, or connect the GitHub repo
3. Set the publish directory to `dist`

### GitHub Pages

Use the built `dist` output with a Pages workflow or another static publish flow.

## Project structure

```text
src/
  main.ts
  style.css
  game/
    config.ts
    constants.ts
    types.ts
    data/
      levels.ts
      cosmetics.ts
      settings.ts
    managers/
      AudioManager.ts
      InputManager.ts
      LevelManager.ts
      SaveManager.ts
      UIManager.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      MainMenuScene.ts
      LevelSelectScene.ts
      TutorialScene.ts
      GameScene.ts
      PauseScene.ts
      ResultsScene.ts
      SettingsScene.ts
    utils/
```

## Design notes

- Levels are data-driven so it stays easy to add or rebalance rooms.
- The HUD lives in the DOM to keep text crisp and responsive across phone, tablet, and desktop.
- The world art is generated at runtime to keep the project light and portable.
- Audio uses Web Audio synth tones instead of a downloaded asset pack.
- Save data stores progress, best ranks, credits, and settings in the browser.
- `npm run validate:levels` checks that authored breach rooms are actually traversable and that the tutorial cannot be bypassed before opening the relay.

## A good next step if you keep expanding it

- deeper guard suspicion and search behavior
- bespoke set-piece heist rooms
- more cosmetic unlocks
- daily challenge rooms
- better post-run mastery stats

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build production files
- `npm run preview` - preview the built site locally
- `npm run validate:levels` - validate the authored room flow

## License / usage

This project currently ships as a self-contained indie web game prototype/codebase. Add your own license if you plan to publish or open-source it publicly.
