// =====================================================================
//  Progress — persistent party state, XP/levels, derived stats,
//  and the skill-tree screen.
// =====================================================================
window.Progress = (function () {
  const SAVE_KEY = 'beachbrawl_save_v1';

  function freshState() {
    const party = Data.PARTY.map(def => ({
      key: def.key, level: 1, xp: 0, sp: 0, learned: {}, hpCur: null, mpCur: null,
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
    // a few starter seashells in the pouch
    ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: shellSeq++, key, level: 1, ap: 0 }));

    const state = {
      gold: 80, party, inv, equip, ownedWeapons, shells, shellSeq,
      world: { x: Data.WORLD.spawn.x, z: Data.WORLD.spawn.z, cleared: {}, krakenDown: false, finalWin: false },
      flags: {},
    };
    party.forEach(p => { const d = derived(p, state); p.hpCur = d.maxhp; p.mpCur = d.maxmp; });
    return state;
  }
  const shellById = (state, id) => state.shells.find(s => s.id === id);

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

    return {
      name: d.name, role: d.role, model: d.model, weaponName,
      maxhp, maxmp,
      fight: { min: d.base.atkMin + atkBonus, max: d.base.atkMax + atkBonus, crit, big: !!d.base.big },
      abilities,
    };
  }

  // award XP/gold/AP after a battle; returns { levelUps, shellUps }
  function reward(state, xp, gold) {
    state.gold += gold;
    const ups = [], shellUps = [];
    const ap = Math.max(8, Math.round(xp * 0.5));
    state.party.forEach(p => {
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
    if (!state.world) state.world = { x: Data.WORLD.spawn.x, z: Data.WORLD.spawn.z, cleared: {}, krakenDown: false, finalWin: false };
    if (state.world.finalWin == null) state.world.finalWin = false;
    if (!state.flags) state.flags = {};
    if (!state.equip || !state.ownedWeapons || !state.shells) {
      const equip = {}, ownedWeapons = {}, shells = []; let seq = 1;
      Data.PARTY.forEach(def => { const w = Data.WEAPONS[def.key][0]; ownedWeapons[def.key] = [w.key]; equip[def.key] = { weapon: w.key, slots: new Array(w.slots).fill(null) }; });
      ['conch_ember', 'spiral_mend'].forEach(key => shells.push({ id: seq++, key, level: 1, ap: 0 }));
      state.equip = equip; state.ownedWeapons = ownedWeapons; state.shells = shells; state.shellSeq = seq;
    }
    return state;
  }
  function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? migrate(JSON.parse(s)) : null; } catch (e) { return null; } }
  function clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---------------- SKILL TREE UI ----------------
  function renderSkillTree(state, container, onClose) {
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'sk-wrap';
    const head = document.createElement('div'); head.className = 'sk-head';
    head.innerHTML = `<h2>Skill Trees</h2><div class="sk-gold">⛃ ${state.gold} gold</div>`;
    const close = document.createElement('button'); close.className = 'pill ghost'; close.textContent = 'Close';
    close.onclick = onClose; head.appendChild(close);
    wrap.appendChild(head);

    const cols = document.createElement('div'); cols.className = 'sk-cols';
    state.party.forEach(p => {
      const d = derived(p);
      const col = document.createElement('div'); col.className = 'sk-col';
      const need = p.level < Data.MAX_LEVEL ? Data.xpForLevel(p.level) : 0;
      col.innerHTML = `<div class="sk-name">${d.name} <span class="sk-role">${d.role}</span></div>
        <div class="sk-stats">Lv ${p.level} · SP ${p.sp}<br>HP ${d.maxhp} · MP ${d.maxmp} · ATK ${d.fight.min}-${d.fight.max} · Crit ${Math.round(d.fight.crit*100)}%</div>
        <div class="sk-xp"><i style="width:${need ? Math.min(100, p.xp/need*100) : 100}%"></i></div>
        <div class="sk-xptxt">${need ? `XP ${p.xp}/${need}` : 'MAX LEVEL'}</div>`;
      const nodes = document.createElement('div'); nodes.className = 'sk-nodes';
      def(p.key).tree.forEach(node => {
        const learned = !!p.learned[node.id];
        const locked = node.req && !p.learned[node.req];
        const affordable = Progress.canLearn(state, p, node);
        const b = document.createElement('button');
        b.className = 'sk-node' + (learned ? ' learned' : '') + (locked ? ' locked' : '');
        b.innerHTML = `<div class="sk-node-top"><span>${node.name}</span><span class="sk-cost">${learned ? '✓' : node.cost + ' SP'}</span></div>
          <div class="sk-desc">${node.desc}${node.req && !learned ? ` <em>(needs ${def(p.key).tree.find(t=>t.id===node.req).name})</em>` : ''}</div>`;
        b.disabled = learned || !affordable;
        b.onclick = () => { if (Progress.learn(state, p, node)) renderSkillTree(state, container, onClose); };
        nodes.appendChild(b);
      });
      col.appendChild(nodes);
      cols.appendChild(col);
    });
    wrap.appendChild(cols);
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
      b.innerHTML = `<div class="gi-top"><span>${w.name}</span><span class="gi-tag">${on ? 'Equipped' : owned ? 'Equip' : 'Locked'}</span></div><div class="gi-desc">${w.desc} · ${w.slots} slot${w.slots>1?'s':''}</div>`;
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
      b.innerHTML = `<div class="gi-top"><span><span class="shell-dot ${sh.kind}"></span>${sh.name} <span class="slot-lv">Lv${inst.level}</span></span><span class="gi-tag">Equip</span></div>
        <div class="gi-desc">${sh.desc} · grants ${effect}${need!=null?` · AP ${inst.ap}/${need}`:' · MAX'}</div>`;
      b.disabled = !hasSlot; b.onclick = () => { if (equipShell(state, gearSel, inst.id)) renderGear(state, container, onClose); };
      pSec.appendChild(b);
    });
    body.appendChild(pSec);

    wrap.appendChild(body);
    container.appendChild(wrap);
  }

  return { freshState, derived, reward, fullHeal, canLearn, learn, save, load, clear, renderSkillTree, renderGear,
           equipWeapon, equipShell, unequipSlot, addShell, buyWeapon, pouchShells, def };
})();
