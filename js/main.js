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
    if (window.Portraits) el('startPortraits').innerHTML = ['pirate', 'swordsman', 'healer', 'mage', 'blader', 'dragoon'].map(k => Portraits.img(k, 'start-port')).join('');
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
    const intoWorld = () => { if (Game.state.location.place === 'sea') toSea(); else toIsland(Game.state.location.island || 'tidehaven', false); };
    if (fresh && !Game.state.flags.seenOpening) {
      playIntro(() => {
        Game.state.flags.seenOpening = true; Progress.save(Game.state);
        // the crawl sets the scene; now the heroes are introduced in a staged cinematic before we hand over control
        Game.cutscene(Data.STORY.opening, () => {
          intoWorld();
          // Ruffy is NOT in the crew yet — he chases you down at sea later and duels his way in.
          Game.toast('WASD move · Q/E rotate camera · F interact · Space swing for a first strike!');
        });
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
    Game.state.location.place = 'island'; Game.state.location.island = key;
    if (fromSea) { const s = Data.ISLANDS[key]; Game.state.location.x = s.spawn.x; Game.state.location.z = s.spawn.z; }
    const sc = World.enter(key); Game.scene = sc; setMode('island'); Music.play('island'); Progress.save(Game.state);
  }
  function resumeIsland() { const sc = World.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('island'); World.resume(); World.focus(); Music.play('island'); }
  function toSea() { if (Game.mode === 'island') World.pause(); Game.state.location.place = 'sea'; const sc = Sea.enter(); Game.scene = sc; setMode('sea'); Music.play('sea'); Progress.save(Game.state); }
  function resumeSea() { const sc = Sea.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('sea'); Sea.resume(); Sea.focus(); Music.play('sea'); }
  function enterTown(key) { World.pause(); const sc = Town.enter(key); Game.scene = sc; setMode('town'); Progress.save(Game.state); }
  function toDungeon(key) { World.pause(); const sc = Dungeon.enter(key); Game.scene = sc; setMode('dungeon'); Progress.save(Game.state); }
  function resumeDungeon() { const sc = Dungeon.getScene(); if (!sc) return; Game.dialogueOpen = false; Game.scene = sc; setMode('dungeon'); Dungeon.resume(); Music.play('dungeon'); }
  Game.toIsland = toIsland; Game.resumeIsland = resumeIsland; Game.toSea = toSea; Game.resumeSea = resumeSea; Game.enterTown = enterTown; Game.toDungeon = toDungeon; Game.resumeDungeon = resumeDungeon;

  // ---------- battle transition ----------
  function transition(cb) {
    const tEl = el('transition'); tEl.classList.remove('show'); void tEl.offsetWidth; tEl.classList.add('show');
    if (window.SFX) SFX.play('confirm');
    setTimeout(cb, 360);
    setTimeout(() => tEl.classList.remove('show'), 800);
  }
  Game.transition = transition;

  // ---------- battle bridge ----------
  Game.musicForReturn = () => (Game.mode === 'sea' || Game.mode === 'shipbattle') ? 'sea' : Game.mode === 'town' ? 'town' : Game.mode === 'dungeon' ? 'dungeon' : 'island';
  Game.startBattle = function (keys, opts, onEnd) {
    Music.play((opts && opts.music) || (opts && opts.boss ? (Music.bossTheme ? Music.bossTheme() : 'boss') : (Music.battleTheme ? Music.battleTheme() : 'battle')));
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
      html += `<div class="hud-m${hp<=0?' ko':''}">${Portraits.img(p.key, 'hud-port')}<div class="hud-info"><div class="hud-row"><span>${d.name}</span><span class="hud-lv">Lv${p.level}</span></div>
        <div class="hud-bar php"><i style="width:${hp/d.maxhp*100}%"></i></div>
        <div class="hud-bar mp"><i style="width:${mp/d.maxmp*100}%"></i></div></div></div>`;
    });
    wrap.innerHTML = html;
    el('hudGold').innerHTML = '⛃ ' + Game.state.gold + ' &nbsp; 🦪 ' + (Game.state.pearls || 0);
  };

  // ---------- dialogue ----------
  const NAME2PORT = { 'Capt. Redbeard': 'pirate', 'Lance Strider': 'swordsman', 'Marina': 'healer', 'Pip': 'mage', 'Quint': 'dragoon', 'Selachoth': 'selachoth', 'Ruffy': 'ruffy', 'Simon': 'simon', 'Count Saltorre': 'vampire', 'Gilgamuck': 'drifter',
    'Aladdin': 'aladdin', 'Jafira': 'genie', 'Violca': 'violca', 'Vyrmithrax': 'skydragon',
    'Mac': 'mac', 'The Thing': 'thething', 'Sané': 'sane', 'The Forest God': 'forestgod',
    'Marvyn': 'marvyn', 'Vogon Constructor': 'vogon', 'Quijano': 'quijano', 'The Giant (a windmill)': 'windmill',
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
  Game.cutscene = function (beats, onDone) {
    if (window.Cutscene && beats.some(b => Game.cutsceneActorKey(b.name))) Cutscene.play(beats, onDone);
    else lightweightCutscene(beats, onDone);
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
    Game.pauseOpen = true; pauseExplore(); Progress.save(Game.state); el('pause').classList.add('show');
  }
  function closePause() { Game.pauseOpen = false; el('pause').classList.remove('show'); resumeExplore(); }
  Game.openPause = openPause;

  // ---------- bestiary ----------
  function openBestiary() {
    Game.bestiaryOpen = true; el('pause').classList.remove('show'); el('bestiary').classList.add('show');
    renderBestiary();
  }
  function closeBestiary() { Game.bestiaryOpen = false; el('bestiary').classList.remove('show'); el('pause').classList.add('show'); }
  function renderBestiary() {
    const best = Game.state.bestiary || {};
    const keys = Object.keys(Data.ENEMIES);
    const seenCount = keys.filter(k => best[k] && best[k].seen).length;
    const EI = Data.ELEMENT_INFO;
    const affTags = (k) => {
      const a = Data.AFFINITIES[k] || {}; const out = [];
      const rot = Data.ENEMIES[k] && Data.ENEMIES[k].rotate;
      if (rot && rot.length) out.push(`<span style="color:#fde047">⟳ shifting weakness: ${rot.map(e => EI[e] ? EI[e].i + EI[e].name : e).join(' → ')}</span>`);
      else (a.weak || []).forEach(e => out.push(`<span style="color:#fca5a5">▲ ${EI[e] ? EI[e].i + EI[e].name : e}</span>`));
      (a.resist || []).forEach(e => out.push(`<span style="color:#9be7ff">▼ ${EI[e] ? EI[e].i + EI[e].name : e}</span>`));
      (a.absorb || []).forEach(e => out.push(`<span style="color:#6ee7b7">✚ ${EI[e] ? EI[e].i + EI[e].name : e}</span>`));
      (a.nullify || []).forEach(e => out.push(`<span style="color:#cbd5e1">○ ${EI[e] ? EI[e].i + EI[e].name : e}</span>`));
      return out.length ? `<div class="best-aff">${out.join('')}</div>` : '<div class="best-aff"><span>no known affinities</span></div>';
    };
    let cards = '';
    keys.forEach(k => {
      const def = Data.ENEMIES[k]; const rec = best[k];
      if (!rec || !rec.seen) { cards += `<div class="best-card unknown"><div class="best-port-q">❓</div><div class="best-info"><b>? ? ?</b><br>Undiscovered</div></div>`; return; }
      const port = Portraits.has(k) ? Portraits.img(k, 'portrait') : `<div class="best-port-q">${def.boss ? '👑' : '👾'}</div>`;
      cards += `<div class="best-card">${port}<div class="best-info"><b>${def.name}</b>${def.boss ? ' <span style="color:#fca5a5">BOSS</span>' : ''}<br>HP ${def.hp} · slain ×${rec.slain || 0}${affTags(k)}</div></div>`;
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
    if (window.Render) el('btnFx').textContent = Render.isHigh() ? '✨' : '▫️';
    el('btnFx').onclick = () => { const q = Render.toggle(); el('btnFx').textContent = q === 'high' ? '✨' : '▫️'; Game.toast('Graphics: ' + (q === 'high' ? 'High' : 'Low') + ' — applies when you next enter an area or battle.'); };
    el('btnMusic').onclick = () => { const m = Music.toggle(); el('btnMusic').textContent = m ? '🔇' : '🔊'; };
    el('btnPause') && (el('btnPause').onclick = openPause);
    el('pResume').onclick = closePause;
    el('pBestiary').onclick = openBestiary;
    el('pLegend').onclick = openLegend;
    el('pParty').onclick = () => { closePause(); openParty(); };
    el('pQuit').onclick = () => Game.confirm('Save and quit to the title screen?', quitToTitle);
    el('worldPrompt').onclick = () => { if (Game.active) Game.active.interact && Game.active.interact(); };
  }
  function anyModal() { return Game.skillsOpen || Game.gearOpen || Game.partyOpen || Game.shipyardOpen || Game.datingOpen || Game.shopOpen || Game.confirmOpen || Game.pauseOpen || Game.bestiaryOpen || Game.legendOpen || el('shellHunt').classList.contains('show') || el('observatory').classList.contains('show') || el('arcade').classList.contains('show') || el('coliseum').classList.contains('show') || el('end').classList.contains('show'); }
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
