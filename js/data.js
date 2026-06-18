// =====================================================================
//  Data — content definitions: party, skill trees, enemies, items,
//  towns + NPCs, the world map, and the XP curve.
// =====================================================================
window.Data = (function () {
  // ability shape: { name, mp, min, max, target:'enemy'|'all'|'ally'|'allparty', fx, proj?, heal? }
  const ab = (name, o) => Object.assign({ name }, o);

  const PARTY = [
    {
      key: 'pirate', name: 'Capt. Redbeard', role: 'Pirate', model: 'pirate',
      base: { hp: 130, mp: 22, atkMin: 16, atkMax: 24, crit: 0.12 },
      growth: { hp: 14, mp: 3, atk: 3 },
      baseAbilities: [ ab('Cannon Blast', { mp: 8, min: 26, max: 38, target: 'enemy', fx: 'fire', proj: true }) ],
      tree: [
        { id: 'p_hp1', name: 'Sea Legs', desc: '+25 Max HP', cost: 1, kind: 'stat', stat: { hp: 25 } },
        { id: 'p_atk1', name: 'Cutlass Mastery', desc: '+4 Attack', cost: 1, kind: 'stat', stat: { atk: 4 } },
        { id: 'p_crit', name: "Dead Eye", desc: '+12% Crit', cost: 2, req: 'p_atk1', kind: 'stat', stat: { crit: 0.12 } },
        { id: 'p_broad', name: 'Broadside', desc: 'Hit all foes', cost: 2, req: 'p_hp1', kind: 'ability', ability: ab('Broadside', { mp: 14, min: 22, max: 32, target: 'all', fx: 'fire' }) },
        { id: 'p_hurricane', name: 'Hurricane', desc: 'Massive all-foe storm', cost: 3, req: 'p_broad', kind: 'ability', ability: ab('Hurricane', { mp: 24, min: 40, max: 56, target: 'all', fx: 'water' }) },
      ],
    },
    {
      key: 'swordsman', name: 'Lance Strider', role: 'SOLDIER', model: 'swordsman',
      base: { hp: 160, mp: 16, atkMin: 24, atkMax: 36, crit: 0.16, big: true },
      growth: { hp: 18, mp: 2, atk: 4 },
      baseAbilities: [ ab('Blade Beam', { mp: 10, min: 38, max: 52, target: 'enemy', fx: 'beam' }) ],
      tree: [
        { id: 's_hp1', name: 'Toughness', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 's_atk1', name: 'Heavy Swings', desc: '+5 Attack', cost: 1, kind: 'stat', stat: { atk: 5 } },
        { id: 's_braver', name: 'Braver', desc: 'Big single-target leap', cost: 2, req: 's_atk1', kind: 'ability', ability: ab('Braver', { mp: 12, min: 52, max: 70, target: 'enemy', fx: 'beam' }) },
        { id: 's_cross', name: 'Cross-Slash', desc: 'Hit all foes', cost: 2, req: 's_hp1', kind: 'ability', ability: ab('Cross-Slash', { mp: 16, min: 30, max: 44, target: 'all', fx: 'beam' }) },
        { id: 's_omni', name: 'Omnislash', desc: 'Devastate all foes', cost: 3, req: 's_cross', kind: 'ability', ability: ab('Omnislash', { mp: 28, min: 46, max: 64, target: 'all', fx: 'beam' }) },
      ],
    },
    {
      key: 'healer', name: 'Marina', role: 'Tide Priestess', model: 'healer',
      base: { hp: 110, mp: 40, atkMin: 8, atkMax: 14, crit: 0.05 },
      growth: { hp: 11, mp: 5, atk: 2 },
      baseAbilities: [
        ab('Mend', { mp: 6, min: 40, max: 56, target: 'ally', fx: 'heal', heal: true }),
        ab('Brine Bolt', { mp: 8, min: 24, max: 34, target: 'enemy', fx: 'water' }),
      ],
      tree: [
        { id: 'h_mp1', name: 'Deep Well', desc: '+15 Max MP', cost: 1, kind: 'stat', stat: { mp: 15 } },
        { id: 'h_tidal', name: 'Tidal Blessing', desc: 'Heal whole party', cost: 1, kind: 'ability', ability: ab('Tidal Blessing', { mp: 16, min: 30, max: 42, target: 'allparty', fx: 'heal', heal: true }) },
        { id: 'h_hp1', name: 'Resolve', desc: '+25 Max HP', cost: 1, req: 'h_mp1', kind: 'stat', stat: { hp: 25 } },
        { id: 'h_mega', name: 'Megaheal', desc: 'Huge single heal', cost: 2, req: 'h_tidal', kind: 'ability', ability: ab('Megaheal', { mp: 18, min: 80, max: 110, target: 'ally', fx: 'heal', heal: true }) },
        { id: 'h_tsunami', name: 'Tsunami', desc: 'Water damage to all', cost: 3, req: 'h_mega', kind: 'ability', ability: ab('Tsunami', { mp: 26, min: 38, max: 52, target: 'all', fx: 'water' }) },
      ],
    },
    {
      key: 'mage', name: 'Pip', role: 'Black Mage', model: 'mage',
      base: { hp: 95, mp: 46, atkMin: 6, atkMax: 12, crit: 0.05 },
      growth: { hp: 10, mp: 6, atk: 1 },
      baseAbilities: [
        ab('Flare Bolt', { mp: 8, min: 30, max: 44, target: 'enemy', fx: 'fire', proj: true }),
        ab('Frost', { mp: 8, min: 28, max: 40, target: 'enemy', fx: 'water', proj: true }),
      ],
      tree: [
        { id: 'm_mp1', name: 'Mana Font', desc: '+18 Max MP', cost: 1, kind: 'stat', stat: { mp: 18 } },
        { id: 'm_firaga', name: 'Firaga', desc: 'Fire damage to all foes', cost: 1, kind: 'ability', ability: ab('Firaga', { mp: 18, min: 30, max: 44, target: 'all', fx: 'fire' }) },
        { id: 'm_atk', name: 'Spell Focus', desc: '+4 Attack', cost: 1, req: 'm_mp1', kind: 'stat', stat: { atk: 4 } },
        { id: 'm_thundara', name: 'Thundara', desc: 'Heavy bolt on one foe', cost: 2, req: 'm_firaga', kind: 'ability', ability: ab('Thundara', { mp: 14, min: 48, max: 66, target: 'enemy', fx: 'beam' }) },
        { id: 'm_meteor', name: 'Meteor', desc: 'Catastrophe on all foes', cost: 3, req: 'm_thundara', kind: 'ability', ability: ab('Meteor', { mp: 28, min: 44, max: 60, target: 'all', fx: 'fire' }) },
      ],
    },
    {
      key: 'blader', name: 'Ridge', role: 'Wanderer', model: 'blader',
      base: { hp: 140, mp: 18, atkMin: 20, atkMax: 30, crit: 0.15 },
      growth: { hp: 15, mp: 2, atk: 4 },
      baseAbilities: [ ab('Cyclone', { mp: 10, min: 20, max: 30, target: 'all', fx: 'beam' }) ],
      tree: [
        { id: 'b_atk', name: 'Keen Edge', desc: '+5 Attack', cost: 1, kind: 'stat', stat: { atk: 5 } },
        { id: 'b_bolt', name: 'Lightning', desc: 'Bolt strike on one foe', cost: 1, kind: 'ability', ability: ab('Lightning', { mp: 10, min: 38, max: 52, target: 'enemy', fx: 'beam' }) },
        { id: 'b_hp', name: 'Endurance', desc: '+28 Max HP', cost: 1, req: 'b_atk', kind: 'stat', stat: { hp: 28 } },
        { id: 'b_crit', name: 'Quickblade', desc: '+12% Crit', cost: 2, req: 'b_bolt', kind: 'stat', stat: { crit: 0.12 } },
        { id: 'b_luminaire', name: 'Luminaire', desc: 'Radiant burst on all foes', cost: 3, req: 'b_crit', kind: 'ability', ability: ab('Luminaire', { mp: 22, min: 40, max: 56, target: 'all', fx: 'beam' }) },
      ],
    },
    {
      key: 'dragoon', name: 'Quint', role: 'Harpooner', model: 'dragoon',
      base: { hp: 165, mp: 20, atkMin: 22, atkMax: 32, crit: 0.12, big: true },
      growth: { hp: 17, mp: 3, atk: 4 },
      baseAbilities: [ ab('Harpoon Cast', { mp: 10, min: 40, max: 56, target: 'enemy', fx: 'beam', el: 'physical' }) ],
      tree: [
        { id: 'd_hp', name: 'Old Sea Dog', desc: '+32 Max HP', cost: 1, kind: 'stat', stat: { hp: 32 } },
        { id: 'd_breath', name: 'Oil Fire', desc: 'Burning oil over all foes', cost: 1, kind: 'ability', ability: ab('Oil Fire', { mp: 16, min: 26, max: 38, target: 'all', fx: 'fire' }) },
        { id: 'd_atk', name: 'Harpoon Mastery', desc: '+5 Attack', cost: 1, req: 'd_hp', kind: 'stat', stat: { atk: 5 } },
        { id: 'd_burst', name: 'The White Whale', desc: 'A legendary killing throw', cost: 2, req: 'd_atk', kind: 'ability', ability: ab('The White Whale', { mp: 14, min: 54, max: 72, target: 'enemy', fx: 'beam', el: 'physical' }) },
        { id: 'd_dragoon', name: 'Salt of the Deep', desc: '+40 Max HP', cost: 3, req: 'd_burst', kind: 'stat', stat: { hp: 40 } },
      ],
    },
    {
      key: 'ruffy', name: 'Ruffy', role: 'Rubber Rival', model: 'rival', temporary: true,
      base: { hp: 158, mp: 20, atkMin: 23, atkMax: 33, crit: 0.15, big: true },
      growth: { hp: 16, mp: 2, atk: 4 },
      baseAbilities: [ ab('Gum-Gum Pistol', { mp: 8, min: 34, max: 48, target: 'enemy', fx: 'beam', el: 'physical' }) ],
      tree: [
        { id: 'r_hp', name: 'Rubber Body', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 'r_gat', name: 'Gum-Gum Gatling', desc: 'A flurry of fists on all foes', cost: 1, kind: 'ability', ability: ab('Gum-Gum Gatling', { mp: 14, min: 22, max: 32, target: 'all', fx: 'beam', el: 'physical' }) },
        { id: 'r_atk', name: 'Fighting Spirit', desc: '+5 Attack', cost: 1, req: 'r_hp', kind: 'stat', stat: { atk: 5 } },
        { id: 'r_bazooka', name: 'Gum-Gum Bazooka', desc: 'A colossal two-fist blow', cost: 2, req: 'r_atk', kind: 'ability', ability: ab('Gum-Gum Bazooka', { mp: 16, min: 56, max: 74, target: 'enemy', fx: 'beam', el: 'physical' }) },
        { id: 'r_gear', name: 'Gear: Boundman', desc: '+12% Crit', cost: 3, req: 'r_bazooka', kind: 'stat', stat: { crit: 0.12 } },
      ],
    },
    {
      key: 'simon', name: 'Simon', role: 'Vampire Hunter', model: 'simon', temporary: true,
      base: { hp: 168, mp: 26, atkMin: 26, atkMax: 38, crit: 0.16, big: true },
      growth: { hp: 17, mp: 3, atk: 4 },
      baseAbilities: [
        ab('Holy Whip', { mp: 8, min: 40, max: 56, target: 'enemy', fx: 'beam', el: 'holy' }),
        ab('Cross Boomerang', { mp: 14, min: 28, max: 40, target: 'all', fx: 'beam', el: 'holy' }),
      ],
      tree: [
        { id: 'si_hp', name: 'Hunter\'s Vigor', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 'si_atk', name: 'Whip Mastery', desc: '+6 Attack', cost: 1, kind: 'stat', stat: { atk: 6 } },
        { id: 'si_holy', name: 'Holy Water', desc: 'Burning holy flask on all foes', cost: 1, req: 'si_atk', kind: 'ability', ability: ab('Holy Water', { mp: 16, min: 32, max: 46, target: 'all', fx: 'fire', el: 'holy' }) },
        { id: 'si_crit', name: 'Vampire Killer', desc: '+14% Crit', cost: 2, req: 'si_holy', kind: 'stat', stat: { crit: 0.14 } },
        { id: 'si_cross', name: 'Grand Cross', desc: 'A radiant cross shatters all foes', cost: 3, req: 'si_crit', kind: 'ability', ability: ab('Grand Cross', { mp: 26, min: 48, max: 66, target: 'all', fx: 'beam', el: 'holy' }) },
      ],
    },
  ];

  const ENEMIES = {
    shark:  { name: 'Maneater Shark',   model: 'shark',  hp: 88,  xp: 24, gold: 18, baseY: 0,   moves: [ { name: 'sinks its teeth in', min: 11, max: 17 }, { name: 'whips its tail', min: 14, max: 21 } ], drops: [ { mat: 'fang', chance: 0.7 }, { mat: 'fin', chance: 0.4 } ] },
    crab:   { name: 'Giant Hermit Crab', model: 'crab',  hp: 118, xp: 28, gold: 22, baseY: 0,   moves: [ { name: 'snaps a giant claw', min: 13, max: 19 }, { name: 'bashes with its shell', min: 16, max: 23 } ], drops: [ { mat: 'shellfrag', chance: 0.75 }, { mat: 'brine', chance: 0.2 } ] },
    jelly:  { name: "Man-o'-War Jelly",  model: 'jelly', hp: 60,  xp: 20, gold: 13, baseY: 0.2, moves: [ { name: 'stings sharply', min: 9, max: 15 }, { name: 'discharges a shock', min: 9, max: 14, all: true } ], drops: [ { mat: 'goo', chance: 0.85 } ] },
    octo:   { name: 'Reef Octopus',      model: 'octo',  hp: 102, xp: 30, gold: 24, baseY: 0.1, moves: [ { name: 'slams a tentacle', min: 15, max: 21 }, { name: 'sprays stinging ink', min: 8, max: 12, all: true } ], drops: [ { mat: 'ink', chance: 0.7 }, { mat: 'goo', chance: 0.3 } ] },
    gull:   { name: 'Dive-Bomb Gull',    model: 'gull',  hp: 54,  xp: 18, gold: 12, baseY: 1.4, moves: [ { name: 'pecks rapidly', min: 8, max: 13 }, { name: 'dive-bombs', min: 17, max: 25 } ], drops: [ { mat: 'feather', chance: 0.85 } ] },
    golem:  { name: 'Sandcastle Golem',  model: 'golem', hp: 136, xp: 36, gold: 30, baseY: 0,   moves: [ { name: 'slams a sandy fist', min: 15, max: 23 }, { name: 'crumbles down', min: 11, max: 18, all: true } ], drops: [ { mat: 'sand', chance: 0.85 }, { mat: 'brine', chance: 0.25 } ] },
    eel:    { name: 'Voltaic Eel',       model: 'eel',   hp: 96,  xp: 32, gold: 24, baseY: 1.0, moves: [ { name: 'lashes its tail', min: 13, max: 19 }, { name: 'looses a current', min: 12, max: 18, all: true } ], drops: [ { mat: 'goo', chance: 0.6 }, { mat: 'brine', chance: 0.35 } ] },
    urchin: { name: 'Spine Urchin',      model: 'urchin', hp: 150, xp: 34, gold: 26, baseY: 0,  moves: [ { name: 'fires a spine volley', min: 14, max: 20 }, { name: 'rolls over the party', min: 12, max: 18, all: true } ], drops: [ { mat: 'shellfrag', chance: 0.6 }, { mat: 'sand', chance: 0.4 } ] },
    bat:    { name: 'Nightwing Bat',     model: 'bat',   hp: 78,  xp: 30, gold: 20, baseY: 1.6, moves: [ { name: 'bites with a screech', min: 12, max: 18 }, { name: 'drains warm blood', min: 14, max: 20 } ], drops: [ { mat: 'ectoplasm', chance: 0.4 }, { mat: 'feather', chance: 0.3 } ] },
    ghoul:  { name: 'Drowned Ghoul',     model: 'ghoul', hp: 132, xp: 38, gold: 28, baseY: 0,   moves: [ { name: 'rakes with rotted claws', min: 15, max: 22 }, { name: 'exhales grave-rot', min: 12, max: 18, all: true } ], drops: [ { mat: 'ectoplasm', chance: 0.7 }, { mat: 'brine', chance: 0.3 } ] },
    wraith: { name: 'Tide Wraith',       model: 'wraith', hp: 110, xp: 40, gold: 30, baseY: 0.6, moves: [ { name: 'phases through a soul', min: 16, max: 23 }, { name: 'wails a dirge', min: 13, max: 19, all: true } ], drops: [ { mat: 'ectoplasm', chance: 0.8 } ] },
    vampire:{ name: 'Count Saltorre',    model: 'vampire', hp: 600, xp: 460, gold: 700, baseY: 0, boss: true, moves: [
      { name: 'rends with crimson claws', min: 30, max: 44 },
      { name: 'summons a swarm of bats', min: 20, max: 28, all: true },
      { name: 'drains the lifeblood of', min: 34, max: 48 },
      { name: 'unleashes Crimson Deluge', min: 28, max: 40, all: true } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'ectoplasm', chance: 1 } ] },
    kraken: { name: 'The Kraken',        model: 'kraken', hp: 360, xp: 160, gold: 220, baseY: 0, boss: true, moves: [ { name: 'crushes with a tentacle', min: 24, max: 34 }, { name: 'unleashes a maelstrom', min: 18, max: 26, all: true }, { name: 'snaps its colossal beak', min: 30, max: 42 } ], drops: [ { mat: 'ink', chance: 1 }, { mat: 'abyssscale', chance: 0.5 } ] },
    leviathan: { name: 'Reaper Leviathan', model: 'leviathan', hp: 520, xp: 380, gold: 600, baseY: 0.5, boss: true, moves: [
      { name: 'lunges with gaping jaws', min: 34, max: 48 },
      { name: 'looses a deafening roar', min: 22, max: 30, all: true },
      { name: 'thrashes in a frenzy', min: 40, max: 56 } ] },
    angler: { name: 'Abyss Angler', model: 'angler', hp: 380, xp: 280, gold: 420, baseY: 0.4, boss: true, moves: [
      { name: 'snaps its enormous jaws', min: 30, max: 44 },
      { name: 'mesmerizes with its lure', min: 18, max: 26, all: true } ] },
    selachoth: { name: 'Selachoth', model: 'selachoth', hp: 560, xp: 500, gold: 800, baseY: 0.2, boss: true, moves: [
      { name: 'cleaves with Tidemourn', min: 34, max: 46 },
      { name: 'sweeps the blade in an arc', min: 22, max: 30, all: true },
      { name: 'calls down a crushing Deluge', min: 30, max: 42 },
      { name: 'descends — One-Finned Requiem', min: 42, max: 56 },
    ] },
  };

  // shared inventory items (consumables)
  // kinds: heal | healall | full | mana | manaall | revive | reviverall | limit | damage | guard
  const ITEM_DEFS = {
    potion:   { name: 'Potion',       kind: 'heal',    amount: 60,  target: 'ally',     fx: 'heal', price: 30,  desc: 'Restore 60 HP to one ally.' },
    hipotion: { name: 'Hi-Potion',    kind: 'heal',    amount: 130, target: 'ally',     fx: 'heal', price: 90,  desc: 'Restore 130 HP to one ally.' },
    xpotion:  { name: 'X-Potion',     kind: 'heal',    amount: 320, target: 'ally',     fx: 'heal', price: 260, desc: 'Restore 320 HP to one ally.' },
    megapotion:{ name: 'Mega-Potion', kind: 'healall', amount: 110, target: 'allyall',  fx: 'heal', price: 320, desc: 'Restore 110 HP to ALL allies.' },
    elixir:   { name: 'Elixir',       kind: 'full',    target: 'ally',     fx: 'heal', price: 600, desc: 'Fully restore one ally\'s HP and MP.' },
    ether:    { name: 'Ether',        kind: 'mana',    amount: 35,  target: 'ally',     fx: 'mana', price: 80,  desc: 'Restore 35 MP to one ally.' },
    hiether:  { name: 'Hi-Ether',     kind: 'mana',    amount: 90,  target: 'ally',     fx: 'mana', price: 220, desc: 'Restore 90 MP to one ally.' },
    turboether:{ name: 'Turbo Ether', kind: 'manaall', amount: 45,  target: 'allyall',  fx: 'mana', price: 360, desc: 'Restore 45 MP to ALL allies.' },
    phoenix:  { name: 'Phoenix Down', kind: 'revive',  target: 'dead',     fx: 'heal', price: 120, desc: 'Revive a fallen ally (half HP).' },
    megaphoenix:{ name: 'Mega Phoenix',kind: 'fullrevive', target: 'dead', fx: 'heal', price: 480, desc: 'Revive a fallen ally to FULL HP.' },
    adrenaline:{ name: 'Adrenaline',  kind: 'limit',   target: 'ally',     fx: 'beam', price: 240, desc: 'Instantly fill one ally\'s Limit gauge.' },
    bomb:     { name: 'Powder Bomb',  kind: 'damage', min: 45,  max: 60,  target: 'enemy', fx: 'fire',  el: 'fire',    price: 60,  desc: '45-60 Fire damage to one foe.' },
    frostbomb:{ name: 'Frost Flask',  kind: 'damage', min: 55,  max: 75,  target: 'enemy', fx: 'water', el: 'water',   price: 110, desc: '55-75 Water damage to one foe.' },
    boltbomb: { name: 'Storm Jar',    kind: 'damage', min: 60,  max: 85,  target: 'enemy', fx: 'beam',  el: 'thunder', price: 130, desc: '60-85 Thunder damage to one foe.' },
    holybomb: { name: 'Sunshard',     kind: 'damage', min: 70,  max: 100, target: 'enemy', fx: 'heal',  el: 'holy',    price: 200, desc: '70-100 Holy damage to one foe — searing to the undead.' },
    grenade:  { name: 'Sea-Mine',     kind: 'damageall', min: 40, max: 60, target: 'enemyall', fx: 'fire', el: 'fire',  price: 240, desc: '40-60 Fire damage to ALL foes.' },
  };
  const SHOP_STOCK = ['potion', 'hipotion', 'ether', 'phoenix', 'bomb'];
  // some goods are exclusive to certain town markets, unlocked as you sail east
  const SHOP_STOCK_BY_TOWN = {
    tidehaven: ['potion', 'hipotion', 'ether', 'phoenix', 'bomb', 'frostbomb'],
    dunesport: ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'phoenix', 'bomb', 'boltbomb', 'megapotion'],
    mall:      ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'turboether', 'phoenix', 'megaphoenix', 'elixir', 'adrenaline', 'megapotion', 'grenade', 'holybomb', 'boltbomb', 'frostbomb'],
  };

  // ---------------- CRAFTING ----------------
  // Enemies drop "junk" MATERIALS; combine them at any shop's Crafting tab into items.
  const MATERIALS = {
    fang:      { name: 'Jagged Fang',    icon: '🦷', desc: 'A serrated tooth, still sharp.' },
    fin:       { name: 'Torn Fin',       icon: '🦈', desc: 'Cartilage from a sea-beast.' },
    shellfrag: { name: 'Shell Shard',    icon: '🐚', desc: 'A chip of armoured carapace.' },
    goo:       { name: 'Stinging Goo',   icon: '🫧', desc: 'Translucent, faintly electric jelly.' },
    ink:       { name: 'Ink Sac',        icon: '🖤', desc: 'A bladder of inky black fluid.' },
    feather:   { name: 'Greasy Feather', icon: '🪶', desc: 'A windworn gull feather.' },
    sand:      { name: 'Binding Sand',   icon: '⏳', desc: 'Strangely cohesive grit.' },
    ember:     { name: 'Cinder Lump',    icon: '🔥', desc: 'A coal that never quite cools.' },
    brine:     { name: 'Brine Crystal',  icon: '💎', desc: 'Salt crystallized under deep pressure.' },
    ectoplasm: { name: 'Ectoplasm',      icon: '👻', desc: 'Cold residue of something undead.' },
    abyssscale:{ name: 'Abyss Scale',    icon: '🐉', desc: 'A scale from the deepest dark — rare.' },
  };
  // recipes: { out: itemKey, qty, cost:{matKey:n,...}, name }
  const RECIPES = [
    { out: 'potion',     qty: 2, cost: { goo: 2 },                 name: 'Potion ×2' },
    { out: 'hipotion',   qty: 1, cost: { goo: 3, brine: 1 },       name: 'Hi-Potion' },
    { out: 'ether',      qty: 1, cost: { goo: 2, feather: 1 },     name: 'Ether' },
    { out: 'bomb',       qty: 2, cost: { ember: 1, shellfrag: 1 }, name: 'Powder Bomb ×2' },
    { out: 'frostbomb',  qty: 1, cost: { brine: 2, fin: 1 },       name: 'Frost Flask' },
    { out: 'boltbomb',   qty: 1, cost: { goo: 3, ink: 1 },         name: 'Storm Jar' },
    { out: 'phoenix',    qty: 1, cost: { feather: 2, ember: 1 },   name: 'Phoenix Down' },
    { out: 'xpotion',    qty: 1, cost: { goo: 4, brine: 2 },       name: 'X-Potion' },
    { out: 'holybomb',   qty: 1, cost: { brine: 1, ectoplasm: 2 }, name: 'Sunshard' },
    { out: 'megapotion', qty: 1, cost: { goo: 5, brine: 2, sand: 2 }, name: 'Mega-Potion' },
    { out: 'elixir',     qty: 1, cost: { abyssscale: 1, brine: 3, ectoplasm: 2 }, name: 'Elixir' },
    { out: 'grenade',    qty: 1, cost: { ember: 2, ink: 1, sand: 2 }, name: 'Sea-Mine' },
  ];

  // ---------------- WEAPONS (character-specific, each has shell slots) ----------------
  // first entry per character is the starting weapon (price 0).
  const WEAPONS = {
    pirate: [
      { key: 'flintlock_cutlass', name: 'Flintlock Cutlass', atk: 0, slots: 1, price: 0, desc: 'A trusty curved blade.' },
      { key: 'twin_sabers',       name: 'Twin Sabers',       atk: 8, slots: 2, price: 220, desc: '+8 ATK · 2 shell slots' },
      { key: 'krakentooth_blade', name: 'Krakentooth Blade', atk: 18, slots: 3, price: 620, desc: '+18 ATK · 3 shell slots' },
    ],
    swordsman: [
      { key: 'buster_blade',  name: 'Buster Blade',  atk: 0, slots: 1, price: 0, desc: 'A massive iron slab of a sword.' },
      { key: 'tide_cleaver',  name: 'Tide Cleaver',  atk: 12, slots: 2, price: 320, desc: '+12 ATK · 2 shell slots' },
      { key: 'abyssal_edge',  name: 'Abyssal Edge',  atk: 24, slots: 3, price: 840, desc: '+24 ATK · 3 shell slots' },
    ],
    healer: [
      { key: 'coral_staff',        name: 'Coral Staff',        atk: 0, slots: 2, price: 0, desc: 'A staff of living coral.' },
      { key: 'pearl_rod',          name: 'Pearl Rod',          atk: 4, slots: 3, price: 300, desc: '+4 ATK · 3 shell slots' },
      { key: 'leviathan_scepter',  name: 'Leviathan Scepter',  atk: 8, slots: 4, price: 760, desc: '+8 ATK · 4 shell slots' },
    ],
    mage: [
      { key: 'apprentice_wand', name: 'Apprentice Wand', atk: 0, slots: 2, price: 0, desc: 'A simple starter wand.' },
      { key: 'star_rod',        name: 'Star Rod',        atk: 4, slots: 3, price: 280, desc: '+4 ATK · 3 shell slots' },
      { key: 'doomstaff',       name: 'Doomstaff',       atk: 8, slots: 4, price: 740, desc: '+8 ATK · 4 shell slots' },
    ],
    blader: [
      { key: 'wood_katana',  name: 'Wooden Katana', atk: 0, slots: 1, price: 0, desc: 'A practice blade.' },
      { key: 'steel_katana', name: 'Steel Katana',  atk: 10, slots: 2, price: 300, desc: '+10 ATK · 2 shell slots' },
      { key: 'rainbow_edge', name: 'Rainbow Edge',  atk: 22, slots: 3, price: 820, desc: '+22 ATK · 3 shell slots' },
    ],
    dragoon: [
      { key: 'iron_lance',   name: "Whaler's Harpoon", atk: 0, slots: 1, price: 0, desc: 'A weathered iron harpoon.' },
      { key: 'partisan',     name: 'Barbed Harpoon',   atk: 12, slots: 2, price: 320, desc: '+12 ATK · 2 shell slots' },
      { key: 'dragon_lance', name: 'Leviathan Harpoon', atk: 24, slots: 3, price: 840, desc: '+24 ATK · 3 shell slots' },
    ],
    ruffy: [
      { key: 'worn_gloves',     name: 'Worn Gloves',      atk: 0, slots: 1, price: 0, desc: 'Tattered fingerless gloves.' },
      { key: 'haki_gauntlets',  name: 'Haki Gauntlets',   atk: 14, slots: 2, price: 360, desc: '+14 ATK · 2 shell slots' },
      { key: 'conquerors_fists', name: "Conqueror's Fists", atk: 26, slots: 3, price: 880, desc: '+26 ATK · 3 shell slots' },
    ],
    simon: [
      { key: 'leather_whip', name: 'Leather Whip',  atk: 10, slots: 2, price: 0, desc: 'A hunter\'s trusted whip.' },
      { key: 'chain_whip',   name: 'Chain Whip',    atk: 20, slots: 2, price: 0, desc: '+20 ATK · 2 shell slots' },
      { key: 'vampire_killer', name: 'Vampire Killer', atk: 34, slots: 3, price: 0, desc: 'The legendary whip — bane of the night.' },
    ],
  };
  // ultimate weapons (sold at the Mall Isle bazaar)
  const ULT = {
    pirate:    { key: 'worldbreaker', name: 'Worldbreaker Cutlass', atk: 34, slots: 3, price: 1600, desc: '+34 ATK · 3 slots · ultimate' },
    swordsman: { key: 'apocalypse',   name: 'Apocalypse Blade',     atk: 36, slots: 3, price: 1700, desc: '+36 ATK · 3 slots · ultimate' },
    healer:    { key: 'tidemother',   name: 'Tidemother Scepter',   atk: 14, slots: 4, price: 1500, desc: '+14 ATK · 4 slots · ultimate' },
    mage:      { key: 'cosmos_staff', name: 'Cosmos Staff',         atk: 14, slots: 4, price: 1600, desc: '+14 ATK · 4 slots · ultimate' },
    blader:    { key: 'rainbow_prism', name: 'Rainbow Prism',       atk: 34, slots: 3, price: 1650, desc: '+34 ATK · 3 slots · ultimate' },
    dragoon:   { key: 'megalodon',    name: 'Megalodon Harpoon',    atk: 36, slots: 3, price: 1700, desc: '+36 ATK · 3 slots · ultimate' },
    ruffy:     { key: 'gear5_gloves', name: 'Gear-5 Gloves',        atk: 38, slots: 3, price: 1800, desc: '+38 ATK · 3 slots · ultimate' },
  };
  Object.keys(ULT).forEach(k => { if (WEAPONS[k]) WEAPONS[k].push(ULT[k]); });

  // ---------------- SEASHELLS (this game's "materia") ----------------
  // magic shells grant an ability; support shells give a passive stat.
  // shells gain AP from battles and level up (1→3), scaling their effect.
  const ab2 = (name, o) => Object.assign({ name }, o);
  const SHELLS = {
    conch_ember:   { key: 'conch_ember', name: 'Ember Conch', kind: 'magic', maxLevel: 3, ap: [0, 80, 220], price: 180,
      ability: ab2('Ember Burst', { mp: 8, min: 26, max: 38, target: 'enemy', fx: 'fire', proj: true }), desc: 'Grants a fire attack spell.' },
    nautilus_surge:{ key: 'nautilus_surge', name: 'Nautilus Spiral', kind: 'magic', maxLevel: 3, ap: [0, 110, 300], price: 320,
      ability: ab2('Tidal Surge', { mp: 16, min: 22, max: 32, target: 'all', fx: 'water' }), desc: 'Grants a water attack that hits all foes.' },
    spiral_mend:   { key: 'spiral_mend', name: 'Spiral of Mending', kind: 'magic', maxLevel: 3, ap: [0, 90, 240], price: 200,
      ability: ab2('Sea Mend', { mp: 6, min: 36, max: 50, target: 'ally', fx: 'heal', heal: true }), desc: 'Grants a single-target heal.' },
    triton_blast:  { key: 'triton_blast', name: "Triton's Horn", kind: 'magic', maxLevel: 3, ap: [0, 140, 360], price: 420,
      ability: ab2('Triton Blast', { mp: 14, min: 40, max: 56, target: 'enemy', fx: 'beam' }), desc: 'Grants a heavy single-target blast.' },
    sand_dollar:   { key: 'sand_dollar', name: 'Sand Dollar', kind: 'support', stat: 'hp', perLevel: 22, maxLevel: 3, ap: [0, 70, 190], price: 150, desc: '+Max HP (scales with level).' },
    cowrie_focus:  { key: 'cowrie_focus', name: 'Focus Cowrie', kind: 'support', stat: 'mp', perLevel: 10, maxLevel: 3, ap: [0, 70, 190], price: 150, desc: '+Max MP (scales with level).' },
    auger_edge:    { key: 'auger_edge', name: 'Auger Spike', kind: 'support', stat: 'atk', perLevel: 5, maxLevel: 3, ap: [0, 90, 240], price: 200, desc: '+Attack (scales with level).' },
    tiger_crit:    { key: 'tiger_crit', name: 'Tiger Cowrie', kind: 'support', stat: 'crit', perLevel: 0.06, maxLevel: 3, ap: [0, 110, 280], price: 240, desc: '+Crit chance (scales with level).' },
  };
  const SHOP_SHELLS = ['conch_ember', 'spiral_mend', 'nautilus_surge', 'triton_blast', 'sand_dollar', 'cowrie_focus', 'auger_edge', 'tiger_crit'];

  // effective ability for a magic shell at a given level (scales potency)
  function shellAbility(shellKey, level) {
    const s = SHELLS[shellKey]; if (!s || !s.ability) return null;
    const f = 1 + 0.2 * (level - 1);
    const a = Object.assign({}, s.ability);
    a.min = Math.round(a.min * f); a.max = Math.round(a.max * f);
    a.name = s.ability.name + (level > 1 ? ' +' + (level - 1) : '');
    return a;
  }

  // ---------------- ELEMENTS & AFFINITIES ----------------
  const ELEMENT_INFO = {
    fire:     { c: '#ff7b3a', i: '🔥', name: 'Fire' },
    water:    { c: '#5eead4', i: '💧', name: 'Water' },
    thunder:  { c: '#fde047', i: '⚡', name: 'Thunder' },
    earth:    { c: '#c2a062', i: '⛰️', name: 'Earth' },
    dark:     { c: '#b06aff', i: '🌑', name: 'Dark' },
    holy:     { c: '#fff0a0', i: '✨', name: 'Holy' },
    physical: { c: '#ffffff', i: '', name: 'Physical' },
  };
  function elementOf(a) { if (a.el) return a.el; return ({ fire: 'fire', water: 'water', beam: 'thunder' })[a.fx] || 'physical'; }
  // enemy affinities: weak (x1.5), resist (x0.5), absorb (heals), nullify (x0)
  const AFFINITIES = {
    shark:  { weak: ['thunder'], resist: ['water'] },
    crab:   { weak: ['thunder'], resist: ['physical'] },
    jelly:  { weak: ['thunder'], absorb: ['water'] },
    octo:   { weak: ['thunder'], resist: ['water'] },
    gull:   { weak: ['thunder'], resist: ['earth'] },
    golem:  { weak: ['water'], resist: ['fire'] },
    eel:    { weak: ['earth'], absorb: ['thunder'], resist: ['water'] },
    urchin: { weak: ['water'], resist: ['earth', 'physical'] },
    bat:    { weak: ['holy'], resist: ['dark'] },
    ghoul:  { weak: ['holy', 'fire'], absorb: ['dark'], resist: ['water'] },
    wraith: { weak: ['holy'], absorb: ['dark'], nullify: ['physical'] },
    vampire:{ weak: ['holy'], absorb: ['dark'], resist: ['fire', 'water'] },
    kraken: { weak: ['thunder'], resist: ['water'] },
    selachoth: { weak: ['thunder', 'holy'], absorb: ['water'] },
    leviathan: { weak: ['thunder'], resist: ['water'] },
    angler: { weak: ['fire', 'holy'], resist: ['dark'] },
  };
  const AMBUSH = ['leviathan', 'angler']; // random deep-sea ambush bosses
  function affMult(enemyKey, element) {
    const a = AFFINITIES[enemyKey]; if (!a || !element || element === 'physical') return 1;
    if (a.absorb && a.absorb.includes(element)) return -1;
    if (a.nullify && a.nullify.includes(element)) return 0;
    if (a.weak && a.weak.includes(element)) return 1.5;
    if (a.resist && a.resist.includes(element)) return 0.5;
    return 1;
  }

  // ---------------- LIMIT BREAKS (one per hero; uses the limit gauge) ----------------
  const LIMITS = {
    pirate:    { name: 'Full Broadside',  target: 'all',      fx: 'fire',  el: 'fire',    min: 58, max: 82, flavor: 'unloads every cannon at once!' },
    swordsman: { name: 'Omnislash',       target: 'all',      fx: 'beam',  el: 'thunder', min: 68, max: 92, flavor: 'becomes a blur of steel!' },
    healer:    { name: "Ocean's Grace",   target: 'allparty', fx: 'heal',  heal: true, revive: true, min: 200, max: 200, flavor: 'calls the tide to mend all wounds!' },
    mage:      { name: 'Ultima',          target: 'all',      fx: 'beam',  el: 'dark',    min: 78, max: 108, flavor: 'unleashes forbidden magic!' },
    blader:    { name: 'Finishing Touch', target: 'all',      fx: 'beam',  el: 'thunder', min: 72, max: 98, flavor: 'cuts the very air!' },
    dragoon:   { name: "Leviathan's End", target: 'enemy',    fx: 'beam',  el: 'water',   min: 120, max: 168, flavor: 'hurls the great harpoon with a vengeance!' },
    ruffy:     { name: 'Gum-Gum King Cobra', target: 'enemy', fx: 'beam',  el: 'physical', min: 130, max: 175, flavor: 'winds up a fist the size of an island!' },
    simon:     { name: 'Grand Cross',     target: 'all',      fx: 'beam',  el: 'holy',    min: 96, max: 132, flavor: 'calls down a cross of holy light!' },
  };

  // ---------------- ICONS ----------------
  const WEAPON_ICON = { pirate: '⚔️', swordsman: '🗡️', healer: '🪄', mage: '✨', blader: '🌀', dragoon: '🔱', ruffy: '🥊', simon: '🔗' };
  const weaponIcon = (charKey) => WEAPON_ICON[charKey] || '⚔️';
  const shellIcon = (sh) => (sh.kind === 'magic' ? '🔮' : '🛡️');

  // ---------------- SHIP (customization + stats + enemy ships) ----------------
  const SHIP = { baseHp: 120, baseAtk: 22, baseDef: 6, defaults: { hull: '#7a5230', sail: '#f3ead9', flag: '🏴‍☠️' } };
  const SHIP_CUSTOM = {
    hulls: [ { name: 'Oak', color: '#7a5230', price: 0 }, { name: 'Mahogany', color: '#5b2a1e', price: 120 }, { name: 'Ebony', color: '#2a2430', price: 200 }, { name: 'Ivory', color: '#e8dcc0', price: 200 }, { name: 'Crimson', color: '#7a1f1f', price: 260 } ],
    sails: [ { name: 'Canvas', color: '#f3ead9', price: 0 }, { name: 'Crimson', color: '#c2415a', price: 100 }, { name: 'Royal Blue', color: '#3a5ac0', price: 140 }, { name: 'Emerald', color: '#2f8d52', price: 140 }, { name: 'Midnight', color: '#23253a', price: 180 } ],
    flags: [ { emoji: '🏴‍☠️', price: 0 }, { emoji: '⚓', price: 60 }, { emoji: '🦈', price: 90 }, { emoji: '🐙', price: 90 }, { emoji: '🌊', price: 60 }, { emoji: '⭐', price: 120 } ],
  };
  const SHIP_UPGRADES = [
    { id: 'hull', name: 'Reinforced Hull', stat: 'hp', per: 40, max: 5, basePearls: 2, desc: '+40 Ship HP per level' },
    { id: 'cannons', name: 'Heavier Cannons', stat: 'atk', per: 6, max: 5, basePearls: 2, desc: '+6 Cannon power per level' },
    { id: 'plating', name: 'Iron Plating', stat: 'def', per: 3, max: 5, basePearls: 2, desc: '+3 Ship defense per level' },
  ];
  const ENEMY_SHIPS = {
    sloop:   { name: 'Brigand Sloop',   hp: 90,  atk: 16, def: 3, hull: '#5b3a1e', sail: '#d8c7a0', flag: '🏴', gold: 90,  pearls: 2 },
    frigate: { name: 'Corsair Frigate', hp: 150, atk: 24, def: 6, hull: '#3a2a18', sail: '#c2415a', flag: '⚔️', gold: 170, pearls: 4 },
    ghost:   { name: 'The Wraith',      hp: 230, atk: 32, def: 9, hull: '#2a3a3a', sail: '#bfe6e0', flag: '💀', ghost: true, gold: 320, pearls: 9, shell: 'triton_blast' },
  };

  // ---------------- SHELL-HUNT MINIGAME ----------------
  const SHELL_HUNT = { pool: ['conch_ember', 'spiral_mend', 'nautilus_surge', 'sand_dollar', 'cowrie_focus', 'auger_edge', 'tiger_crit', 'triton_blast'] };

  // ---------------- MERMAIDS (dating sim — win them over for weapon enchants) ----------------
  // option: { t: text, love: points, r: her reply }
  const o = (t, love, r) => ({ t, love, r });
  const THRESH = 5;
  const MERMAIDS = {
    ember: { name: 'Ember', element: 'fire', color: '#ff7a4a', tail: '#c2452a', island: 'tidehaven', threshold: THRESH,
      intro: 'A mermaid with hair like living flame lounges on a sun-warmed rock.', likes: 'boldness and a daring heart',
      dates: [
        { q: '"Tell me, surface-dweller — what do you do when you\'re afraid?"', options: [ o('"I charge in anyway. Fear is just fuel."', 2, 'She grins, eyes blazing. "Now THAT is an answer."'), o('"I make a careful plan first."', 1, '"Cautious. ...I can work with cautious."'), o('"I usually run, honestly."', 0, 'She wrinkles her nose. "Hmph."') ] },
        { q: '"The sea is cold. What\'s something that sets YOU on fire?"', options: [ o('"Protecting the people I love."', 2, 'Her flames soften. "...Good. A warm answer."'), o('"A really good fight."', 1, '"Ha! A kindred spirit, maybe."'), o('"Uh... naps?"', 0, '"...Naps. Truly the heart of a hero."') ] },
        { q: '"Would you walk through fire for someone?"', options: [ o('"Without a second thought."', 2, 'She blushes a deep ember. "You mean that, don\'t you."'), o('"If they were worth it."', 1, '"A romantic with conditions. Cute."'), o('"Depends how hot the fire is."', 0, 'She rolls her eyes, smirking.') ] },
        { q: '"Impress me. Quickly."', options: [ o('"I sailed here just to meet you."', 2, '"...Smooth. Dangerously smooth."'), o('"I slew a Kraken once. Almost."', 1, '"Almost, hm? Honest, at least."'), o('"I, uh, have a really nice boat?"', 0, '"A boat. Be still my heart."') ] },
      ],
      smitten: '"You\'ve set my heart ablaze, Captain. Bring me a blade — I\'ll wreath it in fire for whoever you choose."',
      enchant: '"Whose weapon shall I kiss with flame?"' },

    nerida: { name: 'Nerida', element: 'water', color: '#3fd0e0', tail: '#2f8d9a', island: 'tidehaven', threshold: THRESH,
      intro: 'A serene mermaid drifts in a tide pool, watching you with deep, knowing eyes.', likes: 'honesty and a gentle soul',
      dates: [
        { q: '"The water shows me everything. So tell me true — why are you really here?"', options: [ o('"Honestly? I wanted to meet you."', 2, 'She smiles softly. "...Honesty. How rare and lovely."'), o('"To get stronger for the journey."', 1, '"Driven. The current carries you far."'), o('"Treasure, mostly."', 0, 'She sighs like the tide pulling out.') ] },
        { q: '"What do you do when a friend is hurting?"', options: [ o('"I sit with them. I listen."', 2, '"...You understand the deep places. Good."'), o('"I try to fix the problem."', 1, '"A doer. Sometimes they just need you, though."'), o('"I give them space, I guess?"', 0, '"Mm. Space can be lonely water."') ] },
        { q: '"Calm seas or wild storms?"', options: [ o('"Calm seas — shared with someone I trust."', 2, 'She flushes aquamarine. "Oh. ...Oh."'), o('"Wild storms! The thrill!"', 1, '"You and Ember would get along."'), o('"Whichever gets me there faster."', 0, '"Ever the captain."') ] },
      ],
      smitten: '"My heart flows toward you like a tide that never ebbs. Let me bless a weapon with the deep."',
      enchant: '"Whose blade shall the ocean claim?"' },

    volta: { name: 'Volta', element: 'thunder', color: '#ffe04a', tail: '#c2a02a', island: 'dunes', threshold: THRESH,
      intro: 'A crackling, restless mermaid zips around a rock, sparks dancing off her fins.', likes: 'quick wit and high energy',
      dates: [
        { q: '"Quick! Best thing about being alive — GO!"', options: [ o('"Moments like this one. With you."', 2, 'She short-circuits a little. "Bzzt— wow, okay, smooth!"'), o('"Adventure! Never a dull second!"', 1, '"YES! Finally someone gets it!"'), o('"Um... let me think about it..."', 0, '"Too slow! Lightning waits for no one!"') ] },
        { q: '"I get bored SO fast. How would you keep me interested?"', options: [ o('"I\'d never let two days look the same."', 2, '"Ooh, a promise of chaos. I\'m listening."'), o('"With terrible jokes, mostly."', 1, 'She snorts electrically. "Acceptable."'), o('"I\'m actually pretty low-key."', 0, '"...We may have a problem, low-key boy."') ] },
        { q: '"Race you to the reef and back — but first, why should I even bother with a slowpoke surfacer?"', options: [ o('"Because I keep up with whatever I love."', 2, 'Sparks fly — literally. "...Okay that was good."'), o('"Because I\'ll let you win."', 1, '"Pfft. I don\'t need a head start!"'), o('"You probably shouldn\'t."', 0, '"Wow. Confidence of a wet napkin."') ] },
      ],
      smitten: '"You\'ve got my heart racing at a thousand volts! Gimme a weapon — I\'ll charge it UP!"',
      enchant: '"Whose weapon gets the shock treatment?!"' },

    gaia: { name: 'Gaia', element: 'earth', color: '#6ec06a', tail: '#3a7a3a', island: 'dunes', threshold: THRESH,
      intro: 'A gentle mermaid tends a little garden of sea-flowers growing from the sand.', likes: 'kindness and patience',
      dates: [
        { q: '"This little seedling won\'t bloom. What would you do?"', options: [ o('"Be patient. Give it time and care."', 2, 'She beams warmly. "...You\'d make a fine gardener."'), o('"Move it somewhere sunnier."', 1, '"Practical and kind. I like that."'), o('"Pull it up and plant a new one."', 0, 'She frowns. "Oh... no, no."') ] },
        { q: '"What does \'home\' mean to you?"', options: [ o('"The people you grow alongside."', 2, 'Her cheeks go rosy as peach blossoms.'), o('"Anywhere I can rest safely."', 1, '"A place to put down roots. Lovely."'), o('"Wherever my stuff is."', 0, '"...We can work on that."') ] },
        { q: '"Would you stay, even when things get hard and slow?"', options: [ o('"Especially then. That\'s when it matters."', 2, '"...You understand. Truly."'), o('"I\'d try my best to."', 1, '"Honest. That\'s enough for me."'), o('"I get restless, honestly."', 0, 'She nods sadly, patting the soil.') ] },
      ],
      smitten: '"You\'ve helped something bloom in me, dear one. Let me lend a weapon the strength of the earth."',
      enchant: '"Whose weapon shall I root in stone?"' },

    nyx: { name: 'Nyx', element: 'dark', color: '#b06aff', tail: '#5a3a8a', island: 'spire', threshold: THRESH,
      intro: 'A mermaid wreathed in shadow regards you from the deep water, lips curled in a sly smile.', likes: 'wit, mystery, and uncomfortable honesty',
      dates: [
        { q: '"Everyone\'s got a darkness. What\'s yours? ...And don\'t lie, I\'ll know."', options: [ o('"I\'m terrified of being forgotten."', 2, 'Her smile turns genuine. "...Now we\'re talking."'), o('"I can be stubborn to a fault."', 1, '"Mm. A start."'), o('"I\'m basically perfect, honestly."', 0, '"Boring AND a liar. Two for one."') ] },
        { q: '"Why do people fear the dark, do you think?"', options: [ o('"Because they fear what they can\'t control."', 2, '"...Clever creature. I might keep you."'), o('"Because they can\'t see what\'s coming."', 1, '"Practical. Acceptable."'), o('"Monsters, probably?"', 0, '"...The monsters are the interesting part, dear."') ] },
        { q: '"If I asked you to keep a secret forever, could you?"', options: [ o('"Your secrets would die with me."', 2, 'She drifts closer through the gloom. "Dangerous words."'), o('"Depends on the secret."', 1, '"Honest. I respect honest."'), o('"I\'m a terrible gossip, sorry."', 0, '"...Noted. Loudly."') ] },
      ],
      smitten: '"How strange — you\'ve charmed a creature of the deep dark. Bring me a weapon; I\'ll feed it shadow."',
      enchant: '"Whose blade shall drink the dark?"' },

    lumina: { name: 'Lumina', element: 'holy', color: '#fff3c0', tail: '#d8c86a', island: 'spire', threshold: THRESH,
      intro: 'A luminous mermaid haloed in soft golden light smiles at you with radiant warmth.', likes: 'honor, hope, and a noble heart',
      dates: [
        { q: '"The world is dark of late. Do you still believe in hope?"', options: [ o('"Always. Hope is why we fight at all."', 2, 'Her glow brightens. "...You shine, you know that?"'), o('"I believe in trying, at least."', 1, '"Trying is its own kind of faith."'), o('"Hope is for dreamers."', 0, 'Her light dims a little, sadly.') ] },
        { q: '"What would you do with great power?"', options: [ o('"Protect those who can\'t protect themselves."', 2, '"A guardian\'s heart. Be still, mine."'), o('"Set right what I could."', 1, '"Noble enough. I approve."'), o('"Live like a king, obviously."', 0, '"...Ah. One of THOSE."') ] },
        { q: '"Selachoth was a hero once, before he fell. Could you resist that temptation?"', options: [ o('"With friends to remind me who I am — yes."', 2, '"...That is the truest answer there is."'), o('"I\'d like to think so."', 1, '"Humble. The humble rarely fall."'), o('"Power\'s power, who\'s to say?"', 0, 'She looks at you with quiet worry.') ] },
      ],
      smitten: '"You have a heart full of light, Captain — it calls to mine. Let me sanctify a weapon for you."',
      enchant: '"Whose weapon shall I bless with holy light?"' },
  };

  // ---------------- TOWNS ----------------
  // npc: { name, color, hair, x, z, lines:[...], service?: 'inn'|'shop' }
  const TOWNS = {
    tidehaven: {
      name: 'Tidehaven', sky: 'town',
      ground: '#cdb98a', accent: '#8fd3f4',
      buildings: [
        { kind: 'inn',  x: -8, z: -4, label: 'Inn' },
        { kind: 'shop', x: 8,  z: -4, label: 'Shop' },
        { kind: 'shop', x: 8,  z: 6, label: 'Armory' },
        { kind: 'house', x: -9, z: 7, wall: '#d8c4a0', roof: '#c0653a' },
        { kind: 'house', x: 9,  z: 9, wall: '#e0d0aa', roof: '#7a8a3a' },
        { kind: 'house', x: 0,  z: 11, wall: '#d0bb95', roof: '#3a6a8a', w: 5, d: 5 },
        { kind: 'house', x: -5, z: 9, wall: '#dcc6a0', roof: '#5a7a8a' },
      ],
      npcs: [
        { name: 'Innkeeper Sol', color: '#3a7a5a', x: -8, z: -1.5, service: 'inn',
          lines: ['Welcome to the Tidehaven Inn, traveler!', 'Rest here to fully restore your party.'] },
        { name: 'Merchant Pell', color: '#7a5aa0', x: 8, z: -1.5, service: 'shop',
          lines: ['Finest wares this side of the reef!', 'Take a look at what I have for sale.'] },
        { name: 'Old Salt', color: '#5a6a8a', hair: '#cccccc', x: -4, z: 3,
          lines: ['Arr, the seas have gone mad of late.', 'Monsters wash up on every beach now — driven ashore by something darker.', 'They whisper a name on the wind: SELACHOTH. The One-Finned Angel.', 'Half man, half shark, all menace. He raised the KRAKEN to guard his spire in the east.'] },
        { name: 'Lia the Diver', color: '#c05a7a', hair: '#2a1a10', x: 4, z: 3,
          lines: ['You three look tough! Out hunting beasts?', 'Level up out there before facing the big ones.', 'Tip: open the SKILLS menu (press M) to learn new abilities!', 'You must slay the Kraken before the path to Selachoth opens.'] },
        { name: 'Kid Finn', color: '#d6a23a', hair: '#3a2a18', x: 0, z: 6,
          lines: ['Whoa, is that a real buster sword?!', 'When I grow up I wanna be a SOLDIER too!'] },
        { name: 'Armorer Grit', color: '#6a6a7a', hair: '#cccccc', x: 8, z: 6, service: 'shop',
          lines: ['Steel and seashells — finest on the isle!', 'Weapons, materia, the works. Have a look.'] },
        { name: 'Fisher Bex', color: '#3a8a6a', x: -4, z: 8,
          lines: ['Fish won\'t bite with monsters about.', 'Calm the seas and I\'ll cook you the catch of the year!'] },
      ],
      exit: { x: 0, z: -12 },
    },
    dunesport: {
      name: 'Dunes Port', sky: 'town',
      ground: '#e3c98f', accent: '#ffd166',
      buildings: [
        { kind: 'inn',  x: 9,  z: -3, label: 'Inn' },
        { kind: 'shop', x: -9, z: -3, label: 'Shop' },
        { kind: 'shop', x: 0, z: 8, label: 'Armory' },
        { kind: 'house', x: 8, z: 8, wall: '#e6d2a4', roof: '#b0552f' },
        { kind: 'house', x: -8, z: 8, wall: '#dcc89a', roof: '#5a7a8a' },
        { kind: 'house', x: 8, z: -8, wall: '#e0d0aa', roof: '#7a5aa0' },
      ],
      npcs: [
        { name: 'Innkeeper Mara', color: '#a05a3a', x: 9, z: -0.5, service: 'inn',
          lines: ['Dunes Port welcomes weary heroes.', 'A good rest cures most everything.'] },
        { name: 'Trader Quil', color: '#3a8a8a', x: -9, z: -0.5, service: 'shop',
          lines: ['Rare goods from distant shores!', 'Phoenix Downs are worth every coin.'] },
        { name: 'Armorer Dune', color: '#8a6a3a', x: 0, z: 5.5, service: 'shop',
          lines: ['Desert-forged blades and a wall of materia!', 'Gear up — the spire shows no mercy.'] },
        { name: 'Nomad Sable', color: '#7a4a8a', hair: '#2a1a10', x: -4, z: 4,
          lines: ['The dunes shift, but coin is coin.', 'Heard the sea-maidens grant... blessings to those who charm them. Heh.'] },
        { name: 'Captain Vale', color: '#8a3a3a', hair: '#2a1a10', x: 0, z: 4,
          lines: ['So you mean to face Selachoth himself?', 'I knew him once — when he was still a man. A SOLDIER. A hero, even.', 'The abyss took him. He fused with the apex of the deep and came back... wrong. Beautiful and terrible.', 'Your swordsman, Lance — he trained under that same banner. This is personal for him.'] },
        { name: 'Bard Echo', color: '#5a5ac0', hair: '#caa030', x: 4, z: 7,
          lines: ['♪ Oh the One-Finned Angel, silver and cold... ♪', '♪ He drowns the warm world to remake it his own... ♪', 'They say his blade Tidemourn is longer than a mast. Mind your distance!'] },
      ],
      exit: { x: 0, z: -11 },
    },
    mall: {
      name: 'The Grand Bazaar', ground: '#c9c0d8', accent: '#ff9ec0',
      buildings: [
        { kind: 'shop', x: -9, z: -2, label: 'Armory' },
        { kind: 'shop', x: 9, z: -2, label: 'Emporium' },
        { kind: 'house', x: -9, z: 9, wall: '#d8d0e8', roof: '#a05aa0' },
        { kind: 'house', x: 9, z: 9, wall: '#e0d0e0', roof: '#5a7aa0' },
        { kind: 'house', x: 0, z: 12, wall: '#d0c8e0', roof: '#7a5aa0', w: 6, d: 5 },
        { kind: 'house', x: -4, z: 9, wall: '#dcd2ec', roof: '#3a6a8a' },
      ],
      npcs: [
        { name: 'A Famous Plumber', color: '#d83a3a', hair: '#3a2a18', x: -9, z: 0.5, service: 'shop',
          lines: ['It\'sa me — a legally-distinct plumber!', 'I sell-a the most powerful weapons in any franchise. Take a look!'] },
        { name: 'A Blue Hedgehog', color: '#3a6ad8', x: 9, z: 0.5, service: 'shop',
          lines: ['Gotta SHOP fast!', 'Top-tier gear, way past cool. Rings accepted... I mean gold.'] },
        { name: 'A Green-Clad Hero', color: '#2f8d52', hair: '#caa030', x: -4, z: 6, service: 'shop',
          lines: ['It\'s dangerous to shop alone — luckily I run a stall!', 'I\'m after a princess and a triangle. Long story. Browse my wares.'] },
        { name: 'An Electric Mouse', color: '#f6d23a', hair: '#d83a3a', x: 4, z: 6, service: 'shop',
          lines: ['Pika! (Translation: welcome to my shop!)', 'Pi-ka-CHU! (Buy the ultimate weapons, they\'re worth it.)'] },
        { name: 'A Lombax Mechanic', color: '#d8923a', x: 0, z: 8, service: 'shop',
          lines: ['Ratchet up your firepower!', 'These ultimate weapons are out of this world. Literally. Take a look.'] },
        { name: 'A Brooding Spiky Teen', color: '#3a3f6b', hair: '#caa030', x: 5, z: 9,
          lines: ['...', '...Not interested. (He clearly wandered in from another RPG.)'] },
      ],
      exit: { x: 0, z: -12 },
    },
  };

  // ---------------- ISLANDS (each is its own walkable overworld) ----------------
  // Reach islands by ship from the SEA map. Each has a town (with shop), a
  // dungeon, roaming encounters, and a dock back to the ship.
  const ISLANDS = {
    tidehaven: {
      name: 'Tidehaven Isle', size: 52, ground: '#5fa86a', sand: '#e7c890', water: '#1e6f96', sky: { top: '#2a5a9a', horizon: '#dfeef8' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'tidehaven', x: -13, z: 5, color: '#8fd3f4' },
      dungeon: { key: 'tide_cave', x: 11, z: 7, color: '#9be7ff' },
      encounters: [
        { x: -4, z: 9, pool: ['gull', 'jelly'], min: 1, max: 2 },
        { x: 7, z: 11, pool: ['shark', 'crab'], min: 1, max: 2 },
      ],
      decor: { trees: 12, palms: 8, rocks: 8 }, shells: { x: 13, z: 9 }, mermaids: [ { key: 'ember', x: -7, z: -5 }, { key: 'nerida', x: 7, z: -6 } ],
    },
    dunes: {
      name: 'Dunes Isle', size: 52, ground: '#cdb06a', sand: '#e7c890', water: '#1e6f96', sky: { top: '#3a6a9a', horizon: '#f3e3b8' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'dunesport', x: 13, z: 3, color: '#ffd166' },
      dungeon: { key: 'dune_tomb', x: -11, z: 8, color: '#ffcf6a' },
      encounters: [
        { x: 4, z: 9, pool: ['octo', 'jelly', 'gull'], min: 2, max: 3 },
        { x: -6, z: 11, pool: ['golem', 'crab'], min: 1, max: 2 },
      ],
      decor: { trees: 6, palms: 12, rocks: 12 }, shells: { x: -13, z: -6 }, mermaids: [ { key: 'volta', x: 5, z: -7 }, { key: 'gaia', x: -5, z: -7 } ],
    },
    spire: {
      name: 'Abyssal Isle', size: 50, ground: '#3a3a52', sand: '#5a5070', water: '#10182e', sky: { top: '#070a18', horizon: '#3a2f52' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'abyss_vault', x: -11, z: 6, color: '#c0c8ff' },
      encounters: [
        { x: 6, z: 9, pool: ['golem', 'octo'], min: 2, max: 3 },
        { x: -5, z: 11, pool: ['shark', 'golem', 'octo'], min: 3, max: 3 },
      ],
      boss: { x: 0, z: 12, color: '#ff3a3a' },
      decor: { trees: 2, palms: 2, rocks: 9 }, shells: { x: 12, z: 6 }, mermaids: [ { key: 'nyx', x: -6, z: -6 }, { key: 'lumina', x: 6, z: -5 } ],
    },
    mall: {
      name: 'Mall Isle', size: 46, ground: '#b8b0c8', sand: '#d8d0e0', water: '#1e6f96', sky: { top: '#6a5ab0', horizon: '#f3d8ee' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'mall', x: 0, z: 5, color: '#ff9ec0' },
      encounters: [],
      decor: { trees: 4, palms: 6, rocks: 4 },
    },
    duskmoor: {
      name: 'Duskmoor Isle', size: 50, ground: '#2a2230', sand: '#3a2e3a', water: '#101018', sky: { top: '#070410', horizon: '#2a0e22' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'vampire_keep', x: 0, z: 9, color: '#b03050' },
      encounters: [
        { x: -6, z: 9, pool: ['bat', 'ghoul'], min: 2, max: 3 },
        { x: 7, z: 11, pool: ['wraith', 'bat'], min: 2, max: 2 },
      ],
      decor: { trees: 6, palms: 0, rocks: 10 },
    },
  };

  // ---------------- SEA (sail between islands) ----------------
  const SEA = {
    size: 130, spawn: { x: 0, z: -10 },
    islands: [
      { key: 'tidehaven', x: -34, z: 8 },
      { key: 'dunes', x: 30, z: -2 },
      { key: 'spire', x: 4, z: -42 },
      { key: 'mall', x: -10, z: 34 },
      { key: 'duskmoor', x: 44, z: 30 },
    ],
    ships: [
      { id: 's0', type: 'sloop', x: -10, z: 20 },
      { id: 's1', type: 'frigate', x: 22, z: 24 },
      { id: 's2', type: 'ghost', x: -16, z: -28 },
    ],
  };

  // ---------------- DUNGEONS (one per island, with a crystal-order puzzle) ----------------
  // Touch the colored crystals in the order the riddle hints. Solve it to open
  // the vault and claim the treasure, then take the exit back to the island.
  const DUNGEONS = {
    tide_cave: {
      name: 'Tide Cave', island: 'tidehaven', ground: '#3a4a5a', wall: '#2a3340',
      spawn: { x: 0, z: -8 }, exit: { x: 0, z: -10 }, gate: { x: 0, z: 8 }, chest: { x: 0, z: 11 },
      hint: 'Riddle: "Sunset bleeds, then deepest sea, then the meadow welcomes thee."',
      crystals: [ { color: '#ff5e5e', name: 'red', x: -6, z: 2 }, { color: '#5e8bff', name: 'blue', x: 0, z: 4 }, { color: '#5eff8b', name: 'green', x: 6, z: 2 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -2, pool: ['crab', 'jelly'], min: 1, max: 2 }, { x: 8, z: -1, pool: ['shark', 'eel'], min: 2, max: 2 } ],
      reward: { gold: 120, shell: 'triton_blast' },
    },
    dune_tomb: {
      name: 'Dune Tomb', island: 'dunes', ground: '#6a5a3a', wall: '#4a3f2a',
      spawn: { x: 0, z: -8 }, exit: { x: 0, z: -10 }, gate: { x: 0, z: 8 }, chest: { x: 0, z: 11 },
      hint: 'Riddle: "Gold of the dune, green of the oasis, blue of the well — in that order, seek your grace."',
      crystals: [ { color: '#ffcf4a', name: 'gold', x: -6, z: 2 }, { color: '#5eff8b', name: 'green', x: 6, z: 2 }, { color: '#5e8bff', name: 'blue', x: 0, z: 4 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -2, pool: ['urchin', 'golem'], min: 1, max: 2 }, { x: 8, z: 0, pool: ['ghoul', 'urchin'], min: 2, max: 2 }, { x: 0, z: 14, pool: ['golem', 'ghoul', 'urchin'], min: 2, max: 3 } ],
      reward: { gold: 200, shell: 'nautilus_surge' },
    },
    abyss_vault: {
      name: 'Abyssal Vault', island: 'spire', ground: '#23283a', wall: '#161a28',
      spawn: { x: 0, z: -8 }, exit: { x: 0, z: -10 }, gate: { x: 0, z: 8 }, chest: { x: 0, z: 11 },
      hint: 'Riddle: "Violet abyss, pale moon, then the dying ember last of all."',
      crystals: [ { color: '#b06aff', name: 'violet', x: -6, z: 2 }, { color: '#dfe7ef', name: 'white', x: 0, z: 4 }, { color: '#ff7e3a', name: 'ember', x: 6, z: 2 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -2, pool: ['wraith', 'ghoul'], min: 2, max: 2 }, { x: 8, z: -1, pool: ['octo', 'wraith'], min: 2, max: 3 }, { x: 0, z: 14, pool: ['wraith', 'ghoul', 'octo'], min: 3, max: 3 } ],
      reward: { gold: 400, shell: 'tiger_crit' },
    },
    vampire_keep: {
      name: 'Castle Crimsontide', island: 'duskmoor', ground: '#241620', wall: '#16101a', sky: { top: '#0a0410', horizon: '#2a0e1e' },
      spawn: { x: 0, z: -8 }, exit: { x: 0, z: -10 }, gate: { x: 0, z: 8 }, chest: { x: 0, z: 11 },
      hint: 'Castle Crimsontide — the air is thick with the iron-smell of old blood. Cut a path to the throne at the far end and end the Count.',
      crystals: [],
      vampire: true,
      mobs: [ { x: -8, z: -2, pool: ['bat', 'bat', 'ghoul'], min: 2, max: 3 }, { x: 8, z: -1, pool: ['wraith', 'bat'], min: 2, max: 2 }, { x: -7, z: 6, pool: ['ghoul', 'wraith'], min: 2, max: 2 } ],
      bossMob: { x: 0, z: 12, key: 'vampire' },
      reward: { gold: 900, shell: 'triton_blast' },
    },
  };

  // ---------------- STORY (cutscene beats) ----------------
  // each beat: { name, text }
  const STORY = {
    opening: [
      { name: 'Narrator', text: 'For a thousand years the coast of Saltmere knew only gentle tides and golden mornings. The Free Seas were a promise: that anyone, from any shore, could chase a horizon and call it home.' },
      { name: 'Narrator', text: 'Then the sea began to RISE. Not in a day — in a slow, drowning patience. Beaches vanished. Beasts crawled from the foam. And the people learned a name to be afraid of.' },
      { name: 'Narrator', text: 'SELACHOTH. The One-Finned Angel. Once the greatest hero the Free Seas ever produced — now half-man, half-shark, and wholly convinced that a warm world of the living is a mistake the ocean must correct.' },
      { name: 'Lance Strider', text: 'He was my mentor. I watched the sea take him piece by piece, and I told myself a hero couldn\'t fall. I was wrong. So I\'ll be the one to put him down.' },
      { name: 'Marina', text: 'And I am sworn to the tides themselves. They weep under his hand. I\'ll not let the deep be turned into a tomb.' },
      { name: 'Capt. Redbeard', text: 'Bah — speeches. I just want my coast back, and my grog dry. Whatever crew we cobble together, we sail at dawn.' },
      { name: 'Narrator', text: 'But the road east is long, and you will not walk it alone. Some who join you chase glory, some chase ghosts — and one chases a dream so bright it will cost him everything.' },
    ],
    ruffyJoin: [
      { name: '???', text: 'SHISHISHI! You lot look like you\'re off to do something STUPID and HEROIC. I LOVE stupid and heroic!' },
      { name: 'Ruffy', text: 'Name\'s Ruffy! Rubber-man, future King of the Free Seas! That title\'s MINE — but a drowned ocean\'s got no king, so I guess I gotta help you save it first.' },
      { name: 'Lance Strider', text: 'We\'re not running a circus, kid.' },
      { name: 'Ruffy', text: 'Good, \'cause I\'m not funny, I\'m STRONG! Gum-Gum—! ...okay watch THIS later. I\'m coming with you. RIVALS gotta keep an eye on each other, yeah?' },
      { name: 'Narrator', text: 'Ruffy the Rubber Rival joins your party! (Manage your active crew with the PARTY menu — press T.) He fights, levels, and grows just like the rest — for as long as he stays.' },
    ],
    krakenFall: [
      { name: 'Narrator', text: 'The Kraken sinks beneath a ring of foam. Far to the east, the black spire stops glowing red — and turns cold, and silver, and patient.' },
      { name: 'Lance Strider', text: 'The guardian\'s down. The road to Selachoth is open.' },
      { name: 'Marina', text: 'I can feel him now... the sea recoils from his very name. But there\'s something else. A grief under the malice. He doesn\'t hate the world. He thinks he\'s SAVING it.' },
      { name: 'Selachoth', text: '(A voice rides the wind from the spire.) "...Impressive. You killed my pet. Come, then, little tide-runners. Let me show you mercy the world never showed me."' },
    ],
    ruffyLeave: [
      { name: 'Ruffy', text: 'Hey — before you charge the scary shark guy. I gotta go.' },
      { name: 'Capt. Redbeard', text: 'Go? Now?!' },
      { name: 'Ruffy', text: 'There\'s people trapped on the drowning isles south of here. My crew\'s out there too. A king doesn\'t leave his people under water, y\'know? I\'ll catch up. PROMISE.' },
      { name: 'Lance Strider', text: '...Go. We\'ll hold the line. Don\'t you dare break that promise.' },
      { name: 'Narrator', text: 'Ruffy leaves the party to save the drowning isles. (He\'s no longer available — but a promise is a promise.)' },
    ],
    selachothPre: [
      { name: 'Selachoth', text: 'So. You climb my spire on legs the sea will soon reclaim. Lance. You grew. ...Good.' },
      { name: 'Lance Strider', text: 'You taught me everything. Then you taught me what it looks like when a hero stops believing people are worth saving.' },
      { name: 'Selachoth', text: 'Because they AREN\'T, boy. I gave them everything and they drowned me in their wars regardless. The ocean is honest. The ocean is CLEAN. I will give the whole world that peace.' },
      { name: 'Marina', text: 'That isn\'t peace. That\'s a grave with no one left to grieve it.' },
      { name: 'Selachoth', text: 'Then grieve now. The tide above this spire is a thousand fathoms high, and I have only to let it FALL.' },
    ],
    ruffySacrifice: [
      { name: 'Ruffy', text: 'OI! SHARK-FOR-BRAINS!' },
      { name: 'Capt. Redbeard', text: 'Ruffy?! You kept the promise—' },
      { name: 'Ruffy', text: 'Told ya I\'d catch up! Saved the isles, too. SHISHI—!' },
      { name: 'Selachoth', text: 'The wave falls NOW. Drown, all of you.' },
      { name: 'Ruffy', text: 'Not them. GUM-GUM... CANOPY!' },
      { name: 'Narrator', text: 'Ruffy stretches his rubber body into an impossible dome, catching a wall of ocean meant to erase the whole party. He holds. And holds. The sea screams against him.' },
      { name: 'Ruffy', text: '(grinning, straining) "Go... finish it. A king\'s gotta... give his people a horizon... even if he doesn\'t... get to sail it. ...Become somebody worth the title, yeah?"' },
      { name: 'Narrator', text: 'The wave breaks. Ruffy is gone beneath it — but the party stands, unbroken, fire in their eyes. (The crew fights on, emboldened: full HP/MP and limit gauges, in his memory.)' },
    ],
    selachothFall: [
      { name: 'Selachoth', text: 'Impossible... the warm world... still clings to its shore...' },
      { name: 'Lance Strider', text: 'It clings because people fight for it. Because a kid just gave his whole dream so we could stand here. THAT\'s the thing you forgot.' },
      { name: 'Selachoth', text: '...Perhaps. Perhaps I should have... let the morning... in.' },
      { name: 'Marina', text: 'Rest now, old hero. The tide will carry you somewhere gentler than what you became.' },
      { name: 'Narrator', text: 'The One-Finned Angel dissolves into seafoam. The horizon warms. And somewhere, the people of a hundred saved islands raise a cheer for a rubber-limbed king who never wore a crown.' },
    ],
    simonJoin: [
      { name: 'Narrator', text: 'Duskmoor Isle. No gulls, no surf — only a black castle against a bleeding moon, and the smell of old iron on the wind.' },
      { name: '???', text: '(A whip cracks across the gate, severing a lunging shadow in two.) "Stand back. This is hunter\'s work."' },
      { name: 'Simon', text: 'Name\'s Simon. My bloodline has hunted the thing that sleeps in this castle for nine generations. The tide woke it early. It calls itself COUNT SALTORRE now.' },
      { name: 'Lance Strider', text: 'A vampire. Of course there\'s a vampire.' },
      { name: 'Simon', text: 'I can\'t breach the throne room alone — and you can\'t survive it without me. So we go together. Just for tonight. When the Count is ash, I walk my own road again.' },
      { name: 'Narrator', text: 'Simon the Vampire Hunter joins your party as a fourth member — for as long as you stay in Castle Crimsontide. He fights, levels and breaks limits just like the rest. (Leave the castle and he holds the gate; clear it and he moves on.)' },
    ],
    vampirePre: [
      { name: 'Count Saltorre', text: 'Guests. How rare. The sea brought me a fresh tide of warmth, and a Belmont to season it.' },
      { name: 'Simon', text: 'Nine generations, Count. Tonight the debt comes due.' },
      { name: 'Count Saltorre', text: 'Your forefathers said the same, hunter — and I drank every one. WHAT IS A MAN? A miserable little pile of low tide! ...Have at you.' },
    ],
    vampireFall: [
      { name: 'Count Saltorre', text: 'Impossible... dragged back into the dark... by the warm and the living together...' },
      { name: 'Simon', text: 'That\'s the difference between us, Count. I never hunted alone. I just forgot it for a while.' },
      { name: 'Narrator', text: 'Count Saltorre crumbles to red dust and is scattered by the sea wind. The moon over Duskmoor pales to a clean white.' },
    ],
    simonLeave: [
      { name: 'Simon', text: 'It\'s done. The castle\'s quiet for the first time in nine generations.' },
      { name: 'Capt. Redbeard', text: 'Stay on, lad. A crew could use a man who hunts monsters for sport.' },
      { name: 'Simon', text: 'Tempting. But there\'s always another castle, another night, another thing in the dark. That\'s a Belmont\'s road, and I walk it alone. ...Mostly.' },
      { name: 'Simon', text: '(He coils the whip and tips his head.) "You fight well, for sailors. If the tide ever brings you back to Duskmoor — the gate\'s open." ' },
      { name: 'Narrator', text: 'Simon leaves the party and vanishes into the moonlight. (He is no longer available — but Castle Crimsontide remembers.)' },
    ],
  };

  // ---------------- PROGRESSION ----------------
  const xpForLevel = (lvl) => Math.round(28 * Math.pow(lvl, 1.55)); // xp needed to go from lvl -> lvl+1
  const MAX_LEVEL = 30;

  function randomEncounter(enc) {
    const count = Math.floor(Math.random() * (enc.max - enc.min + 1)) + enc.min;
    const keys = [];
    for (let i = 0; i < count; i++) keys.push(enc.pool[Math.floor(Math.random() * enc.pool.length)]);
    return keys;
  }

  return { PARTY, ENEMIES, ITEM_DEFS, SHOP_STOCK, SHOP_STOCK_BY_TOWN, MATERIALS, RECIPES, WEAPONS, SHELLS, SHOP_SHELLS, shellAbility, TOWNS, ISLANDS, SEA, DUNGEONS, STORY,
           ELEMENT_INFO, elementOf, affMult, AFFINITIES, LIMITS, weaponIcon, shellIcon, SHIP, SHIP_CUSTOM, SHIP_UPGRADES, ENEMY_SHIPS, SHELL_HUNT, MERMAIDS, AMBUSH,
           xpForLevel, MAX_LEVEL, randomEncounter };
})();
