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

  // shared face: a pair of eye-whites + pupils (and optional brows) on the +Z front of a head.
  // d = head diameter; call after building the head sphere. opt.one = 'left'|'right' for an eyepatch.
  function face(parent, y, d, opt = {}) {
    const rr = d * 0.5, ez = rr * 0.82, ex = opt.spread != null ? opt.spread : d * 0.24, ey = y + (opt.eyeY != null ? opt.eyeY : d * 0.05);
    const white = M('eyeW', opt.eyeW || '#f6f3ec'), pupil = M('eyeP', opt.pupil || '#241d17', opt.glow ? { emissive: opt.pupil || '#241d17' } : {});
    const sides = opt.one === 'left' ? [-1] : opt.one === 'right' ? [1] : [-1, 1];
    sides.forEach(s => {
      at(MB.CreateSphere('eyeW', { diameter: d * 0.27, segments: 8 }, scene), parent, white, s * ex, ey, ez);
      at(MB.CreateSphere('eyeP', { diameter: d * 0.14, segments: 6 }, scene), parent, pupil, s * ex, ey, ez + d * 0.08);
    });
    if (opt.brow) { const bm = M('brow', opt.brow); sides.forEach(s => { const b = at(MB.CreateBox('brow', { width: d * 0.3, height: d * 0.07, depth: d * 0.12 }, scene), parent, bm, s * ex, ey + d * 0.17, ez); b.rotation.z = s * (opt.angry ? -0.25 : 0); }); }
    return parent;
  }
  // a small hand/glove sphere at the end of a limb
  function hand(parent, x, y, z, hex) { return at(MB.CreateSphere('hand', { diameter: 0.2, segments: 8 }, scene), parent, M('handM', hex || '#d9a06b'), x, y, z); }
  // subtle rounded shoulder caps so a box torso doesn't meet the arms at a hard corner
  function shoulders(parent, mat, y, x, dia) { [-1, 1].forEach(s => at(MB.CreateSphere('shoulder', { diameter: dia, segments: 10 }, scene), parent, mat, s * x, y, 0)); }

  // ---------------- WEAPONS (FF7-style: the equipped weapon changes the held mesh) ----------------
  // per-character archetype: a hold style + a tier palette. weaponSpec() reads the
  // equipped weapon's index in Data.WEAPONS[char] to pick size/colour/glow.
  const WEAP_ARCH = {
    pirate:   { style: 'sword',    base: '#c9d2dc', guard: '#d9a521', top: '#ffe08a' },
    swordsman:{ style: 'bigsword', base: '#cdd6e0', guard: '#7a8190', top: '#ff6a6a' },
    blader:   { style: 'katana',   base: '#dfe7ef', guard: '#caa84a', top: '#7fffd0' },
    dragoon:  { style: 'lance',    base: '#c9d2dc', guard: '#caa030', top: '#5eead4' },
    ruffy:    { style: 'fist',     base: '#b8342a', guard: '#d9a521', top: '#ffd24a' },
    simon:    { style: 'whip',     base: '#9a9aa8', guard: '#3a2616', top: '#caa030' },
    aladdin:  { style: 'scimitar', base: '#cfd8e4', guard: '#caa030', top: '#ffe08a' },
    violca:   { style: 'bow',      base: '#6b4a2a', guard: '#cfd8e4', top: '#fde047' },
    healer:   { style: 'staff',    base: '#9be7ff', guard: '#caa030', top: '#fff0a0' },
    mage:     { style: 'wand',     base: '#ff7eb0', guard: '#b06aff', top: '#b06aff' },
  };
  function weaponSpec(charKey, weaponKey) {
    const a = WEAP_ARCH[charKey] || WEAP_ARCH.pirate;
    const list = (window.Data && Data.WEAPONS[charKey]) || [];
    let idx = list.findIndex(w => w.key === weaponKey); if (idx < 0) idx = 0;
    const top = list.length > 1 && idx === list.length - 1;
    return { style: a.style, tier: idx, top, grow: 1 + idx * 0.13, col: top ? a.top : a.base, guard: a.guard, glow: top };
  }
  function attachWeapon(parent, pos, rot, spec) {
    const wn = new BABYLON.TransformNode('weapon', scene); wn.parent = parent; wn.position.set(pos[0], pos[1], pos[2]); wn.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    const g = spec.grow, col = spec.col, glow = spec.glow;
    const blade = (hex) => M('wBlade', hex, glow ? { spec: 0.9, specPower: 80, emissive: hex } : { spec: 0.9, specPower: 80 });
    const guardM = M('wGuard', spec.guard, { emissive: glow ? spec.guard : '#3a2e08' });
    const grip = M('wGrip', '#2a2018');
    switch (spec.style) {
      case 'sword': { // a curved CUTLASS with a sweeping knuckle-bow guard
        const bl = at(MB.CreateBox('bl', { width: 0.1, height: 1.05 * g, depth: 0.22 }, scene), wn, blade(col), 0.05, 0.52 * g, 0); bl.rotation.z = -0.13;
        const tip = at(MB.CreateBox('tip', { width: 0.1, height: 0.55 * g, depth: 0.17 }, scene), wn, blade(col), 0.2, 1.02 * g, 0); tip.rotation.z = -0.38; // upswept curved tip
        at(MB.CreateBox('gd', { width: 0.38, height: 0.1, depth: 0.24 }, scene), wn, guardM, 0, -0.05, 0); // crossguard
        const bow = at(MB.CreateTorus('bow', { diameter: 0.46, thickness: 0.05, tessellation: 16, arc: 0.55 }, scene), wn, guardM, 0.02, -0.2, 0.16); bow.rotation.x = Math.PI / 2; bow.rotation.z = -0.5; // knuckle bow
        at(MB.CreateCylinder('gr', { height: 0.32, diameter: 0.09 }, scene), wn, grip, 0, -0.24, 0);
        at(MB.CreateSphere('pommel', { diameter: 0.13 }, scene), wn, guardM, 0, -0.42, 0); break; }
      case 'scimitar': {
        const b = at(MB.CreateBox('bl', { width: 0.1, height: 1.2 * g, depth: 0.14 }, scene), wn, blade(col), 0.06, 0.55 * g, 0); b.rotation.z = 0.16;
        at(MB.CreateBox('gd', { width: 0.32, height: 0.1, depth: 0.2 }, scene), wn, guardM, 0, -0.05, 0); break; }
      case 'bigsword':
        at(MB.CreateBox('bl', { width: 0.4 * Math.min(1.4, g), height: 2.4 * g, depth: 0.1 }, scene), wn, blade(col), 0, 1.1 * g, 0);
        at(MB.CreateBox('edge', { width: 0.1, height: 2.3 * g, depth: 0.12 }, scene), wn, M('wEdge', '#9aa6b4', glow ? { spec: 0.9, emissive: col } : { spec: 0.9 }), 0.15, 1.1 * g, 0);
        at(MB.CreateBox('gd', { width: 0.5, height: 0.14, depth: 0.2 }, scene), wn, guardM, 0, -0.1, 0);
        at(MB.CreateCylinder('gr', { height: 0.5, diameter: 0.1 }, scene), wn, grip, 0, -0.4, 0); break;
      case 'katana':
        at(MB.CreateBox('bl', { width: 0.07, height: 1.6 * g, depth: 0.14 }, scene), wn, blade(col), 0, 0.8 * g, 0);
        at(MB.CreateBox('gd', { width: 0.26, height: 0.08, depth: 0.2 }, scene), wn, guardM, 0, -0.05, 0);
        at(MB.CreateCylinder('gr', { height: 0.34, diameter: 0.09 }, scene), wn, grip, 0, -0.25, 0); break;
      case 'lance':
        at(MB.CreateCylinder('shaft', { height: 2.6 * g, diameter: 0.09 }, scene), wn, M('wShaft', '#6b4423'), 0, 0.7, 0);
        at(MB.CreateCylinder('tip', { height: 0.55, diameterTop: 0, diameterBottom: 0.2 }, scene), wn, blade(col), 0, 1.95 * g, 0);
        [-1, 1].forEach(s => at(MB.CreateCylinder('barb', { height: 0.3, diameterTop: 0, diameterBottom: 0.12 }, scene), wn, blade(col), s * 0.12, 1.72 * g, 0).rotation.z = s * 1.0);
        at(MB.CreateTorus('coil', { diameter: 0.4, thickness: 0.07, tessellation: 12 }, scene), wn, M('wRope', '#caa86a'), 0, 0, 0).rotation.x = Math.PI / 2; break;
      case 'fist':
        at(MB.CreateBox('gaunt', { width: 0.42, height: 0.5, depth: 0.42 }, scene), wn, M('wFist', col, { emissive: glow ? col : '#3a0a08' }), 0, 0, 0);
        [-0.13, 0, 0.13].forEach(x => at(MB.CreateSphere('stud', { diameter: 0.13 }, scene), wn, guardM, x, 0.18, 0.22)); break;
      case 'whip': {
        at(MB.CreateBox('handle', { width: 0.1, height: 0.4, depth: 0.1 }, scene), wn, M('wHandle', spec.guard), 0, 0.2, 0);
        const links = 5 + spec.tier; for (let i = 0; i < links; i++) at(MB.CreateSphere('lk' + i, { diameter: 0.16 - i * 0.012 }, scene), wn, M('wLink' + i, col, glow ? { spec: 0.6, emissive: col } : { spec: 0.6 }), 0, 0.45 + i * 0.16, 0); break; }
      case 'bow': {
        const b = at(MB.CreateTorus('arc', { diameter: 1.7 * g, thickness: 0.08, tessellation: 20, arc: 0.5 }, scene), wn, M('wBow', col, glow ? { emissive: col } : {}), 0, 0, 0); b.rotation.z = Math.PI / 2;
        at(MB.CreateCylinder('str', { height: 1.65 * g, diameter: 0.02 }, scene), wn, M('wStr', '#e8e0d0'), 0, 0, -0.12); break; }
      case 'staff':
        at(MB.CreateCylinder('pole', { height: 2.0 * g, diameter: 0.08 }, scene), wn, M('wPole', '#b07a3a'), 0, 0, 0);
        at(MB.CreateSphere('orb', { diameter: 0.42 }, scene), wn, M('wOrb', col, { emissive: col }), 0, 1.05 * g, 0); break;
      case 'wand':
        at(MB.CreateCylinder('pole', { height: 1.8 * g, diameter: 0.07 }, scene), wn, M('wPole2', '#7a5230'), 0, 0.2, 0);
        at(MB.CreateSphere('orb', { diameter: 0.34 }, scene), wn, M('wOrb2', col, { emissive: col }), 0, 1.1 * g, 0); break;
    }
    if (glow) { const yy = (spec.style === 'bigsword' ? 1.1 : spec.style === 'lance' ? 1.9 : spec.style === 'staff' || spec.style === 'wand' ? 1.05 : 0.55) * g; const s = at(MB.CreateSphere('wglow', { diameter: 0.7 }, scene), wn, M('wGlowM', col, { emissive: col, alpha: 0.18 }), 0, yy, 0); s.material.alphaMode = BABYLON.Engine.ALPHA_ADD; s.isPickable = false; }
    return wn;
  }

  // cosmetic gear that shows on the model regardless of builder (currently the
  // Golden Fleece, the Coliseum champion's prize, draped over the shoulders).
  function cosmetic(node, accessoryKey) {
    if (!node || accessoryKey !== 'golden_fleece') return;
    const gold = M('flGold', '#e8c24a', { spec: 0.8, specPower: 80, emissive: '#6a4e0a' });
    const wool = M('flWool', '#f0d870', { emissive: '#5a4408' });
    // pelt hanging down the back
    const cape = at(MB.CreateBox('fleece', { width: 0.95, height: 1.25, depth: 0.12 }, scene), node, gold, 0, 1.55, -0.36); cape.rotation.x = 0.12;
    // fluffy shoulder mantle
    [-0.42, 0, 0.42].forEach(x => at(MB.CreateSphere('flw', { diameter: 0.42 }, scene), node, wool, x, 2.05, -0.18));
    // little hanging hooves/tassels
    [-0.32, 0.32].forEach(x => at(MB.CreateCylinder('hoof', { height: 0.22, diameterTop: 0.06, diameterBottom: 0.12 }, scene), node, M('flHoof', '#8a6a1a'), x, 0.95, -0.34));
    // soft glow so the champion reads at a glance
    const gl = at(MB.CreateSphere('flGlow', { diameter: 1.4 }, scene), node, M('flGlowM', '#ffe9a8', { emissive: '#ffe9a8', alpha: 0.14 }), 0, 1.7, -0.2); gl.material.alphaMode = BABYLON.Engine.ALPHA_ADD; gl.isPickable = false;
  }

  // ---------------- PARTY ----------------
  function pirate(weaponKey) {
    const r = new BABYLON.TransformNode('pirate', scene);
    const coat = M('coat', '#a83232'), coat2 = M('coat2', '#c4433f'), dark = M('dark', '#2a2018'),
          skin = M('skin', '#d9a06b'), gold = M('gold', '#d9a521', { emissive: '#4a3606' }),
          steel = M('steel', '#c9d2dc', { spec: 0.8 }), beard = M('beardP', '#7a3b12');
    at(MB.CreateCylinder('lL', { height: 1.1, diameter: 0.34 }, scene), r, dark, -0.22, 0.55, 0);
    at(MB.CreateCylinder('lR', { height: 1.1, diameter: 0.34 }, scene), r, dark, 0.22, 0.55, 0);
    at(MB.CreateBox('torso', { width: 0.95, height: 1.15, depth: 0.6 }, scene), r, coat, 0, 1.6, 0);
    shoulders(r, coat, 2.06, 0.46, 0.5);
    at(MB.CreateBox('sash', { width: 1.0, height: 0.22, depth: 0.62 }, scene), r, gold, 0, 1.3, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.3 }, scene), r, coat2, -0.62, 1.6, 0); aL.rotation.z = 0.25;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.6, 2.0, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.3 }, scene), arm, coat2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.62 }, scene), r, skin, 0, 2.5, 0);
    face(r, 2.56, 0.62, { one: 'left', brow: '#5a3b1c' }); // right eye covered by the patch
    hand(aL, 0, -0.5, 0, '#d9a06b'); hand(arm, 0, -0.92, 0.05, '#d9a06b');
    at(MB.CreateBox('beard', { width: 0.5, height: 0.4, depth: 0.32 }, scene), r, beard, 0, 2.25, 0.18);
    at(MB.CreateBox('patch', { width: 0.18, height: 0.16, depth: 0.05 }, scene), r, dark, 0.14, 2.57, 0.3);
    at(MB.CreateCylinder('brim', { height: 0.08, diameter: 0.95 }, scene), r, dark, 0, 2.83, 0);
    at(MB.CreateSphere('htop', { diameter: 0.62, slice: 0.5 }, scene), r, dark, 0, 2.85, 0);
    at(MB.CreateBox('skull', { width: 0.16, height: 0.16, depth: 0.05 }, scene), r, M('skullP', '#f2ead9', { emissive: '#3a3528' }), 0, 2.97, 0.3);
    attachWeapon(arm, [0, -0.7, 0.3], [1.35, 0, 0], weaponSpec('pirate', weaponKey));
    return { node: r, arm };
  }

  function swordsman(weaponKey) {
    const r = new BABYLON.TransformNode('swordsman', scene);
    const navy = M('navy', '#36537f'), navy2 = M('navy2', '#48689e'), hair = M('hair', '#efd87e'),
          skin = M('skin2', '#cf9a78'), steel = M('steel2', '#c9d2dc', { spec: 0.8 }), dark = M('dk', '#2a2018');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.32 }, scene), r, M('pant', '#1f2733'), -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.32 }, scene), r, M('pant2', '#1f2733'), 0.22, 0.57, 0);
    at(MB.CreateBox('torso', { width: 0.92, height: 1.2, depth: 0.55 }, scene), r, navy, 0, 1.62, 0);
    shoulders(r, navy, 2.08, 0.44, 0.5);
    at(MB.CreateBox('belt', { width: 0.96, height: 0.18, depth: 0.57 }, scene), r, M('belt', '#7a5230'), 0, 1.25, 0);
    at(MB.CreateSphere('pauldron', { diameter: 0.62, slice: 0.6 }, scene), r, steel, -0.55, 2.05, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.28 }, scene), r, navy2, -0.6, 1.6, 0); aL.rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.62, 2.02, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.28 }, scene), arm, navy2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.5, 0);
    face(r, 2.55, 0.6, { brow: '#9c8a3a' });
    hand(aL, 0, -0.5, 0, '#cf9a78'); hand(arm, 0, -0.92, 0.05, '#cf9a78');
    const sp = [[0,0.45,0,0,0,0],[-0.18,0.42,0.05,0,0,0.5],[0.18,0.42,0.05,0,0,-0.5],[0,0.4,0.22,0.6,0,0],[0,0.4,-0.2,-0.6,0,0],[-0.22,0.3,-0.05,0,0,0.9],[0.22,0.3,-0.05,0,0,-0.9]];
    sp.forEach((s, i) => { const c = at(MB.CreateCylinder('hair'+i, { height: 0.6, diameterTop: 0, diameterBottom: 0.26 }, scene), r, hair, s[0], 2.72 + s[1]*0.2, s[2]); c.rotation.set(s[3], s[4], s[5]); });
    attachWeapon(arm, [0.1, -0.7, 0.3], [1.3, 0, 0], weaponSpec('swordsman', weaponKey));
    return { node: r, arm };
  }

  function healer(weaponKey) {
    const r = new BABYLON.TransformNode('healer', scene);
    const robe = M('robe', '#37c0a8'), robe2 = M('robe2', '#8fefdf'),
          hairC = M('hairC', '#37c0e0', { emissive: '#0a3a48' }), skin = M('skinH', '#d9a06b');
    at(MB.CreateCylinder('robe', { height: 1.9, diameterTop: 0.5, diameterBottom: 1.4 }, scene), r, robe, 0, 0.95, 0);
    at(MB.CreateCylinder('trim', { height: 0.2, diameterTop: 1.32, diameterBottom: 1.42 }, scene), r, robe2, 0, 0.12, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.8, diameter: 0.22 }, scene), r, robe, -0.5, 1.5, 0); aL.rotation.z = 0.4;
    const aR = at(MB.CreateCylinder('aR', { height: 0.8, diameter: 0.22 }, scene), r, robe, 0.5, 1.5, 0); aR.rotation.z = -0.4;
    at(MB.CreateSphere('head', { diameter: 0.55, segments: 16 }, scene), r, skin, 0, 2.25, 0);
    hand(aL, 0, -0.42, 0, '#d9a06b'); hand(aR, 0, -0.42, 0, '#d9a06b');
    // Yuna-esque heterochromia — one blue eye, one green — with soft lashes
    const eyeW = M('hEyeW', '#fbfdff'), lashM = M('hLash', '#2a1c14');
    [[-1, '#3a7ad0'], [1, '#56a84a']].forEach(([s, col]) => {
      at(MB.CreateSphere('eyeW', { diameter: 0.15, segments: 10 }, scene), r, eyeW, s * 0.12, 2.3, 0.22);
      at(MB.CreateSphere('eyeP', { diameter: 0.09, segments: 8 }, scene), r, M('hEye' + s, col), s * 0.12, 2.3, 0.27);
      const l = at(MB.CreateBox('lash', { width: 0.17, height: 0.03, depth: 0.06 }, scene), r, lashM, s * 0.12, 2.37, 0.22); l.rotation.z = -s * 0.2;
    });
    // short brown summoner's hair + the iconic single long bound tail down the back
    const hairY = M('hHairY', '#5a3e2a');
    at(MB.CreateSphere('hairTop', { diameter: 0.62, slice: 0.6, segments: 14 }, scene), r, hairY, 0, 2.4, -0.02);
    at(MB.CreateSphere('hairBack', { diameterX: 0.58, diameterY: 0.66, diameterZ: 0.4, segments: 12 }, scene), r, hairY, 0, 2.2, -0.17);
    [-1, 1].forEach(s => { const sl = at(MB.CreateCylinder('hairFringe', { height: 0.6, diameterTop: 0.16, diameterBottom: 0.08, tessellation: 6 }, scene), r, hairY, s * 0.24, 2.18, 0.16); sl.rotation.z = s * 0.1; });
    const tail = at(MB.CreateCylinder('hairTail', { height: 1.7, diameterTop: 0.16, diameterBottom: 0.05, tessellation: 8 }, scene), r, hairY, 0, 1.5, -0.3); tail.rotation.x = -0.14;
    at(MB.CreateTorus('tailRing', { diameter: 0.2, thickness: 0.04, tessellation: 12 }, scene), r, M('hRing', '#caa030', { emissive: '#4a3606' }), 0, 2.3, -0.26).rotation.x = Math.PI / 2;
    // summoner's floral obi + a long hanging ribbon
    at(MB.CreateBox('obi', { width: 0.62, height: 0.2, depth: 0.62 }, scene), r, M('hObi', '#e8728e'), 0, 1.18, 0);
    at(MB.CreateBox('ribbon', { width: 0.13, height: 1.05, depth: 0.06 }, scene), r, M('hRib', '#e8728e'), 0.2, 0.66, 0.34);
    const halo = at(MB.CreateTorus('halo', { diameter: 0.7, thickness: 0.05, tessellation: 24 }, scene), r, M('halo', '#fff6c2', { emissive: '#fff0a0' }), 0, 2.85, 0);
    halo.rotation.x = Math.PI / 2.3;
    const sp = weaponSpec('healer', weaponKey);
    const staffPiv = new BABYLON.TransformNode('staffPiv', scene); staffPiv.parent = r; staffPiv.position.set(0.72, 1.6, 0.1);
    at(MB.CreateCylinder('staff', { height: 2.0 * sp.grow, diameter: 0.08 }, scene), staffPiv, M('staffMat', sp.top ? sp.guard : '#b07a3a'), 0, 0, 0);
    const orb = at(MB.CreateSphere('orb', { diameter: 0.42 }, scene), staffPiv, M('orbMat', sp.col, { emissive: sp.col }), 0, 1.05 * sp.grow, 0);
    if (sp.top) { const gl = at(MB.CreateSphere('orbGlow', { diameter: 0.8 }, scene), staffPiv, M('orbGlowM', sp.col, { emissive: sp.col, alpha: 0.2 }), 0, 1.05 * sp.grow, 0); gl.material.alphaMode = BABYLON.Engine.ALPHA_ADD; gl.isPickable = false; }
    return { node: r, halo, orb, staffPiv, idle(t) { halo.rotation.z = t * 1.2; orb.scaling.setAll(1 + Math.sin(t * 3) * 0.08); } };
  }

  // ---- new PS1-RPG-inspired party members ----
  function mage(weaponKey) { // "Pip" — tiny black mage (FF9 Vivi vibe): huge hat, glowing eyes
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
    const sp = weaponSpec('mage', weaponKey);
    const staffPiv = new BABYLON.TransformNode('mgStaff', scene); staffPiv.parent = r; staffPiv.position.set(0.55, 1.0, 0.1);
    at(MB.CreateCylinder('staff', { height: 1.8 * sp.grow, diameter: 0.07 }, scene), staffPiv, M('mgStaffMat', sp.top ? sp.guard : '#7a5230'), 0, 0.2, 0);
    const orb = at(MB.CreateSphere('orb', { diameter: 0.34 }, scene), staffPiv, M('mgOrb', sp.col, { emissive: sp.col }), 0, 1.1 * sp.grow, 0);
    if (sp.top) { const gl = at(MB.CreateSphere('mgGlow', { diameter: 0.7 }, scene), staffPiv, M('mgGlowM', sp.col, { emissive: sp.col, alpha: 0.2 }), 0, 1.1 * sp.grow, 0); gl.material.alphaMode = BABYLON.Engine.ALPHA_ADD; gl.isPickable = false; }
    return { node: r, staffPiv, idle(t) { orb.scaling.setAll(1 + Math.sin(t * 4) * 0.1); } };
  }

  function blader(weaponKey) { // "Ridge" — spiky-haired katana fighter (Chrono Trigger vibe)
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
    attachWeapon(arm, [0, -0.7, 0.3], [1.35, 0, 0], weaponSpec('blader', weaponKey));
    return { node: r, arm };
  }

  function dragoon(weaponKey) { // "Quint" — grizzled harpoon-fisherman (Moby Dick whaler)
    const r = new BABYLON.TransformNode('dragoon', scene);
    const coat = M('dgCoat', '#4a766d', { spec: 0.2 }), coat2 = M('dgCoat2', '#39594f'), pants = M('dgPants', '#4a3e30'),
          steel = M('dgSteel', '#c9d2dc', { spec: 0.9 }), skin = M('dgSkin', '#c89a72'), hair = M('dgHair', '#8a7a66'),
          dark = M('dgDark', '#1a1410'), rope = M('dgRope', '#caa86a');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.34 }, scene), r, pants, -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.34 }, scene), r, pants, 0.22, 0.57, 0);
    at(MB.CreateBox('boots', { width: 0.95, height: 0.3, depth: 0.7 }, scene), r, dark, 0, 0.15, 0.05);
    at(MB.CreateBox('torso', { width: 0.95, height: 1.2, depth: 0.6 }, scene), r, coat, 0, 1.62, 0);
    shoulders(r, coat, 2.08, 0.46, 0.5);
    at(MB.CreateBox('vest', { width: 0.55, height: 1.1, depth: 0.62 }, scene), r, coat2, 0, 1.6, 0);
    at(MB.CreateBox('belt', { width: 1.0, height: 0.16, depth: 0.62 }, scene), r, dark, 0, 1.12, 0);
    at(MB.CreateCylinder('aL', { height: 0.98, diameter: 0.3 }, scene), r, coat, -0.62, 1.6, 0).rotation.z = 0.2;
    const arm = new BABYLON.TransformNode('dgArm', scene); arm.parent = r; arm.position.set(0.62, 2.05, 0);
    at(MB.CreateCylinder('aR', { height: 0.98, diameter: 0.3 }, scene), arm, coat, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.58 }, scene), r, skin, 0, 2.52, 0);
    face(r, 2.58, 0.58, { one: 'left', brow: '#7a6a56', angry: true }); // right eye under the patch
    hand(r, -0.74, 1.1, 0.05, '#c89a72'); hand(arm, 0, -0.95, 0.08, '#c89a72');
    at(MB.CreateBox('beard', { width: 0.5, height: 0.4, depth: 0.3 }, scene), r, hair, 0, 2.28, 0.16); // grizzled beard
    // long flowing hair down the back + sides
    at(MB.CreateSphere('hairTop', { diameter: 0.62, slice: 0.5 }, scene), r, hair, 0, 2.6, -0.02);
    at(MB.CreateBox('hairBack', { width: 0.55, height: 1.3, depth: 0.2 }, scene), r, hair, 0, 2.0, -0.26);
    [-0.3, 0.3].forEach(x => at(MB.CreateBox('hairSide', { width: 0.16, height: 1.0, depth: 0.16 }, scene), r, hair, x, 2.2, 0.06));
    // eyepatch
    at(MB.CreateBox('patch', { width: 0.2, height: 0.18, depth: 0.06 }, scene), r, dark, 0.15, 2.56, 0.28);
    at(MB.CreateBox('strap', { width: 0.62, height: 0.05, depth: 0.5 }, scene), r, dark, 0, 2.62, 0.05);
    attachWeapon(arm, [0, -0.7, 0.35], [1.45, 0, 0], weaponSpec('dragoon', weaponKey));
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
    const green = M('krGreen', '#2f6b54', { spec: 0.4, emissive: '#0a2018' }), green2 = M('krG2', '#244f3f'), green3 = M('krG3', '#163026'),
          glow = M('krGlow', '#5effc0', { emissive: '#2fffa0' }), beakM = M('krBeak', '#160f08'), teeth = M('krTeeth', '#e8e0d0'),
          eyeW = M('krW', '#ffe08a', { emissive: '#caa030' }), eyeB = M('krB', '#0a0a0a');
    // towering bulbous mantle
    at(MB.CreateSphere('mantle', { diameterX: 3.2, diameterY: 4.0, diameterZ: 3.2, segments: 18 }, scene), r, green, 0, 3.4, -0.2);
    at(MB.CreateCylinder('mtip', { height: 1.8, diameterTop: 0, diameterBottom: 2.2, tessellation: 14 }, scene), r, green2, 0, 5.6, -0.2);
    [-1, 1].forEach(s => { const fin = at(MB.CreateCylinder('fin', { height: 1.6, diameterTop: 0, diameterBottom: 1.2, tessellation: 3 }, scene), r, green2, s * 1.7, 4.2, -0.2); fin.rotation.z = s * 1.1; fin.scaling.z = 0.3; }); // mantle fins
    // bioluminescent spots
    for (let i = 0; i < 12; i++) { const a = i * 2.39; at(MB.CreateSphere('spot' + i, { diameter: 0.26 }, scene), r, glow, Math.cos(a) * 1.5, 2.6 + (i % 6) * 0.7, Math.sin(a) * 1.5 - 0.2); }
    // head + menacing glowing eyes with halos
    at(MB.CreateSphere('head', { diameterX: 2.8, diameterY: 2.4, diameterZ: 2.8, segments: 16 }, scene), r, green, 0.4, 1.9, 0);
    [-0.75, 0.75].forEach(z => { at(MB.CreateSphere('eyW', { diameter: 0.85 }, scene), r, eyeW, 1.2, 2.4, z); at(MB.CreateSphere('eyB', { diameter: 0.4 }, scene), r, eyeB, 1.5, 2.4, z); const h = at(MB.CreateSphere('eyG', { diameter: 1.3 }, scene), r, M('krEG' + z, '#ffe08a', { emissive: '#ffe08a', alpha: 0.22 }), 1.2, 2.4, z); h.material.alphaMode = BABYLON.Engine.ALPHA_ADD; h.isPickable = false; });
    // beak ringed with teeth
    const beak = at(MB.CreateCylinder('beak', { height: 1.3, diameterTop: 0, diameterBottom: 1.0, tessellation: 8 }, scene), r, beakM, 1.7, 1.1, 0); beak.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; at(MB.CreateCylinder('bt', { height: 0.42, diameterTop: 0, diameterBottom: 0.16 }, scene), r, teeth, 1.85, 1.1 + Math.cos(a) * 0.42, Math.sin(a) * 0.42).rotation.x = Math.cos(a) > 0 ? Math.PI : 0; }
    // ten long writhing tentacles with sucker rows
    const arms = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2; const piv = new BABYLON.TransformNode('ap' + i, scene); piv.parent = r; piv.position.set(Math.cos(a) * 1.2, 0.9, Math.sin(a) * 1.2 - 0.1);
      const tn = at(MB.CreateCylinder('arm' + i, { height: 4.2, diameterTop: 0.1, diameterBottom: 0.62, tessellation: 8 }, scene), piv, i % 2 ? green2 : green3, 0, -1.4, 0); tn.rotation.x = Math.sin(a) * 0.7; tn.rotation.z = -Math.cos(a) * 0.7;
      for (let k = 0; k < 5; k++) at(MB.CreateSphere('su', { diameter: 0.16 }, scene), tn, glow, 0, -1.6 + k * 0.7, 0.26);
      piv.rotation.x = Math.sin(a) * 0.4; arms.push({ piv, a, i });
    }
    return { node: r, idle(t) { arms.forEach(o => { o.piv.rotation.y = Math.sin(t * 1.3 + o.i) * 0.22; o.piv.rotation.x = Math.sin(o.a) * 0.4 + Math.sin(t * 1.1 + o.i) * 0.12; }); r.position.y = (r._baseY || 0) + Math.sin(t * 0.8) * 0.18; } };
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
  function npc(hex, hairHex, style) {
    const r = new BABYLON.TransformNode('npc', scene);
    const body = M('npcBody', hex), skin = M('npcSkin', '#d9a06b'), hair = M('npcHair', hairHex || '#3a2a18');
    at(MB.CreateCylinder('legs', { height: 1.0, diameterTop: 0.55, diameterBottom: 0.7 }, scene), r, body, 0, 0.5, 0);
    at(MB.CreateBox('torso', { width: 0.7, height: 0.9, depth: 0.45 }, scene), r, body, 0, 1.4, 0);
    at(MB.CreateSphere('head', { diameter: 0.55 }, scene), r, skin, 0, 2.05, 0);
    face(r, 2.08, 0.55);
    const covered = style === 'desert' || style === 'arabian';   // headwear hides the hair
    if (!covered) at(MB.CreateSphere('hair', { diameter: 0.6, slice: 0.55 }, scene), r, hair, 0, 2.18, 0);
    // robe skirt for the flowing-garment cultures
    if (style === 'desert' || style === 'arabian' || style === 'greek') {
      at(MB.CreateCylinder('robe', { height: 1.3, diameterTop: 0.55, diameterBottom: 1.15 }, scene), r, M('npcRobe', style === 'greek' ? '#f0ece0' : hex, { spec: 0.05 }), 0, 0.65, 0);
    }
    switch (style) {
      case 'coastal': { // wide straw sun-hat
        const straw = M('npcStraw', '#e8c66a', { spec: 0.05 });
        at(MB.CreateCylinder('brim', { height: 0.06, diameter: 0.95, tessellation: 16 }, scene), r, straw, 0, 2.32, 0);
        at(MB.CreateCylinder('crown', { height: 0.22, diameterTop: 0.34, diameterBottom: 0.42 }, scene), r, straw, 0, 2.44, 0); break; }
      case 'desert': { // head-wrap + back drape
        const cloth = M('npcWrap', '#e0d6c0');
        at(MB.CreateSphere('wrap', { diameter: 0.66, slice: 0.7 }, scene), r, cloth, 0, 2.16, 0);
        at(MB.CreateBox('drape', { width: 0.5, height: 0.7, depth: 0.12 }, scene), r, cloth, 0, 1.85, -0.28);
        at(MB.CreateTorus('cord', { diameter: 0.6, thickness: 0.05, tessellation: 12 }, scene), r, M('npcCord', '#8a6a3a'), 0, 2.28, 0).rotation.x = Math.PI / 2; break; }
      case 'arabian': { // jewelled turban
        const t = M('npcTurban', '#e8e0d0');
        at(MB.CreateSphere('turban', { diameter: 0.7 }, scene), r, t, 0, 2.22, 0);
        at(MB.CreateTorus('twist', { diameter: 0.66, thickness: 0.12, tessellation: 14 }, scene), r, t, 0, 2.18, 0).rotation.x = Math.PI / 2;
        at(MB.CreateSphere('jewel', { diameter: 0.16 }, scene), r, M('npcJewel', '#caa030', { emissive: '#5a4208' }), 0, 2.3, 0.32); break; }
      case 'greek': { // laurel wreath + shoulder toga sash
        at(MB.CreateTorus('laurel', { diameter: 0.62, thickness: 0.07, tessellation: 16 }, scene), r, M('npcLaurel', '#6aa84a', { emissive: '#1a3a12' }), 0, 2.24, 0).rotation.x = Math.PI / 2;
        const sash = at(MB.CreateBox('toga', { width: 0.78, height: 0.95, depth: 0.5 }, scene), r, M('npcToga', '#f0ece0'), 0, 1.42, 0); sash.scaling.x = 0.45; sash.rotation.z = 0.4; break; }
      case 'rider': { // dragon-rider leathers: pauldron + short cape
        at(MB.CreateSphere('pauldron', { diameter: 0.5, slice: 0.6 }, scene), r, M('npcPaul', '#3a2e22', { spec: 0.3 }), -0.34, 1.78, 0);
        at(MB.CreateBox('cape', { width: 0.66, height: 1.0, depth: 0.1 }, scene), r, M('npcCape', shade(hex, 0.7)), 0, 1.5, -0.28); break; }
      case 'arcade': { // backwards ball-cap
        const cap = M('npcCap', shade(hex, 1.2));
        at(MB.CreateSphere('cap', { diameter: 0.6, slice: 0.5 }, scene), r, cap, 0, 2.2, 0);
        at(MB.CreateCylinder('capbrim', { height: 0.05, diameter: 0.5, tessellation: 12 }, scene), r, cap, 0, 2.16, -0.34); break; }
    }
    return { node: r, idle(t) { r.position.y = (r._baseY || 0) + Math.sin(t * 2 + (r._ph || 0)) * 0.04; } };
  }
  function shade(hex, f) { try { const n = parseInt(hex.slice(1), 16); const cl = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [cl((n>>16)&255), cl((n>>8)&255), cl(n&255)].map(v => v.toString(16).padStart(2, '0')).join(''); } catch (e) { return hex; } }
  function rival(weaponKey) { // "Ruffy" — straw-hat rubber pirate (Luffy homage)
    const r = new BABYLON.TransformNode('rival', scene);
    const skin = M('rvSkin', '#e8b48a'), vest = M('rvVest', '#c2332a'), shorts = M('rvShorts', '#2f5aa0'),
          hair = M('rvHair', '#161616'), straw = M('rvStraw', '#e0b96a'), band = M('rvBand', '#b8342a');
    at(MB.CreateCylinder('lL', { height: 1.0, diameter: 0.3 }, scene), r, shorts, -0.22, 0.5, 0);
    at(MB.CreateCylinder('lR', { height: 1.0, diameter: 0.3 }, scene), r, shorts, 0.22, 0.5, 0);
    at(MB.CreateBox('torso', { width: 0.82, height: 1.0, depth: 0.48 }, scene), r, skin, 0, 1.5, 0); // open vest = bare chest
    shoulders(r, skin, 1.9, 0.4, 0.44);
    at(MB.CreateBox('vestL', { width: 0.18, height: 1.0, depth: 0.5 }, scene), r, vest, -0.34, 1.5, 0);
    at(MB.CreateBox('vestR', { width: 0.18, height: 1.0, depth: 0.5 }, scene), r, vest, 0.34, 1.5, 0);
    at(MB.CreateBox('sash', { width: 0.86, height: 0.18, depth: 0.5 }, scene), r, band, 0, 1.05, 0);
    at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.26 }, scene), r, skin, -0.56, 1.5, 0).rotation.z = 0.25;
    const arm = new BABYLON.TransformNode('rvArm', scene); arm.parent = r; arm.position.set(0.56, 1.9, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.26 }, scene), arm, skin, 0, -0.45, 0);
    at(MB.CreateSphere('fist', { diameter: 0.42 }, scene), arm, skin, 0, -0.95, 0); // big fist
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.35, 0);
    face(r, 2.4, 0.6, { brow: '#161616' });
    at(MB.CreateBox('grin', { width: 0.34, height: 0.07, depth: 0.06 }, scene), r, M('grinM', '#3a1a14'), 0, 2.22, 0.28); // toothy grin
    hand(r, -0.66, 1.0, 0, '#e8b48a');
    at(MB.CreateSphere('hair', { diameter: 0.64, slice: 0.5 }, scene), r, hair, 0, 2.4, 0);
    // iconic straw hat worn ON the head
    at(MB.CreateCylinder('brim', { height: 0.07, diameter: 1.1, tessellation: 20 }, scene), r, straw, 0, 2.62, 0);
    at(MB.CreateTorus('hatband', { diameter: 0.66, thickness: 0.08, tessellation: 18 }, scene), r, band, 0, 2.66, 0).rotation.x = Math.PI/2;
    at(MB.CreateCylinder('dome', { height: 0.34, diameterTop: 0.5, diameterBottom: 0.64, tessellation: 20 }, scene), r, straw, 0, 2.82, 0);
    attachWeapon(arm, [0, -0.95, 0], [0, 0, 0], weaponSpec('ruffy', weaponKey)); // gauntlets over the fist
    return { node: r, arm };
  }

  function mermaid(hairHex, tailHex, skinHex) {
    const r = new BABYLON.TransformNode('mermaid', scene);
    // clean palette — vivid tail + per-mermaid skin tone, no muddy emissive fighting the light
    const tHex = tailHex || '#2fae9a', hHex = hairHex || '#3fd0e0';
    const skin = M('mmSkin', skinHex || '#f2caa6'), hair = M('mmHair', hHex),
          tail = M('mmTail', tHex, { spec: 0.45, specPower: 48 }),
          tailLite = M('mmTail2', shade(tHex, 1.25), { spec: 0.5 }),
          top = M('mmTop', '#ff9ec6');
    // smooth tapered tail: hips → graceful taper → soft twin fins
    at(MB.CreateSphere('hips', { diameterX: 1.0, diameterY: 0.82, diameterZ: 0.92, segments: 16 }, scene), r, tail, 0, 0.95, -0.05);
    const t1 = at(MB.CreateCylinder('tail', { height: 1.5, diameterTop: 0.74, diameterBottom: 0.22, tessellation: 16 }, scene), r, tail, 0, 0.5, 0.35); t1.rotation.x = 0.7;
    // twin fins that fan UP/back like a tail, not flat flippers on the floor
    [-1, 1].forEach(s => { const fin = at(MB.CreateSphere('fin', { diameterX: 0.85, diameterY: 0.1, diameterZ: 0.7, segments: 12 }, scene), r, tailLite, s * 0.3, 0.34, 1.0); fin.rotation.x = -0.95; fin.rotation.y = s * 0.55; fin.rotation.z = s * 0.25; });
    // shimmer rings down the tail catch the light
    [0.7, 1.05].forEach((y, i) => at(MB.CreateTorus('scale' + i, { diameter: 0.66 - i * 0.18, thickness: 0.05, tessellation: 16 }, scene), r, tailLite, 0, y, 0.2 + i * 0.12).rotation.x = Math.PI / 2 - 0.5);
    // hourglass torso → narrow waist, smooth
    at(MB.CreateCylinder('waist', { height: 0.7, diameterTop: 0.6, diameterBottom: 0.5, tessellation: 16 }, scene), r, skin, 0, 1.55, -0.02);
    at(MB.CreateSphere('bustBase', { diameterX: 0.78, diameterY: 0.5, diameterZ: 0.5, segments: 14 }, scene), r, skin, 0, 1.92, 0.02);
    [-0.18, 0.18].forEach(x => at(MB.CreateSphere('bust', { diameter: 0.34, segments: 12 }, scene), r, top, x, 1.92, 0.16));
    at(MB.CreateTorus('strap', { diameter: 0.72, thickness: 0.06, tessellation: 16 }, scene), r, top, 0, 1.98, 0.02).rotation.x = 1.3;
    // slender arms with soft hands
    [-1, 1].forEach(s => { const a = at(MB.CreateCylinder('arm', { height: 0.85, diameter: 0.13, tessellation: 10 }, scene), r, skin, s * 0.36, 1.62, 0.08); a.rotation.z = -s * 0.22; a.rotation.x = -0.25; at(MB.CreateSphere('hand', { diameter: 0.15, segments: 10 }, scene), r, skin, s * 0.46, 1.18, 0.2); });
    // graceful neck + a softly-larger head for pretty cartoon proportions
    at(MB.CreateCylinder('neck', { height: 0.24, diameter: 0.17, tessellation: 12 }, scene), r, skin, 0, 2.3, 0);
    at(MB.CreateSphere('head', { diameterX: 0.56, diameterY: 0.6, diameterZ: 0.54, segments: 18 }, scene), r, skin, 0, 2.58, 0.02);
    // BIG expressive eyes — white + coloured iris + pupil + a catchlight sparkle; lashes & brows
    const eyeW = M('mmEyeW', '#fdfeff'), iris = M('mmIris', shade(hHex, 0.85)), pupil = M('mmPupil', '#181820'), spark = M('mmSpark', '#ffffff'), lash = M('mmLash', '#1b0f15'), brow = M('mmBrow', shade(hHex, 0.8));
    [-1, 1].forEach(s => {
      at(MB.CreateSphere('eyeW', { diameterX: 0.2, diameterY: 0.25, diameterZ: 0.13, segments: 12 }, scene), r, eyeW, s * 0.13, 2.6, 0.23);   // large almond eye
      at(MB.CreateSphere('iris', { diameter: 0.16, segments: 12 }, scene), r, iris, s * 0.13, 2.59, 0.29);
      at(MB.CreateSphere('pupil', { diameter: 0.085, segments: 8 }, scene), r, pupil, s * 0.13, 2.59, 0.31);
      at(MB.CreateSphere('spark', { diameter: 0.045, segments: 6 }, scene), r, spark, s * 0.13 + 0.04, 2.645, 0.325); // catchlight
      at(MB.CreateSphere('spark2', { diameter: 0.025, segments: 6 }, scene), r, spark, s * 0.13 - 0.03, 2.555, 0.325); // lower sparkle
      const l = at(MB.CreateBox('lash', { width: 0.24, height: 0.04, depth: 0.07 }, scene), r, lash, s * 0.13, 2.71, 0.22); l.rotation.z = -s * 0.28;       // upper lash line
      const lo = at(MB.CreateBox('lashTip', { width: 0.1, height: 0.035, depth: 0.05 }, scene), r, lash, s * 0.24, 2.69, 0.21); lo.rotation.z = -s * 0.8;    // flicked outer corner
      const b = at(MB.CreateBox('brow', { width: 0.19, height: 0.035, depth: 0.05 }, scene), r, brow, s * 0.13, 2.78, 0.23); b.rotation.z = -s * 0.14;
    });
    // little nose + a soft upturned smile + rosy cheeks
    at(MB.CreateSphere('nose', { diameter: 0.05, segments: 6 }, scene), r, skin, 0, 2.53, 0.32);
    const lip = M('mmLip', '#dc6f81');
    at(MB.CreateBox('lipC', { width: 0.1, height: 0.032, depth: 0.05 }, scene), r, lip, 0, 2.45, 0.3);
    at(MB.CreateSphere('lipLow', { diameterX: 0.13, diameterY: 0.06, diameterZ: 0.06, segments: 8 }, scene), r, M('mmLipLow', shade('#dc6f81', 1.12)), 0, 2.43, 0.305); // fuller lower lip
    [-1, 1].forEach(s => { const lc = at(MB.CreateBox('lipS', { width: 0.07, height: 0.03, depth: 0.05 }, scene), r, lip, s * 0.08, 2.465, 0.295); lc.rotation.z = s * 0.5; }); // corners turn up
    [-1, 1].forEach(s => at(MB.CreateSphere('blush', { diameter: 0.12, segments: 8 }, scene), r, M('mmBlush' + s, '#ff9eaa', { alpha: 0.4 }), s * 0.21, 2.5, 0.24));
    // FLOWING hair — a rounded crown hugging the head, then long locks that TAPER together
    // into a teardrop silhouette (not a slab), with a swept fringe and curled tips
    at(MB.CreateSphere('hairCrown', { diameterX: 0.68, diameterY: 0.66, diameterZ: 0.66, segments: 18 }, scene), r, hair, 0, 2.74, -0.04);
    at(MB.CreateSphere('hairSheen', { diameterX: 0.42, diameterY: 0.22, diameterZ: 0.36, segments: 14 }, scene), r, M('mmHairLite', shade(hHex, 1.4)), -0.1, 2.94, 0.04); // glossy crown highlight
    at(MB.CreateSphere('hairNape', { diameterX: 0.5, diameterY: 0.5, diameterZ: 0.4, segments: 14 }, scene), r, hair, 0, 2.52, -0.22);
    [-0.22, -0.07, 0.08, 0.23].forEach((x, i) => { const bang = at(MB.CreateSphere('bang' + i, { diameterX: 0.2, diameterY: 0.26, diameterZ: 0.17, segments: 10 }, scene), r, hair, x, 2.68, 0.17); bang.rotation.z = x < 0 ? 0.3 : -0.3; }); // swept fringe
    // back locks: wide at the shoulders, converging toward a soft point at the waist
    [-1, 1].forEach(s => [0.3, 0.13].forEach((xb, j) => {
      const x0 = s * xb;
      const lock = at(MB.CreateCylinder('hairBack', { height: 2.0, diameterTop: 0.3, diameterBottom: 0.07, tessellation: 10 }, scene), r, hair, x0, 1.85, -0.24);
      lock.rotation.x = -0.06; lock.rotation.z = s * (xb * 0.55); // tops splay out, bottoms swing in → taper
    }));
    at(MB.CreateSphere('curlTip', { diameterX: 0.34, diameterY: 0.3, diameterZ: 0.26, segments: 12 }, scene), r, hair, 0, 0.95, -0.18); // gathered curled ends
    // face-framing locks flowing down past the bust, curving gently inward
    [-1, 1].forEach(s => { const sl = at(MB.CreateCylinder('hairSide', { height: 1.7, diameterTop: 0.22, diameterBottom: 0.07, tessellation: 8 }, scene), r, hair, s * 0.3, 1.62, 0.12); sl.rotation.z = s * 0.12; sl.rotation.x = 0.08; });
    // a pretty flower tucked into one side of the hair
    at(MB.CreateSphere('flowerC', { diameter: 0.1, segments: 8 }, scene), r, M('mmFlowerC', '#ffd24a', { emissive: '#5a4208' }), 0.3, 2.8, 0.16);
    [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2; at(MB.CreateSphere('petal' + i, { diameterX: 0.1, diameterY: 0.05, diameterZ: 0.1, segments: 8 }, scene), r, M('mmPetal', '#ff8ab4'), 0.3 + Math.cos(a) * 0.085, 2.8 + Math.sin(a) * 0.085, 0.16); });
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
  function pine() { // conifer — stacked cones
    const r = new BABYLON.TransformNode('pine', scene);
    at(MB.CreateCylinder('trunk', { height: 1.2, diameter: 0.3 }, scene), r, M('ptrunk', '#5a3a1e'), 0, 0.6, 0);
    const green = M('pneedle', '#234f2f', { emissive: '#08200f' });
    for (let i = 0; i < 4; i++) at(MB.CreateCylinder('tier' + i, { height: 1.1, diameterTop: 0, diameterBottom: 1.8 - i * 0.35, tessellation: 8 }, scene), r, green, 0, 1.4 + i * 0.8, 0);
    return { node: r };
  }
  function deadTree() { // gnarled bare tree
    const r = new BABYLON.TransformNode('dead', scene);
    const bark = M('dbark', '#3a2e22');
    at(MB.CreateCylinder('trunk', { height: 2.4, diameterTop: 0.18, diameterBottom: 0.5 }, scene), r, bark, 0, 1.2, 0);
    [[0.6, 2.0, 0.6], [-0.7, 2.3, -0.2], [0.2, 2.6, -0.7]].forEach((b, i) => { const br = at(MB.CreateCylinder('br' + i, { height: 1.2, diameterTop: 0, diameterBottom: 0.2 }, scene), r, bark, b[0], b[1], b[2]); br.rotation.z = (i % 2 ? 1 : -1) * 0.8; br.rotation.x = (i - 1) * 0.5; });
    return { node: r };
  }
  function blossom() { // pink cherry blossom
    const r = new BABYLON.TransformNode('blossom', scene);
    at(MB.CreateCylinder('trunk', { height: 1.5, diameterTop: 0.25, diameterBottom: 0.42 }, scene), r, M('btrunk', '#5a3a2e'), 0, 0.75, 0);
    const pink = M('bpetal', '#ff9ec8', { emissive: '#6a2a44' }), pink2 = M('bpetal2', '#ffc0dd', { emissive: '#6a2a44' });
    at(MB.CreateSphere('c1', { diameter: 2.2 }, scene), r, pink, 0, 2.1, 0);
    at(MB.CreateSphere('c2', { diameter: 1.5 }, scene), r, pink2, 0.55, 2.5, 0.3);
    at(MB.CreateSphere('c3', { diameter: 1.4 }, scene), r, pink2, -0.5, 2.4, -0.25);
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

  function leviathan() { // reaper-style deep-sea horror — long, segmented, bioluminescent
    const r = new BABYLON.TransformNode('eLeviathan', scene);
    const body = M('lvBody', '#2a4a5a', { spec: 0.3, emissive: '#08161e' }), body2 = M('lvBody2', '#1f3a47'),
          teeth = M('lvTeeth', '#e8e0d0'), eye = M('lvEye', '#7fffd0', { emissive: '#2fffb0' }), glow = M('lvGlow', '#3fffd0', { emissive: '#1fffb0' }), maw = M('lvMaw', '#2a0a14');
    // long serpentine body (8 segments) trailing back, with biolum stripe
    const segs = [];
    for (let i = 0; i < 8; i++) { const sg = at(MB.CreateSphere('s' + i, { diameterX: 2.4 - i * 0.24, diameterY: 1.8 - i * 0.17, diameterZ: 1.8 - i * 0.17, segments: 12 }, scene), r, i % 2 ? body2 : body, -1.4 - i * 1.25, 1.4 + Math.sin(i * 0.7) * 0.4, 0); at(MB.CreateSphere('bl' + i, { diameter: 0.34 }, scene), r, glow, -1.4 - i * 1.25, 2.2 + Math.sin(i * 0.7) * 0.4, 0); segs.push(sg); }
    // tail fluke
    const fl = at(MB.CreateCylinder('fluke', { height: 2.2, diameterTop: 0, diameterBottom: 1.8, tessellation: 3 }, scene), r, body2, -11.0, 1.4, 0); fl.rotation.z = Math.PI / 2; fl.scaling.z = 0.25;
    // head + gaping double jaws lined with teeth
    at(MB.CreateSphere('head', { diameterX: 2.8, diameterY: 2.2, diameterZ: 2.2, segments: 16 }, scene), r, body, 0.5, 1.5, 0);
    const jt = at(MB.CreateCylinder('jt', { height: 2.0, diameterTop: 0, diameterBottom: 1.5, tessellation: 8 }, scene), r, maw, 2.0, 1.9, 0); jt.rotation.z = -Math.PI / 2;
    const jb = at(MB.CreateCylinder('jb', { height: 2.0, diameterTop: 0, diameterBottom: 1.5, tessellation: 8 }, scene), r, maw, 2.0, 1.1, 0); jb.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; at(MB.CreateCylinder('t', { height: 0.55, diameterTop: 0, diameterBottom: 0.22 }, scene), r, teeth, 1.9, 1.5 + Math.cos(a) * 0.7, Math.sin(a) * 0.7).rotation.x = Math.cos(a) > 0 ? Math.PI : 0; }
    [-0.62, 0.62].forEach(z => { at(MB.CreateSphere('e', { diameter: 0.4 }, scene), r, eye, 1.0, 2.2, z); const h = at(MB.CreateSphere('eg', { diameter: 0.8 }, scene), r, M('lvEG' + z, '#7fffd0', { emissive: '#7fffd0', alpha: 0.2 }), 1.0, 2.2, z); h.material.alphaMode = BABYLON.Engine.ALPHA_ADD; h.isPickable = false; });
    // four reaper mandible-fins fanning from the head
    [-1, 1].forEach(s => { [0.4, 1.2].forEach(zo => { const f = at(MB.CreateCylinder('mand', { height: 2.4, diameterTop: 0, diameterBottom: 0.5, tessellation: 6 }, scene), r, body2, 1.0, 1.5, s * zo); f.rotation.x = s * Math.PI / 2; f.rotation.z = -0.5 - zo * 0.2; }); });
    return { node: r, idle(t) { segs.forEach((s, i) => s.position.y = 1.4 + Math.sin(i * 0.7 + t * 1.6) * 0.4); r.rotation.z = Math.sin(t * 1.0) * 0.05; r.position.y = (r._baseY || 0) + Math.sin(t * 0.8) * 0.22; } };
  }
  function angler() { // anglerfish abyss horror — vast maw, jagged teeth, a blazing lure
    const r = new BABYLON.TransformNode('eAngler', scene);
    const body = M('agBody', '#15202e', { spec: 0.2, emissive: '#050d16' }), body2 = M('agBody2', '#0e1722'), mouth = M('agMouth', '#2a0712'),
          teeth = M('agTeeth', '#e8e0d0'), lure = M('agLure', '#aef0ff', { emissive: '#9fe8ff' }), spot = M('agSpot', '#6fe0ff', { emissive: '#4fd0ff' });
    at(MB.CreateSphere('body', { diameterX: 3.4, diameterY: 3.0, diameterZ: 3.0, segments: 16 }, scene), r, body, -0.2, 2.0, 0);
    // biolum freckles
    for (let i = 0; i < 10; i++) { const a = i * 2.39; at(MB.CreateSphere('sp' + i, { diameter: 0.22 }, scene), r, spot, -0.5 + Math.cos(a) * 1.2, 2.0 + Math.sin(a) * 1.2, 1.2); }
    // cavernous maw
    at(MB.CreateBox('mouth', { width: 2.2, height: 1.4, depth: 2.8 }, scene), r, mouth, 1.5, 1.4, 0);
    for (let i = 0; i < 9; i++) { at(MB.CreateCylinder('tu', { height: 0.6, diameterTop: 0, diameterBottom: 0.22 }, scene), r, teeth, 1.95, 2.1, -1.0 + i * 0.26).rotation.x = Math.PI; at(MB.CreateCylinder('td', { height: 0.6, diameterTop: 0, diameterBottom: 0.22 }, scene), r, teeth, 1.95, 0.75, -1.0 + i * 0.26); }
    // dead milky eyes with sickly glow
    [-0.7, 0.7].forEach(z => { at(MB.CreateSphere('ew', { diameter: 0.62 }, scene), r, M('agW', '#d8d0b0'), 0.9, 2.7, z); at(MB.CreateSphere('eb', { diameter: 0.3 }, scene), r, M('agB', '#0a0a0a'), 1.15, 2.7, z); });
    // pectoral fins
    [-1, 1].forEach(s => { const f = at(MB.CreateCylinder('fin', { height: 1.6, diameterTop: 0, diameterBottom: 1.0, tessellation: 3 }, scene), r, body2, -0.8, 1.4, s * 1.5); f.rotation.x = s * Math.PI / 2; f.scaling.z = 0.3; });
    // the lure: long stalk, blazing bulb, light spill
    const stalk = at(MB.CreateCylinder('stalk', { height: 2.6, diameter: 0.12 }, scene), r, body, 0.8, 3.9, 0); stalk.rotation.z = -0.4;
    const bulb = at(MB.CreateSphere('lure', { diameter: 0.7 }, scene), r, lure, 2.1, 4.9, 0);
    const halo = at(MB.CreateSphere('halo', { diameter: 1.8 }, scene), r, M('agHalo', '#aef0ff', { emissive: '#aef0ff', alpha: 0.16 }), 2.1, 4.9, 0); halo.material.alphaMode = BABYLON.Engine.ALPHA_ADD; halo.isPickable = false;
    return { node: r, idle(t) { const p = 1 + Math.sin(t * 3) * 0.25; bulb.scaling.setAll(p); halo.scaling.setAll(p * 1.1); r.position.y = (r._baseY || 0) + Math.sin(t * 0.7) * 0.16; } };
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
  function cobra() { // rearing sand cobra
    const r = new BABYLON.TransformNode('eCobra', scene);
    const scale = M('cbS', '#b89a4a', { spec: 0.3 }), belly = M('cbB', '#e8d8a0'), hood = M('cbH', '#caa040'), eye = M('cbE', '#ff5e3a', { emissive: '#ff5e3a' });
    // coiled base
    at(MB.CreateTorus('coil', { diameter: 2.0, thickness: 0.6, tessellation: 16 }, scene), r, scale, 0, 0.5, 0).rotation.x = Math.PI / 2;
    // rearing body
    for (let i = 0; i < 5; i++) at(MB.CreateSphere('s'+i, { diameterX: 0.8 - i*0.06, diameterY: 0.8 - i*0.06, diameterZ: 0.8 - i*0.06, segments: 8 }, scene), r, i%2?scale:belly, 0, 1.0 + i*0.45, i*0.1);
    const hd = at(MB.CreateSphere('head', { diameterX: 0.9, diameterY: 0.7, diameterZ: 1.0, segments: 10 }, scene), r, scale, 0, 3.2, 0.3);
    at(MB.CreateBox('hood', { width: 1.5, height: 1.2, depth: 0.16 }, scene), r, hood, 0, 3.0, 0.1); // flared hood
    [-0.22, 0.22].forEach(x => at(MB.CreateSphere('e', { diameter: 0.16 }, scene), r, eye, x, 3.3, 0.75));
    [-0.08, 0.08].forEach(x => at(MB.CreateCylinder('fang', { height: 0.2, diameterTop: 0, diameterBottom: 0.06 }, scene), r, M('cbF', '#fff'), x, 2.95, 0.7).rotation.x = Math.PI);
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 1.6) * 0.08; hd.position.y = 3.2 + Math.sin(t * 2.2) * 0.12; } };
  }
  function scarab() { // gilded scarab beetle
    const r = new BABYLON.TransformNode('eScarab', scene);
    const shell = M('scS', '#caa030', { spec: 0.7, emissive: '#3a2e08' }), dark = M('scD', '#3a2e14'), eye = M('scE', '#5eff8b', { emissive: '#5eff8b' });
    at(MB.CreateSphere('body', { diameterX: 2.0, diameterY: 1.2, diameterZ: 2.4, segments: 12 }, scene), r, shell, 0, 0.9, 0);
    at(MB.CreateBox('seam', { width: 0.1, height: 1.0, depth: 2.2 }, scene), r, dark, 0, 1.5, 0);
    at(MB.CreateSphere('head', { diameter: 0.9 }, scene), r, dark, 0, 0.8, 1.3);
    [-0.5, 0.5].forEach(x => at(MB.CreateCylinder('horn', { height: 0.8, diameterTop: 0, diameterBottom: 0.18 }, scene), r, shell, x*0.6, 1.0, 1.7).rotation.x = -1.1);
    [-0.3, 0.3].forEach(x => at(MB.CreateSphere('e', { diameter: 0.18 }, scene), r, eye, x, 1.0, 1.6));
    const legs = [];
    [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { const lg = at(MB.CreateCylinder('lg', { height: 1.0, diameter: 0.12 }, scene), r, dark, s*1.0, 0.5, -0.6 + i*0.7); lg.rotation.z = s*0.9; legs.push(lg); } });
    return { node: r, idle(t) { r.position.y = (r._baseY||0) + Math.abs(Math.sin(t*3))*0.12; legs.forEach((l, i) => l.rotation.x = Math.sin(t*6 + i) * 0.3); } };
  }
  function genie() { // big bound genie rising from smoke (no legs, a wispy tail)
    const r = new BABYLON.TransformNode('eGenie', scene);
    const skin = M('gnS', '#2f8de0', { spec: 0.4, emissive: '#0a2a4a' }), skin2 = M('gnS2', '#1f6ab0'), gold = M('gnG', '#caa030', { emissive: '#3a2e08' }),
          dark = M('gnD', '#0a1a2a'), eye = M('gnE', '#fff6c2', { emissive: '#fff6c2' });
    // smoke/tail base
    at(MB.CreateCylinder('tail', { height: 2.4, diameterTop: 1.6, diameterBottom: 0.3, tessellation: 12 }, scene), r, skin2, 0, 1.2, 0);
    at(MB.CreateSphere('belly', { diameterX: 2.4, diameterY: 2.2, diameterZ: 2.0, segments: 14 }, scene), r, skin, 0, 2.8, 0);
    at(MB.CreateBox('sash', { width: 2.5, height: 0.5, depth: 2.1 }, scene), r, gold, 0, 2.4, 0);
    at(MB.CreateSphere('chest', { diameterX: 2.6, diameterY: 1.6, diameterZ: 1.6, segments: 12 }, scene), r, skin, 0, 3.9, 0);
    at(MB.CreateSphere('head', { diameter: 1.3 }, scene), r, skin, 0, 5.2, 0);
    at(MB.CreateSphere('hair', { diameter: 1.0, slice: 0.5 }, scene), r, dark, 0, 5.7, -0.05); // topknot base
    at(MB.CreateCylinder('knot', { height: 0.8, diameter: 0.4 }, scene), r, dark, 0, 6.2, 0);
    at(MB.CreateBox('beard', { width: 0.7, height: 0.7, depth: 0.4 }, scene), r, dark, 0, 4.7, 0.5);
    [-0.3, 0.3].forEach(x => at(MB.CreateSphere('e', { diameter: 0.22 }, scene), r, eye, x, 5.35, 0.55));
    // big folded arms
    [-1, 1].forEach(s => { const a = at(MB.CreateSphere('arm', { diameterX: 1.4, diameterY: 0.8, diameterZ: 0.8 }, scene), r, skin2, s*1.6, 3.7, 0.3); a.rotation.y = s*0.4;
      at(MB.CreateTorus('cuff', { diameter: 0.8, thickness: 0.18, tessellation: 12 }, scene), r, gold, s*2.2, 3.6, 0.4); });
    // binding shackles (broken on victory in lore; cosmetic here)
    [-1, 1].forEach(s => at(MB.CreateTorus('shk', { diameter: 0.9, thickness: 0.12, tessellation: 12 }, scene), r, M('gnShk', '#888', { spec: 0.6 }), s*2.4, 3.5, 0.4));
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 1.1) * 0.05; r.position.y = (r._baseY||0) + Math.sin(t * 1.4) * 0.18; } };
  }
  function wyvern() { // lesser dragon / vale wyvern
    const r = new BABYLON.TransformNode('eWyvern', scene);
    const hide = M('wyH', '#6a7a4a', { spec: 0.3 }), hide2 = M('wyH2', '#4a5a32'), wing = M('wyW', '#3a4226'), eye = M('wyE', '#ffcf3a', { emissive: '#ffcf3a' }), claw = M('wyC', '#e8e0d0');
    at(MB.CreateSphere('body', { diameterX: 1.6, diameterY: 1.4, diameterZ: 2.4, segments: 12 }, scene), r, hide, 0, 1.4, 0);
    const neck = at(MB.CreateCylinder('neck', { height: 1.4, diameterTop: 0.6, diameterBottom: 1.0 }, scene), r, hide, 0, 2.2, 0.9); neck.rotation.x = -0.6;
    at(MB.CreateSphere('head', { diameterX: 0.8, diameterY: 0.8, diameterZ: 1.3, segments: 10 }, scene), r, hide, 0, 2.9, 1.7);
    at(MB.CreateBox('snout', { width: 0.5, height: 0.4, depth: 0.7 }, scene), r, hide2, 0, 2.75, 2.3);
    [-0.25, 0.25].forEach(x => at(MB.CreateSphere('e', { diameter: 0.16 }, scene), r, eye, x, 3.05, 2.0));
    [-0.4, 0.4].forEach(x => at(MB.CreateCylinder('horn', { height: 0.6, diameterTop: 0, diameterBottom: 0.16 }, scene), r, claw, x, 3.3, 1.6).rotation.x = -0.4);
    const tail = at(MB.CreateCylinder('tail', { height: 2.6, diameterTop: 0, diameterBottom: 0.7 }, scene), r, hide, 0, 1.3, -1.8); tail.rotation.x = 1.3;
    const wings = [];
    [-1, 1].forEach(s => { const w = at(MB.CreateBox('wing', { width: 2.6, height: 0.08, depth: 1.6 }, scene), r, wing, s*1.9, 2.0, 0); w.rotation.y = s*0.2; wings.push({ w, s }); });
    [-1, 1].forEach(s => at(MB.CreateCylinder('leg', { height: 1.1, diameter: 0.3 }, scene), r, hide2, s*0.6, 0.5, 0.2));
    return { node: r, idle(t) { wings.forEach(o => o.w.rotation.z = Math.sin(t*5)*0.45*o.s); r.position.y = (r._baseY||0) + Math.sin(t*2.5)*0.2; } };
  }
  function skydragon() { // Vyrmithrax — the great Sky-Tyrant (boss)
    const r = new BABYLON.TransformNode('eSkyDragon', scene);
    const hide = M('sdH', '#5a3a6a', { spec: 0.4, emissive: '#160a1e' }), hide2 = M('sdH2', '#3f2a4f'), spine = M('sdSp', '#caa030', { emissive: '#3a2e08' }),
          wing = M('sdW', '#2a1a36'), eye = M('sdE', '#ff5e3a', { emissive: '#ff5e3a' }), claw = M('sdC', '#e8e0d0');
    at(MB.CreateSphere('body', { diameterX: 2.6, diameterY: 2.2, diameterZ: 3.6, segments: 14 }, scene), r, hide, 0, 2.0, 0);
    const neck = at(MB.CreateCylinder('neck', { height: 2.4, diameterTop: 0.9, diameterBottom: 1.6 }, scene), r, hide, 0, 3.4, 1.4); neck.rotation.x = -0.5;
    at(MB.CreateSphere('head', { diameterX: 1.3, diameterY: 1.2, diameterZ: 2.2, segments: 12 }, scene), r, hide, 0, 4.6, 2.6);
    at(MB.CreateBox('jaw', { width: 0.9, height: 0.5, depth: 1.4 }, scene), r, hide2, 0, 4.2, 3.4);
    for (let i = 0; i < 6; i++) at(MB.CreateCylinder('tooth', { height: 0.3, diameterTop: 0, diameterBottom: 0.1 }, scene), r, claw, -0.4 + i*0.16, 4.35, 3.6).rotation.x = Math.PI;
    [-0.4, 0.4].forEach(x => at(MB.CreateSphere('e', { diameter: 0.3 }, scene), r, eye, x, 4.9, 3.0));
    [-0.5, 0.5].forEach(x => at(MB.CreateCylinder('horn', { height: 1.2, diameterTop: 0, diameterBottom: 0.26 }, scene), r, spine, x, 5.2, 2.2).rotation.x = -0.3);
    // spine ridge
    for (let i = 0; i < 6; i++) at(MB.CreateCylinder('rdg', { height: 0.5 + (3-Math.abs(i-2.5))*0.12, diameterTop: 0, diameterBottom: 0.22 }, scene), r, spine, 0, 3.4 - i*0.1, 1.2 - i*0.7);
    const tail = at(MB.CreateCylinder('tail', { height: 4.0, diameterTop: 0, diameterBottom: 1.1 }, scene), r, hide, 0, 1.7, -2.6); tail.rotation.x = 1.2;
    const wings = [];
    [-1, 1].forEach(s => { const w = at(MB.CreateBox('wing', { width: 4.4, height: 0.1, depth: 2.6 }, scene), r, wing, s*3.0, 3.0, -0.2); w.rotation.y = s*0.2; wings.push({ w, s });
      at(MB.CreateCylinder('warm', { height: 3.0, diameter: 0.3 }, scene), r, hide2, s*1.6, 3.0, 0).rotation.z = s*1.4; });
    [-1, 1].forEach(s => at(MB.CreateCylinder('leg', { height: 1.8, diameter: 0.5 }, scene), r, hide2, s*0.9, 0.8, 0.2));
    return { node: r, idle(t) { wings.forEach(o => o.w.rotation.z = Math.sin(t*2.4)*0.32*o.s); r.position.y = (r._baseY||0) + Math.sin(t*1.3)*0.22; } };
  }
  // ---- Paegina (Greek myth) bestiary ----
  function harpy() {
    const r = new BABYLON.TransformNode('eHarpy', scene);
    const feather = M('hpF', '#8a6a4a', { spec: 0.2 }), wing = M('hpW', '#5a4632'), skin = M('hpS', '#dcb89a'), hair = M('hpH', '#2a1808'), claw = M('hpC', '#caa030');
    at(MB.CreateSphere('body', { diameterX: 1.0, diameterY: 1.4, diameterZ: 1.0, segments: 10 }, scene), r, feather, 0, 1.6, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.6, 0.1);
    at(MB.CreateSphere('hair', { diameter: 0.66, slice: 0.6 }, scene), r, hair, 0, 2.72, -0.05);
    [-0.15, 0.15].forEach(z => at(MB.CreateSphere('e', { diameter: 0.12 }, scene), r, M('hpE', '#ffcf3a', { emissive: '#ffcf3a' }), 0.22, 2.62, z));
    const wings = [];
    [-1, 1].forEach(s => { const w = at(MB.CreateBox('w', { width: 0.1, height: 1.4, depth: 2.0 }, scene), r, wing, s * 0.7, 1.8, -0.2); w.rotation.x = 0.2; w.rotation.y = s * 0.3; wings.push({ w, s }); });
    [-1, 1].forEach(s => { const l = at(MB.CreateCylinder('leg', { height: 0.8, diameter: 0.12 }, scene), r, claw, s * 0.25, 0.8, 0); at(MB.CreateCylinder('talon', { height: 0.3, diameterTop: 0, diameterBottom: 0.16 }, scene), r, claw, s * 0.25, 0.35, 0.15).rotation.x = 1.2; });
    return { node: r, idle(t) { wings.forEach(o => o.w.rotation.z = Math.sin(t * 6) * 0.4 * o.s); r.position.y = (r._baseY || 0) + Math.sin(t * 3) * 0.2; } };
  }
  function satyr() {
    const r = new BABYLON.TransformNode('eSatyr', scene);
    const fur = M('syF', '#6a4a2a'), skin = M('syS', '#d0a070'), horn = M('syH', '#e8e0d0'), hair = M('syHr', '#3a2410');
    at(MB.CreateCylinder('lL', { height: 1.1, diameterTop: 0.34, diameterBottom: 0.22 }, scene), r, fur, -0.22, 0.55, 0);
    at(MB.CreateCylinder('lR', { height: 1.1, diameterTop: 0.34, diameterBottom: 0.22 }, scene), r, fur, 0.22, 0.55, 0);
    [-1, 1].forEach(s => at(MB.CreateCylinder('hoof', { height: 0.2, diameter: 0.24 }, scene), r, M('syHo', '#1a1208'), s * 0.22, 0.08, 0.05));
    at(MB.CreateBox('torso', { width: 0.8, height: 1.0, depth: 0.5 }, scene), r, skin, 0, 1.6, 0);
    at(MB.CreateCylinder('aL', { height: 0.85, diameter: 0.22 }, scene), r, skin, -0.52, 1.6, 0).rotation.z = 0.3;
    at(MB.CreateCylinder('aR', { height: 0.85, diameter: 0.22 }, scene), r, skin, 0.52, 1.6, 0.1).rotation.z = -0.3;
    at(MB.CreateSphere('head', { diameter: 0.56 }, scene), r, skin, 0, 2.3, 0);
    at(MB.CreateSphere('hair', { diameter: 0.62, slice: 0.6 }, scene), r, hair, 0, 2.42, -0.04);
    at(MB.CreateBox('beard', { width: 0.34, height: 0.3, depth: 0.2 }, scene), r, hair, 0, 2.08, 0.16);
    [-1, 1].forEach(s => at(MB.CreateCylinder('horn', { height: 0.5, diameterTop: 0, diameterBottom: 0.12 }, scene), r, horn, s * 0.18, 2.6, 0).rotation.z = s * 0.4);
    // pan-flute in hand
    for (let i = 0; i < 4; i++) at(MB.CreateCylinder('pipe', { height: 0.3 + i * 0.06, diameter: 0.07 }, scene), r, M('syP', '#caa86a'), 0.6 + i * 0.08, 1.7, 0.2);
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 2) * 0.05; } };
  }
  function cyclops() {
    const r = new BABYLON.TransformNode('eCyclops', scene);
    const skin = M('cyS', '#b08a5a', { spec: 0.2 }), skin2 = M('cyS2', '#9a7448'), loin = M('cyL', '#7a4a2a'), eye = M('cyE', '#fff', { emissive: '#fff' });
    at(MB.CreateCylinder('lL', { height: 1.5, diameter: 0.5 }, scene), r, skin2, -0.34, 0.75, 0);
    at(MB.CreateCylinder('lR', { height: 1.5, diameter: 0.5 }, scene), r, skin2, 0.34, 0.75, 0);
    at(MB.CreateBox('loin', { width: 1.3, height: 0.5, depth: 0.9 }, scene), r, loin, 0, 1.6, 0);
    at(MB.CreateBox('torso', { width: 1.4, height: 1.8, depth: 1.0 }, scene), r, skin, 0, 2.7, 0);
    at(MB.CreateSphere('head', { diameter: 1.1 }, scene), r, skin, 0, 4.0, 0);
    at(MB.CreateSphere('eyeW', { diameter: 0.5 }, scene), r, eye, 0, 4.1, 0.45);
    at(MB.CreateSphere('eyeB', { diameter: 0.24 }, scene), r, M('cyP', '#3a1a0a'), 0, 4.1, 0.62);
    const arm = new BABYLON.TransformNode('cyArm', scene); arm.parent = r; arm.position.set(1.0, 3.4, 0);
    at(MB.CreateCylinder('aR', { height: 1.6, diameter: 0.42 }, scene), arm, skin, 0, -0.7, 0);
    at(MB.CreateCylinder('aL', { height: 1.6, diameter: 0.42 }, scene), r, skin, -1.0, 2.7, 0).rotation.z = 0.2;
    at(MB.CreateCylinder('club', { height: 2.2, diameterTop: 0.5, diameterBottom: 0.2 }, scene), arm, M('cyClub', '#5a3a1e'), 0, -1.6, 0.2);
    return { node: r, idle(t) { arm.rotation.x = Math.sin(t * 1.5) * 0.12; } };
  }
  function minotaur() {
    const r = new BABYLON.TransformNode('eMinotaur', scene);
    const fur = M('mnF', '#4a2e1a', { spec: 0.2 }), fur2 = M('mnF2', '#3a2412'), skin = M('mnS', '#2a1a10'), horn = M('mnH', '#e8e0d0'), steel = M('mnSt', '#cfd8e4', { spec: 0.8 }), eye = M('mnE', '#ff3a1a', { emissive: '#ff3a1a' });
    at(MB.CreateCylinder('lL', { height: 1.4, diameter: 0.46 }, scene), r, fur2, -0.3, 0.7, 0);
    at(MB.CreateCylinder('lR', { height: 1.4, diameter: 0.46 }, scene), r, fur2, 0.3, 0.7, 0);
    at(MB.CreateBox('torso', { width: 1.5, height: 1.7, depth: 1.0 }, scene), r, fur, 0, 2.4, 0);
    at(MB.CreateBox('abs', { width: 1.0, height: 1.0, depth: 0.92 }, scene), r, skin, 0, 1.9, 0.08);
    at(MB.CreateSphere('head', { diameterX: 0.9, diameterY: 0.9, diameterZ: 1.1, segments: 10 }, scene), r, fur, 0, 3.7, 0.1);
    at(MB.CreateBox('snout', { width: 0.5, height: 0.4, depth: 0.5 }, scene), r, skin, 0, 3.5, 0.6);
    at(MB.CreateSphere('nostrilR', { diameter: 0.1 }, scene), r, M('mnN', '#fff'), 0.12, 3.45, 0.82);
    [-1, 1].forEach(s => { const h = at(MB.CreateCylinder('horn', { height: 0.8, diameterTop: 0, diameterBottom: 0.18 }, scene), r, horn, s * 0.45, 3.9, 0.1); h.rotation.z = s * 1.2; });
    [-0.25, 0.25].forEach(z => at(MB.CreateSphere('e', { diameter: 0.14 }, scene), r, eye, 0.35, 3.8, z));
    const arm = new BABYLON.TransformNode('mnArm', scene); arm.parent = r; arm.position.set(1.0, 3.0, 0);
    at(MB.CreateCylinder('aR', { height: 1.5, diameter: 0.4 }, scene), arm, fur, 0, -0.65, 0);
    at(MB.CreateCylinder('aL', { height: 1.5, diameter: 0.4 }, scene), r, fur, -1.0, 2.4, 0).rotation.z = 0.2;
    // labrys (double axe)
    const ax = new BABYLON.TransformNode('mnAxe', scene); ax.parent = arm; ax.position.set(0, -1.5, 0.2);
    at(MB.CreateCylinder('haft', { height: 2.2, diameter: 0.12 }, scene), ax, M('mnHaft', '#5a3a1e'), 0, 0.4, 0);
    [-1, 1].forEach(s => at(MB.CreateCylinder('blade', { height: 0.9, diameterTop: 0.1, diameterBottom: 0.9, tessellation: 3 }, scene), ax, steel, s * 0.4, 1.4, 0).rotation.z = s * Math.PI / 2);
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 1.4) * 0.04; arm.rotation.x = Math.sin(t * 1.2) * 0.1; } };
  }
  function medusa() {
    const r = new BABYLON.TransformNode('eMedusa', scene);
    const scale = M('mdSc', '#3a7a4a', { spec: 0.4 }), scale2 = M('mdSc2', '#2c5e3a'), skin = M('mdSk', '#cdb89a'), snake = M('mdSn', '#4a9a5a', { emissive: '#0a2a14' }), eye = M('mdE', '#ffd24a', { emissive: '#ffd24a' });
    // coiled serpent lower body
    at(MB.CreateCylinder('coil', { height: 1.0, diameterTop: 1.6, diameterBottom: 2.4, tessellation: 14 }, scene), r, scale, 0, 0.5, 0);
    at(MB.CreateTorus('coil2', { diameter: 2.0, thickness: 0.5, tessellation: 16 }, scene), r, scale2, 0, 0.9, 0).rotation.x = Math.PI / 2;
    // humanoid torso
    at(MB.CreateBox('torso', { width: 0.9, height: 1.3, depth: 0.5 }, scene), r, skin, 0, 1.9, 0);
    at(MB.CreateBox('top', { width: 0.94, height: 0.5, depth: 0.54 }, scene), r, M('mdTop', '#caa030'), 0, 2.2, 0);
    at(MB.CreateCylinder('aL', { height: 0.9, diameter: 0.2 }, scene), r, skin, -0.56, 1.95, 0.1).rotation.z = 0.5;
    at(MB.CreateCylinder('aR', { height: 0.9, diameter: 0.2 }, scene), r, skin, 0.56, 1.95, 0.1).rotation.z = -0.5;
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.85, 0);
    [-0.16, 0.16].forEach(z => at(MB.CreateSphere('e', { diameter: 0.14 }, scene), r, eye, 0.2, 2.88, z));
    // snake hair
    const snakes = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const s = at(MB.CreateCylinder('snk' + i, { height: 0.7, diameterTop: 0.06, diameterBottom: 0.16 }, scene), r, snake, Math.cos(a) * 0.3, 3.2, Math.sin(a) * 0.3); s.rotation.x = Math.sin(a) * 0.6; s.rotation.z = Math.cos(a) * 0.6; snakes.push({ s, a }); }
    // a bow in hand (Greek archer)
    at(MB.CreateTorus('bow', { diameter: 1.4, thickness: 0.07, tessellation: 18, arc: 0.5 }, scene), r, M('mdBow', '#6b4423'), 0.85, 1.9, 0.1).rotation.z = Math.PI / 2;
    return { node: r, idle(t) { snakes.forEach((o, i) => { o.s.rotation.x = Math.sin(t * 3 + i) * 0.5; o.s.rotation.z = Math.cos(t * 3 + i) * 0.5; }); r.rotation.y = Math.sin(t * 0.6) * 0.1; } };
  }
  function hydra() {
    const r = new BABYLON.TransformNode('eHydra', scene);
    const hide = M('hyH', '#2f6b54', { spec: 0.4, emissive: '#08201a' }), hide2 = M('hyH2', '#234f3f'), maw = M('hyM', '#5a0a14'), eye = M('hyE', '#ffcf3a', { emissive: '#ffcf3a' }), teeth = M('hyT', '#e8e0d0');
    at(MB.CreateSphere('body', { diameterX: 3.0, diameterY: 2.2, diameterZ: 3.4, segments: 14 }, scene), r, hide, 0, 1.8, 0);
    at(MB.CreateCylinder('tail', { height: 3.2, diameterTop: 0, diameterBottom: 1.0 }, scene), r, hide2, 0, 1.4, -2.4).rotation.x = 1.2;
    const heads = [];
    [-1.2, 0, 1.2].forEach((xo, i) => {
      const piv = new BABYLON.TransformNode('hd' + i, scene); piv.parent = r; piv.position.set(xo, 2.6, 0.6);
      const neck = at(MB.CreateCylinder('neck', { height: 2.2 + Math.abs(xo) * 0.3, diameterTop: 0.4, diameterBottom: 0.7 }, scene), piv, hide, 0, 1.0, 0); neck.rotation.x = -0.4 + (i - 1) * 0.1;
      const head = at(MB.CreateSphere('head', { diameterX: 0.8, diameterY: 0.7, diameterZ: 1.3, segments: 10 }, scene), piv, hide, xo * 0.2, 2.1, 0.6);
      at(MB.CreateBox('maw', { width: 0.5, height: 0.3, depth: 0.7 }, scene), piv, maw, xo * 0.2, 1.95, 1.05);
      for (let k = 0; k < 4; k++) at(MB.CreateCylinder('t', { height: 0.2, diameterTop: 0, diameterBottom: 0.08 }, scene), piv, teeth, xo * 0.2 - 0.15 + k * 0.1, 2.05, 1.2).rotation.x = Math.PI;
      [-0.18, 0.18].forEach(z => at(MB.CreateSphere('e', { diameter: 0.14 }, scene), piv, eye, xo * 0.2, 2.3, 0.55 + Math.abs(z) * 0).position.z = 0.7);
      heads.push({ piv, i });
    });
    [-1, 1].forEach(s => at(MB.CreateCylinder('leg', { height: 1.4, diameter: 0.55 }, scene), r, hide2, s * 1.1, 0.7, 0.4));
    return { node: r, idle(t) { heads.forEach((h, i) => { h.piv.rotation.z = Math.sin(t * 1.5 + i * 2) * 0.12; h.piv.rotation.x = Math.sin(t * 1.2 + i) * 0.08; }); r.position.y = (r._baseY || 0) + Math.sin(t * 1.1) * 0.12; } };
  }
  // ---------------- THEMED DUNGEON MOBS (one creative set per new dungeon) ----------------
  // Whiteout Station — a quivering Thing-spawn: assimilated flesh, bone spurs, grasping limbs
  function thingspawn() {
    const r = new BABYLON.TransformNode('eThingspawn', scene);
    const flesh = M('tsF', '#b04a52', { spec: 0.5, emissive: '#3a0e12' }), flesh2 = M('tsF2', '#8a363f'), bone = M('tsB', '#e6ddc6'), maw = M('tsM', '#1a0608'), eye = M('tsE', '#ffe08a', { emissive: '#ffb030' });
    at(MB.CreateSphere('mass', { diameterX: 2.2, diameterY: 1.7, diameterZ: 2.0, segments: 12 }, scene), r, flesh, 0, 1.0, 0);
    at(MB.CreateSphere('lump', { diameter: 1.3 }, scene), r, flesh2, 0.6, 1.5, -0.3);
    // gaping maw ringed with bone teeth
    at(MB.CreateSphere('maw', { diameterX: 1.0, diameterY: 0.7, diameterZ: 0.6 }, scene), r, maw, 0, 1.1, 1.0);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; at(MB.CreateCylinder('tooth', { height: 0.34, diameterTop: 0, diameterBottom: 0.12 }, scene), r, bone, Math.cos(a) * 0.5, 1.1 + Math.sin(a) * 0.4, 1.15).rotation.x = Math.PI / 2; }
    // scattered alien eyes that shouldn't be there
    [[-0.5, 1.7, 0.7], [0.7, 1.0, 0.8], [0.1, 0.6, 0.9]].forEach(p => at(MB.CreateSphere('eye', { diameter: 0.3 }, scene), r, eye, p[0], p[1], p[2]));
    // grasping limbs that writhe
    const limbs = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const piv = new BABYLON.TransformNode('lp' + i, scene); piv.parent = r; piv.position.set(Math.cos(a) * 0.9, 0.7, Math.sin(a) * 0.9);
      const arm = at(MB.CreateCylinder('limb', { height: 1.8, diameterTop: 0.06, diameterBottom: 0.3, tessellation: 6 }, scene), piv, i % 2 ? flesh : flesh2, 0, 0.6, 0); arm.rotation.x = Math.sin(a) * 0.5; arm.rotation.z = -Math.cos(a) * 0.5;
      const claw = at(MB.CreateCylinder('cl', { height: 0.4, diameterTop: 0, diameterBottom: 0.14 }, scene), arm, bone, 0, 0.9, 0); claw.rotation.x = Math.PI; limbs.push({ piv, a, i }); }
    return { node: r, idle(t) { limbs.forEach(o => { o.piv.rotation.y = Math.sin(t * 2 + o.i) * 0.3; o.piv.rotation.x = Math.sin(t * 1.7 + o.i * 1.5) * 0.25; }); r.scaling.y = 1 + Math.sin(t * 3) * 0.05; } };
  }
  // Spirit Wood — a Kodama: tiny pale forest spirit, oversized rattling head, hollow eyes
  function kodama() {
    const r = new BABYLON.TransformNode('eKodama', scene);
    const pale = M('kdP', '#e8efe6', { spec: 0.1 }), dark = M('kdD', '#2a2a2a'), body = M('kdB', '#d8e2d6');
    at(MB.CreateCylinder('body', { height: 0.7, diameterTop: 0.4, diameterBottom: 0.32 }, scene), r, body, 0, 0.55, 0);
    [-0.18, 0.18].forEach(x => at(MB.CreateCylinder('leg', { height: 0.3, diameter: 0.12 }, scene), r, body, x, 0.15, 0));
    [-0.28, 0.28].forEach(x => at(MB.CreateCylinder('arm', { height: 0.3, diameter: 0.1 }, scene), r, body, x, 0.7, 0).rotation.z = x > 0 ? 0.5 : -0.5);
    const head = new BABYLON.TransformNode('kh', scene); head.parent = r; head.position.set(0, 1.25, 0);
    at(MB.CreateSphere('head', { diameterX: 1.0, diameterY: 1.05, diameterZ: 0.9, segments: 12 }, scene), head, pale, 0, 0, 0);
    // three hollow holes (two eyes, one mouth) — the iconic kodama face
    [[-0.22, 0.1, 0.42], [0.22, 0.1, 0.42], [0, -0.25, 0.44]].forEach((p, i) => at(MB.CreateCylinder('hole', { height: 0.12, diameter: i === 2 ? 0.28 : 0.2, tessellation: 12 }, scene), head, dark, p[0], p[1], p[2]).rotation.x = Math.PI / 2);
    return { node: r, idle(t) { head.rotation.z = Math.sin(t * 4) * 0.25; head.rotation.y = Math.sin(t * 1.5) * 0.3; } }; // the head clicks back and forth
  }
  // Spirit Wood — a cursed Boar: demon-boar wreathed in writhing curse-tendrils, red eyes
  function boarspirit() {
    const r = new BABYLON.TransformNode('eBoar', scene);
    const hide = M('bsH', '#2a1c22', { spec: 0.2 }), curse = M('bsC', '#7a1f2a', { emissive: '#2a0608' }), tusk = M('bsT', '#e6ddc6'), eye = M('bsE', '#ff3a3a', { emissive: '#ff2020' });
    at(MB.CreateSphere('body', { diameterX: 2.6, diameterY: 1.6, diameterZ: 1.7, segments: 12 }, scene), r, hide, -0.2, 1.2, 0);
    const snout = at(MB.CreateCylinder('snout', { height: 1.1, diameterTop: 0.5, diameterBottom: 0.7, tessellation: 10 }, scene), r, hide, 1.3, 1.0, 0); snout.rotation.z = -Math.PI / 2;
    [-0.35, 0.35].forEach(z => at(MB.CreateSphere('eye', { diameter: 0.26 }, scene), r, eye, 1.0, 1.4, z));
    [-0.3, 0.3].forEach(z => { const tk = at(MB.CreateCylinder('tusk', { height: 0.7, diameterTop: 0, diameterBottom: 0.12 }, scene), r, tusk, 1.6, 0.85, z); tk.rotation.z = 0.6; });
    [-1, 1].forEach(s => [0.6, -0.6].forEach(zo => at(MB.CreateCylinder('leg', { height: 1.0, diameter: 0.28 }, scene), r, hide, s * 0.7, 0.5, zo)));
    // curse tendrils erupting from the back like Mononoke's tatarigami
    const tend = [];
    for (let i = 0; i < 7; i++) { const piv = new BABYLON.TransformNode('cp' + i, scene); piv.parent = r; piv.position.set(-1.2 + i * 0.35, 1.9, (i % 2 ? 0.4 : -0.4));
      const t = at(MB.CreateCylinder('tn', { height: 1.2, diameterTop: 0.02, diameterBottom: 0.12, tessellation: 5 }, scene), piv, curse, 0, 0.5, 0); t.rotation.z = (Math.random() - 0.5) * 0.6; tend.push({ piv, i }); }
    return { node: r, idle(t) { tend.forEach(o => { o.piv.rotation.x = Math.sin(t * 4 + o.i) * 0.4; o.piv.rotation.z = Math.cos(t * 3 + o.i) * 0.3; }); r.position.y = (r._baseY || 0) + Math.abs(Math.sin(t * 2)) * 0.06; } };
  }
  // Heart of Gold crash — a Vogon Clerk: lumpen bureaucrat alien clutching a stack of FORMS
  function vogonclerk() {
    const r = new BABYLON.TransformNode('eVogonclerk', scene);
    const skin = M('vcS', '#5a6e4a', { spec: 0.2 }), skin2 = M('vcS2', '#46583a'), suit = M('vcSuit', '#3a3026'), paper = M('vcP', '#e6e0cc'), eye = M('vcE', '#d4c050', { emissive: '#5a4e10' });
    at(MB.CreateBox('body', { width: 1.5, height: 1.6, depth: 1.1 }, scene), r, suit, 0, 1.3, 0);
    at(MB.CreateSphere('gut', { diameterX: 1.7, diameterY: 1.3, diameterZ: 1.2 }, scene), r, skin2, 0, 1.0, 0.2);
    const head = at(MB.CreateSphere('head', { diameterX: 1.4, diameterY: 1.1, diameterZ: 1.2, segments: 12 }, scene), r, skin, 0, 2.4, 0);
    at(MB.CreateBox('brow', { width: 1.3, height: 0.3, depth: 0.4 }, scene), r, skin2, 0, 2.55, 0.45);
    [-0.32, 0.32].forEach(x => at(MB.CreateSphere('eye', { diameter: 0.2 }, scene), r, eye, x, 2.35, 0.55));
    at(MB.CreateBox('jowl', { width: 1.2, height: 0.5, depth: 0.5 }, scene), r, skin, 0, 1.95, 0.45);
    [-1, 1].forEach(s => at(MB.CreateCylinder('arm', { height: 1.2, diameter: 0.32 }, scene), r, skin, s * 0.95, 1.3, 0.1).rotation.z = s * 0.3);
    // a teetering stack of forms held out front
    const stack = new BABYLON.TransformNode('stk', scene); stack.parent = r; stack.position.set(0, 1.3, 0.8);
    for (let i = 0; i < 5; i++) at(MB.CreateBox('form', { width: 0.7, height: 0.05, depth: 0.5 }, scene), stack, paper, (Math.random() - 0.5) * 0.1, i * 0.09, 0).rotation.y = (Math.random() - 0.5) * 0.3;
    return { node: r, idle(t) { stack.rotation.z = Math.sin(t * 2) * 0.05; r.rotation.y = Math.sin(t * 0.8) * 0.05; } };
  }
  // Heart of Gold crash — a Sentry: a hovering surveillance drone with a single scanning eye
  function sentry() {
    const r = new BABYLON.TransformNode('eSentry', scene);
    const hull = M('snH', '#9aa6b4', { spec: 0.7, specPower: 60 }), dark = M('snD', '#2a3038'), eye = M('snE', '#ff5a4a', { emissive: '#ff3020' }), glow = M('snG', '#5ec8ff', { emissive: '#2090ff' });
    at(MB.CreateSphere('core', { diameter: 1.3, segments: 14 }, scene), r, hull, 0, 1.6, 0);
    at(MB.CreateCylinder('ring', { height: 0.18, diameter: 2.0, tessellation: 20 }, scene), r, dark, 0, 1.6, 0);
    const e = at(MB.CreateSphere('eye', { diameter: 0.5 }, scene), r, eye, 0, 1.6, 0.6);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; at(MB.CreateSphere('thr', { diameter: 0.22 }, scene), r, glow, Math.cos(a) * 0.85, 1.6, Math.sin(a) * 0.85); }
    return { node: r, idle(t) { r.rotation.y = t * 1.2; e.scaling.z = 1 + Math.sin(t * 6) * 0.2; r.position.y = (r._baseY || 0) + Math.sin(t * 2) * 0.18; } };
  }
  // The Giant's Mill — a Mutton: a fat fluffy sheep (Quixote's "enemy army")
  function mutton() {
    const r = new BABYLON.TransformNode('eMutton', scene);
    const wool = M('muW', '#e8e4da', { spec: 0.05 }), face = M('muF', '#2a2420'), horn = M('muH', '#c9b98a');
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; at(MB.CreateSphere('puff', { diameter: 1.0 }, scene), r, wool, Math.cos(a) * 0.7, 1.1 + (i % 2) * 0.25, Math.sin(a) * 0.5); }
    at(MB.CreateSphere('core', { diameterX: 1.7, diameterY: 1.3, diameterZ: 1.5 }, scene), r, wool, 0, 1.1, 0);
    const head = at(MB.CreateSphere('head', { diameterX: 0.7, diameterY: 0.8, diameterZ: 0.75 }, scene), r, face, 1.0, 1.2, 0);
    [-1, 1].forEach(s => at(MB.CreateTorus('horn', { diameter: 0.4, thickness: 0.1, tessellation: 8, arc: 0.6 }, scene), r, horn, 1.0, 1.5, s * 0.3).rotation.z = 1);
    [-0.18, 0.18].forEach(z => at(MB.CreateSphere('eye', { diameter: 0.12 }, scene), r, M('muE', '#0a0a0a'), 1.25, 1.3, z));
    [-1, 1].forEach(s => [0.4, -0.4].forEach(zo => at(MB.CreateCylinder('leg', { height: 0.7, diameter: 0.18 }, scene), r, face, s * 0.4, 0.35, zo)));
    return { node: r, idle(t) { r.position.y = (r._baseY || 0) + Math.abs(Math.sin(t * 4)) * 0.08; } };
  }
  // The Giant's Mill — a Windvane: an animate sail-arm shard of the windmill-"giant"
  function windvane() {
    const r = new BABYLON.TransformNode('eWindvane', scene);
    const wood = M('wvW', '#7a5a32', { spec: 0.2 }), wood2 = M('wvW2', '#5a401f'), sail = M('wvS', '#d8cba0'), eye = M('wvE', '#caa030', { emissive: '#6a5410' });
    at(MB.CreateCylinder('post', { height: 2.4, diameter: 0.5, tessellation: 8 }, scene), r, wood2, 0, 1.2, 0);
    const stoneEye = at(MB.CreateSphere('eye', { diameterX: 0.6, diameterY: 0.4, diameterZ: 0.3 }, scene), r, eye, 0, 1.9, 0.3);
    const hub = new BABYLON.TransformNode('hub', scene); hub.parent = r; hub.position.set(0, 1.9, 0.35);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const arm = at(MB.CreateBox('arm', { width: 0.18, height: 1.6, depth: 0.12 }, scene), hub, wood, 0, 0, 0); arm.position.set(Math.sin(a) * 0.8, Math.cos(a) * 0.8, 0); arm.rotation.z = -a; at(MB.CreateBox('sail', { width: 0.5, height: 1.2, depth: 0.05 }, scene), hub, sail, Math.sin(a) * 1.0 + Math.cos(a) * 0.3, Math.cos(a) * 1.0 - Math.sin(a) * 0.3, 0.05).rotation.z = -a; }
    [-1, 1].forEach(s => at(MB.CreateCylinder('leg', { height: 1.0, diameter: 0.2 }, scene), r, wood2, s * 0.4, 0.5, 0).rotation.z = s * 0.2);
    return { node: r, idle(t) { hub.rotation.z = t * 2; stoneEye.scaling.y = 1 + Math.sin(t * 5) * 0.2; } };
  }

  // OMEGA — Selachoth's true, shed form: a pale biomechanical angel-horror risen from the
  // drowned abyss (a Jenova-style final). Floating core, single great eye, ragged wings, broken halo.
  function omega() {
    const r = new BABYLON.TransformNode('eOmega', scene);
    const flesh = M('omF', '#d8ccc0', { spec: 0.4, specPower: 50, emissive: '#2a2230' }), flesh2 = M('omF2', '#b0a4b8'),
          biomech = M('omB', '#6a6478', { spec: 0.6 }), glow = M('omG', '#7fe9ff', { emissive: '#39c8ff' }),
          veil = M('omV', '#c46aff', { emissive: '#7a2ad0' }), eyeW = M('omEW', '#eaf6ff', { emissive: '#9fe0ff' }), eyeP = M('omEP', '#10121a');
    // elongated angelic torso/core
    at(MB.CreateSphere('core', { diameterX: 1.8, diameterY: 3.2, diameterZ: 1.6, segments: 16 }, scene), r, flesh, 0, 3.4, 0);
    at(MB.CreateCylinder('neck', { height: 1.2, diameterTop: 0.6, diameterBottom: 1.0, tessellation: 12 }, scene), r, flesh2, 0, 5.0, 0);
    // the single great eye where a face should be
    at(MB.CreateSphere('eyeW', { diameter: 1.1 }, scene), r, eyeW, 0, 5.4, 0.55);
    at(MB.CreateSphere('eyeP', { diameter: 0.5 }, scene), r, eyeP, 0, 5.4, 0.95);
    at(MB.CreateSphere('eyeG', { diameter: 1.6 }, scene), r, M('omEG', '#9fe0ff', { emissive: '#9fe0ff', alpha: 0.18 }), 0, 5.4, 0.55).material.alphaMode = BABYLON.Engine.ALPHA_ADD;
    // a broken halo
    const halo = at(MB.CreateTorus('halo', { diameter: 2.4, thickness: 0.12, tessellation: 24, arc: 0.78 }, scene), r, glow, 0, 6.2, -0.1); halo.rotation.x = Math.PI / 2.2;
    // bio-tubes wrapping the torso
    [-1, 1].forEach(s => { const t = at(MB.CreateCylinder('tube', { height: 3.0, diameter: 0.28, tessellation: 8 }, scene), r, biomech, s * 0.9, 3.4, 0.2); t.rotation.z = s * 0.16; });
    // great ragged wings (asymmetric — one feathered, one bladed/bone)
    const wings = [];
    [-1, 1].forEach(s => {
      const wp = new BABYLON.TransformNode('wp' + s, scene); wp.parent = r; wp.position.set(s * 0.8, 4.4, -0.5);
      for (let i = 0; i < 5; i++) { const fe = at(MB.CreateCylinder('fea', { height: 3.2 - i * 0.3, diameterTop: 0, diameterBottom: 0.5, tessellation: 4 }, scene), wp, s < 0 ? flesh2 : biomech, s * (0.6 + i * 0.5), 0.4 + i * 0.2, -0.3); fe.rotation.z = s * (0.5 + i * 0.28); fe.scaling.z = 0.3; }
      wings.push(wp);
    });
    // trailing tendrils from below the core
    const tend = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const piv = new BABYLON.TransformNode('tp' + i, scene); piv.parent = r; piv.position.set(Math.cos(a) * 0.7, 2.0, Math.sin(a) * 0.6);
      at(MB.CreateCylinder('ten', { height: 2.4, diameterTop: 0.04, diameterBottom: 0.22, tessellation: 5 }, scene), piv, i % 2 ? veil : flesh2, 0, -1.1, 0); tend.push({ piv, a, i }); }
    // motes of light orbiting the form
    for (let i = 0; i < 10; i++) { const a = i * 2.39; at(MB.CreateSphere('mote', { diameter: 0.18 }, scene), r, glow, Math.cos(a) * 2.0, 3.0 + (i % 5) * 0.6, Math.sin(a) * 1.6); }
    return { node: r, idle(t) {
      r.position.y = (r._baseY || 0) + Math.sin(t * 0.8) * 0.25;
      halo.rotation.z = t * 0.5;
      wings.forEach((w, i) => { w.rotation.x = Math.sin(t * 1.1 + i * Math.PI) * 0.18; });
      tend.forEach(o => { o.piv.rotation.x = Math.sin(t * 1.6 + o.i) * 0.3; o.piv.rotation.z = Math.cos(t * 1.3 + o.i) * 0.25; });
    } };
  }

  const ENEMY_BUILDERS = { shark, crab, jelly, octo, gull, golem, kraken, selachoth, leviathan, angler, eel, urchin, bat, ghoul, wraith, vampire, drifter, cobra, scarab, genie, wyvern, skydragon, harpy, satyr, cyclops, minotaur, medusa, hydra, thething, forestgod, vogon, windmill, thingspawn, kodama, boarspirit, vogonclerk, sentry, mutton, windvane, omega, ruffy_duel: () => rival() };

  // ---------------- ALADDIN (street-rat ally) ----------------
  function aladdin(weaponKey) {
    const r = new BABYLON.TransformNode('aladdin', scene);
    const vest = M('alVest', '#7a1f6a'), skin = M('alSkin', '#c08a5a'), pants = M('alPants', '#e8e0d0'), hair = M('alHair', '#1a1208'), fez = M('alFez', '#b03030');
    at(MB.CreateCylinder('lL', { height: 1.2, diameter: 0.34 }, scene), r, pants, -0.22, 0.6, 0);
    at(MB.CreateCylinder('lR', { height: 1.2, diameter: 0.34 }, scene), r, pants, 0.22, 0.6, 0);
    at(MB.CreateBox('sash', { width: 0.96, height: 0.2, depth: 0.58 }, scene), r, fez, 0, 1.3, 0);
    at(MB.CreateBox('torso', { width: 0.86, height: 1.1, depth: 0.5 }, scene), r, skin, 0, 1.7, 0);   // bare chest
    shoulders(r, skin, 2.12, 0.42, 0.46);
    at(MB.CreateBox('vest', { width: 0.94, height: 1.0, depth: 0.54 }, scene), r, vest, 0, 1.75, -0.02).scaling.x = 0.5; // open vest sides
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.26 }, scene), r, skin, -0.58, 1.7, 0); aL.rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.6, 2.05, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.26 }, scene), arm, skin, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.55, 0);
    face(r, 2.6, 0.6, { brow: '#1a1208' });
    hand(aL, 0, -0.5, 0, '#c08a5a'); hand(arm, 0, -0.92, 0.05, '#c08a5a');
    at(MB.CreateSphere('hair', { diameter: 0.66, slice: 0.5 }, scene), r, hair, 0, 2.66, -0.04);
    at(MB.CreateCylinder('fez', { height: 0.36, diameterTop: 0.34, diameterBottom: 0.4 }, scene), r, fez, 0, 2.92, 0);
    at(MB.CreateBox('tassel', { width: 0.06, height: 0.3, depth: 0.06 }, scene), r, M('alTas', '#caa030'), 0.18, 2.95, 0);
    attachWeapon(arm, [0, -0.7, 0.25], [1.3, 0, 0], weaponSpec('aladdin', weaponKey));
    return { node: r, arm };
  }

  // ---------------- VIOLCA (Fourth-Wing-style archer ally) ----------------
  function violca(weaponKey) {
    const r = new BABYLON.TransformNode('violca', scene);
    const leather = M('viL', '#2a3242'), leather2 = M('viL2', '#3a4658'), skin = M('viSkin', '#dcb89a'), hair = M('viHair', '#3a2418'),
          accent = M('viAcc', '#7a2a4a'), steel = M('viSteel', '#cfd8e4', { spec: 0.8 });
    at(MB.CreateCylinder('lL', { height: 1.3, diameter: 0.3 }, scene), r, leather, -0.2, 0.65, 0);
    at(MB.CreateCylinder('lR', { height: 1.3, diameter: 0.3 }, scene), r, leather, 0.2, 0.65, 0);
    at(MB.CreateBox('torso', { width: 0.84, height: 1.2, depth: 0.5 }, scene), r, leather2, 0, 1.65, 0);
    shoulders(r, leather2, 2.1, 0.42, 0.48);
    at(MB.CreateBox('strap', { width: 0.9, height: 0.9, depth: 0.52 }, scene), r, accent, 0, 1.7, 0).scaling.x = 0.28; // diagonal quiver strap
    at(MB.CreateBox('belt', { width: 0.9, height: 0.16, depth: 0.54 }, scene), r, M('viBelt', '#caa030', { emissive: '#3a2e08' }), 0, 1.2, 0);
    // shoulder cloak
    at(MB.CreateBox('cloak', { width: 1.0, height: 1.4, depth: 0.2 }, scene), r, accent, 0, 1.6, -0.32).rotation.x = 0.1;
    const aL = at(MB.CreateCylinder('aL', { height: 0.9, diameter: 0.22 }, scene), r, leather2, -0.55, 1.65, 0.05); aL.rotation.z = 0.3;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.56, 2.0, 0);
    at(MB.CreateCylinder('aR', { height: 0.9, diameter: 0.22 }, scene), arm, leather2, 0, -0.42, 0);
    at(MB.CreateSphere('head', { diameter: 0.58 }, scene), r, skin, 0, 2.5, 0);
    face(r, 2.55, 0.58, { brow: '#3a2418' });
    hand(aL, 0, -0.48, 0, '#dcb89a');
    // long braided hair
    at(MB.CreateSphere('hair', { diameter: 0.66, slice: 0.6 }, scene), r, hair, 0, 2.6, -0.04);
    at(MB.CreateCylinder('braid', { height: 1.3, diameterTop: 0.18, diameterBottom: 0.1 }, scene), r, hair, 0.18, 1.95, -0.28);
    // a quiver of arrows on the back
    at(MB.CreateCylinder('quiver', { height: 0.9, diameter: 0.28 }, scene), r, M('viQ', '#3a2418'), -0.32, 2.0, -0.34).rotation.z = -0.2;
    for (let i = 0; i < 4; i++) at(MB.CreateCylinder('arr', { height: 0.5, diameter: 0.04 }, scene), r, steel, -0.32 + i*0.06, 2.6, -0.34);
    attachWeapon(arm, [0, -0.6, 0.2], [0, 0, 0], weaponSpec('violca', weaponKey)); // bow, held forward
    return { node: r, arm };
  }

  // ---------------- SIMON (temporary vampire-hunter ally) ----------------
  function simon(weaponKey) {
    const r = new BABYLON.TransformNode('simon', scene);
    const tunic = M('smTunic', '#7a4a1f'), tunic2 = M('smTunic2', '#94632c'), armor = M('smArmor', '#b8bcc8', { spec: 0.7 }),
          skin = M('smSkin', '#cf9a78'), hair = M('smHair', '#5a3a18'), band = M('smBand', '#b03030'), leather = M('smLeather', '#3a2616');
    at(MB.CreateCylinder('lL', { height: 1.15, diameter: 0.32 }, scene), r, leather, -0.22, 0.57, 0);
    at(MB.CreateCylinder('lR', { height: 1.15, diameter: 0.32 }, scene), r, leather, 0.22, 0.57, 0);
    at(MB.CreateBox('torso', { width: 0.92, height: 1.2, depth: 0.55 }, scene), r, tunic, 0, 1.62, 0);
    shoulders(r, tunic, 2.08, 0.45, 0.5);
    at(MB.CreateBox('belt', { width: 0.96, height: 0.18, depth: 0.57 }, scene), r, M('smBelt', '#caa030', { emissive: '#3a2e08' }), 0, 1.25, 0);
    at(MB.CreateBox('pauldron', { width: 0.5, height: 0.3, depth: 0.6 }, scene), r, armor, -0.55, 2.08, 0);
    const aL = at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.28 }, scene), r, tunic2, -0.6, 1.6, 0); aL.rotation.z = 0.22;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.62, 2.02, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.28 }, scene), arm, tunic2, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.5, 0);
    face(r, 2.55, 0.6, { brow: '#5a3a18', angry: true });
    hand(aL, 0, -0.5, 0, '#cf9a78'); hand(arm, 0, -0.92, 0.05, '#cf9a78');
    at(MB.CreateSphere('hair', { diameter: 0.66, slice: 0.55 }, scene), r, hair, 0, 2.62, -0.04);
    at(MB.CreateBox('band', { width: 0.66, height: 0.14, depth: 0.62 }, scene), r, band, 0, 2.66, 0);
    attachWeapon(arm, [0, -0.7, 0.25], [1.2, 0, 0], weaponSpec('simon', weaponKey)); // the legendary whip
    return { node: r, arm };
  }

  // ---------------- pop-culture temp allies ----------------
  function mac(weaponKey) { // The Thing — parka'd survivor with a flamethrower
    const r = new BABYLON.TransformNode('mac', scene);
    const parka = M('mcP', '#9aa0a8'), parka2 = M('mcP2', '#7a828c'), skin = M('mcS', '#cf9a78'), beard = M('mcB', '#caa86a'), fur = M('mcF', '#d8d0c0'), steel = M('mcSt', '#5a6068', { spec: 0.6 });
    at(MB.CreateCylinder('lL', { height: 1.2, diameter: 0.36 }, scene), r, parka2, -0.24, 0.6, 0);
    at(MB.CreateCylinder('lR', { height: 1.2, diameter: 0.36 }, scene), r, parka2, 0.24, 0.6, 0);
    at(MB.CreateBox('torso', { width: 1.05, height: 1.3, depth: 0.7 }, scene), r, parka, 0, 1.75, 0);
    shoulders(r, parka, 2.24, 0.5, 0.56);
    at(MB.CreateBox('tank', { width: 0.7, height: 1.0, depth: 0.4 }, scene), r, M('mcTank', '#3a4a3a'), 0, 1.8, -0.5);
    at(MB.CreateCylinder('aL', { height: 0.95, diameter: 0.3 }, scene), r, parka, -0.62, 1.7, 0.1).rotation.z = 0.25;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.62, 2.05, 0);
    at(MB.CreateCylinder('aR', { height: 0.95, diameter: 0.3 }, scene), arm, parka, 0, -0.45, 0);
    at(MB.CreateSphere('head', { diameter: 0.6 }, scene), r, skin, 0, 2.55, 0);
    face(r, 2.62, 0.6, { brow: '#caa86a' });
    hand(r, -0.72, 1.2, 0.16, '#cf9a78');
    at(MB.CreateTorus('hood', { diameter: 0.84, thickness: 0.22, tessellation: 12 }, scene), r, fur, 0, 2.6, -0.04).rotation.x = Math.PI / 2;
    at(MB.CreateBox('beard', { width: 0.5, height: 0.4, depth: 0.3 }, scene), r, beard, 0, 2.32, 0.16);
    at(MB.CreateSphere('hat', { diameter: 0.66, slice: 0.5 }, scene), r, parka2, 0, 2.66, 0);
    // flamethrower in hand: barrel + nozzle + pilot flame
    const ft = new BABYLON.TransformNode('ft', scene); ft.parent = arm; ft.position.set(0.1, -0.7, 0.45); ft.rotation.x = 1.3;
    at(MB.CreateCylinder('barrel', { height: 1.3, diameter: 0.16 }, scene), ft, steel, 0, 0.4, 0);
    at(MB.CreateCylinder('noz', { height: 0.3, diameterTop: 0.22, diameterBottom: 0.12 }, scene), ft, steel, 0, 1.05, 0);
    const fl = at(MB.CreateSphere('flame', { diameter: 0.35 }, scene), ft, M('mcFlame', '#ff7b2a', { emissive: '#ff7b2a' }), 0, 1.3, 0);
    return { node: r, arm, idle(t) { fl.scaling.setAll(1 + Math.sin(t * 10) * 0.3); } };
  }
  function sane(weaponKey) { // Princess Mononoke — wolf-raised warrior + her wolf
    const r = new BABYLON.TransformNode('sane', scene);
    const fur = M('snF', '#e8e0d4'), skin = M('snS', '#dcb89a'), hair = M('snH', '#2a1810'), paint = M('snP', '#b0302a'), flint = M('snFl', '#bcb4a0', { spec: 0.4 }), wolfM = M('snW', '#9aa0a8');
    at(MB.CreateCylinder('lL', { height: 1.2, diameter: 0.28 }, scene), r, skin, -0.2, 0.6, 0);
    at(MB.CreateCylinder('lR', { height: 1.2, diameter: 0.28 }, scene), r, skin, 0.2, 0.6, 0);
    at(MB.CreateBox('tunic', { width: 0.8, height: 1.0, depth: 0.46 }, scene), r, fur, 0, 1.55, 0);
    shoulders(r, fur, 1.96, 0.4, 0.46);
    at(MB.CreateBox('mantle', { width: 1.1, height: 0.7, depth: 0.6 }, scene), r, fur, 0, 1.95, -0.04); // fur shoulder mantle
    at(MB.CreateCylinder('aL', { height: 0.85, diameter: 0.2 }, scene), r, skin, -0.5, 1.55, 0.05).rotation.z = 0.4;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.5, 1.95, 0);
    at(MB.CreateCylinder('aR', { height: 0.85, diameter: 0.2 }, scene), arm, skin, 0, -0.4, 0);
    at(MB.CreateSphere('head', { diameter: 0.54 }, scene), r, skin, 0, 2.35, 0);
    face(r, 2.38, 0.54, { pupil: '#3a1810' });
    [-1, 1].forEach(s => at(MB.CreateBox('paint', { width: 0.1, height: 0.16, depth: 0.06 }, scene), r, paint, s * 0.16, 2.3, 0.25)); // red war-paint cheek marks
    at(MB.CreateSphere('hairTop', { diameter: 0.6, slice: 0.55 }, scene), r, hair, 0, 2.46, -0.04);
    at(MB.CreateBox('hairBack', { width: 0.6, height: 1.5, depth: 0.18 }, scene), r, hair, 0, 1.85, -0.24);
    // stone dagger in hand
    const dg = new BABYLON.TransformNode('dg', scene); dg.parent = arm; dg.position.set(0, -0.6, 0.2); dg.rotation.x = 1.2;
    at(MB.CreateCylinder('blade', { height: 0.7, diameterTop: 0, diameterBottom: 0.18, tessellation: 4 }, scene), dg, flint, 0, 0.35, 0);
    // her wolf, at her side
    const w = new BABYLON.TransformNode('wolf', scene); w.parent = r; w.position.set(-1.4, 0, 0.3);
    at(MB.CreateSphere('wbody', { diameterX: 1.4, diameterY: 0.7, diameterZ: 0.7 }, scene), w, wolfM, 0, 0.7, 0);
    at(MB.CreateSphere('whead', { diameter: 0.6 }, scene), w, wolfM, 0.8, 0.9, 0);
    at(MB.CreateCylinder('wsnout', { height: 0.4, diameterTop: 0.1, diameterBottom: 0.25 }, scene), w, wolfM, 1.15, 0.85, 0).rotation.z = -Math.PI / 2;
    [-0.18, 0.18].forEach(z => at(MB.CreateCylinder('wear', { height: 0.3, diameterTop: 0, diameterBottom: 0.16 }, scene), w, wolfM, 0.75, 1.25, z));
    [[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]].forEach(p => at(MB.CreateCylinder('wleg', { height: 0.7, diameter: 0.16 }, scene), w, wolfM, p[0], 0.35, p[1]));
    return { node: r, arm, idle(t) { w.rotation.y = Math.sin(t * 0.9) * 0.1; } };
  }
  function marvyn(weaponKey) { // Hitchhiker's — the morose android
    const r = new BABYLON.TransformNode('marvyn', scene);
    const body = M('mvB', '#b8bcc4', { spec: 0.7, specPower: 60 }), joint = M('mvJ', '#5a6068'), eye = M('mvE', '#9fd0ff', { emissive: '#3a8ad0' });
    at(MB.CreateCylinder('lL', { height: 0.9, diameter: 0.3 }, scene), r, joint, -0.26, 0.45, 0);
    at(MB.CreateCylinder('lR', { height: 0.9, diameter: 0.3 }, scene), r, joint, 0.26, 0.45, 0);
    at(MB.CreateBox('torso', { width: 1.1, height: 1.2, depth: 0.8 }, scene), r, body, 0, 1.55, 0);
    at(MB.CreateBox('panel', { width: 0.6, height: 0.5, depth: 0.1 }, scene), r, M('mvPan', '#3a4048', { emissive: '#0a2a3a' }), 0, 1.6, 0.41);
    at(MB.CreateCylinder('aL', { height: 0.9, diameter: 0.22 }, scene), r, joint, -0.66, 1.5, 0).rotation.z = 0.2;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.66, 1.95, 0);
    at(MB.CreateCylinder('aR', { height: 0.9, diameter: 0.22 }, scene), arm, joint, 0, -0.42, 0);
    // big round drooping head
    const head = at(MB.CreateSphere('head', { diameter: 0.95 }, scene), r, body, 0, 2.5, 0.05);
    [-0.2, 0.2].forEach(x => at(MB.CreateSphere('e', { diameter: 0.2 }, scene), r, eye, x, 2.5, 0.4));
    at(MB.CreateBox('frown', { width: 0.4, height: 0.06, depth: 0.1 }, scene), r, joint, 0, 2.28, 0.42);
    at(MB.CreateCylinder('ant', { height: 0.3, diameter: 0.05 }, scene), r, joint, 0, 3.0, 0);
    // an ion emitter in hand
    const em = at(MB.CreateSphere('emit', { diameter: 0.34 }, scene), arm, eye, 0, -0.9, 0.2);
    return { node: r, arm, idle(t) { head.rotation.z = Math.sin(t * 0.7) * 0.06 - 0.08; em.scaling.setAll(1 + Math.sin(t * 3) * 0.15); } };
  }
  function quijano(weaponKey) { // Don Quixote — the gaunt, earnest knight-errant
    const r = new BABYLON.TransformNode('quijano', scene);
    const steel = M('qjSt', '#aab0b8', { spec: 0.7 }), cloth = M('qjC', '#7a5a3a'), skin = M('qjS', '#cf9a78'), beard = M('qjB', '#d8d0c0'), brass = M('qjBr', '#caa030');
    at(MB.CreateCylinder('lL', { height: 1.3, diameter: 0.24 }, scene), r, cloth, -0.2, 0.65, 0);
    at(MB.CreateCylinder('lR', { height: 1.3, diameter: 0.24 }, scene), r, cloth, 0.2, 0.65, 0);
    at(MB.CreateBox('breast', { width: 0.78, height: 1.0, depth: 0.5 }, scene), r, steel, 0, 1.7, 0); // dented breastplate
    shoulders(r, steel, 2.1, 0.4, 0.44);
    at(MB.CreateBox('pauldron', { width: 0.4, height: 0.3, depth: 0.55 }, scene), r, steel, -0.5, 2.05, 0);
    at(MB.CreateCylinder('aL', { height: 0.9, diameter: 0.18 }, scene), r, steel, -0.52, 1.65, 0.05).rotation.z = 0.4;
    const arm = new BABYLON.TransformNode('aRpiv', scene); arm.parent = r; arm.position.set(0.52, 2.0, 0);
    at(MB.CreateCylinder('aR', { height: 0.9, diameter: 0.18 }, scene), arm, steel, 0, -0.42, 0);
    at(MB.CreateSphere('head', { diameter: 0.5 }, scene), r, skin, 0, 2.4, 0);
    face(r, 2.46, 0.5, { brow: '#b8b0a0' });
    hand(r, -0.64, 1.2, 0.12, '#cf9a78');
    at(MB.CreateBox('beard', { width: 0.34, height: 0.5, depth: 0.26 }, scene), r, beard, 0, 2.1, 0.14); // long thin beard
    // the wash-basin helmet
    at(MB.CreateSphere('helm', { diameter: 0.62, slice: 0.5 }, scene), r, brass, 0, 2.52, 0);
    at(MB.CreateTorus('brim', { diameter: 0.66, thickness: 0.08, tessellation: 16 }, scene), r, brass, 0, 2.46, 0).rotation.x = Math.PI / 2;
    // bent lance
    const lp = new BABYLON.TransformNode('lance', scene); lp.parent = arm; lp.position.set(0, -0.7, 0.3); lp.rotation.x = 1.4;
    at(MB.CreateCylinder('shaft', { height: 3.0, diameter: 0.09 }, scene), lp, M('qjShaft', '#6b4423'), 0, 0.9, 0);
    at(MB.CreateCylinder('tip', { height: 0.5, diameterTop: 0, diameterBottom: 0.16 }, scene), lp, steel, 0, 2.5, 0);
    return { node: r, arm };
  }

  // ---------------- one-off island bosses ----------------
  function thething() { // an assimilating mass of wrong flesh
    const r = new BABYLON.TransformNode('eThing', scene);
    const flesh = M('ttF', '#9a4a5a', { spec: 0.3, emissive: '#2a0a12' }), flesh2 = M('ttF2', '#7a3a4a'), maw = M('ttM', '#2a0508'), teeth = M('ttT', '#e8e0d0'), eye = M('ttE', '#ffd24a', { emissive: '#ffd24a' });
    at(MB.CreateSphere('mass', { diameterX: 3.2, diameterY: 2.8, diameterZ: 3.0, segments: 14 }, scene), r, flesh, 0, 1.9, 0);
    // flailing fused limbs
    const limbs = [];
    for (let i = 0; i < 7; i++) { const a = i * 0.9; const piv = new BABYLON.TransformNode('lp' + i, scene); piv.parent = r; piv.position.set(Math.cos(a) * 1.3, 1.6 + Math.sin(i) * 0.8, Math.sin(a) * 1.3); const l = at(MB.CreateCylinder('limb', { height: 2.0 + (i % 3) * 0.6, diameterTop: 0.1, diameterBottom: 0.4 }, scene), piv, i % 2 ? flesh2 : flesh, 0, 0.8, 0); piv.rotation.z = Math.cos(a) * 0.8; piv.rotation.x = Math.sin(a) * 0.8; limbs.push({ piv, a }); }
    // screaming mouths
    [[-0.8, 2.4, 1.0], [0.9, 1.6, 1.1], [0.2, 2.8, 0.8]].forEach(p => { at(MB.CreateBox('mouth', { width: 0.7, height: 0.8, depth: 0.4 }, scene), r, maw, p[0], p[1], p[2]); for (let k = 0; k < 4; k++) at(MB.CreateCylinder('t', { height: 0.22, diameterTop: 0, diameterBottom: 0.08 }, scene), r, teeth, p[0] - 0.22 + k * 0.15, p[1] + 0.3, p[2] + 0.18).rotation.x = Math.PI; });
    // a half-formed human eye, staring
    at(MB.CreateSphere('eW', { diameter: 0.6 }, scene), r, M('ttW', '#e8e0d0'), -0.2, 2.2, 1.3); at(MB.CreateSphere('eB', { diameter: 0.3 }, scene), r, eye, -0.2, 2.2, 1.55);
    return { node: r, idle(t) { limbs.forEach((o, i) => { o.piv.rotation.x = Math.sin(o.a) * 0.8 + Math.sin(t * 2 + i) * 0.3; }); r.scaling.y = 1 + Math.sin(t * 2.5) * 0.05; } };
  }
  function forestgod() { // the Nightwalker — antlered deer-spirit, corrupted
    const r = new BABYLON.TransformNode('eForest', scene);
    const pale = M('fgP', '#dfe8d8', { emissive: '#1a2a1e' }), pale2 = M('fgP2', '#c0cab8'), ooze = M('fgO', '#1a0a18', { spec: 0.5 }), antler = M('fgA', '#e8e0c8'), eye = M('fgE', '#9fffd0', { emissive: '#3fffa0' });
    [-1, 1].forEach(s => { at(MB.CreateCylinder('legF', { height: 3.0, diameter: 0.18 }, scene), r, pale, s * 0.4, 1.5, 0.6); at(MB.CreateCylinder('legB', { height: 3.0, diameter: 0.18 }, scene), r, pale, s * 0.4, 1.5, -0.6); });
    at(MB.CreateSphere('body', { diameterX: 1.2, diameterY: 1.4, diameterZ: 2.4, segments: 12 }, scene), r, pale, 0, 3.2, 0);
    [[0.5, 3.4, 0.6], [-0.6, 2.9, -0.4]].forEach(p => at(MB.CreateSphere('ooze', { diameter: 0.7 }, scene), r, ooze, p[0], p[1], p[2])); // creeping corruption
    const neck = at(MB.CreateCylinder('neck', { height: 1.8, diameterTop: 0.4, diameterBottom: 0.7 }, scene), r, pale2, 0, 4.2, 1.0); neck.rotation.x = -0.5;
    at(MB.CreateSphere('head', { diameterX: 0.7, diameterY: 0.7, diameterZ: 1.3, segments: 10 }, scene), r, pale, 0, 5.0, 1.8);
    [-0.22, 0.22].forEach(x => at(MB.CreateSphere('e', { diameter: 0.18 }, scene), r, eye, x, 5.2, 2.2));
    [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) { const a = at(MB.CreateCylinder('ant', { height: 0.9, diameterTop: 0, diameterBottom: 0.12 }, scene), r, antler, s * 0.3, 5.5 + i * 0.3, 1.7 - i * 0.4); a.rotation.z = s * (0.6 + i * 0.2); } });
    return { node: r, idle(t) { r.position.y = (r._baseY || 0) + Math.sin(t * 0.9) * 0.12; r.rotation.z = Math.sin(t * 0.7) * 0.02; } };
  }
  function vogon() { // bloated bureaucratic alien with a clipboard
    const r = new BABYLON.TransformNode('eVogon', scene);
    const hide = M('vgH', '#5a6a4a', { spec: 0.2 }), hide2 = M('vgH2', '#46553a'), suit = M('vgS', '#3a3a2a'), eye = M('vgE', '#caa030', { emissive: '#3a2e08' }), paper = M('vgPa', '#e8e0d0');
    at(MB.CreateCylinder('lL', { height: 1.0, diameter: 0.5 }, scene), r, hide2, -0.34, 0.5, 0);
    at(MB.CreateCylinder('lR', { height: 1.0, diameter: 0.5 }, scene), r, hide2, 0.34, 0.5, 0);
    at(MB.CreateSphere('belly', { diameterX: 2.6, diameterY: 2.4, diameterZ: 2.2, segments: 14 }, scene), r, hide, 0, 2.0, 0);
    at(MB.CreateBox('sash', { width: 2.7, height: 0.5, depth: 2.3 }, scene), r, suit, 0, 1.6, 0);
    at(MB.CreateSphere('head', { diameterX: 1.2, diameterY: 0.9, diameterZ: 1.0 }, scene), r, hide, 0, 3.3, 0.2);
    at(MB.CreateBox('jowl', { width: 1.1, height: 0.5, depth: 0.6 }, scene), r, hide2, 0, 3.0, 0.5); // droopy jowls
    [-0.3, 0.3].forEach(x => at(MB.CreateSphere('e', { diameter: 0.2 }, scene), r, eye, x, 3.5, 0.7));
    at(MB.CreateBox('mouth', { width: 0.7, height: 0.16, depth: 0.2 }, scene), r, M('vgMo', '#2a0a0a'), 0, 3.0, 0.85);
    // stubby arms + a clipboard
    at(MB.CreateCylinder('aL', { height: 1.0, diameter: 0.3 }, scene), r, hide, -1.3, 2.0, 0.2).rotation.z = 0.7;
    at(MB.CreateCylinder('aR', { height: 1.0, diameter: 0.3 }, scene), r, hide, 1.3, 2.0, 0.2).rotation.z = -0.7;
    at(MB.CreateBox('clip', { width: 0.7, height: 0.9, depth: 0.08 }, scene), r, paper, 1.4, 1.7, 0.7).rotation.z = -0.3;
    return { node: r, idle(t) { r.rotation.z = Math.sin(t * 1.1) * 0.04; r.position.y = (r._baseY || 0) + Math.sin(t * 1.3) * 0.08; } };
  }
  function windmill() { // a windmill that is, Quijano insists, a giant
    const r = new BABYLON.TransformNode('eWindmill', scene);
    const stone = M('wmS', '#b0a488'), wood = M('wmW', '#6b4423'), roof = M('wmR', '#7a3a2a'), eye = M('wmE', '#ff5e3a', { emissive: '#ff5e3a' }), sail = M('wmSa', '#e8e0d0');
    at(MB.CreateCylinder('tower', { height: 6.5, diameterTop: 1.6, diameterBottom: 2.8, tessellation: 14 }, scene), r, stone, 0, 3.25, 0);
    at(MB.CreateCylinder('cap', { height: 1.4, diameterTop: 0, diameterBottom: 2.0, tessellation: 14 }, scene), r, roof, 0, 7.2, 0);
    // a "face" of windows + door (so it reads as the giant Quijano sees)
    [-0.5, 0.5].forEach(x => at(MB.CreateBox('eye', { width: 0.5, height: 0.5, depth: 0.2 }, scene), r, eye, x, 4.6, 1.4));
    at(MB.CreateBox('door', { width: 1.0, height: 1.8, depth: 0.2 }, scene), r, wood, 0, 0.9, 1.7); // gaping "mouth"
    // four great sail-arms on a hub
    const hub = new BABYLON.TransformNode('hub', scene); hub.parent = r; hub.position.set(0, 4.4, 1.7);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const spoke = at(MB.CreateBox('spoke', { width: 0.3, height: 4.6, depth: 0.2 }, scene), hub, wood, 0, 0, 0); spoke.rotation.z = a; const blade = at(MB.CreateBox('blade', { width: 1.2, height: 3.6, depth: 0.1 }, scene), hub, sail, Math.cos(a + 1.57) * 2.0, Math.sin(a + 1.57) * 2.0, 0.15); blade.rotation.z = a; }
    return { node: r, idle(t) { hub.rotation.z = t * 0.8; r.rotation.z = Math.sin(t * 0.6) * 0.015; } };
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

  return { use, M, at, weaponSpec, attachWeapon, cosmetic, pirate, swordsman, healer, mage, blader, dragoon, rival, simon, aladdin, violca, mac, sane, marvyn, quijano, mermaid, hero, npc, tree, palm, pine, deadTree, blossom, rock, house, sign, portal, roamer,
           crystal, chest, pillar,
           // dispatch by enemy id, falling back to its model (some enemies reuse another's builder), then a generic roamer
           enemy: (key) => (ENEMY_BUILDERS[key] || ENEMY_BUILDERS[((window.Data && Data.ENEMIES[key]) || {}).model] || roamer)('#b03050'),
           ENEMY_BUILDERS };
})();
