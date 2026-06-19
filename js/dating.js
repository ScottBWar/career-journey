// =====================================================================
//  Dating — woo the six elemental mermaids. Answer well to raise her
//  affection; once she's smitten she'll enchant a party member's weapon
//  with her element (so their basic attacks deal that element).
// =====================================================================
window.Dating = (function () {
  const el = id => document.getElementById(id);
  const V3 = BABYLON.Vector3;
  let key, m, st, onClose, mood = 'neutral', prevScene = null, dScene = null, dObs = null;

  // build a cutscene-style 3D backdrop: the mermaid floats LARGE behind the dialogue,
  // bobbing in moonlit water with drifting bubbles. Becomes the live Game.scene.
  function buildScene(mer) {
    const eng = Game.engine; prevScene = Game.scene;
    const scene = new BABYLON.Scene(eng); scene.clearColor = new BABYLON.Color4(0.03, 0.04, 0.08, 1);
    Models.use(scene);
    const elc = (Data.ELEMENT_INFO[mer.element] || {}).c || '#88aaff';
    new BABYLON.HemisphericLight('h', new V3(0.1, 1, 0.2), scene).intensity = 0.85;
    const key2 = new BABYLON.DirectionalLight('k', new V3(-0.4, -0.7, 0.5), scene); key2.intensity = 1.25; key2.diffuse = BABYLON.Color3.FromHexString('#fff0d8');
    const rim = new BABYLON.PointLight('rim', new V3(2.5, 4, -6), scene); rim.intensity = 0.8; rim.diffuse = BABYLON.Color3.FromHexString(elc);
    const built = Models.mermaid(mer.color, mer.tail, mer.skin); const node = built.node; node.scaling.setAll(2.3); node.position.set(0.3, 1.4, 0); node.rotation.y = -0.32;
    // a glowing element-tinted moon disc behind her
    const moon = BABYLON.MeshBuilder.CreateDisc('moon', { radius: 4.5, tessellation: 40 }, scene); const mm = new BABYLON.StandardMaterial('mm', scene); mm.emissiveColor = BABYLON.Color3.FromHexString(elc).scale(0.45); mm.diffuseColor = new BABYLON.Color3(0, 0, 0); mm.disableLighting = true; moon.material = mm; moon.position.set(2.5, 4.5, 13);
    // drifting bubbles
    const bub = []; for (let i = 0; i < 16; i++) { const b = BABYLON.MeshBuilder.CreateSphere('bub', { diameter: 0.08 + Math.random() * 0.26, segments: 8 }, scene); const bm = new BABYLON.StandardMaterial('bm', scene); bm.emissiveColor = new BABYLON.Color3(0.6, 0.82, 1); bm.diffuseColor = new BABYLON.Color3(0, 0, 0); bm.alpha = 0.28; bm.disableLighting = true; b.material = bm; b.position.set(Math.random() * 9 - 4.5, Math.random() * 7 - 1.5, Math.random() * 4 - 2); bub.push(b); }
    const cam = new BABYLON.UniversalCamera('dc', new V3(0.2, 5.4, 10.5), scene); cam.setTarget(new V3(0.3, 5.6, 0)); cam.fov = 0.82;
    if (window.Render) Render.setup(scene, cam, { skyTop: '#0a1430', skyHorizon: elc });
    let t = 0;
    dObs = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, eng.getDeltaTime() / 1000); t += dt;
      if (built.idle) built.idle(t);
      node.rotation.y = -0.32 + Math.sin(t * 0.4) * 0.18; node.position.y = 1.4 + Math.sin(t * 0.7) * 0.2;
      bub.forEach((b, i) => { b.position.y += (0.3 + i * 0.04) * dt; if (b.position.y > 5.5) b.position.y = -1.8; });
    });
    dScene = scene; Game.scene = scene;
  }

  function hearts(rel, max) { const filled = Math.round(rel / max * 5); let s = ''; for (let i = 0; i < 5; i++) s += i < filled ? '❤' : '🤍'; return s; }

  function start(mermaidKey, close) {
    key = mermaidKey; m = Data.MERMAIDS[key]; onClose = close;
    if (!Game.state.mermaids[key]) Game.state.mermaids[key] = { rel: 0, idx: 0, enchanted: false };
    st = Game.state.mermaids[key]; mood = st.rel >= m.threshold ? 'happy' : 'shy';
    el('date').className = 'overlay show scene-' + m.element; // themed particle ambiance over the 3D
    if (window.SFX) SFX.play('confirm');
    if (window.Music) Music.play('date');
    buildScene(m); render();
  }

  function frame(bodyHtml, options) {
    const elInfo = Data.ELEMENT_INFO[m.element];
    el('date').innerHTML = `<div class="box panel date-box">
      <div class="date-head">${Portraits.img(key, 'date-port', mood)}
        <div class="date-meta"><div class="date-name">${m.name} <span class="date-el" style="color:${elInfo.c}">${elInfo.i} ${elInfo.name}</span></div>
        <div class="date-hearts">${hearts(st.rel, m.threshold + 2)}</div></div></div>
      <div class="date-text">${bodyHtml}</div>
      <div class="date-opts" id="dateOpts"></div></div>`;
    const wrap = el('dateOpts');
    options.forEach(opt => { const b = document.createElement('button'); b.className = 'pill ghost date-opt'; b.innerHTML = opt.label; b.onclick = () => { if (window.SFX) SFX.play('select'); opt.fn(); }; wrap.appendChild(b); });
  }

  function render() {
    // already smitten → offer enchant
    if (st.rel >= m.threshold) {
      const opts = [
        { label: '💞 ' + (st.enchanted ? 'Re-enchant a weapon' : 'Ask her to enchant a weapon'), fn: chooseEnchantTarget },
        { label: '💬 Just chat', fn: () => chat() },
        { label: 'Leave', fn: close },
      ];
      frame(`<p>${m.smitten}</p>`, opts);
      return;
    }
    // otherwise a date question
    const d = m.dates[st.idx % m.dates.length];
    const opts = d.options.map(op => ({ label: op.t, fn: () => answer(op) }));
    frame(`<p class="date-intro">${st.idx === 0 ? m.intro + '<br><br>' : ''}${d.q}</p>`, opts);
  }

  function answer(op) {
    st.rel = Math.min(m.threshold + 2, st.rel + op.love); st.idx++;
    Progress.save(Game.state);
    mood = op.love >= 2 ? 'happy' : op.love >= 1 ? 'neutral' : 'upset';
    const justSmitten = st.rel >= m.threshold; if (justSmitten) mood = 'happy';
    frame(`<p><i>${op.r}</i></p>${justSmitten ? `<p>${m.smitten}</p>` : `<p class="date-hint">She likes ${m.likes}.</p>`}`,
      justSmitten ? [{ label: '💞 Enchant a weapon now', fn: chooseEnchantTarget }, { label: 'Leave', fn: close }]
                  : [{ label: 'Continue', fn: render }, { label: 'Leave', fn: close }]);
  }

  function chat() {
    const lines = ['"The sea is kinder when you visit, Captain."', '"Stay a while. The tide isn\'t going anywhere."', `"${m.likes.charAt(0).toUpperCase() + m.likes.slice(1)}... that\'s what won me over, you know."`];
    frame(`<p><i>${lines[Math.floor(Math.random() * lines.length)]}</i></p>`, [{ label: 'Back', fn: render }, { label: 'Leave', fn: close }]);
  }

  function chooseEnchantTarget() {
    const opts = Game.state.party.map(p => {
      const d = Progress.derived(p); const cur = Game.state.enchants[p.key];
      return { label: `${Portraits.img(p.key, 'mini')} ${d.name}${cur ? ` (${Data.ELEMENT_INFO[cur].i})` : ''}`, fn: () => enchant(p.key) };
    });
    opts.push({ label: 'Back', fn: render });
    frame(`<p>${m.enchant}</p>`, opts);
  }

  function enchant(charKey) {
    Game.state.enchants[charKey] = m.element; st.enchanted = true; Progress.save(Game.state);
    mood = 'happy'; if (window.SFX) SFX.play('levelup');
    const elInfo = Data.ELEMENT_INFO[m.element]; const name = Progress.def(charKey).name;
    frame(`<p><i>"${name}'s weapon now carries my ${elInfo.name.toLowerCase()}. ${elInfo.i} Strike true, my love."</i></p><p class="date-hint">${name}'s normal attacks now deal ${elInfo.name} damage.</p>`,
      [{ label: 'Enchant another', fn: chooseEnchantTarget }, { label: 'Leave', fn: close }]);
  }

  function close() {
    if (dScene && dObs) { try { dScene.onBeforeRenderObservable.remove(dObs); } catch (e) {} } dObs = null;
    el('date').className = 'overlay'; el('date').innerHTML = '';
    const scn = dScene; dScene = null;
    if (prevScene) Game.scene = prevScene;            // CRITICAL: resumeExplore only unpauses — restore the world scene here
    const cb = onClose; onClose = null; if (cb) cb(); // then unpause/resume the world
    if (scn && scn !== Game.scene) { try { scn.dispose(); } catch (e) {} } // dispose the (now-detached) date scene
  }

  return { start };
})();
