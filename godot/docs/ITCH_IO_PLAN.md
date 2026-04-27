# itch.io Shipping Plan

## Target

Ship ECHO HEIST Reborn as an itch.io browser game first.

The upload should be a ZIP containing an `index.html` file and all export files. itch.io hosts HTML5 games inside an iframe, so the project must use relative asset paths and stay lightweight.

## Build Strategy

1. Build in Godot 4 with GDScript.
2. Use Compatibility rendering for broader web/mobile support.
3. Export HTML5/Web build.
4. ZIP the exported files.
5. Upload to itch.io as an HTML game.
6. Enable mobile-friendly display if the controls pass phone testing.

## Constraints To Respect

- Keep files and asset paths case-safe.
- Avoid huge uncompressed assets.
- Use relative paths.
- Test in a local browser server before uploading.
- Design portrait and landscape mobile layouts early.

## Later

After the browser version works:

- Add downloadable Windows build.
- Add Android build if the controls feel strong.
- Add itch.io page art, screenshots, trailer GIF, and devlog.

