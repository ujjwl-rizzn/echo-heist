# Build Status

## Implemented In Runtime

- Godot 4 HTML5 project configuration.
- Autoload architecture: EventBus, GameState, SaveManager, DADS, ScoreManager, StoryManager, ItemManager, AudioManager.
- Data-driven 10-level spy path and 10-level crime path catalog.
- Main menu and continue flow.
- Spy/Crime path selection.
- Procedural level stage with hack zone, target zone, exit zone, shadows, patrol guards.
- Player movement, sprint, crouch, shadow visibility.
- Guard AI state machine: patrol, suspicious, investigate, alert, calling backup, search, stunned.
- DADS tier parameters applied to guards.
- Functional variants for all six mini-game types plus co-op hack as sequence puzzles.
- Level completion, failure, score, rank, credits, item unlocks.
- Story flags and ending determination.
- Mobile virtual stick and action buttons.
- Web export preset.
- AdSense account meta injected into exported Web `index.html`.
- Supabase schema file for future leaderboard/cloud save setup.
- GitHub Actions Web export workflow draft.

## Still Not Full Production Content

- Pixel-art sprites are not hand-drawn yet; visuals are procedural placeholders.
- Tilemaps are not authored per level yet; the 20 levels use data-driven procedural spaces.
- Mini-games are functional sequence variants, not the final bespoke drag/dial/wave UI versions.
- Supabase is not connected until a real project URL and anon key are added.
- Vercel live site is not replaced/pushed automatically from this folder.
- itch.io upload is packaged/export-ready, but not uploaded by Codex without explicit final confirmation.

## Protected Live Site Info

- Original Vercel site: https://echo-heist-jet.vercel.app
- AdSense meta: `<meta name="google-adsense-account" content="ca-pub-6967018953057648">`
