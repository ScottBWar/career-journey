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
  let camPos, camLook, camPosT, camLookT, key, spot, setMode = null, setAnim = [];
  let moving = [], acting = {};   // live actor walk-tweens + one-shot action poses (the dynamic toolkit)

  function M(hex, opt = {}) { const m = new BABYLON.StandardMaterial('cm' + Math.random(), scene); m.diffuseColor = Color3.FromHexString(hex); m.specularColor = new Color3(0.1, 0.1, 0.1); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); return m; }

  function play(bts, onDone, opts) {
    opts = opts || {};
    beats = bts; idx = 0; onDoneCb = onDone; engine = Game.engine; setMode = opts.set || null;
    prevScene = Game.scene; Game.dialogueOpen = true;
    if (window.Music) Music.play(opts.music || 'cutscene');
    build();
    Game.scene = scene;
    document.body.classList.add('cine-on');
    el('cine').classList.add('show');
    Game._advanceDlg = advance;
    el('cine').onclick = advance;
    show();
  }

  // a real set: a grassy clifftop at dawn, the crew's ship moored in the bay below,
  // the sun cracking the horizon. The "we're really doing this" shot.
  function buildCliffDawnSet() {
    scene.fogColor = new Color3(0.95, 0.72, 0.5); scene.fogDensity = 0.012;
    new BABYLON.HemisphericLight('h', new V3(0.1, 1, 0.2), scene).intensity = 0.75;
    const sun = new BABYLON.DirectionalLight('k', new V3(0.1, -0.5, -1), scene); sun.intensity = 1.6; sun.diffuse = new Color3(1, 0.82, 0.6); sun.specular = new Color3(1, 0.9, 0.7);
    spot = new BABYLON.SpotLight('sp', new V3(0, 9, -7), new V3(0, -1, 1), 1.3, 8, scene); spot.intensity = 0.9; spot.diffuse = new Color3(1, 0.92, 0.78);
    // ocean stretching to the horizon, catching the dawn
    const sea = MB.CreateGround('sea', { width: 400, height: 400, subdivisions: 32 }, scene); sea.position.set(0, -7, 70); sea.material = M('#1f6a93', { emissive: '#7a4a2a' }); sea.material.specularColor = new Color3(1, 0.8, 0.6); sea.material.specularPower = 64;
    const seaBase = sea.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();
    setAnim.push(tt => { const p = sea.getVerticesData(BABYLON.VertexBuffer.PositionKind); for (let i = 0; i < p.length; i += 3) { p[i + 1] = Math.sin(seaBase[i] * 0.05 + tt) * 0.5 + Math.cos(seaBase[i + 2] * 0.06 + tt * 0.8) * 0.5; } sea.updateVerticesData(BABYLON.VertexBuffer.PositionKind, p); });
    // the rising sun + glow
    const orb = MB.CreateSphere('sun', { diameter: 14 }, scene); orb.material = M('#fff0c0', { emissive: '#ffd27a' }); orb.position.set(6, 1, 130); orb.material.alphaMode = BABYLON.Engine.ALPHA_ADD;
    const halo = MB.CreateSphere('halo', { diameter: 30 }, scene); const hm = M('#ffcf8a', { emissive: '#ffb060' }); hm.alpha = 0.25; hm.alphaMode = BABYLON.Engine.ALPHA_ADD; halo.material = hm; halo.position.copyFrom(orb.position); halo.isPickable = false;
    // clifftop the crew stands on (grass), with a rocky face dropping to the sea
    const top = MB.CreateBox('clifftop', { width: 60, height: 2, depth: 22 }, scene); top.material = M('#3f7a3a'); top.position.set(0, -1, -6);
    const face = MB.CreateBox('cliffface', { width: 60, height: 12, depth: 4 }, scene); face.material = M('#5a4632'); face.position.set(0, -6, 4.5);
    for (let i = 0; i < 10; i++) { const tuft = MB.CreateCylinder('tuft', { height: 0.6, diameterBottom: 0.2, diameterTop: 0 }, scene); tuft.material = M('#5aa84a'); tuft.position.set((Math.random() - 0.5) * 40, 0.2, -14 + Math.random() * 13); }
    // a couple of palms framing the edge
    [-12, 13].forEach(x => { const p = Models.palm(); p.node.position.set(x, 0, -12); p.node.scaling.setAll(1.2); });
    // the crew's ship, moored in the bay just past the cliff edge
    const ship = new BABYLON.TransformNode('cutship', scene); ship.position.set(7, -6.2, 20); ship.rotation.y = -0.6;
    const hull = MB.CreateCylinder('h', { height: 6, diameterTop: 3, diameterBottom: 1.6, tessellation: 10 }, scene); hull.rotation.x = Math.PI / 2; hull.scaling.z = 0.55; hull.material = M((Game.state.ship && Game.state.ship.hull) || '#7a4a24'); hull.parent = ship; hull.position.y = 0.6;
    const mast = MB.CreateCylinder('m', { height: 6, diameter: 0.25 }, scene); mast.material = M('#3a2a18'); mast.parent = ship; mast.position.y = 3.6;
    const sail = MB.CreateBox('s', { width: 0.15, height: 2.8, depth: 3.2 }, scene); sail.material = M((Game.state.ship && Game.state.ship.sail) || '#e8e0cc'); sail.parent = ship; sail.position.set(0, 4.0, 0);
    setAnim.push(tt => { ship.position.y = -6.2 + Math.sin(tt * 1.1) * 0.25; ship.rotation.z = Math.sin(tt * 0.9) * 0.05; });
    if (window.Render) Render.setup(scene, cam, { skyTop: '#2a4a86', skyHorizon: '#ffc070', sun });
  }

  function build() {
    scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.04, 0.04, 0.07); scene.fogDensity = 0.03;
    Models.use(scene); setAnim = []; moving = []; acting = {};
    cam = new BABYLON.UniversalCamera('cc', new V3(0, 3, -9), scene); cam.fov = 0.8; cam.minZ = 0.1;

    if (setMode === 'cliff_dawn') {
      buildCliffDawnSet();
    } else {
      new BABYLON.HemisphericLight('h', new V3(0.1, 1, 0.1), scene).intensity = 0.4;
      const key2 = new BABYLON.DirectionalLight('k', new V3(-0.4, -0.8, 0.6), scene); key2.intensity = 1.1; key2.diffuse = new Color3(1, 0.92, 0.82);
      spot = new BABYLON.SpotLight('sp', new V3(0, 9, -7), new V3(0, -1, 1), 1.3, 8, scene); spot.intensity = 1.6; spot.diffuse = new Color3(1, 0.95, 0.85);
      // reflective stage floor + a back riser
      const floor = MB.CreateGround('f', { width: 80, height: 60 }, scene); floor.material = M('#0a0c14', {}); floor.material.specularColor = new Color3(0.25, 0.25, 0.3); floor.material.specularPower = 32;
      const riser = MB.CreateBox('r', { width: 80, height: 10, depth: 1 }, scene); riser.material = M('#06070d'); riser.position.set(0, 4, 7);
      if (window.Render) Render.setup(scene, cam, { skyTop: '#07060f', skyHorizon: '#1a1226' });
    }

    // gather unique speakers (in first-appearance order) and build their models in a shallow arc
    actors = {}; order = [];
    beats.forEach(b => { const a = Game.cutsceneActorKey(b.name); if (a && !actors[b.name]) { actors[b.name] = a; order.push(b.name); } });
    const n = order.length;
    order.forEach((name, i) => {
      const a = actors[name]; let built;
      if (a.type === 'party') { const model = Progress.def(a.key).model; built = Models[model] ? Models[model]() : Models.hero(); }
      else if (a.type === 'enemy') built = Models.enemy(a.key);
      else { const md = Data.MERMAIDS[a.key]; built = Models.mermaid(md.color, md.tail, md.skin); }
      const x = (i - (n - 1) / 2) * 3.4;
      built.node.position.set(x, (a.type === 'enemy' && Data.ENEMIES[a.key].baseY) || 0, 0);
      if (a.type === 'enemy' && Data.ENEMIES[a.key].boss) built.node.scaling.setAll(Math.min(1.2, Data.ENEMIES[a.key].scale || 1.1));
      built.node.rotation.y = Math.PI; // face the camera
      a.node = built.node; a.arm = built.arm; a.idle = built.idle; a.baseY = built.node.position.y; a.x = x;
    });

    camPos = cam.position.clone(); camLook = new V3(0, 2, 0); camPosT = camPos.clone(); camLookT = camLook.clone();
    scene.onBeforeRenderObservable.add(frame);
  }

  // ---- cinematic toolkit: named camera shots, hard cuts, actor movement & action poses ----
  // a beat may carry: shot:'wide'|'closeup'|'low'|'high'|'profile'|'over'|'hero', cut:true,
  //   move:{who?,to:[x,z],ms?}, act:{who?,do:'leap'|'raise'|'point'|'stagger'|'cheer'|'shake'}
  function shotFor(b) {
    const a = actors[b.name]; const ax = a ? a.x : 0;
    switch (b.shot) {
      case 'wide':    return [new V3(0, 4.2, -12), new V3(0, 2, 0)];
      case 'closeup': return [new V3(ax * 0.6 - 1.0, 2.7, -4.0), new V3(ax, 2.3, 0)];
      case 'low':     return [new V3(ax * 0.5, 0.9, -4.8), new V3(ax, 2.7, 0)];           // dramatic up-angle
      case 'high':    return [new V3(ax * 0.3, 7.5, -6.5), new V3(ax, 1.0, 0)];           // looming down-angle
      case 'profile': return [new V3(ax - 5.5, 2.5, 0.2), new V3(ax, 2.1, 0)];            // side-on
      case 'hero':    return [new V3(ax * 0.4, 1.3, -4.2), new V3(ax, 3.0, 7)];           // low, gazing past them to the sky
      case 'over': {  const o = order.filter(n => n !== b.name); const ox = o.length ? actors[o[0]].x : ax - 3; return [new V3(ox * 0.85, 2.8, -5.2), new V3(ax, 2.2, 0)]; }
      default: return null;
    }
  }
  function walkActor(name, tx, tz, ms) { const a = actors[name]; if (!a || !a.node) return; const p = a.node.position; a.node.rotation.y = Math.atan2(tx - p.x, tz - p.z); moving.push({ a, fx: p.x, fz: p.z, tx, tz, t0: t, dur: (ms || 700) / 1000 }); }
  function actAct(name, kind) { const a = actors[name]; if (!a) return; acting[name] = { kind, t0: t, dur: kind === 'cheer' ? 1.4 : 0.7 }; }

  function focus(name) {
    const a = actors[name];
    if (setMode === 'cliff_dawn') { // keep the vista (ship + dawn behind the crew) while favouring the speaker
      const ax = a ? a.x : 0;
      camPosT = new V3(ax * 0.4, 3.0, -9.5); camLookT = new V3(ax * 0.5, 2.5, 8);
      return;
    }
    if (a) { // push in on the speaker, slight 3/4 angle
      camPosT = new V3(a.x * 0.55 - 1.6, 2.7, -5.4); camLookT = new V3(a.x, 2.1, 0);
    } else { // narrator / no model — slow wide establishing drift
      camPosT = new V3(Math.sin(t * 0.2) * 2, 3.4, -9.5); camLookT = new V3(0, 2.2, 0);
    }
  }

  function frame() {
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000); t += dt;
    setAnim.forEach(fn => fn(t));
    // live actor walk-tweens (smoothstep)
    for (let i = moving.length - 1; i >= 0; i--) { const mv = moving[i], k = Math.min(1, (t - mv.t0) / mv.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; mv.a.node.position.x = mv.fx + (mv.tx - mv.fx) * e; mv.a.node.position.z = mv.fz + (mv.tz - mv.fz) * e; mv.a.x = mv.a.node.position.x; if (k >= 1) moving.splice(i, 1); }
    // ease camera toward its target (cinematic glide)
    camPos = V3.Lerp(camPos, camPosT, 0.06); camLook = V3.Lerp(camLook, camLookT, 0.08);
    cam.position.copyFrom(camPos); cam.setTarget(camLook);
    const speaking = beats[idx] && beats[idx].name;
    order.forEach(name => {
      const a = actors[name]; if (!a || !a.node) return;
      const act = acting[name];
      if (act) {                                                      // a one-shot action pose overrides idle this frame
        const k = Math.min(1, (t - act.t0) / act.dur), s = Math.sin(k * Math.PI);
        if (act.kind === 'leap') a.node.position.y = a.baseY + s * 1.6;
        else if (act.kind === 'raise') { if (a.arm) a.arm.rotation.x = -2.2 * s; a.node.position.y = a.baseY + s * 0.2; }
        else if (act.kind === 'point') { if (a.arm) a.arm.rotation.x = -1.4 * s; }
        else if (act.kind === 'stagger') a.node.rotation.x = -0.45 * s;
        else if (act.kind === 'shake') a.node.position.x = a.x + Math.sin(t * 40) * 0.08 * (1 - k);
        else if (act.kind === 'cheer') { a.node.position.y = a.baseY + Math.abs(Math.sin(t * 11)) * 0.4; if (a.arm) a.arm.rotation.x = -2.0; }
        if (a.idle) a.idle(t);
        if (k >= 1 && act.kind !== 'cheer') { delete acting[name]; a.node.rotation.x = 0; }
        return;
      }
      const active = name === speaking;
      if (active) { spot.position.set(a.x, 9, -7); spot.setDirectionToTarget(new V3(a.x, 2, 0));
        a.node.position.y = a.baseY + Math.abs(Math.sin(t * 9)) * 0.05;          // talking bob
        a.node.rotation.z = Math.sin(t * 4) * 0.03;
        if (a.arm) a.arm.rotation.x = 0.7 + Math.sin(t * 4) * 0.14;              // a gentle gesture, weapon stays lowered
      } else { a.node.position.y = a.baseY + Math.sin(t * 1.4) * 0.03; a.node.rotation.z = 0; if (a.arm) a.arm.rotation.x = 0.95; }
      if (a.idle) a.idle(t * (active ? 1.4 : 0.8));
    });
  }

  function show() {
    const b = beats[idx]; if (!b) return finish();
    el('cineName').textContent = b.name;
    el('cineLine').textContent = b.text;
    el('cinePort').innerHTML = (window.Portraits && Portraits.has(NAMEKEY(b.name))) ? Portraits.img(NAMEKEY(b.name)) : '';
    el('cineNext').textContent = idx < beats.length - 1 ? '▶' : '✓';
    // cinematic directives: explicit camera shot (with optional hard cut), else auto-focus the speaker
    const s = b.shot && shotFor(b);
    if (s) { camPosT = s[0]; camLookT = s[1]; if (b.cut) { camPos = camPosT.clone(); camLook = camLookT.clone(); } }
    else focus(b.name);
    if (b.move) walkActor(b.move.who || b.name, b.move.to[0], b.move.to[1], b.move.ms);
    if (b.act) actAct(b.act.who || b.name, b.act.do);
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
