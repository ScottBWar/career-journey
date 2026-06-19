# Character portraits

The in-game portraits are **procedural placeholders** drawn in code
(`js/portraits.js`). They're meant to be replaced with real art.

## Replacing a placeholder with your own art

1. Generate / commission a portrait (e.g. on Fal) — a square PNG, ideally
   256×256 or larger. Keep the **background** simple (dark/solid) so it sits
   well in the in-game frames.
2. Drop the file in this folder, e.g. `assets/portraits/marina.png`.
3. Register it in `js/portraits.js` in the `ART` map, keyed by the character's
   SPEC key:

   ```js
   const ART = {
     healer: 'marina.png',
     pirate: 'redbeard.png',
     // ...
   };
   ```

That's it — `Portraits.url()` returns the file path for any registered key and
falls back to the procedural placeholder for everyone else. No other code
changes needed.

## Character → SPEC key reference

| Key         | Character / role                    |
|-------------|-------------------------------------|
| `pirate`    | Redbeard (captain)                  |
| `swordsman` | Lance                               |
| `healer`    | Marina                              |
| `ruffy`     | rival duelist                       |
| `simon`     | hunter                              |
| `aladdin`   | street rat                          |
| `violca`    | archer                              |
| `mac`       | survivor                            |
| `sane`      | wolf-girl                           |
| `quijano`   | knight                              |
| `selachoth` | shark villain                       |
| `vampire`   | vampire lord                        |
| `genie`     | genie                               |
| `drifter`   | drifter                             |
| `ember`     | mermaid — Fire                      |
| `nerida`    | mermaid — Water                     |
| `volta`     | mermaid — Thunder                   |
| `gaia`      | mermaid — Earth                     |
| `nyx`       | mermaid — Dark                      |
| `lumina`    | mermaid — Light                     |

(See the full `SPEC` table at the top of `js/portraits.js` for every key,
including enemies/monsters.)

## Note

The placeholders are original procedural art. Any replacement art you add here
must be art you created or have the rights to use — don't drop in assets ripped
from other games.
