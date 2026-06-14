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
    if (Game.state.location.place === 'sea') toSea();
    else toIsland(Game.state.location.island || 'tidehaven', false);
    if (!Game.state.flags.seenOpening) {
      Game.state.flags.seenOpening = true; Progress.save(Game.state);
      Game.cutscene(Data.STORY.opening, () => Game.cutscene(Data.STORY.ruffyJoin, () => {
        Progress.recruit(Game.state, 'ruffy'); Progress.save(Game.state);
        Game.toast('WASD/arrows to move. Walk into glowing markers. M=Skills · G=Gear · T=Party.');
      }));
    } else {
      Game.toast('WASD/arrows to move. M=Skills · G=Gear · T=Party. Board the ship to sail between islands.');
    }
  }

  // ---------- modes ----------
  const EXPLORE = { island: () => World, sea: () => Sea, dungeon: () => Dungeon, town: () => Town };
  const HUD_MODES = ['island', 'sea', 'dungeon', 'town'];
  function setMode(name) {
    Game.mode = name;
    document.body.className = 'mode-' + name;
    if (!HUD_MODES.includes(name)) el('worldPrompt').classList.remove('show');
  }
  function pauseCurrentExplore() { const m = EXPLORE[Game.mode]; if (m) m().pause(); }

  function toIsland(key, fromSea) {
    pauseCurrentExplore();
    Game.state.location.place = 'island'; Game.state.location.island = key;
    if (fromSea) { const s = Data.ISLANDS[key]; Game.state.location.x = s.spawn.x; Game.state.location.z = s.spawn.z; }
    const sc = World.enter(key); Game.scene = sc; setMode('island'); Music.play('island'); Progress.save(Game.state);
  }
  function resumeIsland() { const sc = World.getScene(); Game.scene = sc; setMode('island'); World.resume(); Music.play('island'); }
  function toSea() { if (Game.mode === 'island') World.pause(); Game.state.location.place = 'sea'; const sc = Sea.enter(); Game.scene = sc; setMode('sea'); Music.play('sea'); Progress.save(Game.state); }
  function resumeSea() { const sc = Sea.getScene(); Game.scene = sc; setMode('sea'); Sea.resume(); Music.play('sea'); }
  function enterTown(key) { World.pause(); const sc = Town.enter(key); Game.scene = sc; setMode('town'); Progress.save(Game.state); }
  function toDungeon(key) { World.pause(); const sc = Dungeon.enter(key); Game.scene = sc; setMode('dungeon'); Progress.save(Game.state); }
  Game.toIsland = toIsland; Game.resumeIsland = resumeIsland; Game.toSea = toSea; Game.resumeSea = resumeSea; Game.enterTown = enterTown; Game.toDungeon = toDungeon;

  // ---------- battle transition ----------
  function transition(cb) {
    const tEl = el('transition'); tEl.classList.remove('show'); void tEl.offsetWidth; tEl.classList.add('show');
    if (window.SFX) SFX.play('confirm');
    setTimeout(cb, 360);
    setTimeout(() => tEl.classList.remove('show'), 800);
  }
  Game.transition = transition;

  // ---------- battle bridge ----------
  Game.musicForReturn = () => (Game.mode === 'sea' || Game.mode === 'shipbattle') ? 'sea' : 'island';
  Game.startBattle = function (keys, opts, onEnd) {
    Music.play('battle');
    transition(() => { setMode('battle'); const s = Battle.build(keys, opts, onEnd); Game.scene = s; setTimeout(() => { if (Game.scene === s) Battle.startLoop(); }, 350); });
  };
  Game.startShipBattle = function (type, onEnd) {
    Music.play('battle');
    transition(() => { setMode('shipbattle'); const s = ShipBattle.build(type, onEnd); Game.scene = s; setTimeout(() => { if (Game.scene === s) ShipBattle.startLoop(); }, 350); });
  };

  // ---------- HUD ----------
  Game.updateHUD = function () {
    const now = performance.now();
    if (now - Game._hudT < 180) return; Game._hudT = now;
    const wrap = el('hudParty'); let html = '';
    Progress.activeMembers(Game.state).forEach(p => {
      const d = Progress.derived(p);
      const hp = clamp(p.hpCur, 0, d.maxhp), mp = clamp(p.mpCur, 0, d.maxmp);
      html += `<div class="hud-m${hp<=0?' ko':''}"><div class="hud-row"><span>${d.name}</span><span class="hud-lv">Lv${p.level}</span></div>
        <div class="hud-bar php"><i style="width:${hp/d.maxhp*100}%"></i></div>
        <div class="hud-bar mp"><i style="width:${mp/d.maxmp*100}%"></i></div></div>`;
    });
    wrap.innerHTML = html;
    el('hudGold').innerHTML = '⛃ ' + Game.state.gold + ' &nbsp; 🦪 ' + (Game.state.pearls || 0);
  };

  // ---------- dialogue ----------
  const NAME2PORT = { 'Capt. Redbeard': 'pirate', 'Lance Strider': 'swordsman', 'Marina': 'healer', 'Pip': 'mage', 'Ridge': 'blader', 'Brann': 'dragoon', 'Selachoth': 'selachoth', 'Ruffy': 'ruffy' };
  function dlgPortrait(name) { const k = NAME2PORT[name]; el('dlgPortrait').innerHTML = (k && Portraits.has(k)) ? Portraits.img(k) : ''; }
  Game.talk = function (npc) {
    const lines = npc.lines.slice(); let i = 0;
    Game.dialogueOpen = true; el('dialogue').classList.add('show'); dlgPortrait(npc.name);
    function show() {
      el('dlgName').textContent = npc.name; el('dlgText').textContent = lines[i];
      el('dlgNext').textContent = i < lines.length - 1 ? 'Next ▶' : (npc.service === 'inn' ? 'Rest ✓' : npc.service === 'shop' ? 'Open Shop 🛒' : 'Close');
    }
    Game._advanceDlg = () => {
      if (i < lines.length - 1) { i++; show(); }
      else { closeDialogue(); if (npc.service === 'inn') openInn(); else if (npc.service === 'shop') openShop(); }
    };
    el('dlgNext').onclick = Game._advanceDlg;
    show();
  };
  function closeDialogue() { Game.dialogueOpen = false; el('dialogue').classList.remove('show'); }

  // ---------- cutscenes (story beats) ----------
  // Cutscenes/dialogue gate movement via Game.blocking() (dialogueOpen), so
  // they never need to touch the explore pause flag — avoids stuck states
  // when beats are chained.
  Game.cutscene = function (beats, onDone) {
    let i = 0; Game.dialogueOpen = true; el('dialogue').classList.add('show');
    function show() { el('dlgName').textContent = beats[i].name; el('dlgText').textContent = beats[i].text; dlgPortrait(beats[i].name); el('dlgNext').textContent = i < beats.length - 1 ? 'Next ▶' : 'Continue'; }
    Game._advanceDlg = () => { if (i < beats.length - 1) { i++; show(); } else { closeDialogue(); Game._advanceDlg = null; if (onDone) onDone(); } };
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
      shopRow(list, `${Data.shellIcon(sh)} ${sh.name}`, `${grants}`, sh.price, false, () => Progress.addShell(Game.state, key));
    });

    shopHeading(list, '⚔️ Weapons');
    Game.state.party.forEach(p => {
      const d = Progress.derived(p);
      Data.WEAPONS[p.key].forEach(w => {
        if (w.price <= 0) return;
        const owned = Game.state.ownedWeapons[p.key].includes(w.key);
        shopRow(list, `${Data.weaponIcon(p.key)} ${w.name}`, `${d.name} · ${w.desc}` + (owned ? ' · owned' : ''), w.price, owned, () => Progress.buyWeapon(Game.state, p.key, w.key));
      });
    });
  }
  function closeShop() { Game.shopOpen = false; el('shop').classList.remove('show'); resumeExplore(); }
  el('shopClose') && (el('shopClose').onclick = closeShop);

  // ---------- skills ----------
  function openSkills() {
    if (!HUD_MODES.includes(Game.mode)) return;
    if (Game.skillsOpen) return closeSkills();
    Game.skillsOpen = true; pauseExplore(); el('skills').classList.add('show');
    Progress.renderSkillTree(Game.state, el('skillBody'), closeSkills);
  }
  function closeSkills() { Game.skillsOpen = false; el('skills').classList.remove('show'); Progress.save(Game.state); resumeExplore(); }
  Game.openSkills = openSkills;

  // ---------- gear / seashells ----------
  function openGear() {
    if (!HUD_MODES.includes(Game.mode)) return;
    if (Game.gearOpen) return closeGear();
    Game.gearOpen = true; pauseExplore(); el('gear').classList.add('show');
    Progress.renderGear(Game.state, el('gearBody'), closeGear);
  }
  function closeGear() { Game.gearOpen = false; el('gear').classList.remove('show'); Progress.save(Game.state); resumeExplore(); }
  Game.openGear = openGear;

  // ---------- party (swap active 3 of 6) ----------
  function openParty() {
    if (!HUD_MODES.includes(Game.mode)) return;
    if (Game.partyOpen) return closeParty();
    Game.partyOpen = true; pauseExplore(); el('partyScr').classList.add('show');
    Progress.renderRoster(Game.state, el('partyBody'), closeParty);
  }
  function closeParty() { Game.partyOpen = false; el('partyScr').classList.remove('show'); Progress.save(Game.state); resumeExplore(); }
  Game.openParty = openParty;

  // ---------- shipyard ----------
  function openShipyard() {
    if (Game.shipyardOpen) return closeShipyard();
    Game.shipyardOpen = true; pauseExplore(); el('shipyard').classList.add('show');
    Progress.renderShipyard(Game.state, el('shipyardBody'), closeShipyard);
  }
  function closeShipyard() {
    Game.shipyardOpen = false; el('shipyard').classList.remove('show'); Progress.save(Game.state);
    if (Game.mode === 'sea') { const sc = Sea.enter(); Game.scene = sc; } else resumeExplore(); // rebuild to show new colors
  }
  Game.openShipyard = openShipyard;

  // ---------- shell hunt ----------
  function openShellHunt() { pauseExplore(); ShellHunt.start(() => resumeExplore()); }
  Game.openShellHunt = openShellHunt;

  // ---------- dating (mermaids) ----------
  function openDating(key) { Game.datingOpen = true; pauseExplore(); Dating.start(key, () => { Game.datingOpen = false; resumeExplore(); }); }
  Game.openDating = openDating;

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
    el('end').classList.add('show'); Music.play('victory', 'island');
  };
  Game.finalEnding = function () {
    el('endTitle').textContent = 'The Tide Turns';
    el('endText').innerHTML = 'Selachoth dissolves into seafoam, and the grey horizon blushes gold. Saltmere is saved — and the legend of the three who turned the tide will be sung on every shore.<br><br><b>Thanks for playing!</b> You can keep exploring, or return to the site.';
    el('end').classList.add('show'); Music.play('victory', 'island');
  };
  el('endContinue') && (el('endContinue').onclick = () => el('end').classList.remove('show'));

  // ---------- explore pause helpers ----------
  function pauseExplore() { const m = EXPLORE[Game.mode]; if (m) m().pause(); }
  function resumeExplore() { const m = EXPLORE[Game.mode]; if (m) m().resume(); }

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
    Game.canvasTap = () => { if (Game.dialogueOpen) return Game._advanceDlg && Game._advanceDlg(); if (anyModal()) return; if (HUD_MODES.includes(Game.mode) && Game.active) Game.active.interact && Game.active.interact(); };
    document.addEventListener('pointerdown', e => { if (e.target && e.target.id === 'renderCanvas') Game.canvasTap(); });
    el('btnSkills').onclick = openSkills;
    el('btnGear').onclick = openGear;
    el('btnParty').onclick = openParty;
    if (window.Render) el('btnFx').textContent = Render.isHigh() ? '✨' : '▫️';
    el('btnFx').onclick = () => { const q = Render.toggle(); el('btnFx').textContent = q === 'high' ? '✨' : '▫️'; Game.toast('Graphics: ' + (q === 'high' ? 'High' : 'Low') + ' — applies when you next enter an area or battle.'); };
    el('btnMusic').onclick = () => { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; };
    el('worldPrompt').onclick = () => { if (Game.active) Game.active.interact && Game.active.interact(); };
  }
  function anyModal() { return Game.skillsOpen || Game.gearOpen || Game.partyOpen || Game.shipyardOpen || Game.datingOpen || Game.shopOpen || Game.confirmOpen || el('shellHunt').classList.contains('show') || el('end').classList.contains('show'); }
  Game.blocking = function () { return Game.dialogueOpen || anyModal(); };
  function route(code) {
    if (el('shellHunt').classList.contains('show')) return; // minigame handles its own input
    if (Game.datingOpen) return; // dating handles its own buttons
    if (Game.skillsOpen) { if (code === 'Escape' || code === 'KeyM') closeSkills(); return; }
    if (Game.gearOpen) { if (code === 'Escape' || code === 'KeyG') closeGear(); return; }
    if (Game.partyOpen) { if (code === 'Escape' || code === 'KeyT') closeParty(); return; }
    if (Game.shipyardOpen) { if (code === 'Escape' || code === 'KeyC') closeShipyard(); return; }
    if (Game.confirmOpen) { if (code === 'Enter' || code === 'KeyE') el('confirmYes').click(); else if (code === 'Escape') el('confirmNo').click(); return; }
    if (Game.shopOpen) { if (code === 'Escape') closeShop(); return; }
    if (Game.dialogueOpen) { if (ACTION.has(code)) Game._advanceDlg && Game._advanceDlg(); return; }
    if (code === 'KeyM') return openSkills();
    if (code === 'KeyG') return openGear();
    if (code === 'KeyT') return openParty();
    if (code === 'KeyC' && Game.mode === 'sea') return openShipyard();
    if (code === 'KeyP') { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; return; }
    if (ACTION.has(code) && Game.active && Game.active.interact) Game.active.interact();
  }

  Game.boot = boot;
  return Game;
})();

window.addEventListener('DOMContentLoaded', () => Game.boot());
