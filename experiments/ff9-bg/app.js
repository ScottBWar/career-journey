/* FF9-style field-map POC — a pre-rendered backdrop + a pirate constrained to a
   walkmesh, drawn behind foreground occluders, with exit markers.
   Pure Canvas 2D, no dependencies, runs from file://. Coords are normalized
   [0..1] (origin top-left) and scaled to the backdrop's pixel size at load. */
(function () {
  'use strict';

  // ---- field-spec for assets/beach-town.png (eyeballed first draft; tweak with G) ----
  const SPEC = {
    spawn: [0.60, 0.62],
    // walkable area = union of these polygons (overlap at the joins so you can cross)
    walk: [
      // plaza (cobblestone, center)
      [[0.34, 0.50], [0.60, 0.43], [0.80, 0.47], [0.85, 0.60], [0.66, 0.66], [0.44, 0.65], [0.36, 0.58]],
      // beach (sand, lower center-right)
      [[0.44, 0.63], [0.66, 0.65], [0.83, 0.66], [0.81, 0.82], [0.58, 0.87], [0.46, 0.79]],
      // main dock (wooden planks over the water, left)
      [[0.09, 0.50], [0.35, 0.52], [0.37, 0.62], [0.12, 0.67]]
    ],
    // pure foreground objects — always re-stamped on top of the pirate (FF9 occlusion)
    occluders: [
      [[0.40, 0.87], [0.75, 0.83], [0.92, 0.92], [0.92, 1.0], [0.40, 1.0]], // big bottom rooftop
      [[0.0, 0.78], [0.18, 0.80], [0.20, 1.0], [0.0, 1.0]]                    // bottom-left dock piling
    ],
    markers: [
      { p: [0.13, 0.34], label: 'Lighthouse path', act: 'The lighthouse keeper waves you off — "Storm\'s comin\', sailor."' },
      { p: [0.90, 0.40], label: 'Town gate', act: 'Beyond the archway, the road winds inland.' },
      { p: [0.55, 0.41], label: 'Enter tavern', act: 'You duck into The Salty Pearl. Warm light, worse company.' },
      { p: [0.20, 0.57], label: 'Set sail', act: 'You board your sloop. (This is where toSea() would fire.)' }
    ]
  };

  // ---- setup ----
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const bg = new Image();
  let W = 0, H = 0, ready = false;
  let debug = false;

  bg.onload = function () {
    W = bg.naturalWidth; H = bg.naturalHeight;
    cv.width = W; cv.height = H;
    px(SPEC); // bake normalized -> pixel coords
    pirate.x = SPEC.spawn[0]; pirate.y = SPEC.spawn[1];
    ready = true;
    requestAnimationFrame(loop);
  };
  bg.onerror = function () {
    document.getElementById('err').style.display = 'block';
  };
  bg.src = 'assets/beach-town.png';

  // convert normalized spec to pixel space in place
  function px(s) {
    const P = ([x, y]) => [x * W, y * H];
    s.spawnPx = P(s.spawn);
    s.walkPx = s.walk.map(poly => poly.map(P));
    s.occPx = s.occluders.map(poly => poly.map(P));
    s.markPx = s.markers.map(m => ({ x: m.p[0] * W, y: m.p[1] * H, label: m.label, act: m.act }));
  }

  // ---- pirate (feet anchor; normalized position, drawn in pixels) ----
  const pirate = { x: 0.6, y: 0.6, face: 1, phase: 0, moving: false };
  const SPEED = 0.17;       // image-widths per second
  const MARK_R = 0.06;      // proximity radius (image-widths)

  // ---- input ----
  const keys = {};
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'g') debug = !debug;
    if (k === 'f') interact();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function interact() {
    const m = nearestMarker();
    if (m) toast(m.act);
  }

  // ---- geometry ----
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function walkable(nx, ny) {            // nx, ny normalized
    const fx = nx * W, fy = ny * H;
    return SPEC.walkPx.some(poly => inPoly(fx, fy, poly));
  }
  function nearestMarker() {
    let best = null, bd = MARK_R * W;
    SPEC.markPx.forEach(m => {
      const d = Math.hypot(m.x - pirate.x * W, m.y - pirate.y * H);
      if (d < bd) { bd = d; best = m; }
    });
    return best;
  }

  // ---- loop ----
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    pirate.moving = (dx || dy) !== 0;
    if (pirate.moving) {
      const len = Math.hypot(dx, dy) || 1;
      const step = SPEED * dt;
      const nx = pirate.x + (dx / len) * step;
      const ny = pirate.y + (dy / len) * step * (W / H); // keep speed isotropic in px
      // try full move, then slide along each axis
      if (walkable(nx, ny)) { pirate.x = nx; pirate.y = ny; }
      else if (walkable(nx, pirate.y)) pirate.x = nx;
      else if (walkable(pirate.x, ny)) pirate.y = ny;
      if (dx) pirate.face = dx > 0 ? 1 : -1;
      pirate.phase += dt * 10;
    }
  }

  // ---- draw ----
  function draw() {
    if (!ready) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);                 // 1. backdrop
    drawPirate();                                   // 2. character
    SPEC.occPx.forEach(reStamp);                    // 3. foreground occluders over character
    drawMarkers();                                  // 4. exit markers (UI glints, on top)
    if (debug) drawDebug();
    drawPrompt();
  }

  // re-stamp foreground pixels from the backdrop, clipped to the occluder polygon
  function reStamp(poly) {
    ctx.save();
    ctx.beginPath();
    poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.clip();
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.restore();
  }

  function drawPirate() {
    const fx = pirate.x * W, fy = pirate.y * H;
    const h = 0.135 * H;                            // pirate height in px
    const bob = pirate.moving ? Math.sin(pirate.phase) * h * 0.02 : 0;
    // shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(fx, fy, h * 0.20, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    // body local space: origin at feet, y up
    ctx.translate(fx, fy - bob); ctx.scale(pirate.face, 1);
    const s = h / 100, swing = pirate.moving ? Math.sin(pirate.phase) * 10 : 0;
    // legs
    ctx.fillStyle = '#2a2a38';
    leg(-7 * s, swing * s); leg(7 * s, -swing * s);
    // boots
    ctx.fillStyle = '#3a2414';
    boot(-7 * s, swing * s); boot(7 * s, -swing * s);
    // coat
    ctx.fillStyle = '#7a1f2b';
    rrect(-15 * s, -58 * s, 30 * s, 38 * s, 5 * s);
    // belt + buckle
    ctx.fillStyle = '#1c1c24'; ctx.fillRect(-15 * s, -32 * s, 30 * s, 6 * s);
    ctx.fillStyle = '#e8c45a'; ctx.fillRect(-3 * s, -33 * s, 6 * s, 8 * s);
    // arms
    ctx.fillStyle = '#6a1923';
    rrect(-20 * s, -56 * s, 8 * s, 26 * s, 4 * s);
    rrect(12 * s, -56 * s, 8 * s, 26 * s, 4 * s);
    // hands
    ctx.fillStyle = '#d9a06b';
    ctx.beginPath(); ctx.arc(-16 * s, -30 * s, 4.5 * s, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(16 * s, -30 * s, 4.5 * s, 0, 7); ctx.fill();
    // head
    ctx.fillStyle = '#e3b07c';
    ctx.beginPath(); ctx.arc(0, -68 * s, 12 * s, 0, 7); ctx.fill();
    // beard
    ctx.fillStyle = '#4a3322';
    ctx.beginPath(); ctx.arc(0, -63 * s, 12 * s, 0.15, Math.PI - 0.15); ctx.fill();
    // eyepatch + strap
    ctx.strokeStyle = '#15151c'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(-12 * s, -74 * s); ctx.lineTo(12 * s, -70 * s); ctx.stroke();
    ctx.fillStyle = '#15151c';
    ctx.beginPath(); ctx.arc(-5 * s, -71 * s, 4 * s, 0, 7); ctx.fill();
    // good eye
    ctx.fillStyle = '#15151c';
    ctx.beginPath(); ctx.arc(6 * s, -70 * s, 1.8 * s, 0, 7); ctx.fill();
    // tricorn hat
    ctx.fillStyle = '#16161e';
    ctx.beginPath();
    ctx.moveTo(-18 * s, -78 * s);
    ctx.quadraticCurveTo(0, -94 * s, 18 * s, -78 * s);
    ctx.quadraticCurveTo(0, -86 * s, -18 * s, -78 * s);
    ctx.fill();
    // hat skull
    ctx.fillStyle = '#f3ead2';
    ctx.beginPath(); ctx.arc(0, -84 * s, 2.6 * s, 0, 7); ctx.fill();
    ctx.restore();

    function leg(ox, dy) { ctx.fillRect(ox - 3 * s, -22 * s, 6 * s, (22 + dy) * s); }
    function boot(ox, dy) { ctx.fillRect(ox - 4 * s, (-2 + dy) * s, 9 * s, 6 * s); }
  }

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill();
  }

  function drawMarkers() {
    const t = performance.now() / 1000;
    SPEC.markPx.forEach(m => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      const r = (0.013 + 0.004 * pulse) * W;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 2.4);
      g.addColorStop(0, 'rgba(255,230,140,0.9)');
      g.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x, m.y, r * 2.4, 0, 7); ctx.fill();
      ctx.restore();
      // little floating chevron
      ctx.fillStyle = 'rgba(255,240,190,' + (0.6 + 0.4 * pulse) + ')';
      const yb = m.y - r * 2 - Math.sin(t * 3) * 4;
      ctx.beginPath(); ctx.moveTo(m.x, yb + 7); ctx.lineTo(m.x - 6, yb); ctx.lineTo(m.x + 6, yb); ctx.fill();
    });
  }

  function drawPrompt() {
    const m = nearestMarker();
    const tip = document.getElementById('tip');
    if (m) { tip.textContent = '▸ ' + m.label + '  (press F)'; tip.style.opacity = 1; }
    else tip.style.opacity = 0;
  }

  function drawDebug() {
    // walkmesh
    SPEC.walkPx.forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = 'rgba(60,255,140,0.20)'; ctx.fill();
      ctx.strokeStyle = '#3cff8c'; ctx.lineWidth = 2; ctx.stroke();
    });
    // occluders
    SPEC.occPx.forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath();
      ctx.strokeStyle = '#ff3c50'; ctx.setLineDash([8, 5]); ctx.lineWidth = 2; ctx.stroke();
      ctx.setLineDash([]);
    });
    // marker radii
    SPEC.markPx.forEach(m => {
      ctx.beginPath(); ctx.arc(m.x, m.y, MARK_R * W, 0, 7);
      ctx.strokeStyle = 'rgba(70,224,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  // ---- toast ----
  let toastT = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.style.opacity = 1;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.style.opacity = 0; }, 2600);
  }
})();
