// =====================================================================
//  World — a single walkable ISLAND overworld (rebuilt per island).
//  Towns, a dungeon, roaming battles, and a dock back to the ship.
// =====================================================================
window.World = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine, def, key;
  let roamers = [], gates = [], idlers = [], paused = false, locked = false, nearGate = null, t = 0;
  const SPEED = 9;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }
  const rlim = () => def.size * 0.5 - 2;

  function build(islandKey) {
    key = islandKey; def = Data.ISLANDS[islandKey]; engine = Game.engine;
    if (scene) scene.dispose();
    roamers = []; gates = []; idlers = []; nearGate = null; t = 0; paused = false; locked = false;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.6, 0.8, 0.95); scene.fogDensity = 0.006;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.95; hemi.groundColor = new Color3(0.4, 0.45, 0.35);
    const sun = new BABYLON.DirectionalLight('s', new V3(-0.5, -1, 0.4), scene); sun.intensity = 1.0;

    const water = MB.CreateGround('water', { width: 280, height: 280 }, scene); water.material = M('water', def.water, { spec: 0.6 }); water.position.y = -0.3;
    const sand = MB.CreateDisc('sand', { radius: def.size * 0.6, tessellation: 48 }, scene); sand.rotation.x = Math.PI/2; sand.position.y = -0.04; sand.material = M('sand', def.sand);
    const grass = MB.CreateDisc('grass', { radius: def.size * 0.54, tessellation: 48 }, scene); grass.rotation.x = Math.PI/2; grass.material = M('grass', def.ground);

    const place = (b, n, rad) => { for (let i = 0; i < n; i++) { const a = Math.random()*Math.PI*2, r = 5 + Math.random()*(rad-5); const o = b(); o.node.position.set(Math.cos(a)*r, 0, Math.sin(a)*r); o.node.scaling.setAll(0.8 + Math.random()*0.6); if (o.idle) idlers.push(o); } };
    place(() => Models.tree(), def.decor.trees, def.size*0.45);
    place(() => Models.palm(), def.decor.palms, def.size*0.5);
    place(() => Models.rock(), def.decor.rocks, def.size*0.5);

    // dock back to ship
    const dockMark = Models.portal('#8fd3f4'); dockMark.node.position.set(def.dock.x, 0, def.dock.z); dockMark.node._baseY = 0; idlers.push(dockMark);
    const dockSign = Models.sign('To Ship'); dockSign.node.position.set(def.dock.x, 0, def.dock.z - 1.8);
    // a little jetty
    const jetty = MB.CreateBox('jetty', { width: 2, height: 0.2, depth: 4 }, scene); jetty.material = M('jetty', '#7a5230'); jetty.position.set(def.dock.x, 0.05, def.dock.z - 3.5);
    gates.push({ kind: 'dock', name: 'the ship', pos: new V3(def.dock.x, 0, def.dock.z), r: 3 });

    // town
    if (def.town) {
      const td = Data.TOWNS[def.town.key]; const cluster = new BABYLON.TransformNode('town', scene); cluster.position.set(def.town.x, 0, def.town.z);
      const h = Models.house({ roof: '#a0492f' }); h.node.parent = cluster; h.node.position.set(-2.5, 0, 1);
      const h2 = Models.house({ roof: '#3a6a8a', wall: '#dcc89a' }); h2.node.parent = cluster; h2.node.position.set(2.5, 0, 1);
      const s = Models.sign(td.name); s.node.parent = cluster; s.node.position.set(0, 0, -2.2);
      const p = Models.portal(def.town.color); p.node.parent = cluster; p.node.position.set(0, 0, -2.2); p.node._baseY = 0; idlers.push(p);
      gates.push({ kind: 'town', key: def.town.key, name: td.name, pos: new V3(def.town.x, 0, def.town.z - 2.2), r: 3 });
    }

    // dungeon
    if (def.dungeon) {
      const dd = Data.DUNGEONS[def.dungeon.key]; const solved = !!Game.state.dungeons[def.dungeon.key];
      const arch = MB.CreateTorus('arch', { diameter: 3.2, thickness: 0.5, tessellation: 6 }, scene); arch.material = M('arch', '#5a5266'); arch.position.set(def.dungeon.x, 1.4, def.dungeon.z); arch.scaling.y = 1.2;
      const p = Models.portal(solved ? '#6ee7b7' : def.dungeon.color); p.node.position.set(def.dungeon.x, 0, def.dungeon.z); p.node._baseY = 0; idlers.push(p);
      const s = Models.sign(dd.name + (solved ? ' ✓' : '')); s.node.position.set(def.dungeon.x, 0, def.dungeon.z - 2.0);
      gates.push({ kind: 'dungeon', key: def.dungeon.key, name: dd.name, pos: new V3(def.dungeon.x, 0, def.dungeon.z), r: 3, solved });
    }

    // shell cove (minigame)
    if (def.shells) {
      const cove = Models.portal('#ffd166'); cove.node.position.set(def.shells.x, 0, def.shells.z); cove.node._baseY = 0; idlers.push(cove);
      const cs = Models.sign('Shell Cove'); cs.node.position.set(def.shells.x, 0, def.shells.z - 1.8);
      for (let i = 0; i < 3; i++) { const sh = Models.crystal(['#ffd166','#ff9eb0','#9be7ff'][i]); sh.node.position.set(def.shells.x - 2 + i*2, 0, def.shells.z + 1.5); sh.node.scaling.setAll(0.4); idlers.push(sh); }
      gates.push({ kind: 'shells', name: 'Shell Cove', pos: new V3(def.shells.x, 0, def.shells.z), r: 3 });
    }

    // boss lair (spire)
    if (def.boss) {
      const stage = Game.state.prog.finalWin ? 'A Calmed Spire' : Game.state.prog.krakenDown ? "Selachoth's Spire" : "Kraken's Lair";
      const color = Game.state.prog.finalWin ? '#8fd3f4' : Game.state.prog.krakenDown ? '#c0c8ff' : def.boss.color;
      const p = Models.portal(color); p.node.position.set(def.boss.x, 0, def.boss.z); p.node._baseY = 0; idlers.push(p);
      const spire = MB.CreateCylinder('spire', { height: 9, diameterTop: 0.6, diameterBottom: 3, tessellation: 6 }, scene); spire.material = M('spire', '#2a2438'); spire.position.set(def.boss.x, 4.5, def.boss.z + 3);
      const s = Models.sign(stage); s.node.position.set(def.boss.x, 0, def.boss.z - 2.2);
      gates.push({ kind: 'boss', name: stage, pos: new V3(def.boss.x, 0, def.boss.z), r: 3 });
    }

    // roamers
    const cleared = Game.state.islands[key].cleared;
    def.encounters.forEach((enc, idx) => {
      if (cleared['e' + idx]) return;
      const colorByPool = { gull: '#cdd6e0', jelly: '#d98cff', shark: '#6f7f8c', crab: '#e0573a', octo: '#a05bd6', golem: '#d9b779' };
      const ro = Models.roamer(colorByPool[enc.pool[0]] || '#ff6b6b'); ro.node.position.set(enc.x, 0, enc.z); ro.node._ph = idx;
      roamers.push({ node: ro.node, idle: ro.idle, enc, idx, home: new V3(enc.x, 0, enc.z), ang: Math.random()*Math.PI*2, spd: 2 + Math.random()*1.5 });
      idlers.push(ro);
    });

    // player avatar = the active party leader
    const leaderKey = Game.state.active[0] || 'pirate'; const leaderModel = Progress.def(leaderKey).model;
    const hero = Models[leaderModel] ? Models[leaderModel]() : Models.hero(); player = hero.node;
    player.position.set(Game.state.location.x, 0, Game.state.location.z);
    cam = new BABYLON.UniversalCamera('wcam', new V3(0, 18, -16), scene); cam.fov = 0.8;

    if (window.Render) Render.setup(scene, cam, { skyTop: '#234a86', skyHorizon: '#cfe9f5', sun });
    scene.onBeforeRenderObservable.add(update);
    return scene;
  }

  function update() {
    if (paused) return;
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    let mx = 0, mz = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz += 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz -= 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      player.position.x += mx*SPEED*dt; player.position.z += mz*SPEED*dt;
      const rad = rlim(), d = Math.hypot(player.position.x, player.position.z);
      if (d > rad) { player.position.x *= rad/d; player.position.z *= rad/d; }
      player.rotation.y = Math.atan2(mx, mz); player.position.y = Math.abs(Math.sin(t*10))*0.12;
    } else player.position.y = 0;
    Game.state.location.x = player.position.x; Game.state.location.z = player.position.z;

    idlers.forEach(o => o.idle && o.idle(t));

    for (const r of roamers) {
      if (!r.node.isEnabled()) continue;
      r.node.position.x += Math.sin(r.ang)*r.spd*dt; r.node.position.z += Math.cos(r.ang)*r.spd*dt;
      if (V3.Distance(r.node.position, r.home) > 4) r.ang = Math.atan2(r.home.x - r.node.position.x, r.home.z - r.node.position.z) + (Math.random()-0.5);
      if (Math.random() < 0.01) r.ang += (Math.random()-0.5);
      r.node.rotation.y = r.ang;
      if (!locked && V3.Distance(r.node.position, player.position) < 1.7) { startRoamerBattle(r); return; }
    }

    nearGate = null;
    for (const g of gates) { if (V3.Distance(player.position, g.pos) < g.r) { nearGate = g; break; } }
    const prompt = document.getElementById('worldPrompt');
    if (nearGate) {
      let label;
      if (nearGate.kind === 'town') label = `[E / Tap] Enter ${nearGate.name}`;
      else if (nearGate.kind === 'dungeon') label = `[E / Tap] Enter ${nearGate.name}${nearGate.solved ? ' (cleared)' : ''}`;
      else if (nearGate.kind === 'dock') label = '[E / Tap] Board the ship';
      else if (nearGate.kind === 'shells') label = '[E / Tap] Hunt for shells';
      else if (nearGate.kind === 'boss') label = Game.state.prog.finalWin ? '[E / Tap] The spire is silent' : Game.state.prog.krakenDown ? '[E / Tap] Confront Selachoth' : '[E / Tap] Challenge the Kraken';
      prompt.textContent = label; prompt.classList.add('show');
    } else prompt.classList.remove('show');

    cam.position.set(player.position.x, 18, player.position.z - 16);
    cam.setTarget(player.position.add(new V3(0, 1, 2)));
    Game.updateHUD();
  }

  function startRoamerBattle(r) {
    locked = true; paused = true; Music.play('battle');
    Game.startBattle(Data.randomEncounter(r.enc), {}, (res) => {
      if (res.won) { Game.state.islands[key].cleared['e' + r.idx] = true; r.node.setEnabled(false); Progress.save(Game.state); }
      else { const dir = player.position.subtract(r.node.position); if (dir.length() < 0.1) dir.set(0,0,-1); dir.normalize(); player.position.addInPlace(dir.scale(4)); Game.state.location.x = player.position.x; Game.state.location.z = player.position.z; }
      paused = false; locked = false; Game.resumeIsland();
    });
  }

  function fightBoss(enemies, onWin) {
    locked = true; paused = true; Music.play('battle');
    Game.startBattle(enemies, { boss: true }, (res) => {
      paused = false; locked = false; Game.resumeIsland();
      if (res.won) onWin(); else { player.position.z -= 4; Game.state.location.x = player.position.x; Game.state.location.z = player.position.z; }
    });
  }

  function interact() {
    if (paused || locked || !nearGate) return;
    const g = nearGate;
    if (g.kind === 'town') return Game.enterTown(g.key);
    if (g.kind === 'dungeon') return Game.toDungeon(g.key);
    if (g.kind === 'dock') return Game.toSea();
    if (g.kind === 'shells') return Game.openShellHunt();
    if (g.kind === 'boss') {
      if (Game.state.prog.finalWin) return Game.toast('Selachoth is no more. The tide is yours.');
      if (!Game.state.prog.krakenDown) {
        Game.confirm('Enter the Maw and challenge the KRAKEN, guardian of the spire?', () => fightBoss(['kraken'], () => { Game.state.prog.krakenDown = true; Progress.save(Game.state); Game.startCutscene('krakenFall', () => Game.toast('The spire glows cold. Return to confront Selachoth.')); }));
      } else {
        Game.startCutscene('selachothPre', () => fightBoss(['selachoth'], () => { Game.state.prog.finalWin = true; Progress.save(Game.state); Game.startCutscene('selachothFall', () => Game.finalEnding()); }));
      }
    }
  }

  function enter(islandKey) { build(islandKey); Game.active = { interact }; return scene; }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene, currentKey: () => key };
})();
