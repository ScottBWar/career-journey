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
      base: { hp: 144, mp: 26, atkMin: 18, atkMax: 27, crit: 0.13 },
      growth: { hp: 15, mp: 3, atk: 3 },
      baseAbilities: [ ab('Cannon Blast', { mp: 8, min: 26, max: 38, target: 'enemy', fx: 'fire', proj: true }) ],
      tree: [
        { id: 'p_hp1', name: 'Sea Legs', desc: '+25 Max HP', cost: 1, kind: 'stat', stat: { hp: 25 } },
        { id: 'p_atk1', name: 'Cutlass Mastery', desc: '+4 Attack', cost: 1, req: 'p_hp1', kind: 'stat', stat: { atk: 4 } },
        // ⟜ PATH: Gunner — ranged, all-foe firepower
        { id: 'p_a1', branch: 'a', name: 'Broadside', desc: 'PATH: Gunner — fire at all foes', cost: 1, req: 'p_atk1', kind: 'ability', ability: ab('Broadside', { mp: 14, min: 22, max: 32, target: 'all', fx: 'fire' }) },
        { id: 'p_a2', branch: 'a', name: 'Dead Eye', desc: '+14% Crit', cost: 2, req: 'p_a1', kind: 'stat', stat: { crit: 0.14 } },
        { id: 'p_acap', branch: 'a', name: 'Hurricane', desc: 'Massive all-foe storm', cost: 3, req: 'p_a2', kind: 'ability', ability: ab('Hurricane', { mp: 24, min: 40, max: 56, target: 'all', fx: 'water' }) },
        // ⟜ PATH: Captain — rally and protect the crew
        { id: 'p_b1', branch: 'b', name: 'Rally', desc: 'PATH: Captain — Attack Up to all allies', cost: 1, req: 'p_atk1', kind: 'ability', ability: ab('Rally', { mp: 12, min: 0, max: 0, target: 'allparty', fx: 'beam', status: 'atkup', turns: 4 }) },
        { id: 'p_b2', branch: 'b', name: 'Sea Dog Grit', desc: '+35 Max HP', cost: 2, req: 'p_b1', kind: 'stat', stat: { hp: 35 } },
        { id: 'p_bcap', branch: 'b', name: 'All Hands!', desc: 'Haste + Regen to all allies', cost: 3, req: 'p_b2', kind: 'ability', ability: ab('All Hands!', { mp: 24, min: 0, max: 0, target: 'allparty', fx: 'beam', status: ['haste', 'regen'], turns: 4 }) },
        // ⟜ gunpowder elements — bigger booms + a thunder volley
        { id: 'p_powder', name: 'Powder Monkey', desc: '+6 Special (bigger booms)', cost: 1, req: 'p_atk1', kind: 'stat', stat: { spec: 6 } },
        { id: 'p_thunder', branch: 'a', name: 'Chain Shot', desc: 'Crackling thunder rounds rake all foes', cost: 2, req: 'p_a1', kind: 'ability', ability: ab('Chain Shot', { mp: 16, min: 24, max: 34, target: 'all', fx: 'beam', el: 'thunder' }) },
      ],
    },
    {
      key: 'swordsman', name: 'Lance Strider', role: 'SOLDIER', model: 'swordsman',
      base: { hp: 174, mp: 18, atkMin: 25, atkMax: 38, crit: 0.16, big: true },
      growth: { hp: 18, mp: 2, atk: 4 },
      baseAbilities: [ ab('Blade Beam', { mp: 10, min: 38, max: 52, target: 'enemy', fx: 'beam' }) ],
      tree: [
        { id: 's_hp1', name: 'Toughness', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 's_atk1', name: 'Heavy Swings', desc: '+5 Attack', cost: 1, req: 's_hp1', kind: 'stat', stat: { atk: 5 } },
        // ⟜ PATH: Warrior — pure, escalating swordplay
        { id: 's_a1', branch: 'a', name: 'Braver', desc: 'PATH: Warrior — big single-target leap', cost: 1, req: 's_atk1', kind: 'ability', ability: ab('Braver', { mp: 12, min: 52, max: 70, target: 'enemy', fx: 'beam' }) },
        { id: 's_a2', branch: 'a', name: 'Berserk Edge', desc: '+16% Crit', cost: 2, req: 's_a1', kind: 'stat', stat: { crit: 0.16 } },
        { id: 's_acap', branch: 'a', name: 'Omnislash', desc: 'Devastate all foes', cost: 3, req: 's_a2', kind: 'ability', ability: ab('Omnislash', { mp: 28, min: 46, max: 64, target: 'all', fx: 'beam' }) },
        // ⟜ PATH: Spellblade — sword + time magic (Tidus-style)
        { id: 's_b1', branch: 'b', name: 'Hastega Edge', desc: 'PATH: Spellblade — Haste all allies', cost: 1, req: 's_atk1', kind: 'ability', ability: ab('Hastega Edge', { mp: 16, min: 0, max: 0, target: 'allparty', fx: 'beam', status: 'haste', turns: 4 }) },
        { id: 's_b2', branch: 'b', name: 'Delay Slash', desc: 'Thunder strike that Slows a foe', cost: 2, req: 's_b1', kind: 'ability', ability: ab('Delay Slash', { mp: 14, min: 30, max: 42, target: 'enemy', fx: 'beam', el: 'thunder', status: 'slow', turns: 3 }) },
        { id: 's_bcap', branch: 'b', name: 'Spiral Cut', desc: 'Hits all foes & Weakens them', cost: 3, req: 's_b2', kind: 'ability', ability: ab('Spiral Cut', { mp: 26, min: 34, max: 48, target: 'all', fx: 'beam', el: 'thunder', status: 'weaken', turns: 3 }) },
        // ⟜ a fire option so the Spellblade covers more than thunder
        { id: 's_fire', branch: 'b', name: 'Flametongue', desc: 'A blazing fire slash on a foe', cost: 2, req: 's_b1', kind: 'ability', ability: ab('Flametongue', { mp: 12, min: 36, max: 50, target: 'enemy', fx: 'fire', el: 'fire' }) },
      ],
    },
    {
      key: 'healer', name: 'Marina', role: 'Tide Priestess', model: 'healer',
      base: { hp: 120, mp: 52, atkMin: 8, atkMax: 14, crit: 0.05 },
      growth: { hp: 12, mp: 6, atk: 2 },
      // the party's elemental engine now that Pip is gone — innate Water/Earth/Fire/Thunder,
      // with Holy & Dark unlocked in her tree (full six-element coverage)
      baseAbilities: [
        ab('Mend', { mp: 6, min: 40, max: 56, target: 'ally', fx: 'heal', heal: true }),
        ab('Brine Bolt', { mp: 8, min: 24, max: 34, target: 'enemy', fx: 'water' }),
        ab('Coral Spire', { mp: 9, min: 28, max: 40, target: 'enemy', fx: 'beam', el: 'earth' }),
        ab('Embertide', { mp: 9, min: 28, max: 42, target: 'enemy', fx: 'fire', proj: true }),
        ab('Stormcall', { mp: 10, min: 26, max: 38, target: 'enemy', fx: 'beam', el: 'thunder' }),
      ],
      tree: [
        { id: 'h_mp1', name: 'Deep Well', desc: '+15 Max MP', cost: 1, kind: 'stat', stat: { mp: 15 } },
        { id: 'h_hp1', name: 'Resolve', desc: '+25 Max HP', cost: 1, req: 'h_mp1', kind: 'stat', stat: { hp: 25 } },
        // ⟜ PATH: Tide Priestess — devoted healer & protector
        { id: 'h_a1', branch: 'a', name: 'Tidal Blessing', desc: 'PATH: Priestess — heal the whole party', cost: 1, req: 'h_hp1', kind: 'ability', ability: ab('Tidal Blessing', { mp: 16, min: 30, max: 42, target: 'allparty', fx: 'heal', heal: true }) },
        { id: 'h_a2', branch: 'a', name: 'Megaheal', desc: 'Huge single-target heal', cost: 2, req: 'h_a1', kind: 'ability', ability: ab('Megaheal', { mp: 18, min: 80, max: 110, target: 'ally', fx: 'heal', heal: true }) },
        { id: 'h_acap', branch: 'a', name: "Ocean's Mercy", desc: 'Heal all allies + grant Regen', cost: 3, req: 'h_a2', kind: 'ability', ability: ab("Ocean's Mercy", { mp: 28, min: 40, max: 56, target: 'allparty', fx: 'heal', heal: true, status: 'regen', turns: 4 }) },
        // ⟜ PATH: Tide Witch — turn the sea against your foes
        { id: 'h_b1', branch: 'b', name: 'Maelstrom', desc: 'PATH: Witch — water damage to all foes', cost: 1, req: 'h_hp1', kind: 'ability', ability: ab('Maelstrom', { mp: 16, min: 26, max: 38, target: 'all', fx: 'water' }) },
        { id: 'h_b2', branch: 'b', name: 'Hex', desc: 'Slow + Weaken a foe', cost: 2, req: 'h_b1', kind: 'ability', ability: ab('Hex', { mp: 14, min: 0, max: 0, target: 'enemy', fx: 'beam', el: 'dark', status: ['slow', 'weaken'], turns: 3 }) },
        { id: 'h_bcap', branch: 'b', name: 'Tsunami', desc: 'Devastating water hit on all foes', cost: 3, req: 'h_b2', kind: 'ability', ability: ab('Tsunami', { mp: 26, min: 38, max: 52, target: 'all', fx: 'water' }) },
        // ⟜ deeper mastery: a Special boost + a Holy & a Dark capstone (round out all six elements)
        { id: 'h_spec', name: 'Tidecaller', desc: '+10 Special', cost: 1, req: 'h_hp1', kind: 'stat', stat: { spec: 10 } },
        { id: 'h_holy', branch: 'a', name: 'Radiant Tide', desc: 'Searing holy light over all foes', cost: 3, req: 'h_a2', kind: 'ability', ability: ab('Radiant Tide', { mp: 28, min: 40, max: 56, target: 'all', fx: 'heal', el: 'holy' }) },
        { id: 'h_dark', branch: 'b', name: 'Abyssal Verdict', desc: 'Dark ruin that Weakens all foes', cost: 3, req: 'h_b2', kind: 'ability', ability: ab('Abyssal Verdict', { mp: 28, min: 38, max: 54, target: 'all', fx: 'beam', el: 'dark', status: 'weaken', turns: 3 }) },
      ],
    },
    {
      key: 'ruffy', name: 'Ruffy', role: 'Rubber Rival', model: 'rival', temporary: true,
      base: { hp: 158, mp: 20, atkMin: 23, atkMax: 33, crit: 0.15, big: true },
      growth: { hp: 16, mp: 2, atk: 4 },
      baseAbilities: [ ab('Gum-Gum Pistol', { mp: 8, min: 34, max: 48, target: 'enemy', fx: 'beam', el: 'physical' }) ],
      tree: [
        { id: 'r_hp', name: 'Rubber Body', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 'r_atk', name: 'Fighting Spirit', desc: '+5 Attack', cost: 1, req: 'r_hp', kind: 'stat', stat: { atk: 5 } },
        // ⟜ PATH: Gear — escalating rubber firepower
        { id: 'r_a1', branch: 'a', name: 'Gum-Gum Gatling', desc: 'PATH: Gear — a flurry of fists on all foes', cost: 1, req: 'r_atk', kind: 'ability', ability: ab('Gum-Gum Gatling', { mp: 14, min: 22, max: 32, target: 'all', fx: 'beam', el: 'physical' }) },
        { id: 'r_a2', branch: 'a', name: 'Gear: Boundman', desc: '+14% Crit', cost: 2, req: 'r_a1', kind: 'stat', stat: { crit: 0.14 } },
        { id: 'r_acap', branch: 'a', name: 'Gum-Gum Bazooka', desc: 'A colossal two-fist blow', cost: 3, req: 'r_a2', kind: 'ability', ability: ab('Gum-Gum Bazooka', { mp: 18, min: 64, max: 84, target: 'enemy', fx: 'beam', el: 'physical' }) },
        // ⟜ PATH: Conqueror — Haki that cows foes and lifts the crew
        { id: 'r_b1', branch: 'b', name: "Conqueror's Haki", desc: 'PATH: Conqueror — Weaken ALL foes', cost: 1, req: 'r_atk', kind: 'ability', ability: ab("Conqueror's Haki", { mp: 16, min: 0, max: 0, target: 'all', fx: 'beam', el: 'dark', status: 'weaken', turns: 3 }) },
        { id: 'r_b2', branch: 'b', name: 'Iron Body', desc: '+45 Max HP', cost: 2, req: 'r_b1', kind: 'stat', stat: { hp: 45 } },
        { id: 'r_bcap', branch: 'b', name: "King's Will", desc: 'Attack Up + Haste to all allies', cost: 3, req: 'r_b2', kind: 'ability', ability: ab("King's Will", { mp: 24, min: 0, max: 0, target: 'allparty', fx: 'beam', status: ['atkup', 'haste'], turns: 4 }) },
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
    {
      key: 'aladdin', name: 'Aladdin', role: 'Street Rat', model: 'aladdin', temporary: true,
      base: { hp: 150, mp: 24, atkMin: 22, atkMax: 32, crit: 0.20 },
      growth: { hp: 15, mp: 3, atk: 4 },
      baseAbilities: [
        ab('Scimitar Flurry', { mp: 8, min: 30, max: 44, target: 'enemy', fx: 'beam', el: 'physical' }),
        ab('Dagger Toss', { mp: 10, min: 22, max: 30, target: 'all', fx: 'beam', el: 'physical' }),
      ],
      tree: [
        { id: 'al_spd', name: 'Quick Hands', desc: '+18% Crit', cost: 1, kind: 'stat', stat: { crit: 0.18 } },
        { id: 'al_hp', name: 'Street Smarts', desc: '+28 Max HP', cost: 1, kind: 'stat', stat: { hp: 28 } },
        { id: 'al_carpet', name: 'Magic Carpet Ride', desc: 'A swooping aerial strike on all foes', cost: 1, req: 'al_hp', kind: 'ability', ability: ab('Magic Carpet Ride', { mp: 16, min: 30, max: 42, target: 'all', fx: 'beam', el: 'thunder' }) },
        { id: 'al_atk', name: 'Diamond in the Rough', desc: '+6 Attack', cost: 2, req: 'al_carpet', kind: 'stat', stat: { atk: 6 } },
        { id: 'al_wish', name: 'Three Wishes', desc: 'A dazzling triple-hit finisher on one foe', cost: 3, req: 'al_atk', kind: 'ability', ability: ab('Three Wishes', { mp: 24, min: 54, max: 74, target: 'enemy', fx: 'beam', el: 'holy' }) },
      ],
    },
    {
      key: 'violca', name: 'Violca', role: 'Dragon Rider', model: 'violca', temporary: true,
      base: { hp: 138, mp: 30, atkMin: 24, atkMax: 34, crit: 0.22 },
      growth: { hp: 14, mp: 4, atk: 4 },
      baseAbilities: [
        ab('Piercing Shot', { mp: 8, min: 36, max: 50, target: 'enemy', fx: 'beam', el: 'physical' }),
        ab('Storm Arrow', { mp: 12, min: 30, max: 42, target: 'enemy', fx: 'beam', el: 'thunder', proj: true }),
      ],
      tree: [
        { id: 'vi_crit', name: 'Deadeye', desc: '+18% Crit', cost: 1, kind: 'stat', stat: { crit: 0.18 } },
        { id: 'vi_mp', name: 'Signet Spark', desc: '+15 Max MP', cost: 1, kind: 'stat', stat: { mp: 15 } },
        { id: 'vi_volley', name: 'Arrow Volley', desc: 'A storm of arrows on all foes', cost: 1, req: 'vi_mp', kind: 'ability', ability: ab('Arrow Volley', { mp: 16, min: 28, max: 40, target: 'all', fx: 'beam', el: 'thunder' }) },
        { id: 'vi_atk', name: 'Rider\'s Resolve', desc: '+6 Attack', cost: 2, req: 'vi_volley', kind: 'stat', stat: { atk: 6 } },
        { id: 'vi_bond', name: 'Bonded Lightning', desc: 'Calls her dragon\'s lightning down on all foes', cost: 3, req: 'vi_atk', kind: 'ability', ability: ab('Bonded Lightning', { mp: 26, min: 48, max: 66, target: 'all', fx: 'beam', el: 'thunder' }) },
      ],
    },
    { // The Thing (1982) — gruff outpost survivor with a flamethrower
      key: 'mac', name: 'Mac', role: 'Outpost Survivor', model: 'mac', temporary: true,
      base: { hp: 172, mp: 24, atkMin: 24, atkMax: 34, crit: 0.14, big: true }, growth: { hp: 17, mp: 3, atk: 4 },
      baseAbilities: [ ab('Flamethrower', { mp: 10, min: 30, max: 44, target: 'all', fx: 'fire', el: 'fire' }), ab('Flare Gun', { mp: 8, min: 36, max: 50, target: 'enemy', fx: 'fire', el: 'fire', proj: true }) ],
      tree: [
        { id: 'mac_hp', name: 'Hard-Bitten', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 'mac_atk', name: 'Steady Hands', desc: '+5 Attack', cost: 1, req: 'mac_hp', kind: 'stat', stat: { atk: 5 } },
        { id: 'mac_a1', branch: 'a', name: 'Napalm', desc: 'PATH: Burn It All — heavy fire on all foes', cost: 1, req: 'mac_atk', kind: 'ability', ability: ab('Napalm', { mp: 18, min: 34, max: 48, target: 'all', fx: 'fire', el: 'fire' }) },
        { id: 'mac_a2', branch: 'a', name: 'Pyromaniac', desc: '+16% Crit', cost: 2, req: 'mac_a1', kind: 'stat', stat: { crit: 0.16 } },
        { id: 'mac_acap', branch: 'a', name: 'Scorched Earth', desc: 'Incinerate everything', cost: 3, req: 'mac_a2', kind: 'ability', ability: ab('Scorched Earth', { mp: 28, min: 48, max: 66, target: 'all', fx: 'fire', el: 'fire' }) },
        { id: 'mac_b1', branch: 'b', name: 'Field Medic', desc: 'PATH: Survivor — Regen to an ally', cost: 1, req: 'mac_atk', kind: 'ability', ability: ab('Field Medic', { mp: 12, min: 0, max: 0, target: 'ally', fx: 'heal', status: 'regen', turns: 4 }) },
        { id: 'mac_b2', branch: 'b', name: 'Bunker Down', desc: '+45 Max HP', cost: 2, req: 'mac_b1', kind: 'stat', stat: { hp: 45 } },
        { id: 'mac_bcap', branch: 'b', name: 'Last Man Standing', desc: 'Attack Up + Haste to all allies', cost: 3, req: 'mac_b2', kind: 'ability', ability: ab('Last Man Standing', { mp: 24, min: 0, max: 0, target: 'allparty', fx: 'beam', status: ['atkup', 'haste'], turns: 4 }) },
      ],
    },
    { // Princess Mononoke — fierce wolf-raised forest warrior
      key: 'sane', name: 'Sané', role: 'Wolf-Raised', model: 'sane', temporary: true,
      base: { hp: 150, mp: 30, atkMin: 22, atkMax: 32, crit: 0.20 }, growth: { hp: 15, mp: 4, atk: 4 },
      baseAbilities: [ ab('Wolf Strike', { mp: 8, min: 34, max: 48, target: 'enemy', fx: 'beam', el: 'physical' }), ab("Forest's Wrath", { mp: 14, min: 26, max: 38, target: 'all', fx: 'water', el: 'earth' }) ],
      tree: [
        { id: 'sn_crit', name: 'Feral Speed', desc: '+18% Crit', cost: 1, kind: 'stat', stat: { crit: 0.18 } },
        { id: 'sn_mp', name: 'Spirit Sense', desc: '+15 Max MP', cost: 1, req: 'sn_crit', kind: 'stat', stat: { mp: 15 } },
        { id: 'sn_a1', branch: 'a', name: 'Throat Tear', desc: 'PATH: Huntress — savage single hit', cost: 1, req: 'sn_mp', kind: 'ability', ability: ab('Throat Tear', { mp: 12, min: 54, max: 72, target: 'enemy', fx: 'beam', el: 'physical' }) },
        { id: 'sn_a2', branch: 'a', name: 'Pack Tactics', desc: '+6 Attack', cost: 2, req: 'sn_a1', kind: 'stat', stat: { atk: 6 } },
        { id: 'sn_acap', branch: 'a', name: 'Wolf Pack', desc: 'The pack tears all foes apart', cost: 3, req: 'sn_a2', kind: 'ability', ability: ab('Wolf Pack', { mp: 24, min: 40, max: 56, target: 'all', fx: 'beam', el: 'physical' }) },
        { id: 'sn_b1', branch: 'b', name: 'Greenheal', desc: 'PATH: Forest Warden — heal the whole party', cost: 1, req: 'sn_mp', kind: 'ability', ability: ab('Greenheal', { mp: 16, min: 30, max: 44, target: 'allparty', fx: 'heal', heal: true }) },
        { id: 'sn_b2', branch: 'b', name: 'Bramble Snare', desc: 'Earth hit that Slows all foes', cost: 2, req: 'sn_b1', kind: 'ability', ability: ab('Bramble Snare', { mp: 16, min: 24, max: 34, target: 'all', fx: 'water', el: 'earth', status: 'slow', turns: 3 }) },
        { id: 'sn_bcap', branch: 'b', name: "Spirit's Blessing", desc: 'Heal all allies + grant Regen', cost: 3, req: 'sn_b2', kind: 'ability', ability: ab("Spirit's Blessing", { mp: 26, min: 40, max: 54, target: 'allparty', fx: 'heal', heal: true, status: 'regen', turns: 4 }) },
      ],
    },
    { // Hitchhiker's Guide — the morose android
      key: 'marvyn', name: 'Marvyn', role: 'Morose Android', model: 'marvyn', temporary: true,
      base: { hp: 162, mp: 40, atkMin: 18, atkMax: 28, crit: 0.10 }, growth: { hp: 14, mp: 6, atk: 3 },
      baseAbilities: [ ab('Logic Bomb', { mp: 10, min: 34, max: 48, target: 'enemy', fx: 'beam', el: 'thunder' }), ab('Improbability Field', { mp: 14, min: 22, max: 34, target: 'all', fx: 'beam', el: 'thunder' }) ],
      tree: [
        { id: 'mv_mp', name: 'Planet-Sized Brain', desc: '+20 Max MP', cost: 1, kind: 'stat', stat: { mp: 20 } },
        { id: 'mv_atk', name: 'Diodes Down My Side', desc: '+4 Attack', cost: 1, req: 'mv_mp', kind: 'stat', stat: { atk: 4 } },
        { id: 'mv_a1', branch: 'a', name: 'Overclock', desc: 'PATH: Computation — heavy bolt on one foe', cost: 1, req: 'mv_atk', kind: 'ability', ability: ab('Overclock', { mp: 14, min: 50, max: 68, target: 'enemy', fx: 'beam', el: 'thunder' }) },
        { id: 'mv_a2', branch: 'a', name: 'Recursive Dread', desc: '+18 Max MP', cost: 2, req: 'mv_a1', kind: 'stat', stat: { mp: 18 } },
        { id: 'mv_acap', branch: 'a', name: 'Total Perspective Vortex', desc: 'Show all foes their insignificance (dark)', cost: 3, req: 'mv_a2', kind: 'ability', ability: ab('Total Perspective Vortex', { mp: 28, min: 44, max: 60, target: 'all', fx: 'beam', el: 'dark' }) },
        { id: 'mv_b1', branch: 'b', name: 'Tedium Field', desc: 'PATH: Sysadmin — Slow ALL foes', cost: 1, req: 'mv_atk', kind: 'ability', ability: ab('Tedium Field', { mp: 16, min: 0, max: 0, target: 'all', fx: 'beam', el: 'dark', status: 'slow', turns: 3 }) },
        { id: 'mv_b2', branch: 'b', name: 'Spare Capacity', desc: '+40 Max HP', cost: 2, req: 'mv_b1', kind: 'stat', stat: { hp: 40 } },
        { id: 'mv_bcap', branch: 'b', name: 'System Restore', desc: 'Haste + Regen to all allies', cost: 3, req: 'mv_b2', kind: 'ability', ability: ab('System Restore', { mp: 26, min: 0, max: 0, target: 'allparty', fx: 'beam', status: ['haste', 'regen'], turns: 4 }) },
      ],
    },
    { // Don Quixote — the earnest, deluded knight-errant
      key: 'quijano', name: 'Quijano', role: 'Knight-Errant', model: 'quijano', temporary: true,
      base: { hp: 165, mp: 26, atkMin: 23, atkMax: 34, crit: 0.15, big: true }, growth: { hp: 16, mp: 3, atk: 4 },
      baseAbilities: [ ab('Tilt!', { mp: 8, min: 38, max: 52, target: 'enemy', fx: 'beam', el: 'physical' }), ab('Chivalrous Charge', { mp: 12, min: 24, max: 36, target: 'all', fx: 'beam', el: 'holy' }) ],
      tree: [
        { id: 'qj_hp', name: 'Stubborn Valor', desc: '+30 Max HP', cost: 1, kind: 'stat', stat: { hp: 30 } },
        { id: 'qj_atk', name: 'Lance Drill', desc: '+5 Attack', cost: 1, req: 'qj_hp', kind: 'stat', stat: { atk: 5 } },
        { id: 'qj_a1', branch: 'a', name: 'Joust', desc: 'PATH: Lancer — a thundering charge', cost: 1, req: 'qj_atk', kind: 'ability', ability: ab('Joust', { mp: 14, min: 54, max: 72, target: 'enemy', fx: 'beam', el: 'physical' }) },
        { id: 'qj_a2', branch: 'a', name: 'Tempered Madness', desc: '+16% Crit', cost: 2, req: 'qj_a1', kind: 'stat', stat: { crit: 0.16 } },
        { id: 'qj_acap', branch: 'a', name: 'The Impossible Dream', desc: 'A glorious lance of holy light', cost: 3, req: 'qj_a2', kind: 'ability', ability: ab('The Impossible Dream', { mp: 26, min: 50, max: 68, target: 'enemy', fx: 'beam', el: 'holy' }) },
        { id: 'qj_b1', branch: 'b', name: 'Rally the Squire', desc: 'PATH: Champion — Attack Up to all allies', cost: 1, req: 'qj_atk', kind: 'ability', ability: ab('Rally the Squire', { mp: 14, min: 0, max: 0, target: 'allparty', fx: 'beam', status: 'atkup', turns: 4 }) },
        { id: 'qj_b2', branch: 'b', name: 'Quixotic Resolve', desc: '+45 Max HP', cost: 2, req: 'qj_b1', kind: 'stat', stat: { hp: 45 } },
        { id: 'qj_bcap', branch: 'b', name: 'For Dulcinea!', desc: 'Attack Up + Haste over all allies', cost: 3, req: 'qj_b2', kind: 'ability', ability: ab('For Dulcinea!', { mp: 26, min: 0, max: 0, target: 'allparty', fx: 'beam', status: ['atkup', 'haste'], turns: 4 }) },
      ],
    },
    { // Beetlejuice — Lydia Deetz, a goth girl with pure dark magic (rescued in the Neitherworld trial)
      key: 'lydia', name: 'Lydia', role: 'Goth Conjurer', model: 'lydia', temporary: true,
      base: { hp: 116, mp: 66, atkMin: 9, atkMax: 15, crit: 0.08 }, growth: { hp: 9, mp: 6, atk: 2 },
      baseAbilities: [ ab('Shadow Bolt', { mp: 8, min: 32, max: 46, target: 'enemy', fx: 'beam', el: 'dark' }), ab('Gloom', { mp: 16, min: 22, max: 34, target: 'all', fx: 'beam', el: 'dark' }) ],
      tree: [
        { id: 'ly_mp', name: 'Deeper Veil', desc: '+18 Max MP', cost: 1, kind: 'stat', stat: { mp: 18 } },
        { id: 'ly_cr', name: 'Morbid Focus', desc: '+10% Crit', cost: 1, req: 'ly_mp', kind: 'stat', stat: { crit: 0.10 } },
        { id: 'ly_a1', branch: 'a', name: 'Soul Siphon', desc: 'PATH: Necromancer — a draining dark bolt', cost: 1, req: 'ly_cr', kind: 'ability', ability: ab('Soul Siphon', { mp: 12, min: 48, max: 64, target: 'enemy', fx: 'beam', el: 'dark' }) },
        { id: 'ly_a2', branch: 'a', name: 'Gravewrought', desc: '+24 Max MP', cost: 2, req: 'ly_a1', kind: 'stat', stat: { mp: 24 } },
        { id: 'ly_acap', branch: 'a', name: 'Annihilation', desc: 'Erase a foe in absolute dark', cost: 3, req: 'ly_a2', kind: 'ability', ability: ab('Annihilation', { mp: 28, min: 64, max: 88, target: 'enemy', fx: 'beam', el: 'dark' }) },
        { id: 'ly_b1', branch: 'b', name: 'Hex', desc: 'PATH: Medium — dark hit that Weakens all foes', cost: 1, req: 'ly_cr', kind: 'ability', ability: ab('Hex', { mp: 16, min: 24, max: 34, target: 'all', fx: 'beam', el: 'dark', status: 'weaken', turns: 3 }) },
        { id: 'ly_b2', branch: 'b', name: 'Sepulchral Might', desc: '+30 Max HP', cost: 2, req: 'ly_b1', kind: 'stat', stat: { hp: 30 } },
        { id: 'ly_bcap', branch: 'b', name: 'Eternal Night', desc: 'Drown all foes in dark + Slow', cost: 3, req: 'ly_b2', kind: 'ability', ability: ab('Eternal Night', { mp: 30, min: 44, max: 60, target: 'all', fx: 'beam', el: 'dark', status: 'slow', turns: 3 }) },
      ],
    },
  ];

  const ENEMIES = {
    sandling:    { name: 'Sandling',       model: 'sandling',  hp: 96,  xp: 30, gold: 20, baseY: 0,   moves: [ { name: 'gnashes from the sand', min: 13, max: 19 }, { name: 'spits grit', min: 11, max: 16 } ], drops: [ { mat: 'brine', chance: 0.4 } ] },
    shade:       { name: 'Neither-Shade',   model: 'shade',     hp: 84,  xp: 30, gold: 20, baseY: 0.3, moves: [ { name: 'wails', min: 12, max: 18, all: true }, { name: 'reaches through you', min: 14, max: 20, status: 'weaken', turns: 2 } ], drops: [ { mat: 'goo', chance: 0.5 } ] },
    gravehand:   { name: 'Grave Hand',      model: 'gravehand', hp: 130, xp: 34, gold: 24, baseY: 0,   moves: [ { name: 'crushes', min: 15, max: 22 }, { name: 'drags you under', min: 12, max: 18, status: 'slow', turns: 2 } ], drops: [ { mat: 'shellfrag', chance: 0.4 } ] },
    beetlejuice: { name: 'Beetlejuice & the Sandworm', model: 'beetlejuice', hp: 620, xp: 340, gold: 420, baseY: 0.2, boss: true, scale: 1.4, moves: [ { name: 'cackles and conjures', min: 28, max: 40 }, { name: 'the Sandworm erupts from below', min: 24, max: 34, all: true }, { name: 'twists the room sideways', min: 30, max: 44, status: 'slow', turns: 3 }, { name: 'summons biting snakes', min: 24, max: 34, all: true, status: 'weaken', turns: 3 } ], drops: [ { mat: 'ink', chance: 0.6 } ] },
    shark:  { name: 'Maneater Shark',   model: 'shark',  hp: 88,  xp: 24, gold: 18, baseY: 0,   moves: [ { name: 'sinks its teeth in', min: 11, max: 17 }, { name: 'whips its tail', min: 14, max: 21 } ], drops: [ { mat: 'fang', chance: 0.7 }, { mat: 'fin', chance: 0.4 } ] },
    crab:   { name: 'Giant Hermit Crab', model: 'crab',  hp: 118, xp: 28, gold: 22, baseY: 0,   moves: [ { name: 'snaps a giant claw', min: 13, max: 19 }, { name: 'bashes with its shell', min: 16, max: 23 } ], drops: [ { mat: 'shellfrag', chance: 0.75 }, { mat: 'brine', chance: 0.2 } ] },
    jelly:  { name: "Man-o'-War Jelly",  model: 'jelly', hp: 60,  xp: 20, gold: 13, baseY: 0.2, moves: [ { name: 'stings sharply', min: 9, max: 15 }, { name: 'discharges a shock', min: 9, max: 14, all: true } ], drops: [ { mat: 'goo', chance: 0.85 } ] },
    octo:   { name: 'Reef Octopus',      model: 'octo',  hp: 102, xp: 30, gold: 24, baseY: 0.1, moves: [ { name: 'slams a tentacle', min: 15, max: 21 }, { name: 'sprays stinging ink', min: 8, max: 12, all: true } ], drops: [ { mat: 'ink', chance: 0.7 }, { mat: 'goo', chance: 0.3 } ] },
    gull:   { name: 'Dive-Bomb Gull',    model: 'gull',  hp: 54,  xp: 18, gold: 12, baseY: 1.4, moves: [ { name: 'pecks rapidly', min: 8, max: 13 }, { name: 'dive-bombs', min: 17, max: 25 } ], drops: [ { mat: 'feather', chance: 0.85 } ] },
    golem:  { name: 'Sandcastle Golem',  model: 'golem', hp: 136, xp: 36, gold: 30, baseY: 0,   moves: [ { name: 'slams a sandy fist', min: 15, max: 23 }, { name: 'crumbles down', min: 11, max: 18, all: true } ], drops: [ { mat: 'sand', chance: 0.85 }, { mat: 'brine', chance: 0.25 } ] },
    eel:    { name: 'Voltaic Eel',       model: 'eel',   hp: 96,  xp: 32, gold: 24, baseY: 1.0, moves: [ { name: 'lashes its tail', min: 13, max: 19 }, { name: 'looses a numbing current', min: 12, max: 18, all: true, status: 'slow', turns: 3 } ], drops: [ { mat: 'goo', chance: 0.6 }, { mat: 'brine', chance: 0.35 } ] },
    cobra:  { name: 'Sand Cobra',        model: 'cobra', hp: 92,  xp: 30, gold: 22, baseY: 0,   moves: [ { name: 'strikes with dripping fangs', min: 13, max: 20, status: 'poison', turns: 3 }, { name: 'spits venom across', min: 11, max: 16, all: true, status: 'poison', turns: 3 } ], drops: [ { mat: 'fang', chance: 0.65 }, { mat: 'sand', chance: 0.4 } ] },
    scarab: { name: 'Gilded Scarab',     model: 'scarab', hp: 120, xp: 34, gold: 34, baseY: 0.2, moves: [ { name: 'slashes with golden pincers', min: 14, max: 21 }, { name: 'scatters a blinding glare', min: 10, max: 15, all: true, status: 'weaken', turns: 3 } ], drops: [ { mat: 'shellfrag', chance: 0.6 }, { mat: 'brine', chance: 0.4 } ] },
    genie:  { name: 'Jafira, the Bound Genie', model: 'genie', hp: 640, xp: 520, gold: 820, baseY: 0.4, boss: true, rotate: ['water', 'thunder', 'dark'], moves: [
      { name: 'hurls a fistful of cursed sand', min: 30, max: 44 },
      { name: 'conjures a roaring sandstorm', min: 22, max: 30, all: true },
      { name: 'twists reality and strikes', min: 34, max: 48 },
      { name: 'unleashes PHENOMENAL COSMIC POWER', min: 30, max: 42, all: true } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'brine', chance: 1 } ] },
    wyvern: { name: 'Vale Wyvern',      model: 'wyvern', hp: 128, xp: 38, gold: 30, baseY: 1.2, moves: [ { name: 'rakes with talons', min: 15, max: 22 }, { name: 'breathes a gout of flame', min: 13, max: 19, all: true } ], drops: [ { mat: 'abyssscale', chance: 0.4 }, { mat: 'fang', chance: 0.5 } ] },
    skydragon: { name: 'Vyrmithrax, the Sky-Tyrant', model: 'skydragon', hp: 760, xp: 640, gold: 980, baseY: 0.6, boss: true, moves: [
      { name: 'lashes out with raking claws', min: 34, max: 48 },
      { name: 'beats its wings into a gale', min: 22, max: 30, all: true },
      { name: 'snaps with bone-crushing jaws', min: 38, max: 52 },
      { name: 'exhales a torrent of dragonfire', min: 30, max: 42, all: true } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'fang', chance: 1 } ] },
    urchin: { name: 'Spine Urchin',      model: 'urchin', hp: 150, xp: 34, gold: 26, baseY: 0,  moves: [ { name: 'fires a spine volley', min: 14, max: 20 }, { name: 'rolls over the party', min: 12, max: 18, all: true } ], drops: [ { mat: 'shellfrag', chance: 0.6 }, { mat: 'sand', chance: 0.4 } ] },
    // ---- Paegina (Greek myth) bestiary ----
    harpy:  { name: 'Shrieking Harpy',   model: 'harpy', hp: 96,  xp: 34, gold: 26, baseY: 1.5, moves: [ { name: 'rakes with talons', min: 14, max: 20 }, { name: 'looses a deafening shriek', min: 11, max: 16, all: true } ], drops: [ { mat: 'feather', chance: 0.8 }, { mat: 'fang', chance: 0.3 } ] },
    satyr:  { name: 'Wine-Mad Satyr',    model: 'satyr', hp: 110, xp: 36, gold: 30, baseY: 0,   moves: [ { name: 'gores with its horns', min: 15, max: 22 }, { name: 'plays a maddening reel', min: 10, max: 15, all: true, status: 'slow', turns: 3 } ], drops: [ { mat: 'fang', chance: 0.5 }, { mat: 'goo', chance: 0.4 } ] },
    cyclops:{ name: 'Boulder Cyclops',   model: 'cyclops', hp: 220, xp: 50, gold: 44, baseY: 0,  moves: [ { name: 'swings a club', min: 20, max: 28 }, { name: 'hurls a boulder', min: 22, max: 32 }, { name: 'stomps the earth', min: 14, max: 20, all: true } ], drops: [ { mat: 'sand', chance: 0.7 }, { mat: 'brine', chance: 0.4 } ] },
    minotaur:{ name: 'Labyrinth Minotaur', model: 'minotaur', hp: 300, xp: 90, gold: 80, baseY: 0, boss: true, moves: [ { name: 'gores with great horns', min: 30, max: 42 }, { name: 'cleaves with its labrys', min: 34, max: 48 }, { name: 'bellows and charges', min: 24, max: 32, all: true } ], drops: [ { mat: 'fang', chance: 1 }, { mat: 'abyssscale', chance: 0.4 } ] },
    medusa: { name: 'Medusa, the Gorgon', model: 'medusa', hp: 520, xp: 420, gold: 600, baseY: 0, boss: true, moves: [
      { name: 'lashes with serpent hair', min: 26, max: 38 },
      { name: 'looses a flight of arrows', min: 24, max: 34 },
      { name: 'fixes you with a PETRIFYING GAZE', min: 16, max: 24, all: true, status: 'slow', turns: 3 },
      { name: 'hisses a withering curse', min: 18, max: 26, all: true, status: 'weaken', turns: 3 } ], drops: [ { mat: 'fang', chance: 1 }, { mat: 'abyssscale', chance: 0.6 } ] },
    hydra:  { name: 'The Lernaean Hydra', model: 'hydra', hp: 880, xp: 700, gold: 1100, baseY: 0.3, boss: true, moves: [
      { name: 'bites with three heads', min: 30, max: 42 },
      { name: 'spews venom from every maw', min: 22, max: 30, all: true, status: 'poison', turns: 4 },
      { name: 'regrows a severed head', min: 0, max: 0, heal: true },
      { name: 'crashes down in a coil', min: 36, max: 50 } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'ectoplasm', chance: 0.6 } ] },
    // ---- one-off temp-ally-island bosses ----
    thething: { name: 'The Thing', model: 'thething', hp: 640, xp: 560, gold: 760, baseY: 0, boss: true, scale: 1.35, moves: [
      { name: 'lashes out with fused limbs', min: 30, max: 44 },
      { name: 'splits into screaming mouths', min: 22, max: 30, all: true },
      { name: 'tries to ASSIMILATE', min: 20, max: 28, status: 'poison', turns: 4 },
      { name: 'erupts in a spray of tendrils', min: 26, max: 38, all: true, status: 'weaken', turns: 3 } ], drops: [ { mat: 'goo', chance: 1 }, { mat: 'ectoplasm', chance: 1 } ] },
    forestgod: { name: 'The Forest God', model: 'forestgod', hp: 720, xp: 600, gold: 800, baseY: 0, boss: true, scale: 1.4, moves: [
      { name: 'where it steps, life withers', min: 28, max: 40, all: true },
      { name: 'gores with antlers of bone', min: 34, max: 48 },
      { name: 'the night-walker rises', min: 24, max: 34, all: true, status: 'slow', turns: 3 },
      { name: 'reclaims a little life', min: 0, max: 0, heal: true } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'goo', chance: 0.6 } ] },
    vogon: { name: 'Vogon Constructor', model: 'vogon', hp: 560, xp: 480, gold: 700, baseY: 0, boss: true, scale: 1.3, moves: [
      { name: 'files paperwork AT you', min: 26, max: 38 },
      { name: 'recites AGONIZING poetry', min: 18, max: 26, all: true, status: 'weaken', turns: 3 },
      { name: 'demobilizes your morale', min: 16, max: 24, all: true, status: 'slow', turns: 3 },
      { name: 'swings a bureaucratic fist', min: 30, max: 42 } ], drops: [ { mat: 'ink', chance: 1 }, { mat: 'brine', chance: 0.5 } ] },
    windmill: { name: 'The Giant (a windmill)', model: 'windmill', hp: 660, xp: 520, gold: 740, baseY: 0, boss: true, scale: 1.45, moves: [
      { name: 'sweeps a colossal sail-arm', min: 30, max: 44, all: true },
      { name: 'grinds down upon a hero', min: 34, max: 48 },
      { name: 'hurls a millstone', min: 32, max: 46 } ], drops: [ { mat: 'sand', chance: 1 }, { mat: 'abyssscale', chance: 0.4 } ] },
    // ---- Ruffy's friendly duel at sea (deliberately easy — a rival's hello) ----
    ruffy_duel: { name: 'Ruffy', model: 'ruffy_duel', hp: 220, xp: 70, gold: 50, baseY: 0, boss: true, moves: [
      { name: 'throws a goofy rubber jab', min: 10, max: 16 },
      { name: 'winds up a Gum-Gum Pistol', min: 14, max: 20 },
      { name: 'grins and stretches wide', min: 8, max: 12, all: true } ], drops: [] },
    // ---- themed dungeon mobs (creative, dungeon-specific rosters) ----
    thingspawn: { name: 'Thing-Spawn',   model: 'thingspawn', hp: 124, xp: 40, gold: 28, baseY: 0, moves: [ { name: 'lashes a fused limb', min: 15, max: 22 }, { name: 'tries to assimilate flesh', min: 12, max: 18, status: 'poison', turns: 3 } ], drops: [ { mat: 'goo', chance: 0.8 }, { mat: 'ectoplasm', chance: 0.4 } ] },
    kodama:  { name: 'Kodama',           model: 'kodama', hp: 64,  xp: 26, gold: 18, baseY: 0, moves: [ { name: 'rattles its hollow head', min: 9, max: 14, status: 'slow', turns: 2 }, { name: 'calls the wood to bind', min: 11, max: 16, all: true } ], drops: [ { mat: 'feather', chance: 0.5 }, { mat: 'goo', chance: 0.3 } ] },
    boarspirit:{ name: 'Cursed Boar',    model: 'boarspirit', hp: 138, xp: 42, gold: 26, baseY: 0, moves: [ { name: 'charges, trailing curse', min: 16, max: 24 }, { name: 'erupts in tatari tendrils', min: 13, max: 19, all: true, status: 'poison', turns: 3 } ], drops: [ { mat: 'fang', chance: 0.7 }, { mat: 'ectoplasm', chance: 0.4 } ] },
    vogonclerk:{ name: 'Vogon Clerk',    model: 'vogonclerk', hp: 130, xp: 40, gold: 30, baseY: 0, moves: [ { name: 'demands a form in triplicate', min: 13, max: 19, status: 'weaken', turns: 3 }, { name: 'reads subsection 7(b) aloud', min: 11, max: 17, all: true, status: 'slow', turns: 2 } ], drops: [ { mat: 'ink', chance: 0.7 }, { mat: 'brine', chance: 0.3 } ] },
    sentry:  { name: 'Sentry Drone',     model: 'sentry', hp: 88,  xp: 34, gold: 26, baseY: 1.4, moves: [ { name: 'fires a scanning beam', min: 14, max: 20 }, { name: 'paints all targets', min: 10, max: 15, all: true } ], drops: [ { mat: 'brine', chance: 0.5 }, { mat: 'shellfrag', chance: 0.3 } ] },
    mutton:  { name: 'Battle-Mutton',    model: 'mutton', hp: 96,  xp: 24, gold: 16, baseY: 0, moves: [ { name: 'headbutts indignantly', min: 11, max: 17 }, { name: 'stampedes the flock', min: 13, max: 19, all: true } ], drops: [ { mat: 'feather', chance: 0.4 }, { mat: 'sand', chance: 0.3 } ] },
    windvane:{ name: 'Windvane',         model: 'windvane', hp: 142, xp: 38, gold: 28, baseY: 0, moves: [ { name: 'sweeps a sail-arm', min: 15, max: 22 }, { name: 'grinds in a slow turn', min: 12, max: 18, all: true } ], drops: [ { mat: 'sand', chance: 0.7 }, { mat: 'shellfrag', chance: 0.3 } ] },
    bat:    { name: 'Nightwing Bat',     model: 'bat',   hp: 78,  xp: 30, gold: 20, baseY: 1.6, moves: [ { name: 'bites with a screech', min: 12, max: 18 }, { name: 'drains warm blood', min: 14, max: 20 } ], drops: [ { mat: 'ectoplasm', chance: 0.4 }, { mat: 'feather', chance: 0.3 } ] },
    ghoul:  { name: 'Drowned Ghoul',     model: 'ghoul', hp: 132, xp: 38, gold: 28, baseY: 0,   moves: [ { name: 'rakes with rotted claws', min: 15, max: 22 }, { name: 'exhales grave-rot', min: 12, max: 18, all: true } ], drops: [ { mat: 'ectoplasm', chance: 0.7 }, { mat: 'brine', chance: 0.3 } ] },
    wraith: { name: 'Tide Wraith',       model: 'wraith', hp: 110, xp: 40, gold: 30, baseY: 0.6, moves: [ { name: 'phases through a soul', min: 16, max: 23 }, { name: 'wails a dirge', min: 13, max: 19, all: true } ], drops: [ { mat: 'ectoplasm', chance: 0.8 } ] },
    vampire:{ name: 'Count Saltorre',    model: 'vampire', hp: 600, xp: 460, gold: 700, baseY: 0, boss: true, moves: [
      { name: 'rends with crimson claws', min: 30, max: 44 },
      { name: 'summons a swarm of bats', min: 20, max: 28, all: true },
      { name: 'drains the lifeblood of', min: 34, max: 48 },
      { name: 'unleashes Crimson Deluge', min: 28, max: 40, all: true } ], drops: [ { mat: 'abyssscale', chance: 1 }, { mat: 'ectoplasm', chance: 1 } ] },
    kraken: { name: 'The Kraken',        model: 'kraken', hp: 360, xp: 160, gold: 220, baseY: 0, boss: true, scale: 1.55, moves: [ { name: 'crushes with a tentacle', min: 24, max: 34 }, { name: 'unleashes a maelstrom', min: 18, max: 26, all: true }, { name: 'snaps its colossal beak', min: 30, max: 42 } ], drops: [ { mat: 'ink', chance: 1 }, { mat: 'abyssscale', chance: 0.5 } ] },
    leviathan: { name: 'Reaper Leviathan', model: 'leviathan', hp: 520, xp: 380, gold: 600, baseY: 0.5, boss: true, scale: 1.6, moves: [
      { name: 'lunges with gaping jaws', min: 34, max: 48 },
      { name: 'looses a deafening roar', min: 22, max: 30, all: true },
      { name: 'thrashes in a frenzy', min: 40, max: 56 } ] },
    angler: { name: 'Abyss Angler', model: 'angler', hp: 380, xp: 280, gold: 420, baseY: 0.4, boss: true, scale: 1.5, moves: [
      { name: 'snaps its enormous jaws', min: 30, max: 44 },
      { name: 'mesmerizes with its lure', min: 18, max: 26, all: true } ] },
    drifter: { name: 'Gilgamuck, the Drifter', model: 'drifter', hp: 880, xp: 900, gold: 1500, baseY: 0, boss: true, rotate: ['fire', 'water', 'thunder', 'earth'], moves: [
      { name: 'draws a different blade and slashes', min: 36, max: 50 },
      { name: 'spins into a six-sword cyclone', min: 26, max: 36, all: true },
      { name: 'hurls a borrowed harpoon at', min: 40, max: 56 },
      { name: 'flourishes — "Have at you!"', min: 44, max: 60 } ], drops: [ { mat: 'abyssscale', chance: 1 } ] },
    selachoth: { name: 'Selachoth', model: 'selachoth', hp: 560, xp: 500, gold: 800, baseY: 0.2, boss: true, rotate: ['holy', 'dark'], moves: [
      { name: 'cleaves with Tidemourn', min: 34, max: 46 },
      { name: 'sweeps the blade in an arc', min: 22, max: 30, all: true },
      { name: 'calls down a crushing Deluge', min: 30, max: 42 },
      { name: 'descends — One-Finned Requiem', min: 42, max: 56 },
    ] },
    // OMEGA — the true form Selachoth sheds into for the second half of the final battle.
    // Rotates light/dark like its mortal shell, but vaster and stranger.
    selachoth_omega: { name: 'OMEGA — The Drowned Angel', model: 'omega', hp: 900, xp: 0, gold: 0, baseY: 0.4, boss: true, scale: 1.5, rotate: ['holy', 'dark'], moves: [
      { name: 'unfolds its wings — Cataclysm', min: 30, max: 40, all: true },
      { name: 'fixes you with the Great Eye', min: 42, max: 56 },
      { name: 'drags a soul toward the deep', min: 36, max: 48, status: 'slow', turns: 3 },
      { name: 'sings the drowning hymn', min: 26, max: 34, all: true, status: 'weaken', turns: 3 },
      { name: 'breaks the world — OMEGA RUIN', min: 48, max: 64, all: true },
    ] },
    // ---- prologue raid: the harbor reactor's automated guardians ----
    sentinel: { name: 'Harbor Sentinel', model: 'sentry', hp: 240, xp: 40, gold: 60, baseY: 1.2, boss: true, scale: 2.0, rotate: ['thunder', 'fire'], moves: [
      { name: 'sweeps a search-laser', min: 11, max: 16, all: true },
      { name: 'locks on and fires', min: 16, max: 23 },
      { name: 'vents scalding steam', min: 12, max: 18, all: true, status: 'weaken', turns: 2 } ], drops: [] },
    guardbot: { name: 'Dock Guard-Drone', model: 'sentry', hp: 64, xp: 12, gold: 14, baseY: 1.3, moves: [
      { name: 'fires a warning shot', min: 7, max: 12 }, { name: 'rams forward', min: 9, max: 14 } ], drops: [] },
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
    antidote: { name: 'Antidote',     kind: 'cure',    cures: ['poison'], target: 'ally', fx: 'heal', price: 40,  desc: 'Cures Poison on one ally.' },
    remedy:   { name: 'Remedy',       kind: 'cure',    cures: 'bad',      target: 'ally', fx: 'heal', price: 140, desc: 'Cures all ailments on one ally.' },
    herodrink:{ name: 'Hero Drink',   kind: 'buff',    status: 'atkup', turns: 4, target: 'ally', fx: 'beam', price: 180, desc: 'Raises one ally\'s Attack for a few turns.' },
    hourglass:{ name: 'Golden Hourglass', kind: 'buff', status: 'haste', turns: 4, target: 'ally', fx: 'beam', price: 220, desc: 'Hastes one ally for a few turns.' },
    bomb:     { name: 'Powder Bomb',  kind: 'damage', min: 45,  max: 60,  target: 'enemy', fx: 'fire',  el: 'fire',    price: 60,  desc: '45-60 Fire damage to one foe.' },
    frostbomb:{ name: 'Frost Flask',  kind: 'damage', min: 55,  max: 75,  target: 'enemy', fx: 'water', el: 'water',   price: 110, desc: '55-75 Water damage to one foe.' },
    boltbomb: { name: 'Storm Jar',    kind: 'damage', min: 60,  max: 85,  target: 'enemy', fx: 'beam',  el: 'thunder', price: 130, desc: '60-85 Thunder damage to one foe.' },
    holybomb: { name: 'Sunshard',     kind: 'damage', min: 70,  max: 100, target: 'enemy', fx: 'heal',  el: 'holy',    price: 200, desc: '70-100 Holy damage to one foe — searing to the undead.' },
    grenade:  { name: 'Sea-Mine',     kind: 'damageall', min: 40, max: 60, target: 'enemyall', fx: 'fire', el: 'fire',  price: 240, desc: '40-60 Fire damage to ALL foes.' },
    pistachio:{ name: 'Pistachios',   kind: 'heal',    amount: 45,  target: 'ally',     fx: 'heal', price: 18,  desc: 'A handful of Paegina pistachios — restore 45 HP.' },
    baklava:  { name: 'Honey Baklava', kind: 'healall', amount: 90, target: 'allyall',  fx: 'heal', price: 260, desc: 'Pistachio-honey pastry — restore 90 HP to ALL allies.' },
  };
  const SHOP_STOCK = ['potion', 'hipotion', 'ether', 'phoenix', 'bomb'];
  // some goods are exclusive to certain town markets, unlocked as you sail east
  const SHOP_STOCK_BY_TOWN = {
    tidehaven: ['potion', 'hipotion', 'ether', 'phoenix', 'bomb', 'frostbomb', 'antidote'],
    dunesport: ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'phoenix', 'bomb', 'boltbomb', 'megapotion', 'antidote', 'remedy', 'herodrink'],
    mall:      ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'turboether', 'phoenix', 'megaphoenix', 'elixir', 'adrenaline', 'megapotion', 'grenade', 'holybomb', 'boltbomb', 'frostbomb', 'antidote', 'remedy', 'herodrink', 'hourglass'],
    bazaar:    ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'phoenix', 'bomb', 'frostbomb', 'boltbomb', 'antidote', 'remedy', 'herodrink', 'hourglass'],
    aerie:     ['potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'phoenix', 'megapotion', 'boltbomb', 'antidote', 'remedy', 'herodrink', 'hourglass'],
    argo:      ['pistachio', 'baklava', 'potion', 'hipotion', 'xpotion', 'ether', 'hiether', 'phoenix', 'megaphoenix', 'elixir', 'antidote', 'remedy', 'herodrink', 'hourglass', 'holybomb', 'grenade'],
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
    lydia: [
      { key: 'spirit_planchette',    name: 'Spirit Planchette',    atk: 0,  slots: 1, price: 0,   desc: 'A trusty talking board.' },
      { key: 'raven_wand',           name: 'Raven Wand',           atk: 6,  slots: 2, price: 240, desc: '+6 ATK · 2 shell slots' },
      { key: 'netherworld_grimoire', name: 'Netherworld Grimoire', atk: 14, slots: 3, price: 640, desc: '+14 ATK · 3 shell slots' },
    ],
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
    aladdin: [
      { key: 'street_scimitar', name: 'Street Scimitar', atk: 12, slots: 2, price: 0, desc: 'A pilfered, well-balanced blade.' },
      { key: 'agrabah_saber',   name: 'Agrabah Saber',   atk: 22, slots: 2, price: 0, desc: '+22 ATK · 2 shell slots' },
      { key: 'sultans_scimitar', name: "Sultan's Scimitar", atk: 34, slots: 3, price: 0, desc: 'A jewelled blade fit for a prince.' },
    ],
    violca: [
      { key: 'cadet_bow',   name: 'Cadet Longbow', atk: 14, slots: 2, price: 0, desc: 'Standard-issue war-college bow.' },
      { key: 'recurve_bow', name: 'Recurve Warbow', atk: 24, slots: 2, price: 0, desc: '+24 ATK · 2 shell slots' },
      { key: 'stormbow',    name: 'Stormcaller Bow', atk: 36, slots: 3, price: 0, desc: 'A bow that hums with bonded lightning.' },
    ],
    mac: [
      { key: 'flamethrower', name: 'Flamethrower', atk: 16, slots: 2, price: 0, desc: 'It burns. That\'s the point.' },
      { key: 'twin_torch',   name: 'Twin-Tank Torch', atk: 26, slots: 2, price: 0, desc: '+26 ATK · 2 shell slots' },
      { key: 'inferno_rig',  name: 'Inferno Rig', atk: 38, slots: 3, price: 0, desc: 'Enough fuel to cleanse an outpost.' },
    ],
    sane: [
      { key: 'stone_dagger', name: 'Stone Dagger', atk: 14, slots: 2, price: 0, desc: 'A flint blade, wolf-quick.' },
      { key: 'crystal_spear', name: 'Crystal Spear', atk: 24, slots: 2, price: 0, desc: '+24 ATK · 2 shell slots' },
      { key: 'fang_of_moro', name: 'Fang of the Wolf-God', atk: 36, slots: 3, price: 0, desc: 'A tusk-blade blessed by the forest.' },
    ],
    marvyn: [
      { key: 'service_arm',  name: 'Service Arm', atk: 12, slots: 2, price: 0, desc: 'A reluctant manipulator limb.' },
      { key: 'ion_emitter',  name: 'Ion Emitter', atk: 22, slots: 3, price: 0, desc: '+22 ATK · 3 shell slots' },
      { key: 'improb_drive', name: 'Improbability Coil', atk: 32, slots: 3, price: 0, desc: 'Statistically, this shouldn\'t work.' },
    ],
    quijano: [
      { key: 'rusty_lance',  name: 'Rusty Lance', atk: 14, slots: 2, price: 0, desc: 'Bent, but bravely held.' },
      { key: 'tourney_lance', name: 'Tourney Lance', atk: 24, slots: 2, price: 0, desc: '+24 ATK · 2 shell slots' },
      { key: 'dream_lance',  name: 'Lance of the Impossible Dream', atk: 36, slots: 3, price: 0, desc: 'For glory, for Dulcinea.' },
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
    venom_spiral:  { key: 'venom_spiral', name: 'Venom Spiral', kind: 'magic', maxLevel: 3, ap: [0, 90, 240], price: 220,
      ability: ab2('Venom', { mp: 10, min: 0, max: 0, target: 'enemy', fx: 'water', el: 'water', status: 'poison', turns: 4 }), desc: 'Grants a spell that Poisons a foe.' },
    hex_conch:     { key: 'hex_conch', name: 'Hex Conch', kind: 'magic', maxLevel: 3, ap: [0, 110, 300], price: 300,
      ability: ab2('Hex', { mp: 14, min: 0, max: 0, target: 'enemy', fx: 'beam', el: 'dark', status: ['slow', 'weaken'], turns: 3 }), desc: 'Grants a spell that Slows and Weakens a foe.' },
    vigor_bloom:   { key: 'vigor_bloom', name: 'Vigor Bloom', kind: 'magic', maxLevel: 3, ap: [0, 90, 240], price: 260,
      ability: ab2('Regen', { mp: 12, min: 0, max: 0, target: 'ally', fx: 'heal', status: 'regen', turns: 4 }), desc: 'Grants Regen — heals an ally over time.' },
    star_conch:    { key: 'star_conch', name: 'Star Conch', kind: 'magic', maxLevel: 3, ap: [0, 200, 500], price: 0,
      ability: ab2('Starfall', { mp: 28, min: 64, max: 88, target: 'all', fx: 'beam', el: 'holy' }), desc: 'Calls a rain of stars on all foes (holy). The Drifter\'s parting gift.' },
  };
  const SHOP_SHELLS = ['conch_ember', 'spiral_mend', 'nautilus_surge', 'triton_blast', 'venom_spiral', 'vigor_bloom', 'hex_conch', 'sand_dollar', 'cowrie_focus', 'auger_edge', 'tiger_crit'];

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

  // ---------------- STATUS AILMENTS / BUFFS (basic set) ----------------
  // dot = fraction of maxHP applied each of the target's turns (negative = heal).
  // spd = multiplier to turn speed. atk/dmg = outgoing/incoming damage multipliers.
  // bad: a debuff (cured by Remedy / blocked by immunity accessories).
  const STATUS = {
    poison: { name: 'Poison',     icon: '☠', color: '#9bff6a', bad: true, dot: 0.08 },
    regen:  { name: 'Regen',      icon: '✚', color: '#6ee7b7', dot: -0.10 },
    haste:  { name: 'Haste',      icon: '»',  color: '#fde047', spd: 1.7 },
    slow:   { name: 'Slow',       icon: '«',  color: '#9aa6b4', bad: true, spd: 0.55 },
    atkup:  { name: 'Attack Up',  icon: '↑',  color: '#ff9e6a', atk: 1.3 },
    weaken: { name: 'Weaken',     icon: '▽',  color: '#b06aff', bad: true, dmg: 1.3 },
  };

  // ---------------- ACCESSORIES (armor slot — also carries shell slots, FF7-style) ----------------
  // stat: flat bonuses · dr: % damage reduction · immune: status keys blocked · slots: materia slots
  const ACCESSORIES = {
    coral_bangle:  { key: 'coral_bangle',  name: 'Coral Bangle',  slots: 1, stat: { hp: 35 }, price: 200, desc: '+35 HP · 1 shell slot' },
    seaglass_ring: { key: 'seaglass_ring', name: 'Sea-Glass Ring', slots: 2, stat: { mp: 18 }, price: 280, desc: '+18 MP · 2 shell slots' },
    tortoise_charm:{ key: 'tortoise_charm', name: 'Tortoise Charm', slots: 1, dr: 0.12, price: 360, desc: '12% damage taken reduction · 1 slot' },
    tiger_fang:    { key: 'tiger_fang',    name: 'Tiger Fang',     slots: 2, stat: { atk: 6, crit: 0.08 }, price: 420, desc: '+6 ATK, +8% Crit · 2 slots' },
    venom_ward:    { key: 'venom_ward',    name: 'Venom Ward',     slots: 2, immune: ['poison'], stat: { hp: 20 }, price: 340, desc: 'Immune to Poison · +20 HP · 2 slots' },
    aegis_pearl:   { key: 'aegis_pearl',   name: 'Aegis Pearl',    slots: 2, dr: 0.18, immune: ['weaken'], price: 680, desc: '18% damage reduction · immune Weaken · 2 slots' },
    guardian_pearl:{ key: 'guardian_pearl', name: 'Guardian Pearl', slots: 3, stat: { hp: 60, mp: 15 }, dr: 0.10, price: 900, desc: '+60 HP, +15 MP, 10% reduction · 3 slots · ultimate' },
    golden_fleece: { key: 'golden_fleece', name: 'Golden Fleece', slots: 3, stat: { hp: 80, mp: 20, atk: 6 }, dr: 0.15, immune: ['poison', 'weaken'], price: 0, desc: '+80 HP, +20 MP, +6 ATK, 15% reduction, immune Poison & Weaken · 3 slots · the Coliseum champion\'s prize' },
  };
  const SHOP_ACCESSORIES = ['coral_bangle', 'seaglass_ring', 'tortoise_charm', 'tiger_fang', 'venom_ward', 'aegis_pearl'];
  // enemy affinities: weak (x1.5), resist (x0.5), absorb (heals), nullify (x0)
  const AFFINITIES = {
    sandling: { weak: ['water'], resist: ['earth'] },
    shade: { weak: ['holy', 'fire'], resist: ['dark', 'physical'] },
    gravehand: { weak: ['holy'], resist: ['physical'] },
    beetlejuice: { weak: ['holy', 'fire'], absorb: ['dark'] },
    ruffy_duel: { resist: ['physical'] }, // a rubber-man shrugs off blunt force
    selachoth_omega: { resist: ['physical', 'water'] }, // its weakness is the rotating light/dark tell, not a fixed element
    sentinel: { weak: ['water'], resist: ['physical'] },
    guardbot: { weak: ['water', 'thunder'], resist: ['physical'] },
    // themed dungeon mobs
    thingspawn: { weak: ['fire', 'holy'], resist: ['water'] },
    kodama:  { weak: ['fire'], resist: ['earth', 'holy'] },
    boarspirit: { weak: ['holy', 'fire'], absorb: ['dark'] },
    vogonclerk: { weak: ['water'], resist: ['physical'] },
    sentry:  { weak: ['thunder', 'water'], resist: ['physical', 'fire'] },
    mutton:  { weak: ['fire'], resist: ['physical'] },
    windvane: { weak: ['fire'], resist: ['physical', 'earth'] },
    shark:  { weak: ['thunder'], resist: ['water'] },
    crab:   { weak: ['thunder'], resist: ['physical'] },
    jelly:  { weak: ['thunder'], absorb: ['water'] },
    octo:   { weak: ['thunder'], resist: ['water'] },
    gull:   { weak: ['thunder'], resist: ['earth'] },
    golem:  { weak: ['water'], resist: ['fire'] },
    eel:    { weak: ['earth'], absorb: ['thunder'], resist: ['water'] },
    cobra:  { weak: ['fire'], resist: ['earth'] },
    scarab: { weak: ['water'], resist: ['earth', 'physical'] },
    genie:  { weak: ['water'], absorb: ['fire'], resist: ['physical', 'earth'] },
    wyvern: { weak: ['water', 'thunder'], resist: ['fire'] },
    skydragon: { weak: ['water', 'thunder'], absorb: ['fire'], resist: ['physical'] },
    urchin: { weak: ['water'], resist: ['earth', 'physical'] },
    bat:    { weak: ['holy'], resist: ['dark'] },
    ghoul:  { weak: ['holy', 'fire'], absorb: ['dark'], resist: ['water'] },
    wraith: { weak: ['holy'], absorb: ['dark'], nullify: ['physical'] },
    vampire:{ weak: ['holy'], absorb: ['dark'], resist: ['fire', 'water'] },
    drifter:{ weak: ['holy'], resist: ['physical', 'fire', 'water'] },
    kraken: { weak: ['thunder'], resist: ['water'] },
    selachoth: { weak: ['thunder', 'holy'], absorb: ['water'] },
    leviathan: { weak: ['thunder'], resist: ['water'] },
    angler: { weak: ['fire', 'holy'], resist: ['dark'] },
    harpy:  { weak: ['thunder'], resist: ['earth'] },
    satyr:  { weak: ['holy'], resist: ['earth'] },
    cyclops:{ weak: ['thunder', 'holy'], resist: ['physical'] },
    minotaur:{ weak: ['thunder'], resist: ['physical', 'earth'] },
    medusa: { weak: ['fire'], resist: ['earth', 'physical'], absorb: ['dark'] },
    hydra:  { weak: ['fire'], resist: ['water', 'physical'] },
    thething: { weak: ['fire'], resist: ['physical', 'water'] },
    forestgod: { weak: ['fire'], absorb: ['earth'], resist: ['holy', 'water'] },
    vogon: { weak: ['thunder'], resist: ['physical', 'dark'] },
    windmill: { weak: ['thunder'], resist: ['physical', 'earth'] },
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
    lydia:     { name: 'Say It Thrice',   target: 'all',      fx: 'beam',  el: 'dark',    min: 70, max: 96, flavor: 'says the name three times — the dead answer!' },
    pirate:    { name: 'Full Broadside',  target: 'all',      fx: 'fire',  el: 'fire',    min: 58, max: 82, flavor: 'unloads every cannon at once!' },
    swordsman: { name: 'Omnislash',       target: 'all',      fx: 'beam',  el: 'thunder', min: 68, max: 92, flavor: 'becomes a blur of steel!' },
    healer:    { name: "Ocean's Grace",   target: 'allparty', fx: 'heal',  heal: true, revive: true, min: 200, max: 200, flavor: 'calls the tide to mend all wounds!' },
    mage:      { name: 'Ultima',          target: 'all',      fx: 'beam',  el: 'dark',    min: 78, max: 108, flavor: 'unleashes forbidden magic!' },
    blader:    { name: 'Finishing Touch', target: 'all',      fx: 'beam',  el: 'thunder', min: 72, max: 98, flavor: 'cuts the very air!' },
    dragoon:   { name: "Leviathan's End", target: 'enemy',    fx: 'beam',  el: 'water',   min: 120, max: 168, flavor: 'hurls the great harpoon with a vengeance!' },
    ruffy:     { name: 'Gum-Gum King Cobra', target: 'enemy', fx: 'beam',  el: 'physical', min: 130, max: 175, flavor: 'winds up a fist the size of an island!' },
    simon:     { name: 'Grand Cross',     target: 'all',      fx: 'beam',  el: 'holy',    min: 96, max: 132, flavor: 'calls down a cross of holy light!' },
    aladdin:   { name: 'A Whole New World', target: 'all',    fx: 'beam',  el: 'thunder', min: 90, max: 124, flavor: 'soars in on the carpet, blades flashing!' },
    violca:    { name: 'Bonded Storm',    target: 'all',      fx: 'beam',  el: 'thunder', min: 96, max: 132, flavor: 'and her dragon answer as one — the sky splits with lightning!' },
    mac:       { name: 'Burn It All',     target: 'all',      fx: 'fire',  el: 'fire',    min: 92, max: 128, flavor: 'empties every tank in a roaring wall of flame!' },
    sane:      { name: 'Spirit Howl',     target: 'all',      fx: 'beam',  el: 'earth',   min: 90, max: 124, flavor: 'and the whole forest answers her cry!' },
    marvyn:    { name: 'Improbability Cascade', target: 'all', fx: 'beam', el: 'dark',    min: 94, max: 130, flavor: '"...here I am, brain the size of a planet." Reality buckles.' },
    quijano:   { name: 'The Impossible Dream', target: 'all', fx: 'beam',  el: 'holy',    min: 92, max: 128, flavor: 'charges an imaginary giant — and somehow, gloriously, wins!' },
  };

  // ---------------- ICONS ----------------
  const WEAPON_ICON = { pirate: '⚔️', swordsman: '🗡️', healer: '🪄', mage: '✨', blader: '🌀', dragoon: '🔱', ruffy: '🥊', simon: '🔗', aladdin: '🗡️', violca: '🏹', mac: '🔥', sane: '🐺', marvyn: '🤖', quijano: '🛡️' };
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

    nerida: { name: 'Nerida', element: 'water', color: '#3fd0e0', tail: '#2f8d9a', skin: '#6a4733', island: 'tidehaven', threshold: THRESH,
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

    gaia: { name: 'Gaia', element: 'earth', color: '#6ec06a', tail: '#3a7a3a', skin: '#c08652', island: 'dunes', threshold: THRESH,
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
      name: 'Tidehaven', sky: 'town', npcStyle: 'coastal',
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
      name: 'Dunes Port', sky: 'town', npcStyle: 'desert',
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
        { name: 'Stargazer Orin', color: '#3a3a6a', hair: '#cfd8ff', x: -8, z: 6, service: 'observatory',
          lines: ['I keep the old dome behind the port — the OBSERVATORY.', 'The tides, the storms, even the sea-maidens answer to the lights overhead.', 'Come, look through the great lens. Let me show you the planets of Saltmere.'] },
      ],
      exit: { x: 0, z: -11 },
    },
    mall: {
      name: 'The Grand Bazaar', ground: '#c9c0d8', accent: '#ff9ec0', npcStyle: 'arcade',
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
        { name: 'A Lombax Mechanic', color: '#d8923a', x: 0, z: 8, service: 'arcade1',
          lines: ['Step right up to the POWDER-KEG TIMING cabinet!', 'Stop the spark on the bullseye and the prizes are out of this world. Literally.', 'Best score wins something bubbly. Wanna play?'] },
        { name: 'A Brooding Spiky Teen', color: '#3a3f6b', hair: '#caa030', x: 5, z: 9, service: 'arcade2',
          lines: ['...', '...Fine. I run the REEF LIGHTS machine. Watch the buoys, repeat the pattern.', 'Don\'t embarrass yourself. (He clearly wandered in from another RPG.) Wanna play?'] },
        { name: 'A Wandering Moogle', color: '#f0e8e0', hair: '#ff7eb0', x: -2, z: 11, service: 'respec',
          lines: ['Kupo! I am a memory-moogle, kupo.', 'For seasoned heroes only — I can untangle your destinies and let your whole crew re-pick their skill paths, kupo!', 'Spent skill points all come back. Choose anew, kupo!'] },
      ],
      exit: { x: 0, z: -12 },
    },
    bazaar: {
      name: "Sultan's Bazaar", ground: '#e8cf8a', accent: '#ffcf6a', npcStyle: 'arabian',
      buildings: [
        { kind: 'shop', x: -9, z: -3, label: 'Spice Stall' },
        { kind: 'shop', x: 9, z: -3, label: 'Arms Bazaar' },
        { kind: 'inn',  x: 0, z: 9, label: 'Caravanserai' },
        { kind: 'house', x: -9, z: 8, wall: '#e6cf94', roof: '#b07a2a' },
        { kind: 'house', x: 9, z: 8, wall: '#dcc488', roof: '#8a5a2a' },
        { kind: 'house', x: -4, z: 11, wall: '#e8d6a0', roof: '#3a6a8a' },
      ],
      npcs: [
        { name: 'Spice Merchant Rashid', color: '#a85a2a', hair: '#1a1208', x: -9, z: -0.5, service: 'shop',
          lines: ['Welcome, welcome, friend of the dunes!', 'Potions, ethers, the finest powders in all Agrabah-by-the-Sea. Browse!'] },
        { name: 'Arms-Dealer Zara', color: '#8a3a5a', hair: '#1a1208', x: 9, z: -0.5, service: 'shop',
          lines: ['Steel and seashells, sharp and shining!', 'A blade for every hand and a shell for every wish. Take a look.'] },
        { name: 'Innkeep Yasmin', color: '#3a7a6a', hair: '#1a1208', x: 0, z: 6.5, service: 'inn',
          lines: ['Rest in the caravanserai, weary traveler.', 'Cool water and soft cushions cure any road.'] },
        { name: 'Old Storyteller', color: '#6a5a8a', hair: '#cccccc', x: -4, z: 4,
          lines: ['Aaah, sit, sit. Let me tell you of the CAVE OF WONDERS.', 'Beyond the dunes it waits — a tiger\'s mouth of stone, and within, a lamp.', 'A genie was bound inside by a sorcerer long drowned. Now it rages, alone in the dark.', 'Only one may enter and leave with their soul: a "diamond in the rough." A street boy named Aladdin, they say.'] },
        { name: 'Urchin Boy', color: '#c0863a', hair: '#1a1208', x: 4, z: 4,
          lines: ['Psst — you lookin\' for Aladdin? He hangs by the Cave of Wonders.', 'Quick hands, quicker grin. He\'ll get you past the door — for a cut.'] },
        { name: 'Veiled Dancer', color: '#b03a7a', hair: '#1a1208', x: 4, z: 8,
          lines: ['The desert keeps its secrets and its songs.', 'Mind the sand cobras out past the walls — their bite is swift.'] },
      ],
      exit: { x: 0, z: -12 },
    },
    aerie: {
      name: 'Riorson Outpost', ground: '#9aa6b4', accent: '#7fd0ff', npcStyle: 'rider',
      buildings: [
        { kind: 'shop', x: -9, z: -3, label: 'Quartermaster' },
        { kind: 'shop', x: 9, z: -3, label: 'Armory' },
        { kind: 'inn',  x: 0, z: 9, label: 'Barracks' },
        { kind: 'house', x: -9, z: 8, wall: '#b8c0cc', roof: '#3a4a6a' },
        { kind: 'house', x: 9, z: 8, wall: '#aab4c2', roof: '#5a3a6a' },
        { kind: 'house', x: -4, z: 11, wall: '#c2ccd8', roof: '#6a2a3a' },
      ],
      npcs: [
        { name: 'Quartermaster Devi', color: '#3a6a8a', hair: '#1a1208', x: -9, z: -0.5, service: 'shop',
          lines: ['Rider supplies — flight leathers and field potions.', 'You\'ll want all of it before you meet a dragon. Browse.'] },
        { name: 'Armorer Bodhi', color: '#6a5a8a', hair: '#cabfae', x: 9, z: -0.5, service: 'shop',
          lines: ['Daggers, blades, and signet shells for the riders.', 'Sharp steel keeps you in the saddle. Have a look.'] },
        { name: 'Barracks-Keep Imogen', color: '#8a3a5a', hair: '#2a1808', x: 0, z: 6.5, service: 'inn',
          lines: ['Bunk down, cadet. The Vale tests everyone soon enough.', 'Rest — you\'ll need every breath for the sky.'] },
        { name: 'Wingleader Garrick', color: '#3a4a6a', hair: '#1a1208', x: -4, z: 4,
          lines: ['So you climbed to the Aerie. Brave. Or stupid.', 'A great dragon coils at the peak — VYRMITHRAX, the Sky-Tyrant.', 'It bonds with no rider and burns all who try. The war college lost a whole wing to it.', 'There\'s one cadet mad enough to challenge it. Edgy thing. Carries a bow taller than she is.'] },
        { name: 'Cadet Rhiannon', color: '#5a7a3a', hair: '#2a1808', x: 4, z: 4,
          lines: ['You\'re here for Violca, aren\'t you? She broods up by the dragon\'s peak.', 'Don\'t mind the dramatic monologues. She\'s actually the best shot in the Vale.'] },
        { name: 'Scribe Jesinia', color: '#6a6a8a', hair: '#cabfae', x: 4, z: 8,
          lines: ['The archives say a bonded dragon multiplies a rider\'s power tenfold.', 'Defeat the Sky-Tyrant and perhaps it will judge YOU worthy. Perhaps.'] },
      ],
      exit: { x: 0, z: -12 },
    },
    argo: {
      name: 'Polis of Paegina', ground: '#e8e0cc', accent: '#4a90c0', npcStyle: 'greek',
      buildings: [
        { kind: 'shop', x: -9, z: -3, label: 'Agora' },
        { kind: 'shop', x: 9, z: -3, label: 'Bronzesmith' },
        { kind: 'inn',  x: 0, z: 9, label: 'Taverna' },
        { kind: 'house', x: -9, z: 8, wall: '#efe7d2', roof: '#3a6a8a' },
        { kind: 'house', x: 9, z: 8, wall: '#e6dcc4', roof: '#b0552f' },
        { kind: 'house', x: -4, z: 11, wall: '#efe7d2', roof: '#5a7a8a' },
      ],
      npcs: [
        { name: 'Agora Trader Helena', color: '#3a7aa0', hair: '#2a1808', x: -9, z: -0.5, service: 'shop',
          lines: ['Welcome to the agora of Paegina, xenos!', 'Potions, ethers, and the famous honey-baklava. Browse, browse.'] },
        { name: 'Bronzesmith Hephas', color: '#9a5a2a', hair: '#cccccc', x: 9, z: -0.5, service: 'shop',
          lines: ['Bronze blades and shell-charms, forged in volcano-fire.', 'Even a hero needs good kit before the Coliseum sands.'] },
        { name: 'Taverna-Keeper Dion', color: '#7a3a6a', hair: '#2a1808', x: 0, z: 6.5, service: 'inn',
          lines: ['Rest at the taverna — wine, olives, and a soft bed.', 'You\'ll need your strength for the Coliseum.'] },
        { name: 'Cap\'n Iason', color: '#caa030', hair: '#3a2a14', x: -4, z: 4,
          lines: ['Ho, traveler! I am IASON, captain of the good ship ARGO.', 'My Argonauts and I sailed the whole drowned world chasing the GOLDEN FLEECE.', 'Turns out the Fleece is the grand prize of the COLISEUM now. The gods have a sense of humor.', 'Best every league — Bronze, Silver, Gold, then the CHAMPION\'S GAUNTLET — and the Fleece is yours.'] },
        { name: 'Argonaut Orpheus', color: '#5a5ac0', hair: '#caa030', x: 4, z: 4,
          lines: ['♪ Sing, muse, of heroes who fight for pistachios and glory ♪', 'Mind the Gorgon in the Gold League. Don\'t meet her gaze... or your turns get SLOW as stone.'] },
        { name: 'Pistachio Farmer Nikos', color: '#5a8a3a', hair: '#2a1808', x: -2, z: 11, service: 'shop',
          lines: ['Eh! You want pistachios? I grow the BEST pistachios on Paegina!', 'Sun, sea-wind, and a little goat manure — that\'s the secret, don\'t tell anyone.', 'A handful heals a hero right up. Take some for the Coliseum, cheap-cheap!'] },
      ],
      exit: { x: 0, z: -12 },
    },
  };

  // ---------------- ISLANDS (each is its own walkable overworld) ----------------
  // Reach islands by ship from the SEA map. Each has a town (with shop), a
  // dungeon, roaming encounters, and a dock back to the ship.
  const ISLANDS = {
    tidehaven: {
      name: 'Tidehaven Isle', size: 52, shape: 'oval', treeType: 'tree', ground: '#5fa86a', sand: '#e7c890', water: '#1e6f96', sky: { top: '#2a5a9a', horizon: '#dfeef8' },
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
      name: 'Dunes Isle', size: 52, shape: 'wedge', treeType: 'palm', ground: '#cdb06a', sand: '#e7c890', water: '#1e6f96', sky: { top: '#3a6a9a', horizon: '#f3e3b8' },
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
      name: 'Abyssal Isle', size: 50, shape: 'horn', treeType: 'deadTree', ground: '#3a3a52', sand: '#5a5070', water: '#10182e', sky: { top: '#070a18', horizon: '#3a2f52' },
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
      name: 'Mall Isle', size: 46, shape: 'clover', ground: '#b8b0c8', sand: '#d8d0e0', water: '#1e6f96', sky: { top: '#6a5ab0', horizon: '#f3d8ee' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'mall', x: 0, z: 5, color: '#ff9ec0' },
      encounters: [],
      decor: { trees: 4, palms: 6, rocks: 4 },
    },
    duskmoor: {
      name: 'Duskmoor Isle', size: 50, shape: 'crescent', treeType: 'deadTree', ground: '#2a2230', sand: '#3a2e3a', water: '#101018', sky: { top: '#070410', horizon: '#2a0e22' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'vampire_keep', x: 0, z: 9, color: '#b03050' },
      encounters: [
        { x: -6, z: 9, pool: ['bat', 'ghoul'], min: 2, max: 3 },
        { x: 7, z: 11, pool: ['wraith', 'bat'], min: 2, max: 2 },
      ],
      decor: { trees: 6, palms: 0, rocks: 10 },
    },
    neither: {
      name: 'The Neitherworld', size: 50, shape: 'crescent', treeType: 'deadTree', ground: '#2a2238', sand: '#3a2e4a', water: '#0e0a18', sky: { top: '#070410', horizon: '#2a1840' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'neitherworld', x: 0, z: 9, color: '#b06aff' },
      decor: { trees: 6, palms: 0, rocks: 9 }, shells: { x: 12, z: 6 },
    },
    cove: {
      name: 'Castaway Cove', size: 40, shape: 'twin', treeType: 'palm', ground: '#4fae6a', sand: '#ffe7b0', water: '#1fa0c0', sky: { top: '#ff9e6a', horizon: '#ffe7c0' },
      spawn: { x: 0, z: -9 }, dock: { x: 0, z: -12 },
      bonfire: { x: 0, z: 4 },
      superboss: { x: 0, z: 12, key: 'drifter', color: '#caa030' },
      encounters: [],
      decor: { trees: 3, palms: 14, rocks: 5 },
    },
    mirage: {
      name: 'Mirage Isle', size: 52, shape: 'spiral', treeType: 'palm', ground: '#e0c074', sand: '#f0dca0', water: '#2090b0', sky: { top: '#e88a3a', horizon: '#ffe1a0' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'bazaar', x: 13, z: 3, color: '#ffcf6a' },
      dungeon: { key: 'genie_cave', x: -11, z: 8, color: '#ffd24a' },
      encounters: [
        { x: 4, z: 9, pool: ['cobra', 'scarab'], min: 2, max: 3 },
        { x: -6, z: 11, pool: ['golem', 'cobra'], min: 2, max: 2 },
      ],
      decor: { trees: 2, palms: 13, rocks: 11 },
    },
    aerie: {
      name: 'Sky Dragon Isle', size: 54, shape: 'fin', treeType: 'pine', ground: '#7a8494', sand: '#9aa0ac', water: '#2a4a6a', sky: { top: '#3a4f7a', horizon: '#d8c4e0' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'aerie', x: 13, z: 4, color: '#7fd0ff' },
      dungeon: { key: 'dragon_vale', x: -11, z: 8, color: '#ff6a4a' },
      encounters: [
        { x: 5, z: 9, pool: ['gull', 'wyvern'], min: 2, max: 3 },
        { x: -6, z: 11, pool: ['wyvern', 'golem'], min: 2, max: 2 },
      ],
      decor: { trees: 4, palms: 0, rocks: 14 },
    },
    paegina: {
      name: 'Paegina', size: 54, shape: 'oval', treeType: 'tree', ground: '#cdbd86', sand: '#ece2bf', water: '#2f9ec8', sky: { top: '#3a7ab0', horizon: '#f3ead0' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      town: { key: 'argo', x: 13, z: 4, color: '#4a90c0' },
      coliseum: { x: -11, z: 8, color: '#caa030' },
      grove: { x: 11, z: -3 },
      encounters: [
        { x: 4, z: 9, pool: ['harpy', 'satyr'], min: 2, max: 3 },
        { x: -6, z: 11, pool: ['cyclops', 'harpy'], min: 1, max: 2 },
      ],
      decor: { trees: 7, palms: 4, rocks: 10 },
    },
    whiteout: {
      name: 'Whiteout Station', size: 50, shape: 'star', treeType: 'pine', ground: '#cdd8e2', sand: '#e8f0f6', water: '#2a4a6a', sky: { top: '#6a86aa', horizon: '#eef4fa' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'frost_station', x: 0, z: 9, color: '#bfe0ff' },
      encounters: [ { x: -6, z: 9, pool: ['wraith', 'ghoul'], min: 2, max: 3 }, { x: 7, z: 11, pool: ['bat', 'wraith'], min: 2, max: 2 } ],
      decor: { trees: 9, palms: 0, rocks: 12 },
    },
    wildwood: {
      name: 'The Wildwood', size: 54, shape: 'clover', treeType: 'blossom', ground: '#2f7a3a', sand: '#caa86a', water: '#2a8a6a', sky: { top: '#3a6a4a', horizon: '#e2eec8' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'spirit_wood', x: -11, z: 8, color: '#9effb0' },
      encounters: [ { x: 5, z: 9, pool: ['golem', 'wyvern'], min: 2, max: 3 }, { x: -6, z: 11, pool: ['scarab', 'golem'], min: 2, max: 2 } ],
      decor: { trees: 16, palms: 0, rocks: 8 },
    },
    improbable: {
      name: 'Improbability Shoals', size: 48, shape: 'spiral', treeType: 'deadTree', ground: '#9a8ab0', sand: '#d0c2dc', water: '#3a8ac0', sky: { top: '#5a3a8a', horizon: '#f0d8ff' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'crash_site', x: 0, z: 9, color: '#caa0ff' },
      encounters: [ { x: -6, z: 9, pool: ['golem', 'scarab'], min: 2, max: 2 }, { x: 7, z: 11, pool: ['scarab', 'golem'], min: 2, max: 3 } ],
      decor: { trees: 7, palms: 0, rocks: 13 },
    },
    lamancha: {
      name: 'La Mancha Plains', size: 54, shape: 'wedge', treeType: 'tree', ground: '#c2a85a', sand: '#e0c878', water: '#3a7a9a', sky: { top: '#9a8a4a', horizon: '#f3e8c0' },
      spawn: { x: 0, z: -10 }, dock: { x: 0, z: -13 },
      dungeon: { key: 'mill_keep', x: -11, z: 8, color: '#e0c060' },
      encounters: [ { x: 5, z: 9, pool: ['golem', 'urchin'], min: 2, max: 2 }, { x: -6, z: 11, pool: ['cobra', 'scarab'], min: 2, max: 3 } ],
      decor: { trees: 5, palms: 0, rocks: 10 },
    },
  };

  // ---------------- SEA (sail between islands) ----------------
  const SEA = {
    size: 210, spawn: { x: 0, z: -10 },
    islands: [
      { key: 'tidehaven', x: -50, z: 12 },
      { key: 'dunes', x: 46, z: -6 },
      { key: 'spire', x: 6, z: -66 },
      { key: 'mall', x: -18, z: 52 },
      { key: 'duskmoor', x: 70, z: 48 },
      { key: 'mirage', x: -70, z: -36 },
      { key: 'aerie', x: 36, z: -46 },
      { key: 'paegina', x: -44, z: 70 },
      { key: 'wildwood', x: 90, z: -18 },
      { key: 'whiteout', x: -94, z: 30 },
      { key: 'improbable', x: 26, z: 94 },
      { key: 'lamancha', x: -34, z: -94 },
      { key: 'neither', x: 40, z: -86 },
    ],
    ships: [
      { id: 's0', type: 'sloop', x: -12, z: 26 },
      { id: 's1', type: 'frigate', x: 28, z: 30 },
      { id: 's2', type: 'ghost', x: -20, z: -36 },
    ],
    // a hidden bottle bobs out here; sail into it to chart the secret cove
    cove: { x: -88, z: -76 },
  };

  // ---------------- DUNGEONS (one per island, with a crystal-order puzzle) ----------------
  // Touch the colored crystals in the order the riddle hints. Solve it to open
  // the vault and claim the treasure, then take the exit back to the island.
  const DUNGEONS = {
    tide_cave: {
      name: 'Tide Cave', island: 'tidehaven', ground: '#3a4a5a', wall: '#2a3340',
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 28 }, chest: { x: 0, z: 32 },
      hint: 'Riddle: "Sunset bleeds, then deepest sea, then the meadow welcomes thee."',
      crystals: [ { color: '#ff5e5e', name: 'red', x: -6, z: 0 }, { color: '#5e8bff', name: 'blue', x: 0, z: 3 }, { color: '#5eff8b', name: 'green', x: 6, z: 0 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -4, pool: ['crab', 'jelly'], min: 1, max: 2 }, { x: 8, z: 9, pool: ['shark', 'eel'], min: 2, max: 2 }, { x: -7, z: 18, pool: ['crab', 'shark', 'jelly'], min: 2, max: 3 }, { x: 6, z: 25, pool: ['eel', 'octo'], min: 2, max: 2 } ],
      reward: { gold: 120, shell: 'triton_blast' },
    },
    dune_tomb: {
      name: 'Dune Tomb', island: 'dunes', ground: '#6a5a3a', wall: '#4a3f2a',
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 28 }, chest: { x: 0, z: 32 },
      hint: 'Riddle: "Gold of the dune, green of the oasis, blue of the well — in that order, seek your grace."',
      crystals: [ { color: '#ffcf4a', name: 'gold', x: -6, z: 0 }, { color: '#5eff8b', name: 'green', x: 6, z: 0 }, { color: '#5e8bff', name: 'blue', x: 0, z: 3 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -4, pool: ['urchin', 'golem'], min: 1, max: 2 }, { x: 8, z: 8, pool: ['ghoul', 'urchin'], min: 2, max: 2 }, { x: -7, z: 16, pool: ['cobra', 'scarab'], min: 2, max: 3 }, { x: 0, z: 25, pool: ['golem', 'ghoul', 'urchin'], min: 2, max: 3 } ],
      reward: { gold: 200, shell: 'nautilus_surge' },
    },
    abyss_vault: {
      name: 'Abyssal Vault', island: 'spire', ground: '#23283a', wall: '#161a28',
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 },
      hint: 'Riddle: "Violet abyss, pale moon, then the dying ember last of all."',
      crystals: [ { color: '#b06aff', name: 'violet', x: -6, z: 0 }, { color: '#dfe7ef', name: 'white', x: 0, z: 3 }, { color: '#ff7e3a', name: 'ember', x: 6, z: 0 } ],
      sequence: [0, 1, 2],
      mobs: [ { x: -8, z: -4, pool: ['wraith', 'ghoul'], min: 2, max: 2 }, { x: 8, z: 8, pool: ['octo', 'wraith'], min: 2, max: 3 }, { x: -7, z: 16, pool: ['wraith', 'ghoul', 'octo'], min: 2, max: 3 }, { x: 7, z: 24, pool: ['wraith', 'wraith', 'ghoul'], min: 3, max: 3 } ],
      reward: { gold: 400, shell: 'tiger_crit' },
    },
    vampire_keep: {
      name: 'Castle Crimsontide', island: 'duskmoor', ground: '#241620', wall: '#16101a', sky: { top: '#0a0410', horizon: '#2a0e1e' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 },
      hint: 'Castle Crimsontide — the air is thick with the iron-smell of old blood. Cut a path to the throne at the far end and end the Count.',
      crystals: [],
      ally: { key: 'simon', metFlag: 'simonMet', join: 'simonJoin', pre: 'vampirePre', fall: 'vampireFall', leave: 'simonLeave', holdMsg: 'Simon holds the castle gate. "Come back when you\'re ready to finish this."' },
      mobs: [ { x: -8, z: -4, pool: ['bat', 'bat', 'ghoul'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['wraith', 'bat'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['ghoul', 'wraith'], min: 2, max: 2 }, { x: 7, z: 22, pool: ['bat', 'wraith', 'ghoul'], min: 3, max: 3 } ],
      npc: { x: 7, z: 10, name: 'Brother Aldric', color: '#5a4a3a', hair: '#cccccc', gift: { item: 'holybomb', n: 2 }, lines: [
        { name: 'Brother Aldric', text: '(through the chapel bars) A warm face. Good — you still bleed. Listen fast: the Count was a man once. Saltorre. He drank the rising tide to cheat death, and it cheated him back.' },
        { name: 'Brother Aldric', text: 'His heart is the one thing the centuries left soft. When his eyes go red, that is the mortal in him surfacing — strike THEN. Take my flask. Holy water remembers what he forgot.' },
        { name: 'Narrator', text: 'Brother Aldric presses two vials through the bars. (Received 2 Sunshards.)' } ] },
      bossMob: { x: 0, z: 27, key: 'vampire' },
      reward: { gold: 900, shell: 'triton_blast' },
    },
    genie_cave: {
      name: 'The Cave of Wonders', island: 'mirage', ground: '#3a2e16', wall: '#241a0c', sky: { top: '#1a0e04', horizon: '#3a2208' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 },
      hint: 'The Cave of Wonders — "Touch NOTHING but the lamp," the legend warns. Sand hisses underfoot. Press on to the chamber where the bound genie rages.',
      crystals: [],
      ally: { key: 'aladdin', metFlag: 'aladdinMet', join: 'aladdinJoin', pre: 'geniePre', fall: 'genieFall', leave: 'aladdinLeave', holdMsg: 'Aladdin waits by the cave mouth. "Come find me when you\'re ready to grab that lamp."' },
      mobs: [ { x: -8, z: -4, pool: ['cobra', 'scarab'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['scarab', 'golem'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['cobra', 'cobra', 'scarab'], min: 2, max: 3 }, { x: 7, z: 22, pool: ['scarab', 'golem', 'cobra'], min: 3, max: 3 } ],
      npc: { x: -7, z: 10, name: 'The Gilded Thief', color: '#caa030', hair: '#1a1208', gift: { gold: 320 }, lines: [
        { name: 'The Gilded Thief', text: '(lips barely moving under a skin of gold leaf) Don\'t... touch... the treasure. I did. Forty years a statue, polished by the sand. The genie grants wishes, friend — but it ITEMIZES the cost.' },
        { name: 'The Gilded Thief', text: 'You want the lamp? Then want nothing ELSE in here. Greed is the lock; an empty hand is the key. ...Take my purse. I\'ve no pockets left to spend it from.' },
        { name: 'Narrator', text: 'A heavy coin-purse drops at your feet. (Received 320 gold.)' } ] },
      bossMob: { x: 0, z: 27, key: 'genie' },
      reward: { gold: 950, shell: 'conch_ember' },
    },
    dragon_vale: {
      name: 'The Dragon Vale', island: 'aerie', ground: '#2a3242', wall: '#1a212e', sky: { top: '#10182a', horizon: '#3a2a4a' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 32 }, chest: { x: 0, z: 36 },
      hint: 'The Dragon Vale — wind screams off the peak and bones of failed riders litter the stone. Climb to the summit where the Sky-Tyrant coils.',
      crystals: [],
      ally: { key: 'violca', metFlag: 'violcaMet', join: 'violcaJoin', pre: 'dragonPre', fall: 'dragonFall', leave: 'violcaLeave', holdMsg: 'Violca smirks from the cliff edge. "Run back to safety, then. I\'ll be brooding dramatically until you return."' },
      mobs: [ { x: -8, z: -4, pool: ['wyvern', 'gull'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['wyvern', 'wyvern'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['wyvern', 'golem'], min: 2, max: 2 }, { x: 7, z: 24, pool: ['wyvern', 'wyvern', 'gull'], min: 3, max: 3 } ],
      npc: { x: 7, z: 11, name: 'Scout Imryll', color: '#3a4658', hair: '#3a2418', gift: { heal: true }, lines: [
        { name: 'Scout Imryll', text: '(clutching a splinted leg) My dragon went up the peak without me. The Sky-Tyrant doesn\'t fight fair — it breathes IN when you breathe in, and catches the whole wing mid-gasp.' },
        { name: 'Scout Imryll', text: 'Strike on its out-breath, when the throat-light dims. And eat something — you look half-dead, and riders don\'t fly on empty stomachs. Here.' },
        { name: 'Narrator', text: 'Imryll shares her rations and field-kit. (Party fully restored.)' } ] },
      bossMob: { x: 0, z: 28, key: 'skydragon' },
      reward: { gold: 1000, shell: 'nautilus_surge' },
    },
    frost_station: {
      name: 'Whiteout Station', island: 'whiteout', ground: '#3a4a5a', wall: '#22323e', sky: { top: '#10202c', horizon: '#3a5a70' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 }, crystals: [],
      hint: 'Whiteout Station — the generators are dead and something in the kennels got loose. Nobody knows who\'s still human. Burn a path to the core.',
      ally: { key: 'mac', metFlag: 'macMet', join: 'macJoin', pre: 'thingPre', fall: 'thingFall', leave: 'macLeave', holdMsg: 'Mac racks the flamethrower. "I\'ll watch the door. Don\'t take too long."' },
      mobs: [ { x: -8, z: -4, pool: ['thingspawn'], min: 1, max: 2 }, { x: 8, z: 6, pool: ['thingspawn', 'ghoul'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['thingspawn'], min: 2, max: 2 }, { x: 7, z: 24, pool: ['thingspawn', 'ghoul'], min: 2, max: 3 } ],
      npc: { x: -7, z: 10, name: 'Operator Voss', color: '#9aa0a8', hair: '#caa86a', gift: { item: 'bomb', n: 2 }, lines: [
        { name: 'Operator Voss', text: '(crackling through the intercom) STOP. Don\'t open this door. I sealed myself in three days back. Maybe I\'m the last human in here. Maybe... I don\'t know what I am anymore.' },
        { name: 'Operator Voss', text: 'The thing from the kennels WEARS people. Don\'t trust a face that doesn\'t bleed right. Burn what\'s wrong — burn ALL of it if you have to. Take the incendiaries.' },
        { name: 'Narrator', text: 'A box slides through the slot in the door. (Received 2 Powder Bombs.)' } ] },
      bossMob: { x: 0, z: 27, key: 'thething' }, reward: { gold: 900, shell: 'conch_ember' },
    },
    spirit_wood: {
      name: 'The Spirit Wood', island: 'wildwood', ground: '#1f3a22', wall: '#142a16', sky: { top: '#0a1a0e', horizon: '#2a4a2e' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 }, crystals: [],
      hint: 'The Spirit Wood — the trees have gone quiet and the Forest God walks angry. Reach the still pool at its heart.',
      ally: { key: 'sane', metFlag: 'saneMet', join: 'saneJoin', pre: 'forestPre', fall: 'forestFall', leave: 'saneLeave', holdMsg: 'Sané bares her teeth. "Leave, then. The wolves and I will hold the path."' },
      mobs: [ { x: -8, z: -4, pool: ['kodama'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['kodama', 'boarspirit'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['boarspirit'], min: 1, max: 2 }, { x: 7, z: 24, pool: ['kodama', 'boarspirit'], min: 2, max: 3 } ],
      npc: { x: 7, z: 11, name: 'Granny Oku', color: '#5a7a4a', hair: '#cccccc', gift: { heal: true }, lines: [
        { name: 'Granny Oku', text: 'The Forest God isn\'t cruel, child. He is GRIEVING. We took too much — the iron, the old trees — and something in him tore. Now all he touches withers, even what he loves.' },
        { name: 'Granny Oku', text: 'You may have to put him down. Do it gently. Drink from the still pool first — the wood has a little mercy in it yet, and you\'ll need your strength.' },
        { name: 'Narrator', text: 'Granny Oku cups cold spring-water to your lips. (Party fully restored.)' } ] },
      bossMob: { x: 0, z: 27, key: 'forestgod' }, reward: { gold: 950, shell: 'nautilus_surge' },
    },
    crash_site: {
      name: 'The Heart of Gold', island: 'improbable', ground: '#2a2438', wall: '#1a1628', sky: { top: '#0e0820', horizon: '#3a2a52' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 }, crystals: [],
      hint: 'A crashed ship humming with improbability. A Vogon demolition crew is aboard, and they have FORMS. So very many forms.',
      ally: { key: 'marvyn', metFlag: 'marvynMet', join: 'marvynJoin', pre: 'vogonPre', fall: 'vogonFall', leave: 'marvynLeave', holdMsg: 'Marvyn sighs at 0.0001 decibels. "Fine. I\'ll wait. I\'m very good at waiting."' },
      mobs: [ { x: -8, z: -4, pool: ['vogonclerk'], min: 1, max: 2 }, { x: 8, z: 6, pool: ['sentry', 'vogonclerk'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['sentry'], min: 2, max: 2 }, { x: 7, z: 24, pool: ['vogonclerk', 'sentry'], min: 2, max: 3 } ],
      npc: { x: -7, z: 10, name: 'A Stranded Hitchhiker', color: '#8a8a9a', hair: '#3a2a18', gift: { item: 'elixir', n: 1 }, lines: [
        { name: 'A Stranded Hitchhiker', text: 'Oh — hello. Don\'t mind me, just been thumbing across the improbable for a few... years? Time went wobbly after the crash. You DID bring a towel, I trust? No? Rank amateur.' },
        { name: 'A Stranded Hitchhiker', text: 'Advice: a Vogon can\'t be reasoned with, only OUT-bored. And never, ever let them read you their poetry. Here — my spare towel. Most useful thing in the universe, that.' },
        { name: 'Narrator', text: 'You accept a suspiciously versatile towel. (Received an Elixir.)' } ] },
      bossMob: { x: 0, z: 27, key: 'vogon' }, reward: { gold: 920, shell: 'hex_conch' },
    },
    neitherworld: {
      name: 'The Neitherworld', island: 'neither', ground: '#241630', wall: '#160e22', sky: { top: '#070410', horizon: '#2a0e3a' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 }, crystals: [],
      ally: { key: 'lydia', metFlag: 'lydiaMet', join: 'lydiaJoin', holdMsg: 'Lydia steadies herself at the threshold. "Come back when you are ready to face him — and them."' },
      mobs: [ { x: -8, z: -4, pool: ['shade', 'sandling'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['gravehand', 'sandling'], min: 2, max: 2 }, { x: -7, z: 14, pool: ['shade', 'gravehand'], min: 2, max: 2 }, { x: 7, z: 22, pool: ['sandling', 'shade', 'gravehand'], min: 3, max: 3 } ],
      npc: { x: 7, z: 10, name: 'The Deetzes', color: '#5a4a6a', hair: '#cccccc', gift: { heal: true }, lines: [
        { name: "Lydia's Parents", text: '(faint, behind the striped bars) You can see us? Oh, thank the dark. He calls himself Beetlejuice — say the name thrice and he comes. We said it once too often.' },
        { name: "Lydia's Parents", text: 'He rides a thing from under the sand, all teeth and no mercy. Our Lydia has a gift for the dark — let her stand with you. Just bring her home.' },
        { name: 'Narrator', text: 'The Deetzes press a warm thermos through the bars. (Party restored.)' } ] },
      bossMob: { x: 0, z: 27, key: 'beetlejuice' },
    },
    mill_keep: {
      name: "The Giant's Mill", island: 'lamancha', ground: '#3a2e1a', wall: '#241c10', sky: { top: '#3a3018', horizon: '#8a7a44' },
      spawn: { x: 0, z: -12 }, exit: { x: 0, z: -14 }, gate: { x: 0, z: 30 }, chest: { x: 0, z: 34 }, crystals: [],
      hint: 'Quijano insists the windmill is a fearsome giant. He is, of course, completely wrong. He is also, somehow, completely right.',
      ally: { key: 'quijano', metFlag: 'quijanoMet', join: 'quijanoJoin', pre: 'giantPre', fall: 'giantFall', leave: 'quijanoLeave', holdMsg: 'Quijano bows gravely. "I shall guard the gate against all giants, friend. Return when honour calls."' },
      mobs: [ { x: -8, z: -4, pool: ['mutton'], min: 2, max: 3 }, { x: 8, z: 6, pool: ['mutton', 'windvane'], min: 2, max: 3 }, { x: -7, z: 14, pool: ['windvane'], min: 1, max: 2 }, { x: 7, z: 24, pool: ['windvane', 'mutton'], min: 2, max: 3 } ],
      npc: { x: 7, z: 11, name: 'The Bewildered Miller', color: '#a08050', hair: '#cccccc', gift: { item: 'baklava', n: 2 }, lines: [
        { name: 'The Bewildered Miller', text: 'You\'re with the old knight? The one who keeps calling my windmill a "monstrous giant"? It is a MILL. It grinds WHEAT. ...Though lately the sails turn when there\'s no wind at all. Hm.' },
        { name: 'The Bewildered Miller', text: 'Humour him, will you? Mad as a sack of cats, that one — but the biggest heart in all La Mancha. Here, take some bread and honey-cakes for the road.' },
        { name: 'Narrator', text: 'The miller loads you up with provisions. (Received 2 Honey Baklava.)' } ] },
      bossMob: { x: 0, z: 27, key: 'windmill' }, reward: { gold: 900, shell: 'venom_spiral' },
    },
  };

  // ---------------- COSMOLOGY (the Observatory) ----------------
  // The lore of Saltmere's sky. Each body ties into the world's tides and the
  // six elemental mermaids. r = orbit radius (px), size, speed, color.
  const COSMOS = {
    intro: 'The folk of Saltmere read the sky the way sailors read a chart. They say the world floats in the Great Brine — an ocean with no shore — and the lights above are isles in it. The tides, the storms, and even the mermaids answer to what wheels overhead.',
    star: { name: 'The Drowned Star', color: '#ffd166', size: 26, lore: 'Saltmere\'s sun. Legend says it once sank beneath the Great Brine and the world went dark and cold — until the first tide carried it back to the sky. Every dawn is that rescue, remembered.' },
    bodies: [
      { name: 'Maru, the Pale Pull', color: '#dfe7ef', r: 70,  size: 9,  speed: 1.6, element: null, lore: 'The moon that drags the tides. When Maru swells, the sea climbs the beaches; when she thins, the reefs lay bare. Selachoth believed that if he could only stop Maru, the tide would rise forever and drown the warm world for good.' },
      { name: 'Ignus, the Ember Wanderer', color: '#ff7b3a', r: 104, size: 11, speed: 1.05, element: 'fire', lore: 'A red planet of slow fire. The mermaid EMBER takes her warmth from it; when Ignus burns close, volcanic isles wake and the southern seas steam.' },
      { name: 'Nerith, the Deep Sapphire', color: '#3b82f6', r: 134, size: 13, speed: 0.82, element: 'water', lore: 'A world that is all ocean, a mirror of Saltmere. NERIDA the water-maiden was born of its reflection in a tide-pool, or so the songs claim.' },
      { name: 'Voltisar, the Storm Crown', color: '#fde047', r: 166, size: 10, speed: 0.66, element: 'thunder', lore: 'A planet ringed in perpetual lightning. VOLTA dances to its thunder; sailors who see it flare batten the hatches before the squall arrives.' },
      { name: 'Terramoor, the Green Anchor', color: '#6ec06a', r: 196, size: 14, speed: 0.5, element: 'earth', lore: 'A heavy, mossed world that barely moves. GAIA draws her steadiness from it. The old druids cut their calendars to its long, patient year.' },
      { name: 'Nocturne, the Veiled Eye', color: '#b06aff', r: 228, size: 11, speed: 0.38, element: 'dark', lore: 'A planet that shows only its dark face. NYX keeps its secrets. It is said the abyssal trenches connect, somehow, to its shadowed seas.' },
      { name: 'Aurelia, the Far Lantern', color: '#fff3c0', r: 262, size: 12, speed: 0.27, element: 'holy', lore: 'The brightest fixed light, never wandering. LUMINA is its envoy. Pilgrims steer by Aurelia, trusting that a constant light means the world is not yet lost.' },
      { name: 'The Wandering Tear', color: '#9be7ff', r: 300, size: 6, speed: 0.19, element: null, lore: 'A comet on a thousand-year orbit. It last crossed the sky the night Selachoth fell into the deep. Some fear what its return will wake; some hope it carries the drowned home.' },
    ],
  };

  // ---------------- COLISEUM (Paegina endgame: wave survival + boss rush) ----------------
  // each league is a sequence of waves; a wave is a list of enemy keys (boss:true
  // when a single mythic foe). Clear all waves for the reward. HP/MP carry between
  // waves — no healing — so it's a true gauntlet. Higher leagues unlock in order.
  const COLISEUM = [
    { key: 'bronze', name: 'Bronze League', need: null, blurb: 'Three rounds against the isle\'s lesser beasts.',
      waves: [ ['harpy', 'harpy'], ['satyr', 'cobra'], ['cyclops', 'harpy'] ],
      reward: { gold: 350, items: { pistachio: 5 } } },
    { key: 'silver', name: 'Silver League', need: 'bronze', blurb: 'Four harder rounds. The crowd wants blood.',
      waves: [ ['harpy', 'satyr', 'cobra'], ['cyclops', 'scarab'], ['minotaur'], ['cyclops', 'harpy', 'harpy'] ],
      reward: { gold: 700, pearls: 30, accessory: 'tiger_fang' } },
    { key: 'gold', name: 'Gold League', need: 'silver', blurb: 'Five rounds, capped by the Gorgon herself.',
      waves: [ ['satyr', 'satyr', 'cobra'], ['cyclops', 'cyclops'], ['minotaur', 'harpy'], ['golem', 'scarab', 'wraith'], ['medusa'] ],
      reward: { gold: 1100, pearls: 50, shell: 'hex_conch' } },
    { key: 'champion', name: "Champion's Gauntlet", need: 'gold', blurb: 'A boss rush of myth. No mercy. The Fleece awaits the victor.',
      waves: [ ['minotaur'], ['medusa'], ['hydra'] ],
      reward: { gold: 2500, pearls: 100, accessory: 'golden_fleece' } },
  ];

  // ---------------- STORY (cutscene beats) ----------------
  // each beat: { name, text }
  const STORY = {
    lydiaJoin: [
      { name: 'Lydia', text: '(stepping from the shadows, calm as a held breath) You can see me. Good — most of the living look right through a girl in black.' },
      { name: 'Lydia', text: 'My parents are caged in his striped little kingdom, and the only language he respects is the one I speak: the dark. Take me with you. We end him — and we do not say his name even once.' },
    ],
    // ---- PROLOGUE: the harbor-reactor raid (an action cold-open) ----
    reactorRaid: [
      { name: 'Narrator', text: 'Saltmere Harbor, the black hour before dawn. The cult of the One-Finned Angel has bolted a TIDE-ENGINE to the old reactor here — an iron heart pumping the sea higher with every beat. Three figures drop silently from the rafters.' },
      { name: 'Capt. Redbeard', text: 'Charges on the core, then we\'re gone before the alarms finish screaming. Easy money. Mostly money. Some screaming.' },
      { name: 'Marina', text: 'If we crack this engine, the flooding slows for every island east of here. That\'s worth the screaming.' },
      { name: 'Lance Strider', text: 'Less talk. Guards on the gantry — MOVE!' },
    ],
    reactorCore: [
      { name: 'Narrator', text: 'Deeper in, the reactor\'s heart roars: a churning column of stolen tide, caged in iron. Something vast unfolds from the gantry to meet you, optics flaring red.' },
      { name: 'Marina', text: 'A Sentinel — the cult\'s guard dog. They really didn\'t want visitors.' },
      { name: 'Capt. Redbeard', text: 'Then we put the mutt down and light the fuse. HEAVE TO!' },
    ],
    reactorBomb: [
      { name: 'Narrator', text: 'The Sentinel bursts into a rain of sparks. Redbeard slams the charges against the tide-engine\'s core — and a red light begins to pulse. And to count down.' },
      { name: 'Lance Strider', text: 'That\'s the alarm AND the timer. Both very bad. The whole harbor will be on us — GO, GO, GO!' },
    ],
    reactorEscape: [
      { name: 'Narrator', text: 'You sprint the buckling gantries as the reactor tears itself apart behind you, the stolen tide roaring free. The dock\'s edge rushes up — and beyond it, your ship, sails already cut loose and waiting.' },
      { name: 'Capt. Redbeard', text: 'JUMP, you beautiful fools! For the Free Seas — and for whatever\'s left of my deposit on this coat!' },
      { name: 'Narrator', text: 'Three figures leap into the breaking dawn as the harbor reactor folds into the sea behind them. The war for the tide has begun — and you just fired the first shot.' },
    ],
    opening: [
      { name: 'Narrator', text: 'For a thousand years the coast of Saltmere knew only gentle tides and golden mornings. The Free Seas were a promise: that anyone, from any shore, could chase a horizon and call it home.' },
      { name: 'Narrator', text: 'Then the sea began to RISE. Not in a day — in a slow, drowning patience. Beaches vanished. Beasts crawled from the foam. And the people learned a name to be afraid of.' },
      { name: 'Narrator', text: 'SELACHOTH. The One-Finned Angel. Once the greatest hero the Free Seas ever produced — now half-man, half-shark, and wholly convinced that a warm world of the living is a mistake the ocean must correct.' },
      { name: 'Lance Strider', text: 'He was my mentor. I watched the sea take him piece by piece, and I told myself a hero couldn\'t fall. I was wrong. So I\'ll be the one to put him down.' },
      { name: 'Marina', text: 'And I am sworn to the tides themselves. They weep under his hand. I\'ll not let the deep be turned into a tomb.' },
      { name: 'Capt. Redbeard', text: 'Bah — speeches. I just want my coast back, and my grog dry. And would you LOOK at that — there she is, fitted and floating, waiting on the tide.' },
      { name: 'Marina', text: 'The sun\'s breaking over the water. If we\'re ever going to do this... it\'s now.' },
      { name: 'Lance Strider', text: 'Then no more waiting. Every drowned isle east of here is a clock, and it\'s already ticking.' },
      { name: 'Capt. Redbeard', text: 'HAH! Look at us — three fools on a cliff with one ship and a death wish. I\'ve started worse crews with worse odds. WE\'RE READY. Hoist the colours — we\'re going on an ADVENTURE!' },
      { name: 'Narrator', text: 'The road east is long, and you will not walk it alone. Some who join you chase glory, some chase ghosts — and one chases a dream so bright it will cost him everything. But that is all still ahead. For now: a cliff, a dawn, a ship. Cast off.' },
    ],
    ruffyChase: [
      { name: 'Narrator', text: 'A small, ragged ship comes barreling across the waves behind you — flying a straw-hat flag and far too much sail. It does not slow down. It does not, in fact, appear to have brakes.' },
      { name: '???', text: 'OOOOI! WAIT UP! You there — captain-looking guy! I been chasin\' you since the last island! You\'re strong, right? I can SMELL strong!' },
      { name: 'Capt. Redbeard', text: 'Who in the nine tides are YOU?' },
      { name: '???', text: 'I\'m the guy who\'s gonna be King of the Free Seas! But first — DUEL ME! Right now! If you\'re as tough as you look, I gotta see it with my own eyes! Don\'t hold back!' },
      { name: 'Lance Strider', text: '...He\'s not going to let us leave until we humor him, is he.' },
      { name: 'Narrator', text: 'A friendly duel on the open water! (He\'s pulling his punches — beat him to shut him up.)' },
    ],
    ruffyJoin: [
      { name: 'Ruffy', text: 'SHISHISHI! That was AWESOME! Yep. Yep yep yep. I\'m comin\' with you.' },
      { name: 'Ruffy', text: 'Name\'s Ruffy! Rubber-man, future King of the Free Seas! That title\'s MINE — but a drowned ocean\'s got no king, so I guess I gotta help you save it first.' },
      { name: 'Lance Strider', text: 'We\'re not running a circus, kid.' },
      { name: 'Ruffy', text: 'Good, \'cause I\'m not funny, I\'m STRONG! I\'m comin\' with you. RIVALS gotta keep an eye on each other, yeah?' },
      { name: 'Narrator', text: 'Ruffy the Rubber Rival joins your party! (Manage your active crew with the PARTY menu — press T.) He fights, levels, and grows just like the rest — for as long as he stays.' },
    ],
    ruffyJoinOld: [
      { name: '???', text: 'SHISHISHI! You lot look like you\'re off to do something STUPID and HEROIC. I LOVE stupid and heroic!' },
      { name: 'Ruffy', text: 'Name\'s Ruffy! Rubber-man, future King of the Free Seas! That title\'s MINE — but a drowned ocean\'s got no king, so I guess I gotta help you save it first.' },
      { name: 'Lance Strider', text: 'We\'re not running a circus, kid.' },
      { name: 'Ruffy', text: 'Good, \'cause I\'m not funny, I\'m STRONG! Gum-Gum—! ...okay watch THIS later. I\'m coming with you. RIVALS gotta keep an eye on each other, yeah?' },
      { name: 'Narrator', text: 'Ruffy the Rubber Rival joins your party! (Manage your active crew with the PARTY menu — press T.) He fights, levels, and grows just like the rest — for as long as he stays.' },
    ],
    mermaidCouncil: [
      { name: 'Narrator', text: 'As the Kraken\'s body sinks, the sea around your hull begins to GLOW — six lights, six colors, rising from the deep. The elemental mermaids surface together, for the first time in a thousand years.' },
      { name: 'Nerida', text: 'You felled the Kraken. So the Wardens of the Tide have come to speak plainly. We are the sea\'s six moods — and Selachoth has made the sea grieve.' },
      { name: 'Lumina', text: 'He was not always the One-Finned Angel. He was a man who loved this world so fiercely that its cruelty broke him. Now he would still the tide forever — and a still sea is a DEAD sea.' },
      { name: 'Ember', text: 'We cannot strike him ourselves; we ARE the tide he commands. But YOU walk where we cannot. So we offer what we can — our elements, in your hands.' },
      { name: 'Nyx', text: 'Fire, water, storm, stone, shadow, and light. Win our hearts and we will pour ourselves into your blades. Selachoth fears nothing in the deep... but he never reckoned on the SURFACE loving us back.' },
      { name: 'Marina', text: 'Sisters of the tide... I\'m one of you, in my way. We won\'t let the sea become a grave. We swear it.' },
      { name: 'Narrator', text: 'The Mermaids pledge their aid. (Court them on the islands to enchant your weapons with their elements — their power may turn the final tide. ❤ The OBSERVATORY in Dunes Port reveals which star each Warden answers to.)' },
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
      { name: 'Marina', text: '(She lifts a hand — and the six Wardens\' light answers from every weapon you carry.) "You forgot something, old hero. The tide doesn\'t only obey you anymore. The mermaids gave it back to the LIVING."' },
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
    // ---- two-party finale (only if you ever met Ruffy at sea) ----
    alliesArrive: [
      { name: 'Narrator', text: 'A horn blasts from below the spire — not the sea\'s wail, but a ship\'s brass. A straw-hat figure vaults the rail and lands grinning between you and the drowned god.' },
      { name: 'Ruffy', text: 'SHISHISHI! Told ya rivals keep an eye on each other! You really thought you\'d fight the guy who wants to drown the WHOLE SEA without me?' },
      { name: 'Ruffy', text: 'And I didn\'t come alone. Everybody you ever stuck your neck out for? They heard the king was making his last stand. They ALL wanted in.' },
      { name: 'Capt. Redbeard', text: 'Then we do this in two waves. My crew breaks the old monster\'s guard. Ruffy — you and yours finish whatever crawls out of the wreck.' },
      { name: 'Ruffy', text: 'Pick who comes with me, captain. The people we SAVED get to be the ones who save the world. Feels right, yeah?' },
    ],
    omegaRise: [
      { name: 'Selachoth', text: 'No... the warm world will NOT outlast me. I am more than this borrowed shell. I am what the abyss MADE of a hero.' },
      { name: 'Narrator', text: 'Selachoth\'s body splits like wet paper. Something vast and pale unfolds from within — winged, blind but for one great eye, humming a hymn that tastes of a thousand drownings. OMEGA. The true shape of his despair.' },
      { name: 'Ruffy', text: '...Okay. THAT is new. OI — everybody! Our turn! Let\'s go be worth the horizon!' },
    ],
    omegaFall: [
      { name: 'Narrator', text: 'OMEGA\'s hymn cracks down the middle. Its wings come apart into motes of cold light — and the thousand-fathom tide hung above the spire simply lets go. It falls as rain. Warm rain.' },
      { name: 'Ruffy', text: '(grinning, wrecked) See? Told ya. A king gives his people a horizon. Even the grumpy shark-guy gets one.' },
      { name: 'Lance Strider', text: 'We\'d never have reached it alone. Every shore that stood up with us is standing here right now.' },
      { name: 'Narrator', text: 'Selachoth — a tired old hero again, nothing more — dissolves into seafoam at last. The morning comes in, and a hundred saved islands raise a cheer that carries clear across the Free Seas.' },
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
    coveDiscover: [
      { name: 'Narrator', text: 'A bottle knocks against the hull. Inside: a scrap of sailcloth, a crude map, and three words in a shaky hand — "COME REST AWHILE."' },
      { name: 'Capt. Redbeard', text: 'Charts a hidden cove south of the deep. No monsters marked. No treasure marked. Just... a little drawing of a campfire.' },
      { name: 'Marina', text: 'After everything we\'ve fought through? A place with no monsters sounds like the rarest treasure of all. Let\'s go.' },
      { name: 'Narrator', text: 'CASTAWAY COVE has been added to your charts. Sail to it when you wish — it lies far to the southwest.' },
    ],
    coveBonfire: [
      { name: 'Narrator', text: 'A driftwood fire snaps on a perfect crescent of sand. For once, nothing in the dark is trying to eat you. The whole crew exhales at the same time.' },
      { name: 'Capt. Redbeard', text: 'Ha! Look at us. A drowned-world\'s worth of legends, and not one of us knows how to just... sit.' },
      { name: 'Marina', text: 'The tide\'s gentle here. Like it remembers how it used to be. Like the world we\'re fighting for actually still exists.' },
      { name: 'Lance Strider', text: '(quiet, for once) "...My mentor used to say the point of the fight was to earn nights like this. I think I finally get it."' },
      { name: 'Narrator', text: 'You roast something over the fire, swap bad stories, and watch the Wandering Tear streak across a warm horizon. Your whole party is fully restored — body and spirit. (HP, MP and Limit gauges renewed.)' },
    ],
    drifterPre: [
      { name: '???', text: '(A lone figure rises from the surf at the cove\'s edge, draped in a dozen mismatched scabbards.) "...A buster sword. A leviathan harpoon. A whip out of legend. You carry a FORTUNE of blades, strangers."' },
      { name: 'Gilgamuck', text: 'I am Gilgamuck, the Drifter! I have crossed a hundred drowned worlds collecting the finest weapons in each. And yours — oh, yours will round out the set NICELY!' },
      { name: 'Capt. Redbeard', text: 'A pirate, robbing US? That\'s MY job, you great salty magpie!' },
      { name: 'Gilgamuck', text: 'Then we are alike, you and I — and only one of us sails off with the spoils. En garde! Have at you!' },
    ],
    drifterFall: [
      { name: 'Gilgamuck', text: 'Hah... HAHA! Bested! Truly bested, and on a beach this pretty. I haven\'t felt so ALIVE in a hundred crossings!' },
      { name: 'Gilgamuck', text: 'Keep your blades, champions — you\'ve earned the right to them. But take THIS from my collection: a Star Conch, pulled from a sky that isn\'t yours. May it light your darkest fights.' },
      { name: 'Narrator', text: 'You received the STAR CONCH — a peerless seashell that calls Starfall upon all foes! (Equip it from the Gear menu.)' },
      { name: 'Gilgamuck', text: '(He salutes with six swords at once and steps backward into the surf, grinning.) "Until the next world, then. Drift well!"' },
    ],
    simonLeave: [
      { name: 'Simon', text: 'It\'s done. The castle\'s quiet for the first time in nine generations.' },
      { name: 'Capt. Redbeard', text: 'Stay on, lad. A crew could use a man who hunts monsters for sport.' },
      { name: 'Simon', text: 'Tempting. But there\'s always another castle, another night, another thing in the dark. That\'s a Belmont\'s road, and I walk it alone. ...Mostly.' },
      { name: 'Simon', text: '(He coils the whip and tips his head.) "You fight well, for sailors. If the tide ever brings you back to Duskmoor — the gate\'s open." ' },
      { name: 'Narrator', text: 'Simon leaves the party and vanishes into the moonlight. (He is no longer available — but Castle Crimsontide remembers.)' },
    ],
    aladdinJoin: [
      { name: 'Narrator', text: 'Mirage Isle. Golden dunes, a heat-shimmer on the air, and a stone arch shaped like a tiger\'s snarling mouth — the Cave of Wonders.' },
      { name: '???', text: '(A grinning boy drops from the arch, a stolen melon under one arm.) "Whoa, whoa — you can\'t just WALK in there! The cave\'s picky. Eats people who aren\'t... worthy."' },
      { name: 'Aladdin', text: 'Name\'s Aladdin. Street rat, professionally. The cave only opens for a "diamond in the rough" — and lucky you, that\'s me. There\'s a lamp inside. A genie\'s trapped in it, and he\'s NOT happy.' },
      { name: 'Capt. Redbeard', text: 'And what do YOU get out of this, boy?' },
      { name: 'Aladdin', text: 'The lamp. One wish to stop being a nobody. You get whatever else is in there. Deal? Great. Stick close and DON\'T touch the gold.' },
      { name: 'Narrator', text: 'Aladdin joins your party as a fourth member — for as long as you stay in the Cave of Wonders. Quick, nimble, and a deadly shot with a thrown blade. (Leave the cave and he waits at the mouth; free the genie and he goes his own way.)' },
    ],
    geniePre: [
      { name: 'Jafira', text: '(A mountain of blue smoke and muscle erupts from a tarnished lamp.) "TEN THOUSAND YEARS chained in a lamp in a cave! Do you have ANY idea what that does to a person\'s temper?!"' },
      { name: 'Aladdin', text: 'Easy, big guy! We\'re here to BREAK the binding, not—' },
      { name: 'Jafira', text: 'The sorcerer said that too, right before he made me his slave. No more masters. No more wishes. I\'ll bury this whole cave and everyone in it! PHENOMENAL COSMIC POWER, remember?!' },
      { name: 'Capt. Redbeard', text: 'Then we knock the rage out of ye first. Hold fast, crew!' },
    ],
    genieFall: [
      { name: 'Jafira', text: '(The smoke settles; the chains of binding shatter and fall away.) "...The shackles. They\'re... gone. You didn\'t want a wish. You just wanted me FREE."' },
      { name: 'Aladdin', text: 'Yeah, well. I know what a cage feels like. Figured nobody should live in one. ...Even a cosmic one.' },
      { name: 'Jafira', text: 'Then take the lamp, street rat — it\'s just brass now, but it\'s YOURS. And take this, sailors: a Cinder Conch, a spark of my freed fire. May it never bind another soul.' },
      { name: 'Narrator', text: 'You received an EMBER CONCH and the genie\'s gratitude! Jafira streaks off into an open sky, laughing like thunder.' },
    ],
    aladdinLeave: [
      { name: 'Aladdin', text: 'So. I\'ve got a brass lamp, no genie, and absolutely no idea what I\'m doing. ...Honestly? Best I\'ve felt in years.' },
      { name: 'Capt. Redbeard', text: 'There\'s always a berth on my ship for light fingers and a lighter heart, lad.' },
      { name: 'Aladdin', text: 'Tempting! But there\'s a whole bazaar of people just like me, and somebody oughta look out for \'em. That somebody might as well be a diamond in the rough.' },
      { name: 'Narrator', text: 'Aladdin leaves the party with a salute and a swiped coin-purse you definitely didn\'t notice. (He is no longer available — but Mirage Isle remembers.)' },
    ],
    violcaJoin: [
      { name: 'Narrator', text: 'Sky Dragon Isle. Wind howls off a stone peak where a great dragon coils against the clouds. A figure stands at the cliff\'s edge, cloak snapping, a bow taller than she is in one hand.' },
      { name: '???', text: '(She does not turn around.) "...Another batch of fools come to die on the mountain. Let me guess. You think you\'re special. They ALL think they\'re special."' },
      { name: 'Violca', text: 'I\'m Violca. Bottom of my class, top of the Sky-Tyrant\'s kill list, and the only cadet edgy enough — I mean BRAVE enough — to climb up here twice. That beast took everyone I... ugh, you don\'t care.' },
      { name: 'Marina', text: 'We care. And we could use a shot like yours.' },
      { name: 'Violca', text: '(A pause. A small, dangerous smile.) "...Loyalty? Genuine concern? On a FIRST meeting? Be careful, sailor — a girl could get IDEAS. Fine. We climb together. Try to keep up, and try not to fall in love. Everyone does."' },
      { name: 'Narrator', text: 'Violca joins your party as a fourth member — for as long as you stay in the Dragon Vale. A peerless archer crackling with bonded lightning. (Leave and she broods at the cliff; best the Sky-Tyrant and she flies her own path.)' },
    ],
    dragonPre: [
      { name: 'Vyrmithrax', text: '(A voice like a rockslide fills the vale.) "ANOTHER rider. Another insect that mistakes a death-wish for courage."' },
      { name: 'Violca', text: 'I\'m not here to BOND you, you overgrown lizard. I\'m here to humble you. There\'s a difference, and you\'re about to feel it.' },
      { name: 'Vyrmithrax', text: 'Bold words from prey. Show me, little archer. Show me the spark that makes you worth the burning.' },
      { name: 'Capt. Redbeard', text: 'Less monologuing, more nocking arrows, lass! TOGETHER!' },
    ],
    dragonFall: [
      { name: 'Vyrmithrax', text: '(The great dragon lowers its head, wings folding in something like respect.) "...You did not flee. You did not beg. You burned BRIGHTER. Perhaps I was wrong about your kind, little archer."' },
      { name: 'Violca', text: 'Yeah, well. Hold the awe. I\'m not bonding a dragon that ate my whole wing. ...But you can stop terrorizing the Vale. Deal?' },
      { name: 'Vyrmithrax', text: 'Agreed. And to the ones who stood beside her — take a scale of mine for your blades. A Nautilus Spiral, storm-touched. You have earned the sky\'s regard.' },
      { name: 'Narrator', text: 'You received a NAUTILUS SPIRAL seashell! Vyrmithrax takes wing and circles the peak as its guardian, no longer its tyrant.' },
    ],
    violcaLeave: [
      { name: 'Violca', text: 'So that\'s that. The Vale\'s safe, the dragon\'s practically a house cat, and I\'m... still standing. Disappointingly alive.' },
      { name: 'Capt. Redbeard', text: 'Sail with us, lass. The horizon\'s got room for one more dramatic silhouette.' },
      { name: 'Violca', text: '(She almost smiles.) "Don\'t tempt me, sailor. I\'ve got a war college to finish humiliating and a brooding arc to complete. But that offer? ...I\'ll keep it. Like a secret. Like a FAVOR."' },
      { name: 'Violca', text: '"If the wind ever brings you back to the Aerie — I\'ll be the one looking devastating against the sunset. Now GO, before I say something with FEELINGS in it."' },
      { name: 'Narrator', text: 'Violca leaves the party with a swirl of cloak and one last lingering look. (She is no longer available — but Sky Dragon Isle remembers.)' },
    ],

    // ===== The Thing (1982) =====
    macJoin: [
      { name: 'Narrator', text: 'Whiteout Station. A dead research outpost half-buried in ice. The dogs are gone. The radios are dead. And something walks the halls wearing borrowed faces.' },
      { name: '???', text: '(A flamethrower\'s pilot light hisses in the dark.) "Stop right there. Slow. Nobody touches anybody till I know what you are."' },
      { name: 'Mac', text: 'Name\'s Mac. I flew the last chopper that\'ll ever land here. There\'s a thing in this station that can BE anybody — copy you down to the blood. You can\'t kill what you can\'t trust... but you CAN burn it.' },
      { name: 'Capt. Redbeard', text: 'And how do we know YOU\'re not it?' },
      { name: 'Mac', text: 'You don\'t. I don\'t know about you either. So we keep the fire close and we move TOGETHER. When the real thing shows its face — and it will — we light it up. Deal.' },
      { name: 'Narrator', text: 'Mac joins your party as a fourth member — for as long as you\'re in the station. Trust no one. Burn everything. (Leave and he holds the door; end the Thing and he flies on.)' },
    ],
    thingPre: [
      { name: 'Mac', text: 'There. That\'s no man anymore. Look at it.' },
      { name: 'The Thing', text: '(A chorus of stolen voices, all wrong at once.) "We are everyone you trusted. We are warm now. Join us. JOIN US."' },
      { name: 'Mac', text: 'Yeah? Join THIS. Light it up — every tank, right now!' },
    ],
    thingFall: [
      { name: 'Narrator', text: 'The Thing shrieks in a hundred voices and finally, mercifully, burns. The screaming stops. The cold rushes in, clean.' },
      { name: 'Mac', text: '...That\'s it. That\'s the last of it. I think. I HOPE.' },
      { name: 'Narrator', text: 'In the embers you find a Cinder Conch, still warm. (Equip it from the Gear menu.)' },
    ],
    macLeave: [
      { name: 'Mac', text: 'I\'m gonna sit here a while. Make sure nothing\'s still moving. You should go — while you still know who you are.' },
      { name: 'Capt. Redbeard', text: 'Come with us, man. There\'s warmer seas than this.' },
      { name: 'Mac', text: '(He pours a drink, watches the snow.) "Maybe. Why don\'t you... wait a while. See what happens. ...Go on. I\'ll be fine."' },
      { name: 'Narrator', text: 'Mac stays behind to watch the fire. (He is no longer available — but Whiteout Station remembers.)' },
    ],

    // ===== Princess Mononoke =====
    saneJoin: [
      { name: 'Narrator', text: 'The Wildwood. Cherry blossom and old growth — but the birdsong has stopped, and the great trees lean as if in pain.' },
      { name: '???', text: '(A blade of flint at your throat, blood-red war-paint, eyes like a wolf\'s.) "Humans. You STINK of iron and smoke. Give me one reason."' },
      { name: 'Sané', text: 'I am Sané. The wolves raised me; this forest is my mother. Something has POISONED the Forest God — turned the giver of life into a walking death. I will not let it spread to the deep wood.' },
      { name: 'Marina', text: 'We didn\'t bring the poison. But we can help you cut it out. The tides grieve for green things too.' },
      { name: 'Sané', text: '(A long stare. The flint lowers.) "...You speak like the water. Fine. Walk behind me, breathe quietly, and do NOT touch the kodama. We end the God\'s suffering — together. Then you leave my forest."' },
      { name: 'Narrator', text: 'Sané joins your party as a fourth member — for as long as you\'re in the Spirit Wood. Fierce, swift, and fully at home among the trees. (Leave and she guards the path; cleanse the God and she returns to the wolves.)' },
    ],
    forestPre: [
      { name: 'Sané', text: 'There. The Nightwalker. That gentle thing should never look like THAT.' },
      { name: 'The Forest God', text: '(It does not speak. Where its hooves fall, grass blackens and curls to ash. Its antlers drip a cold light.)' },
      { name: 'Sané', text: 'Forgive me. This is mercy, not murder. STRIKE — and aim for the corruption, not the god beneath!' },
    ],
    forestFall: [
      { name: 'Narrator', text: 'The corruption sloughs away like a shed skin. For one breath the Forest God stands whole and luminous — then dissolves into a wind of green that races out through the trees, and the birdsong comes flooding back.' },
      { name: 'Sané', text: '...It\'s free. The wood will heal now. You did this for a forest that was never yours. I won\'t forget it.' },
      { name: 'Narrator', text: 'A Nautilus Spiral, dewed with spirit-light, is left where the god stood. (Equip it from the Gear menu.)' },
    ],
    saneLeave: [
      { name: 'Sané', text: 'My place is here, with the pack and the green. Yours is out there, on that restless water.' },
      { name: 'Capt. Redbeard', text: 'A wolf could do worse than a ship, lass.' },
      { name: 'Sané', text: '(A rare, fierce smile.) "I still don\'t like humans. ...But I think I like YOU. Go. And when your sea is sick the way my forest was — come find me. We\'ll heal it together."' },
      { name: 'Narrator', text: 'Sané melts back into the trees with her wolves. (She is no longer available — but the Wildwood remembers.)' },
    ],

    // ===== Hitchhiker's Guide to the Galaxy =====
    marvynJoin: [
      { name: 'Narrator', text: 'A starship the size of a small town has improbably crashed onto a beach. Its door hisses open. The smell of ozone and existential dread wafts out.' },
      { name: '???', text: '(A flat, crushingly bored voice.) "Oh. Visitors. How thrilling. I won\'t enjoy it. I never enjoy anything. Brain the size of a planet, and they crash-land me on a BEACH."' },
      { name: 'Marvyn', text: 'I\'m Marvyn. A personality prototype. You can tell, can\'t you. There are Vogons aboard — galactic bureaucrats with a demolition order and the worst poetry in the universe. They\'ll process you into PAPERWORK.' },
      { name: 'Capt. Redbeard', text: 'A talking pessimist robot. The crew\'s seen weirder. ...Barely.' },
      { name: 'Marvyn', text: 'I could compute the exact futility of resisting them, to forty decimal places. ...Or I could just come and zap things. It\'s all the same to me. Let\'s get it over with.' },
      { name: 'Narrator', text: 'Marvyn joins your party as a fourth member — for as long as you\'re aboard the wreck. A peerless (and deeply depressed) calculating mind. (Leave and he waits, morosely; clear the Vogons and he wanders off.)' },
    ],
    vogonPre: [
      { name: 'Vogon Constructor', text: 'HALT. By order of the Galactic Hyperspace Planning Council, you are in an UNAUTHORIZED wreck. Form B-12 was not filed. The penalty is poetry.' },
      { name: 'Marvyn', text: 'Oh no. Not the poetry. Anything but— actually, do your worst. I literally cannot feel worse.' },
      { name: 'Vogon Constructor', text: '"Oh freddled gruntbuggly, thy micturations are to me..." PREPARE TO BE BORED TO DEATH.' },
    ],
    vogonFall: [
      { name: 'Narrator', text: 'The Vogon Constructor topples under a barrage of un-filed grievances and one very large logic bomb. Its clipboard clatters away into the surf.' },
      { name: 'Marvyn', text: 'It\'s over. We won. ...I would cheer, but I haven\'t got the heart. Or, technically, a heart. Here — the ship\'s improbability core. A Hex Conch, of sorts. Take it. It\'ll only depress me to keep it.' },
      { name: 'Narrator', text: 'You received a HEX CONCH from the ship\'s drive. (Equip it from the Gear menu.)' },
    ],
    marvynLeave: [
      { name: 'Marvyn', text: 'Well. You\'ll be wanting to leave now. Everyone always does. Don\'t mind me. I\'ll just sit in the wreck and think about the heat-death of the universe.' },
      { name: 'Capt. Redbeard', text: 'You could think about it on the ship, with company.' },
      { name: 'Marvyn', text: '(The longest pause.) "...That\'s the first nice thing anyone\'s said to me in nine hundred years. I shall now spend a decade analysing whether you meant it. Goodbye. Probably."' },
      { name: 'Narrator', text: 'Marvyn trudges back into the wreck to sulk magnificently. (He is no longer available — but the Heart of Gold remembers.)' },
    ],

    // ===== Don Quixote =====
    quijanoJoin: [
      { name: 'Narrator', text: 'La Mancha Plains. Wind, dust, and on the rise ahead — a colossal windmill, its sails turning slow against the sky.' },
      { name: '???', text: '(An old man in mismatched armour and a wash-basin helm levels a bent lance at it.) "Fortune guides us! Behold yonder GIANT — thirty monstrous arms, each a league long! Stand back, friends, while I do battle!"' },
      { name: 'Quijano', text: 'I am Quijano — knight-errant, righter of wrongs, sworn champion of the peerless lady Dulcinea! That fiend has terrorized these plains long enough.' },
      { name: 'Marina', text: '...That\'s a windmill.' },
      { name: 'Quijano', text: 'So the enchanters would have you BELIEVE! They cloak the giant in humble timber to shame me! But a true heart sees truly. Ride with me — and we shall see whose madness wins the day!' },
      { name: 'Narrator', text: 'Quijano joins your party as a fourth member — for as long as you\'re at the mill. Utterly deluded, impossibly brave, and (somehow) genuinely formidable. (Leave and he guards the gate from "giants"; fell the mill and he rides on.)' },
    ],
    giantPre: [
      { name: 'Quijano', text: 'There! It wakes! See how it wheels its dreadful arms, the better to smite us!' },
      { name: 'The Giant (a windmill)', text: '(The wind gusts. The great sails groan around with a sound like a waking colossus, and — improbably — the whole structure tears free of the earth.)' },
      { name: 'Capt. Redbeard', text: '...Quijano. The windmill is GETTING UP.' },
      { name: 'Quijano', text: 'Of COURSE it is! Did I not SAY so?! For Dulcinea — CHARGE!' },
    ],
    giantFall: [
      { name: 'Narrator', text: 'The "giant" crashes back to earth in a heap of splintered timber and grinding stone, and is, once again, unmistakably a windmill. A broken one.' },
      { name: 'Quijano', text: 'Vanquished! You SEE? You doubted, and yet the giant fell! ...Or perhaps it was a windmill after all. Does it matter? We rode at the impossible — and the impossible BROKE.' },
      { name: 'Narrator', text: 'Among the wreckage: a Venom Spiral, glinting like a hidden treasure. (Equip it from the Gear menu.)' },
    ],
    quijanoLeave: [
      { name: 'Quijano', text: 'There are giants yet uncountered, friends, and a knight\'s road is long and lonely and grand.' },
      { name: 'Capt. Redbeard', text: 'There\'s giants at sea too, old man. Real ones. You\'d like them.' },
      { name: 'Quijano', text: '(He bows, deeply, with creaking knees.) "A tempting quest! But Dulcinea waits, and a windmill in the next valley has been looking at me FUNNY. Should ever you need a champion — call the name Quijano, and I shall come."' },
      { name: 'Narrator', text: 'Quijano rides off across the plains toward another "giant." (He is no longer available — but La Mancha remembers.)' },
    ],
  };

  // ---------------- PROGRESSION ----------------
  const xpForLevel = (lvl) => Math.round(25 * Math.pow(lvl, 1.5)); // xp to go lvl -> lvl+1 (smoother early climb)
  const MAX_LEVEL = 30;

  function randomEncounter(enc) {
    const count = Math.floor(Math.random() * (enc.max - enc.min + 1)) + enc.min;
    const keys = [];
    for (let i = 0; i < count; i++) keys.push(enc.pool[Math.floor(Math.random() * enc.pool.length)]);
    return keys;
  }

  // Gen-1-style combat stats per character (Attack lives in the weapon/fight range).
  // def = physical mitigation, spec = magic power AND magic defense, spd = turn order.
  // g* are per-level growth. Archetypes: mages high SPEC, knights high DEF, rogues high SPD.
  const COMBAT_STATS = {
    pirate:   { def: 26, spec: 14, spd: 11, gdef: 2.0, gspec: 1.0, gspd: 0.30 },
    lydia:    { def: 12, spec: 50, spd: 10, gdef: 1.0, gspec: 3.6, gspd: 0.28 },
    swordsman:{ def: 32, spec: 16, spd: 9,  gdef: 2.5, gspec: 1.2, gspd: 0.25 },
    healer:   { def: 18, spec: 40, spd: 10, gdef: 1.5, gspec: 3.0, gspd: 0.30 },
    mage:     { def: 12, spec: 48, spd: 9,  gdef: 1.0, gspec: 3.6, gspd: 0.25 },
    dragoon:  { def: 34, spec: 14, spd: 8,  gdef: 2.5, gspec: 1.0, gspd: 0.20 },
    ruffy:    { def: 24, spec: 12, spd: 13, gdef: 2.0, gspec: 0.8, gspd: 0.40 },
    simon:    { def: 26, spec: 24, spd: 11, gdef: 2.0, gspec: 2.0, gspd: 0.30 },
    aladdin:  { def: 18, spec: 22, spd: 15, gdef: 1.5, gspec: 1.8, gspd: 0.50 },
    violca:   { def: 22, spec: 26, spd: 13, gdef: 1.8, gspec: 2.0, gspd: 0.40 },
    mac:      { def: 30, spec: 16, spd: 9,  gdef: 2.5, gspec: 1.2, gspd: 0.25 },
    sane:     { def: 24, spec: 22, spd: 14, gdef: 2.0, gspec: 1.8, gspd: 0.45 },
    marvyn:   { def: 34, spec: 36, spd: 8,  gdef: 2.5, gspec: 2.5, gspd: 0.20 },
    quijano:  { def: 40, spec: 14, spd: 9,  gdef: 3.0, gspec: 1.0, gspd: 0.20 },
  };

  // ---------------- STORYBOARD ----------------
  // The intended voyage — a suggested order with a logical thread, NOT a hard gate.
  // The Captain's Log walks this spine and surfaces the current chapter + the "why".
  // The legend-isles (Act II) are deliberately open: any order, none strictly required.
  const LEGEND_ALLIES = ['simon', 'aladdin', 'violca', 'mac', 'sane', 'quijano', 'lydia'];
  const STORYBOARD = {
    allies: LEGEND_ALLIES,
    spine: [
      { id: 'footing', act: 'I', actName: 'The Home Tides', title: 'Find your footing',
        goal: 'Explore Tidehaven and clear the Tide Cave.',
        thread: 'Tidehaven is the last harbor the blight hasn\'t reached. The lanes east are strangled by something vast — so learn these home waters, blood a blade in the Tide Cave, and ready a crew before you sail into the dark.' },
      { id: 'attune', act: 'I', actName: 'The Home Tides', title: 'Court the elemental mermaids',
        goal: 'Win the favor of the six elemental mermaids across the home isles.',
        thread: 'Steel alone can\'t cut the tide. The six mermaids still hold the sea\'s old power — fire, water, storm, stone, dark and light. Win their hearts and they\'ll enchant your crew\'s blades with their element. You don\'t need all six to push on, but every one makes the road kinder.' },
      { id: 'kraken', act: 'I', actName: 'The Home Tides', title: 'Fell the Kraken',
        goal: 'Sail to the Abyssal Isle and bring down the Kraken.',
        thread: 'The Kraken coils around the Abyssal Isle — the blight\'s herald, the lock on the door east. With the elements at your back, break it. The wider sea opens only once the Kraken sinks.' },
      { id: 'legends', act: 'II', actName: 'Legends of the Wider Sea', title: 'Break the cursed legends',
        goal: 'Sail the wider world; end the curse on each legend-isle and recruit its stranded hero.',
        thread: 'Past the Abyss the world turns strange — a bleeding castle, a wishing cave, a grieving forest, a frozen station that wears men\'s faces, and a striped Neitherworld where a goth girl named Lydia is caged with her parents by a cackling trickster. Each cursed story strands a hero who\'ll sail with you if you end their nightmare. Take them in any order, take as many as you like — but notice how every legend has curdled the same way. Something is wearing the world\'s old stories like masks.' },
      { id: 'omega', act: 'III', actName: 'The Drowned Spire', title: 'Brave the final trial',
        goal: 'Once enough heroes stand with you, split into TWO crews and brave the Drowned Spire — a branch each, then Selachoth and the Omega Tide.',
        thread: 'Past the Kraken the spire still drowns the horizon. Selachoth waits in its heart — the Omega Tide, a shark-god swallowing the sea\'s elements whole; the fading mermaids and the curdled legends were all its hunger spreading outward. The final door opens only for a captain who can field TWO full crews, so you must first free enough heroes from the cursed isles. One crew braves each branch of the spire; then, together, you end the Tide.' },
      { id: 'mastery', act: 'III', actName: 'The Drowned Spire', title: 'The seas are yours',
        goal: 'Charm every mermaid and complete the bestiary for total mastery.',
        thread: 'Selachoth is sunk and the tide runs clean. What remains is legend-work: every mermaid charmed, every creature logged, the duelists of the arena and the lone blade of Castaway Cove answered. Sail for the joy of it now, Captain.' },
    ],
    side: [
      { title: '⚔️ The Arena (Paegina)', thread: 'A no-healing gauntlet of Greek myth — Medusa, Minotaur, Hydra and worse. Pure proving-ground; clear leagues for coin and glory.' },
      { title: '🗡️ The Drifter (Castaway Cove)', thread: 'A lone magpie of blades waits on a sunset shore — an optional duel for the strong, no story strings attached.' },
    ],
  };

  return { PARTY, ENEMIES, ITEM_DEFS, COMBAT_STATS, SHOP_STOCK, SHOP_STOCK_BY_TOWN, MATERIALS, RECIPES, WEAPONS, SHELLS, SHOP_SHELLS, shellAbility, TOWNS, ISLANDS, SEA, DUNGEONS, STORY, STORYBOARD, COSMOS,
           ELEMENT_INFO, elementOf, affMult, AFFINITIES, STATUS, ACCESSORIES, SHOP_ACCESSORIES, COLISEUM, LIMITS, weaponIcon, shellIcon, SHIP, SHIP_CUSTOM, SHIP_UPGRADES, ENEMY_SHIPS, SHELL_HUNT, MERMAIDS, AMBUSH,
           xpForLevel, MAX_LEVEL, randomEncounter, STORYBOARD };
})();
