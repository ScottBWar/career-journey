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
    if (window.Portraits) el('startPortraits').innerHTML = ['pirate', 'swordsman', 'healer'].map(k => Portraits.img(k, 'start-port')).join('');
    el('startContinue').style.display = save ? 'inline-flex' : 'none';
    el('startNew').onclick = () => { Music.start(); Progress.clear(); Game.state = Progress.freshState(); beginGame(true); };
    el('startContinue').onclick = () => { Music.start(); Game.state = save || Progress.freshState(); beginGame(false); };
    setMode('start');
  }

  const INTRO_TEXT = `
    <div class="ic-title">BEACH BRAWL</div>
    <div class="ic-sub">A HIGH-SEAS SAGA</div>
    <div class="ic-body">
      <p>IN THE YEAR 20XX...</p>
      <p>The Free Seas were a promise — that anyone, from any shore, could chase a horizon and call it home.</p>
      <p>Then the tide turned. The ocean began to RISE. Beaches vanished. Beasts crawled from the foam.</p>
      <p>They learned a name to fear — SELACHOTH, the One-Finned Angel. A fallen hero who would drown the warm world to remake it beneath the waves.</p>
      <p>Three souls answered the call: a pirate with a grudge, a priestess of the tides, and a swordsman with a score to settle.</p>
      <p>The tide is rising. Their legend begins... now.</p>
    </div>`;
  function playIntro(onDone) {
    const seq = el('introSeq'); el('introCrawl').innerHTML = INTRO_TEXT;
    el('introCrawl').style.animation = 'none'; void el('introCrawl').offsetWidth; el('introCrawl').style.animation = '';
    seq.classList.add('show'); Music.play('intro');
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(Game._introTimer); seq.classList.remove('show'); onDone(); };
    el('introBegin').onclick = finish; Game._introFinish = finish;
    Game._introTimer = setTimeout(finish, 22000);
  }
  function beginGame(fresh) {
    el('start').classList.remove('show');
    applySettings();              // apply saved volume settings now that state is loaded
    document.body.className = ''; // drop mode-start so the title screen can't linger behind the intro/cutscene
    const intoWorld = () => { if (Game.state.location.place === 'sea') toSea(); else toIsland(Game.state.location.island || 'tidehaven', false); };
    if (fresh && !Game.state.flags.seenOpening) {
      playIntro(() => {
        Game.state.flags.seenOpening = true; Progress.save(Game.state);
        // the crawl sets the scene; now the heroes are introduced in the staged cliff cinematic
        Game.cutscene(Data.STORY.opening, () => {
          intoWorld();
          // Ruffy is NOT in the crew yet — he chases you down at sea later and duels his way in.
          Game.toast('WASD move · Q/E rotate camera · F interact · Space swing for a first strike!');
        }, { set: 'cliff_dawn', music: 'adventure' });
      });
    } else {
      intoWorld();
      Game.toast('WASD move · Q/E rotate camera · F interact · Space swing (first strike!) · M Skills · G Gear · T Party.');
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
    areaWipe(() => {
      Game.state.location.place = 'island'; Game.state.location.island = key;
      if (fromSea) { const s = Data.ISLANDS[key]; Game.state.location.x = s.spawn.x; Game.state.location.z = s.spawn.z; }
      const sc = World.enter(key); Game.scene = sc; setMode('island'); Music.play('island'); Progress.save(Game.state);
    });
  }
  function resumeIsland() { const sc = World.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('island'); World.resume(); World.focus(); Music.play('island'); }
  function toSea() { if (Game.mode === 'island') World.pause(); areaWipe(() => { Game.state.location.place = 'sea'; const sc = Sea.enter(); Game.scene = sc; setMode('sea'); Music.play('sea'); Progress.save(Game.state); }); }
  function resumeSea() { const sc = Sea.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('sea'); Sea.resume(); Sea.focus(); Music.play('sea'); }
  function enterTown(key) { World.pause(); areaWipe(() => { const sc = Town.enter(key); Game.scene = sc; setMode('town'); Progress.save(Game.state); }); }
  function toDungeon(key) { World.pause(); areaWipe(() => { const sc = Dungeon.enter(key); Game.scene = sc; setMode('dungeon'); Progress.save(Game.state); }); }
  function resumeDungeon() { const sc = Dungeon.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('dungeon'); Dungeon.resume(); Music.play('dungeon'); }
  Game.toIsland = toIsland; Game.resumeIsland = resumeIsland; Game.toSea = toSea; Game.resumeSea = resumeSea; Game.enterTown = enterTown; Game.toDungeon = toDungeon; Game.resumeDungeon = resumeDungeon;

  // ---------- transitions ----------
  // a full-screen white pop — the classic JRPG "ping" as a fight begins
  function flashWipe(strong) {
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:61;pointer-events:none;background:#fff;';
    document.body.appendChild(d);
    if (d.animate) d.animate([{ opacity: strong ? 0.96 : 0.72 }, { opacity: 0 }], { duration: strong ? 460 : 300, easing: 'ease-out' });
    setTimeout(() => d.remove(), 480);
  }
  // battle entry — venetian-blind columns snap shut (cb fires while covered), flash, then snap open
  function transition(cb, opts) {
    opts = opts || {}; const boss = !!opts.boss;
    const tEl = el('transition'); tEl.className = 'trans'; tEl.innerHTML = '';
    flashWipe(boss); if (window.SFX) SFX.play(boss ? 'crit' : 'confirm');
    const N = 12, coverMs = 300, bars = [];
    for (let i = 0; i < N; i++) { const b = document.createElement('div'); b.className = 'tbar' + (boss ? ' boss' : ''); b.style.left = (i * 100 / N) + '%'; b.style.width = (100 / N + 0.4) + '%'; b.style.transformOrigin = (i % 2 ? 'top' : 'bottom'); tEl.appendChild(b); bars.push(b); }
    let fired = false; const fire = () => { if (fired) return; fired = true; cb(); };
    if (bars[0].animate) {
      bars.forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 230, delay: i * 14, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' }));
      setTimeout(fire, coverMs);
      bars.forEach((b, i) => b.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 300, delay: coverMs + 150 + (N - 1 - i) * 14, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }));
      setTimeout(() => { tEl.className = ''; tEl.innerHTML = ''; }, coverMs + 150 + N * 14 + 340);
    } else { tEl.classList.add('show'); setTimeout(fire, 360); setTimeout(() => { tEl.className = ''; tEl.innerHTML = ''; }, 800); }
  }
  Game.transition = transition;
  // area change — a quick dark dip; cb swaps the scene while the screen is covered
  function areaWipe(cb) {
    const tEl = el('transition'); tEl.className = ''; void tEl.offsetWidth; tEl.className = 'fade'; tEl.innerHTML = '';
    let fired = false; const fire = () => { if (fired) return; fired = true; cb && cb(); };
    setTimeout(fire, 210); setTimeout(() => { tEl.className = ''; }, 560);
  }
  Game.areaWipe = areaWipe;

  // ---------- battle bridge ----------
  Game.musicForReturn = () => (Game.mode === 'sea' || Game.mode === 'shipbattle') ? 'sea' : Game.mode === 'town' ? 'town' : Game.mode === 'dungeon' ? 'dungeon' : 'island';
  Game.startBattle = function (keys, opts, onEnd) {
    Music.play((opts && opts.music) || (opts && opts.boss ? (Music.bossTheme ? Music.bossTheme() : 'boss') : (Music.battleTheme ? Music.battleTheme() : 'battle')));
    transition(() => { setMode('battle'); const s = Battle.build(keys, opts, onEnd); Game.scene = s; setTimeout(() => { if (Game.scene === s) Battle.startLoop(); }, 350); }, { boss: !!(opts && opts.boss) });
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
      html += `<div class="hud-m${hp<=0?' ko':''}">${Portraits.img(p.key, 'hud-port')}<div class="hud-info"><div class="hud-row"><span>${d.name}</span><span class="hud-lv">Lv${p.level}</span></div>
        <div class="hud-bar php"><i style="width:${hp/d.maxhp*100}%"></i></div>
        <div class="hud-bar mp"><i style="width:${mp/d.maxmp*100}%"></i></div></div></div>`;
    });
    wrap.innerHTML = html;
    el('hudGold').innerHTML = '⛃ ' + Game.state.gold + ' &nbsp; 🦪 ' + (Game.state.pearls || 0);
  };

  // ---------- dialogue ----------
  const NAME2PORT = { 'Capt. Redbeard': 'pirate', 'Lance Strider': 'swordsman', 'Marina': 'healer', 'Selachoth': 'selachoth', 'Ruffy': 'ruffy', 'Simon': 'simon', 'Count Saltorre': 'vampire', 'Gilgamuck': 'drifter',
    'Aladdin': 'aladdin', 'Jafira': 'genie', 'Violca': 'violca', 'Vyrmithrax': 'skydragon',
    'Mac': 'mac', 'The Thing': 'thething', 'Sané': 'sane', 'The Forest God': 'forestgod',
    'Marvyn': 'marvyn', 'Vogon Constructor': 'vogon', 'Quijano': 'quijano', 'The Giant (a windmill)': 'windmill',
    'Kuato': 'kuato', 'Brundle': 'brundle', 'Sir Didymus': 'didymus', 'Zed': 'zed',
    'Ember': 'ember', 'Nerida': 'nerida', 'Volta': 'volta', 'Gaia': 'gaia', 'Nyx': 'nyx', 'Lumina': 'lumina' };
  function dlgPortrait(name) { const k = NAME2PORT[name]; el('dlgPortrait').innerHTML = (k && Portraits.has(k)) ? Portraits.img(k) : ''; }
  Game.talk = function (npc) {
    const lines = npc.lines.slice(); let i = 0;
    Game.dialogueOpen = true; el('dialogue').classList.add('show'); dlgPortrait(npc.name);
    function show() {
      el('dlgName').textContent = npc.name; el('dlgText').textContent = lines[i];
      const svcLabel = { inn: 'Rest ✓', shop: 'Open Shop 🛒', observatory: 'Stargaze 🔭', arcade1: 'Play 🎯', arcade2: 'Play 🪼', respec: 'Re-pick paths ✦' };
      el('dlgNext').textContent = i < lines.length - 1 ? 'Next ▶' : (svcLabel[npc.service] || 'Close');
    }
    Game._advanceDlg = () => {
      if (i < lines.length - 1) { i++; show(); }
      else { closeDialogue(); const s = npc.service;
        if (s === 'inn') openInn(); else if (s === 'shop') openShop();
        else if (s === 'observatory') openObservatory();
        else if (s === 'arcade1') openArcade('timing');
        else if (s === 'arcade2') openArcade('memory');
        else if (s === 'respec') openRespec(); }
    };
    el('dlgNext').onclick = Game._advanceDlg;
    show();
  };
  function closeDialogue() { Game.dialogueOpen = false; el('dialogue').classList.remove('show'); }

  // ---------- cutscenes (story beats) ----------
  // Cutscenes/dialogue gate movement via Game.blocking() (dialogueOpen), so
  // they never need to touch the explore pause flag — avoids stuck states
  // when beats are chained.
  // resolve a dialogue speaker name to a 3D model the cinematic stage can build
  Game.cutsceneActorKey = function (name) {
    const k = NAME2PORT[name]; if (!k) return null;
    if (Data.PARTY.find(p => p.key === k)) return { type: 'party', key: k };
    if (Data.ENEMIES[k]) return { type: 'enemy', key: k };
    if (Data.MERMAIDS && Data.MERMAIDS[k]) return { type: 'mermaid', key: k };
    return null;
  };
  function lightweightCutscene(beats, onDone) {
    let i = 0; Game.dialogueOpen = true; el('dialogue').classList.add('show');
    function show() { el('dlgName').textContent = beats[i].name; el('dlgText').textContent = beats[i].text; dlgPortrait(beats[i].name); el('dlgNext').textContent = i < beats.length - 1 ? 'Next ▶' : 'Continue'; }
    Game._advanceDlg = () => { if (i < beats.length - 1) { i++; show(); } else { closeDialogue(); Game._advanceDlg = null; if (onDone) onDone(); } };
    el('dlgNext').onclick = Game._advanceDlg;
    show();
  }
  // character-driven story beats play as a staged cinematic; narrator/riddle-only beats use the box
  Game.cutscene = function (beats, onDone, opts) {
    if (window.Cutscene && beats.some(b => Game.cutsceneActorKey(b.name))) Cutscene.play(beats, onDone, opts);
    else lightweightCutscene(beats, onDone);
  };
  Game.startCutscene = function (key, onDone, opts) { Game.cutscene(Data.STORY[key], onDone, opts); };
  // each recruitable character meets you to a theme that riffs on their source material
  Game.CHAR_THEME = { ruffy: 'theme_ruffy', simon: 'theme_simon', aladdin: 'theme_aladdin', violca: 'theme_violca', mac: 'theme_mac', sane: 'theme_sane', marvyn: 'theme_marvyn', quijano: 'theme_quijano' };

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
  function itemBlurb(it) {
    if (it.desc) return it.desc;
    if (it.kind === 'heal') return `Restore ${it.amount} HP`;
    if (it.kind === 'healall') return `Restore ${it.amount} HP to all`;
    if (it.kind === 'full') return 'Fully restore HP & MP';
    if (it.kind === 'mana') return `Restore ${it.amount} MP`;
    if (it.kind === 'manaall') return `Restore ${it.amount} MP to all`;
    if (it.kind === 'limit') return 'Fill the Limit gauge';
    if (it.kind === 'revive') return 'Revive a fallen ally';
    if (it.kind === 'fullrevive') return 'Revive to full HP';
    return `${it.min}-${it.max} damage`;
  }
  function craftRow(list, name, desc, costStr, disabled, onMake) {
    const row = document.createElement('div'); row.className = 'shop-row';
    row.innerHTML = `<div class="shop-info"><b>${name}</b><span>${desc} · <em class="craft-cost">${costStr}</em></span></div>`;
    const b = document.createElement('button'); b.className = 'pill small'; b.textContent = 'Craft 🔨'; b.disabled = disabled;
    b.onclick = onMake; row.appendChild(b); list.appendChild(row);
  }
  function renderShop() {
    el('shopGold').textContent = '⛃ ' + Game.state.gold;
    const list = el('shopList'); list.innerHTML = '';

    const townKey = (Town && Town.getKey && Town.getKey()) || 'tidehaven';
    const stock = (Data.SHOP_STOCK_BY_TOWN && Data.SHOP_STOCK_BY_TOWN[townKey]) || Data.SHOP_STOCK;
    shopHeading(list, '🧪 Items');
    stock.forEach(key => {
      const it = Data.ITEM_DEFS[key]; if (!it) return; const have = Game.state.inv[key] || 0;
      const desc = itemBlurb(it) + ` · owned ×${have}`;
      shopRow(list, it.name, desc, it.price, false, () => { Game.state.inv[key] = (Game.state.inv[key]||0)+1; });
    });

    // ---- crafting: turn dropped junk into goods ----
    if (Data.RECIPES && Data.RECIPES.length) {
      shopHeading(list, '⚗️ Crafting — combine materials');
      const mats = Game.state.mats || {};
      const owned = Object.keys(mats).filter(k => mats[k] > 0);
      if (owned.length) {
        const inv = document.createElement('div'); inv.className = 'craft-mats';
        inv.innerHTML = owned.map(k => { const M = Data.MATERIALS[k] || {}; return `<span class="craft-mat">${M.icon || '•'} ${M.name || k} ×${mats[k]}</span>`; }).join('');
        list.appendChild(inv);
      } else {
        const none = document.createElement('div'); none.className = 'craft-none'; none.textContent = 'No materials yet — defeat monsters to collect crafting junk.'; list.appendChild(none);
      }
      Data.RECIPES.forEach(r => {
        const it = Data.ITEM_DEFS[r.out]; if (!it) return;
        const costStr = Object.keys(r.cost).map(k => { const M = Data.MATERIALS[k] || {}; return `${M.icon || ''}${(Game.state.mats[k]||0)}/${r.cost[k]}`; }).join(' ');
        const ok = Progress.canCraft(Game.state, r);
        craftRow(list, r.name, itemBlurb(it), costStr, !ok, () => { if (Progress.craft(Game.state, r)) { Game.toast('Crafted ' + r.name + '!'); renderShop(); } });
      });
    }

    shopHeading(list, '🐚 Seashells (materia)');
    Data.SHOP_SHELLS.forEach(key => {
      const sh = Data.SHELLS[key];
      const grants = sh.kind === 'magic' ? `grants ${sh.ability.name}` : sh.desc;
      shopRow(list, `${Data.shellIcon(sh)} ${sh.name}`, `${grants}`, sh.price, false, () => Progress.addShell(Game.state, key));
    });

    shopHeading(list, '💍 Accessories');
    (Data.SHOP_ACCESSORIES || []).forEach(key => {
      const acc = Data.ACCESSORIES[key]; if (!acc) return;
      const owned = (Game.state.ownedAccessories || []).includes(key);
      shopRow(list, `💍 ${acc.name}`, acc.desc + (owned ? ' · owned' : ''), acc.price, owned, () => Progress.buyAccessory(Game.state, key));
    });

    shopHeading(list, '⚔️ Weapons');
    Game.state.party.filter(p => p.recruited !== false).forEach(p => {
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

  // ---------- observatory ----------
  function openObservatory() { pauseExplore(); Observatory.start(() => resumeExplore()); }
  Game.openObservatory = openObservatory;

  // ---------- arcade ----------
  function openArcade(game) { pauseExplore(); Arcade.start(game, () => { Music.play(Game.mode === 'town' ? 'town' : 'island'); resumeExplore(); }); }
  Game.openArcade = openArcade;

  // ---------- coliseum (Paegina endgame gauntlet) ----------
  function openColiseum() { pauseExplore(); Coliseum.open(() => { Game.resumeIsland(); }); }
  Game.openColiseum = openColiseum;

  // ---------- respec (late game: gated behind beating the Kraken) ----------
  function openRespec() {
    if (!Game.state.prog || !Game.state.prog.krakenDown) { Game.toast('Kupo... come back once you\'ve felled the Kraken, hero.'); return; }
    Game.confirm('Untangle every skill tree? All spent SP returns and your whole crew re-picks their paths.', () => {
      Progress.respecAll(Game.state); Progress.save(Game.state);
      if (window.SFX) SFX.play('levelup'); Game.toast('Kupo! Destinies unwound — spend your SP anew in the Skills menu (M).');
    });
  }
  Game.openRespec = openRespec;

  // ---------- dating (mermaids) ----------
  function openDating(key) { Game.datingOpen = true; pauseExplore(); Dating.start(key, () => { Game.datingOpen = false; Music.play(Game.mode === 'town' ? 'town' : 'island'); resumeExplore(); }); }
  Game.openDating = openDating;

  // ---------- pause menu ----------
  function openPause() {
    if (!HUD_MODES.includes(Game.mode)) return;
    if (Game.pauseOpen) return closePause();
    Game.pauseOpen = true; pauseExplore(); Progress.save(Game.state); renderObjective(); el('pause').classList.add('show');
  }
  function closePause() { Game.pauseOpen = false; el('pause').classList.remove('show'); resumeExplore(); }
  Game.openPause = openPause;

  // ---------- bestiary ----------
  function openBestiary() {
    Game.bestiaryOpen = true; el('pause').classList.remove('show'); el('bestiary').classList.add('show');
    renderBestiary();
  }
  function closeBestiary() { Game.bestiaryOpen = false; el('bestiary').classList.remove('show'); el('pause').classList.add('show'); }

  // ---------- options ----------
  function applySettings() {
    const s = Game.state && Game.state.settings; if (!s || !window.Music) return;
    if (Music.setMusicVolume) Music.setMusicVolume(s.music != null ? s.music : 0.85);
    if (Music.setSfxVolume) Music.setSfxVolume(s.sfx != null ? s.sfx : 1.0);
  }
  Game.applySettings = applySettings;

  // ---------- objective / Captain's Log ----------
  function storyProgress() {
    const s = Game.state, prog = s.prog || {}, MM = Data.MERMAIDS || {}, SB = Data.STORYBOARD || { spine: [], allies: [] };
    const mKeys = Object.keys(MM);
    const charmed = mKeys.filter(k => s.mermaids && s.mermaids[k] && s.mermaids[k].rel >= MM[k].threshold).length;
    const clearedDun = k => { const d = ALLY_DUN[k]; return !!(d && s.dungeons && (s.dungeons[d] || s.dungeons[d + '_boss'])); };
    const allies = (SB.allies || []).filter(clearedDun).length;   // legend-isles cleared (allies part ways after, so count the deed)
    const totalAllies = (SB.allies || []).length;
    const seen = Object.values(s.bestiary || {}).filter(b => b && b.seen).length;
    const totalE = Object.keys(Data.ENEMIES || {}).length;
    const cleared = Object.keys((s.flags || {})).some(f => /clear|Down|Fall|Join/.test(f)) || charmed > 0;
    return { prog, charmed, totalM: mKeys.length, allies, totalAllies, seen, totalE, cleared };
  }
  // walk the storyboard spine; the current chapter is the first one not yet complete
  function chapterDone(id, p) {
    switch (id) {
      case 'footing': return p.cleared || p.charmed > 0 || p.prog.krakenDown;
      case 'attune': return p.charmed >= p.totalM;
      case 'kraken': return !!p.prog.krakenDown;
      case 'legends': return p.allies >= p.totalAllies;
      case 'omega': return !!p.prog.finalWin;
      case 'mastery': return p.charmed >= p.totalM && p.seen >= p.totalE;
      default: return false;
    }
  }
  function currentObjective() {
    const p = storyProgress(), spine = (Data.STORYBOARD || {}).spine || [];
    let ch = spine.find(c => !chapterDone(c.id, p)) || spine[spine.length - 1] || {};
    // per-chapter live progress note
    let prog = '';
    if (ch.id === 'attune') prog = `💞 ${p.charmed}/${p.totalM} mermaids charmed`;
    else if (ch.id === 'legends') prog = `🤝 ${p.allies}/${p.totalAllies} heroes recruited · 💞 ${p.charmed}/${p.totalM} mermaids`;
    else if (ch.id === 'mastery') prog = `💞 ${p.charmed}/${p.totalM} mermaids · 📖 ${p.seen}/${p.totalE} bestiary`;
    return { act: ch.act, actName: ch.actName, title: ch.title, goal: ch.goal, thread: ch.thread, prog, charmed: p.charmed, totalM: p.totalM, seen: p.seen, totalE: p.totalE };
  }
  Game.currentObjective = currentObjective;
  function renderObjective() {
    const o = currentObjective(); const box = el('pauseObjective'); if (!box) return;
    box.innerHTML = `<div class="obj-act">Act ${o.act} · ${o.actName}</div>` +
      `<div class="obj-title">🎯 ${o.title}</div>` +
      `<div class="obj-detail">${o.goal}</div>` +
      `<div class="obj-why">${o.thread}</div>` +
      (o.prog ? `<div class="obj-stats">${o.prog}</div>` : '');
  }
  function openOptions() { Game.optionsOpen = true; el('pause').classList.remove('show'); el('options').classList.add('show'); renderOptions(); }
  function closeOptions() { Game.optionsOpen = false; el('options').classList.remove('show'); el('pause').classList.add('show'); }
  function renderOptions() {
    const s = Game.state.settings || (Game.state.settings = { music: 0.85, sfx: 1.0, battleSpeed: 1, difficulty: 'normal' });
    const pct = v => Math.round(v * 100);
    const speeds = [['0.5×', 0.5], ['1×', 1], ['1.5×', 1.5], ['2×', 2]];
    const diffs = [['Easy', 'easy'], ['Normal', 'normal'], ['Hard', 'hard'], ['Brutal', 'brutal']];
    el('optionsBody').innerHTML = `<div class="scr-head"><h2>⚙️ Options</h2><button class="pill ghost small" id="optClose">Back</button></div>
      <div class="opt-row"><label>🎵 Music<span id="optMusicVal">${pct(s.music)}%</span></label><input type="range" id="optMusic" min="0" max="100" value="${pct(s.music)}"></div>
      <div class="opt-row"><label>🔊 Sound FX<span id="optSfxVal">${pct(s.sfx)}%</span></label><input type="range" id="optSfx" min="0" max="100" value="${pct(s.sfx)}"></div>
      <div class="opt-row"><label>⏩ Battle speed</label><div class="opt-seg" id="optSpeed">${speeds.map(([l, v]) => `<button class="pill ${s.battleSpeed === v ? '' : 'ghost'} small" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="opt-row"><label>⚔️ Difficulty</label><div class="opt-seg" id="optDiff">${diffs.map(([l, v]) => `<button class="pill ${s.difficulty === v ? '' : 'ghost'} small" data-v="${v}">${l}</button>`).join('')}</div></div>
      <p class="scr-sub">Difficulty changes enemy HP & damage. Battle speed takes effect next battle.</p>`;
    const save = () => Progress.save(Game.state);
    el('optMusic').oninput = e => { s.music = e.target.value / 100; el('optMusicVal').textContent = e.target.value + '%'; if (window.Music && Music.setMusicVolume) Music.setMusicVolume(s.music); };
    el('optMusic').onchange = save;
    el('optSfx').oninput = e => { s.sfx = e.target.value / 100; el('optSfxVal').textContent = e.target.value + '%'; if (window.Music && Music.setSfxVolume) Music.setSfxVolume(s.sfx); };
    el('optSfx').onchange = () => { if (window.SFX) SFX.play('select'); save(); };
    el('optSpeed').querySelectorAll('button').forEach(b => b.onclick = () => { s.battleSpeed = parseFloat(b.dataset.v); save(); renderOptions(); });
    el('optDiff').querySelectorAll('button').forEach(b => b.onclick = () => { s.difficulty = b.dataset.v; save(); if (window.SFX) SFX.play('select'); renderOptions(); });
    el('optClose').onclick = closeOptions;
  }
  Game.openOptions = openOptions;
  function renderBestiary() {
    const best = Game.state.bestiary || {};
    const keys = Object.keys(Data.ENEMIES);
    const seenCount = keys.filter(k => best[k] && best[k].seen).length;
    const EI = Data.ELEMENT_INFO;
    const ELEMS = Object.keys(EI).filter(e => e !== 'physical');
    const affTags = (k, rec) => {
      const aff = (rec && rec.aff) || {}; const out = [];
      const rot = Data.ENEMIES[k] && Data.ENEMIES[k].rotate;
      if (rot && rot.length) out.push(`<span style="color:#fde047">⟳ shifting weakness</span>`);
      ELEMS.forEach(e => { const r = aff[e]; if (!r) return; const ei = EI[e]; if (!ei) return;
        if (r === 'weak') out.push(`<span style="color:#fca5a5">▲ ${ei.i}${ei.name}</span>`);
        else if (r === 'resist') out.push(`<span style="color:#9be7ff">▼ ${ei.i}${ei.name}</span>`);
        else if (r === 'absorb') out.push(`<span style="color:#6ee7b7">✚ ${ei.i}${ei.name}</span>`);
        else if (r === 'null') out.push(`<span style="color:#cbd5e1">○ ${ei.i}${ei.name}</span>`); });
      const tested = ELEMS.filter(e => aff[e]).length;
      const probe = `<span style="opacity:.65">tested ${tested}/${ELEMS.length} elements</span>`;
      return `<div class="best-aff">${out.length ? out.join('') : '<span style="opacity:.6">no affinities found yet</span>'} ${probe}</div>`;
    };
    let cards = '';
    keys.forEach(k => {
      const def = Data.ENEMIES[k]; const rec = best[k];
      if (!rec || !rec.seen) { cards += `<div class="best-card unknown"><div class="best-port-q">❓</div><div class="best-info"><b>? ? ?</b><br>Undiscovered</div></div>`; return; }
      const port = Portraits.has(k) ? Portraits.img(k, 'portrait') : `<div class="best-port-q">${def.boss ? '👑' : '👾'}</div>`;
      cards += `<div class="best-card">${port}<div class="best-info"><b>${def.name}</b>${def.boss ? ' <span style="color:#fca5a5">BOSS</span>' : ''}<br>HP ${def.hp} · slain ×${rec.slain || 0}${affTags(k, rec)}</div></div>`;
    });
    el('bestiaryBody').innerHTML = `<div class="scr-head"><h2>📖 Bestiary</h2><button class="pill ghost small" id="bestClose">Back</button></div>
      <p class="scr-sub">Discovered ${seenCount} / ${keys.length} creatures. ▲ weak · ▼ resists · ✚ absorbs · ○ immune</p>
      <div class="bestiary-grid">${cards}</div>`;
    el('bestClose').onclick = closeBestiary;
  }

  // ---------- map legend ----------
  function openLegend() {
    Game.legendOpen = true; el('pause').classList.remove('show'); el('legend').classList.add('show');
    const rows = [
      ['#8fd3f4', '🏘️ Town', 'Inns, item vendors, weapon &amp; seashell shops.'],
      ['#9be7ff', '🌀 Dungeon', 'Puzzles, treasure and monster-infested depths.'],
      ['#ffffff', '⚓ Dock', 'Return to your ship and set sail.'],
      ['#ffd166', '🐚 Shell Beach', 'Play the shell-hunting minigame for new materia.'],
      ['#ff9ec0', '🧜 Mermaid', 'Court an elemental mermaid to enchant your weapons.'],
      ['#ff5e5e', '⚔️ Boss', 'A major story battle awaits here.'],
      ['#b03050', '🦇 Roaming foe', 'Touch one to start a battle. Clear them for loot &amp; XP.'],
    ];
    el('legendBody').innerHTML = `<div class="scr-head"><h2>🗺️ Map Legend</h2><button class="pill ghost small" id="legClose">Back</button></div>
      <p class="scr-sub">What the markers on your minimap and in the world mean.</p>
      <div class="legend-list">${rows.map(r => `<div class="legend-row"><span class="legend-dot" style="background:${r[0]};color:${r[0]}"></span><span><b>${r[1]}</b> — ${r[2]}</span></div>`).join('')}</div>`;
    el('legClose').onclick = closeLegend;
  }
  function closeLegend() { Game.legendOpen = false; el('legend').classList.remove('show'); el('pause').classList.add('show'); }

  // ---------- quit to title ----------
  function quitToTitle() { Progress.save(Game.state); location.reload(); }

  // ---------- confirm ----------
  Game.confirm = function (text, onYes) {
    pauseExplore(); Game.confirmOpen = true; el('confirmText').textContent = text; el('confirm').classList.add('show');
    el('confirmYes').onclick = () => { Game.confirmOpen = false; el('confirm').classList.remove('show'); onYes(); };
    el('confirmNo').onclick = () => { Game.confirmOpen = false; el('confirm').classList.remove('show'); resumeExplore(); };
  };

  // ---------- endgame ally picker (Ruffy's strike team for the two-party finale) ----------
  const ALLY_DUN = { simon: 'vampire_keep', aladdin: 'genie_cave', violca: 'dragon_vale', mac: 'frost_station', sane: 'spirit_wood', marvyn: 'crash_site', quijano: 'mill_keep', lydia: 'neitherworld' };
  Game.chooseEndgameAllies = function (cb) {
    const st = Game.state;
    const cleared = k => { const d = ALLY_DUN[k]; return !!(st.dungeons[d] || st.dungeons[d + '_boss']); };
    const eligible = Object.keys(ALLY_DUN).filter(k => cleared(k) && st.party.find(p => p.key === k));
    pauseExplore(); Game.allyPickOpen = true;
    const body = el('allyPickBody'); const picks = [];
    const card = (key, locked) => {
      const p = st.party.find(x => x.key === key); const d = Progress.derived(p, st);
      const role = (Data.PARTY.find(x => x.key === key) || {}).role || '';
      const c = document.createElement('button'); c.className = 'ally-card' + (locked ? ' locked' : '');
      c.innerHTML = `<div class="ally-port">${(window.Portraits && Portraits.has(key)) ? Portraits.img(key) : ''}</div>` +
        `<div class="ally-name">${d.name}</div><div class="ally-role">${role}</div><div class="ally-lvl">Lv ${p.level}</div>` +
        (locked ? '<span class="ally-badge">LEADER</span>' : '');
      if (!locked) c.onclick = () => { const i = picks.indexOf(key); if (i >= 0) picks.splice(i, 1); else { if (picks.length >= 3) return; picks.push(key); } draw(); };
      return c;
    };
    function draw() {
      body.innerHTML = '';
      const h = document.createElement('div'); h.innerHTML = `<h2>⚓ Ruffy's Strike Team</h2><div class="sk-gold">Choose up to 3 champions you saved — they take the second wave. Ruffy always leads.</div>`; body.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'ally-grid';
      grid.appendChild(card('ruffy', true));
      if (eligible.length === 0) {
        const note = document.createElement('div'); note.style.cssText = 'grid-column:1/-1; color:rgba(255,255,255,0.62); padding:0.7rem; line-height:1.5;';
        note.textContent = 'You never finished a temporary-ally dungeon — so Ruffy stands with you alone. Just the two crews against the end of the world. He likes those odds.';
        grid.appendChild(note);
      } else eligible.forEach(k => {
        const c = card(k, false); const i = picks.indexOf(k);
        if (i >= 0) { c.classList.add('on'); const n = document.createElement('span'); n.className = 'ally-pick-num'; n.textContent = String(i + 1); c.appendChild(n); }
        else if (picks.length >= 3) c.classList.add('dim');
        grid.appendChild(c);
      });
      body.appendChild(grid);
      const foot = document.createElement('div'); foot.style.cssText = 'display:flex; justify-content:flex-end; margin-top:0.7rem;';
      const go = document.createElement('button'); go.className = 'pill'; go.textContent = picks.length ? `To the final battle (Ruffy + ${picks.length})` : 'To the final battle (Ruffy alone)';
      go.onclick = () => { Game.allyPickOpen = false; el('allyPick').classList.remove('show'); cb(['ruffy'].concat(picks)); };
      foot.appendChild(go); body.appendChild(foot);
    }
    draw(); el('allyPick').classList.add('show');
  };

  // pick TWO crews (3–4 each) for the Drowned Spire final trial — core members plus every
  // hero whose legend-isle you've cleared (temp allies are re-recruited when chosen)
  Game.chooseTwoParties = function (cb) {
    const st = Game.state;
    const clearedDun = k => { const d = ALLY_DUN[k]; return !!(st.dungeons[d] || st.dungeons[d + '_boss']); };
    const isTemp = k => !!(Data.PARTY.find(x => x.key === k) || {}).temporary;
    const avail = st.party.filter(p => p.recruited && !isTemp(p.key)).map(p => p.key)   // permanent core
      .concat(Object.keys(ALLY_DUN).filter(clearedDun))                                 // freed legend heroes
      .concat(st.party.find(p => p.key === 'ruffy' && p.recruited) ? ['ruffy'] : []);   // Ruffy if aboard
    pauseExplore(); Game.allyPickOpen = true;
    const body = el('allyPickBody'); const assign = {};
    const countA = () => avail.filter(k => assign[k] === 'A').length;
    const countB = () => avail.filter(k => assign[k] === 'B').length;
    const card = (key) => {
      const p = st.party.find(x => x.key === key); const d = Progress.derived(p, st);
      const role = (Data.PARTY.find(x => x.key === key) || {}).role || '';
      const c = document.createElement('button'); c.className = 'ally-card' + (assign[key] ? ' on' : '');
      c.innerHTML = `<div class="ally-port">${(window.Portraits && Portraits.has(key)) ? Portraits.img(key) : ''}</div>` +
        `<div class="ally-name">${d.name}</div><div class="ally-role">${role}</div><div class="ally-lvl">Lv ${p.level}</div>` +
        (assign[key] ? `<span class="ally-pick-num">${assign[key]}</span>` : '');
      c.onclick = () => {
        const cur = assign[key];
        if (cur === 'A') { if (countB() < 4) assign[key] = 'B'; else delete assign[key]; }
        else if (cur === 'B') { delete assign[key]; }
        else { if (countA() < 4) assign[key] = 'A'; else if (countB() < 4) assign[key] = 'B'; }
        if (window.SFX) SFX.play('select'); draw();
      };
      return c;
    };
    function draw() {
      body.innerHTML = ''; const a = countA(), b = countB();
      const h = document.createElement('div'); h.innerHTML = `<h2>🌊 Two Crews for the Drowned Spire</h2><div class="sk-gold">Tap a hero to assign them — first tap → <b>Crew A</b>, again → <b>Crew B</b>, again to clear. Each crew needs 3–4. Crew A braves the first branch, Crew B the second — then both crews converge on Selachoth and the Omega Tide.</div><div class="sk-gold">Crew A: ${a}/4 · Crew B: ${b}/4</div>`; body.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'ally-grid';
      avail.forEach(k => grid.appendChild(card(k))); body.appendChild(grid);
      const foot = document.createElement('div'); foot.style.cssText = 'display:flex; justify-content:flex-end; margin-top:0.7rem;';
      const ok = a >= 3 && a <= 4 && b >= 3 && b <= 4;
      const go = document.createElement('button'); go.className = 'pill' + (ok ? '' : ' ghost'); go.disabled = !ok;
      go.textContent = ok ? '🌊 Into the Drowned Spire' : 'Assign two crews of 3–4';
      go.onclick = () => { if (!ok) return; Game.allyPickOpen = false; el('allyPick').classList.remove('show'); cb(avail.filter(k => assign[k] === 'A'), avail.filter(k => assign[k] === 'B')); };
      foot.appendChild(go); body.appendChild(foot);
    }
    draw(); el('allyPick').classList.add('show');
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
    el('endText').innerHTML = 'Selachoth dissolves into seafoam and the Omega Tide ebbs at last, the grey horizon blushing gold. The two crews you forged from a world of broken legends sail home together — and the song of how you turned the tide will be sung on every shore.<br><br><b>Thanks for playing!</b> You can keep exploring, or return to the site.';
    el('end').classList.add('show'); Music.play('victory', 'island');
  };
  el('endContinue') && (el('endContinue').onclick = () => el('end').classList.remove('show'));

  // ---------- explore pause helpers ----------
  function pauseExplore() { const m = EXPLORE[Game.mode]; if (m) m().pause(); }
  function resumeExplore() { const m = EXPLORE[Game.mode]; if (m) m().resume(); }

  // ---------- input ----------
  const ACTION = new Set(['KeyF', 'Enter']); // interact / confirm (E freed for camera)
  const MOVE = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  function setupInput() {
    window.addEventListener('keydown', e => {
      if (MOVE.has(e.code) || ACTION.has(e.code) || e.code === 'Space') e.preventDefault();
      Input.keys.add(e.code);
      if (e.repeat) return;
      route(e.code);
    });
    window.addEventListener('keyup', e => Input.keys.delete(e.code));
    // tap-to-interact (mobile / mouse)
    Game.canvasTap = () => { if (Game.dialogueOpen) return Game._advanceDlg && Game._advanceDlg(); if (anyModal()) return; if (HUD_MODES.includes(Game.mode) && Game.active) Game.active.interact && Game.active.interact(); };
    document.addEventListener('pointerdown', e => { if (el('introSeq').classList.contains('show')) { if (Game._introFinish) Game._introFinish(); return; } if (e.target && e.target.id === 'renderCanvas') Game.canvasTap(); });
    el('btnSkills').onclick = openSkills;
    el('btnGear').onclick = openGear;
    el('btnParty').onclick = openParty;
    el('btnObjective').onclick = () => { const o = currentObjective(); Game.toast(`🎯 ${o.title} — ${o.goal}`); };
    if (window.Render) el('btnFx').textContent = Render.isHigh() ? '✨' : '▫️';
    el('btnFx').onclick = () => { const q = Render.toggle(); el('btnFx').textContent = q === 'high' ? '✨' : '▫️'; Game.toast('Graphics: ' + (q === 'high' ? 'High' : 'Low') + ' — applies when you next enter an area or battle.'); };
    el('btnMusic').onclick = () => { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; };
    el('btnPause') && (el('btnPause').onclick = openPause);
    el('pResume').onclick = closePause;
    el('pBestiary').onclick = openBestiary;
    el('pOptions').onclick = openOptions;
    el('pLegend').onclick = openLegend;
    el('pParty').onclick = () => { closePause(); openParty(); };
    el('pQuit').onclick = () => Game.confirm('Save and quit to the title screen?', quitToTitle);
    el('worldPrompt').onclick = () => { if (Game.active) Game.active.interact && Game.active.interact(); };
  }
  function anyModal() { return Game.skillsOpen || Game.gearOpen || Game.partyOpen || Game.shipyardOpen || Game.datingOpen || Game.shopOpen || Game.confirmOpen || Game.allyPickOpen || Game.pauseOpen || Game.bestiaryOpen || Game.legendOpen || el('shellHunt').classList.contains('show') || el('observatory').classList.contains('show') || el('arcade').classList.contains('show') || el('coliseum').classList.contains('show') || el('end').classList.contains('show'); }
  Game.blocking = function () { return Game.dialogueOpen || anyModal(); };
  function route(code) {
    if (el('introSeq').classList.contains('show')) { if (Game._introFinish) Game._introFinish(); return; }
    if (el('shellHunt').classList.contains('show')) return; // minigame handles its own input
    if (el('observatory').classList.contains('show')) { if (code === 'Escape') el('obsClose') && el('obsClose').click(); return; }
    if (el('arcade').classList.contains('show')) { if (code === 'Escape') { el('arcQuit') && el('arcQuit').click(); el('arcDone') && el('arcDone').click(); } else if (Arcade._key) Arcade._key(code); return; }
    if (el('coliseum').classList.contains('show')) { if (code === 'Escape') el('colClose') && el('colClose').click(); return; }
    if (Game.datingOpen) return; // dating handles its own buttons
    if (Game.mode === 'battle') { if (code === 'KeyP') { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; } else Battle.onKey(code); return; }
    if (Game.mode === 'shipbattle') { if (window.ShipBattle && ShipBattle.onKey) ShipBattle.onKey(code); return; }
    if (Game.skillsOpen) { if (code === 'Escape' || code === 'KeyM') closeSkills(); return; }
    if (Game.gearOpen) { if (code === 'Escape' || code === 'KeyG') closeGear(); return; }
    if (Game.partyOpen) { if (code === 'Escape' || code === 'KeyT') closeParty(); return; }
    if (Game.shipyardOpen) { if (code === 'Escape' || code === 'KeyC') closeShipyard(); return; }
    if (Game.confirmOpen) { if (code === 'Enter' || code === 'KeyF') el('confirmYes').click(); else if (code === 'Escape') el('confirmNo').click(); return; }
    if (Game.shopOpen) { if (code === 'Escape') closeShop(); return; }
    if (Game.bestiaryOpen) { if (code === 'Escape') closeBestiary(); return; }
    if (Game.optionsOpen) { if (code === 'Escape') closeOptions(); return; }
    if (Game.legendOpen) { if (code === 'Escape') closeLegend(); return; }
    if (Game.pauseOpen) { if (code === 'Escape') closePause(); else if (code === 'KeyB') openBestiary(); return; }
    if (Game.dialogueOpen) { if (ACTION.has(code) || code === 'Space') Game._advanceDlg && Game._advanceDlg(); return; }
    if (code === 'Escape') return openPause();
    if (code === 'KeyB') { openPause(); return openBestiary(); }
    if (code === 'KeyM') return openSkills();
    if (code === 'KeyG') return openGear();
    if (code === 'KeyT') return openParty();
    if (code === 'KeyC' && Game.mode === 'sea') return openShipyard();
    if (code === 'KeyP') { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; return; }
    if (code === 'Space' && Game.active && Game.active.attack) return Game.active.attack();
    if (ACTION.has(code) && Game.active && Game.active.interact) Game.active.interact();
  }

  Game.boot = boot;
  return Game;
})();

window.addEventListener('DOMContentLoaded', () => Game.boot());
