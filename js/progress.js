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
    const state = {
      gold: 50, party, inv,
      world: { x: Data.WORLD.spawn.x, z: Data.WORLD.spawn.z, cleared: {}, krakenDown: false },
      flags: {},
    };
    party.forEach(p => { const d = derived(p); p.hpCur = d.maxhp; p.mpCur = d.maxmp; });
    return state;
  }

  function def(key) { return Data.PARTY.find(p => p.key === key); }

  // compute current stats from base + growth*level + learned stat nodes
  function derived(memberState) {
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
    return {
      name: d.name, role: d.role, model: d.model,
      maxhp, maxmp,
      fight: { min: d.base.atkMin + atkBonus, max: d.base.atkMax + atkBonus, crit, big: !!d.base.big },
      abilities,
    };
  }

  // award XP/gold after a battle; returns array of level-up summaries
  function reward(state, xp, gold) {
    state.gold += gold;
    const ups = [];
    state.party.forEach(p => {
      if (p.hpCur <= 0) return; // KO'd members earn no XP
      p.xp += xp;
      let leveled = false;
      while (p.level < Data.MAX_LEVEL && p.xp >= Data.xpForLevel(p.level)) {
        p.xp -= Data.xpForLevel(p.level);
        p.level++; p.sp += 1; leveled = true;
      }
      if (leveled) {
        const d = derived(p);
        p.hpCur = d.maxhp; p.mpCur = d.maxmp; // full heal on level up
        ups.push({ name: d.name, level: p.level });
      }
    });
    save(state);
    return ups;
  }

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
  function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
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

  return { freshState, derived, reward, fullHeal, canLearn, learn, save, load, clear, renderSkillTree, def };
})();
