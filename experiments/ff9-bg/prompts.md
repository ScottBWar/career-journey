# Fal prompt — FF9-style beach town field background

Goal: take an FF9 town reference image and generate a **beach / port town** in the
same pre-rendered-diorama style *and* the same "field map" compositional logic
(high 3/4 camera, foreground occluders, open walkable plaza, clear exits) so it
stays compatible with the walkmesh / occluder pipeline.

## Primary prompt (paste into `prompt`)

> Pre-rendered CGI background in the style of a classic late-1990s JRPG field
> screen (Final Fantasy IX), a handcrafted miniature diorama of a cozy seaside
> fishing and pirate village. High-angle three-quarter isometric view,
> near-orthographic with slight perspective, camera looking down at about 50
> degrees. Weathered half-timbered Tudor-fantasy cottages with steep terracotta
> clay-tiled roofs, crooked chimneys and timber balconies, clustered around a
> sandy cobblestone harbor plaza. Wooden docks and jetties on stilts reaching
> over calm turquoise shallows; small fishing boats and rowboats moored; draped
> fishing nets, barrels, crates of fish and oyster pearls, coiled rope, lobster
> pots, hanging lanterns; colorful pennant banners strung between rooftops. Pale
> golden sand meeting a gentle tide line, scattered seashells, driftwood and
> dune grass, a couple of leaning palms. Warm golden-hour sunlight, soft global
> illumination, gentle ambient occlusion, long cozy shadows, rich saturated
> storybook palette, intricate hand-painted texture detail. Foreground rooftops
> and a dock post framing the lower edge as occluders; an open walkable plaza in
> the center; a stone archway exit on the right and weathered steps climbing to a
> lighthouse on the left. Painterly, warm, whimsical, highly detailed.
> Empty scene, no characters, no people, no text, no UI overlay.

## Negative prompt / avoid

> photography, photorealistic, modern, flat lighting, harsh midday sun, top-down
> 90-degree orthographic, fisheye, lens flare, blurry, low detail, text,
> watermark, signage text, UI, HUD, characters, people, crowds, anime line art,
> flat cel shading, neon, oversaturated, washed out

(Keep "no people / no text" — field plates are empty; the 3D characters and any
signage get composited at runtime.)

## How to pair the FF9 reference (two routes)

**A) Style match, new content (what you asked for).** Use an image-prompt /
style-reference endpoint so the *look* comes from the FF9 ref and the *content*
comes from the prompt:
- `fal-ai/flux-pro/v1.1/redux` or `fal-ai/flux/redux` (image variation + prompt), or
- `fal-ai/ip-adapter` (style adapter) on a FLUX/SDXL base.
- Pass the FF9 town image as the style/image input.
- **image_prompt_strength ≈ 0.35–0.55** — high enough to inherit the painterly
  diorama look, low enough that the beach content from the prompt wins. If the
  output looks too much like the original town, lower it; too generic, raise it.

**B) Style + layout control (the robust route from our discussion).** If you also
want to *own the geometry* so the walkmesh/depth/camera come out exact:
1. Make a gray blockout of the beach town (massing only).
2. Render a depth or canny pass from it.
3. `fal-ai/flux-controlnet` (depth/canny) with this prompt + the FF9 image as
   style reference. ControlNet locks the layout to your blockout; the prompt +
   style ref paint it FF9.
This is the version where you never have to *guess* camera/depth later.

## Settings

- **Aspect ratio:** `16:9` for an establishing plaza; `21:9` for a wide panoramic
  field like the town-square ref; `4:3` for a tighter screen; portrait `3:4` for
  an enclosed courtyard/interior.
- **Steps:** 30–40. **Guidance:** ~3.5 (FLUX dev) / model default.
- **Resolution:** generate large (e.g. 1536×864) — these read as detailed plates.
- Generate 4 and curate; consistency across screens is the hard part, so lock a
  seed once you find a look you like and reuse it across the whole town set.

## Variants (swap into the prompt)

- Time of day: `cool blue dawn over the water` / `lantern-lit dusk, warm window
  glow` / `overcast misty morning`.
- Vibe: `bustling market harbor with stalls` / `quiet sleepy fishing hamlet` /
  `weathered pirate cove with a shipwreck hull`.
- Anchor landmark (gives the screen a clear exit/marker): `a lighthouse`,
  `a temple on the cliff`, `a tavern with a swinging sign`, `a harbor gate`.
