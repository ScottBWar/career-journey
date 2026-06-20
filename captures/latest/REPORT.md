# Capture report — 2026-06-20T04:26:24.465Z

## JS errors: 0
_none — no runtime errors caught_

## States captured (38)
- ✅ `01_overworld_tidehaven.png`
- ✅ `02_overworld_paegina.png`
- ✅ `03_overworld_duskmoor.png`
- ✅ `04_sea.png`
- ✅ `05_town_tidehaven.png`
- ✅ `06_town_argo_greek.png`
- ✅ `07_town_bazaar.png`
- ✅ `08_dungeon_tidecave.png`
- ✅ `09_dungeon_castle.png`
- ✅ `10_battle_mobs.png`
- ✅ `11_battle_boss_kraken.png`
- ✅ `12_battle_greek_medusa.png`
- ✅ `13_cutscene_council.png`
- ✅ `14_cutscene_opening.png`
- ✅ `15_menu_gear.png`
- ✅ `16_menu_skills.png`
- ✅ `17_coliseum.png`
- ✅ `18_overworld_pots.png`
- ✅ `19_overworld_swing.png`
- ✅ `20_dungeon_traps.png`
- ✅ `21_dungeon_alcove.png`
- ✅ `22_gallery_party1.png`
- ✅ `23_gallery_party2.png`
- ✅ `24_gallery_party3.png`
- ✅ `25_gallery_mobs.png`
- ✅ `26_gallery_bosses.png`
- ✅ `27_gallery_bosses2.png`
- ✅ `28_gallery_dunmobs.png`
- ✅ `29_gallery_omega.png`
- ✅ `30_gallery_mermaids.png`
- ✅ `31_battle_ruffy.png`
- ✅ `32_battle_omega.png`
- ✅ `33_battle_sentinel.png`
- ✅ `34_cutscene_reactor.png`
- ✅ `35_dungeon_npc.png`
- ✅ `36_date_mermaid.png`
- ✅ `37_summon_mermaid.png`
- ✅ `38_portraits.png`

## Game-state snapshot
```json
{
  "gold": 93,
  "pearls": 0,
  "active": [
    "pirate",
    "swordsman",
    "healer",
    "simon"
  ],
  "levels": [
    "pirate:1",
    "swordsman:1",
    "healer:10",
    "ruffy:1",
    "simon:1",
    "aladdin:1",
    "violca:1",
    "mac:1",
    "sane:1",
    "marvyn:1",
    "quijano:1",
    "lydia:1"
  ],
  "krakenDown": false,
  "islandsVisited": [
    "tidehaven",
    "dunes",
    "spire",
    "mall",
    "duskmoor",
    "mirage",
    "aerie",
    "paegina",
    "whiteout",
    "wildwood",
    "improbable",
    "lamancha"
  ]
}
```

## For Claude — what to do with this
1. Open any state above marked ⚠️ first (those threw JS errors — highest priority).
2. Then eyeball each PNG for: clipping/floating props, jammed layout, wrong colors/theme, off-camera framing, illegible UI, models overlapping.
3. Cross-check the snapshot looks sane (levels, gold, flags).
4. File concrete fixes per screenshot.
