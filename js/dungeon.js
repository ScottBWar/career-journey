// =====================================================================
//  Dungeon — a small room with a crystal-order puzzle. Read the riddle on
//  the plaque, touch the crystals in the right order to open the vault,
//  loot the chest, and take the exit back to the island.
// =====================================================================
window.Dungeon = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine, def, key;
  let crystals = [], gate, chest, idlers = [], targets = [], paused = false, t = 0, camYaw = 0;
  let step = 0, solvedPuzzle = false, chestLooted = false, nearTarget = null;
  let mobs = [], mobDefeated = {}, bossDefeated = false, busy = false;
  const SPEED = 8;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function build(dungeonKey) {
    key = dungeonKey; def = Data.DUNGEONS[dungeonKey]; engine = Game.engine;
    if (scene) scene.dispose();
    crystals = []; idlers = []; targets = []; mobs = []; nearTarget = null; t = 0; step = 0; paused = false; busy = false;
    const cleared = !!Game.state.dungeons[key];
    bossDefeated = !!Game.state.dungeons[key + '_boss'];
    mobDefeated = Game.state.dungeons[key + '_mobs'] || (Game.state.dungeons[key + '_mobs'] = {});
    solvedPuzzle = def.vampire ? bossDefeated : cleared; chestLooted = cleared;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = Color3.FromHexString(def.wall); scene.fogDensity = 0.02;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.2), scene); hemi.intensity = 0.55; hemi.groundColor = new Color3(0.1, 0.1, 0.15);
    const pt = new BABYLON.PointLight('p', new V3(0, 8, 0), scene); pt.intensity = 0.7;

    const floor = MB.CreateGround('floor', { width: 26, height: 34 }, scene); floor.material = M('floor', def.ground); floor.position.z = 1;
    // walls
    const wallMat = M('wall', def.wall);
    const wall = (w, h, d, x, y, z) => { const b = MB.CreateBox('w', { width: w, height: h, depth: d }, scene); b.material = wallMat; b.position.set(x, y, z); };
    wall(26, 5, 1, 0, 2.5, -16); wall(26, 5, 1, 0, 2.5, 18); wall(1, 5, 34, -13, 2.5, 1); wall(1, 5, 34, 13, 2.5, 1);
    for (let i = 0; i < 4; i++) { const p = Models.pillar(); p.node.position.set(i % 2 ? 9 : -9, 0, -6 + Math.floor(i/2)*12); }

    // riddle plaque
    const sign = Models.sign('Riddle ▼'); sign.node.position.set(0, 0, -6);
    // crystals
    def.crystals.forEach((c, i) => {
      const cr = Models.crystal(c.color); cr.node.position.set(c.x, 0, c.z); idlers.push(cr);
      const baseEmis = cr.gem.material.emissiveColor.clone();
      crystals.push({ idx: i, node: cr.node, gem: cr.gem, pos: new V3(c.x, 0, c.z), baseEmis, name: c.name });
      targets.push({ kind: 'crystal', idx: i, pos: new V3(c.x, 0, c.z), r: 2.0 });
    });
    // vault gate + chest
    gate = MB.CreateBox('gate', { width: 5, height: 4.5, depth: 0.8 }, scene); gate.material = M('gate', '#caa84a', { emissive: '#3a2a08' }); gate.position.set(def.gate.x, 2.25, def.gate.z);
    const ch = Models.chest(); chest = ch.node; chest.position.set(def.chest.x, 0, def.chest.z);
    targets.push({ kind: 'chest', pos: new V3(def.chest.x, 0, def.chest.z), r: 2.2 });
    // exit
    const ex = Models.portal('#8fd3f4'); ex.node.position.set(def.exit.x, 0, def.exit.z); ex.node._baseY = 0; idlers.push(ex);
    const exSign = Models.sign('Exit'); exSign.node.position.set(def.exit.x - 2.2, 0, def.exit.z);
    targets.push({ kind: 'exit', pos: new V3(def.exit.x, 0, def.exit.z), r: 2.2 });

    spawnMobs();

    if (solvedPuzzle) { gate.position.y = 8; crystals.forEach(c => setLit(c, true)); }

    const leaderModel = Progress.def(Game.state.active[0] || 'pirate').model;
    const hero = Models[leaderModel] ? Models[leaderModel]() : Models.hero(); player = hero.node;
    if (hero.arm) hero.arm.rotation.x = 1.0;
    player.position.set(def.spawn.x, 0, def.spawn.z);
    cam = new BABYLON.UniversalCamera('dcam', new V3(0, 16, -15), scene); cam.fov = 0.9;

    if (window.Render) Render.setup(scene, cam, { skyTop: '#05050f', skyHorizon: '#1a1430' });
    scene.onBeforeRenderObservable.add(update);
    return scene;
  }

  function setLit(c, on) { c.gem.material.emissiveColor = on ? Color3.FromHexString('#ffffff') : c.baseEmis; c.node.scaling.setAll(on ? 1.25 : 1); }

  // ---- monster tokens that trigger battles ----
  function spawnMobs() {
    (def.mobs || []).forEach((m, i) => {
      if (mobDefeated['m' + i]) return;
      const lead = m.pool[0];
      const built = Models.ENEMY_BUILDERS[lead] ? Models.enemy(lead) : Models.roamer('#b03050');
      built.node.position.set(m.x, 0, m.z); built.node.scaling.setAll(0.7); built.node._baseY = 0; built.node._ph = i * 1.3;
      idlers.push(built);
      mobs.push({ kind: 'mob', idx: i, node: built.node, pos: new V3(m.x, 0, m.z), r: 2.2, pool: m.pool, min: m.min, max: m.max });
    });
    if (def.bossMob && !bossDefeated) {
      const b = def.bossMob;
      const built = Models.ENEMY_BUILDERS[b.key] ? Models.enemy(b.key) : Models.roamer('#ff2a3a');
      built.node.position.set(b.x, 0, b.z); built.node._baseY = 0; idlers.push(built);
      mobs.push({ kind: 'boss', node: built.node, pos: new V3(b.x, 0, b.z), r: 3.0, key: b.key });
    }
  }
  function startMob(m) {
    busy = true; paused = true; Music.play('battle');
    const keys = []; const n = Math.floor(Math.random() * (m.max - m.min + 1)) + m.min;
    for (let i = 0; i < n; i++) keys.push(m.pool[Math.floor(Math.random() * m.pool.length)]);
    Game.startBattle(keys, {}, (res) => {
      if (res.won) { mobDefeated['m' + m.idx] = true; Game.state.dungeons[key + '_mobs'] = mobDefeated; m.node.setEnabled(false); m.dead = true; Progress.save(Game.state); }
      else { player.position.z -= 3; }
      busy = false; paused = false; Game.resumeDungeon();
    });
  }
  function startBoss(m) {
    busy = true; paused = true;
    Game.cutscene(Data.STORY.vampirePre, () => {
      Music.play('boss');
      Game.startBattle([m.key], { boss: true, fullLimit: true }, (res) => {
        if (res.won) {
          bossDefeated = true; Game.state.dungeons[key + '_boss'] = true; m.node.setEnabled(false); m.dead = true; solvedPuzzle = true;
          let y0 = gate.position.y; let acc = 0;
          const obs = scene.onBeforeRenderObservable.add(() => { acc += engine.getDeltaTime(); const k = Math.min(1, acc / 700); gate.position.y = y0 + k * 6; if (k >= 1) scene.onBeforeRenderObservable.remove(obs); });
          Progress.save(Game.state);
          busy = false; paused = false; Game.resumeDungeon();
          Game.cutscene(Data.STORY.vampireFall, () => Game.cutscene(Data.STORY.simonLeave, () => {
            Progress.dismiss(Game.state, 'simon'); Progress.save(Game.state); Game.toast('The throne room opens. Claim what the Count hoarded.');
          }));
        } else { player.position.z -= 3; busy = false; paused = false; Game.resumeDungeon(); }
      });
    });
  }

  function update() {
    if (paused || (window.Game && Game.blocking && Game.blocking())) return;
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    if (Input.down('KeyQ')) camYaw -= 1.7 * dt;
    if (Input.down('KeyE')) camYaw += 1.7 * dt;
    let mx = 0, mz = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz += 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz -= 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; const fX=-Math.sin(camYaw), fZ=Math.cos(camYaw), rX=Math.cos(camYaw), rZ=Math.sin(camYaw); const wx=mx*rX+mz*fX, wz=mx*rZ+mz*fZ; player.position.x = clamp(player.position.x + wx*SPEED*dt, -12, 12); player.position.z = clamp(player.position.z + wz*SPEED*dt, -15, 17); player.rotation.y = Math.atan2(wx, wz); player.position.y = Math.abs(Math.sin(t*10))*0.12; } else player.position.y = 0;

    idlers.forEach(o => o.idle && o.idle(t));

    // monster contact → battle
    if (!busy) {
      for (const m of mobs) {
        if (m.dead || !m.node.isEnabled()) continue;
        if (V3.Distance(player.position, m.pos) < m.r) { if (m.kind === 'boss') startBoss(m); else startMob(m); return; }
      }
    }

    nearTarget = null;
    for (const tg of targets) { if (tg.kind === 'chest' && (chestLooted || !solvedPuzzle)) continue; if (V3.Distance(player.position, tg.pos) < tg.r) { nearTarget = tg; break; } }
    const prompt = document.getElementById('worldPrompt');
    if (nearTarget) {
      let label = '[F / Tap] ';
      if (nearTarget.kind === 'crystal') label += `Touch the ${crystals[nearTarget.idx].name} crystal`;
      else if (nearTarget.kind === 'chest') label += 'Open the vault chest';
      else label += 'Leave the dungeon';
      prompt.textContent = label; prompt.classList.add('show');
    } else prompt.classList.remove('show');

    const off = 15; cam.position.set(player.position.x + Math.sin(camYaw)*off, 16, player.position.z - Math.cos(camYaw)*off); cam.setTarget(player.position.add(new V3(0, 1, 0)));
    Game.updateHUD();
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function activate(idx) {
    if (solvedPuzzle) return;
    const expected = def.sequence[step];
    if (idx === expected) {
      step++; setLit(crystals[idx], true); if (window.SFX) SFX.play('select');
      if (step >= def.sequence.length) solve();
    } else {
      step = 0; crystals.forEach(c => setLit(c, false)); if (window.SFX) SFX.play('error'); Game.toast('The crystals dim — wrong order. Read the riddle again.');
    }
  }
  function solve() {
    solvedPuzzle = true; if (window.SFX) { SFX.play('puzzle'); SFX.play('door'); }
    Game.toast('Ancient mechanisms grind — the vault opens!');
    let y0 = gate.position.y; let acc = 0;
    const obs = scene.onBeforeRenderObservable.add(() => { acc += engine.getDeltaTime(); const k = Math.min(1, acc/700); gate.position.y = y0 + k * 6; if (k >= 1) scene.onBeforeRenderObservable.remove(obs); });
  }
  function loot() {
    if (chestLooted) return; chestLooted = true; Game.state.dungeons[key] = true;
    const rw = def.reward; Game.state.gold += rw.gold || 0; let msg = `Found ${rw.gold} gold`;
    if (rw.shell) { Progress.addShell(Game.state, rw.shell); msg += ` and a ${Data.SHELLS[rw.shell].name} seashell!`; } else msg += '!';
    Progress.save(Game.state); if (window.SFX) SFX.play('gold'); Game.toast(msg);
  }

  function interact() {
    if (paused || !nearTarget) return;
    if (nearTarget.kind === 'crystal') activate(nearTarget.idx);
    else if (nearTarget.kind === 'chest') loot();
    else if (nearTarget.kind === 'exit') {
      if (def.vampire && !bossDefeated) { Progress.dismiss(Game.state, 'simon'); Progress.save(Game.state); Game.toast('Simon holds the castle gate. "Come back when you\'re ready to finish this."'); }
      Game.toIsland(def.island, false, true);
    }
  }
  function showRiddle() { Game.cutscene([{ name: def.name, text: def.hint }], () => resume()); }

  function enter(dungeonKey) {
    build(dungeonKey); Game.active = { interact }; Music.play('dungeon');
    if (def.vampire && !bossDefeated) {
      Progress.recruit(Game.state, 'simon', 4); Progress.save(Game.state);
      if (!Game.state.flags.simonMet) { Game.state.flags.simonMet = true; Progress.save(Game.state); setTimeout(() => Game.startCutscene('simonJoin'), 400); }
      else setTimeout(showRiddle, 400);
    } else setTimeout(showRiddle, 400);
    return scene;
  }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene, currentDef: () => def };
})();
