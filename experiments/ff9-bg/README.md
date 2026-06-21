# FF9-style field-map POC — beach town

A proof-of-concept of the Final Fantasy IX "field screen" technique on the
AI-generated beach-town backdrop: a **pre-rendered painting** with a **3D-ish
character composited on top**, constrained to a **walkmesh**, drawn **behind
foreground occluders**, with shimmering **exit markers**.

Pure Canvas 2D — no engine, no dependencies, no network.

## Run it

The backdrop is loaded as an image, so most browsers need a local server
(opening `index.html` directly via `file://` works in some browsers but not all):

```bash
cd experiments/ff9-bg
npx serve            # or: python3 -m http.server 8080
```

Then open the printed URL.

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | move the pirate |
| F | interact with the nearest marker |
| G | toggle the field-logic overlay (walkmesh / occluders / marker radii) |

## What it demonstrates

- **Walkmesh** — the pirate can only stand on the plaza, beach, and dock; the
  water and buildings are blocked. He slides along boundaries instead of sticking.
- **Occlusion** — walk down toward the bottom and he passes *behind* the
  foreground rooftop / dock piling, because those are re-stamped from the backdrop
  on top of him. That's exactly how FF9 faked depth without 3D scenery.
- **Markers** — glints at the lighthouse path, town gate, tavern, and docks;
  proximity shows a prompt, F triggers the action (where `toSea()` etc. would fire).

## The honest caveats (see the chat thread)

- The walkmesh/occluder/marker coords are an **eyeballed first draft** in
  `app.js` (`SPEC`, normalized 0..1). Press **G** and tune the polygons.
- There's **no true camera or depth** here — the pirate is a flat sprite scaled
  by hand. For real 3D characters you'd run depth estimation on the plate (or,
  better, render the plate from your own blockout so depth/camera are exact).

## Files

- `index.html` — shell + HUD
- `app.js` — loop, walkmesh, occlusion, markers, the pirate (drawn in code)
- `assets/beach-town.png` — the Fal/nano-banana backdrop
- `refs/`, `prompts.md` — earlier annotation + prompt artifacts
