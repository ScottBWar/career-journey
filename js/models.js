// =====================================================================
//  Models — all primitive-built 3D meshes (party, enemies, world, town).
//  Every builder takes the active scene and returns { node, idle?, ...refs }.
// =====================================================================
window.Models = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3;
  let MB, scene;
  function use(s) { scene = s; MB = BABYLON.MeshBuilder; }

  function M(name, hex, opt = {}) {
    const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene);
    m.diffuseColor = Color3.FromHexString(hex);
    const s = opt.spec ?? 0.15; m.specularColor = new Color3(s, s, s);
    if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive);
    if (opt.alpha != null) m.alpha = opt.alpha;
    if (opt.specPower) m.specularPower = opt.specPower;
    return m;
  }
  function at(mesh, parent, m, x = 0, y = 0, z = 0) { mesh.material = m; mesh.parent = parent; mesh.position.set(x, y, z); return mesh; }

  // ---------------- PARTY ----------------
  function pirate() {
    const r = new BABYLON.TransformNode('pirate', scene);
    const coat = M('coat', '#7a1f1f'), coat2 = M('coat2', '#9c2a2a'), dark = M('dark', '#2a2018'),
          skin = M('skin', '#d9a06b'), gold = M('gold', '#d9a521', { emissive: '#4a3606' }),
          steel = M('steel', '#c9d2dc', { spec: 0.8 }), beard = M('beardP', '#7a3b12');
    at(MB.CreateCylinder('lL', { height: 1.1, diameter: 0.34 }, scene), r, dark, -0.22, 0.55, 0);
    at(MB.CreateCylinder('lR', { height: 1.1, diameter: 0.34 }, scene), r, dark, 0.22, 0.55, 0);
    at(MB.CreateBox('torso', { width: 0.95, height: 1.15, depth: 0.6 }, scene), r, coat, 0, 1.6, 0);
    at(MB.CreateBox('sash', { width: 1.0, height: 0.22, depth: 0.62 }, scene), r, gold, 0, 1.3, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.3 }, scene), r, coat2, -0.62, 1.6, 0); aL.rotation.z = 0.25;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.6, 2.0, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.3 }, scene), arm, coat2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.62 }, scene), r, skin, 0, 2.5, 0);
    at(MB.CreateBox('beard', { width: 0.5, height: 0.4, depth: 0.32 }, scene), r, beard, 0, 2.25, 0.18);
    at(MB.CreateBox('patch', { width: 0.18, height: 0.16, depth: 0.05 }, scene), r, dark, 0.14, 2.57, 0.3);
    at(MB.CreateCylinder('brim', { height: 0.08, diameter: 0.95 }, scene), r, dark, 0, 2.83, 0);
    at(MB.CreateSphere('htop', { diameter: 0.62, slice: 0.5 }, scene), r, dark, 0, 2.85, 0);
    at(MB.CreateBox('skull', { width: 0.16, height: 0.16, depth: 0.05 }, scene), r, M('skullP', '#f2ead9', { emissive: '#3a3528' }), 0, 2.97, 0.3);
    const sw = new BABYLON.TransformNode('swR', scene); sw.parent = arm; sw.position.set(0, -0.7, 0.3); sw.rotation.x = 1.35;
    at(MB.CreateBox('blade', { width: 0.08, height: 1.3, depth: 0.16 }, scene), sw, steel, 0, 0.55, 0);
    at(MB.CreateBox('guard', { width: 0.32, height: 0.1, depth: 0.22 }, scene), sw, gold, 0, -0.05, 0);
    return { node: r, arm };
  }

  function swordsman() {
    const r = new BABYLON.TransformNode('swordsman', scene);
    const navy = M('navy', '#2c3a52'), navy2 = M('navy2', '#3a4d6b'), hair = M('hair', '#e7d27a', { emissive: '#4a4010' }),
          skin = M('skin2', '#cf9a78'), steel = M('steel2', '#c9d2dc', { spec: 0.8 }), dark = M('dk', '#2a2018');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.32 }, scene), r, M('pant', '#1f2733'), -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.32 }, scene), r, M('pant2', '#1f2733'), 0.22, 0.57, 0);
    at(MB.CreateBox('torso', { width: 0.92, height: 1.2, depth: 0.55 }, scene), r, navy, 0, 1.62, 0);
    at(MB.CreateBox('belt', { width: 0.96, height: 0.18, depth: 0.57 }, scene), r, M('belt', '#7a5230'), 0, 1.25, 0);
    at(MB.CreateSphere('pauldron', { diameter: 0.62, slice: 0.6 }, scene), r, steel, -0.55, 2.05, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.28 }, scene), r, navy2, -0.6, 1.6, 0); aL.rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.62, 2.02, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.28 }, scene), arm, navy2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.5, 0);
    const sp = [[0,0.45,0,0,0,0],[-0.18,0.42,0.05,0,0,0.5],[0.18,0.42,0.05,0,0,-0.5],[0,0.4,0.22,0.6,0,0],[0,0.4,-0.2,-0.6,0,0],[-0.22,0.3,-0.05,0,0,0.9],[0.22,0.3,-0.05,0,0,-0.9]];
    sp.forEach((s, i) => { const c = at(MB.CreateCylinder('hair'+i, { height: 0.6, diameterTop: 0, diameterBottom: 0.26 }, scene), r, hair, s[0], 2.72 + s[1]*0.2, s[2]); c.rotation.set(s[3], s[4], s[5]); });
    const sw = new BABYLON.TransformNode('swR', scene); sw.parent = arm; sw.position.set(0.1, -0.7, 0.3); sw.rotation.x = 1.3;
    at(MB.CreateBox('blade', { width: 0.38, height: 2.7, depth: 0.09 }, scene), sw, M('busterBlade', '#cdd6e0', { spec: 0.9, specPower: 80 }), 0, 1.25, 0);
    at(MB.CreateBox('edge', { width: 0.1, height: 2.6, depth: 0.11 }, scene), sw, M('busterEdge', '#9aa6b4', { spec: 0.9 }), 0.14, 1.25, 0);
    at(MB.CreateBox('guard', { width: 0.5, height: 0.14, depth: 0.2 }, scene), sw, steel, 0, -0.1, 0);
    at(MB.CreateCylinder('grip', { height: 0.5, diameter: 0.1 }, scene), sw, dark, 0, -0.4, 0);
    return { node: r, arm };
  }

  function healer() {
    const r = new BABYLON.TransformNode('healer', scene);
    const robe = M('robe', '#2fae9a', { emissive: '#0c3a33' }), robe2 = M('robe2', '#7fe3d4'),
          hairC = M('hairC', '#37c0e0', { emissive: '#0a3a48' }), skin = M('skinH', '#d9a06b');
    at(MB.CreateCylinder('robe', { height: 1.9, diameterTop: 0.5, diameterBottom: 1.4 }, scene), r, robe, 0, 0.95, 0);
    at(MB.CreateCylinder('trim', { height: 0.2, diameterTop: 1.32, diameterBottom: 1.42 }, scene), r, robe2, 0, 0.12, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.8, diameter: 0.22 }, scene), r, robe, -0.5, 1.5, 0); aL.rotation.z = 0.4;
    const aR = at(MB.CreateCylinder('aR', { height: 0.8, diameter: 0.22 }, scene), r, robe, 0.5, 1.5, 0); aR.rotation.z = -0.4;
    at(MB.CreateSphere('head', { diameter: 0.55 }, scene), r, skin, 0, 2.25, 0);
    at(MB.CreateBox('hairBack', { width: 0.6, height: 1.1, depth: 0.25 }, scene), r, hairC, 0, 1.9, -0.18);
    at(MB.CreateSphere('hairTop', { diameter: 0.6, slice: 0.6 }, scene), r, hairC, 0, 2.42, 0);
    const halo = at(MB.CreateTorus('halo', { diameter: 0.7, thickness: 0.05, tessellation: 24 }, scene), r, M('halo', '#fff6c2', { emissive: '#fff0a0' }), 0, 2.85, 0);
    halo.rotation.x = Math.PI / 2.3;
    const staffPiv = new BABYLON.TransformNode('staffPiv', scene); staffPiv.parent = r; staffPiv.position.set(0.72, 1.6, 0.1);
    at(MB.CreateCylinder('staff', { height: 2.0, diameter: 0.08 }, scene), staffPiv, M('staffMat', '#b07a3a'), 0, 0, 0);
    const orb = at(MB.CreateSphere('orb', { diameter: 0.42 }, scene), staffPiv, M('orbMat', '#9be7ff', { emissive: '#3fb8ff' }), 0, 1.05, 0);
    return { node: r, halo, orb, staffPiv, idle(t) { halo.rotation.z = t * 1.2; orb.scaling.setAll(1 + Math.sin(t * 3) * 0.08); } };
  }

  // ---- new PS1-RPG-inspired party members ----
  function mage() { // "Pip" — tiny black mage (FF9 Vivi vibe): huge hat, glowing eyes
    const r = new BABYLON.TransformNode('mage', scene);
    const robe = M('mgRobe', '#3a3f6b'), robe2 = M('mgRobe2', '#2a2e52'), hat = M('mgHat', '#1c2040'),
          glow = M('mgEye', '#ffe066', { emissive: '#ffd000' }), gold = M('mgGold', '#e0b34a', { emissive: '#5a4208' });
    at(MB.CreateCylinder('robe', { height: 1.5, diameterTop: 0.7, diameterBottom: 1.2 }, scene), r, robe, 0, 0.75, 0);
    at(MB.CreateBox('feet', { width: 0.7, height: 0.2, depth: 0.5 }, scene), r, M('mgFeet', '#caa84a'), 0, 0.1, 0.15);
    at(MB.CreateSphere('head', { diameter: 0.7 }, scene), r, robe2, 0, 1.7, 0);
    [-0.16, 0.16].forEach(x => at(MB.CreateSphere('eye', { diameter: 0.16 }, scene), r, glow, x, 1.72, 0.3));
    // giant floppy pointed hat
    const hatBrim = at(MB.CreateCylinder('brim', { height: 0.1, diameter: 1.5 }, scene), r, hat, 0, 2.0, 0);
    const cone = at(MB.CreateCylinder('cone', { height: 1.6, diameterTop: 0, diameterBottom: 1.0 }, scene), r, hat, 0, 2.7, -0.1); cone.rotation.x = -0.3;
    at(MB.CreateBox('band', { width: 1.05, height: 0.16, depth: 1.05 }, scene), r, gold, 0, 2.12, 0);
    // arms
    at(MB.CreateCylinder('aL', { height: 0.7, diameter: 0.18 }, scene), r, robe, -0.5, 1.1, 0).rotation.z = 0.4;
    const staffPiv = new BABYLON.TransformNode('mgStaff', scene); staffPiv.parent = r; staffPiv.position.set(0.55, 1.0, 0.1);
    at(MB.CreateCylinder('staff', { height: 1.8, diameter: 0.07 }, scene), staffPiv, M('mgStaffMat', '#7a5230'), 0, 0.2, 0);
    const orb = at(MB.CreateSphere('orb', { diameter: 0.34 }, scene), staffPiv, M('mgOrb', '#ff7eb0', { emissive: '#ff3a8a' }), 0, 1.1, 0);
    return { node: r, staffPiv, idle(t) { orb.scaling.setAll(1 + Math.sin(t * 4) * 0.1); } };
  }

  function blader() { // "Ridge" — spiky-haired katana fighter (Chrono Trigger vibe)
    const r = new BABYLON.TransformNode('blader', scene);
    const tunic = M('blTunic', '#3f7fae'), pants = M('blPants', '#2b3a4a'), skin = M('blSkin', '#d9a06b'),
          hair = M('blHair', '#e2622a', { emissive: '#5a1e08' }), steel = M('blSteel', '#cdd6e0', { spec: 0.9 }), band = M('blBand', '#d83a3a');
    at(MB.CreateCylinder('lL', { height: 1.1, diameter: 0.3 }, scene), r, pants, -0.2, 0.55, 0);
    at(MB.CreateCylinder('lR', { height: 1.1, diameter: 0.3 }, scene), r, pants, 0.2, 0.55, 0);
    at(MB.CreateBox('torso', { width: 0.85, height: 1.1, depth: 0.52 }, scene), r, tunic, 0, 1.6, 0);
    at(MB.CreateBox('belt', { width: 0.9, height: 0.16, depth: 0.55 }, scene), r, M('blBelt', '#3a2a18'), 0, 1.18, 0);
    at(MB.CreateCylinder('aL', { height: 0.9, diameter: 0.26 }, scene), r, tunic, -0.58, 1.6, 0).rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('blArm', scene); arm.parent = r; arm.position.set(0.58, 2.0, 0);
    at(MB.CreateCylinder('aR', { height: 0.9, diameter: 0.26 }, scene), arm, tunic, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.58 }, scene), r, skin, 0, 2.4, 0);
    at(MB.CreateTorus('band', { diameter: 0.62, thickness: 0.08, tessellation: 16 }, scene), r, band, 0, 2.45, 0).rotation.x = Math.PI / 2;
    // spiky hair
    [[0,0.4,0,0,0,0],[-0.2,0.35,0,0,0,0.6],[0.2,0.35,0,0,0,-0.6],[0,0.34,0.2,0.7,0,0],[-0.15,0.3,-0.15,0,0,1.0],[0.15,0.3,-0.15,0,0,-1.0]].forEach((s,i)=>{ const c = at(MB.CreateCylinder('hair'+i,{height:0.55,diameterTop:0,diameterBottom:0.24},scene), r, hair, s[0], 2.62+s[1]*0.2, s[2]); c.rotation.set(s[3],s[4],s[5]); });
    // katana
    const sw = new BABYLON.TransformNode('blSword', scene); sw.parent = arm; sw.position.set(0, -0.7, 0.3); sw.rotation.x = 1.35;
    at(MB.CreateBox('blade', { width: 0.07, height: 1.7, depth: 0.14 }, scene), sw, steel, 0, 0.8, 0);
    at(MB.CreateBox('guard', { width: 0.26, height: 0.08, depth: 0.2 }, scene), sw, M('blGuard', '#caa84a', { emissive: '#5a4208' }), 0, -0.05, 0);
    at(MB.CreateCylinder('grip', { height: 0.34, diameter: 0.09 }, scene), sw, M('blGrip', '#2a2018'), 0, -0.25, 0);
    return { node: r, arm };
  }

  function dragoon() { // "Quint" — grizzled harpoon-fisherman (Moby Dick whaler)
    const r = new BABYLON.TransformNode('dragoon', scene);
    const coat = M('dgCoat', '#3a5a55', { spec: 0.2 }), coat2 = M('dgCoat2', '#2d4742'), pants = M('dgPants', '#3a3024'),
          steel = M('dgSteel', '#c9d2dc', { spec: 0.9 }), skin = M('dgSkin', '#c89a72'), hair = M('dgHair', '#8a7a66'),
          dark = M('dgDark', '#1a1410'), rope = M('dgRope', '#caa86a');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.34 }, scene), r, pants, -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.34 }, scene), r, pants, 0.22, 0.57, 0);
    at(MB.CreateBox('boots', { width: 0.95, height: 0.3, depth: 0.7 }, scene), r, dark, 0, 0.15, 0.05);
    at(MB.CreateBox('torso', { width: 0.95, height: 1.2, depth: 0.6 }, scene), r, coat, 0, 1.62, 0);
    at(MB.CreateBox('vest', { width: 0.55, height: 1.1, depth: 0.62 }, scene), r, coat2, 0, 1.6, 0);
    at(MB.CreateBox('belt', { width: 1.0, height: 0.16, depth: 0.62 }, scene), r, dark, 0, 1.12, 0);
    at(MB.CreateCylinder('aL', { height: 0.98, diameter: 0.3 }, scene), r, coat, -0.62, 1.6, 0).rotation.z = 0.2;
    const arm = new BABYLON.TransformNode('dgArm', scene); arm.parent = r; arm.position.set(0.62, 2.05, 0);
    at(MB.CreateCylinder('aR', { height: 0.98, diameter: 0.3 }, scene), arm, coat, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.58 }, scene), r, skin, 0, 2.52, 0);
    at(MB.CreateBox('beard', { width: 0.5, height: 0.4, depth: 0.3 }, scene), r, hair, 0, 2.28, 0.16); // grizzled beard
    // long flowing hair down the back + sides
    at(MB.CreateSphere('hairTop', { diameter: 0.62, slice: 0.5 }, scene), r, hair, 0, 2.6, -0.02);
    at(MB.CreateBox('hairBack', { width: 0.55, height: 1.3, depth: 0.2 }, scene), r, hair, 0, 2.0, -0.26);
    [-0.3, 0.3].forEach(x => at(MB.CreateBox('hairSide', { width: 0.16, height: 1.0, depth: 0.16 }, scene), r, hair, x, 2.2, 0.06));
    // eyepatch
    at(MB.CreateBox('patch', { width: 0.2, height: 0.18, depth: 0.06 }, scene), r, dark, 0.15, 2.56, 0.28);
    at(MB.CreateBox('strap', { width: 0.62, height: 0.05, depth: 0.5 }, scene), r, dark, 0, 2.62, 0.05);
    // harpoon in hand: shaft, rope coil, barbed tip
    const sp = new BABYLON.TransformNode('dgSpear', scene); sp.parent = arm; sp.position.set(0, -0.7, 0.35); sp.rotation.x = 1.45;
    at(MB.CreateCylinder('shaft', { height: 2.8, diameter: 0.09 }, scene), sp, M('dgShaft', '#6b4423'), 0, 0.7, 0);
    at(MB.CreateTorus('coil', { diameter: 0.4, thickness: 0.07, tessellation: 12 }, scene), sp, rope, 0, 0.0, 0).rotation.x = Math.PI / 2;
    at(MB.CreateCylinder('tip', { height: 0.55, diameterTop: 0, diameterBottom: 0.2 }, scene), sp, steel, 0, 2.2, 0);
    [-1, 1].forEach(s => at(MB.CreateCylinder('barb', { height: 0.3, diameterTop: 0, diameterBottom: 0.12 }, scene), sp, steel, s * 0.12, 1.95, 0).rotation.z = s * 1.0);
    return { node: r, arm };
  }


  function shark() {
    const r = new BABYLON.TransformNode('eShark', scene);
    const grey = M('shGrey', '#6f7f8c', { spec: 0.3 }), belly = M('shBelly', '#d8dfe4'), drk = M('shDark', '#3c4750');
    at(MB.CreateSphere('b', { diameterX: 3.4, diameterY: 1.3, diameterZ: 1.4, segments: 14 }, scene), r, grey, 0, 0.9, 0);
    at(MB.CreateSphere('bl', { diameterX: 2.8, diameterY: 0.85, diameterZ: 1.1, segments: 12 }, scene), r, belly, 0, 0.65, 0);
    const sn = at(MB.CreateCylinder('sn', { height: 1.2, diameterTop: 0, diameterBottom: 1.1, tessellation: 14 }, scene), r, grey, 1.9, 0.9, 0); sn.rotation.z = -Math.PI/2;
    at(MB.CreateBox('mouth', { width: 0.9, height: 0.3, depth: 0.95 }, scene), r, drk, 1.4, 0.55, 0);
    const dor = at(MB.CreateCylinder('dor', { height: 0.16, diameter: 1.4, tessellation: 3 }, scene), r, drk, -0.1, 1.85, 0); dor.rotation.x = Math.PI/2; dor.scaling.x = 0.8;
    [-0.4,0.4].forEach(z => at(MB.CreateSphere('eye', { diameter: 0.2 }, scene), r, M('shEye', '#0a0a0a', { emissive: '#1a0000' }), 1.35, 1.1, z));
    const tp = new BABYLON.TransformNode('tp', scene); tp.parent = r; tp.position.set(-1.6, 0.9, 0);
    const tf = at(MB.CreateCylinder('tf', { height: 0.15, diameter: 1.6, tessellation: 3 }, scene), tp, drk, -0.55, 0, 0); tf.rotation.x = Math.PI/2; tf.rotation.z = Math.PI/2; tf.scaling.x = 1.1;
    return { node: r, idle(t) { tp.rotation.y = Math.sin(t * 4) * 0.4; } };
  }
  function crab() {
    const r = new BABYLON.TransformNode('eCrab', scene);
    const red = M('crRed', '#e0573a', { spec: 0.3 }), red2 = M('crRed2', '#c9472d');
    at(MB.CreateSphere('shell', { diameterX: 2.4, diameterY: 1.1, diameterZ: 1.9, segments: 14 }, scene), r, red, 0, 1.0, 0);
    [-0.4,0.4].forEach(x => { at(MB.CreateCylinder('st', { height: 0.6, diameter: 0.1 }, scene), r, red2, x, 1.8, 0.7); at(MB.CreateSphere('ey', { diameter: 0.26 }, scene), r, M('crEye', '#0a0a0a', { emissive: '#220000' }), x, 2.1, 0.7); });
    for (let s of [-1, 1]) for (let i = 0; i < 3; i++) { const lg = at(MB.CreateCylinder('lg', { height: 1.2, diameter: 0.14 }, scene), r, red2, s*1.0, 0.7, -0.5 + i*0.5); lg.rotation.z = s*1.1; }
    const claws = [];
    for (let s of [-1, 1]) { const cp = new BABYLON.TransformNode('cp', scene); cp.parent = r; cp.position.set(s*1.3, 0.9, 0.9);
      at(MB.CreateCylinder('arm', { height: 0.8, diameter: 0.18 }, scene), cp, red2, 0, -0.2, 0);
      at(MB.CreateSphere('claw', { diameterX: 0.7, diameterY: 0.5, diameterZ: 0.4 }, scene), cp, red, 0, 0.35, 0);
      cp.rotation.z = s*-0.4; claws.push(cp); }
    return { node: r, idle(t) { claws.forEach((c, i) => c.rotation.x = Math.sin(t * 3 + i) * 0.15); } };
  }
  function jelly() {
    const r = new BABYLON.TransformNode('eJelly', scene);
    const dome = at(MB.CreateSphere('dome', { diameter: 2.0, slice: 0.55 }, scene), r, M('jDome', '#d98cff', { emissive: '#6a2a8a', alpha: 0.8 }), 0, 1.8, 0);
    const tents = [];
    for (let i = 0; i < 9; i++) { const a = (i/9)*Math.PI*2; const tn = at(MB.CreateCylinder('tn', { height: 1.6, diameter: 0.1 }, scene), r, M('jTent', '#e6b3ff', { emissive: '#7a3a9a', alpha: 0.85 }), Math.cos(a)*0.6, 1.0, Math.sin(a)*0.6); tents.push(tn); }
    return { node: r, idle(t) { dome.scaling.y = 1 + Math.sin(t*2.5)*0.12; tents.forEach((tn, i) => tn.rotation.x = Math.sin(t*2 + i)*0.25); } };
  }
  function octo() {
    const r = new BABYLON.TransformNode('eOcto', scene);
    const pur = M('oPur', '#a05bd6', { spec: 0.3 }), pur2 = M('oPur2', '#8a45c0');
    at(MB.CreateSphere('head', { diameterX: 1.9, diameterY: 2.1, diameterZ: 1.9, segments: 14 }, scene), r, pur, 0, 1.7, 0);
    [-0.4,0.4].forEach(z => { at(MB.CreateSphere('eyW', { diameter: 0.5 }, scene), r, M('oWhite', '#f5f5f5'), 0.7, 1.9, z); at(MB.CreateSphere('eyB', { diameter: 0.26 }, scene), r, M('oBlk', '#0a0a0a', { emissive: '#100' }), 0.85, 1.9, z); });
    const arms = [];
    for (let i = 0; i < 8; i++) { const a = (i/8)*Math.PI*2; const tn = at(MB.CreateCylinder('arm', { height: 1.5, diameterTop: 0.1, diameterBottom: 0.32 }, scene), r, pur2, Math.cos(a)*0.7, 0.7, Math.sin(a)*0.7); tn.rotation.x = Math.sin(a)*0.4; tn.rotation.z = -Math.cos(a)*0.4; arms.push(tn); }
    return { node: r, idle(t) { arms.forEach((tn, i) => tn.rotation.y = Math.sin(t*2 + i)*0.2); } };
  }
  function gull() {
    const r = new BABYLON.TransformNode('eGull', scene);
    const wht = M('gWht', '#f3f5f7'), gry = M('gGry', '#b9c3cc'), org = M('gOrg', '#f6a623', { emissive: '#5a3a06' });
    at(MB.CreateSphere('body', { diameterX: 1.8, diameterY: 1.3, diameterZ: 1.3, segments: 12 }, scene), r, wht, 0, 1.6, 0);
    at(MB.CreateSphere('head', { diameter: 0.9 }, scene), r, wht, 0.9, 2.2, 0);
    at(MB.CreateCylinder('beak', { height: 0.6, diameterTop: 0, diameterBottom: 0.3 }, scene), r, org, 1.5, 2.15, 0).rotation.z = -Math.PI/2;
    [-0.25,0.25].forEach(z => at(MB.CreateSphere('ey', { diameter: 0.16 }, scene), r, M('gEye', '#0a0a0a', { emissive: '#100' }), 1.15, 2.32, z));
    const wings = [];
    for (let s of [-1, 1]) { const wp = new BABYLON.TransformNode('wp', scene); wp.parent = r; wp.position.set(-0.2, 1.7, s*0.5);
      at(MB.CreateBox('wing', { width: 1.6, height: 0.12, depth: 1.0 }, scene), wp, gry, -0.4, 0, s*0.5); wings.push(wp); }
    at(MB.CreateSphere('tail', { diameterX: 1.0, diameterY: 0.3, diameterZ: 0.7 }, scene), r, gry, -1.1, 1.55, 0);
    return { node: r, idle(t) { wings.forEach((w, i) => w.rotation.x = Math.sin(t*6 + i*Math.PI)*0.5); } };
  }
  function golem() {
    const r = new BABYLON.TransformNode('eGolem', scene);
    const sandC = M('glSand', '#d9b779', { spec: 0.05 }), sandD = M('glSandD', '#c2a062'), dark = M('glDk', '#2a2018');
    at(MB.CreateBox('base', { width: 2.4, height: 1.2, depth: 2.0 }, scene), r, sandC, 0, 0.6, 0);
    at(MB.CreateBox('mid', { width: 1.8, height: 1.0, depth: 1.5 }, scene), r, sandD, 0, 1.7, 0);
    [[-0.9,0.9],[0.9,-0.9],[0.9,0.9],[-0.9,-0.9]].forEach(([x, z]) => { at(MB.CreateCylinder('twr', { height: 0.7, diameter: 0.5, tessellation: 8 }, scene), r, sandC, x, 1.55, z); at(MB.CreateCylinder('top', { height: 0.3, diameterTop: 0, diameterBottom: 0.5, tessellation: 8 }, scene), r, sandD, x, 1.95, z); });
    at(MB.CreateCylinder('keep', { height: 1.0, diameter: 0.9, tessellation: 8 }, scene), r, sandC, 0, 2.6, 0);
    at(MB.CreateCylinder('flag', { height: 0.5, diameter: 0.05 }, scene), r, dark, 0, 3.3, 0);
    [-0.4,0.4].forEach(z => at(MB.CreateSphere('ey', { diameter: 0.3 }, scene), r, M('glEye', '#1a1208', { emissive: '#ff6a00' }), 0.78, 1.8, z));
    return { node: r, idle(t) { r.rotation.z = Math.sin(t*1.2)*0.02; } };
  }
  function kraken() {
    const r = new BABYLON.TransformNode('eKraken', scene);
    const green = M('krGreen', '#2f6b54', { spec: 0.3, emissive: '#0a2018' }), green2 = M('krG2', '#244f3f');
    at(MB.CreateSphere('head', { diameterX: 2.6, diameterY: 3.0, diameterZ: 2.6, segments: 16 }, scene), r, green, 0, 2.2, 0);
    [-0.55,0.55].forEach(z => { at(MB.CreateSphere('eyW', { diameter: 0.7 }, scene), r, M('krW', '#ffe08a', { emissive: '#caa030' }), 1.0, 2.6, z); at(MB.CreateSphere('eyB', { diameter: 0.32 }, scene), r, M('krB', '#0a0a0a'), 1.25, 2.6, z); });
    const arms = [];
    for (let i = 0; i < 10; i++) { const a = (i/10)*Math.PI*2; const tn = at(MB.CreateCylinder('arm', { height: 2.6, diameterTop: 0.12, diameterBottom: 0.5 }, scene), r, green2, Math.cos(a)*1.0, 1.0, Math.sin(a)*1.0); tn.rotation.x = Math.sin(a)*0.5; tn.rotation.z = -Math.cos(a)*0.5; arms.push(tn); }
    return { node: r, idle(t) { arms.forEach((tn, i) => tn.rotation.y = Math.sin(t*1.6 + i)*0.25); } };
  }

  // Selachoth — the One-Finned Angel: an elegant silver-haired shark-man
  // in a long black coat, wielding the impossibly long katana "Tidemourn".
  function selachoth() {
    const r = new BABYLON.TransformNode('eSelachoth', scene);
    const coat = M('selCoat', '#16181f', { spec: 0.25 }), coat2 = M('selCoat2', '#22252f'),
          skin = M('selSkin', '#aebfc8', { spec: 0.4 }), hair = M('selHair', '#e8eef2', { emissive: '#3a4248' }),
          steel = M('selSteel', '#dfe7ef', { spec: 0.95, specPower: 120 }), teal = M('selTeal', '#3fe0d0', { emissive: '#1fb0a8' }),
          dark = M('selDark', '#0c0e13'), gold = M('selGold', '#ffe08a', { emissive: '#d8a830' });
    // tall, slim build
    at(MB.CreateCylinder('coatLower', { height: 2.0, diameterTop: 0.7, diameterBottom: 1.3 }, scene), r, coat, 0, 1.0, 0);
    at(MB.CreateBox('coatSplit', { width: 0.18, height: 2.0, depth: 0.1 }, scene), r, dark, 0, 1.0, 0.62);
    at(MB.CreateBox('torso', { width: 0.85, height: 1.25, depth: 0.5 }, scene), r, coat, 0, 2.25, 0);
    at(MB.CreateBox('chest', { width: 0.5, height: 1.0, depth: 0.52 }, scene), r, coat2, 0, 2.2, 0.02);
    at(MB.CreateBox('beltsash', { width: 0.9, height: 0.16, depth: 0.54 }, scene), r, teal, 0, 1.78, 0);
    // high collar
    const collar = at(MB.CreateCylinder('collar', { height: 0.7, diameterTop: 1.2, diameterBottom: 0.7, tessellation: 16 }, scene), r, coat, 0, 3.0, -0.15); collar.scaling.z = 0.6;
    // shoulders
    [-1, 1].forEach(s => at(MB.CreateSphere('pauld', { diameter: 0.6, slice: 0.6 }, scene), r, steel, s*0.55, 2.75, 0));
    // left arm
    const aL = at(MB.CreateCylinder('aL', { height: 1.4, diameter: 0.24 }, scene), r, coat2, -0.6, 2.1, 0); aL.rotation.z = 0.18;
    // right arm holds Tidemourn
    const arm = new BABYLON.TransformNode('selArm', scene); arm.parent = r; arm.position.set(0.6, 2.75, 0.1);
    at(MB.CreateCylinder('aR', { height: 1.4, diameter: 0.24 }, scene), arm, coat2, 0, -0.7, 0);
    const sw = new BABYLON.TransformNode('selSword', scene); sw.parent = arm; sw.position.set(0, -1.0, 0.4); sw.rotation.x = 1.2;
    at(MB.CreateBox('blade', { width: 0.1, height: 5.2, depth: 0.04 }, scene), sw, steel, 0, 2.7, 0);
    at(MB.CreateBox('bladeGlow', { width: 0.04, height: 5.0, depth: 0.06 }, scene), sw, teal, 0.05, 2.7, 0);
    at(MB.CreateCylinder('grip', { height: 0.5, diameter: 0.09 }, scene), sw, dark, 0, -0.05, 0);
    at(MB.CreateBox('tsuba', { width: 0.3, height: 0.06, depth: 0.18 }, scene), sw, gold, 0, 0.22, 0);
    // head — pale, slit gold eyes, gills, sharp grin
    at(MB.CreateSphere('head', { diameterX: 0.6, diameterY: 0.68, diameterZ: 0.66 }, scene), r, skin, 0, 3.35, 0.05);
    at(MB.CreateBox('mouth', { width: 0.36, height: 0.08, depth: 0.1 }, scene), r, M('selGrin', '#f4f7fa'), 0, 3.18, 0.34);
    [-0.16, 0.16].forEach(x => at(MB.CreateBox('eye', { width: 0.13, height: 0.05, depth: 0.05 }, scene), r, gold, x, 3.4, 0.32));
    [-0.22, 0.22].forEach(x => [0,1,2].forEach(i => at(MB.CreateBox('gill', { width: 0.04, height: 0.16, depth: 0.05 }, scene), r, dark, x + (x>0?1:-1)*0 + (x>0? -0.04*i : 0.04*i), 3.0, 0.18)));
    // long flowing silver hair
    at(MB.CreateSphere('hairTop', { diameter: 0.72, slice: 0.55 }, scene), r, hair, 0, 3.5, -0.02);
    at(MB.CreateBox('hairBack', { width: 0.55, height: 2.4, depth: 0.18 }, scene), r, hair, 0, 2.4, -0.3);
    [-0.3, 0.3].forEach(x => at(MB.CreateBox('hairSide', { width: 0.16, height: 1.8, depth: 0.16 }, scene), r, hair, x, 2.7, 0.1));
    [-0.12, 0.12].forEach(x => { const bang = at(MB.CreateCylinder('bang', { height: 0.7, diameterTop: 0, diameterBottom: 0.16 }, scene), r, hair, x, 3.5, 0.32); bang.rotation.x = 0.5; });
    // the single great dorsal "wing" fin
    const wing = at(MB.CreateCylinder('wing', { height: 0.2, diameter: 4.2, tessellation: 3 }, scene), r, M('selWing', '#1a1d24', { emissive: '#0c2a2a' }), 0.1, 3.0, -0.7);
    wing.rotation.x = Math.PI / 2; wing.rotation.z = 0.5; wing.scaling.x = 0.55;
    at(MB.CreateCylinder('wingEdge', { height: 0.22, diameter: 4.0, tessellation: 3 }, scene), r, teal, 0.12, 3.0, -0.72).rotation.set(Math.PI/2, 0, 0.5);
    r.scaling.setAll(1.15);
    return { node: r, idle(t) { wing.rotation.z = 0.5 + Math.sin(t * 0.8) * 0.08; r.rotation.y = -Math.PI/2.1 + Math.sin(t * 0.5) * 0.04; } };
  }


  // ---------------- OVERWORLD / TOWN PROPS ----------------
  function hero() { // walking avatar (the SOLDIER), simplified swing not needed
    return swordsman();
  }
  function npc(hex, hairHex) {
    const r = new BABYLON.TransformNode('npc', scene);
    const body = M('npcBody', hex), skin = M('npcSkin', '#d9a06b'), hair = M('npcHair', hairHex || '#3a2a18');
    at(MB.CreateCylinder('legs', { height: 1.0, diameterTop: 0.55, diameterBottom: 0.7 }, scene), r, body, 0, 0.5, 0);
    at(MB.CreateBox('torso', { width: 0.7, height: 0.9, depth: 0.45 }, scene), r, body, 0, 1.4, 0);
    at(MB.CreateSphere('head', { diameter: 0.55 }, scene), r, skin, 0, 2.05, 0);
    at(MB.CreateSphere('hair', { diameter: 0.6, slice: 0.55 }, scene), r, hair, 0, 2.18, 0);
    return { node: r, idle(t) { r.position.y = (r._baseY || 0) + Math.sin(t * 2 + (r._ph || 0)) * 0.04; } };
  }
  function rival() { // "Ruffy" — straw-hat rubber pirate (Luffy homage)
    const r = new BABYLON.TransformNode('rival', scene);
    const skin = M('rvSkin', '#e8b48a'), vest = M('rvVest', '#c2332a'), shorts = M('rvShorts', '#2f5aa0'),
          hair = M('rvHair', '#161616'), straw = M('rvStraw', '#e0b96a'), band = M('rvBand', '#b8342a');
    at(MB.CreateCylinder('lL', { height: 1.0, diameter: 0.3 }, scene), r, shorts, -0.22, 0.5, 0);
    at(MB.CreateCylinder('lR', { height: 1.0, diameter: 0.3 }, scene), r, shorts, 0.22, 0.5, 0);
    at(MB.CreateBox('torso', { width: 0.82, height: 1.0, depth: 0.48 }, scene), r, skin, 0, 1.5, 0); // open vest = bare chest
    at(MB.CreateBox('vestL', { width: 0.18, height: 1.0, depth: 0.5 }, scene), r, vest, -0.34, 1.5, 0);
    at(MB.CreateBox('vestR', { width: 0.18, height: 1.0, depth: 0.5 }, scene), r, vest, 0.34, 1.5, 0);
    at(MB.CreateBox('sash', { width: 0.86, height: 0.18, depth: 0.5 }, scene), r, band, 0, 1.05, 0);
    at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.26 }, scene), r, skin, -0.56, 1.5, 0).rotation.z = 0.25;
    const arm = new BABYLON.TransformNode('rvArm', scene); arm.parent = r; arm.position.set(0.56, 1.9, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.26 }, scene), arm, skin, 0, -0.45, 0);
    at(MB.CreateSphere('fist', { diameter: 0.42 }, scene), arm, skin, 0, -0.95, 0); // big fist
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.35, 0);
    at(MB.CreateSphere('hair', { diameter: 0.64, slice: 0.5 }, scene), r, hair, 0, 2.4, 0);
    // iconic straw hat worn ON the head
    at(MB.CreateCylinder('brim', { height: 0.07, diameter: 1.1, tessellation: 20 }, scene), r, straw, 0, 2.62, 0);
    at(MB.CreateTorus('hatband', { diameter: 0.66, thickness: 0.08, tessellation: 18 }, scene), r, band, 0, 2.66, 0).rotation.x = Math.PI/2;
    at(MB.CreateCylinder('dome', { height: 0.34, diameterTop: 0.5, diameterBottom: 0.64, tessellation: 20 }, scene), r, straw, 0, 2.82, 0);
    return { node: r, arm };
  }

  function mermaid(hairHex, tailHex) {
    const r = new BABYLON.TransformNode('mermaid', scene);
    const skin = M('mmSkin', '#eccaa8'), hair = M('mmHair', hairHex || '#3fd0e0', { emissive: '#141414' }),
          tail = M('mmTail', tailHex || '#2fae9a', { spec: 0.6, specPower: 40, emissive: '#0c3a33' }),
          tailLite = M('mmTail2', tailHex || '#2fae9a', { spec: 0.7 }), top = M('mmTop', '#ff7eb0', { emissive: '#5a1a30' });
    // curvy tail: hips -> taper -> flukes
    at(MB.CreateSphere('hips', { diameterX: 1.05, diameterY: 0.8, diameterZ: 0.95 }, scene), r, tail, 0, 0.95, -0.05);
    const t1 = at(MB.CreateCylinder('tail', { height: 1.5, diameterTop: 0.78, diameterBottom: 0.28 }, scene), r, tail, 0, 0.5, 0.35); t1.rotation.x = 0.7;
    [-1, 1].forEach(s => { const fl = at(MB.CreateCylinder('fluke', { height: 0.16, diameter: 1.1, tessellation: 3 }, scene), r, tailLite, s * 0.35, 0.12, 1.15); fl.rotation.x = Math.PI/2; fl.rotation.z = s * 0.5; fl.scaling.x = 0.6; });
    // hourglass torso: bust -> narrow waist
    at(MB.CreateCylinder('waist', { height: 0.7, diameterTop: 0.62, diameterBottom: 0.5 }, scene), r, skin, 0, 1.55, -0.02);
    at(MB.CreateSphere('bustBase', { diameterX: 0.78, diameterY: 0.5, diameterZ: 0.5 }, scene), r, skin, 0, 1.92, 0.02);
    [-0.19, 0.19].forEach(x => at(MB.CreateSphere('bust', { diameter: 0.34 }, scene), r, top, x, 1.92, 0.16));
    at(MB.CreateBox('strap', { width: 0.8, height: 0.1, depth: 0.5 }, scene), r, top, 0, 2.0, 0.04);
    // slender arms
    at(MB.CreateCylinder('aL', { height: 0.85, diameter: 0.14 }, scene), r, skin, -0.42, 1.7, 0.05).rotation.z = 0.55;
    at(MB.CreateCylinder('aR', { height: 0.85, diameter: 0.14 }, scene), r, skin, 0.42, 1.7, 0.05).rotation.z = -0.55;
    // graceful neck + head
    at(MB.CreateCylinder('neck', { height: 0.25, diameter: 0.2 }, scene), r, skin, 0, 2.28, 0);
    at(MB.CreateSphere('head', { diameterX: 0.5, diameterY: 0.56, diameterZ: 0.52 }, scene), r, skin, 0, 2.55, 0.02);
    // long flowing hair framing the face + down the back
    at(MB.CreateSphere('hairTop', { diameter: 0.62, slice: 0.62 }, scene), r, hair, 0, 2.66, -0.02);
    at(MB.CreateBox('hairBack', { width: 0.66, height: 1.9, depth: 0.2 }, scene), r, hair, 0, 1.85, -0.26);
    [-0.3, 0.3].forEach(x => at(MB.CreateBox('hairSide', { width: 0.18, height: 1.5, depth: 0.18 }, scene), r, hair, x, 2.0, 0.12));
    // little shell tiara
    at(MB.CreateCylinder('tiara', { height: 0.12, diameterTop: 0, diameterBottom: 0.22, tessellation: 6 }, scene), r, M('mmTiara', '#fff0c0', { emissive: '#caa84a' }), 0, 2.84, 0.18);
    return { node: r, idle(t) { r.rotation.y = Math.sin(t * 0.8) * 0.12; r.position.y = (r._baseY || 0) + Math.sin(t * 1.4) * 0.06; } };
  }

  function tree() {
    const r = new BABYLON.TransformNode('tree', scene);
    at(MB.CreateCylinder('trunk', { height: 1.6, diameterTop: 0.3, diameterBottom: 0.5 }, scene), r, M('trunk', '#6b4423'), 0, 0.8, 0);
    at(MB.CreateSphere('leaf1', { diameter: 2.2 }, scene), r, M('leaf', '#2f7d4f', { emissive: '#0c2a18' }), 0, 2.1, 0);
    at(MB.CreateSphere('leaf2', { diameter: 1.6 }, scene), r, M('leaf2', '#359158', { emissive: '#0c2a18' }), 0.5, 2.6, 0.3);
    return { node: r };
  }
  function palm() {
    const r = new BABYLON.TransformNode('palm', scene);
    const trunkMat = M('palmTrunk', '#9a6b3a'), frondMat = M('frond', '#2f9d54', { emissive: '#0c2a18' }), coco = M('coco', '#5a3a1e');
    // gently curved trunk
    for (let i = 0; i < 4; i++) { const seg = at(MB.CreateCylinder('tr' + i, { height: 0.95, diameterTop: 0.3 - i*0.03, diameterBottom: 0.46 - i*0.03 }, scene), r, trunkMat, Math.sin(i*0.5)*0.25, 0.5 + i*0.85, 0); seg.rotation.z = -0.1 * i; }
    const tx = Math.sin(1.5)*0.25, ty = 3.7;
    at(MB.CreateSphere('knot', { diameter: 0.55 }, scene), r, frondMat, tx, ty, 0);
    // drooping fronds — flat blades fanning out and bending downward
    for (let i = 0; i < 7; i++) {
      const a = (i/7)*Math.PI*2;
      const f = MB.CreateBox('frond', { width: 0.5, height: 0.08, depth: 2.0 }, scene); f.material = frondMat; f.parent = r;
      f.position.set(tx + Math.cos(a)*1.0, ty - 0.15, Math.sin(a)*1.0);
      f.rotation.y = -a; f.rotation.x = 0.5; // angle the far end down for a droop
    }
    [[0.16,-0.1],[-0.12,0.14],[0.04,0.16]].forEach(([cx,cz]) => at(MB.CreateSphere('coco', { diameter: 0.24 }, scene), r, coco, tx+cx, ty-0.25, cz));
    return { node: r };
  }
  function rock() {
    const r = new BABYLON.TransformNode('rock', scene);
    const tints = ['#8a8f96', '#7a7068', '#6f7a72', '#9a9088', '#6a6f7a'];
    const col = tints[Math.floor(Math.random() * tints.length)];
    const mat = M('rock', col, { spec: 0.12 });
    const n = 1 + (Math.random() < 0.6 ? 1 : 0); // 1-2 lumps for variety
    for (let i = 0; i < n; i++) {
      const s = at(MB.CreateSphere('r' + i, { diameterX: 1.4 + Math.random()*0.8, diameterY: 0.9 + Math.random()*0.6, diameterZ: 1.2 + Math.random()*0.7, segments: 3 }, scene), r, mat, (Math.random()-0.5)*0.7, 0.45 + i*0.25, (Math.random()-0.5)*0.7);
      s.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    }
    return { node: r };
  }
  function house(opts = {}) {
    const r = new BABYLON.TransformNode('house', scene);
    const wall = M('wall', opts.wall || '#e8d5b0'), roof = M('roof', opts.roof || '#a0492f'), door = M('door', '#5b3a1e');
    const w = opts.w || 4, h = opts.h || 3, d = opts.d || 4;
    at(MB.CreateBox('walls', { width: w, height: h, depth: d }, scene), r, wall, 0, h/2, 0);
    // pitched gable roof: two slanted panels meeting at a ridge (properly sized)
    [-1, 1].forEach(s => { const p = at(MB.CreateBox('roof', { width: w * 0.62, height: 0.16, depth: d + 0.7 }, scene), r, roof, s * w * 0.22, h + 0.42, 0); p.rotation.z = -s * 0.72; });
    at(MB.CreateBox('ridge', { width: 0.18, height: 0.16, depth: d + 0.7 }, scene), r, roof, 0, h + 0.78, 0);
    at(MB.CreateBox('eave', { width: w + 0.2, height: 0.12, depth: d + 0.2 }, scene), r, roof, 0, h + 0.06, 0);
    at(MB.CreateBox('door', { width: 0.9, height: 1.6, depth: 0.1 }, scene), r, door, 0, 0.8, d/2 + 0.01);
    at(MB.CreateBox('win1', { width: 0.7, height: 0.7, depth: 0.1 }, scene), r, M('win', '#9be7ff', { emissive: '#3a6a80' }), -1.1, 1.7, d/2 + 0.01);
    at(MB.CreateBox('win2', { width: 0.7, height: 0.7, depth: 0.1 }, scene), r, M('win2', '#9be7ff', { emissive: '#3a6a80' }), 1.1, 1.7, d/2 + 0.01);
    return { node: r };
  }
  function sign(label) {
    const r = new BABYLON.TransformNode('sign', scene);
    at(MB.CreateCylinder('post', { height: 1.4, diameter: 0.12 }, scene), r, M('post', '#6b4423'), 0, 0.7, 0);
    const board = at(MB.CreateBox('board', { width: 1.6, height: 0.7, depth: 0.08 }, scene), r, M('board', '#a3743c'), 0, 1.5, 0);
    if (label) {
      const dt = new BABYLON.DynamicTexture('sg', { width: 256, height: 112 }, scene, false);
      dt.hasAlpha = true; dt.drawText(label, null, 70, 'bold 40px sans', '#3a2410', 'transparent', true);
      const m = new BABYLON.StandardMaterial('sgm', scene); m.diffuseTexture = dt; m.emissiveColor = new Color3(0.6, 0.45, 0.2); m.specularColor = new Color3(0,0,0);
      board.material = m;
    }
    return { node: r };
  }
  function portal(hex) { // glowing marker for town gates / battle nodes
    const r = new BABYLON.TransformNode('portal', scene);
    const ring = at(MB.CreateTorus('ring', { diameter: 2.4, thickness: 0.25, tessellation: 24 }, scene), r, M('portal', hex, { emissive: hex }), 0, 0.4, 0);
    ring.rotation.x = Math.PI / 2;
    return { node: r, idle(t) { ring.rotation.z = t * 1.5; r.position.y = (r._baseY || 0) + Math.sin(t * 2) * 0.1; } };
  }
  function roamer(hex) { // wandering threat token on the world map
    const r = new BABYLON.TransformNode('roamer', scene);
    const body = at(MB.CreateSphere('body', { diameterX: 1.3, diameterY: 1.0, diameterZ: 1.3, segments: 8 }, scene), r, M('roam', hex, { emissive: hex, spec: 0.4 }), 0, 0.7, 0);
    at(MB.CreateSphere('eL', { diameter: 0.22 }, scene), r, M('roEye', '#fff'), 0.3, 0.9, 0.5);
    at(MB.CreateSphere('eR', { diameter: 0.22 }, scene), r, M('roEye2', '#fff'), -0.3, 0.9, 0.5);
    at(MB.CreateSphere('pL', { diameter: 0.1 }, scene), r, M('roP', '#000'), 0.34, 0.9, 0.6);
    at(MB.CreateSphere('pR', { diameter: 0.1 }, scene), r, M('roP2', '#000'), -0.26, 0.9, 0.6);
    return { node: r, body, idle(t) { body.scaling.y = 1 + Math.sin(t * 6 + (r._ph || 0)) * 0.12; } };
  }

  function leviathan() { // reaper-style deep-sea horror
    const r = new BABYLON.TransformNode('eLeviathan', scene);
    const body = M('lvBody', '#2a4a5a', { spec: 0.3, emissive: '#08161e' }), body2 = M('lvBody2', '#1f3a47'),
          teeth = M('lvTeeth', '#e8e0d0'), eye = M('lvEye', '#7fffd0', { emissive: '#2fffb0' });
    for (let i = 0; i < 5; i++) at(MB.CreateSphere('s' + i, { diameterX: 2.2 - i * 0.32, diameterY: 1.6 - i * 0.22, diameterZ: 1.6 - i * 0.22, segments: 12 }, scene), r, i % 2 ? body2 : body, -1.6 - i * 1.2, 1.2 + Math.sin(i * 0.7) * 0.35, 0);
    at(MB.CreateSphere('head', { diameterX: 2.4, diameterY: 1.9, diameterZ: 1.9, segments: 14 }, scene), r, body, 0.4, 1.3, 0);
    const jt = at(MB.CreateCylinder('jt', { height: 1.7, diameterTop: 0, diameterBottom: 1.3, tessellation: 8 }, scene), r, body, 1.7, 1.6, 0); jt.rotation.z = -Math.PI / 2;
    const jb = at(MB.CreateCylinder('jb', { height: 1.7, diameterTop: 0, diameterBottom: 1.3, tessellation: 8 }, scene), r, body2, 1.7, 1.0, 0); jb.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; at(MB.CreateCylinder('t', { height: 0.45, diameterTop: 0, diameterBottom: 0.2 }, scene), r, teeth, 1.5, 1.3 + Math.cos(a) * 0.55, Math.sin(a) * 0.55).rotation.x = Math.cos(a) > 0 ? Math.PI : 0; }
    [-0.55, 0.55].forEach(z => at(MB.CreateSphere('e', { diameter: 0.34 }, scene), r, eye, 0.9, 1.95, z));
    [-1, 1].forEach(s => { const f = at(MB.CreateCylinder('mand', { height: 2.0, diameterTop: 0, diameterBottom: 0.45, tessellation: 6 }, scene), r, body2, 1.2, 1.3, s * 1.1); f.rotation.x = s * Math.PI / 2; f.rotation.z = -0.6; });
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 1.2) * 0.05; r.position.y = (r._baseY || 0) + Math.sin(t * 0.9) * 0.2; } };
  }
  function angler() { // anglerfish abyss horror with a glowing lure
    const r = new BABYLON.TransformNode('eAngler', scene);
    const body = M('agBody', '#1a2230', { spec: 0.2, emissive: '#050d16' }), mouth = M('agMouth', '#3a0a14'),
          teeth = M('agTeeth', '#e8e0d0'), lure = M('agLure', '#aef0ff', { emissive: '#6fe0ff' });
    at(MB.CreateSphere('body', { diameterX: 3, diameterY: 2.6, diameterZ: 2.6, segments: 14 }, scene), r, body, 0, 1.7, 0);
    at(MB.CreateBox('mouth', { width: 1.7, height: 1.0, depth: 2.3 }, scene), r, mouth, 1.3, 1.3, 0);
    for (let i = 0; i < 6; i++) { at(MB.CreateCylinder('tu', { height: 0.45, diameterTop: 0, diameterBottom: 0.18 }, scene), r, teeth, 1.7, 1.7, -0.8 + i * 0.32).rotation.x = Math.PI; at(MB.CreateCylinder('td', { height: 0.45, diameterTop: 0, diameterBottom: 0.18 }, scene), r, teeth, 1.7, 1.0, -0.8 + i * 0.32); }
    [-0.55, 0.55].forEach(z => { at(MB.CreateSphere('ew', { diameter: 0.5 }, scene), r, M('agW', '#d8d0b0'), 0.9, 2.2, z); at(MB.CreateSphere('eb', { diameter: 0.26 }, scene), r, M('agB', '#0a0a0a'), 1.1, 2.2, z); });
    at(MB.CreateCylinder('stalk', { height: 1.7, diameter: 0.1 }, scene), r, body, 1.0, 3.1, 0).rotation.z = -0.4;
    const bulb = at(MB.CreateSphere('lure', { diameter: 0.55 }, scene), r, lure, 1.9, 3.7, 0);
    return { node: r, idle(t) { bulb.scaling.setAll(1 + Math.sin(t * 3) * 0.22); } };
  }
  // ---- new enemy variety ----
  function eel() { // voltaic eel — long electric ribbon
    const r = new BABYLON.TransformNode('eEel', scene);
    const body = M('eelBody', '#2f6f5a', { spec: 0.5, emissive: '#0a2a22' }), fin = M('eelFin', '#7df0c0', { emissive: '#2fd0a0' }), eye = M('eelEye', '#fde047', { emissive: '#fde047' });
    for (let i = 0; i < 7; i++) { const seg = at(MB.CreateSphere('s'+i, { diameterX: 1.0 - i*0.07, diameterY: 0.8 - i*0.05, diameterZ: 0.8 - i*0.05, segments: 8 }, scene), r, i%2?body:fin, -i*0.7, 1.4 + Math.sin(i*0.8)*0.4, 0); seg._ph = i; }
    at(MB.CreateSphere('head', { diameterX: 1.2, diameterY: 1.0, diameterZ: 1.0, segments: 10 }, scene), r, body, 0.6, 1.4, 0);
    [-0.32, 0.32].forEach(z => at(MB.CreateSphere('e', { diameter: 0.22 }, scene), r, eye, 0.9, 1.6, z));
    at(MB.CreateCylinder('fin', { height: 1.6, diameterTop: 0, diameterBottom: 0.5 }, scene), r, fin, 0.2, 2.1, 0).rotation.x = 0;
    return { node: r, idle(t) { r.rotation.z = Math.sin(t*2.5)*0.12; r.position.y = (r._baseY||0) + Math.sin(t*1.6)*0.15; } };
  }
  function urchin() { // spine urchin — earth, spiky ball
    const r = new BABYLON.TransformNode('eUrchin', scene);
    const body = M('urB', '#3a2a4a', { spec: 0.3 }), spike = M('urS', '#c2a062', { emissive: '#3a2e12' }), eye = M('urE', '#ff5e5e', { emissive: '#ff5e5e' });
    at(MB.CreateSphere('core', { diameter: 1.5, segments: 10 }, scene), r, body, 0, 1.0, 0);
    for (let i = 0; i < 26; i++) { const a = i*2.4, b = i*1.3; const x = Math.cos(a)*Math.sin(b), y = Math.cos(b), z = Math.sin(a)*Math.sin(b); const sp = at(MB.CreateCylinder('sp'+i, { height: 0.9, diameterTop: 0, diameterBottom: 0.16 }, scene), r, spike, x*0.7, 1.0 + y*0.7, z*0.7); sp.lookAt(new V3(x*2, 1.0+y*2, z*2)); sp.rotation.x += Math.PI/2; }
    [-0.3, 0.3].forEach(z => at(MB.CreateSphere('e', { diameter: 0.2 }, scene), r, eye, 0.5, 1.2, z));
    return { node: r, idle(t) { r.rotation.y = t*0.6; r.position.y = (r._baseY||0) + Math.abs(Math.sin(t*1.5))*0.15; } };
  }
  // ---- vampire-keep roster ----
  function bat() { // giant cave bat
    const r = new BABYLON.TransformNode('eBat', scene);
    const fur = M('batFur', '#3a2a3a', { spec: 0.2 }), wing = M('batWing', '#1a1020'), eye = M('batEye', '#ff3a3a', { emissive: '#ff3a3a' }), fang = M('batFang', '#f0ead8');
    at(MB.CreateSphere('body', { diameterX: 0.9, diameterY: 1.0, diameterZ: 0.9, segments: 10 }, scene), r, fur, 0, 1.6, 0);
    at(MB.CreateSphere('head', { diameter: 0.7 }, scene), r, fur, 0, 2.2, 0.1);
    [-1, 1].forEach(s => { at(MB.CreateCylinder('ear', { height: 0.5, diameterTop: 0, diameterBottom: 0.22 }, scene), r, fur, s*0.2, 2.6, 0.05); });
    [-0.18, 0.18].forEach(z => at(MB.CreateSphere('e', { diameter: 0.16 }, scene), r, eye, 0.28, 2.25, z));
    [-0.1, 0.1].forEach(z => at(MB.CreateCylinder('fang', { height: 0.18, diameterTop: 0, diameterBottom: 0.07 }, scene), r, fang, 0.3, 1.95, z).rotation.x = Math.PI);
    const wings = [];
    [-1, 1].forEach(s => { const w = at(MB.CreateBox('w', { width: 1.6, height: 0.06, depth: 1.0 }, scene), r, wing, s*1.1, 1.7, 0); w.rotation.y = s*0.3; wings.push({ w, s }); });
    return { node: r, idle(t) { wings.forEach(o => o.w.rotation.z = Math.sin(t*8)*0.5*o.s); r.position.y = (r._baseY||0) + Math.sin(t*4)*0.25; } };
  }
  function ghoul() { // drowned ghoul — rotted undead sailor
    const r = new BABYLON.TransformNode('eGhoul', scene);
    const flesh = M('ghF', '#5a6a52', { spec: 0.1 }), rag = M('ghR', '#2a3028'), bone = M('ghB', '#d8d0b0'), eye = M('ghE', '#9bff6a', { emissive: '#5aff2a' });
    at(MB.CreateCylinder('lL', { height: 1.0, diameter: 0.3 }, scene), r, rag, -0.22, 0.5, 0);
    at(MB.CreateCylinder('lR', { height: 1.0, diameter: 0.3 }, scene), r, rag, 0.22, 0.5, 0);
    at(MB.CreateBox('torso', { width: 0.8, height: 1.1, depth: 0.5 }, scene), r, rag, 0, 1.5, 0);
    at(MB.CreateBox('ribs', { width: 0.6, height: 0.5, depth: 0.42 }, scene), r, bone, 0, 1.7, 0.06);
    const aL = at(MB.CreateCylinder('aL', { height: 1.0, diameter: 0.22 }, scene), r, flesh, -0.55, 1.5, 0.2); aL.rotation.x = -0.8;
    const aR = at(MB.CreateCylinder('aR', { height: 1.0, diameter: 0.22 }, scene), r, flesh, 0.55, 1.5, 0.2); aR.rotation.x = -0.8;
    at(MB.CreateSphere('head', { diameter: 0.56 }, scene), r, flesh, 0, 2.35, 0);
    [-0.15, 0.15].forEach(z => at(MB.CreateSphere('e', { diameter: 0.15 }, scene), r, eye, 0.16, 2.4, z));
    return { node: r, idle(t) { r.rotation.z = Math.sin(t*1.4)*0.06; r.position.y = (r._baseY||0) + Math.abs(Math.sin(t*1.2))*0.08; } };
  }
  function wraith() { // drowned wraith — floating dark spirit
    const r = new BABYLON.TransformNode('eWraith', scene);
    const robe = M('wrR', '#241a36', { spec: 0.1, emissive: '#0a0618' }), robe2 = M('wrR2', '#3a2a52'), eye = M('wrE', '#b06aff', { emissive: '#b06aff' });
    at(MB.CreateCylinder('robe', { height: 2.4, diameterTop: 0.4, diameterBottom: 1.8, tessellation: 10 }, scene), r, robe, 0, 1.3, 0);
    at(MB.CreateSphere('hood', { diameter: 0.9, slice: 0.7 }, scene), r, robe2, 0, 2.4, 0.05);
    at(MB.CreateSphere('void', { diameter: 0.6 }, scene), r, M('wrV', '#0a0612', { emissive: '#1a0a2a' }), 0, 2.3, 0.18);
    [-0.16, 0.16].forEach(z => at(MB.CreateSphere('e', { diameter: 0.18 }, scene), r, eye, 0.18, 2.35, z));
    [-1, 1].forEach(s => { const a = at(MB.CreateCylinder('a', { height: 1.1, diameterTop: 0.05, diameterBottom: 0.22 }, scene), r, robe2, s*0.7, 1.7, 0.2); a.rotation.z = s*0.7; });
    return { node: r, idle(t) { r.position.y = (r._baseY||0) + Math.sin(t*1.8)*0.3; r.rotation.y = Math.sin(t*0.8)*0.15; } };
  }
  function vampire() { // boss — Count Saltorre, the Tideborn Vampire (Dracula parody)
    const r = new BABYLON.TransformNode('eVampire', scene);
    const cape = M('vpCape', '#3a0a18', { spec: 0.3 }), capeIn = M('vpCapeIn', '#7a1f2f'), suit = M('vpSuit', '#14121c'),
          skin = M('vpSkin', '#dfe0e8'), hair = M('vpHair', '#0a0a12'), eye = M('vpEye', '#ff2a3a', { emissive: '#ff2a3a' }), gold = M('vpGold', '#d9a521', { emissive: '#4a3606' });
    at(MB.CreateCylinder('lL', { height: 1.3, diameter: 0.34 }, scene), r, suit, -0.24, 0.65, 0);
    at(MB.CreateCylinder('lR', { height: 1.3, diameter: 0.34 }, scene), r, suit, 0.24, 0.65, 0);
    at(MB.CreateBox('torso', { width: 1.0, height: 1.4, depth: 0.6 }, scene), r, suit, 0, 1.9, 0);
    at(MB.CreateBox('collar', { width: 1.3, height: 0.8, depth: 0.2 }, scene), r, capeIn, 0, 2.7, -0.25).rotation.x = -0.3;
    // sweeping cape
    const capeMesh = at(MB.CreateCylinder('cape', { height: 2.6, diameterTop: 1.0, diameterBottom: 2.6, tessellation: 12, arc: 0.55 }, scene), r, cape, 0, 1.7, -0.3); capeMesh.rotation.y = Math.PI;
    at(MB.CreateSphere('head', { diameter: 0.66 }, scene), r, skin, 0, 3.0, 0);
    at(MB.CreateSphere('hair', { diameter: 0.72, slice: 0.6 }, scene), r, hair, 0, 3.12, -0.02);
    at(MB.CreateBox('widow', { width: 0.12, height: 0.14, depth: 0.05 }, scene), r, hair, 0, 2.82, 0.31);
    [-0.16, 0.16].forEach(z => at(MB.CreateSphere('e', { diameter: 0.13 }, scene), r, eye, 0.2, 3.02, z));
    [-0.08, 0.08].forEach(z => at(MB.CreateCylinder('fang', { height: 0.14, diameterTop: 0, diameterBottom: 0.06 }, scene), r, M('vpFang', '#fff'), 0.28, 2.78, z).rotation.x = Math.PI);
    at(MB.CreateBox('medal', { width: 0.2, height: 0.2, depth: 0.06 }, scene), r, gold, 0, 2.3, 0.31).rotation.z = 0.78;
    const aL = at(MB.CreateCylinder('aL', { height: 1.1, diameter: 0.26 }, scene), r, suit, -0.66, 1.95, 0.1); aL.rotation.z = 0.3; aL.rotation.x = -0.4;
    const aR = at(MB.CreateCylinder('aR', { height: 1.1, diameter: 0.26 }, scene), r, suit, 0.66, 1.95, 0.1); aR.rotation.z = -0.3; aR.rotation.x = -0.4;
    return { node: r, idle(t) { r.position.y = (r._baseY||0) + Math.sin(t*1.1)*0.12; capeMesh.rotation.z = Math.sin(t*1.3)*0.06; } };
  }
  function drifter() { // Gilgamuck — many-bladed wandering swordsman (superboss)
    const r = new BABYLON.TransformNode('eDrifter', scene);
    const cloth = M('drCloth', '#3a4d6b', { spec: 0.2 }), cloth2 = M('drCloth2', '#2c3a52'), skin = M('drSkin', '#c89a72'),
          steel = M('drSteel', '#cfd8e4', { spec: 0.8 }), gold = M('drGold', '#caa030', { emissive: '#3a2e08' }), hair = M('drHair', '#b8b0a0');
    at(MB.CreateCylinder('lL', { height: 1.5, diameter: 0.4 }, scene), r, cloth2, -0.28, 0.75, 0);
    at(MB.CreateCylinder('lR', { height: 1.5, diameter: 0.4 }, scene), r, cloth2, 0.28, 0.75, 0);
    at(MB.CreateBox('torso', { width: 1.2, height: 1.6, depth: 0.7 }, scene), r, cloth, 0, 2.1, 0);
    at(MB.CreateBox('sash', { width: 1.26, height: 0.24, depth: 0.74 }, scene), r, gold, 0, 1.6, 0);
    at(MB.CreateSphere('head', { diameter: 0.7 }, scene), r, skin, 0, 3.15, 0);
    at(MB.CreateSphere('hair', { diameter: 0.78, slice: 0.55 }, scene), r, hair, 0, 3.28, -0.05);
    at(MB.CreateBox('mask', { width: 0.74, height: 0.22, depth: 0.66 }, scene), r, gold, 0, 3.18, 0); // golden visor
    [-0.12, 0.12].forEach(z => at(MB.CreateSphere('e', { diameter: 0.1 }, scene), r, M('drEye', '#ff5e5e', { emissive: '#ff5e5e' }), 0.3, 3.18, z));
    // six arms, each clutching a different blade, fanned out
    const blades = [];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1; const k = i % 3;
      const piv = new BABYLON.TransformNode('arm' + i, scene); piv.parent = r; piv.position.set(side * 0.7, 2.4 - k * 0.0, 0);
      piv.rotation.z = side * (0.5 + k * 0.55); piv.rotation.x = -0.2 - k * 0.25;
      at(MB.CreateCylinder('a', { height: 1.1, diameter: 0.22 }, scene), piv, cloth, 0, -0.5, 0);
      const sw = new BABYLON.TransformNode('sw' + i, scene); sw.parent = piv; sw.position.set(0, -1.0, 0.1);
      const w = 0.1 + k * 0.04, len = 1.6 + k * 0.4;
      at(MB.CreateBox('blade', { width: w, height: len, depth: 0.18 }, scene), sw, steel, 0, len / 2, 0);
      at(MB.CreateBox('guard', { width: 0.4, height: 0.1, depth: 0.24 }, scene), sw, gold, 0, 0, 0);
      blades.push({ piv, side });
    }
    return { node: r, idle(t) { blades.forEach((b, i) => b.piv.rotation.z = b.side * (0.5 + (i % 3) * 0.55) + Math.sin(t * 1.5 + i) * 0.08); r.position.y = (r._baseY || 0) + Math.sin(t * 1.0) * 0.1; } };
  }
  const ENEMY_BUILDERS = { shark, crab, jelly, octo, gull, golem, kraken, selachoth, leviathan, angler, eel, urchin, bat, ghoul, wraith, vampire, drifter };

  // ---------------- SIMON (temporary vampire-hunter ally) ----------------
  function simon() {
    const r = new BABYLON.TransformNode('simon', scene);
    const tunic = M('smTunic', '#7a4a1f'), tunic2 = M('smTunic2', '#94632c'), armor = M('smArmor', '#b8bcc8', { spec: 0.7 }),
          skin = M('smSkin', '#cf9a78'), hair = M('smHair', '#5a3a18'), band = M('smBand', '#b03030'), leather = M('smLeather', '#3a2616');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.32 }, scene), r, leather, -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.32 }, scene), r, leather, 0.22, 0.57, 0);
    at(MB.CreateBox('torso', { width: 0.92, height: 1.2, depth: 0.55 }, scene), r, tunic, 0, 1.62, 0);
    at(MB.CreateBox('belt', { width: 0.96, height: 0.18, depth: 0.57 }, scene), r, M('smBelt', '#caa030', { emissive: '#3a2e08' }), 0, 1.25, 0);
    at(MB.CreateBox('pauldron', { width: 0.5, height: 0.3, depth: 0.6 }, scene), r, armor, -0.55, 2.08, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.28 }, scene), r, tunic2, -0.6, 1.6, 0); aL.rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.62, 2.02, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.28 }, scene), arm, tunic2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.5, 0);
    at(MB.CreateSphere('hair', { diameter: 0.66, slice: 0.55 }, scene), r, hair, 0, 2.62, -0.04);
    at(MB.CreateBox('band', { width: 0.66, height: 0.14, depth: 0.62 }, scene), r, band, 0, 2.66, 0);
    // the legendary whip — a chain of short links hanging from the right hand
    const whip = new BABYLON.TransformNode('whip', scene); whip.parent = arm; whip.position.set(0, -0.7, 0.25); whip.rotation.x = 1.2;
    at(MB.CreateBox('handle', { width: 0.1, height: 0.4, depth: 0.1 }, scene), whip, leather, 0, 0.2, 0);
    for (let i = 0; i < 6; i++) at(MB.CreateSphere('lk'+i, { diameter: 0.16 - i*0.012 }, scene), whip, M('smLink'+i, '#9a9aa8', { spec: 0.6 }), 0, 0.45 + i*0.18, 0);
    return { node: r, arm };
  }

  // dungeon props
  function crystal(hex) {
    const r = new BABYLON.TransformNode('crystal', scene);
    const c = at(MB.CreateCylinder('c', { height: 1.4, diameterTop: 0, diameterBottom: 0.7, tessellation: 6 }, scene), r, M('crys', hex, { emissive: hex, alpha: 0.92 }), 0, 1.0, 0);
    at(MB.CreateCylinder('base', { height: 0.3, diameter: 0.9, tessellation: 6 }, scene), r, M('crysBase', '#3a3550'), 0, 0.15, 0);
    return { node: r, gem: c, idle(t) { c.rotation.y = t * 1.5; } };
  }
  function chest() {
    const r = new BABYLON.TransformNode('chest', scene);
    at(MB.CreateBox('base', { width: 1.2, height: 0.7, depth: 0.9 }, scene), r, M('chBase', '#6b4423'), 0, 0.45, 0);
    const lid = at(MB.CreateBox('lid', { width: 1.24, height: 0.4, depth: 0.94 }, scene), r, M('chLid', '#7a5230'), 0, 0.95, 0);
    at(MB.CreateBox('lock', { width: 0.2, height: 0.24, depth: 0.1 }, scene), r, M('chLock', '#e0b34a', { emissive: '#5a4208' }), 0, 0.8, 0.48);
    return { node: r, lid };
  }
  function pillar() { const r = new BABYLON.TransformNode('pillar', scene); at(MB.CreateCylinder('p', { height: 4, diameter: 1.0, tessellation: 8 }, scene), r, M('pil', '#5a5266'), 0, 2, 0); return { node: r }; }

  return { use, M, at, pirate, swordsman, healer, mage, blader, dragoon, rival, simon, mermaid, hero, npc, tree, palm, rock, house, sign, portal, roamer,
           crystal, chest, pillar, enemy: (key) => ENEMY_BUILDERS[key](), ENEMY_BUILDERS };
})();
