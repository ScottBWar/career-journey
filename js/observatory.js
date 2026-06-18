// =====================================================================
//  Observatory — a star-chart of Saltmere's cosmology. Animated orbits on
//  a canvas; click a body to read its lore. Pure 2D, no WebGL needed.
// =====================================================================
window.Observatory = (function () {
  const el = id => document.getElementById(id);
  let onEndCb, raf, bodies = [], star, t = 0, sel = -1, cv, ctx, hover = -1;

  function start(onEnd) {
    onEndCb = onEnd; t = 0; sel = -1; hover = -1;
    const C = Data.COSMOS;
    const root = el('observatory'); root.classList.add('show');
    root.innerHTML = `<div class="panel obs-panel">
      <div class="scr-head"><h2>🔭 The Saltmere Observatory</h2><button class="pill ghost small" id="obsClose">Close</button></div>
      <p class="scr-sub">${C.intro}</p>
      <div class="obs-body">
        <canvas id="obsCanvas" width="520" height="520"></canvas>
        <div class="obs-lore" id="obsLore"><h3>Select a light…</h3><p>Click any planet or the sun to read its place in the lore.</p></div>
      </div></div>`;
    cv = el('obsCanvas'); ctx = cv.getContext('2d');
    star = C.star;
    bodies = C.bodies.map((b, i) => Object.assign({ ang: Math.random() * Math.PI * 2, idx: i }, b));
    cv.onclick = onClick; cv.onmousemove = onMove;
    el('obsClose').onclick = finish;
    if (window.SFX) SFX.play('confirm');
    loop();
  }

  function bodyAt(mx, my) {
    const cx = cv.width / 2, cy = cv.height / 2;
    if (Math.hypot(mx - cx, my - cy) <= star.size + 6) return 'star';
    for (const b of bodies) {
      const x = cx + Math.cos(b.ang) * b.r, y = cy + Math.sin(b.ang) * b.r;
      if (Math.hypot(mx - x, my - y) <= b.size + 6) return b.idx;
    }
    return -1;
  }
  function rel(e) { const r = cv.getBoundingClientRect(); return [ (e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height ]; }
  function onMove(e) { const [mx, my] = rel(e); hover = bodyAt(mx, my); cv.style.cursor = hover === -1 ? 'default' : 'pointer'; }
  function onClick(e) {
    const [mx, my] = rel(e); const hit = bodyAt(mx, my);
    if (hit === -1) return; if (window.SFX) SFX.play('select');
    if (hit === 'star') { sel = 'star'; showLore(star.name, star.lore, star.color); }
    else { sel = hit; const b = bodies[hit]; showLore(b.name, b.lore, b.color, b.element); }
  }
  function showLore(name, lore, color, element) {
    const ei = element && Data.ELEMENT_INFO[element];
    el('obsLore').innerHTML = `<h3 style="color:${color}">${name}</h3>${ei ? `<div class="obs-elem">${ei.i} aligned with the ${ei.name} mermaid</div>` : ''}<p>${lore}</p>`;
  }

  function loop() {
    t += 0.016;
    const cx = cv.width / 2, cy = cv.height / 2;
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, cv.width, cv.height);
    // starfield
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 90; i++) { const a = i * 12.9898, s = (Math.sin(a) * 43758.5453) % 1; const x = (Math.abs(Math.sin(a)) * cv.width) | 0, y = (Math.abs(Math.cos(a * 1.3)) * cv.height) | 0; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + i)); ctx.fillRect(x, y, 1.5, 1.5); }
    ctx.globalAlpha = 1;
    // orbits
    bodies.forEach(b => { ctx.strokeStyle = (sel === b.idx || hover === b.idx) ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.stroke(); });
    // star
    const sg = ctx.createRadialGradient(cx, cy, 2, cx, cy, star.size * 2.4);
    sg.addColorStop(0, '#fff7d6'); sg.addColorStop(0.4, star.color); sg.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, star.size * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = star.color; ctx.beginPath(); ctx.arc(cx, cy, star.size, 0, Math.PI * 2); ctx.fill();
    // planets
    bodies.forEach(b => {
      b.ang += b.speed * 0.0045;
      const x = cx + Math.cos(b.ang) * b.r, y = cy + Math.sin(b.ang) * b.r;
      const glow = (sel === b.idx || hover === b.idx);
      if (glow) { ctx.fillStyle = b.color; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y, b.size * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      const g = ctx.createRadialGradient(x - b.size * 0.3, y - b.size * 0.3, 1, x, y, b.size);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, b.color); g.addColorStop(1, shade(b.color));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, b.size, 0, Math.PI * 2); ctx.fill();
    });
    raf = requestAnimationFrame(loop);
  }
  function shade(hex) { const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) * 0.4 | 0, g = ((n >> 8) & 255) * 0.4 | 0, b = (n & 255) * 0.4 | 0; return `rgb(${r},${g},${b})`; }

  function finish() { cancelAnimationFrame(raf); el('observatory').classList.remove('show'); onEndCb && onEndCb(); }

  return { start };
})();
