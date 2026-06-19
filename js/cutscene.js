// =====================================================================
//  Cutscene — staged cinematic dialogue. Builds a moody 3D set with the
//  actual character models, cuts/pushes the camera between speakers, drops
//  letterbox bars + a lower-third caption. Falls back to the dialogue box
//  for narrator/character-less beats (handled in main.js).
// =====================================================================
window.Cutscene = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  const el = id => document.getElementById(id);
  let scene, cam, engine, prevScene, beats, idx, onDoneCb, actors = {}, order = [], t = 0;
  let camPos, camLook, camPosT, camLookT, key, spot;

  function M(hex, opt = {}) { const m = new BABYLON.StandardMaterial('cm' + Math.random(), scene); m.diffuseColor = Color3.FromHexString(hex); m.specularColor = new Color3(0.1, 0.1, 0.1); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function play(bts, onDone) {
    beats = bts; idx = 0; onDoneCb = onDone; engine = Game.engine;
    prevScene = Game.scene; Game.dialogueOpen = true;
    if (window.Music) Music.play('cutscene');
    build();
    Game.scene = scene;
    document.body.classList.add('cine-on');
    el('cine').classList.add('show');
    Game._advanceDlg = advance;
    el('cine').onclick = advance;
    show();
  }

  function build() {
    scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.04, 0.04, 0.07); scene.fogDensity = 0.03;
    Models.use(scene);
    new BABYLON.HemisphericLight('h', new V3(0.1, 1, 0.1), scene).intensity = 0.4;
    const key2 = new BABYLON.DirectionalLight('k', new V3(-0.4, -0.8, 0.6), scene); key2.intensity = 1.1; key2.diffuse = new Color3(1, 0.92, 0.82);
    spot = new BABYLON.SpotLight('sp', new V3(0, 9, -7), new V3(0, -1, 1), 1.3, 8, scene); spot.intensity = 1.6; spot.diffuse = new Color3(1, 0.95, 0.85);
    // reflective stage floor + a back riser
    const floor = MB.CreateGround('f', { width: 80, height: 60 }, scene); floor.material = M('#0a0c14', {}); floor.material.specularColor = new Color3(0.25, 0.25, 0.3); floor.material.specularPower = 32;
    const riser = MB.CreateBox('r', { width: 80, height: 10, depth: 1 }, scene); riser.material = M('#06070d'); riser.position.set(0, 4, 7);

    // gather unique speakers (in first-appearance order) and build their models in a shallow arc
    actors = {}; order = [];
    beats.forEach(b => { const a = Game.cutsceneActorKey(b.name); if (a && !actors[b.name]) { actors[b.name] = a; order.push(b.name); } });
    const n = order.length;
    order.forEach((name, i) => {
      const a = actors[name]; let built;
      if (a.type === 'party') { const model = Progress.def(a.key).model; built = Models[model] ? Models[model]() : Models.hero(); }
      else if (a.type === 'enemy') built = Models.enemy(a.key);
      else { const md = Data.MERMAIDS[a.key]; built = Models.mermaid(md.color, md.tail); }
      const x = (i - (n - 1) / 2) * 3.4;
      built.node.position.set(x, (a.type === 'enemy' && Data.ENEMIES[a.key].baseY) || 0, 0);
      if (a.type === 'enemy' && Data.ENEMIES[a.key].boss) built.node.scaling.setAll(Math.min(1.2, Data.ENEMIES[a.key].scale || 1.1));
      built.node.rotation.y = Math.PI; // face the camera
      a.node = built.node; a.arm = built.arm; a.idle = built.idle; a.baseY = built.node.position.y; a.x = x;
    });

    cam = new BABYLON.UniversalCamera('cc', new V3(0, 3, -9), scene); cam.fov = 0.8; cam.minZ = 0.1;
    camPos = cam.position.clone(); camLook = new V3(0, 2, 0); camPosT = camPos.clone(); camLookT = camLook.clone();
    if (window.Render) Render.setup(scene, cam, { skyTop: '#07060f', skyHorizon: '#1a1226' });
    scene.onBeforeRenderObservable.add(frame);
  }

  function focus(name) {
    const a = actors[name];
    if (a) { // push in on the speaker, slight 3/4 angle
      camPosT = new V3(a.x * 0.55 - 1.6, 2.7, -5.4); camLookT = new V3(a.x, 2.1, 0);
    } else { // narrator / no model — slow wide establishing drift
      camPosT = new V3(Math.sin(t * 0.2) * 2, 3.4, -9.5); camLookT = new V3(0, 2.2, 0);
    }
  }

  function frame() {
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    // ease camera toward its target (cinematic glide)
    camPos = V3.Lerp(camPos, camPosT, 0.06); camLook = V3.Lerp(camLook, camLookT, 0.08);
    cam.position.copyFrom(camPos); cam.setTarget(camLook);
    const speaking = beats[idx] && beats[idx].name;
    order.forEach(name => {
      const a = actors[name]; if (!a || !a.node) return;
      const active = name === speaking;
      if (active) { spot.position.set(a.x, 9, -7); spot.setDirectionToTarget(new V3(a.x, 2, 0));
        a.node.position.y = a.baseY + Math.abs(Math.sin(t * 9)) * 0.05;          // talking bob
        a.node.rotation.z = Math.sin(t * 4) * 0.03;
        if (a.arm) a.arm.rotation.x = -0.3 + Math.sin(t * 5) * 0.22;             // gesturing
      } else { a.node.position.y = a.baseY + Math.sin(t * 1.4) * 0.03; a.node.rotation.z = 0; if (a.arm) a.arm.rotation.x = 0.9; }
      if (a.idle) a.idle(t * (active ? 1.4 : 0.8));
    });
  }

  function show() {
    const b = beats[idx]; if (!b) return finish();
    el('cineName').textContent = b.name;
    el('cineLine').textContent = b.text;
    el('cinePort').innerHTML = (window.Portraits && Portraits.has(NAMEKEY(b.name))) ? Portraits.img(NAMEKEY(b.name)) : '';
    el('cineNext').textContent = idx < beats.length - 1 ? '▶' : '✓';
    focus(b.name);
  }
  function NAMEKEY(name) { const a = Game.cutsceneActorKey(name); return a ? a.key : ''; }
  function advance() { if (idx < beats.length - 1) { idx++; show(); } else finish(); }
  function finish() {
    el('cine').classList.remove('show'); el('cine').onclick = null; document.body.classList.remove('cine-on');
    if (scene) { scene.dispose(); scene = null; }
    Game.scene = prevScene; Game.dialogueOpen = false; Game._advanceDlg = null;
    if (window.Music && Game.musicForReturn) Music.play(Game.musicForReturn()); // restore the area's track (a boss/battle that follows will override)
    const cb = onDoneCb; onDoneCb = null; if (cb) cb();
  }

  return { play };
})();
