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
  ];

  const ENEMIES = {
    shark:  { name: 'Maneater Shark',   model: 'shark',  hp: 90,  xp: 22, gold: 14, baseY: 0,   moves: [ { name: 'sinks its teeth in', min: 12, max: 18 }, { name: 'whips its tail', min: 15, max: 22 } ] },
    crab:   { name: 'Giant Hermit Crab', model: 'crab',  hp: 120, xp: 26, gold: 18, baseY: 0,   moves: [ { name: 'snaps a giant claw', min: 14, max: 20 }, { name: 'bashes with its shell', min: 17, max: 24 } ] },
    jelly:  { name: "Man-o'-War Jelly",  model: 'jelly', hp: 64,  xp: 18, gold: 10, baseY: 0.2, moves: [ { name: 'stings sharply', min: 10, max: 16 }, { name: 'discharges a shock', min: 10, max: 15, all: true } ] },
    octo:   { name: 'Reef Octopus',      model: 'octo',  hp: 104, xp: 28, gold: 20, baseY: 0.1, moves: [ { name: 'slams a tentacle', min: 16, max: 22 }, { name: 'sprays stinging ink', min: 8, max: 13, all: true } ] },
    gull:   { name: 'Dive-Bomb Gull',    model: 'gull',  hp: 56,  xp: 16, gold: 9,  baseY: 1.4, moves: [ { name: 'pecks rapidly', min: 9, max: 14 }, { name: 'dive-bombs', min: 18, max: 26 } ] },
    golem:  { name: 'Sandcastle Golem',  model: 'golem', hp: 140, xp: 34, gold: 26, baseY: 0,   moves: [ { name: 'slams a sandy fist', min: 16, max: 24 }, { name: 'crumbles down', min: 12, max: 19, all: true } ] },
    kraken: { name: 'The Kraken',        model: 'kraken', hp: 360, xp: 160, gold: 200, baseY: 0, boss: true, moves: [ { name: 'crushes with a tentacle', min: 24, max: 34 }, { name: 'unleashes a maelstrom', min: 18, max: 26, all: true }, { name: 'snaps its colossal beak', min: 30, max: 42 } ] },
    selachoth: { name: 'Selachoth', model: 'selachoth', hp: 560, xp: 500, gold: 800, baseY: 0.2, boss: true, moves: [
      { name: 'cleaves with Tidemourn', min: 34, max: 46 },
      { name: 'sweeps the blade in an arc', min: 22, max: 30, all: true },
      { name: 'calls down a crushing Deluge', min: 30, max: 42 },
      { name: 'descends — One-Finned Requiem', min: 42, max: 56 },
    ] },
  };

  // shared inventory items (consumables)
  const ITEM_DEFS = {
    potion:  { name: 'Potion',       kind: 'heal',   amount: 55,  target: 'ally',  fx: 'heal', price: 30 },
    hipotion:{ name: 'Hi-Potion',    kind: 'heal',   amount: 120, target: 'ally',  fx: 'heal', price: 90 },
    ether:   { name: 'Ether',        kind: 'mana',   amount: 30,  target: 'ally',  fx: 'mana', price: 80 },
    phoenix: { name: 'Phoenix Down', kind: 'revive',              target: 'dead',  fx: 'heal', price: 120 },
    bomb:    { name: 'Powder Bomb',  kind: 'damage', min: 45, max: 60, target: 'enemy', fx: 'fire', price: 60 },
  };
  const SHOP_STOCK = ['potion', 'hipotion', 'ether', 'phoenix', 'bomb'];

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
  };

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

  // ---------------- TOWNS ----------------
  // npc: { name, color, hair, x, z, lines:[...], service?: 'inn'|'shop' }
  const TOWNS = {
    tidehaven: {
      name: 'Tidehaven', sky: 'town',
      ground: '#cdb98a', accent: '#8fd3f4',
      buildings: [
        { kind: 'inn',  x: -8, z: -4, label: 'Inn' },
        { kind: 'shop', x: 8,  z: -4, label: 'Shop' },
        { kind: 'house', x: -9, z: 7, wall: '#d8c4a0', roof: '#c0653a' },
        { kind: 'house', x: 9,  z: 7, wall: '#e0d0aa', roof: '#7a8a3a' },
        { kind: 'house', x: 0,  z: 11, wall: '#d0bb95', roof: '#3a6a8a', w: 5, d: 5 },
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
      ],
      exit: { x: 0, z: -12 },
    },
    dunesport: {
      name: 'Dunes Port', sky: 'town',
      ground: '#e3c98f', accent: '#ffd166',
      buildings: [
        { kind: 'inn',  x: 9,  z: -3, label: 'Inn' },
        { kind: 'shop', x: -9, z: -3, label: 'Shop' },
        { kind: 'house', x: 8, z: 8, wall: '#e6d2a4', roof: '#b0552f' },
        { kind: 'house', x: -8, z: 8, wall: '#dcc89a', roof: '#5a7a8a' },
      ],
      npcs: [
        { name: 'Innkeeper Mara', color: '#a05a3a', x: 9, z: -0.5, service: 'inn',
          lines: ['Dunes Port welcomes weary heroes.', 'A good rest cures most everything.'] },
        { name: 'Trader Quil', color: '#3a8a8a', x: -9, z: -0.5, service: 'shop',
          lines: ['Rare goods from distant shores!', 'Phoenix Downs are worth every coin.'] },
        { name: 'Captain Vale', color: '#8a3a3a', hair: '#2a1a10', x: 0, z: 4,
          lines: ['So you mean to face Selachoth himself?', 'I knew him once — when he was still a man. A SOLDIER. A hero, even.', 'The abyss took him. He fused with the apex of the deep and came back... wrong. Beautiful and terrible.', 'Your swordsman, Lance — he trained under that same banner. This is personal for him.'] },
        { name: 'Bard Echo', color: '#5a5ac0', hair: '#caa030', x: 4, z: 7,
          lines: ['♪ Oh the One-Finned Angel, silver and cold... ♪', '♪ He drowns the warm world to remake it his own... ♪', 'They say his blade Tidemourn is longer than a mast. Mind your distance!'] },
      ],
      exit: { x: 0, z: -11 },
    },
  };

  // ---------------- WORLD MAP ----------------
  // Encounters: { x, z, color, enemies:[keys], boss? } — touch the roamer to fight.
  const WORLD = {
    size: 64, ground: '#5fa86a', sand: '#e7c890', water: '#1e6f96',
    spawn: { x: 0, z: -6 },
    towns: [
      { key: 'tidehaven', x: -14, z: 6, color: '#8fd3f4' },
      { key: 'dunesport', x: 16, z: -2, color: '#ffd166' },
    ],
    encounters: [
      { x: -4, z: 8,  pool: ['gull', 'jelly'], min: 1, max: 2 },
      { x: 6, z: 10,  pool: ['shark', 'crab'], min: 1, max: 2 },
      { x: 12, z: 12, pool: ['octo', 'jelly', 'gull'], min: 2, max: 3 },
      { x: -10, z: -8, pool: ['crab', 'golem'], min: 1, max: 2 },
      { x: 2, z: -12, pool: ['shark', 'octo', 'golem'], min: 2, max: 3 },
      { x: 20, z: 8,  pool: ['golem', 'crab', 'octo'], min: 3, max: 3 },
    ],
    boss: { x: 24, z: -14, color: '#ff3a3a', enemies: ['kraken'], boss: true },
    decor: { trees: 14, palms: 10, rocks: 12 },
  };

  // ---------------- STORY (cutscene beats) ----------------
  // each beat: { name, text }
  const STORY = {
    opening: [
      { name: 'Narrator', text: 'For a thousand years the coast of Saltmere knew only gentle tides and golden mornings...' },
      { name: 'Narrator', text: 'Then the sea turned against the land. Beasts crawled from the foam. The horizon went grey.' },
      { name: 'Narrator', text: 'They speak of one who walks the line between man and shark — SELACHOTH, the One-Finned Angel. He means to drown the warm world and remake it beneath the waves.' },
      { name: 'Capt. Redbeard', text: 'Three of us answered the call. A pirate with a grudge...' },
      { name: 'Marina', text: '...a priestess of the tides, sworn to hold back the dark...' },
      { name: 'Lance Strider', text: '...and me. I have a score to settle with him. Let\'s move.' },
      { name: 'Narrator', text: 'Slay his guardian, the Kraken, to open the road to his spire. Grow strong. The tide is rising.' },
    ],
    krakenFall: [
      { name: 'Narrator', text: 'The Kraken sinks beneath a ring of foam. Far to the east, a black spire stops glowing red — and turns cold and silver.' },
      { name: 'Lance Strider', text: 'The guardian\'s down. The path to Selachoth is open.' },
      { name: 'Marina', text: 'I feel him now... the sea itself recoils from his name. Are you ready, Lance?' },
      { name: 'Lance Strider', text: 'I\'ve been ready for years. Let\'s end this.' },
    ],
    selachothPre: [
      { name: 'Selachoth', text: 'So. The little tide-runners reach my spire at last.' },
      { name: 'Selachoth', text: 'I was a hero once, like you. I bled for a world that thanked me with rust and ruin. So I returned to the sea — and the sea made me perfect.' },
      { name: 'Lance Strider', text: 'You were my mentor. You taught me to hold a blade. And you threw it all into the abyss.' },
      { name: 'Selachoth', text: 'I ascended, Lance. Soon every shore will be a reef, every breath a tide. Kneel, and I will let you drown gently.' },
      { name: 'Lance Strider', text: 'Not today. Not ever. Crew — on me!' },
    ],
    selachothFall: [
      { name: 'Selachoth', text: 'Impossible... the warm world... still... clings to its shore...' },
      { name: 'Lance Strider', text: 'It clings because people fight for it. Something you forgot.' },
      { name: 'Selachoth', text: 'Then remember me... as the tide that almost... turned...' },
      { name: 'Narrator', text: 'The One-Finned Angel dissolves into seafoam. The horizon warms. The morning, at last, is gold again.' },
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

  return { PARTY, ENEMIES, ITEM_DEFS, SHOP_STOCK, WEAPONS, SHELLS, SHOP_SHELLS, shellAbility, TOWNS, WORLD, STORY, xpForLevel, MAX_LEVEL, randomEncounter };
})();
