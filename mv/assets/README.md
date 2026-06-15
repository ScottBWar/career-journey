# Assets — drop your art/audio here

The game loads these if present and falls back to procedural placeholders if not.
So you can add them incrementally (one file at a time) and the game keeps running.

## Filenames the game looks for (see `mv/js/game.js` → ASSETS)

| File | What it is | Suggested size |
|------|------------|----------------|
| `sprites/player.png` | Hero spritesheet, 6 frames laid out horizontally (idle = frame 0, run = 1–4) | 6 × 64px wide, ~80px tall, transparent bg |
| `sprites/tiles.png`  | One ground tile (tiled across terrain) | 48 × 48px |
| `bg/sky.png`         | Farthest parallax layer (sky) | 1920 × 1080, seamless horizontally |
| `bg/far.png`         | Mid parallax (hills/cliffs), transparent | 1920 × 1080 |
| `bg/near.png`        | Near parallax (pillars/foreground silhouettes), transparent | 1920 × 1080 |
| `audio/explore.mp3`  | Looping ambient track | — |

**Greeter assets:** drop them in `sprites/` and tell me the filename + frame layout — I'll wire them into the manifest.

## Generate art automatically
`FAL_KEY=... node tools/generate.mjs` (see `tools/generate.mjs`) calls fal.ai and writes
the background/sprite files straight into these folders.
