// =====================================================================
//  Sea — sail the ship between islands. Steer with WASD/arrows; sail up to
//  an island and press E / tap to land.
// =====================================================================
window.Sea = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, ship, engine, ocean, oceanBase;
  let isles = [], idlers = [], paused = false, nearIsle = null, t = 0;
  const SPEED = 11;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function buildShip() {
    const r = new BABYLON.TransformNode('ship', scene);
    const wood = M('shWood', '#7a5230'), wood2 = M('shWood2', '#5b3a1e'), sail = M('shSail', '#f3ead9'), sail2 = M('shSail2', '#d9c7a0');
    const hull = MB.CreateCylinder('hull', { height: 4.2, diameterTop: 2.2, diameterBottom: 1.2, tessellation: 10 }, scene); hull.rotation.x = Math.PI/2; hull.scaling.z = 0.55; hull.material = wood; hull.parent = r; hull.position.y = 0.5;
    const deck = MB.CreateCylinder('deck', { height: 0.2, diameter: 2.0, tessellation: 10 }, scene); deck.scaling.x = 0.7; deck.material = wood2; deck.parent = r; deck.position.set(0, 0.9, 0);
    const mast = MB.CreateCylinder('mast', { height: 4, diameter: 0.18 }, scene); mast.material = wood2; mast.parent = r; mast.position.set(0, 2.6, 0);
    const s1 = MB.CreateBox('sail', { width: 0.1, height: 1.8, depth: 2.2 }, scene); s1.material = sail; s1.parent = r; s1.position.set(0, 3.0, 0);
    const s2 = MB.CreateBox('sail2', { width: 0.1, height: 1.2, depth: 1.6 }, scene); s2.material = sail2; s2.parent = r; s2.position.set(0, 1.7, 0.1);
    const flag = MB.CreateBox('flag', { width: 0.05, height: 0.4, depth: 0.6 }, scene); flag.material = M('shFlag', '#d83a3a'); flag.parent = r; flag.position.set(0, 4.5, 0.3);
    return r;
  }

  function build() {
    engine = Game.engine;
    if (scene) scene.dispose();
    isles = []; idlers = []; nearIsle = null; t = 0; paused = false;
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

    ship = buildShip();
    ship.position.set(Game.state.location.shipX, 0, Game.state.location.shipZ);
    cam = new BABYLON.UniversalCamera('scam', new V3(0, 22, -20), scene); cam.fov = 0.85;

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
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; ship.position.x += mx*SPEED*dt; ship.position.z += mz*SPEED*dt; const rad = Data.SEA.size*0.5; const d = Math.hypot(ship.position.x, ship.position.z); if (d > rad) { ship.position.x *= rad/d; ship.position.z *= rad/d; } ship.rotation.y = Math.atan2(mx, mz); }
    ship.position.y = Math.sin(t * 1.5) * 0.18; ship.rotation.z = Math.sin(t * 1.1) * 0.04;
    Game.state.location.shipX = ship.position.x; Game.state.location.shipZ = ship.position.z;

    idlers.forEach(o => o.idle && o.idle(t));

    // animate ocean
    const pos = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) { const x = oceanBase[i], z = oceanBase[i+2]; pos[i+1] = Math.sin(x*0.12 + t*1.1)*0.4 + Math.cos(z*0.15 + t*0.9)*0.4; }
    ocean.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);

    nearIsle = null;
    for (const isle of isles) { if (V3.Distance(ship.position, isle.pos) < isle.r) { nearIsle = isle; break; } }
    const prompt = document.getElementById('worldPrompt');
    if (nearIsle) { prompt.textContent = `[E / Tap] Land at ${nearIsle.name}`; prompt.classList.add('show'); } else prompt.classList.remove('show');

    cam.position.set(ship.position.x, 22, ship.position.z - 20); cam.setTarget(ship.position.add(new V3(0, 1, 3)));
    Game.updateHUD();
  }

  function interact() { if (paused || !nearIsle) return; if (window.SFX) SFX.play('confirm'); Game.toIsland(nearIsle.key, true); }
  function enter() { build(); Game.active = { interact }; if (window.SFX) SFX.play('sail'); return scene; }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene };
})();
