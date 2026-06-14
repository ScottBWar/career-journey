// =====================================================================
//  Battle — self-contained turn battle. Builds its own Babylon scene,
//  reads party stats from Progress/Game.state, awards XP/gold, and
//  calls onEnd({ won, levelUps }) when finished.
// =====================================================================
window.Battle = (function () {
  const V3 = BABYLON.Vector3, Color3 = BABYLON.Color3, MB = BABYLON.MeshBuilder;
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const easeInOut = (k) => (k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const el = id => document.getElementById(id);

  let scene, camera, engine, canvas, flare, oceanBase, ocean;
  let party = [], enemies = [], actors = [], over, onEndCb, activeMember, t;

  const FX = { fire:['#ffb347','#ff5e3a'], water:['#5eead4','#3b82f6'], beam:['#a5b4fc','#e0e7ff'], heal:['#6ee7b7','#bbf7d0'], mana:['#60a5fa','#bfdbfe'], hit:['#ff6b6b','#ffd1d1'] };

  function M(name, hex, opt = {}) {
    const m = new BABYLON.StandardMaterial(name + Math.random().toFixed(4), scene);
    m.diffuseColor = Color3.FromHexString(hex);
    const s = opt.spec ?? 0.15; m.specularColor = new Color3(s, s, s);
    if (opt.emissive) m.emissiveColor = Color3.FromHexString(opt.emissive);
    if (opt.specPower) m.specularPower = opt.specPower;
    return m;
  }

  // ----- build the scene + combatants -----
  function build(enemyKeys, opts, onEnd) {
    engine = Game.engine; canvas = Game.canvas; onEndCb = onEnd; over = false; t = 0;
    party = []; enemies = []; activeMember = null;

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor = new Color3(0.6, 0.45, 0.45); scene.fogDensity = 0.009;
    Models.use(scene);

    camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2 - 0.52, 1.03, 25, new V3(0, 1.7, 0), scene);
    const hemi = new BABYLON.HemisphericLight('hemi', new V3(0.1, 1, 0.1), scene); hemi.intensity = 0.9; hemi.groundColor = new Color3(0.35, 0.3, 0.25);
    const sun = new BABYLON.DirectionalLight('sun', new V3(-0.5, -1, 0.3), scene); sun.intensity = 1.05; sun.diffuse = new Color3(1, 0.86, 0.72);

    flare = (() => { const dt = new BABYLON.DynamicTexture('flare', 64, scene, false); const c = dt.getContext();
      const g = c.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.4,'rgba(255,255,255,0.55)'); g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0,0,64,64); dt.hasAlpha = true; dt.update(); return dt; })();

    const sand = MB.CreateGround('sand', { width: 80, height: 50 }, scene); sand.material = M('sandMat', '#e7c890', { spec: 0.05 }); sand.position.z = 4;
    ocean = MB.CreateGround('ocean', { width: 200, height: 120, subdivisions: 36 }, scene);
    ocean.material = M('oceanMat', '#15486b', { spec: 0.9, specPower: 64, emissive: '#0a2740' }); ocean.position.set(0, -0.15, -28);
    oceanBase = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind).slice();

    // party (the active 3 of the roster)
    Progress.activeMembers(Game.state).forEach((ms, i) => {
      const d = Progress.derived(ms);
      const built = Models[d.model]();
      const home = new V3(-4.4, 0, 3.0 - i * 2.6);
      built.node.position.copyFrom(home); built.node.rotation.y = Math.PI/2.2;
      const hp = clamp(ms.hpCur == null ? d.maxhp : ms.hpCur, 0, d.maxhp);
      const mp = clamp(ms.mpCur == null ? d.maxmp : ms.mpCur, 0, d.maxmp);
      party.push({ side:'party', ref: ms, name: d.name, role: d.role, node: built.node, arm: built.arm, staffPiv: built.staffPiv,
        maxhp: d.maxhp, hp, maxmp: d.maxmp, mp, home, baseY: 0, phase: i*1.3, alive: hp > 0, _busy: false,
        idle: built.idle, fight: d.fight, abilities: d.abilities });
    });

    // enemies
    const boss = opts && opts.boss;
    const placed = enemyKeys.slice(0, boss ? 1 : 3);
    const seen = {};
    placed.forEach((key, i) => {
      const def = Data.ENEMIES[key];
      const built = Models.enemy(key);
      let x = boss ? 4.8 : 4.4, z = boss ? 0 : 3.0 - i * 2.6;
      const home = new V3(x, def.baseY, z);
      built.node.position.copyFrom(home); built.node._baseY = def.baseY; built.node.rotation.y = -Math.PI/2.2;
      if (boss) built.node.scaling.setAll(1.3);
      seen[key] = (seen[key] || 0) + 1;
      const suffix = placed.filter(k => k === key).length > 1 ? ' ' + 'ABC'[seen[key]-1] : '';
      enemies.push({ side:'enemy', name: def.name + suffix, node: built.node, baseY: def.baseY, maxhp: def.hp, hp: def.hp,
        home, phase: i*1.7 + 0.5, alive: true, _busy: false, idle: built.idle, moves: def.moves, xp: def.xp, gold: def.gold });
    });

    actors = party.concat(enemies);

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000; t += dt;
      camera.alpha = -Math.PI/2 - 0.52 + Math.sin(t*0.22)*0.04;
      for (const a of actors) { if (!a.alive || a._busy) continue; a.node.position.y = a.baseY + Math.sin(t*1.5 + a.phase)*0.05; if (a.idle) a.idle(t); }
      const pos = ocean.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      for (let i = 0; i < pos.length; i += 3) { const x = oceanBase[i], z = oceanBase[i+2]; pos[i+1] = Math.sin(x*0.25 + t*1.3)*0.35 + Math.cos(z*0.3 + t*1.0)*0.35; }
      ocean.updateVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
    });

    el('bResult').classList.remove('show');
    refresh();
    return scene;
  }

  // ----- FX -----
  function tween(apply, ms, ease = easeInOut) { return new Promise(res => { let acc = 0; const obs = scene.onBeforeRenderObservable.add(() => { acc += engine.getDeltaTime(); const k = Math.min(1, acc/ms); apply(ease(k)); if (k >= 1) { scene.onBeforeRenderObservable.remove(obs); res(); } }); }); }
  function moveTo(node, to, ms) { const from = node.position.clone(); return tween(k => { node.position = V3.Lerp(from, to, k); }, ms); }
  function rotTo(node, axis, from, to, ms) { return tween(k => { node.rotation[axis] = from + (to - from) * k; }, ms); }
  function hitFlash(node, hex, ms = 180) { const col = Color3.FromHexString(hex); const meshes = node.getChildMeshes().filter(m => m.material); const saved = meshes.map(m => m.material.emissiveColor.clone()); meshes.forEach(m => m.material.emissiveColor = col); setTimeout(() => meshes.forEach((m, i) => m.material.emissiveColor = saved[i]), ms); }
  function burst(pos, hexA, hexB, count = 70, power = 7, gravity = -8) {
    const ps = new BABYLON.ParticleSystem('burst', count, scene); ps.particleTexture = flare; ps.emitter = pos.clone();
    ps.minEmitBox = new V3(-0.2,-0.2,-0.2); ps.maxEmitBox = new V3(0.2,0.2,0.2);
    ps.color1 = BABYLON.Color4.FromHexString(hexA + 'ff'); ps.color2 = BABYLON.Color4.FromHexString(hexB + 'ff'); ps.colorDead = new BABYLON.Color4(0,0,0,0);
    ps.minSize = 0.25; ps.maxSize = 0.9; ps.minLifeTime = 0.3; ps.maxLifeTime = 0.7; ps.emitRate = count*8;
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE; ps.gravity = new V3(0, gravity, 0);
    ps.direction1 = new V3(-1,1,-1); ps.direction2 = new V3(1,1.5,1); ps.minEmitPower = power*0.5; ps.maxEmitPower = power;
    ps.minAngularSpeed = 0; ps.maxAngularSpeed = Math.PI; ps.targetStopDuration = 0.18; ps.disposeOnStop = true; ps.start();
  }
  const worldOf = (node, dy = 2.4) => node.getAbsolutePosition().add(new V3(0, dy, 0));
  function floatDamage(node, text, color, dy = 2.4) {
    const rw = engine.getRenderWidth(), rh = engine.getRenderHeight();
    const p = BABYLON.Vector3.Project(worldOf(node, dy), BABYLON.Matrix.Identity(), scene.getTransformMatrix(), new BABYLON.Viewport(0,0,rw,rh));
    const d = document.createElement('div'); d.className = 'float'; d.textContent = text; d.style.color = color;
    d.style.left = (p.x * (canvas.clientWidth/rw)) + 'px'; d.style.top = (p.y * (canvas.clientHeight/rh)) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
  }

  // ----- UI -----
  function msg(text) { el('bMessage').textContent = text; }
  function renderEnemies(targetMode, onPick) {
    const wrap = el('bEnemies'); wrap.innerHTML = '';
    enemies.forEach(e => { const d = document.createElement('div'); d.className = 'eplate' + (e.alive ? '' : ' dead');
      d.innerHTML = `<div class="row"><span class="name">${e.name}</span><span class="hpnum">${Math.max(0,e.hp)}/${e.maxhp}</span></div><div class="bar hp"><i style="width:${clamp(e.hp/e.maxhp*100,0,100)}%"></i></div>`;
      if (targetMode && e.alive) { d.classList.add('targetable'); d.onclick = () => onPick(e); } wrap.appendChild(d); });
  }
  function renderParty(targetMode, candidates, onPick) {
    const wrap = el('bParty'); wrap.innerHTML = '';
    party.forEach(p => { const d = document.createElement('div'); d.className = 'pmember' + (p === activeMember ? ' active' : '') + (p.alive ? '' : ' dead');
      d.innerHTML = `<div class="row"><span class="name">${p.name}</span><span class="role">${p.role}</span></div>
        <div class="twobar"><div class="bar php"><i style="width:${clamp(p.hp/p.maxhp*100,0,100)}%"></i></div><span class="nums">HP ${Math.max(0,p.hp)}/${p.maxhp}</span></div>
        <div class="twobar"><div class="bar mp"><i style="width:${clamp(p.mp/p.maxmp*100,0,100)}%"></i></div><span class="nums">MP ${p.mp}/${p.maxmp}</span></div>`;
      if (targetMode && candidates.includes(p)) { d.classList.add('targetable'); d.onclick = () => onPick(p); } wrap.appendChild(d); });
  }
  function refresh() { renderEnemies(false); renderParty(false); }
  const menuEl = () => el('bMenu');
  function clearMenu(title) { const m = menuEl(); m.innerHTML = ''; if (title) { const h = document.createElement('div'); h.className = 'title'; h.textContent = title; m.appendChild(h); } }
  function cmd(label, sub, onClick, disabled, subClass = '') { const b = document.createElement('button'); b.className = 'cmd'; b.innerHTML = `<span>${label}</span>` + (sub ? `<span class="cost ${subClass}">${sub}</span>` : ''); b.disabled = !!disabled; b.onclick = (e) => { if (window.SFX) SFX.play('select'); onClick(e); }; menuEl().appendChild(b); return b; }
  function backBtn(fn) { cmd('↩  Back', '', fn).classList.add('back'); }
  function lockMenu() { [...menuEl().querySelectorAll('button')].forEach(b => b.disabled = true); }

  const aliveEnemies = () => enemies.filter(e => e.alive);
  const aliveParty = () => party.filter(p => p.alive);
  const deadParty = () => party.filter(p => !p.alive);

  // ----- attacks / abilities -----
  async function dashAttack(attacker, target, onHit) { attacker._busy = true; const home = attacker.home.clone(); const dest = home.add(target.home.subtract(home).scale(0.62)); dest.y = attacker.baseY; await moveTo(attacker.node, dest, 260); await onHit(); await moveTo(attacker.node, home, 320); attacker.node.position.copyFrom(home); attacker._busy = false; }
  async function swing(arm) { await rotTo(arm, 'x', 0, -2.3, 110); await rotTo(arm, 'x', -2.3, 0.6, 100); await rotTo(arm, 'x', 0.6, 0, 130); }

  function damageEnemy(e, dmg, color = '#ffffff') {
    if (window.SFX) SFX.play('hit');
    e.hp = Math.max(0, e.hp - dmg); hitFlash(e.node, '#ff6060'); burst(worldOf(e.node, 0.6), ...FX.hit, 55, 6); floatDamage(e.node, String(dmg), color, 2.6);
    e._busy = true; const h = e.home.clone(); moveTo(e.node, h.add(new V3(0.5,0,0)), 90).then(() => moveTo(e.node, h, 150).then(() => { e.node.position.copyFrom(h); e._busy = false; }));
    if (e.hp <= 0) killEnemy(e); renderEnemies(false);
  }
  async function killEnemy(e) { e.alive = false; e._busy = true; await tween(k => { e.node.position.y = e.baseY - k*3; e.node.rotation.z = k*1.5; e.node.scaling.setAll((e.node.scaling.x||1) * (1 - k*0.02) || 1); }, 800); e.node.setEnabled(false); }
  function healMember(p, amt) { if (window.SFX) SFX.play('heal'); p.hp = Math.min(p.maxhp, p.hp + amt); burst(worldOf(p.node, 0.2), ...FX.heal, 45, 5, -2); floatDamage(p.node, '+' + amt, '#6ee7b7', 2.6); renderParty(false); }

  function takeTurn(member) { return new Promise(done => { activeMember = member; renderParty(false); renderEnemies(false); msg(`${member.name}'s turn — choose an action.`); showMain(member, done); }); }

  function showMain(m, done) { clearMenu(m.name);
    cmd('⚔️  Fight', '', () => chooseEnemy('Attack which foe?', e => act(done, () => doFight(m, e)), () => showMain(m, done)));
    cmd('✨  Magic', '', () => showMagic(m, done));
    cmd('🎒  Item', '', () => showItems(m, done));
    cmd('🛡️  Defend', '', () => act(done, () => doDefend(m)));
  }
  function showMagic(m, done) { clearMenu(m.name + ' · Magic');
    m.abilities.forEach(s => { const label = s.name + (s.target === 'all' || s.target === 'allparty' ? '  (all)' : '');
      cmd(label, s.mp + ' MP', () => {
        if (s.target === 'enemy') chooseEnemy('Cast ' + s.name + ' on?', e => act(done, () => doSpell(m, s, [e])), () => showMagic(m, done));
        else if (s.target === 'ally') chooseAlly('Cast ' + s.name + ' on?', aliveParty(), p => act(done, () => doSpell(m, s, [p])), () => showMagic(m, done));
        else if (s.target === 'all') act(done, () => doSpell(m, s, aliveEnemies()));
        else if (s.target === 'allparty') act(done, () => doSpell(m, s, aliveParty()));
      }, m.mp < s.mp); });
    backBtn(() => showMain(m, done));
  }
  function showItems(m, done) { clearMenu(m.name + ' · Items'); const inv = Game.state.inv;
    for (const key of Object.keys(Data.ITEM_DEFS)) { const it = Data.ITEM_DEFS[key]; const qty = inv[key] || 0; let disabled = qty <= 0; if (it.target === 'dead' && deadParty().length === 0) disabled = true;
      cmd(it.name, '×' + qty, () => {
        if (it.target === 'enemy') chooseEnemy('Throw ' + it.name + ' at?', e => act(done, () => doItem(m, key, it, [e])), () => showItems(m, done));
        else if (it.target === 'ally') chooseAlly('Use ' + it.name + ' on?', aliveParty(), p => act(done, () => doItem(m, key, it, [p])), () => showItems(m, done));
        else if (it.target === 'dead') chooseAlly('Revive whom?', deadParty(), p => act(done, () => doItem(m, key, it, [p])), () => showItems(m, done));
      }, disabled, 'qty'); }
    backBtn(() => showMain(m, done));
  }
  function chooseEnemy(prompt, onPick, onBack) { clearMenu(prompt); msg(prompt); renderEnemies(true, e => { renderEnemies(false); onPick(e); }); backBtn(() => { renderEnemies(false); onBack(); }); }
  function chooseAlly(prompt, candidates, onPick, onBack) { clearMenu(prompt); msg(prompt); renderParty(true, candidates, p => { renderParty(false); onPick(p); }); backBtn(() => { renderParty(false); onBack(); }); }
  async function act(done, fn) { lockMenu(); await fn(); refresh(); activeMember = null; renderParty(false); done(); }

  async function doFight(m, target) { msg(`${m.name} strikes ${target.name}!`); await dashAttack(m, target, async () => { if (m.arm) await swing(m.arm); let dmg = rnd(m.fight.min, m.fight.max); const crit = Math.random() < m.fight.crit; if (crit) dmg = Math.round(dmg*1.8); if (m.fight.big) burst(worldOf(target.node, 0.4), ...FX.beam, 50, 7); if (crit && window.SFX) SFX.play('crit'); damageEnemy(target, dmg, crit ? '#fcd34d' : '#ffffff'); if (crit) msg('Critical hit! ' + dmg + ' damage!'); }); }
  async function doDefend(m) { msg(`${m.name} braces for impact.`); m._defend = true; await wait(300); }
  async function doSpell(m, s, targets) {
    if (window.SFX) SFX.play(s.fx === 'fire' ? 'fire' : s.fx === 'water' ? 'water' : s.heal ? 'heal' : 'magic');
    m.mp = Math.max(0, m.mp - s.mp); renderParty(false);
    if (s.heal) { msg(`${m.name} casts ${s.name}!`); if (m.staffPiv) await rotTo(m.staffPiv, 'z', 0, -0.5, 150).then(() => rotTo(m.staffPiv, 'z', -0.5, 0, 200)); for (const p of targets) healMember(p, rnd(s.min, s.max)); await wait(600); return; }
    if (s.proj || s.fx === 'beam') { msg(`${m.name} unleashes ${s.name}!`); if (m.arm && s.fx === 'beam') swing(m.arm);
      for (const e of targets) { const ball = MB.CreateSphere('p', { diameter: s.fx === 'beam' ? 0.6 : 0.4 }, scene); ball.material = M('pMat', s.fx === 'beam' ? '#c7d2fe' : '#1c1c1c', { emissive: s.fx === 'beam' ? '#6366f1' : '#000' }); ball.position = worldOf(m.node, -0.2); await moveTo(ball, worldOf(e.node, -0.2), 300); ball.dispose(); burst(worldOf(e.node, 0.2), ...FX[s.fx], 80, 9); damageEnemy(e, rnd(s.min, s.max), s.fx === 'beam' ? '#a5b4fc' : '#ffd1d1'); } await wait(380); return; }
    msg(`${m.name} unleashes ${s.name}!`); for (const e of targets) { burst(worldOf(e.node, 0.4), ...FX[s.fx], 70, 8); hitFlash(e.node, FX[s.fx][0]); damageEnemy(e, rnd(s.min, s.max), s.fx === 'water' ? '#5eead4' : '#a5b4fc'); await wait(110); } await wait(360);
  }
  async function doItem(m, key, it, targets) {
    Game.state.inv[key] = Math.max(0, (Game.state.inv[key] || 0) - 1);
    if (it.kind === 'heal') { msg(`${m.name} uses ${it.name}.`); healMember(targets[0], it.amount); await wait(550); }
    else if (it.kind === 'mana') { const p = targets[0]; p.mp = Math.min(p.maxmp, p.mp + it.amount); msg(`${m.name} uses ${it.name}. +${it.amount} MP!`); burst(worldOf(p.node, 0.2), ...FX.mana, 45, 5, -2); floatDamage(p.node, '+' + it.amount + ' MP', '#93c5fd', 2.6); renderParty(false); await wait(550); }
    else if (it.kind === 'revive') { const p = targets[0]; p.alive = true; p.node.setEnabled(true); p.node.position.copyFrom(p.home); p.node.rotation.x = 0; p.hp = Math.round(p.maxhp*0.5); msg(`${p.name} is revived!`); burst(worldOf(p.node, 0.5), '#fff6c2', '#fde68a', 80, 6, -1); floatDamage(p.node, '+' + p.hp, '#fde68a', 2.6); renderParty(false); await wait(650); }
    else { msg(`${m.name} hurls a ${it.name}!`); const ball = MB.CreateSphere('b', { diameter: 0.4 }, scene); ball.material = M('bMat', '#222', { emissive: '#1a0a00' }); ball.position = worldOf(m.node, -0.2); await moveTo(ball, worldOf(targets[0].node, -0.2), 340); ball.dispose(); burst(worldOf(targets[0].node, 0.2), ...FX.fire, 100, 11); damageEnemy(targets[0], rnd(it.min, it.max), '#fca5a5'); await wait(450); }
  }

  // ----- enemy AI -----
  async function enemyAct(e) {
    if (!e.alive || over) return; const targetsAlive = aliveParty(); if (!targetsAlive.length) return;
    const move = e.moves[rnd(0, e.moves.length - 1)]; const home = e.home.clone(); e._busy = true;
    if (move.all) { msg(`${e.name} ${move.name}!`); await moveTo(e.node, home.add(new V3(-1.2,0.4,0)), 220); for (const p of targetsAlive) { let dmg = rnd(move.min, move.max); if (p._defend) dmg = Math.round(dmg*0.5); applyToMember(p, dmg); } await wait(200); await moveTo(e.node, home, 320); }
    else { const target = targetsAlive[rnd(0, targetsAlive.length - 1)]; msg(`${e.name} ${move.name} at ${target.name}!`); const dest = home.add(target.home.subtract(home).scale(0.6)); dest.y = e.baseY; await moveTo(e.node, dest, 240); let dmg = rnd(move.min, move.max); if (target._defend) dmg = Math.round(dmg*0.5); applyToMember(target, dmg); await wait(160); await moveTo(e.node, home, 340); }
    e.node.position.copyFrom(home); e._busy = false; await wait(200);
  }
  function applyToMember(p, dmg) { p.hp = Math.max(0, p.hp - dmg); hitFlash(p.node, '#ff5050'); burst(worldOf(p.node, 0.0), ...FX.hit, 50, 6); floatDamage(p.node, String(dmg), '#ff8a8a', 2.4); if (p.hp <= 0 && p.alive) koMember(p); renderParty(false); }
  async function koMember(p) { if (window.SFX) SFX.play('ko'); p.alive = false; tween(k => { p.node.rotation.x = k*1.4; p.node.position.y = p.baseY - k*0.4; }, 500); }

  // ----- loop / end -----
  function checkEnd() { if (aliveEnemies().length === 0 && !over) { finish(true); return true; } if (aliveParty().length === 0 && !over) { finish(false); return true; } return false; }
  async function loop() {
    while (!over) {
      for (const m of party) { if (over) break; if (!m.alive) continue; m._defend = false; await takeTurn(m); if (checkEnd()) return; await wait(220); }
      if (over) break;
      for (const e of enemies) { if (over) break; if (!e.alive) continue; await enemyAct(e); if (checkEnd()) return; }
    }
  }

  async function finish(won) {
    over = true; lockMenu(); activeMember = null; renderParty(false);
    // write HP/MP back to persistent state
    party.forEach(p => { p.ref.hpCur = Math.max(0, p.hp); p.ref.mpCur = Math.max(0, p.mp); });
    let levelUps = [], xp = 0, gold = 0;
    if (won) { enemies.forEach(e => { xp += e.xp; gold += e.gold; }); levelUps = Progress.reward(Game.state, xp, gold); Music.play('victory', Game.musicForReturn()); }
    else { Music.play('island'); }
    await wait(700);
    el('bResultTitle').textContent = won ? 'Victory!' : 'Defeated';
    let body = won ? `Gained <b>${xp} XP</b> and <b>${gold} gold</b>.` : 'Your party was overwhelmed by the tide.';
    if (won && levelUps.length) body += '<br>' + levelUps.map(u => `⭐ ${u.name} reached Lv ${u.level}!`).join('<br>');
    if (won && levelUps.shellUps && levelUps.shellUps.length) body += '<br>' + levelUps.shellUps.map(u => `🐚 ${u.name} shell → Lv ${u.level}!`).join('<br>');
    if (!won) body += '<br>You are carried back to safety, healed but humbled.';
    el('bResultText').innerHTML = body;
    el('bResult').classList.add('show');
    el('bResultBtn').onclick = () => { el('bResult').classList.remove('show'); cleanup(); onEndCb({ won, xp, gold, levelUps }); };
  }

  function cleanup() { if (scene) { scene.dispose(); scene = null; } }

  function startLoop() { msg('The battle begins!'); refresh(); loop(); }

  return { build, startLoop, getScene: () => scene };
})();
