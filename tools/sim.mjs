// =====================================================================
//  sim.mjs — headless combat balance simulator.
//  Loads the REAL Data + Progress.derived in a sandbox (so party stats are
//  exact) and re-implements battle.js's combat math (CTB, weakness/mitigation,
//  stagger/BREAK, statuses, enemy AI, limits) to run each encounter many times.
//  Reports time-to-kill (rounds), win rate and party HP left, so balance can be
//  tuned with numbers instead of vibes.
//
//  Caveats (intentionally conservative — real game is EASIER than the sim):
//    · no consumables (potions/phoenix) and no learned skill-tree nodes
//    · party uses base abilities + level-appropriate weapons only
//  So: high "rounds" = a genuine sponge; low win-rate = genuinely lethal.
//
//  Run:  node tools/sim.mjs
// =====================================================================
import fs from 'node:fs';
import vm from 'node:vm';
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---- load Data + Progress in one sandbox ----
const ls = { _d: {}, getItem(k){ return this._d[k] ?? null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
const sandbox = { window: {}, localStorage: ls, console, Math, Object, Array, JSON, Date, parseInt, parseFloat, isNaN, setTimeout: () => {} };
sandbox.window.localStorage = ls;
vm.runInNewContext(read('js/data.js'), sandbox);
sandbox.Data = sandbox.window.Data;   // progress.js references Data as a bare global (window.* is global in a browser)
vm.runInNewContext(read('js/progress.js'), sandbox);
const D = sandbox.window.Data, P = sandbox.window.Progress;
if (!D || !P) { console.error('FATAL: Data/Progress did not load'); process.exit(1); }

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const ESPD = { greeterguy:7, shark:11, beetlejuice:11, sandling:9, shade:11, gravehand:6, crab:6, jelly:7, octo:9, gull:14, golem:5, kraken:8, selachoth:12, leviathan:9, angler:8, eel:13, urchin:6, bat:15, ghoul:7, wraith:11, vampire:12, drifter:14, cobra:12, scarab:7, genie:10, wyvern:13, skydragon:11, harpy:15, satyr:11, cyclops:5, minotaur:9, medusa:11, hydra:9, thething:11, forestgod:9, vogon:6, windmill:5, thingspawn:8, kodama:12, boarspirit:11, vogonclerk:6, sentry:13, mutton:8, windvane:6, ruffy_duel:12 };

// ---- build a party at a target level with level-appropriate weapons ----
function buildParty(level) {
  const st = P.freshState();
  const active = st.active.slice(0, 3);
  return active.map(key => {
    const ms = st.party.find(p => p.key === key);
    ms.level = level;
    // equip a level-appropriate weapon (sim weapon progression)
    const list = D.WEAPONS[key] || [];
    if (list.length) { const idx = Math.min(list.length - 1, Math.floor((level - 1) / 7)); const w = list[idx];
      st.ownedWeapons[key] = list.slice(0, idx + 1).map(x => x.key); st.equip[key].weapon = w.key; st.equip[key].wslots = new Array(w.slots).fill(null); }
    const d = P.derived(ms, st);
    return { side: 'party', key, name: d.name, maxhp: d.maxhp, hp: d.maxhp, maxmp: d.maxmp, mp: d.maxmp,
      def: d.def, spec: d.spec, spd: d.spd || 10, fight: d.fight, abilities: d.abilities || [], dr: d.dr || 0,
      immune: d.immune || [], limit: 25, ct: 0, st: {}, alive: true, _defend: false };
  });
}

// ---- enemy factory ----
function makeEnemy(key, ehpMul, edmgMul) {
  const def = D.ENEMIES[key]; if (!def) return null;
  return { side: 'enemy', keyRaw: key, name: def.name, maxhp: Math.max(1, Math.round(def.hp * ehpMul)), hp: Math.max(1, Math.round(def.hp * ehpMul)),
    def: def.def != null ? def.def : Math.round(def.hp * 0.05), spec: def.spec != null ? def.spec : Math.round(def.hp * 0.045),
    spd: ESPD[key] || 8, moves: def.moves || [{ name: 'attacks', min: 8, max: 12 }], edmg: edmgMul,
    stagger: 0, staggerMax: def.staggerMax || 3, broken: false, ct: 0, st: {}, alive: true, rotate: def.rotate };
}

const hasSt = (a, k) => a.st && a.st[k] > 0;
const effSpd = a => { let s = a.spd || 8; if (hasSt(a, 'haste')) s *= 1.7; if (hasSt(a, 'slow')) s *= 0.55; return Math.max(1, s); };

function affMult(e, element) {
  if (!element || element === 'physical') return 1;
  if (e.rotate) { const a = D.AFFINITIES[e.keyRaw]; if (a && a.absorb && a.absorb.includes(element)) return -1; if (a && a.nullify && a.nullify.includes(element)) return 0; return 1; }
  return D.affMult(e.keyRaw, element);
}

function hurtEnemy(e, dmg, element, kind) {
  if (!isFinite(dmg) || dmg < 0) dmg = 0;
  const mult = affMult(e, element);
  if (mult < 0) { e.hp = Math.min(e.maxhp, e.hp + Math.round(dmg * 0.6)); return; }
  if (mult === 0) return;
  if (mult > 1) { e.ct += 28 / (e.spd || 8); e.stagger++; if (!e.broken && e.stagger >= e.staggerMax) { e.broken = true; e.stagger = 0; e.ct += 100 / (e.spd || 8); } }
  dmg = Math.round(dmg * mult);
  if (e.broken) dmg = Math.round(dmg * 1.5);
  if (kind === 'mag') dmg = Math.max(1, Math.round(dmg * (110 / (110 + (e.spec || 0)))));
  else dmg = Math.max(1, Math.round(dmg * (90 / (90 + (e.def || 0)))));
  if (hasSt(e, 'weaken')) dmg = Math.round(dmg * 1.3);
  e.hp = Math.max(0, e.hp - dmg); if (e.hp <= 0) e.alive = false;
}
function hurtMember(p, dmg, kind) {
  if (!isFinite(dmg) || dmg < 0) dmg = 0;
  if (hasSt(p, 'weaken')) dmg = Math.round(dmg * 1.3);
  if (kind === 'mag') dmg = Math.max(1, Math.round(dmg * (85 / (85 + (p.spec || 0)))));
  else dmg = Math.max(1, Math.round(dmg * (85 / (85 + (p.def || 0)))));
  if (p.dr) dmg = Math.round(dmg * (1 - p.dr));
  p.hp = Math.max(0, p.hp - dmg); p.limit = Math.min(100, p.limit + Math.round(dmg / p.maxhp * 90) + 14);
  if (p.hp <= 0) p.alive = false;
}
function inflict(t, key, turns) { const sd = D.STATUS[key]; if (!sd) return; if (sd.bad && t.immune && t.immune.includes(key)) return; t.st[key] = Math.max(t.st[key] || 0, turns || 3); }

// status tick at the start of an actor's turn → returns true if it died
function tick(a) {
  if (hasSt(a, 'poison')) { a.hp = Math.max(0, a.hp - Math.max(1, Math.round(a.maxhp * 0.08))); if (a.hp <= 0) a.alive = false; }
  if (a.alive && hasSt(a, 'regen')) a.hp = Math.min(a.maxhp, a.hp + Math.round(a.maxhp * 0.10));
  Object.keys(a.st).forEach(k => { if (a.st[k] > 0) a.st[k]--; });
  return !a.alive;
}

function partyTurn(m, party, foes) {
  const lowAlly = party.filter(p => p.alive).sort((x, y) => x.hp / x.maxhp - y.hp / y.maxhp)[0];
  const target = foes.filter(e => e.alive).sort((x, y) => x.hp - y.hp)[0];
  if (!target) return;
  // limit break when full — big all-enemy hit (or party heal for the healer)
  if (m.limit >= 100) {
    const L = D.LIMITS[m.key];
    if (L) { m.limit = 0;
      if (L.heal) { party.forEach(p => { if (p.alive || L.revive) { p.alive = true; p.hp = Math.min(p.maxhp, p.hp + rnd(L.min, L.max)); } }); return; }
      const el = L.el || 'physical'; foes.forEach(e => { if (e.alive) hurtEnemy(e, rnd(L.min, L.max), el, 'mag'); }); return; }
  }
  // healer: heal a hurt ally
  const heal = m.abilities.find(a => a.heal && a.mp <= m.mp);
  if (heal && lowAlly && lowAlly.hp < lowAlly.maxhp * 0.4) {
    m.mp -= heal.mp; lowAlly.hp = Math.min(lowAlly.maxhp, lowAlly.hp + Math.round(rnd(heal.min, heal.max) * (0.85 + (m.spec || 20) / 110))); m.limit = Math.min(100, m.limit + 14); return;
  }
  // damage ability that exploits a weakness (or a strong AoE) if affordable
  const dmgAbils = m.abilities.filter(a => !a.heal && (a.min || a.max) && a.mp <= m.mp);
  let used = null;
  for (const a of dmgAbils) { const el = D.elementOf(a); if (affMult(target, el) > 1) { used = a; break; } }
  if (!used && dmgAbils.length && foes.filter(e => e.alive).length >= 2) used = dmgAbils.find(a => a.target === 'all') || null;
  if (used) {
    m.mp -= used.mp; const el = D.elementOf(used); const dmg = Math.round(rnd(used.min, used.max) * 1.5 * (0.75 + (m.spec || 20) / 80));
    if (used.target === 'all') foes.forEach(e => { if (e.alive) hurtEnemy(e, dmg, el, 'mag'); }); else hurtEnemy(target, dmg, el, 'mag');
    m.limit = Math.min(100, m.limit + 14); return;
  }
  // basic attack
  let dmg = rnd(m.fight.min, m.fight.max); if (Math.random() < (m.fight.crit || 0)) dmg = Math.round(dmg * 1.8);
  hurtEnemy(target, dmg, m.fight.el || 'physical', 'phys'); m.limit = Math.min(100, m.limit + 12);
}
function enemyTurn(e, party) {
  const alive = party.filter(p => p.alive); if (!alive.length) return;
  const move = e.moves[rnd(0, e.moves.length - 1)];
  if (move.heal) { e.hp = Math.min(e.maxhp, e.hp + Math.round(e.maxhp * 0.12)); return; }
  const boost = (hasSt(e, 'atkup') ? 1.3 : 1) * e.edmg;
  const kind = (move.el && move.el !== 'physical') ? 'mag' : 'phys';
  const victims = move.all ? alive : [alive[rnd(0, alive.length - 1)]];
  victims.forEach(p => { hurtMember(p, Math.round(rnd(move.min, move.max) * boost), kind); if (move.status && p.alive) inflict(p, Array.isArray(move.status) ? move.status[0] : move.status, move.turns); });
}

// run one battle → { win, rounds, hpLeft }
function runBattle(party, foes, maxActions = 4000) {
  party.forEach(p => { p.hp = p.maxhp; p.mp = p.maxmp; p.alive = true; p.limit = 25; p.st = {}; p.ct = 0; });
  foes.forEach(e => { e.hp = e.maxhp; e.alive = true; e.stagger = 0; e.broken = false; e.st = {}; e.ct = 0; });
  let actions = 0;
  const actorsAlive = () => [...party, ...foes].filter(a => a.alive);
  while (actions++ < maxActions) {
    const al = actorsAlive(); if (!al.length) break;
    al.sort((x, y) => (x.ct - y.ct) || (x.side === 'party' ? -1 : 1));
    const a = al[0]; const minCt = a.ct; [...party, ...foes].forEach(x => { if (x.alive) x.ct -= minCt; });
    if (tick(a)) { a.ct += 100 / effSpd(a); continue; }
    if (!a.alive) continue;
    if (a.side === 'enemy' && a.broken) { a.broken = false; a.ct += 100 / effSpd(a); continue; } // BREAK skip
    if (a.side === 'party') partyTurn(a, party, foes); else enemyTurn(a, party);
    a.ct += 100 / effSpd(a);
    if (!party.some(p => p.alive)) return { win: false, rounds: actions, hpLeft: 0 };
    if (!foes.some(e => e.alive)) { const hp = party.reduce((s, p) => s + Math.max(0, p.hp), 0), mhp = party.reduce((s, p) => s + p.maxhp, 0); return { win: true, rounds: actions, hpLeft: hp / mhp }; }
  }
  return { win: false, rounds: actions, hpLeft: 0, stall: true }; // hit the action cap → unkillable / stall
}

function trials(party, foesFactory, n) {
  let wins = 0, rounds = 0, hp = 0, stalls = 0;
  for (let i = 0; i < n; i++) { const r = runBattle(party, foesFactory()); if (r.win) { wins++; hp += r.hpLeft; } if (r.stall) stalls++; rounds += r.rounds; }
  return { winRate: wins / n, avgRounds: rounds / n, avgHpLeft: wins ? hp / wins : 0, stalls };
}

// ===================== RUN =====================
const N = 200;
const pct = x => (x * 100).toFixed(0) + '%';
const pad = (s, n) => String(s).padEnd(n);
// intended party level when you first meet an enemy, derived from its XP tier
const lvlReg = xp => Math.max(4, Math.min(20, Math.round(5 + (xp - 18) * 0.5)));
const lvlBoss = xp => Math.max(10, Math.min(36, Math.round(12 + (xp - 160) * 0.027)));
const pcache = {};
const partyAt = L => pcache[L] || (pcache[L] = buildParty(L));

console.log(`\n=== COMBAT BALANCE SIM (${N} battles each · enemies fought at their INTENDED level · party = base abilities + level weapons, no items) ===`);

// regular enemies — 3-pack at intended level
const regular = Object.keys(D.ENEMIES).filter(k => !D.ENEMIES[k].boss);
console.log(`\n— Regular enemies · pack of 3 · at intended level —`);
console.log(pad('enemy', 16), pad('Lv', 4), pad('win', 6), pad('rounds', 8), pad('partyHP', 8), 'flags');
const regRows = regular.map(k => { const L = lvlReg(D.ENEMIES[k].xp || 24); return { k, L, ...trials(partyAt(L), () => [makeEnemy(k, 1, 1), makeEnemy(k, 1, 1), makeEnemy(k, 1, 1)], N) }; });
regRows.sort((a, b) => a.avgHpLeft - b.avgHpLeft);
for (const r of regRows) {
  const flags = []; if (r.winRate < 0.6) flags.push('LETHAL'); if (r.avgHpLeft > 0.9 && r.winRate > 0.99) flags.push('TRIVIAL'); if (r.avgRounds > 45) flags.push('SPONGE'); if (r.stalls) flags.push('STALL×' + r.stalls);
  console.log(pad(r.k, 16), pad(r.L, 4), pad(pct(r.winRate), 6), pad(r.avgRounds.toFixed(1), 8), pad(pct(r.avgHpLeft), 8), flags.join(' '));
}

// bosses — solo at intended level
const bosses = Object.keys(D.ENEMIES).filter(k => D.ENEMIES[k].boss);
console.log(`\n— Bosses · solo · at intended level —`);
console.log(pad('boss', 16), pad('Lv', 4), pad('win', 6), pad('rounds', 8), pad('partyHP', 8), 'flags');
const bossRows = bosses.map(k => { const L = lvlBoss(D.ENEMIES[k].xp || 300); return { k, L, ...trials(partyAt(L), () => [makeEnemy(k, 1, 1)], N) }; });
bossRows.sort((a, b) => a.avgHpLeft - b.avgHpLeft);
for (const r of bossRows) {
  const flags = []; if (r.winRate < 0.6) flags.push('LETHAL'); if (r.avgHpLeft > 0.9 && r.winRate > 0.99) flags.push('TRIVIAL'); if (r.avgRounds > 90) flags.push('SPONGE'); if (r.stalls) flags.push('STALL×' + r.stalls);
  console.log(pad(r.k, 16), pad(r.L, 4), pad(pct(r.winRate), 6), pad(r.avgRounds.toFixed(1), 8), pad(pct(r.avgHpLeft), 8), flags.join(' '));
}
console.log('');

// ---- difficulty calibration: sweep (HP,DMG) multipliers to find a real challenge curve ----
// goal for a good Hard: win ~85-95%, party HP left ~30-55%. Brutal: win ~70-85%, HP ~15-35%.
const combos = [[1, 1, 'normal(now)'], [1.35, 1.3, 'hard(now)'], [1.7, 1.7, '—'], [2.1, 2.2, '—'], [2.6, 2.8, '—'], [3.2, 3.4, '—']];
const sampleBosses = ['kraken', 'medusa', 'leviathan', 'skydragon', 'hydra', 'drifter'];
const sampleReg = ['shark', 'golem', 'wraith', 'cyclops'];
console.log('— Difficulty calibration (avg over sample bosses solo + regular 3-packs, at intended level) —');
console.log(pad('HPx', 6), pad('DMGx', 6), pad('label', 12), pad('bossWin', 8), pad('bossHP', 8), pad('regWin', 8), pad('regHP', 8));
for (const [hp, dmg, label] of combos) {
  let bw = 0, bh = 0, rw = 0, rh = 0;
  for (const k of sampleBosses) { const L = lvlBoss(D.ENEMIES[k].xp); const r = trials(partyAt(L), () => [makeEnemy(k, hp, dmg)], 120); bw += r.winRate; bh += r.avgHpLeft; }
  for (const k of sampleReg) { const L = lvlReg(D.ENEMIES[k].xp); const r = trials(partyAt(L), () => [makeEnemy(k, hp, dmg), makeEnemy(k, hp, dmg), makeEnemy(k, hp, dmg)], 120); rw += r.winRate; rh += r.avgHpLeft; }
  console.log(pad(hp, 6), pad(dmg, 6), pad(label, 12), pad(pct(bw / sampleBosses.length), 8), pad(pct(bh / sampleBosses.length), 8), pad(pct(rw / sampleReg.length), 8), pad(pct(rh / sampleReg.length), 8));
}
console.log('');

