// =====================================================================
//  World — a single walkable ISLAND overworld (rebuilt per island).
//  Towns, a dungeon, roaming battles, and a dock back to the ship.
// =====================================================================
window.World = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine, def, key;
  let roamers = [], gates = [], idlers = [], gulls = [], water = null, waterBase = null, paused = false, locked = false, nearGate = null, t = 0, camYaw = 0, playerArm = null, swingT = 0;
  let cuttables = [], debris = [];
  let swingCat = 'slash', swingDur = 0.32, armBaseZ = 0, armBaseX = 1.0, freeze = 0;
  const SPEED = 9;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }
  const rlim = () => def.size * 0.5 - 2;

  function build(islandKey) {
    key = islandKey; def = Data.ISLANDS[islandKey]; engine = Game.engine;
    if (scene) scene.dispose();
    roamers = []; gates = []; idlers = []; gulls = []; nearGate = null; t = 0; paused = false; locked = false;
    cuttables = []; debris = [];
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.6, 0.8, 0.95); scene.fogDensity = 0.006;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.5; hemi.groundColor = new Color3(0.3, 0.34, 0.4);
    const sun = new BABYLON.DirectionalLight("s", new V3(-0.55, -1, 0.35), scene); sun.intensity = 1.4; sun.specular = new Color3(1, 0.95, 0.85);

    water = MB.CreateGround('water', { width: 280, height: 280, subdivisions: 40 }, scene); const wm = M('water', def.water, { spec: 0.8 }); wm.specularPower = 64; wm.emissiveColor = Color3.FromHexString(def.water).scale(0.18); water.material = wm; water.position.y = -0.35; waterBase = water.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();
    // island shape: non-round footprints + an organic, noisy coastline for variety
    const SHAPES = { round: [1, 1], long: [1.45, 0.72], wide: [0.72, 1.45], oval: [1.25, 0.85], teardrop: [0.9, 1.3],
      crescent: [1.1, 0.95], twin: [1.18, 0.86], star: [1, 1], clover: [1.04, 1.04], fin: [1.06, 0.98], horn: [1.22, 0.82], wedge: [1.18, 0.86], spiral: [1.08, 0.98] };
    // per-shape radial profile r(angle) — distinct coastlines; kept >=0.7 so interactables never hit water
    const RF = {
      crescent: a => 1 - 0.30 * Math.pow(Math.max(0, Math.cos(a)), 2),     // a moonlit bite out of one shore
      twin:     a => 0.85 + 0.20 * Math.abs(Math.cos(a)),                  // two-armed cove / peanut
      star:     a => 1 + 0.14 * Math.sin(a * 6),                          // jagged, many-pointed coast
      clover:   a => 1 + 0.16 * Math.cos(a * 3),                          // three leafy lobes
      fin:      a => 1 + 0.26 * Math.max(0, Math.sin(a)),                 // a sweeping shark-fin point
      horn:     a => 1 + 0.20 * Math.sin(a * 2 + 0.8),                    // a curved horn / hook
      wedge:    a => 0.82 + 0.32 * ((Math.cos(a) + 1) / 2),               // a pointed dune-wedge
      spiral:   a => 1 + 0.16 * Math.sin(a + Math.cos(a) * 1.4),          // a lazy comma swirl
    };
    const shp = SHAPES[def.shape] || SHAPES.round; const yaw = (def.shapeYaw || 0); const rf = RF[def.shape];
    const wobble = (mesh, amp) => { const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind); for (let i = 0; i < pos.length; i += 3) { const a = Math.atan2(pos[i + 1], pos[i]); let f = 1 + Math.sin(a * 5) * amp + Math.sin(a * 11 + 1.3) * amp * 0.5; if (rf) f *= rf(a); pos[i] *= f; pos[i + 1] *= f; } mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos); };
    const sand = MB.CreateDisc('sand', { radius: def.size * 0.6, tessellation: 56 }, scene); wobble(sand, 0.06); sand.rotation.x = Math.PI/2; sand.rotation.y = yaw; sand.scaling.x = shp[0]; sand.scaling.y = shp[1]; sand.position.y = -0.04; sand.material = M('sand', def.sand);
    const grass = MB.CreateDisc('grass', { radius: def.size * 0.54, tessellation: 56 }, scene); wobble(grass, 0.07); grass.rotation.x = Math.PI/2; grass.rotation.y = yaw; grass.scaling.x = shp[0]; grass.scaling.y = shp[1]; grass.material = M('grass', def.ground);
    const treeFn = () => (Models[def.treeType] ? Models[def.treeType]() : Models.tree());

    // keep-out zones so scenery never sits on top of an interactable (town, mermaids, dock, etc.)
    const keepOut = []; const ko = (o, r) => { if (o && o.x != null) keepOut.push({ x: o.x, z: o.z, r: r }); };
    ko(def.spawn, 5); ko(def.dock, 6); ko(def.town, 9); ko(def.dungeon, 7); ko(def.shells, 6.5);
    ko(def.boss, 9); ko(def.bonfire, 6); ko(def.superboss, 7); ko(def.coliseum, 10); ko(def.grove, 7);
    (def.mermaids || []).forEach(m => ko(m, 7)); (def.encounters || []).forEach(e => ko(e, 5));
    const placedPts = [];
    const place = (b, n, rad) => {
      for (let i = 0; i < n; i++) {
        let x = 0, z = 0, ok = false;
        for (let tries = 0; tries < 20 && !ok; tries++) {
          const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * (rad - 6);
          x = Math.cos(a) * r; z = Math.sin(a) * r; ok = true;
          for (const k of keepOut) { const dx = x - k.x, dz = z - k.z; if (dx*dx + dz*dz < k.r*k.r) { ok = false; break; } }
          if (ok) for (const p of placedPts) { const dx = x - p.x, dz = z - p.z; if (dx*dx + dz*dz < 13) { ok = false; break; } } // ~3.6 units apart, no clumping
        }
        if (!ok) continue;
        placedPts.push({ x: x, z: z });
        const o = b(); o.node.position.set(x, 0, z); o.node.scaling.setAll(0.8 + Math.random() * 0.6); if (o.idle) idlers.push(o);
      }
    };
    place(treeFn, def.decor.trees, def.size*0.45);
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

    // mermaids (dating sim)
    if (def.mermaids) def.mermaids.forEach(mm => {
      const md = Data.MERMAIDS[mm.key];
      const rk = Models.rock(); rk.node.position.set(mm.x, 0, mm.z - 0.7); rk.node.scaling.setAll(1.7);
      const mer = Models.mermaid(md.color, md.tail, md.skin); mer.node.position.set(mm.x, 0.7, mm.z); mer.node._baseY = 0.7; mer.node.rotation.y = Math.PI; idlers.push(mer);
      gates.push({ kind: 'mermaid', key: mm.key, name: md.name, pos: new V3(mm.x, 0, mm.z), r: 3 });
    });

    // boss lair (spire)
    if (def.boss) {
      const stage = Game.state.prog.finalWin ? 'A Calmed Spire' : Game.state.prog.krakenDown ? "Selachoth's Spire" : "Kraken's Lair";
      const color = Game.state.prog.finalWin ? '#8fd3f4' : Game.state.prog.krakenDown ? '#c0c8ff' : def.boss.color;
      const p = Models.portal(color); p.node.position.set(def.boss.x, 0, def.boss.z); p.node._baseY = 0; idlers.push(p);
      const spire = MB.CreateCylinder('spire', { height: 9, diameterTop: 0.6, diameterBottom: 3, tessellation: 6 }, scene); spire.material = M('spire', '#2a2438'); spire.position.set(def.boss.x, 4.5, def.boss.z + 3);
      const s = Models.sign(stage); s.node.position.set(def.boss.x, 0, def.boss.z - 2.2);
      gates.push({ kind: 'boss', name: stage, pos: new V3(def.boss.x, 0, def.boss.z), r: 3 });
    }

    // secret-cove bonfire (a rest spot + story beat)
    if (def.bonfire) {
      const fire = Models.crystal('#ff7b3a'); fire.node.position.set(def.bonfire.x, 0.2, def.bonfire.z); fire.node.scaling.setAll(0.8); idlers.push(fire);
      for (let i = 0; i < 5; i++) { const log = MB.CreateCylinder('log', { height: 1.2, diameter: 0.22 }, scene); log.material = M('log', '#5a3a1e'); log.position.set(def.bonfire.x + Math.cos(i*1.26)*0.6, 0.2, def.bonfire.z + Math.sin(i*1.26)*0.6); log.rotation.z = 1.2; log.rotation.y = i*1.26; }
      const bs = Models.sign('Bonfire'); bs.node.position.set(def.bonfire.x - 2.2, 0, def.bonfire.z);
      gates.push({ kind: 'bonfire', name: 'the bonfire', pos: new V3(def.bonfire.x, 0, def.bonfire.z), r: 3 });
    }

    // optional superboss (the Drifter, on the secret cove)
    if (def.superboss && !Game.state.prog.coveBossDown) {
      const sb = def.superboss; const foe = Models.enemy(sb.key); foe.node.position.set(sb.x, 0, sb.z); foe.node.scaling.setAll(0.55); foe.node._baseY = 0; foe.node.rotation.y = Math.PI; idlers.push(foe);
      const ss = Models.sign('???'); ss.node.position.set(sb.x, 0, sb.z - 2.4);
      gates.push({ kind: 'superboss', key: sb.key, name: 'the Drifter', pos: new V3(sb.x, 0, sb.z), r: 3 });
    }

    // the Coliseum (Paegina endgame gauntlet)
    if (def.coliseum) {
      const c = def.coliseum;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const col = MB.CreateCylinder('col', { height: 3.2, diameter: 0.5, tessellation: 8 }, scene); col.material = M('colMat', '#e8e0cc'); col.position.set(c.x + Math.cos(a) * 4.5, 1.6, c.z + Math.sin(a) * 4.5); }
      const p = Models.portal(c.color || '#caa030'); p.node.position.set(c.x, 0, c.z); p.node._baseY = 0; idlers.push(p);
      const s = Models.sign('Coliseum'); s.node.position.set(c.x, 0, c.z - 2.4);
      gates.push({ kind: 'coliseum', name: 'the Coliseum', pos: new V3(c.x, 0, c.z), r: 3 });
    }
    // pistachio grove (flavour)
    if (def.grove) {
      for (let i = 0; i < 7; i++) { const tr = Models.tree(); tr.node.position.set(def.grove.x + (Math.random()*5-2.5), 0, def.grove.z + (Math.random()*5-2.5)); tr.node.scaling.setAll(0.7 + Math.random()*0.3); idlers.push(tr); }
      const gs = Models.sign('Pistachio Grove'); gs.node.position.set(def.grove.x, 0, def.grove.z - 2.5);
    }

    // roamers
    if (!Game.state.islands[key]) Game.state.islands[key] = { cleared: {} };
    const cleared = Game.state.islands[key].cleared;
    def.encounters.forEach((enc, idx) => {
      if (cleared['e' + idx]) return;
      const colorByPool = { gull: '#cdd6e0', jelly: '#d98cff', shark: '#6f7f8c', crab: '#e0573a', octo: '#a05bd6', golem: '#d9b779' };
      const ro = Models.roamer(colorByPool[enc.pool[0]] || '#ff6b6b'); ro.node.position.set(enc.x, 0, enc.z); ro.node._ph = idx;
      roamers.push({ node: ro.node, idle: ro.idle, enc, idx, home: new V3(enc.x, 0, enc.z), ang: Math.random()*Math.PI*2, spd: 2 + Math.random()*1.5 });
      idlers.push(ro);
    });

    // cuttable scenery — Zelda-style grass tufts to slice and clay pots to smash.
    // bright + tall so they read clearly against the ground from the overworld camera.
    const grassCol = def.grassCut || '#7ed957';
    const makeGrass = () => {
      const root = new BABYLON.TransformNode('grasstuft', scene); const mat = M('blade', grassCol, { spec: 0, emissive: '#1c3a14' });
      for (let i = 0; i < 7; i++) { const h = 1.1 + Math.random() * 0.6; const b = MB.CreateCylinder('blade', { height: h, diameterBottom: 0.22, diameterTop: 0.0, tessellation: 4 }, scene); b.material = mat; const a = Math.random() * 6.28, rr = Math.random() * 0.3; b.position.set(Math.cos(a) * rr, h * 0.42, Math.sin(a) * rr); b.rotation.x = (Math.random() - 0.5) * 0.5; b.rotation.z = (Math.random() - 0.5) * 0.5; b.parent = root; }
      return { node: root, color: grassCol };
    };
    const makePot = () => {
      const root = new BABYLON.TransformNode('pot', scene); const body = MB.CreateCylinder('potbody', { height: 1.15, diameterTop: 0.75, diameterBottom: 0.5, tessellation: 12 }, scene); body.material = M('clay', '#cf7233', { spec: 0.3, emissive: '#3a1a08' }); body.position.y = 0.57; body.parent = root;
      const rim = MB.CreateTorus('potrim', { diameter: 0.82, thickness: 0.16, tessellation: 12 }, scene); rim.material = M('clayrim', '#9a5424'); rim.position.y = 1.12; rim.parent = root;
      const band = MB.CreateTorus('potband', { diameter: 0.78, thickness: 0.1, tessellation: 12 }, scene); band.material = M('clayband', '#e0b070'); band.position.y = 0.62; band.parent = root;
      return { node: root, color: '#cf7233' };
    };
    const scatterCut = (b, n, type) => {
      for (let i = 0; i < n; i++) {
        let x = 0, z = 0, ok = false;
        for (let tries = 0; tries < 20 && !ok; tries++) {
          const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * (def.size * 0.42 - 6);
          x = Math.cos(a) * r; z = Math.sin(a) * r; ok = true;
          for (const k of keepOut) { const dx = x - k.x, dz = z - k.z; if (dx * dx + dz * dz < k.r * k.r) { ok = false; break; } }
        }
        if (!ok) continue;
        const o = b(); o.node.position.set(x, 0, z); if (type === 'grass') o.node.rotation.y = Math.random() * 6.28;
        cuttables.push({ node: o.node, type, color: o.color, pos: new V3(x, 0, z) });
      }
    };
    scatterCut(makeGrass, 16, 'grass');
    scatterCut(makePot, 7, 'pot');

    // ambient seagulls wheeling overhead
    for (let i = 0; i < 5; i++) { const g = Models.enemy('gull'); g.node.scaling.setAll(0.5);
      gulls.push({ node: g.node, idle: g.idle, cx: (Math.random()*2-1)*def.size*0.3, cz: (Math.random()*2-1)*def.size*0.3, rad: 6 + Math.random()*9, ang: Math.random()*6.28, spd: 0.4 + Math.random()*0.4, y: 7 + Math.random()*5 }); }

    // player avatar = the active party leader
    const leaderKey = Game.state.active[0] || 'pirate'; const leaderModel = Progress.def(leaderKey).model;
    const leaderWeapon = (Game.state.equip[leaderKey] || {}).weapon;
    const hero = Models[leaderModel] ? Models[leaderModel](leaderWeapon) : Models.hero(); player = hero.node; playerArm = hero.arm || hero.staffPiv || null;
    Models.cosmetic(player, (Game.state.equip[leaderKey] || {}).accessory);
    // pick a swing motion from the equipped weapon's style: slash / bonk / stab / punch / crack
    const style = (Models.weaponSpec ? Models.weaponSpec(leaderKey, leaderWeapon).style : 'sword');
    const MOTION = { sword: 'slash', bigsword: 'slash', katana: 'slash', scimitar: 'slash', staff: 'bonk', wand: 'bonk', lance: 'stab', bow: 'stab', fist: 'punch', whip: 'crack' };
    swingCat = MOTION[style] || 'slash';
    swingDur = { slash: 0.3, bonk: 0.42, stab: 0.26, punch: 0.2, crack: 0.32 }[swingCat];
    armBaseX = (swingCat === 'stab') ? 1.4 : 1.0; armBaseZ = playerArm ? playerArm.position.z : 0;
    if (playerArm) playerArm.rotation.x = armBaseX; // rest the weapon instead of holding it straight out
    player.position.set(Game.state.location.x, 0, Game.state.location.z);
    cam = new BABYLON.UniversalCamera('wcam', new V3(0, 18, -16), scene); cam.fov = 0.8;

    if (window.Render) Render.setup(scene, cam, { skyTop: (def.sky && def.sky.top) || '#234a86', skyHorizon: (def.sky && def.sky.horizon) || '#cfe9f5', sun });
    scene.onBeforeRenderObservable.add(update);
    return scene;
  }

  function update() {
    if (paused || (window.Game && Game.blocking && Game.blocking())) return;
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    // hit-stop: brief freeze on contact for a satisfying "thunk", then resume
    if (freeze > 0) { freeze -= dt; cam.position.set(player.position.x + Math.sin(camYaw) * 16, 18, player.position.z - Math.cos(camYaw) * 16); cam.setTarget(player.position.add(new V3(0, 1, 0))); return; }
    if (Input.down('KeyQ')) camYaw -= 1.7 * dt;
    if (Input.down('KeyE')) camYaw += 1.7 * dt;
    if (swingT > 0 && playerArm) { swingT -= dt; animateSwing(1 - Math.max(0, swingT) / swingDur); if (swingT <= 0) restArm(); }
    // animate cut debris + slash arcs, dispose when spent
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i]; d.life -= dt;
      if (d.life <= 0) { d.node.dispose(); debris.splice(i, 1); continue; }
      if (d.arc) { const k = d.life / d.max; d.mat.alpha = 0.85 * k; d.node.scaling.setAll(1 + (1 - k) * 0.6); if (d.sweep != null) d.node.rotation.y = d.sweep + 0.7 - (1 - k) * 1.4; }
      else { d.node.position.x += d.vx * dt; d.node.position.z += d.vz * dt; d.vy -= 14 * dt; d.node.position.y = Math.max(0.05, d.node.position.y + d.vy * dt); d.node.rotation.y += d.spin * dt; d.node.rotation.x += d.spin * dt; }
    }
    let mx = 0, mz = 0;
    if (Input.down('KeyW') || Input.down('ArrowUp')) mz += 1;
    if (Input.down('KeyS') || Input.down('ArrowDown')) mz -= 1;
    if (Input.down('KeyA') || Input.down('ArrowLeft')) mx -= 1;
    if (Input.down('KeyD') || Input.down('ArrowRight')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      const fX = -Math.sin(camYaw), fZ = Math.cos(camYaw), rX = Math.cos(camYaw), rZ = Math.sin(camYaw);
      const wx = mx*rX + mz*fX, wz = mx*rZ + mz*fZ;
      player.position.x += wx*SPEED*dt; player.position.z += wz*SPEED*dt;
      const rad = rlim(), d = Math.hypot(player.position.x, player.position.z);
      if (d > rad) { player.position.x *= rad/d; player.position.z *= rad/d; }
      player.rotation.y = Math.atan2(wx, wz); player.position.y = Math.abs(Math.sin(t*10))*0.12;
    } else if (swingT <= 0) player.position.y = 0;
    Game.state.location.x = player.position.x; Game.state.location.z = player.position.z;

    idlers.forEach(o => o.idle && o.idle(t));
    // wavy water
    if (water && waterBase) { const wp = water.getVerticesData(BABYLON.VertexBuffer.PositionKind); for (let i = 0; i < wp.length; i += 3) { const x = waterBase[i], z = waterBase[i+2]; wp[i+1] = Math.sin(x*0.06 + t*1.1)*0.55 + Math.cos(z*0.08 + t*0.9)*0.5 + Math.sin((x+z)*0.04 + t*0.5)*0.3; } water.updateVerticesData(BABYLON.VertexBuffer.PositionKind, wp); }
    // wheeling seagulls
    gulls.forEach(g => { g.ang += g.spd * dt; g.node.position.set(g.cx + Math.cos(g.ang)*g.rad, g.y + Math.sin(t + g.ang)*0.4, g.cz + Math.sin(g.ang)*g.rad); g.node.rotation.y = -g.ang + Math.PI/2; if (g.idle) g.idle(t * 3); });

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
      if (nearGate.kind === 'town') label = `[F / Tap] Enter ${nearGate.name}`;
      else if (nearGate.kind === 'dungeon') label = `[F / Tap] Enter ${nearGate.name}${nearGate.solved ? ' (cleared)' : ''}`;
      else if (nearGate.kind === 'dock') label = '[F / Tap] Board the ship';
      else if (nearGate.kind === 'shells') label = '[F / Tap] Hunt for shells';
      else if (nearGate.kind === 'mermaid') label = `[F / Tap] Talk to ${nearGate.name} 💗`;
      else if (nearGate.kind === 'boss') label = Game.state.prog.finalWin ? '[F / Tap] The spire is silent' : Game.state.prog.krakenDown ? '[F / Tap] Confront Selachoth' : '[F / Tap] Challenge the Kraken';
      else if (nearGate.kind === 'bonfire') label = '[F / Tap] Rest at the bonfire 🔥';
      else if (nearGate.kind === 'superboss') label = '[F / Tap] Approach the strange figure…';
      else if (nearGate.kind === 'coliseum') label = '[F / Tap] Enter the Coliseum 🏛️';
      prompt.textContent = label; prompt.classList.add('show');
    } else prompt.classList.remove('show');

    const off = 16; cam.position.set(player.position.x + Math.sin(camYaw)*off, 18, player.position.z - Math.cos(camYaw)*off);
    cam.setTarget(player.position.add(new V3(0, 1, 0)));
    Game.updateHUD(); drawMinimap();
  }

  function drawMinimap() {
    const cv = document.getElementById('minimap'); if (!cv) return; const c = cv.getContext('2d'); const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H); const R = def.size * 0.54, sc = (W * 0.46) / R, cx = W / 2, cy = H / 2;
    const px = (x, z) => [cx + x * sc, cy + z * sc];
    c.fillStyle = def.ground; c.beginPath(); c.arc(cx, cy, R * sc, 0, 7); c.fill();
    const COL = { town: '#8fd3f4', dungeon: '#9be7ff', dock: '#ffffff', shells: '#ffd166', mermaid: '#ff9ec0', boss: '#ff5e5e' };
    gates.forEach(g => { const [gx, gy] = px(g.pos.x, g.pos.z); c.fillStyle = COL[g.kind] || '#fff'; c.beginPath(); c.arc(gx, gy, 3, 0, 7); c.fill(); });
    roamers.forEach(r => { if (!r.node.isEnabled()) return; const [rx, ry] = px(r.node.position.x, r.node.position.z); c.fillStyle = '#ff4040'; c.fillRect(rx - 1.5, ry - 1.5, 3, 3); });
    const [Px, Py] = px(player.position.x, player.position.z); c.fillStyle = '#fde047'; c.beginPath(); c.arc(Px, Py, 4, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  }

  // per-style swing animation, driven by p (0 at windup → 1 at follow-through).
  // sword SLASHES across, staff BONKS overhead, lance/bow STAB forward, fist jabs, whip cracks.
  function animateSwing(p) {
    if (!playerArm) return; const a = playerArm; a.position.z = armBaseZ;
    switch (swingCat) {
      case 'slash':
        // hold the blade out horizontally in front, then YAW the arm across the body:
        // a flat left-to-right cut at chest height (Zelda-style), not a vertical pendulum
        a.rotation.x = 0.1 + Math.sin(p * Math.PI) * 0.2;   // arm forward ~horizontal, slight dip mid-swing
        a.rotation.z = 0;
        a.rotation.y = (0.5 - p) * 2.8;                     // sweep from the right side across to the left
        break;
      case 'bonk':   a.rotation.z = 0; a.rotation.y = 0; a.rotation.x = -1.0 + (p * p) * 2.7; break;                                                  // overhead chop down
      case 'crack':  a.rotation.z = 0; a.rotation.y = 0; a.rotation.x = -0.8 + Math.sqrt(p) * 2.5; break;                                            // whip snap
      case 'punch':  a.rotation.x = 1.4; a.rotation.z = 0; a.rotation.y = 0; a.position.z = armBaseZ + Math.sin(p * Math.PI * 2) * 0.45; break;        // double jab
      case 'stab':   a.rotation.x = 1.45; a.rotation.z = 0; a.rotation.y = 0; a.position.z = armBaseZ + Math.sin(p * Math.PI) * 0.7; break;            // forward thrust
      default:       a.rotation.x = 0.2 + Math.sin(p * Math.PI) * 1.3;
    }
  }
  function restArm() { if (!playerArm) return; playerArm.rotation.set(armBaseX, 0, 0); playerArm.position.z = armBaseZ; }

  // a quick fading FX shaped to match the swing: a horizontal crescent for slashes,
  // a vertical arc for bonks, a forward streak for stabs.
  function swingFX() {
    const fX = Math.sin(player.rotation.y), fZ = Math.cos(player.rotation.y);
    let node, sweep = null, m = new BABYLON.StandardMaterial('fxM', scene); m.emissiveColor = new Color3(1, 1, 0.92); m.diffuseColor = new Color3(0, 0, 0); m.alpha = 0.9;
    if (swingCat === 'stab' || swingCat === 'punch') {
      node = MB.CreateCylinder('fx', { height: 1.9, diameterTop: 0.05, diameterBottom: 0.5, tessellation: 8 }, scene);
      node.rotation.x = Math.PI / 2; node.rotation.y = -player.rotation.y; node.position.set(player.position.x + fX * 1.7, 1.0, player.position.z + fZ * 1.7);
    } else {
      node = MB.CreateTorus('fx', { diameter: 2.9, thickness: 0.22, tessellation: 20, arc: 0.5 }, scene);
      node.position.set(player.position.x + fX * 1.2, 1.05, player.position.z + fZ * 1.2);
      if (swingCat === 'bonk' || swingCat === 'crack') { node.rotation.y = player.rotation.y + Math.PI / 2; node.rotation.z = Math.PI * 0.25; } // vertical arc facing forward
      else { node.rotation.x = Math.PI / 2; node.rotation.y = player.rotation.y + 0.7; sweep = player.rotation.y; }                                  // flat crescent that sweeps across the front
    }
    node.material = m; node.isPickable = false;
    debris.push({ node, mat: m, arc: true, life: 0.22, max: 0.22, sweep: sweep });
  }

  // burst of little fragments that fly out + fall — sells the "it broke" feeling
  function spawnDebris(pos, color, n) {
    const mat = M('bit', color, { spec: 0 });
    for (let i = 0; i < n; i++) {
      const b = MB.CreateBox('bit', { size: 0.12 + Math.random() * 0.12 }, scene); b.material = mat;
      b.position.set(pos.x, 0.4 + Math.random() * 0.4, pos.z);
      const a = Math.random() * 6.28, sp = 1.5 + Math.random() * 2.5;
      debris.push({ node: b, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 2.5 + Math.random() * 2, life: 0.7, max: 0.7, spin: (Math.random() - 0.5) * 12 });
    }
  }
  // bright impact pop + sparks when the swing lands on an enemy
  function impactBurst(pos) {
    const fl = MB.CreateSphere('impact', { diameter: 1.4 }, scene); const m = new BABYLON.StandardMaterial('impM', scene); m.emissiveColor = new Color3(1, 0.95, 0.8); m.diffuseColor = new Color3(0, 0, 0); m.alpha = 0.85; m.alphaMode = BABYLON.Engine.ALPHA_ADD; fl.material = m; fl.isPickable = false; fl.position.copyFrom(pos); fl.position.y = 1.0;
    debris.push({ node: fl, mat: m, arc: true, life: 0.16, max: 0.16 });
    spawnDebris(new V3(pos.x, 0.8, pos.z), '#fff0b0', 7);
  }

  // overworld weapon swing — slice grass, smash pots, and land a first-strike on roamers with real contact
  function attack() {
    if (paused || locked || swingT > 0) return;
    swingT = swingDur; if (window.SFX) SFX.play('slash'); swingFX();
    const fX = Math.sin(player.rotation.y), fZ = Math.cos(player.rotation.y);
    const inArc = (ox, oz, reach) => { const dx = ox - player.position.x, dz = oz - player.position.z; const dist = Math.hypot(dx, dz); if (dist > reach) return false; return dist <= 0.7 || (dx * fX + dz * fZ) / dist >= 0.3; };
    let smashedPot = false, cutGrass = false;
    for (const c of cuttables) {
      if (!c.node.isEnabled() || !inArc(c.node.position.x, c.node.position.z, 2.5)) continue;
      c.node.setEnabled(false);
      spawnDebris(c.node.position, c.color, c.type === 'pot' ? 9 : 6);
      if (c.type === 'pot') {
        smashedPot = true;
        const g = 6 + Math.floor(Math.random() * 11); Game.state.gold += g; Game.toast('⛃ +' + g);
        if (Math.random() < 0.3) { const mk = ['sand', 'shellfrag', 'feather'][Math.floor(Math.random() * 3)]; Progress.addMaterials(Game.state, { [mk]: 1 }); }
      } else { cutGrass = true; if (Math.random() < 0.2) Game.state.gold += 1 + Math.floor(Math.random() * 3); }
    }
    if (smashedPot && window.SFX) SFX.play('smash');
    else if (cutGrass && window.SFX) SFX.play('cut');
    if (smashedPot || cutGrass) { Progress.save(Game.state); Game.updateHUD(); }
    // contact with a roamer: impact pop + knockback + hit-stop, THEN open battle with first strike
    let best = null, bd = 3.4;
    for (const r of roamers) { if (!r.node.isEnabled() || !inArc(r.node.position.x, r.node.position.z, 3.4)) continue; const d = V3.Distance(r.node.position, player.position); if (d < bd) { bd = d; best = r; } }
    if (best) {
      if (window.SFX) SFX.play('hit');
      impactBurst(best.node.position);
      const kb = best.node.position.subtract(player.position); if (kb.length() < 0.1) kb.set(fX, 0, fZ); kb.normalize();
      best.node.position.addInPlace(kb.scale(0.8));
      freeze = 0.1; locked = true; // lock so movement can't cancel the impact
      setTimeout(() => { locked = false; startRoamerBattle(best, true); }, 150);
    }
  }

  function startRoamerBattle(r, firstStrike) {
    const music = key === 'paegina' ? 'paegina' : null; // null → startBattle cycles through the battle themes
    locked = true; paused = true;
    if (firstStrike) Game.toast('First strike!');
    Game.startBattle(Data.randomEncounter(r.enc), { firstStrike: !!firstStrike, music: music }, (res) => {
      if (res.won) { Game.state.islands[key].cleared['e' + r.idx] = true; r.node.setEnabled(false); Progress.save(Game.state); }
      else { const dir = player.position.subtract(r.node.position); if (dir.length() < 0.1) dir.set(0,0,-1); dir.normalize(); player.position.addInPlace(dir.scale(4)); Game.state.location.x = player.position.x; Game.state.location.z = player.position.z; }
      paused = false; locked = false; Game.resumeIsland();
    });
  }

  function fightBoss(enemies, opts, onWin) {
    locked = true; paused = true; Music.play('battle');
    Game.startBattle(enemies, Object.assign({ boss: true }, opts || {}), (res) => {
      paused = false; locked = false; Game.resumeIsland();
      if (res.won) onWin(); else { player.position.z -= 4; Game.state.location.x = player.position.x; Game.state.location.z = player.position.z; }
    });
  }
  // second wave of the finale: swap to Ruffy's strike team and fight OMEGA, restoring
  // the lineup afterwards whether you win or lose.
  function finalStage2(team) {
    const restore = (team && team.length) ? Game.state.active.slice() : null;
    if (restore) { team.forEach(k => Progress.recruit(Game.state, k, 4)); Game.state.active = team.slice(0, 4); }
    Progress.fullHeal(Game.state); Progress.save(Game.state);
    locked = true; paused = true; Music.play('boss');
    Game.startBattle(['selachoth_omega'], { boss: true, fullLimit: true }, (res) => {
      if (restore) { Game.state.active = restore; Progress.save(Game.state); }
      paused = false; locked = false; Game.resumeIsland();
      if (res.won) { Game.state.prog.finalWin = true; Progress.save(Game.state); Game.startCutscene('omegaFall', () => Game.finalEnding()); }
      else { player.position.z -= 4; Game.state.location.x = player.position.x; Game.state.location.z = player.position.z; }
    });
  }
  // ACT III FINAL TRIAL — the Drowned Spire. Two crews brave two branches of the spire,
  // one after the other, then converge on Selachoth and the Omega Tide. Gated on having
  // freed enough heroes from the cursed isles to field two crews of 3–4.
  function finalTrial() {
    const st = Game.state;
    const ALLY_DUN = { simon: 'vampire_keep', aladdin: 'genie_cave', violca: 'dragon_vale', mac: 'frost_station', sane: 'spirit_wood', quijano: 'mill_keep', lydia: 'neitherworld' };
    const cleared = k => { const d = ALLY_DUN[k]; return !!(st.dungeons[d] || st.dungeons[d + '_boss']); };
    const freed = Object.keys(ALLY_DUN).filter(cleared).length;
    const roster = 3 + freed + (st.party.find(p => p.key === 'ruffy' && p.recruited) ? 1 : 0); // core 3 + freed heroes (+ruffy)
    if (freed < 3 || roster < 6) {
      Game.toast("The spire's final door won't open — you need two full crews. Free more heroes from the cursed isles first.");
      return;
    }
    Game.confirm('The spire descends into two flooded branches before Selachoth\'s heart. Send TWO crews — one down each branch — then face the Omega Tide together. Assemble them?', () => {
      Game.chooseTwoParties((A, B) => {
        const restore = st.active.slice();
        const setActive = team => { team.forEach(k => Progress.recruit(st, k, 4)); st.active = team.slice(0, 4); Progress.fullHeal(st); Progress.save(st); };
        const bail = () => { st.active = restore; Progress.save(st); paused = false; locked = false; Game.resumeIsland(); player.position.z -= 4; };
        const runOmega = () => { // crews converge: Selachoth breaks, then the Omega Tide rises
          setActive(A); locked = true; paused = true; Music.play('boss');
          Game.startBattle(['selachoth'], { boss: true, fullLimit: true }, (res) => {
            if (!res.won) return bail();
            setActive(B); Music.play('boss');
            Game.startBattle(['selachoth_omega'], { boss: true, fullLimit: true }, (r2) => {
              if (!r2.won) return bail();
              st.active = restore; st.prog.finalWin = true; Progress.save(st);
              paused = false; locked = false; Game.resumeIsland(); Game.finalEnding();
            });
          });
        };
        const branchB = () => {
          setActive(B); locked = true; paused = true; Music.play('boss');
          Game.startBattle(['angler'], { boss: true }, (res) => { if (!res.won) return bail(); Game.toast('The drowned branch is cleared. The crews converge on Selachoth\'s heart...'); runOmega(); });
        };
        setActive(A); locked = true; paused = true; Music.play('boss');
        Game.startBattle(['leviathan'], { boss: true }, (res) => { if (!res.won) return bail(); Game.toast('The first branch is cleared. Send your second crew down the flooded stair...'); branchB(); });
      });
    });
  }
  function ambush() {
    locked = true; paused = true; Music.play('boss');
    Game.toast('⚠ SOMETHING ERUPTS FROM THE SURF...');
    const key = Data.AMBUSH[Math.floor(Math.random() * Data.AMBUSH.length)];
    Game.startBattle([key], { boss: true, ambush: true }, () => { paused = false; locked = false; Game.resumeIsland(); });
  }
  const ruffyHere = () => { const r = Game.state.party.find(p => p.key === 'ruffy'); return r && r.recruited; };

  function interact() {
    if (paused || locked || !nearGate) return;
    const g = nearGate;
    if (g.kind === 'town') return Game.enterTown(g.key);
    if (g.kind === 'dungeon') return Game.toDungeon(g.key);
    if (g.kind === 'dock') return Game.toSea();
    if (g.kind === 'shells') return Game.openShellHunt();
    if (g.kind === 'mermaid') return Game.openDating(g.key);
    if (g.kind === 'bonfire') return Game.startCutscene('coveBonfire', () => { Progress.fullHeal(Game.state); Progress.save(Game.state); Game.toast('Fully rested. The crew is renewed.'); });
    if (g.kind === 'coliseum') return Game.openColiseum();
    if (g.kind === 'superboss') {
      return Game.confirm('Challenge GILGAMUCK, the Drifter? He is a brutal optional superboss — come prepared.', () => {
        Game.startCutscene('drifterPre', () => fightBoss([g.key], { fullLimit: true }, () => {
          Game.state.prog.coveBossDown = true; Progress.addShell(Game.state, 'star_conch'); Progress.save(Game.state);
          Game.startCutscene('drifterFall', () => Game.toast('The Star Conch is yours. Equip it from the Gear menu!'));
        }));
      });
    }
    if (g.kind === 'boss') {
      if (Game.state.prog.finalWin) return Game.toast('Selachoth is no more, and the Omega Tide has ebbed. The sea is yours.');
      if (!Game.state.prog.krakenDown) {
        Game.confirm('Enter the Maw and challenge the KRAKEN, guardian of the spire?', () => fightBoss(['kraken'], {}, () => {
          Game.state.prog.krakenDown = true; Progress.save(Game.state);
          const afterCouncil = () => {
            if (ruffyHere()) Game.startCutscene('ruffyLeave', () => { Progress.dismiss(Game.state, 'ruffy'); Progress.save(Game.state); Game.toast('The spire glows cold. Return to confront Selachoth.'); });
            else Game.toast('The spire glows cold. Return to confront Selachoth.');
          };
          Game.startCutscene('krakenFall', () => Game.startCutscene('mermaidCouncil', afterCouncil));
        }));
      } else {
        finalTrial();   // Act III: two crews, two branches of the Drowned Spire, then Selachoth + the Omega Tide
      }
    }
  }

  function enter(islandKey) { build(islandKey); Game.active = { interact, attack }; return scene; }
  function focus() { Game.active = { interact, attack }; }
  function pause() { paused = true; }
  function resume() { paused = false; locked = false; }

  // debug hooks for the capture harness — teleport to/near cuttables and trigger a swing
  const _debug = {
    warp(x, z, faceY) { if (!player) return; player.position.x = x; player.position.z = z; if (faceY != null) player.rotation.y = faceY; Game.state.location.x = x; Game.state.location.z = z; },
    swing() { attack(); },
    cuttable(type) { const c = cuttables.find(o => o.node.isEnabled() && (!type || o.type === type)); return c ? { x: c.pos.x, z: c.pos.z } : null; },
    setCamYaw(y) { camYaw = y; }
  };
  return { enter, focus, pause, resume, getScene: () => scene, currentKey: () => key, _debug };
})();
