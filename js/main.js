// =====================================================================
//  Main — game orchestrator: engine, persistent state, mode switching,
//  input routing, HUD, dialogue, shop, inn, and the skill menu.
// =====================================================================
window.Input = { keys: new Set(), down(c) { return this.keys.has(c); } };

window.Game = (function () {
  const el = id => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const Game = {
    engine: null, canvas: null, scene: null, state: null, active: null,
    mode: 'start', dialogueOpen: false, shopOpen: false, skillsOpen: false, confirmOpen: false,
    _advanceDlg: null, _hudT: 0,
  };

  // ---------- boot ----------
  function boot() {
    Game.canvas = el('renderCanvas');
    Game.engine = new BABYLON.Engine(Game.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    Game.engine.runRenderLoop(() => { if (Game.scene) Game.scene.render(); });
    window.addEventListener('resize', () => Game.engine.resize());

    setupInput();

    const save = Progress.load();
    el('startContinue').style.display = save ? 'inline-flex' : 'none';
    el('startNew').onclick = () => { Music.start(); Progress.clear(); Game.state = Progress.freshState(); beginGame(); };
    el('startContinue').onclick = () => { Music.start(); Game.state = save || Progress.freshState(); beginGame(); };
    setMode('start');
  }

  function beginGame() {
    el('start').classList.remove('show');
    toWorld();
    if (!Game.state.flags.seenOpening) {
      Game.state.flags.seenOpening = true; Progress.save(Game.state);
      Game.cutscene(Data.STORY.opening, () => Game.toast('Use WASD / arrows to move. Walk into glowing gates and monsters. Press M for Skills.'));
    } else {
      Game.toast('Use WASD / arrows to move. Walk into glowing gates and monsters. Press M for Skills.');
    }
  }

  // ---------- modes ----------
  function setMode(name) {
    Game.mode = name;
    document.body.className = 'mode-' + name;
    if (name !== 'world' && name !== 'town') el('worldPrompt').classList.remove('show');
  }

  function toWorld() {
    if (Game.mode === 'town') Town.pause();
    const s = World.enter(); Game.scene = s; setMode('world');
    if (!Game.state.world.krakenDown || true) Music.play('world');
    Progress.save(Game.state);
  }
  function enterTown(key) {
    World.pause();
    const s = Town.enter(key); Game.scene = s; setMode('town');
    Progress.save(Game.state);
  }
  Game.toWorld = toWorld; Game.enterTown = enterTown;

  // ---------- battle bridge ----------
  Game.musicForReturn = () => (Game.mode === 'town' ? 'town' : 'world');
  Game.startBattle = function (keys, opts, onEnd) {
    setMode('battle');
    const s = Battle.build(keys, opts, onEnd);
    Game.scene = s;
    setTimeout(() => { if (Game.scene === s) Battle.startLoop(); }, 450);
  };

  // ---------- HUD ----------
  Game.updateHUD = function () {
    const now = performance.now();
    if (now - Game._hudT < 180) return; Game._hudT = now;
    const wrap = el('hudParty'); let html = '';
    Game.state.party.forEach(p => {
      const d = Progress.derived(p);
      const hp = clamp(p.hpCur, 0, d.maxhp), mp = clamp(p.mpCur, 0, d.maxmp);
      html += `<div class="hud-m${hp<=0?' ko':''}"><div class="hud-row"><span>${d.name}</span><span class="hud-lv">Lv${p.level}</span></div>
        <div class="hud-bar php"><i style="width:${hp/d.maxhp*100}%"></i></div>
        <div class="hud-bar mp"><i style="width:${mp/d.maxmp*100}%"></i></div></div>`;
    });
    wrap.innerHTML = html;
    el('hudGold').textContent = '⛃ ' + Game.state.gold;
  };

  // ---------- dialogue ----------
  Game.talk = function (npc) {
    pauseExplore();
    const lines = npc.lines.slice(); let i = 0;
    Game.dialogueOpen = true; el('dialogue').classList.add('show');
    function show() {
      el('dlgName').textContent = npc.name; el('dlgText').textContent = lines[i];
      el('dlgNext').textContent = i < lines.length - 1 ? 'Next ▶' : (npc.service === 'inn' ? 'Rest ✓' : npc.service === 'shop' ? 'Open Shop 🛒' : 'Close');
    }
    Game._advanceDlg = () => {
      if (i < lines.length - 1) { i++; show(); }
      else { closeDialogue(); if (npc.service === 'inn') openInn(); else if (npc.service === 'shop') openShop(); else resumeExplore(); }
    };
    el('dlgNext').onclick = Game._advanceDlg;
    show();
  };
  function closeDialogue() { Game.dialogueOpen = false; el('dialogue').classList.remove('show'); }

  // ---------- cutscenes (story beats) ----------
  Game.cutscene = function (beats, onDone) {
    pauseExplore();
    let i = 0; Game.dialogueOpen = true; el('dialogue').classList.add('show');
    function show() { el('dlgName').textContent = beats[i].name; el('dlgText').textContent = beats[i].text; el('dlgNext').textContent = i < beats.length - 1 ? 'Next ▶' : 'Continue'; }
    Game._advanceDlg = () => { if (i < beats.length - 1) { i++; show(); } else { closeDialogue(); Game._advanceDlg = null; if (onDone) onDone(); else resumeExplore(); } };
    el('dlgNext').onclick = Game._advanceDlg;
    show();
  };
  Game.startCutscene = function (key, onDone) { Game.cutscene(Data.STORY[key], onDone); };

  // ---------- inn ----------
  function openInn() {
    Progress.fullHeal(Game.state);
    Game.toast('Zzz… Your party is fully restored!');
    resumeExplore();
  }

  // ---------- shop ----------
  function openShop() {
    Game.shopOpen = true; el('shop').classList.add('show'); renderShop();
  }
  function shopRow(list, name, desc, price, disabled, onBuy) {
    const row = document.createElement('div'); row.className = 'shop-row';
    row.innerHTML = `<div class="shop-info"><b>${name}</b><span>${desc}</span></div>`;
    const buy = document.createElement('button'); buy.className = 'pill small'; buy.textContent = '⛃ ' + price;
    buy.disabled = disabled || Game.state.gold < price;
    buy.onclick = () => { if (Game.state.gold >= price) { Game.state.gold -= price; onBuy(); Progress.save(Game.state); renderShop(); } };
    row.appendChild(buy); list.appendChild(row);
  }
  function shopHeading(list, text) { const h = document.createElement('div'); h.className = 'shop-head'; h.textContent = text; list.appendChild(h); }
  function renderShop() {
    el('shopGold').textContent = '⛃ ' + Game.state.gold;
    const list = el('shopList'); list.innerHTML = '';

    shopHeading(list, '🧪 Items');
    Data.SHOP_STOCK.forEach(key => {
      const it = Data.ITEM_DEFS[key]; const have = Game.state.inv[key] || 0;
      const desc = (it.kind === 'heal' ? `Restore ${it.amount} HP` : it.kind === 'mana' ? `Restore ${it.amount} MP` : it.kind === 'revive' ? 'Revive a fallen ally' : `${it.min}-${it.max} damage`) + ` · owned ×${have}`;
      shopRow(list, it.name, desc, it.price, false, () => { Game.state.inv[key] = (Game.state.inv[key]||0)+1; });
    });

    shopHeading(list, '🐚 Seashells (materia)');
    Data.SHOP_SHELLS.forEach(key => {
      const sh = Data.SHELLS[key];
      const grants = sh.kind === 'magic' ? `grants ${sh.ability.name}` : sh.desc;
      shopRow(list, sh.name, `${grants}`, sh.price, false, () => Progress.addShell(Game.state, key));
    });

    shopHeading(list, '⚔️ Weapons');
    Game.state.party.forEach(p => {
      const d = Progress.derived(p);
      Data.WEAPONS[p.key].forEach(w => {
        if (w.price <= 0) return;
        const owned = Game.state.ownedWeapons[p.key].includes(w.key);
        shopRow(list, `${w.name}`, `${d.name} · ${w.desc}` + (owned ? ' · owned' : ''), w.price, owned, () => Progress.buyWeapon(Game.state, p.key, w.key));
      });
    });
  }
  function closeShop() { Game.shopOpen = false; el('shop').classList.remove('show'); resumeExplore(); }
  el('shopClose') && (el('shopClose').onclick = closeShop);

  // ---------- skills ----------
  function openSkills() {
    if (Game.mode !== 'world' && Game.mode !== 'town') return;
    if (Game.skillsOpen) return closeSkills();
    Game.skillsOpen = true; pauseExplore(); el('skills').classList.add('show');
    Progress.renderSkillTree(Game.state, el('skillBody'), closeSkills);
  }
  function closeSkills() { Game.skillsOpen = false; el('skills').classList.remove('show'); Progress.save(Game.state); resumeExplore(); }
  Game.openSkills = openSkills;

  // ---------- gear / seashells ----------
  function openGear() {
    if (Game.mode !== 'world' && Game.mode !== 'town') return;
    if (Game.gearOpen) return closeGear();
    Game.gearOpen = true; pauseExplore(); el('gear').classList.add('show');
    Progress.renderGear(Game.state, el('gearBody'), closeGear);
  }
  function closeGear() { Game.gearOpen = false; el('gear').classList.remove('show'); Progress.save(Game.state); resumeExplore(); }
  Game.openGear = openGear;

  // ---------- confirm ----------
  Game.confirm = function (text, onYes) {
    pauseExplore(); Game.confirmOpen = true; el('confirmText').textContent = text; el('confirm').classList.add('show');
    el('confirmYes').onclick = () => { Game.confirmOpen = false; el('confirm').classList.remove('show'); onYes(); };
    el('confirmNo').onclick = () => { Game.confirmOpen = false; el('confirm').classList.remove('show'); resumeExplore(); };
  };

  // ---------- toast ----------
  let toastTimer = null;
  Game.toast = function (text) { const tEl = el('toast'); tEl.textContent = text; tEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => tEl.classList.remove('show'), 3200); };

  // ---------- ending ----------
  Game.victoryEnding = function () {
    el('endTitle').textContent = 'The Kraken Falls!';
    el('endText').innerHTML = 'With a final, earth-shaking blow, the Kraken sinks into the depths. The high seas are calm once more — and your legend is sealed.<br><br>You can keep exploring, or return to the site.';
    el('end').classList.add('show'); Music.play('victory', 'world');
  };
  Game.finalEnding = function () {
    el('endTitle').textContent = 'The Tide Turns';
    el('endText').innerHTML = 'Selachoth dissolves into seafoam, and the grey horizon blushes gold. Saltmere is saved — and the legend of the three who turned the tide will be sung on every shore.<br><br><b>Thanks for playing!</b> You can keep exploring, or return to the site.';
    el('end').classList.add('show'); Music.play('victory', 'world');
  };
  el('endContinue') && (el('endContinue').onclick = () => el('end').classList.remove('show'));

  // ---------- explore pause helpers ----------
  function pauseExplore() { if (Game.mode === 'world') World.pause(); else if (Game.mode === 'town') Town.pause(); }
  function resumeExplore() { if (Game.mode === 'world') World.resume(); else if (Game.mode === 'town') Town.resume(); }

  // ---------- input ----------
  const ACTION = new Set(['KeyE', 'Space', 'Enter']);
  const MOVE = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (MOVE.has(e.code) || ACTION.has(e.code)) e.preventDefault();
      Input.keys.add(e.code);
      if (e.repeat) return;
      route(e.code);
    });
    window.addEventListener('keyup', e => Input.keys.delete(e.code));
    // tap-to-interact (mobile / mouse)
    Game.canvasTap = () => { if (Game.dialogueOpen) return Game._advanceDlg && Game._advanceDlg(); if (anyModal()) return; if ((Game.mode === 'world' || Game.mode === 'town') && Game.active) Game.active.interact && Game.active.interact(); };
    document.addEventListener('pointerdown', e => { if (e.target && e.target.id === 'renderCanvas') Game.canvasTap(); });
    el('btnSkills').onclick = openSkills;
    el('btnGear').onclick = openGear;
    el('btnMusic').onclick = () => { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; };
    el('worldPrompt').onclick = () => { if (Game.active) Game.active.interact && Game.active.interact(); };
  }
  function anyModal() { return Game.skillsOpen || Game.gearOpen || Game.shopOpen || Game.confirmOpen || el('end').classList.contains('show'); }
  function route(code) {
    if (Game.skillsOpen) { if (code === 'Escape' || code === 'KeyM') closeSkills(); return; }
    if (Game.gearOpen) { if (code === 'Escape' || code === 'KeyG') closeGear(); return; }
    if (Game.confirmOpen) { if (code === 'Enter' || code === 'KeyE') el('confirmYes').click(); else if (code === 'Escape') el('confirmNo').click(); return; }
    if (Game.shopOpen) { if (code === 'Escape') closeShop(); return; }
    if (Game.dialogueOpen) { if (ACTION.has(code)) Game._advanceDlg && Game._advanceDlg(); return; }
    if (code === 'KeyM') return openSkills();
    if (code === 'KeyG') return openGear();
    if (code === 'KeyP') { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; return; }
    if (ACTION.has(code) && Game.active && Game.active.interact) Game.active.interact();
  }

  Game.boot = boot;
  return Game;
})();

window.addEventListener('DOMContentLoaded', () => Game.boot());
