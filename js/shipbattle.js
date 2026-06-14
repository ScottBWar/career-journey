// =====================================================================
//  ShipBattle — turn-based cannon duel: your ship vs. a roaming enemy
//  ship (or the ghost ship). Fire / Brace / Repair / Flee.
// =====================================================================
window.ShipBattle = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const el = id => document.getElementById(id);
  let scene, cam, engine, my, foe, myShip, foeShip, onEndCb, over, t, braced;

  function M(name, hex, opt = {}) { const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene); m.diffuseColor = Color3.FromHexString(hex); const s = opt.spec ?? 0.2; m.specularColor = new Color3(s, s, s); if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive); if (opt.alpha != null) m.alpha = opt.alpha; return m; }

  function ship(hull, sail, flip, ghost) {
    const r = new BABYLON.TransformNode('s', scene);
    const a = ghost ? 0.55 : 1;
    const hullMat = M('hull', hull, { alpha: a }), sailMat = M('sail', sail, { alpha: a }), wood2 = M('w2', '#3a2a18', { alpha: a });
    const h = MB.CreateCylinder('hull', { height: 5, diameterTop: 2.4, diameterBottom: 1.2, tessellation: 10 }, scene); h.rotation.x = Math.PI/2; h.scaling.z = 0.6; h.material = hullMat; h.parent = r; h.position.y = 0.6;
    MB.CreateCylinder('mast', { height: 5, diameter: 0.2 }, scene).parent = r;
    const mast = r.getChildren().find(c => c.name === 'mast'); mast.material = wood2; mast.position.set(0, 3, 0);
    const s1 = MB.CreateBox('sail', { width: 0.12, height: 2.4, depth: 2.8 }, scene); s1.material = sailMat; s1.parent = r; s1.position.set(0, 3.4, 0);
    const s2 = MB.CreateBox('sail2', { width: 0.12, height: 1.6, depth: 2.0 }, scene); s2.material = sailMat; s2.parent = r; s2.position.set(0, 1.8, 0.1);
    if (flip) r.rotation.y = Math.PI;
    return r;
  }

  function build(type, onEnd) {
    engine = Game.engine; onEndCb = onEnd; over = false; t = 0; braced = false;
    scene = new BABYLON.Scene(engine); scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.5, 0.6, 0.7); scene.fogDensity = 0.01;
    Models.use(scene);
    cam = new BABYLON.ArcRotateCamera('c', -Math.PI/2 - 0.3, 1.15, 28, new V3(0, 2, 0), scene);
    new BABYLON.HemisphericLight('h', new V3(0.2, 1, 0.1), scene).intensity = 0.95;
    const sun = new BABYLON.DirectionalLight('s', new V3(-0.5, -1, 0.3), scene); sun.intensity = 1.0;

    const ocean = MB.CreateGround('o', { width: 200, height: 200, subdivisions: 30 }, scene); ocean.material = M('o', '#1e6f96', { spec: 0.6 }); ocean.position.y = -0.2;
    const base = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();

    const st = Progress.shipStats(Game.state);
    my = { name: 'Your Ship', maxhp: st.hp, hp: st.hp, atk: st.atk, def: st.def };
    const e = Data.ENEMY_SHIPS[type];
    foe = { name: e.name + (e.ghost ? ' 👻' : ''), maxhp: e.hp, hp: e.hp, atk: e.atk, def: e.def, ghost: e.ghost, reward: e };

    myShip = ship(Game.state.ship.hull, Game.state.ship.sail, false, false); myShip.position.set(-7, 0, 3); myShip.rotation.y = 0.5;
    foeShip = ship(e.hull, e.sail, true, e.ghost); foeShip.position.set(7, 0, -3); foeShip.rotation.y = Math.PI - 0.5;

    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      myShip.position.y = Math.sin(t * 1.5) * 0.18; myShip.rotation.z = Math.sin(t * 1.1) * 0.05;
      foeShip.position.y = Math.cos(t * 1.4) * 0.18; foeShip.rotation.z = Math.cos(t * 1.0) * 0.05;
      const pos = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      for (let i = 0; i < pos.length; i += 3) pos[i + 1] = Math.sin(base[i] * 0.15 + t) * 0.3 + Math.cos(base[i + 2] * 0.18 + t) * 0.3;
      ocean.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    });
    if (window.Render) Render.setup(scene, cam, { skyTop: '#20407a', skyHorizon: '#cfe2f0', sun });
    el('shipResult').classList.remove('show');
    refresh();
    return scene;
  }

  function refresh() {
    el('shipEName').textContent = foe.name; el('shipEHPn').textContent = `${Math.max(0, foe.hp)}/${foe.maxhp}`; el('shipEHP').style.width = clamp(foe.hp / foe.maxhp * 100, 0, 100) + '%';
    el('shipMHPn').textContent = `${Math.max(0, my.hp)}/${my.maxhp}`; el('shipMHP').style.width = clamp(my.hp / my.maxhp * 100, 0, 100) + '%';
  }
  function msg(s) { el('shipMsg').textContent = s; }
  function cannon(from, to, color, cb) {
    const ball = MB.CreateSphere('b', { diameter: 0.35 }, scene); ball.material = M('b', '#1c1c1c', { emissive: '#000' });
    ball.position.copyFrom(from); let acc = 0; const dur = 360;
    const obs = scene.onBeforeRenderObservable.add(() => { acc += engine.getDeltaTime(); const k = Math.min(1, acc / dur); ball.position = V3.Lerp(from, to, k); ball.position.y += Math.sin(k * Math.PI) * 2; if (k >= 1) { scene.onBeforeRenderObservable.remove(obs); ball.dispose(); splash(to, color); cb && cb(); } });
  }
  function splash(pos, color) { const ps = new BABYLON.ParticleSystem('p', 60, scene); const dt = new BABYLON.DynamicTexture('f', 32, scene, false); const c = dt.getContext(); const g = c.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,'#fff'); g.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0,0,32,32); dt.hasAlpha = true; dt.update(); ps.particleTexture = dt; ps.emitter = pos.clone(); ps.color1 = BABYLON.Color4.FromHexString(color + 'ff'); ps.color2 = BABYLON.Color4.FromHexString('#ffffffff'); ps.minSize = 0.3; ps.maxSize = 1; ps.minLifeTime = 0.2; ps.maxLifeTime = 0.5; ps.emitRate = 300; ps.minEmitPower = 3; ps.maxEmitPower = 7; ps.gravity = new V3(0, -9, 0); ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE; ps.targetStopDuration = 0.15; ps.disposeOnStop = true; ps.start(); }

  function menu() { const m = el('shipMenu'); m.innerHTML = '';
    const mk = (label, sub, fn) => { const b = document.createElement('button'); b.className = 'cmd'; b.innerHTML = `<span>${label}</span>${sub?`<span class="cost">${sub}</span>`:''}`; b.onclick = () => { if (window.SFX) SFX.play('select'); fn(); }; m.appendChild(b); };
    mk('💥  Fire Cannons', '', () => act(fire));
    mk('🛡️  Brace', 'halve next hit', () => act(brace));
    mk('🔧  Repair', '+' + Math.round(my.maxhp * 0.18) + ' HP', () => act(repair));
    mk('🏳️  Flee', '', () => act(flee));
  }
  function lock() { [...el('shipMenu').querySelectorAll('button')].forEach(b => b.disabled = true); }
  let snav = 0;
  function onKey(code) {
    if (el('shipResult').classList.contains('show')) { if (['Enter','Space','KeyE','KeyF'].includes(code)) el('shipResultBtn').click(); return; }
    const btns = [...el('shipMenu').querySelectorAll('button:not(:disabled)')]; if (!btns.length) return;
    if (snav >= btns.length) snav = 0;
    if (['ArrowDown','ArrowRight','KeyS','KeyD'].includes(code)) snav = (snav + 1) % btns.length;
    else if (['ArrowUp','ArrowLeft','KeyW','KeyA'].includes(code)) snav = (snav - 1 + btns.length) % btns.length;
    else if (['Enter','Space','KeyE','KeyF'].includes(code)) { btns[snav].click(); return; }
    btns.forEach((b, i) => b.classList.toggle('kbfocus', i === snav));
  }

  async function act(fn) { lock(); await fn(); refresh(); if (over) return; if (foe.hp <= 0) return finish(true); await wait(300); await enemyTurn(); refresh(); if (over) return; if (my.hp <= 0) return finish(false); menu(); }

  async function fire() {
    msg('Your gunners fire a broadside!');
    let dmg = Math.max(4, my.atk + rnd(0, 8) - foe.def); const crit = Math.random() < 0.15; if (crit) dmg = Math.round(dmg * 1.7);
    if (foe.ghost && Math.random() < 0.22) { msg('The cannonball passes through the ghostly hull!'); if (window.SFX) SFX.play('error'); await new Promise(r => cannon(myShip.position.add(new V3(1,2,0)), foeShip.position.add(new V3(0,2,0)), '#9aa6b4', r)); await wait(200); return; }
    await new Promise(r => cannon(myShip.position.add(new V3(1,2,0)), foeShip.position.add(new V3(0,2,0)), '#ffb347', r));
    foe.hp = Math.max(0, foe.hp - dmg); if (window.SFX) SFX.play(crit ? 'crit' : 'hit'); msg(`Direct hit for ${dmg}!${crit ? ' Raking shot!' : ''}`); await wait(250);
  }
  async function brace() { braced = true; my.hp = Math.min(my.maxhp, my.hp + Math.round(my.maxhp * 0.05)); msg('The crew braces and shores up the hull.'); if (window.SFX) SFX.play('confirm'); await wait(350); }
  async function repair() { const h = Math.round(my.maxhp * 0.18); my.hp = Math.min(my.maxhp, my.hp + h); msg(`Carpenters patch the hull. +${h} HP.`); if (window.SFX) SFX.play('heal'); await wait(400); }
  async function flee() { if (Math.random() < 0.6) { msg('You catch the wind and slip away!'); if (window.SFX) SFX.play('sail'); await wait(500); over = true; cleanup(); onEndCb({ won: false, fled: true }); } else { msg('You fail to escape!'); await wait(500); } }

  async function enemyTurn() {
    msg(`${foe.name} returns fire!`);
    let dmg = Math.max(3, foe.atk + rnd(0, 6) - my.def); if (braced) { dmg = Math.round(dmg * 0.5); braced = false; }
    await new Promise(r => cannon(foeShip.position.add(new V3(-1,2,0)), myShip.position.add(new V3(0,2,0)), '#ff5e3a', r));
    my.hp = Math.max(0, my.hp - dmg); if (window.SFX) SFX.play('hit'); msg(`${foe.name} hits you for ${dmg}!`); await wait(250);
  }

  async function finish(won) {
    over = true; lock();
    let body;
    if (won) { const e = foe.reward; Game.state.gold += e.gold; Game.state.pearls += e.pearls; body = `Enemy ship sunk! +${e.gold} gold, +${e.pearls} 🦪 pearls.`; if (e.shell) { Progress.addShell(Game.state, e.shell); body += `<br>Salvaged a ${Data.SHELLS[e.shell].name} seashell!`; } Progress.save(Game.state); if (window.SFX) SFX.play('levelup'); msg('Victory at sea!'); }
    else { body = 'Your ship is battered — you limp away to safety. (No reward.)'; if (window.SFX) SFX.play('ko'); msg('You retreat...'); }
    await wait(700);
    el('shipResultTitle').textContent = won ? 'Ship Sunk!' : 'Withdrawn';
    el('shipResultText').innerHTML = body; el('shipResult').classList.add('show');
    el('shipResultBtn').onclick = () => { el('shipResult').classList.remove('show'); cleanup(); onEndCb({ won }); };
  }
  function cleanup() { if (scene) { scene.dispose(); scene = null; } }
  function startLoop() { msg('A ship blocks your course! Battle stations!'); menu(); }

  return { build, startLoop, onKey };
})();
