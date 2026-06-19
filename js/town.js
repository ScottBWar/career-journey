// =====================================================================
//  Town — walkable town scenes. Approach NPCs and press E / tap to talk.
//  Innkeepers rest the party; merchants open the shop. Walk south to exit.
// =====================================================================
window.Town = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine, def, key;
  let npcs = [], idlers = [], paused = false, t = 0, nearNPC = null, nearExit = false, camYaw = 0;
  let doors = [], nearDoor = null, inHouse = false, exitPos = null, returnDoor = null;
  const SPEED = 8, SP = 1.7; // SP = layout spread factor (de-jam the towns)

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); if (opt.alpha != null) m.alpha = opt.alpha; return m; }

  // each town has a distinct look: sky/light tint + a signature set of scenery
  const TOWN_THEME = { tidehaven: 'coast', dunesport: 'desert', mall: 'mall', bazaar: 'bazaar', aerie: 'aerie', argo: 'greek' };
  const TOWN_ENV = {
    coast:  { sky: ['#3a5a9a', '#cfe6f0'], hemi: '#4a5a6a', plaza: '#c9b48a' },
    desert: { sky: ['#c97a2a', '#f3e0b0'], hemi: '#6a5436', plaza: '#e0c890' },
    mall:   { sky: ['#5a3a8a', '#f0c8e8'], hemi: '#5a4a6a', plaza: '#c0b4d0' },
    bazaar: { sky: ['#d88a3a', '#ffe1a0'], hemi: '#6a5236', plaza: '#d8c090' },
    aerie:  { sky: ['#3a4f7a', '#c8b4d8'], hemi: '#46506a', plaza: '#9aa0ac' },
    greek:  { sky: ['#3a7ab0', '#f3ead0'], hemi: '#5a6068', plaza: '#e8e0cc' },
  };
  function townProp(theme) {
    const ring = (n, rad, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.4; fn(Math.cos(a) * rad, Math.sin(a) * rad, a, i); } };
    const box = (w, h, d, x, y, z, col, opt) => { const b = MB.CreateBox('tp', { width: w, height: h, depth: d }, scene); b.material = M('tp', col, opt || {}); b.position.set(x, y, z); return b; };
    const cyl = (h, dt, db, x, y, z, col, opt) => { const c = MB.CreateCylinder('tp', { height: h, diameterTop: dt, diameterBottom: db, tessellation: (opt && opt.tess) || 12 }, scene); c.material = M('tp', col, opt || {}); c.position.set(x, y, z); return c; };
    const sph = (d, x, y, z, col, opt) => { const s = MB.CreateSphere('tp', { diameter: d }, scene); s.material = M('tp', col, opt || {}); s.position.set(x, y, z); return s; };
    if (theme === 'coast') {
      ring(10, 28, (x, z) => { const p = Models.palm(); p.node.position.set(x, 0, z); if (p.idle) idlers.push(p); });
      ring(6, 17, (x, z) => box(1.0, 1.1, 1.0, x, 0.55, z, '#7a5230'));                       // barrels
      ring(4, 21, (x, z, a) => box(2.6, 0.08, 1.6, x, 0.06, z, '#5a6a3a').rotation.y = a);     // fishing nets
    } else if (theme === 'desert') {
      ring(8, 26, (x, z) => { cyl(2.4, 0.5, 0.7, x, 1.2, z, '#4a7a3a'); [-1, 1].forEach(s => { const arm = cyl(1.1, 0.3, 0.4, x + s * 0.55, 1.5, z, '#4a7a3a'); arm.rotation.z = s * 0.8; }); }); // cacti
      ring(6, 18, (x, z, a) => { const aw = box(3.0, 0.12, 2.2, x, 2.5, z, ['#c0392c', '#caa030', '#3a7a8a'][Math.floor(Math.random() * 3)]); aw.rotation.y = a; }); // market awnings
      ring(11, 33, (x, z) => sph(3.4, x, -0.9, z, '#d8b878'));                                  // half-buried dunes
    } else if (theme === 'mall') {
      ring(10, 24, (x, z, a, i) => cyl(4.2, 0.3, 0.3, x, 2.1, z, ['#ff5e9a', '#5effd0', '#caa0ff'][i % 3], { emissive: ['#ff2a7a', '#2fffb0', '#9a5aff'][i % 3] })); // neon pylons
      ring(6, 31, (x, z, a) => { const b = box(0.2, 3.0, 2.0, x, 1.8, z, '#3a3f6b'); b.rotation.y = a; }); // banners
    } else if (theme === 'bazaar') {
      ring(8, 24, (x, z, a, i) => { const t = cyl(2.8, 0, 3.4, x, 1.4, z, ['#c0392c', '#caa030', '#3a8a8a', '#a05aa0'][i % 4], { tess: 4 }); t.rotation.y = a; }); // striped tents
      ring(12, 30, (x, z) => { const l = sph(0.42, x, 3.0, z, '#ffd24a', { emissive: '#ffb000' }); idlers.push({ idle(tt) { l.position.y = 3.0 + Math.sin(tt * 2 + x) * 0.15; } }); }); // lanterns
      ring(5, 14, (x, z) => { const c = MB.CreateDisc('rug', { radius: 1.6, tessellation: 6 }, scene); c.rotation.x = Math.PI / 2; c.position.set(x, 0.02, z); c.material = M('rug', ['#7a2a3a', '#2a4a7a', '#7a5a1a'][Math.floor(Math.random() * 3)]); }); // carpets
    } else if (theme === 'aerie') {
      ring(8, 26, (x, z) => box(1.4, 5.2, 1.4, x, 2.6, z, '#8a92a0'));                          // stone obelisks
      ring(4, 18, (x, z) => { cyl(4.6, 0.15, 0.15, x, 2.3, z, '#3a2a18'); box(0.1, 2.0, 1.2, x, 3.1, z, '#6a2a3a'); }); // war-banners
      ring(3, 12, (x, z) => { sph(1.3, x, 0.8, z, '#5a3a6a'); cyl(1.1, 0, 0.5, x, 1.9, z, '#5a3a6a'); }); // dragon-skull cairns
    } else if (theme === 'greek') {
      ring(10, 26, (x, z) => { cyl(5.2, 0.7, 0.8, x, 2.6, z, '#efe7d2'); box(1.2, 0.3, 1.2, x, 5.3, z, '#e0d8c0'); box(1.2, 0.3, 1.2, x, 0.16, z, '#e0d8c0'); }); // marble columns
      ring(5, 20, (x, z) => { const t = Models.tree(); t.node.position.set(x, 0, z); t.node.scaling.setAll(0.85); if (t.idle) idlers.push(t); }); // olive trees
      ring(4, 15, (x, z) => cyl(1.5, 0.5, 0.95, x, 0.75, z, '#caa030'));                        // urns
      ring(2, 11, (x, z) => { box(0.95, 2.4, 0.6, x, 1.2, z, '#e8e0d0'); sph(0.62, x, 2.6, z, '#e8e0d0'); }); // marble statues
    }
  }

  // a building whose silhouette matches the island's vibe (door always faces +z)
  function buildExterior(theme, b, bx, bz) {
    const r = new BABYLON.TransformNode('bld', scene); r.position.set(bx, 0, bz);
    const put = (mesh, m, x, y, z) => { mesh.material = m; mesh.parent = r; mesh.position.set(x, y, z); return mesh; };
    const door = (col) => put(MB.CreateBox('door', { width: 1.1, height: 1.95, depth: 0.12 }, scene), M('dr', col || '#4a2e16'), 0, 0.97, 2.52);
    const win = (x, y) => put(MB.CreateBox('win', { width: 0.7, height: 0.7, depth: 0.1 }, scene), M('wn', '#9be7ff', { emissive: '#3a6a80' }), x, y, 2.52);
    if (theme === 'desert' || theme === 'bazaar') {
      put(MB.CreateBox('w', { width: 5, height: 3.4, depth: 5 }, scene), M('w', theme === 'bazaar' ? '#d8b878' : '#dcc28a'), 0, 1.7, 0);
      put(MB.CreateBox('roof', { width: 5.3, height: 0.4, depth: 5.3 }, scene), M('rf', '#c9a86a'), 0, 3.5, 0);
      put(MB.CreateBox('para', { width: 5.3, height: 0.7, depth: 0.3 }, scene), M('pp', '#c9a86a'), 0, 3.9, 2.6);
      door('#5a3a1e'); win(-1.5, 1.95); win(1.5, 1.95);
      if (theme === 'bazaar') { put(MB.CreateSphere('dome', { diameter: 3.0, slice: 0.5 }, scene), M('dm', '#caa030', { emissive: '#3a2e08' }), 0, 3.6, 0); const aw = put(MB.CreateBox('awn', { width: 2.4, height: 0.1, depth: 1.4 }, scene), M('aw', '#c0392c'), 0, 2.4, 3.0); aw.rotation.x = 0.3; }
    } else if (theme === 'greek') {
      put(MB.CreateBox('w', { width: 4.6, height: 3.0, depth: 4.4 }, scene), M('w', '#efe7d2'), 0, 1.7, -0.1);
      [-1.7, -0.57, 0.57, 1.7].forEach(x => put(MB.CreateCylinder('col', { height: 3.5, diameterTop: 0.42, diameterBottom: 0.5, tessellation: 12 }, scene), M('col', '#f4eee0'), x, 1.75, 2.4));
      put(MB.CreateBox('entab', { width: 5.2, height: 0.5, depth: 5.0 }, scene), M('en', '#e8e0cc'), 0, 3.6, 0);
      const ped = put(MB.CreateCylinder('ped', { height: 5.2, diameterTop: 0, diameterBottom: 1.7, tessellation: 3 }, scene), M('pd', '#efe7d2'), 0, 4.2, 0.6); ped.rotation.z = Math.PI / 2; ped.rotation.y = Math.PI / 2;
      put(MB.CreateBox('step', { width: 5.4, height: 0.3, depth: 1.0 }, scene), M('st', '#e0d8c0'), 0, 0.15, 2.9);
      door('#6a5a3a');
    } else if (theme === 'aerie') {
      put(MB.CreateBox('w', { width: 4.8, height: 4.6, depth: 4.8 }, scene), M('w', '#8a92a0'), 0, 2.3, 0);
      for (let i = -2; i <= 2; i++) put(MB.CreateBox('cr', { width: 0.7, height: 0.7, depth: 0.7 }, scene), M('cr', '#7a828e'), i * 1.05, 4.8, 2.0);
      door('#3a3a44'); put(MB.CreateBox('ban', { width: 0.1, height: 1.7, depth: 0.95 }, scene), M('bn', '#6a2a3a'), 1.7, 2.7, 2.5);
    } else if (theme === 'mall') {
      put(MB.CreateBox('w', { width: 5, height: 3.3, depth: 5 }, scene), M('w', '#c4bcd6'), 0, 1.65, 0);
      put(MB.CreateBox('glass', { width: 4.2, height: 2.2, depth: 0.1 }, scene), M('gl', '#7fd0ff', { emissive: '#2a5a7a' }), 0, 1.5, 2.52);
      put(MB.CreateBox('trim', { width: 5.3, height: 0.22, depth: 5.3 }, scene), M('tr', '#ff5e9a', { emissive: '#ff2a7a' }), 0, 3.4, 0);
      door('#3a3f6b');
    } else { // coast / default — the pitched-roof cottage
      const h = Models.house({ wall: b.wall || (b.kind === 'inn' ? '#e8d5b0' : '#e0d2b0'), roof: b.roof || (b.kind === 'inn' ? '#3a7a5a' : b.kind === 'shop' ? '#7a5aa0' : '#a0492f'), w: 5, d: 5 });
      h.node.parent = r; h.node.position.set(0, 0, 0);
    }
    return r;
  }

  function build(townKey) {
    key = townKey; def = Data.TOWNS[townKey];
    engine = Game.engine;
    if (scene) scene.dispose();
    npcs = []; idlers = []; nearNPC = null; nearExit = false; t = 0;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.7, 0.7, 0.8); scene.fogDensity = 0.008;
    Models.use(scene);

    const theme = TOWN_THEME[key] || 'coast', env = TOWN_ENV[theme] || TOWN_ENV.coast;
    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.55; hemi.groundColor = Color3.FromHexString(env.hemi);
    const sun = new BABYLON.DirectionalLight("s", new V3(-0.45, -1, 0.3), scene); sun.intensity = 1.3; sun.specular = new Color3(1, 0.95, 0.85);

    inHouse = false; doors = []; nearDoor = null;
    const ground = MB.CreateGround('g', { width: 90, height: 90 }, scene); ground.material = M('g', def.ground);
    const plaza = MB.CreateDisc('plaza', { radius: 8, tessellation: 32 }, scene); plaza.rotation.x = Math.PI/2; plaza.position.y = 0.01; plaza.material = M('plaza', env.plaza);
    // surrounding sea hint
    const sea = MB.CreateGround('sea', { width: 240, height: 240 }, scene); sea.material = M('sea', '#1e6f96'); sea.position.set(0, -0.4, -56);

    // buildings — themed exteriors per island, all enterable; shop/inn keepers wait INSIDE
    const usedNpc = new Set();
    def.buildings.forEach((b, bi) => {
      const bx = b.x * SP, bz = b.z * SP;
      buildExterior(theme, b, bx, bz);
      if (b.kind === 'inn') placeSign(bx, bz + 3.2, 'INN');
      else if (b.kind === 'shop') placeSign(bx, bz + 3.2, (b.label || 'SHOP').toUpperCase());
      // a shop/inn finds its nearest unclaimed keeper to stand behind the counter inside
      let keeper = null;
      if (b.kind === 'shop' || b.kind === 'inn') {
        let best = -1, bd = 1e9;
        def.npcs.forEach((n, ni) => { if (usedNpc.has(ni) || n.service !== b.kind) return; const dx = n.x * SP - bx, dz = n.z * SP - bz, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = ni; } });
        if (best >= 0) { usedNpc.add(best); keeper = def.npcs[best]; }
        else keeper = b.kind === 'inn' ? { name: 'Innkeeper', service: 'inn', color: '#a05a3a', lines: ['Rest here to fully restore your party.'] } : { name: 'Shopkeeper', service: 'shop', color: '#7a5aa0', lines: ['Browse my wares, traveler.'] };
      }
      doors.push({ x: bx, z: bz + 3.2, idx: bi, kind: b.kind, label: b.label, keeper });
    });

    // exit marker (south)
    exitPos = new V3(def.exit.x * SP, 0, def.exit.z * SP);
    const exitPortal = Models.portal('#8fd3f4'); exitPortal.node.position.copyFrom(exitPos); exitPortal.node._baseY = 0; idlers.push(exitPortal);
    const exitSign = Models.sign('Leave Town'); exitSign.node.position.set(exitPos.x, 0, exitPos.z - 1.8);

    // NPCs that aren't shop/inn keepers (flavour folk + special services) stand outside
    def.npcs.forEach((n, i) => {
      if (usedNpc.has(i)) return;
      const nx = n.x * SP, nz = n.z * SP;
      const m = Models.npc(n.color, n.hair, def.npcStyle); m.node.position.set(nx, 0, nz); m.node._baseY = 0; m.node._ph = i; m.node.rotation.y = Math.PI;
      idlers.push(m);
      npcs.push({ data: n, node: m.node, pos: new V3(nx, 0, nz) });
    });

    // player = the active party leader (consistent with overworld)
    const leaderKey = Game.state.active[0] || 'pirate'; const leaderModel = Progress.def(leaderKey).model;
    const hero = Models[leaderModel] ? Models[leaderModel]((Game.state.equip[leaderKey] || {}).weapon) : Models.hero(); player = hero.node;
    Models.cosmetic(player, (Game.state.equip[leaderKey] || {}).accessory);
    if (hero.arm) hero.arm.rotation.x = 1.0;
    if (returnDoor) { player.position.set(returnDoor.x, 0, returnDoor.z + 1.4); returnDoor = null; }
    else player.position.set(exitPos.x, 0, exitPos.z + 3);
    cam = new BABYLON.UniversalCamera('tcam', new V3(0, 15, -14), scene); cam.fov = 0.85;

    townProp(theme);
    if (window.Render) Render.setup(scene, cam, { skyTop: env.sky[0], skyHorizon: env.sky[1], sun });
    scene.onBeforeRenderObservable.add(update);
    return scene;

    function placeSign(x, z, label) { const s = Models.sign(label); s.node.position.set(x, 0, z); }
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
    const lim = inHouse ? 7.5 : 40;
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; const fX=-Math.sin(camYaw), fZ=Math.cos(camYaw), rX=Math.cos(camYaw), rZ=Math.sin(camYaw); const wx=mx*rX+mz*fX, wz=mx*rZ+mz*fZ; player.position.x = clamp(player.position.x + wx*SPEED*dt, -lim, lim); player.position.z = clamp(player.position.z + wz*SPEED*dt, -lim, lim); player.rotation.y = Math.atan2(wx, wz); player.position.y = Math.abs(Math.sin(t*10))*0.12; }
    else player.position.y = 0;

    idlers.forEach(o => o.idle && o.idle(t));

    nearNPC = null;
    for (const n of npcs) { if (V3.Distance(player.position, n.pos) < 2.2) { nearNPC = n; n.node.lookAt(new V3(player.position.x, n.node.position.y, player.position.z)); break; } }
    nearDoor = null;
    if (!nearNPC && !inHouse) for (const d of doors) { if (V3.Distance(player.position, new V3(d.x, 0, d.z)) < 2.2) { nearDoor = d; break; } }
    nearExit = !nearNPC && !nearDoor && V3.Distance(player.position, exitPos) < 2.2;

    const prompt = document.getElementById('worldPrompt');
    if (nearNPC) { prompt.textContent = `[F / Tap] Talk to ${nearNPC.data.name}`; prompt.classList.add('show'); }
    else if (nearDoor) { const k = nearDoor.kind; prompt.textContent = '[F / Tap] Enter ' + (k === 'shop' ? 'the ' + (nearDoor.label || 'Shop') : k === 'inn' ? 'the Inn' : 'the house'); prompt.classList.add('show'); }
    else if (nearExit) { prompt.textContent = inHouse ? '[F / Tap] Step outside' : '[F / Tap] Leave town'; prompt.classList.add('show'); }
    else prompt.classList.remove('show');

    const off = 14; cam.position.set(player.position.x + Math.sin(camYaw)*off, 15, player.position.z - Math.cos(camYaw)*off);
    cam.setTarget(player.position.add(new V3(0, 1, 0)));
    Game.updateHUD();
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function interact() {
    if (paused) return;
    if (nearNPC) { Game.talk(nearNPC.data); }
    else if (nearDoor) { enterHouse(nearDoor); }
    else if (nearExit) { if (inHouse) leaveHouse(); else Game.resumeIsland(); }
  }

  // ---- house interiors (a cosy shared room you can actually walk into) ----
  const HOME_FOLK = [
    { name: 'A Cosy Resident', lines: ['Oh! A hero, in MY little home? Make yourself comfortable.', 'Mind the cat. She bites adventurers.'] },
    { name: 'An Old Fisherman', lines: ['Used to sail the deep myself, before my knees gave out.', 'Warm hearth, full belly — that\'s the real treasure, friend.'] },
    { name: 'A Sleepy Child', lines: ['Are you a REAL adventurer? Whoaaa.', 'When I grow up I\'m gonna fight a kraken too!'] },
    { name: 'A Town Weaver', lines: ['Spinning sailcloth and stories, that\'s my trade.', 'Stay out of the rain and the monsters\' reach, eh?'] },
  ];
  function buildInterior(door) {
    if (scene) scene.dispose();
    npcs = []; idlers = []; nearNPC = null; nearDoor = null; nearExit = false; t = 0; inHouse = true;
    const shop = door.keeper && door.keeper.service === 'shop', inn = door.keeper && door.keeper.service === 'inn';
    scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    Models.use(scene);
    new BABYLON.HemisphericLight('hi', new V3(0.2, 1, 0.1), scene).intensity = 0.7;
    const lamp = new BABYLON.PointLight('lamp', new V3(0, 4, 0), scene); lamp.intensity = 0.6; lamp.diffuse = new Color3(1, 0.85, 0.6);
    // room
    const floor = MB.CreateGround('fl', { width: 15, height: 13 }, scene); floor.material = M('fl', shop ? '#6a5236' : inn ? '#7a5a3a' : '#8a6a44');
    const wallM = M('wall', shop ? '#b0a488' : inn ? '#caa078' : '#c8b49a');
    const wall = (w, h, d, x, y, z) => { const b = MB.CreateBox('w', { width: w, height: h, depth: d }, scene); b.material = wallM; b.position.set(x, y, z); };
    wall(15, 4, 0.4, 0, 2, -6.5); wall(0.4, 4, 13, -7.3, 2, 0); wall(0.4, 4, 13, 7.3, 2, 0);
    wall(5, 4, 0.4, -5, 2, 6.5); wall(5, 4, 0.4, 5, 2, 6.5);
    const wood = M('wood', '#5a3a1e');
    let occName = '#b07a4a', occHair = '#3a2418', occPos = new V3(-2, 0, 1.5), occData;
    if (shop) {
      // a counter to stand behind + a wall of stocked shelves
      at(MB.CreateBox('counter', { width: 6.0, height: 1.1, depth: 1.0 }, scene), null, wood, 0, 0.55, -1.0);
      at(MB.CreateBox('ctop', { width: 6.2, height: 0.16, depth: 1.2 }, scene), null, M('ctop', '#7a5230'), 0, 1.15, -1.0);
      for (let s = 0; s < 3; s++) at(MB.CreateBox('shelf', { width: 9, height: 0.16, depth: 0.7 }, scene), null, wood, 0, 1.2 + s * 1.0, -6.1);
      const wares = ['#e05a5a', '#5e8bff', '#5eff8b', '#ffd24a', '#b06aff'];
      for (let s = 0; s < 3; s++) for (let i = 0; i < 9; i++) at(MB.CreateCylinder('jar', { height: 0.5, diameter: 0.28 }, scene), null, M('jar', wares[(i + s) % wares.length], { emissive: '#1a1a1a' }), -4 + i, 1.55 + s * 1.0, -6.0);
      occPos = new V3(0, 0, -2.6); occData = door.keeper;
    } else if (inn) {
      [-1, 1].forEach(s => { at(MB.CreateBox('bed', { width: 1.8, height: 0.6, depth: 3.0 }, scene), null, M('bed', '#3a5a8a'), s * 4.6, 0.4, -3); at(MB.CreateBox('pillow', { width: 1.5, height: 0.3, depth: 0.8 }, scene), null, M('pl', '#e8e0d0'), s * 4.6, 0.8, -4); });
      const fire = at(MB.CreateSphere('fire', { diameter: 0.7 }, scene), null, M('fire', '#ff7b3a', { emissive: '#ff7b3a' }), 0, 0.8, -6); idlers.push({ idle(tt) { fire.scaling.setAll(1 + Math.sin(tt * 8) * 0.18); } });
      at(MB.CreateBox('hearth', { width: 2.4, height: 1.4, depth: 0.8 }, scene), null, M('hearth', '#6a6a72'), 0, 0.7, -6.3);
      occPos = new V3(-1.5, 0, 0.5); occData = door.keeper;
    } else {
      at(MB.CreateGround('rug', { width: 5, height: 4 }, scene), null, M('rug', '#7a2a3a'), 0, 0.02, 0);
      at(MB.CreateBox('table', { width: 2.2, height: 0.3, depth: 1.2 }, scene), null, wood, -2, 1.2, -2);
      at(MB.CreateBox('bed', { width: 2.0, height: 0.6, depth: 3.2 }, scene), null, M('bed', '#3a5a8a'), 4.5, 0.4, -3);
      const fire = at(MB.CreateSphere('fire', { diameter: 0.7 }, scene), null, M('fire', '#ff7b3a', { emissive: '#ff7b3a' }), 0, 0.7, -5.8); idlers.push({ idle(tt) { fire.scaling.setAll(1 + Math.sin(tt * 8) * 0.18); } });
      at(MB.CreateBox('hearth', { width: 2.4, height: 1.4, depth: 0.8 }, scene), null, M('hearth', '#6a6a72'), 0, 0.7, -6);
      occData = HOME_FOLK[(door.idx + key.length) % HOME_FOLK.length];
    }
    const occ = Models.npc((occData && occData.color) || occName, (occData && occData.hair) || occHair, (Data.TOWNS[key] || {}).npcStyle); occ.node.position.copyFrom(occPos); occ.node._baseY = 0; occ.node.rotation.y = Math.PI; idlers.push(occ);
    npcs.push({ data: occData, node: occ.node, pos: occPos.clone() });
    // exit (south doorway)
    exitPos = new V3(0, 0, 6.2);
    const ex = Models.portal('#8fd3f4'); ex.node.position.set(0, 0, 6.2); ex.node._baseY = 0; idlers.push(ex);
    Models.sign('Step Outside').node.position.set(0, 0, 5.0);
    // player
    const leaderKey = Game.state.active[0] || 'pirate'; const lm = Progress.def(leaderKey).model;
    const hero = Models[lm] ? Models[lm]((Game.state.equip[leaderKey] || {}).weapon) : Models.hero(); player = hero.node;
    Models.cosmetic(player, (Game.state.equip[leaderKey] || {}).accessory);
    if (hero.arm) hero.arm.rotation.x = 1.0;
    player.position.set(0, 0, 4.5);
    cam = new BABYLON.UniversalCamera('hcam', new V3(0, 12, -11), scene); cam.fov = 0.85;
    if (window.Render) Render.setup(scene, cam, { skyTop: '#1a1626', skyHorizon: '#2a2436' });
    scene.onBeforeRenderObservable.add(update);
    return scene;
  }
  function enterHouse(door) { returnDoor = { x: door.x, z: door.z }; if (window.SFX) SFX.play('door'); Game.scene = buildInterior(door); Game.active = { interact }; }
  function leaveHouse() { if (window.SFX) SFX.play('door'); Game.scene = build(key); Game.active = { interact }; }
  function at(mesh, parent, m, x, y, z) { mesh.material = m; if (parent) mesh.parent = parent; mesh.position.set(x, y, z); return mesh; }

  function enter(townKey) { build(townKey); paused = false; Game.active = { interact }; Music.play('town'); return scene; }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene, getKey: () => key };
})();
