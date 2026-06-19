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
  let hazards = [], hazCd = 0, bonusLooted = {};
  let zMin = -15, zMax = 17;
  const SPEED = 8;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); if (opt.alpha != null) m.alpha = opt.alpha; return m; }

  // each dungeon gets its own lighting/fog/sky + a signature prop set down the hall
  const DUN_THEME = { tide_cave: 'cave', dune_tomb: 'tomb', abyss_vault: 'abyss', vampire_keep: 'castle', genie_cave: 'wonders', dragon_vale: 'vale' };
  const DUN_ENV = {
    cave:    { hemi: '#16242e', pt: '#7fd0ff', fog: '#1a2a34', fogD: 0.020, sky: ['#05101a', '#16303e'], torch: '#7fd0ff' },
    tomb:    { hemi: '#2a2418', pt: '#ffcf7a', fog: '#2a2414', fogD: 0.022, sky: ['#100c04', '#2a2008'], torch: '#ffb14a' },
    abyss:   { hemi: '#14122a', pt: '#b06aff', fog: '#100c1e', fogD: 0.028, sky: ['#05030f', '#1a1030'], torch: '#b06aff' },
    castle:  { hemi: '#1e1018', pt: '#ff6a6a', fog: '#160a12', fogD: 0.024, sky: ['#0a0408', '#2a0e16'], torch: '#ff7b4a' },
    wonders: { hemi: '#2a1e0a', pt: '#ffd24a', fog: '#241a08', fogD: 0.020, sky: ['#1a0e02', '#3a2206'], torch: '#ffd24a' },
    vale:    { hemi: '#1a2230', pt: '#aef0ff', fog: '#16202c', fogD: 0.016, sky: ['#0a1018', '#2a2030'], torch: '#cfe0ff' },
  };
  function dungeonProp(theme, near, far) {
    const cyl = (h, dt, db, x, y, z, col, opt) => { const c = MB.CreateCylinder('dp', { height: h, diameterTop: dt, diameterBottom: db, tessellation: (opt && opt.tess) || 8 }, scene); c.material = M('dp', col, opt || {}); c.position.set(x, y, z); return c; };
    const box = (w, h, d, x, y, z, col, opt) => { const b = MB.CreateBox('dp', { width: w, height: h, depth: d }, scene); b.material = M('dp', col, opt || {}); b.position.set(x, y, z); return b; };
    const sph = (d, x, y, z, col, opt) => { const s = MB.CreateSphere('dp', { diameter: d }, scene); s.material = M('dp', col, opt || {}); s.position.set(x, y, z); return s; };
    const flame = (x, y, z, col) => { const f = sph(0.5, x, y, z, col, { emissive: col }); idlers.push({ idle(tt) { f.scaling.setAll(1 + Math.sin(tt * 7 + x + z) * 0.25); } }); return f; };
    for (let z = near + 6; z < far - 3; z += 7) {
      [-10, 10].forEach((x, si) => {
        if (theme === 'cave') { const st = cyl(2.6, 0, 1.0, x, 4.2, z, '#3a4a5a'); st.rotation.x = Math.PI; const cr = Models.crystal(si ? '#5effc0' : '#7fd0ff'); cr.node.position.set(x * 0.78, 0, z + 2.5); cr.node.scaling.setAll(0.6); idlers.push(cr); }
        else if (theme === 'tomb') { box(1.5, 1.3, 3.0, x, 0.65, z, '#5a4a2a'); box(1.6, 0.3, 3.1, x, 1.35, z, '#6a5a36'); cyl(0.9, 0.5, 0.7, x * 0.7, 0.45, z + 3, '#cfc4a0'); }
        else if (theme === 'abyss') { const c = cyl(1.8, 0, 0.7, x, 3.0 + Math.sin(z) * 0.5, z, '#b06aff', { emissive: '#6a2aaa' }); c.rotation.x = Math.PI; idlers.push({ idle(tt) { c.position.y = 3.0 + Math.sin(tt + z) * 0.4; c.rotation.y = tt * 0.6; } }); }
        else if (theme === 'castle') { cyl(3.4, 0.18, 0.3, x, 1.7, z, '#2a2028'); flame(x, 3.6, z, '#ff8a3a'); if (si === 0) box(1.3, 1.0, 2.8, x * 0.7, 0.55, z + 1, '#3a2a30'); }
        else if (theme === 'wonders') { for (let k = 0; k < 5; k++) sph(0.5, x + (Math.random() - 0.5) * 1.6, 0.25, z + (Math.random() - 0.5) * 1.6, '#ffd24a', { emissive: '#7a5a08', spec: 0.8 }); if (si === 0) flame(x * 0.7, 1.4, z + 2.5, '#ffcf6a'); }
        else if (theme === 'vale') { [-1, 1].forEach(s => { const rib = cyl(3.4, 0.1, 0.4, x, 1.7, z + s * 0.6, '#cfc8b4'); rib.rotation.z = (x < 0 ? 1 : -1) * 0.5; }); sph(0.9, x * 0.7, 0.45, z + 2.5, '#d8d0c0'); }
      });
    }
  }

  // procedural complexity: optional side caches off the critical path + telegraphed spike traps.
  // generated against the hall length so EVERY dungeon gets it, gated around existing content.
  function buildExtras(near, far, env) {
    const occ = [{ z: def.spawn.z, r: 5 }, { z: def.exit.z, r: 5 }, { z: def.gate.z, r: 4 }, { z: def.chest.z, r: 4 }];
    (def.crystals || []).forEach(c => occ.push({ z: c.z, r: 3 }));
    (def.mobs || []).forEach(m => occ.push({ z: m.z, r: 4 }));
    if (def.bossMob) occ.push({ z: def.bossMob.z, r: 6 });
    const clearZ = (z, pad) => !occ.some(o => Math.abs(o.z - z) < (o.r + (pad || 0)));

    // --- side alcoves: a framed nook against the wall holding a bonus cache ---
    let side = -1, made = 0;
    for (let z = near + 11; z < far - 9 && made < 3; z += 12) {
      if (!clearZ(z, 2)) continue;
      side = -side;
      const x = side * 10;
      const pad = MB.CreateBox('alcove', { width: 4.4, height: 0.12, depth: 4 }, scene); pad.material = M('alcoveF', def.wall, { spec: 0 }); pad.position.set(x, 0.06, z);
      [-2.2, 2.2].forEach(dz => { const p = Models.pillar(); p.node.position.set(side * 7.8, 0, z + dz); p.node.scaling.set(0.7, 0.9, 0.7); });
      const torch = MB.CreateSphere('atorch', { diameter: 0.4 }, scene); torch.material = M('atorch', env.torch, { emissive: env.torch }); torch.position.set(side * 11.6, 3.2, z); idlers.push({ idle(tt) { torch.scaling.setAll(1 + Math.sin(tt * 6 + z) * 0.2); } });
      const ch = Models.chest(); ch.node.position.set(side * 10.5, 0, z); ch.node.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (bonusLooted['b' + made]) ch.lid.rotation.x = -1.4;
      targets.push({ kind: 'bonus', idx: made, pos: new V3(side * 10.5, 0, z), r: 2.1, lid: ch.lid });
      made++;
    }

    // --- spike-trap tiles in the main corridor: rise and fall on a clear visual timer ---
    let hmade = 0;
    for (let z = near + 15; z < far - 11 && hmade < 3; z += 13) {
      if (!clearZ(z, 3)) continue;
      const hx = (hmade % 2 === 0) ? -3.2 : 3.2;
      const plate = MB.CreateBox('trap', { width: 3, height: 0.1, depth: 3 }, scene); plate.material = M('trap', '#3a2624', { emissive: '#1a0a08' }); plate.position.set(hx, 0.06, z);
      const spikeMat = M('spike', '#c9ccd4', { spec: 0.6 });
      const spikes = [];
      for (let sx = -1; sx <= 1; sx++) for (let sz = -1; sz <= 1; sz++) {
        const sp = MB.CreateCylinder('spk', { height: 1.1, diameterBottom: 0.32, diameterTop: 0, tessellation: 6 }, scene); sp.material = spikeMat; sp.position.set(hx + sx * 0.9, -0.6, z + sz * 0.9); spikes.push(sp);
      }
      const haz = { x: hx, z, r: 1.6, spikes, armed: false, off: hmade * 0.7 };
      idlers.push({ idle(tt) {
        const c = (tt * 0.55 + haz.off) % 1;          // full cycle ~1.8s
        const up = c < 0.42;                           // spikes out for ~0.75s, telegraphed by the rise
        const raise = up ? Math.min(1, c * 8) : Math.max(0, 1 - (c - 0.42) * 8);
        haz.armed = raise > 0.6;
        spikes.forEach(sp => { sp.position.y = -0.6 + raise * 1.15; });
        plate.material.emissiveColor = Color3.FromHexString(up ? '#5a1410' : '#1a0a08');
      } });
      hazards.push(haz);
      hmade++;
    }
  }

  function hazardStrike(h) {
    hazCd = 1.3;
    const members = Progress.activeMembers(Game.state);
    members.forEach(p => { const d = Progress.derived(p, Game.state); const dmg = Math.ceil(d.maxhp * 0.12); p.hpCur = Math.max(1, (p.hpCur == null ? d.maxhp : p.hpCur) - dmg); });
    Progress.save(Game.state);
    // knock the player back along the hall, away from the spikes
    const dir = player.position.z >= h.z ? 1 : -1;
    player.position.z = clamp(player.position.z + dir * 2.6, zMin, zMax);
    if (window.SFX) SFX.play('earth');
    Game.toast('🩸 Spikes! The party is wounded.');
  }

  function build(dungeonKey) {
    key = dungeonKey; def = Data.DUNGEONS[dungeonKey]; engine = Game.engine;
    if (scene) scene.dispose();
    crystals = []; idlers = []; targets = []; mobs = []; hazards = []; nearTarget = null; t = 0; step = 0; hazCd = 0; paused = false; busy = false;
    const cleared = !!Game.state.dungeons[key];
    bossDefeated = !!Game.state.dungeons[key + '_boss'];
    mobDefeated = Game.state.dungeons[key + '_mobs'] || (Game.state.dungeons[key + '_mobs'] = {});
    bonusLooted = Game.state.dungeons[key + '_bonus'] || (Game.state.dungeons[key + '_bonus'] = {});
    solvedPuzzle = def.bossMob ? bossDefeated : cleared; chestLooted = cleared;
    const theme = DUN_THEME[key] || 'cave', env = DUN_ENV[theme] || DUN_ENV.cave;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = Color3.FromHexString(env.fog); scene.fogDensity = env.fogD;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.2), scene); hemi.intensity = 0.55; hemi.groundColor = Color3.FromHexString(env.hemi);
    const pt = new BABYLON.PointLight('p', new V3(0, 8, 0), scene); pt.intensity = 0.7; pt.diffuse = Color3.FromHexString(env.pt);

    // hall length scales to its deepest content, so combat dungeons feel like a long descent
    const zs = [def.spawn.z, def.exit.z, def.gate.z, def.chest.z];
    if (def.bossMob) zs.push(def.bossMob.z);
    (def.crystals || []).forEach(c => zs.push(c.z));
    (def.mobs || []).forEach(m => zs.push(m.z));
    const near = Math.min.apply(null, zs) - 5, far = Math.max.apply(null, zs) + 5;
    const depth = far - near, midz = (near + far) / 2;
    zMin = near + 1.5; zMax = far - 1.5;
    const floor = MB.CreateGround('floor', { width: 26, height: depth }, scene); floor.material = M('floor', def.ground); floor.position.z = midz;
    // walls
    const wallMat = M('wall', def.wall);
    const wall = (w, h, d, x, y, z) => { const b = MB.CreateBox('w', { width: w, height: h, depth: d }, scene); b.material = wallMat; b.position.set(x, y, z); };
    wall(26, 5, 1, 0, 2.5, near); wall(26, 5, 1, 0, 2.5, far); wall(1, 5, depth, -13, 2.5, midz); wall(1, 5, depth, 13, 2.5, midz);
    // pillars + theme-tinted torch glow down the length of the hall
    for (let z = near + 6; z < far - 2; z += 9) { [-9, 9].forEach(x => { const p = Models.pillar(); p.node.position.set(x, 0, z); const torch = MB.CreateSphere('torch', { diameter: 0.4 }, scene); torch.material = M('torch', env.torch, { emissive: env.torch }); torch.position.set(x, 3.4, z); idlers.push({ idle(tt) { torch.scaling.setAll(1 + Math.sin(tt * 6 + z) * 0.2); } }); }); }
    dungeonProp(theme, near, far);

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
    buildExtras(near, far, env);

    if (solvedPuzzle) { gate.position.y = 8; crystals.forEach(c => setLit(c, true)); }

    const leaderKey = Game.state.active[0] || 'pirate'; const leaderModel = Progress.def(leaderKey).model;
    const hero = Models[leaderModel] ? Models[leaderModel]((Game.state.equip[leaderKey] || {}).weapon) : Models.hero(); player = hero.node;
    Models.cosmetic(player, (Game.state.equip[leaderKey] || {}).accessory);
    if (hero.arm) hero.arm.rotation.x = 1.0;
    player.position.set(def.spawn.x, 0, def.spawn.z);
    cam = new BABYLON.UniversalCamera('dcam', new V3(0, 16, -15), scene); cam.fov = 0.9;

    if (window.Render) Render.setup(scene, cam, { skyTop: env.sky[0], skyHorizon: env.sky[1] });
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
    const ally = def.ally || {};
    const pre = (ally.pre && Data.STORY[ally.pre]) ? ally.pre : null;
    const runFight = () => {
      Music.play('boss');
      Game.startBattle([m.key], { boss: true, fullLimit: true }, (res) => {
        if (res.won) {
          bossDefeated = true; Game.state.dungeons[key + '_boss'] = true; m.node.setEnabled(false); m.dead = true; solvedPuzzle = true;
          let y0 = gate.position.y; let acc = 0;
          const obs = scene.onBeforeRenderObservable.add(() => { acc += engine.getDeltaTime(); const k = Math.min(1, acc / 700); gate.position.y = y0 + k * 6; if (k >= 1) scene.onBeforeRenderObservable.remove(obs); });
          Progress.save(Game.state);
          busy = false; paused = false; Game.resumeDungeon();
          const fall = () => {
            if (ally.key) { Progress.dismiss(Game.state, ally.key); Progress.save(Game.state); }
            Game.toast('The way is open. Claim what lies beyond!');
          };
          if (ally.fall && Data.STORY[ally.fall]) Game.cutscene(Data.STORY[ally.fall], () => { if (ally.leave && Data.STORY[ally.leave]) Game.cutscene(Data.STORY[ally.leave], fall); else fall(); });
          else fall();
        } else { player.position.z -= 3; busy = false; paused = false; Game.resumeDungeon(); }
      });
    };
    if (pre) Game.cutscene(Data.STORY[pre], runFight); else runFight();
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
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; const fX=-Math.sin(camYaw), fZ=Math.cos(camYaw), rX=Math.cos(camYaw), rZ=Math.sin(camYaw); const wx=mx*rX+mz*fX, wz=mx*rZ+mz*fZ; player.position.x = clamp(player.position.x + wx*SPEED*dt, -12, 12); player.position.z = clamp(player.position.z + wz*SPEED*dt, zMin, zMax); player.rotation.y = Math.atan2(wx, wz); player.position.y = Math.abs(Math.sin(t*10))*0.12; } else player.position.y = 0;

    idlers.forEach(o => o.idle && o.idle(t));

    // spike-trap contact → party takes a hit + knockback (with a short cooldown)
    if (hazCd > 0) hazCd -= dt;
    if (!busy && hazCd <= 0) {
      for (const h of hazards) {
        if (h.armed && Math.abs(player.position.x - h.x) < h.r && Math.abs(player.position.z - h.z) < h.r) { hazardStrike(h); break; }
      }
    }

    // monster contact → battle
    if (!busy) {
      for (const m of mobs) {
        if (m.dead || !m.node.isEnabled()) continue;
        if (V3.Distance(player.position, m.pos) < m.r) { if (m.kind === 'boss') startBoss(m); else startMob(m); return; }
      }
    }

    nearTarget = null;
    for (const tg of targets) { if (tg.kind === 'chest' && (chestLooted || !solvedPuzzle)) continue; if (tg.kind === 'bonus' && bonusLooted['b' + tg.idx]) continue; if (V3.Distance(player.position, tg.pos) < tg.r) { nearTarget = tg; break; } }
    const prompt = document.getElementById('worldPrompt');
    if (nearTarget) {
      let label = '[F / Tap] ';
      if (nearTarget.kind === 'crystal') label += `Touch the ${crystals[nearTarget.idx].name} crystal`;
      else if (nearTarget.kind === 'chest') label += 'Open the vault chest';
      else if (nearTarget.kind === 'bonus') label += 'Open the hidden cache';
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
  function lootBonus(tg) {
    if (bonusLooted['b' + tg.idx]) return; bonusLooted['b' + tg.idx] = true; Game.state.dungeons[key + '_bonus'] = bonusLooted;
    if (tg.lid) tg.lid.rotation.x = -1.4;
    const g = 18 + Math.floor(Math.random() * 33); Game.state.gold += g; let msg = 'Hidden cache: ⛃ +' + g;
    if (Math.random() < 0.45) { const mk = ['sand', 'shellfrag', 'feather', 'goo', 'fang'][Math.floor(Math.random() * 5)]; Progress.addMaterials(Game.state, { [mk]: 1 }); msg += ' + a ' + Data.MATERIALS[mk].name; }
    Progress.save(Game.state); if (window.SFX) SFX.play('gold'); Game.toast(msg);
  }

  function interact() {
    if (paused || !nearTarget) return;
    if (nearTarget.kind === 'crystal') activate(nearTarget.idx);
    else if (nearTarget.kind === 'chest') loot();
    else if (nearTarget.kind === 'bonus') lootBonus(nearTarget);
    else if (nearTarget.kind === 'exit') {
      const ally = def.ally;
      if (ally && ally.key && !bossDefeated) { Progress.dismiss(Game.state, ally.key); Progress.save(Game.state); if (ally.holdMsg) Game.toast(ally.holdMsg); }
      Game.toIsland(def.island, false, true);
    }
  }
  function showRiddle() { Game.cutscene([{ name: def.name, text: def.hint }], () => resume()); }

  function enter(dungeonKey) {
    build(dungeonKey); Game.active = { interact }; Music.play('dungeon');
    const ally = def.ally;
    if (ally && ally.key && !bossDefeated) {
      Progress.recruit(Game.state, ally.key, 4); Progress.save(Game.state);
      const flag = ally.metFlag || (ally.key + 'Met');
      if (ally.join && !Game.state.flags[flag]) { Game.state.flags[flag] = true; Progress.save(Game.state); setTimeout(() => Game.startCutscene(ally.join), 400); }
      else setTimeout(showRiddle, 400);
    } else setTimeout(showRiddle, 400);
    return scene;
  }
  function pause() { paused = true; }
  function resume() { paused = false; }

  // debug hooks for the capture harness — warp to spike traps / alcoves to frame them
  const _debug = {
    warp(x, z) { if (player) { player.position.x = clamp(x, -12, 12); player.position.z = clamp(z, zMin, zMax); } },
    hazard() { const h = hazards[0]; return h ? { x: h.x, z: h.z } : null; },
    alcove() { const a = targets.find(t => t.kind === 'bonus'); return a ? { x: a.pos.x, z: a.pos.z } : null; }
  };

  return { enter, pause, resume, getScene: () => scene, currentDef: () => def, _debug };
})();
