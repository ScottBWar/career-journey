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
      equip[def.key] = { weapon: startW.key, slots: new Array(startW.slots).fill(null) };
    });
    ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: shellSeq++, key, level: 1, ap: 0 }));

    const start = Data.ISLANDS.tidehaven;
    const state = {
      gold: 80, pearls: 0, party, active: ['pirate', 'swordsman', 'healer'], inv, mats: {}, bestiary: {}, equip, ownedWeapons, shells, shellSeq,
      ship: { hull: Data.SHIP.defaults.hull, sail: Data.SHIP.defaults.sail, flag: Data.SHIP.defaults.flag, upg: {} },
      mermaids: {}, enchants: {},
      location: { place: 'island', island: 'tidehaven', x: start.spawn.x, z: start.spawn.z, shipX: Data.SEA.spawn.x, shipZ: Data.SEA.spawn.z },
      islands: { tidehaven: { cleared: {} }, dunes: { cleared: {} }, spire: { cleared: {} }, mall: { cleared: {} }, duskmoor: { cleared: {} }, mirage: { cleared: {} }, aerie: { cleared: {} } },
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
    const abilities = d.baseAbilities.slice();

    d.tree.forEach(node => {
      if (!memberState.learned[node.id]) return;
      if (node.kind === 'stat') {
        if (node.stat.hp) maxhp += node.stat.hp;
        if (node.stat.mp) maxmp += node.stat.mp;
        if (node.stat.atk) atkBonus += node.stat.atk;
        if (node.stat.crit) crit += node.stat.crit;
      } else if (node.kind === 'ability') {
        abilities.push(node.ability);
      }
    });

    // equipment: weapon + slotted seashells
    let weaponName = null;
    if (state && state.equip && state.equip[memberState.key]) {
      const eq = state.equip[memberState.key];
      const w = (Data.WEAPONS[memberState.key] || []).find(x => x.key === eq.weapon);
      if (w) { atkBonus += w.atk; weaponName = w.name; }
      (eq.slots || []).forEach(id => {
        if (id == null) return;
        const inst = shellById(state, id); if (!inst) return;
        const sh = Data.SHELLS[inst.key]; if (!sh) return;
        if (sh.kind === 'support') {
          const amt = sh.perLevel * inst.level;
          if (sh.stat === 'hp') maxhp += amt;
          else if (sh.stat === 'mp') maxmp += amt;
          else if (sh.stat === 'atk') atkBonus += amt;
          else if (sh.stat === 'crit') crit += amt;
        } else if (sh.kind === 'magic') {
          const a = Data.shellAbility(inst.key, inst.level); if (a) abilities.push(a);
        }
      });
    }

    const enchant = (state && state.enchants && state.enchants[memberState.key]) || null;
    return {
      name: d.name, role: d.role, model: d.model, weaponName, enchant,
      maxhp, maxmp,
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
      // AP to this member's slotted seashells
      const eq = state.equip && state.equip[p.key];
      if (eq) eq.slots.forEach(id => {
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
  function equipWeapon(state, charKey, weaponKey) {
    const eq = state.equip[charKey]; const w = Data.WEAPONS[charKey].find(x => x.key === weaponKey);
    if (!w || !state.ownedWeapons[charKey].includes(weaponKey)) return;
    eq.weapon = weaponKey;
    const slots = eq.slots.slice(); slots.length = w.slots; // grow/shrink
    for (let i = 0; i < w.slots; i++) if (slots[i] === undefined) slots[i] = null;
    eq.slots = slots.slice(0, w.slots);
    save(state);
  }
  function equippedShellIds(state) { const set = new Set(); Object.values(state.equip).forEach(eq => eq.slots.forEach(id => { if (id != null) set.add(id); })); return set; }
  function pouchShells(state) { const used = equippedShellIds(state); return state.shells.filter(s => !used.has(s.id)); }
  function equipShell(state, charKey, shellId) {
    const eq = state.equip[charKey]; const idx = eq.slots.indexOf(null); if (idx < 0) return false;
    eq.slots[idx] = shellId; save(state); return true;
  }
  function unequipSlot(state, charKey, slotIndex) { state.equip[charKey].slots[slotIndex] = null; save(state); }
  function addShell(state, key) { const inst = { id: state.shellSeq++, key, level: 1, ap: 0 }; state.shells.push(inst); save(state); return inst; }
  function buyWeapon(state, charKey, weaponKey) { if (!state.ownedWeapons[charKey].includes(weaponKey)) state.ownedWeapons[charKey].push(weaponKey); save(state); }

  function fullHeal(state) {
    state.party.forEach(p => { const d = derived(p); p.hpCur = d.maxhp; p.mpCur = d.maxmp; });
    save(state);
  }

  function canLearn(state, p, node) {
    if (p.learned[node.id]) return false;
    if (p.sp < node.cost) return false;
    if (node.req && !p.learned[node.req]) return false;
    return true;
  }
  function learn(state, p, node) {
    if (!canLearn(state, p, node)) return false;
    p.sp -= node.cost; p.learned[node.id] = true;
    // re-cap current HP/MP if maxes changed (no overheal needed; just leave current)
    save(state);
    return true;
  }

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
    Data.PARTY.forEach(def => { if (!state.party.find(p => p.key === def.key)) state.party.push({ key: def.key, level: 1, xp: 0, sp: 0, learned: {}, hpCur: null, mpCur: null, recruited: !def.temporary }); });
    state.party.forEach(p => { if (p.recruited === undefined) { const d = Data.PARTY.find(x => x.key === p.key); p.recruited = d ? !d.temporary : true; } });
    if (!state.active || state.active.length !== 3) state.active = ['pirate', 'swordsman', 'healer'];
    if (!state.islands) state.islands = { tidehaven: { cleared: {} }, dunes: { cleared: {} }, spire: { cleared: {} } };
    ['tidehaven', 'dunes', 'spire', 'mall', 'duskmoor', 'mirage', 'aerie'].forEach(k => { if (!state.islands[k]) state.islands[k] = { cleared: {} }; });
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
      Data.PARTY.forEach(def => { const w = Data.WEAPONS[def.key][0]; ownedWeapons[def.key] = [w.key]; equip[def.key] = { weapon: w.key, slots: new Array(w.slots).fill(null) }; });
      ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: seq++, key, level: 1, ap: 0 }));
      state.equip = equip; state.ownedWeapons = ownedWeapons; state.shells = shells; state.shellSeq = seq;
    }
    // backfill equipment for any newly-added characters
    Data.PARTY.forEach(def => { if (!state.equip[def.key]) { const w = Data.WEAPONS[def.key][0]; state.ownedWeapons[def.key] = [w.key]; state.equip[def.key] = { weapon: w.key, slots: new Array(w.slots).fill(null) }; } });
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
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Skill Trees</h2><div class="sk-gold">Spend SP earned from leveling</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    state.party.forEach(p => {
      const tree = def(p.key).tree; const d = derived(p, state);
      const block = document.createElement('div'); block.className = 'sk-block';
      const need = p.level < Data.MAX_LEVEL ? Data.xpForLevel(p.level) : 0;
      block.innerHTML = `<div class="sk-bhead"><div><span class="sk-name">${d.name}</span> <span class="sk-role">${d.role}</span></div>
        <div class="sk-sp">Lv ${p.level} · <b>${p.sp} SP</b></div></div>
        <div class="sk-bstats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · Crit ${Math.round(d.fight.crit*100)}% · ${need ? `XP ${p.xp}/${need}` : 'MAX'}</div>`;

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
        ln.setAttribute('class', p.learned[n.id] ? 'sk-line on' : 'sk-line'); svg.appendChild(ln); });
      treeEl.appendChild(svg);

      tree.forEach(n => {
        const pos = posOf[n.id]; const learned = !!p.learned[n.id]; const locked = n.req && !p.learned[n.req]; const affordable = canLearn(state, p, n);
        const b = document.createElement('button');
        b.className = 'sk-n ' + (n.kind) + (learned ? ' learned' : affordable ? ' avail' : locked ? ' locked' : '');
        b.style.left = pos.xPct + '%'; b.style.top = pos.y + 'px';
        b.innerHTML = `<span class="sk-n-ic">${NODE_ICON[n.kind]}</span><span class="sk-n-name">${n.name}</span><span class="sk-n-desc">${n.desc}</span><span class="sk-n-sub">${learned ? '✓ Learned' : n.cost + ' SP'}</span>`;
        b.disabled = learned || !affordable;
        b.onclick = () => { if (learn(state, p, n)) { if (window.SFX) SFX.play('levelup'); renderSkillTree(state, container, onClose); } };
        treeEl.appendChild(b);
      });
      block.appendChild(treeEl);
      wrap.appendChild(block);
    });
    container.appendChild(wrap);
  }

  // ---------------- GEAR / SEASHELL UI ----------------
  let gearSel = 'pirate';
  function renderGear(state, container, onClose) {
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Gear &amp; Seashells</h2><div class="sk-gold">⛃ ${state.gold} gold</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close'; close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    // character tabs
    const tabs = document.createElement('div'); tabs.className = 'gear-tabs';
    state.party.forEach(p => { const d = derived(p, state); const b = document.createElement('button'); b.className = 'gear-tab' + (gearSel === p.key ? ' on' : ''); b.textContent = d.name; b.onclick = () => { gearSel = p.key; renderGear(state, container, onClose); }; tabs.appendChild(b); });
    wrap.appendChild(tabs);

    const p = state.party.find(x => x.key === gearSel); const d = derived(p, state); const eq = state.equip[gearSel];
    const body = document.createElement('div'); body.className = 'gear-body';

    // stats
    const stats = document.createElement('div'); stats.className = 'gear-stats';
    const abilNames = d.abilities.map(a => a.name).join(', ');
    stats.innerHTML = `<div class="sk-stats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · Crit ${Math.round(d.fight.crit*100)}%</div>
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

    // shell slots
    const sSec = document.createElement('div'); sSec.className = 'gear-sec'; sSec.innerHTML = '<h3>Shell Slots</h3>';
    const slotRow = document.createElement('div'); slotRow.className = 'slot-row';
    eq.slots.forEach((id, i) => {
      const slot = document.createElement('button'); slot.className = 'slot' + (id != null ? ' filled' : '');
      if (id != null) { const inst = shellById(state, id); const sh = Data.SHELLS[inst.key]; slot.innerHTML = `<span class="shell-dot ${sh.kind}"></span>${sh.name}<span class="slot-lv">Lv${inst.level}</span>`; slot.title = 'Click to remove'; slot.onclick = () => { unequipSlot(state, gearSel, i); renderGear(state, container, onClose); }; }
      else { slot.textContent = '◌ empty'; slot.disabled = true; }
      slotRow.appendChild(slot);
    });
    sSec.appendChild(slotRow);
    body.appendChild(sSec);

    // pouch (unequipped shells)
    const pSec = document.createElement('div'); pSec.className = 'gear-sec'; pSec.innerHTML = '<h3>Seashell Pouch</h3>';
    const pouch = pouchShells(state);
    if (!pouch.length) { const e = document.createElement('div'); e.className = 'gi-desc'; e.textContent = 'No spare seashells. Buy more at a Shop.'; pSec.appendChild(e); }
    const hasSlot = eq.slots.includes(null);
    pouch.forEach(inst => {
      const sh = Data.SHELLS[inst.key]; const need = inst.level < sh.maxLevel ? sh.ap[inst.level] : null;
      const b = document.createElement('button'); b.className = 'gear-item';
      const effect = sh.kind === 'magic' ? Data.shellAbility(inst.key, inst.level).name : `+${sh.stat==='crit'? Math.round(sh.perLevel*inst.level*100)+'%':sh.perLevel*inst.level} ${sh.stat.toUpperCase()}`;
      b.innerHTML = `<div class="gi-top"><span>${Data.shellIcon(sh)} ${sh.name} <span class="slot-lv">Lv${inst.level}</span></span><span class="gi-tag">Equip</span></div>
        <div class="gi-desc">${sh.desc} · grants ${effect}${need!=null?` · AP ${inst.ap}/${need}`:' · MAX'}</div>`;
      b.disabled = !hasSlot; b.onclick = () => { if (equipShell(state, gearSel, inst.id)) renderGear(state, container, onClose); };
      pSec.appendChild(b);
    });
    body.appendChild(pSec);

    wrap.appendChild(body);
    container.appendChild(wrap);
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
        <div class="sk-stats">HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max}</div>
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
           toggleActive, activeMembers, recruit, dismiss, shipStats, equipWeapon, equipShell, unequipSlot, addShell, buyWeapon, pouchShells, def,
           addMaterials, canCraft, craft, recordSeen, recordSlain };
})();
