// =====================================================================
//  Progress — persistent party state, XP/levels, derived stats,
//  and the skill-tree screen.
// =====================================================================
window.Progress = (function () {
  const SAVE_KEY = 'beachbrawl_save_v1';

  function freshState() {
    const party = Data.PARTY.map(def => ({
      key: def.key, level: 1, xp: 0, sp: 0, learned: {}, hpCur: null, mpCur: null, recruited: !def.temporary,
    }));
    const inv = { potion: 3, hipotion: 0, ether: 1, phoenix: 1, bomb: 1 };

    // equipment: starting weapon per character + empty shell slots
    const equip = {}, ownedWeapons = {}, shells = [];
    let shellSeq = 1;
    Data.PARTY.forEach(def => {
      const startW = Data.WEAPONS[def.key][0];
      ownedWeapons[def.key] = [startW.key];
      equip[def.key] = { weapon: startW.key, wslots: new Array(startW.slots).fill(null), accessory: null, aslots: [] };
    });
    ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: shellSeq++, key, level: 1, ap: 0 }));

    const start = Data.ISLANDS.tidehaven;
    const state = {
      gold: 80, pearls: 0, party, active: ['pirate', 'swordsman', 'healer'], inv, mats: {}, bestiary: {}, equip, ownedWeapons, ownedAccessories: ['coral_bangle'], shells, shellSeq,
      ship: { hull: Data.SHIP.defaults.hull, sail: Data.SHIP.defaults.sail, flag: Data.SHIP.defaults.flag, upg: {} },
      mermaids: {}, enchants: {},
      location: { place: 'island', island: 'tidehaven', x: start.spawn.x, z: start.spawn.z, shipX: Data.SEA.spawn.x, shipZ: Data.SEA.spawn.z },
      islands: { tidehaven: { cleared: {} }, dunes: { cleared: {} }, spire: { cleared: {} }, mall: { cleared: {} }, duskmoor: { cleared: {} }, mirage: { cleared: {} }, aerie: { cleared: {} }, paegina: { cleared: {} }, whiteout: { cleared: {} }, wildwood: { cleared: {} }, improbable: { cleared: {} }, lamancha: { cleared: {} } },
      coliseum: {},
      dungeons: {}, shipsSunk: {},
      prog: { krakenDown: false, finalWin: false, ruffyGone: false },
      flags: {},
    };
    party.forEach(p => { const d = derived(p, state); p.hpCur = d.maxhp; p.mpCur = d.maxmp; });
    return state;
  }
  const shellById = (state, id) => state.shells.find(s => s.id === id);
  const activeMembers = (state) => state.active.map(k => state.party.find(p => p.key === k)).filter(p => p && p.recruited !== false);

  // recruit / dismiss a (temporary) party member
  function recruit(state, key, maxActive) {
    const p = state.party.find(m => m.key === key); if (!p) return; p.recruited = true;
    const d = derived(p, state); if (p.hpCur == null || p.hpCur <= 0) { p.hpCur = d.maxhp; p.mpCur = d.maxmp; }
    if (!state.active.includes(key) && state.active.length < (maxActive || 3)) state.active.push(key);
    save(state);
  }
  function dismiss(state, key) {
    const p = state.party.find(m => m.key === key); if (p) p.recruited = false;
    const i = state.active.indexOf(key); if (i >= 0) state.active.splice(i, 1);
    if (state.active.length === 0) { const first = state.party.find(m => m.recruited); if (first) state.active.push(first.key); }
    save(state);
  }

  function def(key) { return Data.PARTY.find(p => p.key === key); }

  // compute current stats from base + growth*level + skill nodes + equipment
  function derived(memberState, state) {
    state = state || (window.Game && Game.state);
    const d = def(memberState.key);
    const lvl = memberState.level;
    let maxhp = d.base.hp + d.growth.hp * (lvl - 1);
    let maxmp = d.base.mp + d.growth.mp * (lvl - 1);
    let atkBonus = d.growth.atk * (lvl - 1);
    let crit = d.base.crit;
    // Gen-1-style stats: DEF (physical mitigation), SPEC (magic power + magic defense), SPD (turn order)
    const cs = (Data.COMBAT_STATS && Data.COMBAT_STATS[memberState.key]) || { def: 22, spec: 20, spd: 10, gdef: 2, gspec: 1.5, gspd: 0.3 };
    let defStat = cs.def + (cs.gdef || 0) * (lvl - 1);
    let specStat = cs.spec + (cs.gspec || 0) * (lvl - 1);
    let spdStat = cs.spd + (cs.gspd || 0) * (lvl - 1);
    const abilities = d.baseAbilities.slice();

    d.tree.forEach(node => {
      if (!memberState.learned[node.id]) return;
      if (node.kind === 'stat') {
        if (node.stat.hp) maxhp += node.stat.hp;
        if (node.stat.mp) maxmp += node.stat.mp;
        if (node.stat.atk) atkBonus += node.stat.atk;
        if (node.stat.crit) crit += node.stat.crit;
        if (node.stat.def) defStat += node.stat.def;
        if (node.stat.spec) specStat += node.stat.spec;
        if (node.stat.spd) spdStat += node.stat.spd;
      } else if (node.kind === 'ability') {
        abilities.push(node.ability);
      }
    });

    // equipment: weapon + accessory, each carrying shell slots (FF7-style)
    let weaponName = null, accName = null, dr = 0; const immune = [];
    if (state && state.equip && state.equip[memberState.key]) {
      const eq = state.equip[memberState.key];
      const w = (Data.WEAPONS[memberState.key] || []).find(x => x.key === eq.weapon);
      if (w) { atkBonus += w.atk; weaponName = w.name; }
      const acc = eq.accessory && Data.ACCESSORIES[eq.accessory];
      if (acc) {
        accName = acc.name;
        if (acc.stat) { if (acc.stat.hp) maxhp += acc.stat.hp; if (acc.stat.mp) maxmp += acc.stat.mp; if (acc.stat.atk) atkBonus += acc.stat.atk; if (acc.stat.crit) crit += acc.stat.crit; if (acc.stat.def) defStat += acc.stat.def; if (acc.stat.spec) specStat += acc.stat.spec; if (acc.stat.spd) spdStat += acc.stat.spd; }
        if (acc.dr) dr += acc.dr;
        if (acc.immune) acc.immune.forEach(s => { if (!immune.includes(s)) immune.push(s); });
      }
      const applyShell = (id) => {
        if (id == null) return;
        const inst = shellById(state, id); if (!inst) return;
        const sh = Data.SHELLS[inst.key]; if (!sh) return;
        if (sh.kind === 'support') {
          const amt = sh.perLevel * inst.level;
          if (sh.stat === 'hp') maxhp += amt; else if (sh.stat === 'mp') maxmp += amt;
          else if (sh.stat === 'atk') atkBonus += amt; else if (sh.stat === 'crit') crit += amt;
          else if (sh.stat === 'def') defStat += amt; else if (sh.stat === 'spec') specStat += amt; else if (sh.stat === 'spd') spdStat += amt;
        } else if (sh.kind === 'magic') { const a = Data.shellAbility(inst.key, inst.level); if (a) abilities.push(a); }
      };
      (eq.wslots || eq.slots || []).forEach(applyShell);   // eq.slots = legacy fallback
      (eq.aslots || []).forEach(applyShell);
    }

    const enchant = (state && state.enchants && state.enchants[memberState.key]) || null;
    return {
      name: d.name, role: d.role, model: d.model, weaponName, accName, enchant, dr, immune,
      maxhp, maxmp,
      def: Math.round(defStat), spec: Math.round(specStat), spd: Math.round(spdStat),
      atk: Math.round((d.base.atkMin + d.base.atkMax) / 2 + atkBonus),
      fight: { min: d.base.atkMin + atkBonus, max: d.base.atkMax + atkBonus, crit, big: !!d.base.big, el: enchant || 'physical' },
      abilities,
    };
  }

  // award XP/gold/AP after a battle; returns { levelUps, shellUps }
  // ---- crafting materials ----
  function addMaterials(state, loot) { if (!state.mats) state.mats = {}; Object.keys(loot).forEach(k => { state.mats[k] = (state.mats[k] || 0) + loot[k]; }); save(state); }
  function canCraft(state, recipe) { const m = state.mats || {}; return Object.keys(recipe.cost).every(k => (m[k] || 0) >= recipe.cost[k]); }
  function craft(state, recipe) {
    if (!canCraft(state, recipe)) return false;
    Object.keys(recipe.cost).forEach(k => { state.mats[k] -= recipe.cost[k]; });
    state.inv[recipe.out] = (state.inv[recipe.out] || 0) + recipe.qty;
    save(state); return true;
  }
  // ---- bestiary ----
  function recordSeen(state, key) { if (!state.bestiary) state.bestiary = {}; if (!state.bestiary[key]) state.bestiary[key] = { seen: 0, slain: 0 }; state.bestiary[key].seen++; }
  function recordSlain(state, key) { if (!state.bestiary) state.bestiary = {}; if (!state.bestiary[key]) state.bestiary[key] = { seen: 0, slain: 0 }; state.bestiary[key].slain++; }
  // remember what an element did to a foe (weak/resist/null/absorb) so it shows on the plate next time
  function recordAffinity(state, key, element, result) { if (!element || element === 'physical') return; if (!state.bestiary) state.bestiary = {}; if (!state.bestiary[key]) state.bestiary[key] = { seen: 0, slain: 0 }; const b = state.bestiary[key]; if (!b.aff) b.aff = {}; b.aff[element] = result; }

  function reward(state, xp, gold) {
    state.gold += gold;
    const ups = [], shellUps = [];
    const ap = Math.max(8, Math.round(xp * 0.5));
    activeMembers(state).forEach(p => {
      if (p.hpCur <= 0) return; // KO'd members earn nothing
      p.xp += xp;
      let leveled = false;
      while (p.level < Data.MAX_LEVEL && p.xp >= Data.xpForLevel(p.level)) {
        p.xp -= Data.xpForLevel(p.level);
        p.level++; p.sp += 1; leveled = true;
      }
      if (leveled) { const d = derived(p, state); p.hpCur = d.maxhp; p.mpCur = d.maxmp; ups.push({ name: d.name, level: p.level }); }
      // AP to this member's slotted seashells (weapon + accessory)
      const eq = state.equip && state.equip[p.key];
      if (eq) slotsOf(eq).forEach(id => {
        if (id == null) return; const inst = shellById(state, id); if (!inst) return; const sh = Data.SHELLS[inst.key]; if (!sh) return;
        if (inst.level >= sh.maxLevel) return;
        inst.ap += ap;
        while (inst.level < sh.maxLevel && inst.ap >= sh.ap[inst.level]) { inst.level++; shellUps.push({ name: sh.name, level: inst.level }); }
      });
    });
    save(state);
    // keep return back-compatible: array of level-ups, with shellUps attached
    ups.shellUps = shellUps;
    return ups;
  }

  // ---------------- equipment helpers ----------------
  function resize(arr, n) { const out = (arr || []).slice(); out.length = n; for (let i = 0; i < n; i++) if (out[i] === undefined) out[i] = null; return out.slice(0, n); }
  const slotKey = (where) => (where === 'accessory' ? 'aslots' : 'wslots');
  function equipWeapon(state, charKey, weaponKey) {
    const eq = state.equip[charKey]; const w = Data.WEAPONS[charKey].find(x => x.key === weaponKey);
    if (!w || !state.ownedWeapons[charKey].includes(weaponKey)) return;
    eq.weapon = weaponKey; eq.wslots = resize(eq.wslots, w.slots);
    save(state);
  }
  function equipAccessory(state, charKey, accKey) {
    const eq = state.equip[charKey];
    if (!accKey) { eq.accessory = null; eq.aslots = []; save(state); return; }
    const acc = Data.ACCESSORIES[accKey]; if (!acc || !(state.ownedAccessories || []).includes(accKey)) return;
    eq.accessory = accKey; eq.aslots = resize(eq.aslots, acc.slots || 0);
    save(state);
  }
  function slotsOf(eq) { return (eq.wslots || eq.slots || []).concat(eq.aslots || []); }
  function equippedShellIds(state) { const set = new Set(); Object.values(state.equip).forEach(eq => slotsOf(eq).forEach(id => { if (id != null) set.add(id); })); return set; }
  function pouchShells(state) { const used = equippedShellIds(state); return state.shells.filter(s => !used.has(s.id)); }
  function equipShell(state, charKey, shellId, where) {
    const eq = state.equip[charKey]; const k = slotKey(where); const arr = eq[k]; if (!arr) return false;
    const idx = arr.indexOf(null); if (idx < 0) return false;
    arr[idx] = shellId; save(state); return true;
  }
  function unequipSlot(state, charKey, where, slotIndex) { const arr = state.equip[charKey][slotKey(where)]; if (arr) arr[slotIndex] = null; save(state); }
  function addShell(state, key) { const inst = { id: state.shellSeq++, key, level: 1, ap: 0 }; state.shells.push(inst); save(state); return inst; }
  function buyWeapon(state, charKey, weaponKey) { if (!state.ownedWeapons[charKey].includes(weaponKey)) state.ownedWeapons[charKey].push(weaponKey); save(state); }
  function buyAccessory(state, accKey) { if (!state.ownedAccessories) state.ownedAccessories = []; if (!state.ownedAccessories.includes(accKey)) state.ownedAccessories.push(accKey); save(state); }

  function fullHeal(state) {
    state.party.forEach(p => { const d = derived(p); p.hpCur = d.maxhp; p.mpCur = d.maxmp; });
    save(state);
  }

  // is a node blocked because the member committed to the *other* branch of a fork?
  function branchBlocked(p, node) {
    if (!node.branch) return false;
    const tree = def(p.key).tree;
    const chosen = tree.find(n => n.branch && p.learned[n.id]);
    return !!(chosen && chosen.branch !== node.branch);
  }
  function canLearn(state, p, node) {
    if (p.learned[node.id]) return false;
    if (p.sp < node.cost) return false;
    if (node.req && !p.learned[node.req]) return false;
    if (branchBlocked(p, node)) return false;
    return true;
  }
  function learn(state, p, node) {
    if (!canLearn(state, p, node)) return false;
    p.sp -= node.cost; p.learned[node.id] = true;
    // re-cap current HP/MP if maxes changed (no overheal needed; just leave current)
    save(state);
    return true;
  }
  // late-game respec: refund every skill point and clear learned nodes so a
  // character can re-pick their branch. Total SP earned = level - 1.
  function respec(state, charKey) { const p = state.party.find(m => m.key === charKey); if (!p) return; p.learned = {}; p.sp = Math.max(0, (p.level || 1) - 1); save(state); }
  function respecAll(state) { state.party.forEach(p => { p.learned = {}; p.sp = Math.max(0, (p.level || 1) - 1); }); save(state); }

  function save(state) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function migrate(state) {
    if (!state) return state;
    if (!state.flags) state.flags = {};
    // older saves used state.world; carry over progress flags
    const oldWorld = state.world || {};
    if (!state.prog) state.prog = { krakenDown: !!oldWorld.krakenDown, finalWin: !!oldWorld.finalWin };
    // ensure every roster member exists (new characters added in updates)
    if (state.prog && state.prog.ruffyGone == null) state.prog.ruffyGone = false;
    if (!state.party) state.party = [];
    // drop any party members whose def was removed from the game (e.g. retired characters)
    state.party = state.party.filter(p => Data.PARTY.find(d => d.key === p.key));
    Data.PARTY.forEach(def => { if (!state.party.find(p => p.key === def.key)) state.party.push({ key: def.key, level: 1, xp: 0, sp: 0, learned: {}, hpCur: null, mpCur: null, recruited: !def.temporary }); });
    state.party.forEach(p => { if (p.recruited === undefined) { const d = Data.PARTY.find(x => x.key === p.key); p.recruited = d ? !d.temporary : true; } });
    if (state.active) state.active = state.active.filter(k => Data.PARTY.find(d => d.key === k)); // drop retired members from the lineup
    if (!state.active || state.active.length < 1) state.active = ['pirate', 'swordsman', 'healer'];
    if (!state.islands) state.islands = { tidehaven: { cleared: {} }, dunes: { cleared: {} }, spire: { cleared: {} } };
    ['tidehaven', 'dunes', 'spire', 'mall', 'duskmoor', 'mirage', 'aerie', 'paegina', 'whiteout', 'wildwood', 'improbable', 'lamancha'].forEach(k => { if (!state.islands[k]) state.islands[k] = { cleared: {} }; });
    if (!state.coliseum) state.coliseum = {};
    if (!state.dungeons) state.dungeons = {};
    if (state.pearls == null) state.pearls = 0;
    if (!state.shipsSunk) state.shipsSunk = {};
    if (!state.ship) state.ship = { hull: Data.SHIP.defaults.hull, sail: Data.SHIP.defaults.sail, flag: Data.SHIP.defaults.flag, upg: {} };
    if (!state.ship.upg) state.ship.upg = {};
    if (!state.mermaids) state.mermaids = {};
    if (!state.enchants) state.enchants = {};
    if (!state.mats) state.mats = {};
    if (!state.bestiary) state.bestiary = {};
    if (!state.location) { const s = Data.ISLANDS.tidehaven; state.location = { place: 'island', island: 'tidehaven', x: s.spawn.x, z: s.spawn.z, shipX: Data.SEA.spawn.x, shipZ: Data.SEA.spawn.z }; }
    if (!state.equip || !state.ownedWeapons || !state.shells) {
      const equip = {}, ownedWeapons = {}, shells = []; let seq = 1;
      Data.PARTY.forEach(def => { const w = Data.WEAPONS[def.key][0]; ownedWeapons[def.key] = [w.key]; equip[def.key] = { weapon: w.key, wslots: new Array(w.slots).fill(null), accessory: null, aslots: [] }; });
      ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: seq++, key, level: 1, ap: 0 }));
      state.equip = equip; state.ownedWeapons = ownedWeapons; state.shells = shells; state.shellSeq = seq;
    }
    if (!state.ownedAccessories) state.ownedAccessories = ['coral_bangle'];
    // backfill equipment for any newly-added characters
    Data.PARTY.forEach(def => { if (!state.equip[def.key]) { const w = Data.WEAPONS[def.key][0]; state.ownedWeapons[def.key] = [w.key]; state.equip[def.key] = { weapon: w.key, wslots: new Array(w.slots).fill(null), accessory: null, aslots: [] }; } });
    // migrate legacy weapon-only slots → weapon + accessory FF7 layout
    Object.values(state.equip).forEach(eq => { if (eq.slots && !eq.wslots) { eq.wslots = eq.slots; delete eq.slots; } if (!eq.wslots) eq.wslots = []; if (eq.accessory === undefined) eq.accessory = null; if (!eq.aslots) eq.aslots = []; });
    // reconcile skill trees: if a save has learned nodes that no longer exist
    // (trees were reworked), refund SP and clear so the player re-picks a path
    state.party.forEach(p => {
      const tree = (def(p.key) || {}).tree || []; const ids = new Set(tree.map(n => n.id));
      if (p.learned && Object.keys(p.learned).some(id => !ids.has(id))) { p.learned = {}; p.sp = Math.max(0, (p.level || 1) - 1); }
    });
    // initialise HP/MP for any uninitialised members
    state.party.forEach(p => { if (p.hpCur == null) { const d = derived(p, state); p.hpCur = d.maxhp; p.mpCur = d.maxmp; } });
    return state;
  }
  function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? migrate(JSON.parse(s)) : null; } catch (e) { return null; } }
  function clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---------------- SKILL TREE UI (branching, with connectors) ----------------
  const NODE_ICON = { stat: '◆', ability: '✦' };
  function tierOf(tree, node, memo = {}) { if (memo[node.id] != null) return memo[node.id]; if (!node.req) return memo[node.id] = 0; const parent = tree.find(t => t.id === node.req); return memo[node.id] = (parent ? tierOf(tree, parent, memo) + 1 : 0); }

  function renderSkillTree(state, container, onClose) {
    const prevWrap = container.querySelector('.sk-wrap'); const savedScroll = prevWrap ? prevWrap.scrollTop : 0; // keep scroll position across re-renders
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>✦ Skill Constellation</h2><div class="sk-gold">Spend SP to light new stars · choose a path</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    state.party.filter(p => p.recruited !== false).forEach(p => {
      const tree = def(p.key).tree; const d = derived(p, state);
      const block = document.createElement('div'); block.className = 'sk-block';
      const need = p.level < Data.MAX_LEVEL ? Data.xpForLevel(p.level) : 0;
      block.innerHTML = `<div class="sk-bhead"><div><span class="sk-name">${d.name}</span> <span class="sk-role">${d.role}</span></div>
        <div class="sk-sp">Lv ${p.level} · <b>${p.sp} SP</b></div></div>
        <div class="sk-bstats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · DEF ${d.def} · SPC ${d.spec} · SPD ${d.spd} · Crit ${Math.round(d.fight.crit*100)}% · ${need ? `XP ${p.xp}/${need}` : 'MAX'}</div>`;

      // layout by tier
      const memo = {}; const tiers = {};
      tree.forEach(n => { const t = tierOf(tree, n, memo); (tiers[t] = tiers[t] || []).push(n); });
      const maxTier = Math.max(...Object.keys(tiers).map(Number));
      const GAP = 148, H = (maxTier + 1) * GAP + 24;
      const posOf = {};
      Object.keys(tiers).forEach(tk => { const arr = tiers[tk]; arr.forEach((n, i) => { posOf[n.id] = { xPct: (i + 0.5) / arr.length * 100, y: Number(tk) * GAP + 40 }; }); });

      const treeEl = document.createElement('div'); treeEl.className = 'sk-tree'; treeEl.style.height = H + 'px';
      // connector SVG (scales to width; y in px)
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'sk-svg'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('viewBox', `0 0 1000 ${H}`); svg.setAttribute('height', H);
      tree.forEach(n => { if (!n.req) return; const a = posOf[n.req], b = posOf[n.id]; if (!a || !b) return;
        const ln = document.createElementNS(svgNS, 'line'); ln.setAttribute('x1', a.xPct * 10); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.xPct * 10); ln.setAttribute('y2', b.y);
        ln.setAttribute('class', 'sk-line' + (n.branch ? ' br-' + n.branch : '') + (p.learned[n.id] ? ' on' : '')); svg.appendChild(ln); });
      treeEl.appendChild(svg);

      tree.forEach(n => {
        const pos = posOf[n.id]; const learned = !!p.learned[n.id]; const pathOff = !learned && branchBlocked(p, n); const locked = n.req && !p.learned[n.req]; const affordable = canLearn(state, p, n);
        const b = document.createElement('button');
        b.className = 'sk-n ' + (n.kind) + (n.branch ? ' br-' + n.branch : '') + (learned ? ' learned' : pathOff ? ' pathlocked' : affordable ? ' avail' : locked ? ' locked' : '');
        b.style.left = pos.xPct + '%'; b.style.top = pos.y + 'px';
        b.innerHTML = `<span class="sk-n-ic">${NODE_ICON[n.kind]}</span><span class="sk-n-name">${n.name}</span><span class="sk-n-desc">${n.desc}</span><span class="sk-n-sub">${learned ? '✓ Learned' : pathOff ? '✗ Path not taken' : n.cost + ' SP'}</span>`;
        b.disabled = learned || !affordable;
        b.onclick = () => { if (learn(state, p, n)) { if (window.SFX) SFX.play('levelup'); renderSkillTree(state, container, onClose); } };
        treeEl.appendChild(b);
      });
      block.appendChild(treeEl);
      wrap.appendChild(block);
    });
    container.appendChild(wrap);
    wrap.scrollTop = savedScroll; // restore scroll so picking a node doesn't jump to the top
  }

  // ---------------- GEAR / SEASHELL UI ----------------
  let gearSel = 'pirate';
  function renderGear(state, container, onClose) {
    const prevWrap = container.querySelector('.sk-wrap'); const savedScroll = prevWrap ? prevWrap.scrollTop : 0;
    container.innerHTML = '';
    // only the characters currently in your active party — you gear up who actually fights
    const roster = activeMembers(state);
    if (!roster.find(p => p.key === gearSel)) gearSel = roster[0] ? roster[0].key : 'pirate'; // don't point at a benched/departed member
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Gear &amp; Seashells</h2><div class="sk-gold">⛃ ${state.gold} gold</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    // character tabs (only members actually in the party)
    const tabs = document.createElement('div'); tabs.className = 'gear-tabs';
    roster.forEach(p => { const d = derived(p, state); const b = document.createElement('button'); b.className = 'gear-tab' + (gearSel === p.key ? ' on' : ''); b.textContent = d.name; b.onclick = () => { gearSel = p.key; renderGear(state, container, onClose); }; tabs.appendChild(b); });
    wrap.appendChild(tabs);

    const p = state.party.find(x => x.key === gearSel); const d = derived(p, state); const eq = state.equip[gearSel];
    const body = document.createElement('div'); body.className = 'gear-body';

    // stats
    const stats = document.createElement('div'); stats.className = 'gear-stats';
    const abilNames = d.abilities.map(a => a.name).join(', ');
    const extra = (d.dr ? ` · DR ${Math.round(d.dr*100)}%` : '') + (d.immune && d.immune.length ? ` · immune ${d.immune.map(s => (Data.STATUS[s]||{}).name || s).join(', ')}` : '');
    stats.innerHTML = `<div class="sk-stats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · DEF ${d.def} · SPC ${d.spec} · SPD ${d.spd} · Crit ${Math.round(d.fight.crit*100)}%${extra}</div>
      <div class="gear-abil"><b>Abilities:</b> ${abilNames || '—'}</div>`;
    body.appendChild(stats);

    // weapons
    const wSec = document.createElement('div'); wSec.className = 'gear-sec'; wSec.innerHTML = '<h3>Weapon</h3>';
    Data.WEAPONS[gearSel].forEach(w => {
      const owned = state.ownedWeapons[gearSel].includes(w.key); const on = eq.weapon === w.key;
      const b = document.createElement('button'); b.className = 'gear-item' + (on ? ' on' : '');
      b.innerHTML = `<div class="gi-top"><span>${Data.weaponIcon(gearSel)} ${w.name}</span><span class="gi-tag">${on ? 'Equipped' : owned ? 'Equip' : 'Locked'}</span></div><div class="gi-desc">${w.desc} · ${w.slots} slot${w.slots>1?'s':''}</div>`;
      b.disabled = !owned || on; b.onclick = () => { equipWeapon(state, gearSel, w.key); renderGear(state, container, onClose); };
      wSec.appendChild(b);
    });
    body.appendChild(wSec);

    // a row of shell slots for one piece of equipment (weapon or accessory)
    function slotRowFor(where, arr, title) {
      const sec = document.createElement('div'); sec.className = 'gear-sec'; sec.innerHTML = `<h3>${title}</h3>`;
      const row = document.createElement('div'); row.className = 'slot-row';
      if (!arr || !arr.length) { const e = document.createElement('div'); e.className = 'gi-desc'; e.textContent = where === 'accessory' ? 'Equip an accessory to add slots.' : 'No slots on this weapon.'; row.appendChild(e); }
      (arr || []).forEach((id, i) => {
        const slot = document.createElement('button'); slot.className = 'slot' + (id != null ? ' filled' : '');
        if (id != null) { const inst = shellById(state, id); const sh = Data.SHELLS[inst.key]; slot.innerHTML = `<span class="shell-dot ${sh.kind}"></span>${sh.name}<span class="slot-lv">Lv${inst.level}</span>`; slot.title = 'Click to remove'; slot.onclick = () => { unequipSlot(state, gearSel, where, i); renderGear(state, container, onClose); }; }
        else { slot.textContent = '◌ empty'; slot.disabled = true; }
        row.appendChild(slot);
      });
      sec.appendChild(row); return sec;
    }
    body.appendChild(slotRowFor('weapon', eq.wslots, 'Weapon Shell Slots'));

    // accessory picker (armor slot) — also carries shell slots
    const aSec = document.createElement('div'); aSec.className = 'gear-sec'; aSec.innerHTML = '<h3>Accessory</h3>';
    const accList = [{ key: null, name: '— None —', desc: 'No accessory', slots: 0 }].concat((state.ownedAccessories || []).map(k => Data.ACCESSORIES[k]).filter(Boolean));
    accList.forEach(acc => {
      const on = (eq.accessory || null) === (acc.key || null);
      const b = document.createElement('button'); b.className = 'gear-item' + (on ? ' on' : '');
      b.innerHTML = `<div class="gi-top"><span>💍 ${acc.name}</span><span class="gi-tag">${on ? 'Equipped' : 'Equip'}</span></div><div class="gi-desc">${acc.desc || ''}${acc.slots ? ` · ${acc.slots} slot${acc.slots>1?'s':''}` : ''}</div>`;
      b.disabled = on; b.onclick = () => { equipAccessory(state, gearSel, acc.key); renderGear(state, container, onClose); };
      aSec.appendChild(b);
    });
    body.appendChild(aSec);
    body.appendChild(slotRowFor('accessory', eq.aslots, 'Accessory Shell Slots'));

    // pouch (unequipped shells) — choose which piece to slot into
    const pSec = document.createElement('div'); pSec.className = 'gear-sec'; pSec.innerHTML = '<h3>Seashell Pouch</h3>';
    const pouch = pouchShells(state);
    if (!pouch.length) { const e = document.createElement('div'); e.className = 'gi-desc'; e.textContent = 'No spare seashells. Buy more at a Shop.'; pSec.appendChild(e); }
    const wFree = (eq.wslots || []).includes(null), aFree = (eq.aslots || []).includes(null);
    pouch.forEach(inst => {
      const sh = Data.SHELLS[inst.key]; const need = inst.level < sh.maxLevel ? sh.ap[inst.level] : null;
      const effect = sh.kind === 'magic' ? Data.shellAbility(inst.key, inst.level).name : `+${sh.stat==='crit'? Math.round(sh.perLevel*inst.level*100)+'%':sh.perLevel*inst.level} ${sh.stat.toUpperCase()}`;
      const row = document.createElement('div'); row.className = 'gear-item pouch-item';
      row.innerHTML = `<div class="gi-top"><span>${Data.shellIcon(sh)} ${sh.name} <span class="slot-lv">Lv${inst.level}</span></span></div>
        <div class="gi-desc">${sh.desc} · grants ${effect}${need!=null?` · AP ${inst.ap}/${need}`:' · MAX'}</div>`;
      const acts = document.createElement('div'); acts.className = 'pouch-acts';
      const mk = (label, where, free) => { const x = document.createElement('button'); x.className = 'pill small'; x.textContent = label; x.disabled = !free; x.onclick = () => { if (equipShell(state, gearSel, inst.id, where)) renderGear(state, container, onClose); }; acts.appendChild(x); };
      mk('→ Weapon', 'weapon', wFree); mk('→ Accessory', 'accessory', aFree);
      row.appendChild(acts); pSec.appendChild(row);
    });
    body.appendChild(pSec);

    wrap.appendChild(body);
    container.appendChild(wrap);
    wrap.scrollTop = savedScroll;
  }

  // ---------------- PARTY MANAGEMENT (swap active 3 of 6) ----------------
  function toggleActive(state, key) {
    const i = state.active.indexOf(key);
    if (i >= 0) { if (state.active.length > 1) state.active.splice(i, 1); }
    else { if (state.active.length >= 3) state.active.shift(); state.active.push(key); }
    save(state);
  }
  function renderRoster(state, container, onClose) {
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Party</h2><div class="sk-gold">Active: ${state.active.length}/3 · pick who fights</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);
    const grid = document.createElement('div'); grid.className = 'sk-cols';
    state.party.filter(p => p.recruited !== false).forEach(p => {
      const d = derived(p, state); const isActive = state.active.includes(p.key);
      const col = document.createElement('button'); col.className = 'roster-card' + (isActive ? ' on' : '');
      col.innerHTML = `<div class="rc-top"><span class="rc-name">${d.name}</span><span class="rc-tag">${isActive ? 'IN PARTY' : 'Bench'}</span></div>
        <div class="rc-role">${d.role} · Lv ${p.level}</div>
        <div class="sk-stats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · DEF ${d.def} · SPC ${d.spec} · SPD ${d.spd}</div>
        <div class="rc-weap">⚔ ${d.weaponName || '—'}</div>`;
      col.onclick = () => { toggleActive(state, p.key); renderRoster(state, container, onClose); };
      grid.appendChild(col);
    });
    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  // ---------------- SHIP ----------------
  function shipStats(state) { const u = state.ship.upg || {}; return { hp: Data.SHIP.baseHp + (u.hull || 0) * 40, atk: Data.SHIP.baseAtk + (u.cannons || 0) * 6, def: Data.SHIP.baseDef + (u.plating || 0) * 3 }; }
  function renderShipyard(state, container, onClose) {
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Shipyard</h2><div class="sk-gold">⛃ ${state.gold} gold · 🦪 ${state.pearls} pearls</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    const st = shipStats(state);
    const prev = document.createElement('div'); prev.className = 'ship-preview';
    prev.innerHTML = `<div class="ship-art"><span class="ship-flag">${state.ship.flag}</span><div class="ship-sail" style="background:${state.ship.sail}"></div><div class="ship-hull" style="background:${state.ship.hull}"></div></div>
      <div class="ship-stats">⛵ Your Ship<br>HP ${st.hp} · Cannons ${st.atk} · Armor ${st.def}</div>`;
    wrap.appendChild(prev);

    function section(title) { const h = document.createElement('div'); h.className = 'shop-head'; h.textContent = title; wrap.appendChild(h); return h; }
    function row(label, sub, priceLabel, disabled, onBuy) {
      const r = document.createElement('div'); r.className = 'shop-row';
      r.innerHTML = `<div class="shop-info"><b>${label}</b><span>${sub}</span></div>`;
      const b = document.createElement('button'); b.className = 'pill small'; b.textContent = priceLabel; b.disabled = disabled;
      b.onclick = () => { onBuy(); renderShipyard(state, container, onClose); };
      r.appendChild(b); wrap.appendChild(r);
    }

    section('🎨 Hull (gold)');
    Data.SHIP_CUSTOM.hulls.forEach(h => { const on = state.ship.hull === h.color; row(h.name, on ? 'Equipped' : `Hull color`, on ? '✓' : '⛃ ' + h.price, on || state.gold < h.price, () => { state.gold -= h.price; state.ship.hull = h.color; save(state); }); });
    section('⛵ Sails (gold)');
    Data.SHIP_CUSTOM.sails.forEach(h => { const on = state.ship.sail === h.color; row(h.name, on ? 'Equipped' : 'Sail color', on ? '✓' : '⛃ ' + h.price, on || state.gold < h.price, () => { state.gold -= h.price; state.ship.sail = h.color; save(state); }); });
    section('🚩 Flag (gold)');
    Data.SHIP_CUSTOM.flags.forEach(f => { const on = state.ship.flag === f.emoji; row(f.emoji + ' Flag', on ? 'Equipped' : 'Banner', on ? '✓' : '⛃ ' + f.price, on || state.gold < f.price, () => { state.gold -= f.price; state.ship.flag = f.emoji; save(state); }); });
    section('🔧 Upgrades (pearls)');
    Data.SHIP_UPGRADES.forEach(u => { const lvl = (state.ship.upg[u.id] || 0); const maxed = lvl >= u.max; const cost = u.basePearls * (lvl + 1);
      row(`${u.name} (Lv ${lvl}/${u.max})`, u.desc, maxed ? 'MAX' : '🦪 ' + cost, maxed || state.pearls < cost, () => { state.pearls -= cost; state.ship.upg[u.id] = lvl + 1; save(state); }); });

    container.appendChild(wrap);
  }

  return { freshState, derived, reward, fullHeal, canLearn, learn, save, load, clear, renderSkillTree, renderGear, renderRoster, renderShipyard,
           toggleActive, activeMembers, recruit, dismiss, shipStats, equipWeapon, equipAccessory, equipShell, unequipSlot, addShell, buyWeapon, buyAccessory, pouchShells, def,
           addMaterials, canCraft, craft, recordSeen, recordSlain, recordAffinity, respec, respecAll };
})();
