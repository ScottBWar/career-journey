// =====================================================================
//  Town — walkable town scenes. Approach NPCs and press E / tap to talk.
//  Innkeepers rest the party; merchants open the shop. Walk south to exit.
// =====================================================================
window.Town = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  let scene, cam, player, engine, def, key;
  let npcs = [], idlers = [], paused = false, t = 0, nearNPC = null, nearExit = false, camYaw = 0;
  const SPEED = 8;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.1; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function build(townKey) {
    key = townKey; def = Data.TOWNS[townKey];
    engine = Game.engine;
    if (scene) scene.dispose();
    npcs = []; idlers = []; nearNPC = null; nearExit = false; t = 0;
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.7, 0.7, 0.8); scene.fogDensity = 0.008;
    Models.use(scene);

    const hemi = new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene); hemi.intensity = 0.55; hemi.groundColor = new Color3(0.3, 0.32, 0.38);
    const sun = new BABYLON.DirectionalLight("s", new V3(-0.45, -1, 0.3), scene); sun.intensity = 1.3; sun.specular = new Color3(1, 0.95, 0.85);

    const ground = MB.CreateGround('g', { width: 60, height: 60 }, scene); ground.material = M('g', def.ground);
    const plaza = MB.CreateDisc('plaza', { radius: 6, tessellation: 32 }, scene); plaza.rotation.x = Math.PI/2; plaza.position.y = 0.01; plaza.material = M('plaza', '#c9b48a');
    // surrounding sea hint
    const sea = MB.CreateGround('sea', { width: 200, height: 200 }, scene); sea.material = M('sea', '#1e6f96'); sea.position.set(0, -0.4, -40);

    // buildings
    def.buildings.forEach(b => {
      let built;
      if (b.kind === 'inn') { built = Models.house({ wall: '#e8d5b0', roof: '#3a7a5a', w: 5, d: 5 }); placeSign(b.x + 0, b.z + 2.8, 'INN'); }
      else if (b.kind === 'shop') { built = Models.house({ wall: '#e0d0aa', roof: '#7a5aa0', w: 5, d: 5 }); placeSign(b.x + 0, b.z + 2.8, (b.label || 'SHOP').toUpperCase()); }
      else built = Models.house(b);
      built.node.position.set(b.x, 0, b.z);
    });

    // exit marker (south)
    const exitPortal = Models.portal('#8fd3f4'); exitPortal.node.position.set(def.exit.x, 0, def.exit.z); exitPortal.node._baseY = 0; idlers.push(exitPortal);
    const exitSign = Models.sign('Leave Town'); exitSign.node.position.set(def.exit.x, 0, def.exit.z - 1.8);

    // NPCs
    def.npcs.forEach((n, i) => {
      const m = Models.npc(n.color, n.hair); m.node.position.set(n.x, 0, n.z); m.node._baseY = 0; m.node._ph = i; m.node.rotation.y = Math.PI;
      idlers.push(m);
      npcs.push({ data: n, node: m.node, pos: new V3(n.x, 0, n.z) });
    });

    // player = the active party leader (consistent with overworld)
    const leaderKey = Game.state.active[0] || 'pirate'; const leaderModel = Progress.def(leaderKey).model;
    const hero = Models[leaderModel] ? Models[leaderModel]((Game.state.equip[leaderKey] || {}).weapon) : Models.hero(); player = hero.node;
    if (hero.arm) hero.arm.rotation.x = 1.0;
    player.position.set(def.exit.x, 0, def.exit.z + 3);
    cam = new BABYLON.UniversalCamera('tcam', new V3(0, 15, -14), scene); cam.fov = 0.85;

    if (window.Render) Render.setup(scene, cam, { skyTop: '#3a5a9a', skyHorizon: '#cfe6f0', sun });
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
    if (mx || mz) { const len = Math.hypot(mx, mz); mx /= len; mz /= len; const fX=-Math.sin(camYaw), fZ=Math.cos(camYaw), rX=Math.cos(camYaw), rZ=Math.sin(camYaw); const wx=mx*rX+mz*fX, wz=mx*rZ+mz*fZ; player.position.x = clamp(player.position.x + wx*SPEED*dt, -26, 26); player.position.z = clamp(player.position.z + wz*SPEED*dt, -26, 26); player.rotation.y = Math.atan2(wx, wz); player.position.y = Math.abs(Math.sin(t*10))*0.12; }
    else player.position.y = 0;

    idlers.forEach(o => o.idle && o.idle(t));

    nearNPC = null;
    for (const n of npcs) { if (V3.Distance(player.position, n.pos) < 2.2) { nearNPC = n; n.node.lookAt(new V3(player.position.x, n.node.position.y, player.position.z)); break; } }
    nearExit = V3.Distance(player.position, new V3(def.exit.x, 0, def.exit.z)) < 2.2;

    const prompt = document.getElementById('worldPrompt');
    if (nearNPC) { prompt.textContent = `[F / Tap] Talk to ${nearNPC.data.name}`; prompt.classList.add('show'); }
    else if (nearExit) { prompt.textContent = '[F / Tap] Leave town'; prompt.classList.add('show'); }
    else prompt.classList.remove('show');

    const off = 14; cam.position.set(player.position.x + Math.sin(camYaw)*off, 15, player.position.z - Math.cos(camYaw)*off);
    cam.setTarget(player.position.add(new V3(0, 1, 0)));
    Game.updateHUD();
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function interact() {
    if (paused) return;
    if (nearNPC) { Game.talk(nearNPC.data); }
    else if (nearExit) { Game.resumeIsland(); }
  }

  function enter(townKey) { build(townKey); paused = false; Game.active = { interact }; Music.play('town'); return scene; }
  function pause() { paused = true; }
  function resume() { paused = false; }

  return { enter, pause, resume, getScene: () => scene, getKey: () => key };
})();
