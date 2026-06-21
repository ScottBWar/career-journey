// =====================================================================
//  Sea — sail the ship between islands. Steer with WASD/arrows; sail up to
//  an island and press E / tap to land.
// =====================================================================
window.Sea = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, ship, engine, ocean, oceanBase;
  let isles = [], idlers = [], foes = [], paused = false, locked = false, nearTarget = null, t = 0, buoy = null, coveBuoy = null, camYaw = 0;
  let horror = null, horrorT = 0; // a rare, huge roaming deep-sea terror

  // shaped landmasses on the chart — mirrors the on-island footprints so the map reads
  // like a real world map (distinct silhouettes), not a field of identical green dots.
  const SHAPES = { round: [1, 1], long: [1.45, 0.72], wide: [0.72, 1.45], oval: [1.25, 0.85], teardrop: [0.9, 1.3],
    crescent: [1.1, 0.95], twin: [1.18, 0.86], star: [1, 1], clover: [1.04, 1.04], fin: [1.06, 0.98], horn: [1.22, 0.82], wedge: [1.18, 0.86], spiral: [1.08, 0.98] };
  const RF = {
    crescent: a => 1 - 0.30 * Math.pow(Math.max(0, Math.cos(a)), 2),
    twin:     a => 0.85 + 0.20 * Math.abs(Math.cos(a)),
    star:     a => 1 + 0.14 * Math.sin(a * 6),
    clover:   a => 1 + 0.16 * Math.cos(a * 3),
    fin:      a => 1 + 0.26 * Math.max(0, Math.sin(a)),
    horn:     a => 1 + 0.20 * Math.sin(a * 2 + 0.8),
    wedge:    a => 0.82 + 0.32 * ((Math.cos(a) + 1) / 2),
    spiral:   a => 1 + 0.16 * Math.sin(a + Math.cos(a) * 1.4),
  };
  function shapeDisc(mesh, shp, yaw, rf, amp) {
    mesh.rotation.x = Math.PI / 2; mesh.rotation.y = yaw; mesh.scaling.x = shp[0]; mesh.scaling.y = shp[1];
    const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) { const a = Math.atan2(pos[i + 1], pos[i]); let f = 1 + Math.sin(a * 5) * amp + Math.sin(a * 11 + 1.3) * amp * 0.5; if (rf) f *= rf(a); pos[i] *= f; pos[i + 1] *= f; }
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
  }
  // draw one charted island: shaped land + beach, palms, and (for town isles) a little skyline
  function chartIsland(key, idef, x, z, markerColor) {
    const shp = SHAPES[idef.shape] || SHAPES.round, yaw = idef.shapeYaw || 0, rf = RF[idef.shape];
    const landR = idef.town ? 11.5 : (idef.dungeon ? 7.5 : 9), beachR = landR + 2.2;
    const land = MB.CreateDisc('isle', { radius: landR, tessellation: 48 }, scene); shapeDisc(land, shp, yaw, rf, 0.06); land.position.set(x, 0.05, z); land.material = M('isle', idef.ground);
    const beach = MB.CreateDisc('beach', { radius: beachR, tessellation: 48 }, scene); shapeDisc(beach, shp, yaw, rf, 0.06); beach.position.set(x, 0.0, z); beach.material = M('beach', idef.sand);
    const palmN = idef.town ? 5 : (idef.dungeon ? 2 : 3);
    for (let i = 0; i < palmN; i++) { const a = Math.random() * 6.28, rr = Math.random() * landR * 0.6; const p = Models.palm(); p.node.position.set(x + Math.cos(a) * rr, 0.05, z + Math.sin(a) * rr); }
    if (idef.town) { // a few rooftops so town isles read as larger, lived-in places
      for (let i = 0; i < 3; i++) { const b = MB.CreateBox('twn', { width: 1.5, height: 1.4 + Math.random() * 1.6, depth: 1.5 }, scene); b.material = M('twn', i % 2 ? '#d8c39a' : '#bd8f66'); b.position.set(x + (Math.random() * 7 - 3.5), 0.8, z - (1 + Math.random() * 3.5));
        const roof = MB.CreateCylinder('twnroof', { height: 0.9, diameterTop: 0, diameterBottom: 2.1, tessellation: 4 }, scene); roof.material = M('twnroof', '#a14b3a'); roof.parent = b; roof.position.y = 1.0; roof.rotation.y = Math.PI / 4; }
    }
    const dockOff = beachR + 0.6;
    const mk = Models.portal(markerColor); mk.node.position.set(x, 0.1, z + dockOff); mk.node._baseY = 0.1; idlers.push(mk);
    const sg = Models.sign(idef.name); sg.node.position.set(x, 0.05, z + landR * 0.5);
    isles.push({ key, name: idef.name, pos: new V3(x, 0, z), dock: new V3(x, 0, z + dockOff), r: beachR + 3 });
  }
  let ruffyShip = null;           // Ruffy's straw-hat ship — chases you down for a duel, then joins
  const SPEED = 11;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function buildShip(hullHex, sailHex, flagEmoji, ghost) {
    const r = new BABYLON.TransformNode('ship', scene);
    const a = ghost ? 0.55 : 1;
    const wood = M('shWood', hullHex, { alpha: a }), wood2 = M('shWood2', '#3a2a18', { alpha: a }), sail = M('shSail', sailHex, { alpha: a });
    const hull = MB.CreateCylinder('hull', { height: 4.2, diameterTop: 2.2, diameterBottom: 1.2, tessellation: 10 }, scene); hull.rotation.x = Math.PI/2; hull.scaling.z = 0.55; hull.material = wood; hull.parent = r; hull.position.y = 0.5;
    const deck = MB.CreateCylinder('deck', { height: 0.2, diameter: 2.0, tessellation: 10 }, scene); deck.scaling.x = 0.7; deck.material = wood2; deck.parent = r; deck.position.set(0, 0.9, 0);
    const mast = MB.CreateCylinder('mast', { height: 4, diameter: 0.18 }, scene); mast.material = wood2; mast.parent = r; mast.position.set(0, 2.6, 0);
    const s1 = MB.CreateBox('sail', { width: 0.1, height: 1.8, depth: 2.2 }, scene); s1.material = sail; s1.parent = r; s1.position.set(0, 3.0, 0);
    const s2 = MB.CreateBox('sail2', { width: 0.1, height: 1.2, depth: 1.6 }, scene); s2.material = sail; s2.parent = r; s2.position.set(0, 1.7, 0.1);
    if (flagEmoji) { // flag as a tiny dynamic-texture banner
      const dt = new BABYLON.DynamicTexture('fl', { width: 64, height: 64 }, scene, false); dt.hasAlpha = true; const c = dt.getContext(); c.font = '48px sans'; c.textAlign = 'center'; c.fillText(flagEmoji, 32, 48); dt.update();
      const fm = new BABYLON.StandardMaterial('flm', scene); fm.diffuseTexture = dt; fm.diffuseTexture.hasAlpha = true; fm.emissiveColor = new Color3(1,1,1); fm.specularColor = new Color3(0,0,0); fm.backFaceCulling = false;
      const flag = MB.CreatePlane('flag', { size: 0.9 }, scene); flag.material = fm; flag.parent = r; flag.position.set(0, 4.5, 0); flag.rotation.y = Math.PI/2;
    }
    return r;
  }

  function build() {
    engine = Game.engine;
    if (scene) scene.dispose();
    isles = []; idlers = []; foes = []; nearTarget = null; t = 0; paused = false; locked = false; coveBuoy = null; horror = null; horrorT = 0; ruffyShip = null;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.55, 0.78, 0.95); scene.fogDensity = 0.004;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.6; hemi.groundColor = new Color3(0.25, 0.4, 0.5);
    const sun = new BABYLON.DirectionalLight("s", new V3(-0.5, -1, 0.3), scene); sun.intensity = 1.3; sun.specular = new Color3(1, 0.95, 0.85);

    ocean = MB.CreateGround('ocean', { width: 360, height: 360, subdivisions: 48 }, scene);
    ocean.material = M('ocean', '#1e6f96', { spec: 0.7 }); ocean.material.specularPower = 64; ocean.position.y = -0.2;
    oceanBase = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();

    Data.SEA.islands.forEach(isle => {
      chartIsland(isle.key, Data.ISLANDS[isle.key], isle.x, isle.z, isle.key === 'spire' ? '#ff5e5e' : '#ffe066');
    });

    // secret cove — a hidden bottle until charted, then a landable isle
    const cv = Data.SEA.cove;
    if (cv) {
      if (Game.state.flags && Game.state.flags.coveFound) {
        chartIsland('cove', Data.ISLANDS.cove, cv.x, cv.z, '#ff9ec0');
      } else {
        const bot = Models.portal('#9be7ff'); bot.node.position.set(cv.x, 0.1, cv.z); bot.node._baseY = 0.1; idlers.push(bot);
        coveBuoy = new V3(cv.x, 0, cv.z);
      }
    }

    // roaming enemy ships
    foes = [];
    (Data.SEA.ships || []).forEach(sp => {
      if (Game.state.shipsSunk[sp.id]) return;
      const e = Data.ENEMY_SHIPS[sp.type];
      const node = buildShip(e.hull, e.sail, e.flag, e.ghost); node.position.set(sp.x, 0, sp.z);
      foes.push({ id: sp.id, type: sp.type, node, home: new V3(sp.x, 0, sp.z), ang: Math.random() * Math.PI * 2, spd: e.ghost ? 3.4 : 2.6, ghost: e.ghost });
    });

    // Ruffy's ship — a one-time rival who hunts you across the open sea, then duels his way into the crew
    if (!Game.state.flags.ruffyMet && !Game.state.prog.ruffyGone) {
      const node = buildShip('#d43a2a', '#f2e8c8', '👒', false);
      const hat = MB.CreateCylinder('strawhat', { height: 0.3, diameterTop: 1.1, diameterBottom: 1.1, tessellation: 16 }, scene); hat.material = M('straw', '#e8c66a', { spec: 0.1 }); hat.parent = node; hat.position.set(0, 1.05, -1.3);
      const crown = MB.CreateCylinder('crown', { height: 0.5, diameter: 0.6, tessellation: 14 }, scene); crown.material = hat.material; crown.parent = node; crown.position.set(0, 1.25, -1.3);
      const band = MB.CreateTorus('hatband', { diameter: 0.62, thickness: 0.08, tessellation: 14 }, scene); band.material = M('hatband', '#c0392b'); band.parent = node; band.position.set(0, 1.2, -1.3); band.rotation.x = Math.PI / 2;
      const a = Math.random() * Math.PI * 2;
      node.position.set(Game.state.location.shipX + Math.cos(a) * 46, 0, Game.state.location.shipZ + Math.sin(a) * 46);
      ruffyShip = { node, spd: 10.5, hailed: false };
    }

    // shipwright buoy (open the shipyard)
    const b = Models.portal('#ffd166'); b.node.position.set(Data.SEA.spawn.x + 6, 0.1, Data.SEA.spawn.z); b.node._baseY = 0.1; idlers.push(b);
    const bs = Models.sign('Shipwright'); bs.node.position.set(Data.SEA.spawn.x + 6, 0.05, Data.SEA.spawn.z - 2);
    buoy = new V3(Data.SEA.spawn.x + 6, 0, Data.SEA.spawn.z);

    ship = buildShip(Game.state.ship.hull, Game.state.ship.sail, Game.state.ship.flag, false);
    ship.position.set(Game.state.location.shipX, 0, Game.state.location.shipZ);
    cam = new BABYLON.UniversalCamera('scam', new V3(0, 22, -20), scene); cam.fov = 0.85;

    if (window.Render) Render.setup(scene, cam, { skyTop: '#1c4f8a', skyHorizon: '#bfe0f0', sun });
    scene.onBeforeRenderObservable.add(update);
    return scene;
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
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; const fX=-Math.sin(camYaw), fZ=Math.cos(camYaw), rX=Math.cos(camYaw), rZ=Math.sin(camYaw); const wx=mx*rX+mz*fX, wz=mx*rZ+mz*fZ; ship.position.x += wx*SPEED*dt; ship.position.z += wz*SPEED*dt; const rad = Data.SEA.size*0.5; const d = Math.hypot(ship.position.x, ship.position.z); if (d > rad) { ship.position.x *= rad/d; ship.position.z *= rad/d; } ship.rotation.y = Math.atan2(wx, wz); }
    ship.position.y = Math.sin(t * 1.5) * 0.18; ship.rotation.z = Math.sin(t * 1.1) * 0.04;
    Game.state.location.shipX = ship.position.x; Game.state.location.shipZ = ship.position.z;

    idlers.forEach(o => o.idle && o.idle(t));

    // roaming enemy ships + collision
    for (const f of foes) {
      if (!f.node.isEnabled()) continue;
      f.node.position.x += Math.sin(f.ang) * f.spd * dt; f.node.position.z += Math.cos(f.ang) * f.spd * dt;
      f.node.position.y = Math.sin(t * 1.3 + f.spd) * 0.18; f.node.rotation.y = f.ang + Math.PI/2;
      if (V3.Distance(f.node.position, f.home) > 14) f.ang = Math.atan2(f.home.x - f.node.position.x, f.home.z - f.node.position.z);
      if (Math.random() < 0.008) f.ang += (Math.random() - 0.5);
      if (!locked && V3.Distance(f.node.position, ship.position) < 5) { startShipFight(f); return; }
    }
    // discover the secret cove (the floating bottle)
    if (!locked && coveBuoy && V3.Distance(ship.position, coveBuoy) < 4) {
      locked = true; paused = true; coveBuoy = null;
      Game.startCutscene('coveDiscover', () => {
        Game.state.flags.coveFound = true; Progress.save(Game.state);
        const sc = build(); Game.scene = sc; Game.active = { interact }; paused = false; locked = false;
      });
      return;
    }
    // rare deep-sea HORROR: it surfaces far off, then stalks the ship across the map
    if (!locked && !horror && Math.random() < 0.0007) spawnHorror();
    if (horror && !locked) {
      horrorT += dt;
      const dir = ship.position.subtract(horror.node.position); const d = dir.length(); if (d > 0.1) { dir.x /= d; dir.z /= d; }
      horror.node.position.x += dir.x * horror.spd * dt; horror.node.position.z += dir.z * horror.spd * dt;
      horror.node.position.y = -1.3 + Math.sin(t * 0.7) * 0.5;            // mostly submerged, breaching
      horror.node.rotation.y = Math.atan2(dir.x, dir.z);
      if (horror.idle) horror.idle(t);
      if (d < 6) { startHorrorFight(); return; }
      if (horrorT > 24) despawnHorror();                                  // it sinks back into the deep — a near miss
    }

    // Ruffy's ship homes in relentlessly until he gets his duel
    if (ruffyShip && !locked) {
      const dir = ship.position.subtract(ruffyShip.node.position); const d = dir.length(); if (d > 0.1) { dir.x /= d; dir.z /= d; }
      ruffyShip.node.position.x += dir.x * ruffyShip.spd * dt; ruffyShip.node.position.z += dir.z * ruffyShip.spd * dt;
      ruffyShip.node.position.y = Math.sin(t * 1.4) * 0.18; ruffyShip.node.rotation.y = Math.atan2(dir.x, dir.z); ruffyShip.node.rotation.z = Math.sin(t * 1.0) * 0.05;
      if (!ruffyShip.hailed && d < 24) { ruffyShip.hailed = true; Game.toast('A ship flying a straw-hat flag is closing fast!'); }
      if (d < 7) { startRuffyEncounter(); return; }
    }

    // animate ocean
    const pos = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) { const x = oceanBase[i], z = oceanBase[i+2]; pos[i+1] = Math.sin(x*0.1 + t*1.2)*0.65 + Math.cos(z*0.13 + t*0.95)*0.6 + Math.sin((x+z)*0.05 + t*0.6)*0.35; }
    ocean.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);

    nearTarget = null;
    for (const isle of isles) { if (V3.Distance(ship.position, isle.pos) < isle.r) { nearTarget = { kind: 'island', isle }; break; } }
    if (!nearTarget && buoy && V3.Distance(ship.position, buoy) < 4) nearTarget = { kind: 'shipyard' };
    const prompt = document.getElementById('worldPrompt');
    if (nearTarget) { prompt.textContent = nearTarget.kind === 'island' ? `[F / Tap] Land at ${nearTarget.isle.name}` : '[F / Tap] Visit the Shipwright'; prompt.classList.add('show'); } else prompt.classList.remove('show');

    const off = 20; cam.position.set(ship.position.x + Math.sin(camYaw)*off, 22, ship.position.z - Math.cos(camYaw)*off); cam.setTarget(ship.position.add(new V3(0, 1, 0)));
    Game.updateHUD(); drawMinimap();
  }

  function startShipFight(f) {
    locked = true; paused = true;
    Game.startShipBattle(f.type, (res) => {
      if (res.won) { Game.state.shipsSunk[f.id] = true; f.node.setEnabled(false); Progress.save(Game.state); }
      else { const dir = ship.position.subtract(f.node.position); if (dir.length() < 0.1) dir.set(0,0,1); dir.normalize(); ship.position.addInPlace(dir.scale(8)); }
      paused = false; locked = false; Game.resumeSea();
    });
  }

  function startRuffyEncounter() {
    locked = true; paused = true;
    Game.startCutscene('ruffyChase', () => {
      Game.startBattle(['ruffy_duel'], { boss: true, music: 'theme_ruffy' }, (res) => {
        const join = () => {
          Progress.recruit(Game.state, 'ruffy', 4); Game.state.flags.ruffyMet = true; Progress.save(Game.state);
          if (ruffyShip && ruffyShip.node) { ruffyShip.node.dispose(); ruffyShip = null; }
          paused = false; locked = false; Game.resumeSea();
          Game.toast('Ruffy joins the crew!');
        };
        if (res.won) Game.startCutscene('ruffyJoin', join, { music: 'theme_ruffy' });
        else { paused = false; locked = false; Game.resumeSea(); } // a loss just sends you back — he'll try again
      });
    }, { music: 'theme_ruffy' });
  }

  function drawMinimap() {
    const cv = document.getElementById('minimap'); if (!cv) return; const c = cv.getContext('2d'); const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H); const R = Data.SEA.size * 0.5, sc = (W * 0.46) / R, cx = W / 2, cy = H / 2;
    const px = (x, z) => [cx + x * sc, cy + z * sc];
    c.fillStyle = '#0e3550'; c.beginPath(); c.arc(cx, cy, W * 0.47, 0, 7); c.fill();
    isles.forEach(i => { const [ix, iy] = px(i.pos.x, i.pos.z); c.fillStyle = i.key === 'spire' ? '#ff8a6a' : '#7fd06a'; c.beginPath(); c.arc(ix, iy, 4, 0, 7); c.fill(); });
    foes.forEach(f => { if (!f.node.isEnabled()) return; const [fx, fy] = px(f.node.position.x, f.node.position.z); c.fillStyle = f.ghost ? '#bfe6e0' : '#ff5e5e'; c.fillRect(fx - 1.5, fy - 1.5, 3, 3); });
    if (horror && horror.node) { const [hx, hy] = px(horror.node.position.x, horror.node.position.z); c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(hx, hy, 5 + Math.sin(t * 6) * 1.5, 0, 7); c.fill(); }
    if (ruffyShip && ruffyShip.node) { const [rx, ry] = px(ruffyShip.node.position.x, ruffyShip.node.position.z); c.fillStyle = '#ff9a3a'; c.beginPath(); c.arc(rx, ry, 4, 0, 7); c.fill(); }
    const [Px, Py] = px(ship.position.x, ship.position.z); c.fillStyle = '#fde047'; c.beginPath(); c.arc(Px, Py, 4, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  }
  function spawnHorror() {
    const key = Data.AMBUSH[Math.floor(Math.random() * Data.AMBUSH.length)];
    const built = Models.enemy(key); built.node.scaling.setAll(2.6);
    const a = Math.random() * Math.PI * 2;
    built.node.position.set(ship.position.x + Math.cos(a) * 34, -1.3, ship.position.z + Math.sin(a) * 34);
    horror = { key, node: built.node, idle: built.idle, spd: 3.2 + Math.random() * 1.2 }; horrorT = 0;
    Game.toast('⚠ Something VAST surfaces in the distance, and turns toward you...');
    if (window.SFX) SFX.play('door');
  }
  function despawnHorror() { if (horror && horror.node) horror.node.dispose(); horror = null; }
  function startHorrorFight() {
    locked = true; paused = true; Music.play('boss');
    Game.toast('IT HAS FOUND YOU.');
    const key = horror.key; despawnHorror();
    Game.startBattle([key], { boss: true, ambush: true }, () => { paused = false; locked = false; Game.resumeSea(); });
  }
  function interact() {
    if (paused || locked || !nearTarget) return;
    if (nearTarget.kind === 'island') { if (window.SFX) SFX.play('confirm'); Game.toIsland(nearTarget.isle.key, true); }
    else if (nearTarget.kind === 'shipyard') { Game.openShipyard(); }
  }
  function enter() { build(); Game.active = { interact }; if (window.SFX) SFX.play('sail'); return scene; }
  function focus() { Game.active = { interact }; }
  function pause() { paused = true; }
  function resume() { paused = false; locked = false; }

  return { enter, focus, pause, resume, getScene: () => scene };
})();
