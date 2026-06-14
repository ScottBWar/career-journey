// =====================================================================
//  Sea — sail the ship between islands. Steer with WASD/arrows; sail up to
//  an island and press E / tap to land.
// =====================================================================
window.Sea = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, ship, engine, ocean, oceanBase;
  let isles = [], idlers = [], foes = [], paused = false, locked = false, nearTarget = null, t = 0, buoy = null, camYaw = 0;
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
    isles = []; idlers = []; foes = []; nearTarget = null; t = 0; paused = false; locked = false;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.55, 0.78, 0.95); scene.fogDensity = 0.004;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.98; hemi.groundColor = new Color3(0.3, 0.45, 0.5);
    const sun = new BABYLON.DirectionalLight('s', new V3(-0.5, -1, 0.3), scene); sun.intensity = 1.0;

    ocean = MB.CreateGround('ocean', { width: 360, height: 360, subdivisions: 48 }, scene);
    ocean.material = M('ocean', '#1e6f96', { spec: 0.7 }); ocean.material.specularPower = 64; ocean.position.y = -0.2;
    oceanBase = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();

    Data.SEA.islands.forEach(isle => {
      const idef = Data.ISLANDS[isle.key];
      const land = MB.CreateDisc('isle', { radius: 9, tessellation: 32 }, scene); land.rotation.x = Math.PI/2; land.position.set(isle.x, 0.05, isle.z); land.material = M('isle', idef.ground);
      const beach = MB.CreateDisc('beach', { radius: 11, tessellation: 32 }, scene); beach.rotation.x = Math.PI/2; beach.position.set(isle.x, 0.0, isle.z); beach.material = M('beach', idef.sand);
      // a couple of palms + a marker
      for (let i = 0; i < 3; i++) { const p = Models.palm(); p.node.position.set(isle.x + (Math.random()*8-4), 0.05, isle.z + (Math.random()*8-4)); }
      const mk = Models.portal(isle.key === 'spire' ? '#ff5e5e' : '#ffe066'); mk.node.position.set(isle.x, 0.1, isle.z + 7); mk.node._baseY = 0.1; idlers.push(mk);
      const sg = Models.sign(idef.name); sg.node.position.set(isle.x, 0.05, isle.z + 5);
      isles.push({ key: isle.key, name: idef.name, pos: new V3(isle.x, 0, isle.z), dock: new V3(isle.x, 0, isle.z + 7), r: 12 });
    });

    // roaming enemy ships
    foes = [];
    (Data.SEA.ships || []).forEach(sp => {
      if (Game.state.shipsSunk[sp.id]) return;
      const e = Data.ENEMY_SHIPS[sp.type];
      const node = buildShip(e.hull, e.sail, e.flag, e.ghost); node.position.set(sp.x, 0, sp.z);
      foes.push({ id: sp.id, type: sp.type, node, home: new V3(sp.x, 0, sp.z), ang: Math.random() * Math.PI * 2, spd: e.ghost ? 3.4 : 2.6, ghost: e.ghost });
    });

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

    // animate ocean
    const pos = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) { const x = oceanBase[i], z = oceanBase[i+2]; pos[i+1] = Math.sin(x*0.12 + t*1.1)*0.4 + Math.cos(z*0.15 + t*0.9)*0.4; }
    ocean.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);

    nearTarget = null;
    for (const isle of isles) { if (V3.Distance(ship.position, isle.pos) < isle.r) { nearTarget = { kind: 'island', isle }; break; } }
    if (!nearTarget && buoy && V3.Distance(ship.position, buoy) < 4) nearTarget = { kind: 'shipyard' };
    const prompt = document.getElementById('worldPrompt');
    if (nearTarget) { prompt.textContent = nearTarget.kind === 'island' ? `[F / Tap] Land at ${nearTarget.isle.name}` : '[F / Tap] Visit the Shipwright'; prompt.classList.add('show'); } else prompt.classList.remove('show');

    const off = 20; cam.position.set(ship.position.x + Math.sin(camYaw)*off, 22, ship.position.z - Math.cos(camYaw)*off); cam.setTarget(ship.position.add(new V3(0, 1, 0)));
    Game.updateHUD();
  }

  function startShipFight(f) {
    locked = true; paused = true;
    Game.startShipBattle(f.type, (res) => {
      if (res.won) { Game.state.shipsSunk[f.id] = true; f.node.setEnabled(false); Progress.save(Game.state); }
      else { const dir = ship.position.subtract(f.node.position); if (dir.length() < 0.1) dir.set(0,0,1); dir.normalize(); ship.position.addInPlace(dir.scale(8)); }
      paused = false; locked = false; Game.resumeSea();
    });
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
