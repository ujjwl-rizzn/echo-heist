# ECHO HEIST

A short-form stealth game built for the browser.

You break into compact cyber-facility rooms, read the patrol patterns, crack a route, steal live memory payloads before Helix Ark erases them, and get out before the floor seals. The signature mechanic is the **Time Echo**: your recent movement replays as a holographic clone that can hold relay plates, trigger systems, and draw guard attention away from your real path.

The whole game is built around quick retries and clean execution. A good run feels deliberate and a little bit sneaky-smart.

---

## Stack

- Phaser 3 + TypeScript + Vite
- Desktop and mobile browser support
- Keyboard and touch controls
- Local save data via `localStorage`
- Runtime-generated art — no paid assets
- Web Audio synth — no audio files to download
- Optional rewarded-ad hooks (demo mode by default)

---

## Running locally

```bash
npm install
npm run dev
```

Open the address Vite prints in your terminal.

---

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrows | Left joystick |
| Interact / Hack | E, Space, Enter | Hack button |
| Deploy Echo | Q | Echo button |
| Stealth walk | Shift (hold) | Stealth button (hold) |
| Pause | Esc | Pause button |
| Restart room | R | — |

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Static — works on Vercel, Netlify, or GitHub Pages.

---

## Rewarded ads

The project ships in **demo mode** by default. The reward buttons work, the credit flow works, but no real ad is shown and no revenue is earned. Good for testing.

### Enabling live Google rewarded ads (Vercel)

1. Get a Google Ad Manager account and create a **rewarded out-of-page ad unit**.
2. In Vercel → your project → **Settings → Environment Variables**, add:
   - `VITE_REWARDED_AD_PROVIDER` = `google-gpt`
   - `VITE_GAM_REWARDED_AD_UNIT_PATH` = `/your-network-code/your-unit-name`
3. Set both variables for **Production** (keep `demo` in Preview if you want).
4. Redeploy.

That's it. The code already handles the Google Publisher Tag flow.

### Where credits appear

- **Main menu sponsor cache** — cooldown-limited, available before any run
- **Results screen boost** — one optional post-run bonus per clear

Both are optional. The room itself never has an ad wall.

---

## Validate levels

```bash
npm run validate:levels
```

Checks that every room is traversable, no guard patrols clip through walls, and no level can be skipped without using the echo mechanic.

---

## Project layout

```
src/
  main.ts
  style.css
  game/
    config.ts
    constants.ts
    types.ts
    data/         levels, cosmetics, settings
    managers/     Audio, Input, Level, RewardedAd, Save, UI
    scenes/       Boot, Preload, MainMenu, LevelSelect, Tutorial,
                  Game, Pause, Results, Settings
    utils/        services
scripts/
  validate-levels.mjs
```

---

## What each room teaches

| Room | New mechanic |
|------|-------------|
| Tutorial | Echo + relay plate basics |
| 01 Silent Switch | Switch timing, noise as a tool |
| 02 Ghost Relay | Echo holds door while you hack |
| 03 Optic Bloom | Camera blind-spot timing |
| 04 Crossfade | Split-tasking two channels at once |
| 05 Parallax Vault | Multi-step setup (lights → terminal → vault) |
| 06 Redline Garden | Two guards, staggered lasers |
| 07 Grand Theft Echo | Everything combined, final payload |
