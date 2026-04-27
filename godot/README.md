# ECHO HEIST Reborn

This is the editable Godot source for the full reboot of **ECHO HEIST**.

This folder lives inside `repo-sync`, which is the same GitHub/Vercel/AdSense project folder. The exported web build is served from the repo root and mirrored in `dist`.

- **Government spy:** precise, clean, tactical, evidence-driven.
- **Criminal heister:** stylish, risky, brutal, profit-driven.

The goal is not to reskin the old game. The goal is to build a sharper game where stealing, escaping, fighting, gadgets, disguise, and brain-based heist choices all matter.

## Current Direction

- Engine target: Godot 4.
- Language target: GDScript.
- Platform target: itch.io HTML5 first, downloadable builds later.
- View target: 2.5D cinematic stage view, not flat side-view.
- Design target: mobile-friendly from day one, with keyboard/gamepad support after.

## First Prototype Goal

Build one short vertical slice:

1. Choose spy or heister.
2. Enter a secure virtual facility.
3. Steal a data core or black-market asset.
4. Solve one route puzzle.
5. Fight or avoid one guard encounter.
6. Escape before heat locks the sector.

## How To Play

See `HOW_TO_PLAY.md`.

Short version:

1. Install Godot 4.
2. Open `project.godot`.
3. Press Play.

## Choice Workflow

Codex will ask small checkpoint questions with options. Each option includes what changes if selected. Once you choose, work continues from that direction.
