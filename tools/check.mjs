// =====================================================================
//  check.mjs — headless integrity checker for the RPG's data + wiring.
//  Loads js/data.js in a sandbox (it only needs `window`) and cross-checks
//  every reference; scrapes models/battle/portraits source for coverage.
//  Run:  node tools/check.mjs    (exit 1 if any error)
// =====================================================================
import fs from 'node:fs';
import vm from 'node:vm';

const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// ---- load Data ----
const sandbox = { window: {}, console, Math, Object, Array, JSON, Date, parseInt, parseFloat, isNaN };
vm.runInNewContext(read('js/data.js'), sandbox);
const D = sandbox.window.Data;
if (!D) { console.error('FATAL: window.Data did not load'); process.exit(1); }

// ---- scrape source for coverage maps ----
const keysOf = (src, re) => { const m = src.match(re); if (!m) return []; return [...m[1].matchAll(/(\w+)\s*:/g)].map(x => x[1]); };
const models = read('js/models.js');
const battle = read('js/battle.js');
const portraits = read('js/portraits.js');
const enemyBuilders = (models.match(/const ENEMY_BUILDERS\s*=\s*\{([^}]*)\}/) || [, ''])[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
const modelReturn = (models.match(/return\s*\{\s*use[^}]*\}/s) || [, ''])[0];
const espd = keysOf(battle, /const ESPD\s*=\s*\{([^}]*)\}/);
const pspd = keysOf(battle, /const PSPD\s*=\s*\{([^}]*)\}/);
const spec = keysOf(portraits, /const SPEC\s*=\s*\{([\s\S]*?)\n  \};/);

const ELEMS = Object.keys(D.ELEMENT_INFO);
const has = (obj, k) => obj && Object.prototype.hasOwnProperty.call(obj, k);

// ---- PARTY ----
const partyKeys = D.PARTY.map(p => p.key);
D.PARTY.forEach(p => {
  if (!modelReturn.includes(p.model)) err(`PARTY ${p.key}: model '${p.model}' not exported by Models`);
  if (!has(D.WEAPONS, p.key)) err(`PARTY ${p.key}: no WEAPONS entry`);
  if (!has(D.LIMITS, p.key)) err(`PARTY ${p.key}: no LIMITS entry`);
  if (!pspd.includes(p.key)) warn(`PARTY ${p.key}: no PSPD (battle speed) entry — defaults to 10`);
  // skill tree: unique ids, valid reqs, branch sanity
  const ids = new Set();
  (p.tree || []).forEach(n => {
    if (ids.has(n.id)) err(`PARTY ${p.key}: duplicate skill id '${n.id}'`); ids.add(n.id);
    if (n.req && !(p.tree.find(x => x.id === n.req))) err(`PARTY ${p.key}: skill '${n.id}' req '${n.req}' missing`);
    if (n.kind === 'ability' && n.ability && n.ability.el && !ELEMS.includes(n.ability.el)) err(`PARTY ${p.key}: skill '${n.id}' bad element '${n.ability.el}'`);
  });
});

// ---- ENEMIES ----
Object.keys(D.ENEMIES).forEach(k => {
  const e = D.ENEMIES[k];
  if (!enemyBuilders.includes(e.model)) err(`ENEMY ${k}: model '${e.model}' not in ENEMY_BUILDERS`);
  if (!espd.includes(k)) warn(`ENEMY ${k}: no ESPD entry — defaults to 8`);
  if (!has(D.AFFINITIES, k)) warn(`ENEMY ${k}: no AFFINITIES entry`);
  (e.drops || []).forEach(d => { if (!has(D.MATERIALS, d.mat)) err(`ENEMY ${k}: drop '${d.mat}' not in MATERIALS`); });
  (e.rotate || []).forEach(el => { if (!ELEMS.includes(el)) err(`ENEMY ${k}: rotate element '${el}' invalid`); });
});
// affinity elements valid + enemy exists
Object.keys(D.AFFINITIES).forEach(k => {
  if (!has(D.ENEMIES, k)) warn(`AFFINITIES ${k}: no matching ENEMY`);
  ['weak', 'resist', 'absorb', 'nullify'].forEach(t => (D.AFFINITIES[k][t] || []).forEach(el => { if (!ELEMS.includes(el)) err(`AFFINITIES ${k}.${t}: bad element '${el}'`); }));
});

// ---- ITEMS / SHELLS / ACCESSORIES / MATERIALS / RECIPES ----
const itemKeys = Object.keys(D.ITEM_DEFS);
D.SHOP_STOCK.forEach(k => { if (!has(D.ITEM_DEFS, k)) err(`SHOP_STOCK: '${k}' not an item`); });
Object.keys(D.SHOP_STOCK_BY_TOWN).forEach(t => D.SHOP_STOCK_BY_TOWN[t].forEach(k => { if (!has(D.ITEM_DEFS, k)) err(`SHOP_STOCK_BY_TOWN ${t}: '${k}' not an item`); }));
D.SHOP_SHELLS.forEach(k => { if (!has(D.SHELLS, k)) err(`SHOP_SHELLS: '${k}' not a shell`); });
(D.SHOP_ACCESSORIES || []).forEach(k => { if (!has(D.ACCESSORIES, k)) err(`SHOP_ACCESSORIES: '${k}' not an accessory`); });
D.RECIPES.forEach(r => { if (!has(D.ITEM_DEFS, r.out)) err(`RECIPE: out '${r.out}' not an item`); Object.keys(r.cost).forEach(m => { if (!has(D.MATERIALS, m)) err(`RECIPE ${r.out}: cost mat '${m}' not in MATERIALS`); }); });
Object.keys(D.SHELLS).forEach(k => { const s = D.SHELLS[k]; if (s.ability && s.ability.el && !ELEMS.includes(s.ability.el)) err(`SHELL ${k}: bad element '${s.ability.el}'`); });
Object.keys(D.ITEM_DEFS).forEach(k => { const it = D.ITEM_DEFS[k]; if (it.el && !ELEMS.includes(it.el)) err(`ITEM ${k}: bad element '${it.el}'`); });

// ---- ISLANDS / SEA ----
Object.keys(D.ISLANDS).forEach(k => {
  const isl = D.ISLANDS[k];
  if (isl.town && !has(D.TOWNS, isl.town.key)) err(`ISLAND ${k}: town '${isl.town.key}' missing`);
  if (isl.dungeon && !has(D.DUNGEONS, isl.dungeon.key)) err(`ISLAND ${k}: dungeon '${isl.dungeon.key}' missing`);
  (isl.encounters || []).forEach(en => en.pool.forEach(m => { if (!has(D.ENEMIES, m)) err(`ISLAND ${k} encounter: enemy '${m}' missing`); }));
  if (isl.superboss && !has(D.ENEMIES, isl.superboss.key)) err(`ISLAND ${k}: superboss '${isl.superboss.key}' missing`);
  (isl.mermaids || []).forEach(mm => { if (!has(D.MERMAIDS, mm.key)) err(`ISLAND ${k}: mermaid '${mm.key}' missing`); });
});
D.SEA.islands.forEach(s => { if (!has(D.ISLANDS, s.key)) err(`SEA: island '${s.key}' missing`); });

// ---- DUNGEONS ----
Object.keys(D.DUNGEONS).forEach(k => {
  const d = D.DUNGEONS[k];
  if (!has(D.ISLANDS, d.island)) err(`DUNGEON ${k}: island '${d.island}' missing`);
  (d.mobs || []).forEach(m => m.pool.forEach(e => { if (!has(D.ENEMIES, e)) err(`DUNGEON ${k} mob: enemy '${e}' missing`); }));
  if (d.bossMob && !has(D.ENEMIES, d.bossMob.key)) err(`DUNGEON ${k}: bossMob '${d.bossMob.key}' missing`);
  if (d.reward && d.reward.shell && !has(D.SHELLS, d.reward.shell)) err(`DUNGEON ${k}: reward shell '${d.reward.shell}' missing`);
  if (d.ally) { if (!partyKeys.includes(d.ally.key)) err(`DUNGEON ${k}: ally '${d.ally.key}' not a PARTY member`);
    ['join', 'pre', 'fall', 'leave'].forEach(s => { if (d.ally[s] && !has(D.STORY, d.ally[s])) err(`DUNGEON ${k}: ally story '${d.ally[s]}' missing in STORY`); }); }
});

// ---- TOWNS ----
const SERVICES = ['inn', 'shop', 'observatory', 'arcade1', 'arcade2', 'respec'];
Object.keys(D.TOWNS).forEach(k => {
  (D.TOWNS[k].npcs || []).forEach(n => { if (n.service && !SERVICES.includes(n.service)) warn(`TOWN ${k}: npc '${n.name}' unknown service '${n.service}'`); });
});

// ---- COLISEUM ----
(D.COLISEUM || []).forEach(l => {
  l.waves.forEach((w, i) => w.forEach(e => { if (!has(D.ENEMIES, e)) err(`COLISEUM ${l.key} wave ${i}: enemy '${e}' missing`); }));
  if (l.need && !D.COLISEUM.find(x => x.key === l.need)) err(`COLISEUM ${l.key}: need '${l.need}' missing`);
  const rw = l.reward || {};
  if (rw.shell && !has(D.SHELLS, rw.shell)) err(`COLISEUM ${l.key}: reward shell '${rw.shell}' missing`);
  if (rw.accessory && !has(D.ACCESSORIES, rw.accessory)) err(`COLISEUM ${l.key}: reward accessory '${rw.accessory}' missing`);
  if (rw.items) Object.keys(rw.items).forEach(it => { if (!has(D.ITEM_DEFS, it)) err(`COLISEUM ${l.key}: reward item '${it}' missing`); });
});

// ---- report ----
console.log(`\n=== Integrity check: ${Object.keys(D.ENEMIES).length} enemies, ${D.PARTY.length} party, ${Object.keys(D.ISLANDS).length} islands, ${Object.keys(D.DUNGEONS).length} dungeons ===`);
warns.forEach(w => console.log('  ⚠ ' + w));
errors.forEach(e => console.log('  ✖ ' + e));
console.log(`\n${errors.length} errors, ${warns.length} warnings.`);
process.exit(errors.length ? 1 : 0);
