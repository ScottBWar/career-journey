# Building an in-browser FF9-inspired game — architecture & roadmap

Status: planning / experimentation. This maps how to go from the current POC to a
real FF9-style game, and how much of the existing `career-journey` engine carries
over (most of it).

---

## 1. What "FF9-inspired" actually means (the three layers)

FF9 is not one renderer — it's three modes stitched together by a state machine:

1. **World map** — real-time 3D, free-roam traversal between locations.
2. **Field screens** — *pre-rendered 2D painting* + *real-time 3D characters* on
   top, fixed/scripted camera, walkmesh, gateways. (Towns, dungeons, interiors.)
3. **Battles** — separate arena, turn-based.
   Plus **menus**, **dialogue/cutscenes**, **save/progression**.

The painted field screen is the only piece you don't already have.

---

## 2. The key realization: you already have ~70% of this engine

`career-journey` maps onto FF9 almost 1:1:

| FF9 layer | What it needs | You already have |
|---|---|---|
| World map (real-time 3D) | free-roam traversal + location entries | **Sea** (`sea.js`) — sailing between islands |
| Field screens (painted) | plate + walkmesh + 3D chars + gateways | **NEW** — `Town`/`Dungeon` become this |
| Battles | turn-based combat | **Battle** (`battle.js`) — rich, keep as-is |
| Mode switching | scene state machine + transitions | `setMode()`, `transition()` (`main.js`) |
| Menus / HUD | party, gear, skills | existing menus + `updateHUD()` |
| Dialogue | NPC conversations | `Game.talk()` + dialogue UI |
| Save / progression | state, stats, leveling | `Progress` (derived, reward, save) |
| Audio | music/sfx per mode | `Music`, `SFX` |
| Transitions / FX | scene wipes | the blind/fade system just added |

**So the project is not a rewrite.** It's: (a) build a new `field` mode, (b) build
an asset + authoring pipeline to feed it, (c) migrate towns/dungeons from
real-time 3D scenes to painted fields, (d) keep Sea as the world map and Battle/
menus/save untouched.

---

## 3. Tech stack

- **Engine: Babylon.js** (already in use). It renders the 3D characters *and* can
  show the 2D plate (fullscreen layer / ortho quad / `Layer`). GLB loads natively.
  Reusing it keeps Battle, Sea, models, post-FX, and the mode manager intact.
- **No build step** — plain ES modules + a static file server, like the current
  game. Deploys as static files anywhere.
- **Content is data-driven** — fields, NPCs, items, story flags as JS/JSON data
  (you already do this with `Data.ISLANDS`, encounters, etc.).

---

## 4. The Field system (the heart — this is the new work)

A **field** = one painted screen you can walk around. Defined by data + assets:

```
field = {
  id: 'beach_town',
  plate: 'assets/fields/beach_town.png',   // the painting
  depth: 'assets/fields/beach_town.depth.png', // optional, for occlusion
  camera: { fov, pitch, yaw, pos },         // matched to the painting
  walk:   [ [...polygon], ... ],            // walkable area (walkmesh)
  occluders: [ {poly|depthThreshold}, ... ],// foreground "walk behind"
  gateways: [ {zone, to:'field_or_map', spawn} ], // exits → other fields
  npcs:   [ {id, pos, model, dialogue} ],
  triggers:[ {zone, event} ],               // cutscenes, save points, encounters
  encounter: 'enc_table_id',                // random battles on this field
  spawn:  {default, fromGateway:{...}}      // where the party appears
}
```

This is the POC's `fieldspec.json`, grown up. Everything else hangs off it.

### Rendering a field (Babylon)
1. **Plate** as the background — a fullscreen `Layer` or an ortho quad behind the
   3D camera.
2. **3D characters (GLB)** rendered with a camera whose projection **matches the
   painting** — this is what makes them sit *in* the scene (the FF9 trick).
3. **Occlusion** — two options:
   - *Authored* (start here): foreground occluder polygons; redraw those plate
     regions on top, or use cut-out foreground layers with a fixed draw order.
   - *Depth-based* (upgrade): a depth map (from Depth Anything) drives a real
     depth test, so the painting occludes characters per-pixel.
4. **Navigation** — character feet constrained to the walkmesh; gateway zones
   trigger a transition to the next field/world map.

### Camera matching (the precision problem)
- **Best:** generate the plate from your own gray **blockout** → camera + depth +
  walkmesh are *exact*, never guessed.
- **For AI plates:** calibrate by eye in the editor — drop a test cube, adjust
  FOV/pitch until it sits right, save those values into `field.camera`.

---

## 5. The authoring tool (do not skip this)

Hand-editing walkmesh JSON does not scale past a few screens. Build a small
**in-browser field editor** (its own page, Canvas/Babylon):

- Load a plate → draw/edit the **walkmesh** polygons (click to add points).
- Paint **occluder** regions.
- Place **gateways**, **NPC spawns**, **triggers**, the **spawn point**.
- **Calibrate the camera** with a live test model.
- **Export `field` JSON**.

This is the single biggest force-multiplier for content. Your POC's `G`-overlay is
the seed of it — turn it into an editable, exporting tool.

---

## 6. The asset pipeline (where Fal lives)

Offline generation → committed static assets (no runtime API calls):

1. **Backgrounds**
   - *Style-consistent set:* train a **FLUX LoRA** on FF9-style references, then
     text-to-image new screens (best for a whole town's worth). Or **nano banana
     / FLUX Redux / IP-Adapter** for one-offs.
   - *Layout control:* ControlNet-depth from a blockout so geometry/camera are known.
   - Lock a seed/style once you have a look; reuse across every screen for
     consistency (the genuinely hard part).
2. **Depth maps** — run each plate through Depth Anything for occlusion (and
   optional 2.5D parallax later).
3. **Characters** — rigged **GLB** models (party + NPCs) with idle/walk/etc.
   animations. Historically faithful (FF7/8/9 characters were 3D models).
4. Everything gets committed under `assets/`; the game ships static.

---

## 7. The mode state machine (the spine)

Extend the existing `setMode()`:

```
Title → WorldMap (Sea) ⇄ Field ⇄ Battle
                    ↘ Menu / Dialogue / Cutscene (overlays)
```

- WorldMap (Sea) ↔ Field: stepping onto a location enters its field; a field
  gateway can return you to the world map.
- Field/WorldMap → Battle: encounter tables (you already have `randomEncounter`).
- Battle → back to prior mode (already implemented via `onEnd` + `resume*`).
- Field → Field: gateways (new) — screen-to-screen, the FF9 town-walking feel.

---

## 8. Build-out roadmap (phases)

- **Phase 0 — POC (done).** Plate + walkmesh + occlusion + markers, 2D sprite.
- **Phase 1 — Field engine in Babylon.** Plate behind, **GLB** character on a
  matched camera, walkmesh nav, occlusion (authored), and **two plates linked by
  a gateway** so you can walk screen→screen. *Milestone: walk between 2 painted
  rooms with a real 3D character.*
- **Phase 2 — Field editor.** Author walkmesh/occluders/gateways/camera in-browser,
  export JSON. *Milestone: build a field without touching code.*
- **Phase 3 — Asset pipeline.** Decide style approach (LoRA vs nano banana),
  generate a consistent plate set + depth maps. *Milestone: a stylistically
  consistent town's worth of screens.*
- **Phase 4 — System integration.** Wire fields into the mode manager beside Sea
  and Battle; encounters, NPCs/dialogue, save points on fields.
- **Phase 5 — Vertical slice.** One painted town + one painted dungeon + world-map
  link + a battle + one story beat, end to end.
- **Phase 6 — Content + polish.** Scale screens; depth-based occlusion; 2.5D
  parallax; menu/UI pass.

---

## 9. Hard parts / risks (eyes open)

- **Style consistency across many plates** — the #1 risk. Mitigate with a LoRA +
  locked seed; budget curation time.
- **Camera matching for AI plates** — mitigate with the blockout route or the
  editor's calibration mode.
- **Walkmesh authoring at scale** — mitigate with the editor; consider
  auto-deriving a draft from depth + a VLM pass, then hand-fix.
- **Asset volume** — FF9 had thousands of screens (a studio). Scope to a small,
  dense world; lean on the world map (Sea) for traversal so you need fewer fields.
- **Occlusion fidelity** — authored polygons are coarse; depth maps fix it but add
  a pipeline step.

---

## 10. The smallest next step

Phase 1, minimal: in a Babylon scene, show `beach_town.png` as the backdrop, load
a placeholder GLB (or a primitive) as the character on a hand-tuned camera, reuse
the POC's walkmesh + gateway logic, and link it to a *second* plate. That single
milestone proves the real (3D-character) version of the technique and becomes the
skeleton everything else plugs into.
