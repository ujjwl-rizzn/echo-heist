# How To Play The Reboot Prototype

This prototype is a Godot project, not the old Vite/Phaser web build.

## Install Godot

Godot 4.6.2 has been installed on this PC with Winget.

If you ever need to reinstall it, install **Godot 4** from one of these:

- Microsoft Store
- Steam
- Godot website
- Winget command:

```powershell
winget install --id GodotEngine.GodotEngine -e
```

After installing, open Godot and import:

```text
C:\Users\ujjwa\Documents\New project\repo-sync\godot\project.godot
```

Then press **Play** in Godot.

## Play The Exported Website Locally

Run:

```powershell
cd "C:\Users\ujjwa\Documents\New project\repo-sync\godot"
.\start-local-server.ps1
```

Open:

```text
http://127.0.0.1:8787/index.html
```

## Controls

Keyboard:

- `WASD` or arrow keys: move
- `Shift`: sprint
- `1`: choose Government Spy route
- `2`: choose Criminal Heister route
- `Space` or `E`: gadget/hack
- `F`: fight/takedown
- `X`: spy tranq shot or heister gunshot
- `Q`: steal or escape
- `Esc`: pause/resume
- `N`: next job after clearing a mission
- `R`: restart

On-screen buttons:

- `SPY`: clean tactical route
- `HEISTER`: risky profit route
- `GADGET`: hack security if standing in the blue lane
- `FIGHT`: disable a nearby guard
- `SHOT`: ranged tranq/gun action
- `STEAL/EXIT`: steal the archive core or escape through the red lift
- Virtual stick: drag to move on touch screens

## Win Condition

1. Pick spy or heister.
2. Move into the archive platform.
3. Press `STEAL/EXIT` or `Q` to steal the core.
4. Reach the red escape lift.
5. Press `STEAL/EXIT` or `Q` again to escape.

## Fail Condition

Guards can detect you. Detection raises heat and damages HP. If HP reaches zero, restart and route cleaner.

## Current Status

This is a playable vertical slice, not the final commercial game.

Done:

- 2.5D cinematic stage
- Spy/heister route switching
- Player movement
- Hack zone
- Archive steal target
- Escape lift
- Patrolling guards
- Vision detection
- Heat and HP
- Fight/takedown action
- Top HUD and bottom command deck
- Draggable virtual stick
- Three mission layouts
- Vault hack puzzle gating
- Spy tranq shot / heister gunshot action
- Ammo
- Pause/debrief overlay
- Next-job flow
- Save data for best score
- Simple audio feedback

Still needed:

- Hand-made art and animation
- Full settings menu
- More levels beyond the current three
- Deeper combat and stealth puzzles
- Real music and polished SFX
- Final itch.io upload
- Full campaign progression

Partly done:

- Art is procedural placeholder art.
- Pause exists as an overlay, not a full settings menu.
- Combat and stealth puzzles are playable, but still prototype-depth.
- Audio exists as simple generated beeps.
- Save data tracks best score, not full campaign progression.
