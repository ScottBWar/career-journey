// =====================================================================
//  World — the walkable overworld map: terrain, towns, roaming enemies,
//  the Kraken's lair, and player movement. Touch a roamer to battle.
// =====================================================================
window.World = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine;
  let roamers = [], gates = [], idlers = [], built = false, paused = false, locked = false;
  let nearGate = null, t = 0;
  const SPEED = 9;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }
  const radiusLimit = () => Data.WORLD.size * 0.5 - 2;

  function build() {
    engine = Game.engine;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.6, 0.8, 0.95); scene.fogDensity = 0.006;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.95; hemi.groundColor = new Color3(0.4, 0.45, 0.35);
    const sun = new BABYLON.DirectionalLight('s', new V3(-0.5, -1, 0.4), scene); sun.intensity = 1.0;

    const W = Data.WORLD;
    const water = MB.CreateGround('water', { width: 260, height: 260 }, scene); water.material = M('water', W.water, { spec: 0.6 }); water.position.y = -0.3;
    const sand = MB.CreateDisc('sand', { radius: W.size * 0.6, tessellation: 48 }, scene); sand.rotation.x = Math.PI/2; sand.position.y = -0.04; sand.material = M('sand', W.sand);
    const grass = MB.CreateDisc('grass', { radius: W.size * 0.54, tessellation: 48 }, scene); grass.rotation.x = Math.PI/2; grass.position.y = 0; grass.material = M('grass', W.ground);

    // decor scattered on grass
    const place = (b, n, rad) => { for (let i = 0; i < n; i++) { const a = Math.random()*Math.PI*2, r = 4 + Math.random()*(rad-4); const o = b(); o.node.position.set(Math.cos(a)*r, 0, Math.sin(a)*r); const sc = 0.8 + Math.random()*0.6; o.node.scaling.setAll(sc); if (o.idle) idlers.push(o); } };
    place(() => Models.tree(), W.decor.trees, W.size*0.45);
    place(() => Models.palm(), W.decor.palms, W.size*0.5);
    place(() => Models.rock(), W.decor.rocks, W.size*0.5);

    // towns
    W.towns.forEach(tn => {
      const def = Data.TOWNS[tn.key];
      const cluster = new BABYLON.TransformNode('town_' + tn.key, scene); cluster.position.set(tn.x, 0, tn.z);
      const h = Models.house({ roof: '#a0492f' }); h.node.parent = cluster; h.node.position.set(-2.5, 0, 1);
      const h2 = Models.house({ roof: '#3a6a8a', wall: '#dcc89a' }); h2.node.parent = cluster; h2.node.position.set(2.5, 0, 1);
      const s = Models.sign(def.name); s.node.parent = cluster; s.node.position.set(0, 0, -2.2);
      const p = Models.portal(tn.color); p.node.parent = cluster; p.node.position.set(0, 0, -2.2); p.node._baseY = 0; idlers.push(p);
      gates.push({ kind: 'town', key: tn.key, name: def.name, pos: new V3(tn.x, 0, tn.z - 2.2), r: 3 });
    });

    // boss lair — Kraken's Lair until the Kraken falls, then Selachoth's Spire
    const bossDef = W.boss;
    const stageLabel = Game.state.world.finalWin ? 'A Calmed Spire' : Game.state.world.krakenDown ? "Selachoth's Spire" : "Kraken's Lair";
    const stageColor = Game.state.world.finalWin ? '#8fd3f4' : Game.state.world.krakenDown ? '#c0c8ff' : bossDef.color;
    const bp = Models.portal(stageColor); bp.node.position.set(bossDef.x, 0, bossDef.z); bp.node._baseY = 0; idlers.push(bp);
    const bs = Models.sign(stageLabel); bs.node.position.set(bossDef.x, 0, bossDef.z - 2.4);
    const skull = Models.rock(); skull.node.position.set(bossDef.x, 0, bossDef.z + 2); skull.node.scaling.setAll(2.2);
    gates.push({ kind: 'boss', name: stageLabel, pos: new V3(bossDef.x, 0, bossDef.z), r: 3 });

    // roaming enemies
    W.encounters.forEach((enc, idx) => {
      if (Game.state.world.cleared['e' + idx]) return;
      const colorByPool = { gull: '#cdd6e0', jelly: '#d98cff', shark: '#6f7f8c', crab: '#e0573a', octo: '#a05bd6', golem: '#d9b779' };
      const ro = Models.roamer(colorByPool[enc.pool[0]] || '#ff6b6b');
      ro.node.position.set(enc.x, 0, enc.z); ro.node._ph = idx;
      roamers.push({ node: ro.node, idle: ro.idle, enc, idx, home: new V3(enc.x, 0, enc.z), ang: Math.random()*Math.PI*2, spd: 2 + Math.random()*1.5 });
      idlers.push(ro);
    });

    // player avatar
    const hero = Models.hero(); player = hero.node;
    player.position.set(Game.state.world.x, 0, Game.state.world.z);
    cam = new BABYLON.UniversalCamera('wcam', new V3(0, 18, -16), scene); cam.fov = 0.8;

    scene.onBeforeRenderObservable.add(update);
    built = true;
    return scene;
  }

  function update() {
    if (paused) return;
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    // movement
    let mx = 0, mz = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz += 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz -= 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      player.position.x += mx * SPEED * dt; player.position.z += mz * SPEED * dt;
      const rad = radiusLimit(); const d = Math.hypot(player.position.x, player.position.z);
      if (d > rad) { player.position.x *= rad/d; player.position.z *= rad/d; }
      player.rotation.y = Math.atan2(mx, mz);
      player.position.y = Math.abs(Math.sin(t * 10)) * 0.12; // little walk bob
    } else { player.position.y = 0; }
    Game.state.world.x = player.position.x; Game.state.world.z = player.position.z;

    // idle anims
    idlers.forEach(o => o.idle && o.idle(t));

    // roamers wander + collision
    for (const r of roamers) {
      if (!r.node.isEnabled()) continue;
      r.node.position.x += Math.sin(r.ang) * r.spd * dt; r.node.position.z += Math.cos(r.ang) * r.spd * dt;
      if (V3.Distance(r.node.position, r.home) > 4) r.ang = Math.atan2(r.home.x - r.node.position.x, r.home.z - r.node.position.z) + (Math.random()-0.5);
      if (Math.random() < 0.01) r.ang += (Math.random()-0.5);
      r.node.rotation.y = r.ang;
      if (!locked && V3.Distance(r.node.position, player.position) < 1.7) { startRoamerBattle(r); return; }
    }

    // gate proximity
    nearGate = null;
    for (const g of gates) { if (V3.Distance(player.position, g.pos) < g.r) { nearGate = g; break; } }
    const prompt = document.getElementById('worldPrompt');
    if (nearGate) {
      let label;
      if (nearGate.kind === 'town') label = `[E / Tap] Enter ${nearGate.name}`;
      else if (Game.state.world.finalWin) label = '[E / Tap] The spire is silent';
      else if (Game.state.world.krakenDown) label = '[E / Tap] Confront Selachoth';
      else label = '[E / Tap] Challenge the Kraken';
      prompt.textContent = label; prompt.classList.add('show');
    } else prompt.classList.remove('show');

    // camera follow
    cam.position.set(player.position.x, 18, player.position.z - 16);
    cam.setTarget(player.position.add(new V3(0, 1, 2)));

    Game.updateHUD();
  }

  function startRoamerBattle(r) {
    locked = true; paused = true;
    const keys = Data.randomEncounter(r.enc);
    Music.play('battle');
    Game.startBattle(keys, {}, (res) => {
      if (res.won) { Game.state.world.cleared['e' + r.idx] = true; r.node.setEnabled(false); Progress.save(Game.state); }
      else { // bounce player back toward spawn so they aren't stuck on the roamer
        const dir = player.position.subtract(r.node.position); if (dir.length() < 0.1) dir.set(0,0,-1); dir.normalize();
        player.position.addInPlace(dir.scale(4));
      }
      paused = false; locked = false; Game.toWorld();
    });
  }

  function fightBoss(enemies, onWin) {
    locked = true; paused = true; Music.play('battle');
    Game.startBattle(enemies, { boss: true }, (res) => {
      paused = false; locked = false; Game.toWorld();
      if (res.won) onWin();
      else { player.position.z -= 4; Game.state.world.x = player.position.x; Game.state.world.z = player.position.z; }
    });
  }
  function interact() {
    if (paused || locked || !nearGate) return;
    if (nearGate.kind === 'town') { Game.enterTown(nearGate.key); return; }
    // boss gate
    if (Game.state.world.finalWin) { Game.toast('Selachoth is no more. The tide is yours.'); return; }
    if (!Game.state.world.krakenDown) {
      Game.confirm('Enter the Maw and challenge the KRAKEN, guardian of the spire?', () => {
        fightBoss(['kraken'], () => {
          Game.state.world.krakenDown = true; Progress.save(Game.state);
          Game.startCutscene('krakenFall', () => Game.toast('The spire glows cold. Return to confront Selachoth.'));
        });
      });
    } else {
      // confront Selachoth: pre-fight cutscene, then the final battle
      Game.startCutscene('selachothPre', () => {
        fightBoss(['selachoth'], () => {
          Game.state.world.finalWin = true; Progress.save(Game.state);
          Game.startCutscene('selachothFall', () => Game.finalEnding());
        });
      });
    }
  }

  function enter() {
    if (!built) build();
    paused = false; locked = false;
    if (player) player.position.set(Game.state.world.x, 0, Game.state.world.z);
    Game.active = { interact };
    return scene;
  }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene, build };
})();
