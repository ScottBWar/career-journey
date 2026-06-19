# captures/ — Claude's eyes on the game

This folder is how Claude *sees* the game. Claude can't run a browser in its
sandbox, but it **can read PNGs committed here**, so we render on your machine
and push the results.

## One-time setup (your machine)
```bash
npm install
npx playwright install chromium
```

## Each time you want Claude to "look"
```bash
npm run capture
```
That headlessly opens `game.html`, drives the game into ~17 key states
(overworlds, themed towns, dungeons, battles, a boss, a cinematic, menus, the
Coliseum), screenshots each into `captures/latest/`, records any JS errors + a
game-state snapshot into `REPORT.md` / `REPORT.json`, then **commits & pushes**
automatically. Then just tell Claude: *"new captures are up."*

- Skip the auto-push: `CAPTURE_NO_PUSH=1 npm run capture`
- Everything lands in `captures/latest/` (overwritten each run).

## What Claude does with it
Reads `REPORT.md` first (JS errors = top priority), then opens each `*.png`,
looks for layout/clipping/theme/framing/UI problems, checks the state snapshot,
and files concrete fixes — a real see → fix → repeat loop.
