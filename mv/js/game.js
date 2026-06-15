// =====================================================================
//  TIDEFALL — 2.5D metroidvania engine (pure Canvas, no dependencies).
//  HD-2D "3D look" from: layered parallax + beveled tiles + drop shadows
//  + a dynamic light/vignette pass. Real art drops in via the manifest.
// =====================================================================
(function () {
  const TILE = World.TILE;
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const el = id => document.getElementById(id);

  // --- which art to use (all optional; missing = procedural placeholder) ---
  const ASSETS = {
    base: 'assets/',
    images: {
      player: 'sprites/player.png',     // (optional) horizontal spritesheet, 6 frames
      tiles: 'sprites/tiles.png',       // (optional) 48x48 tile
      bg_sky: 'bg/sky.png', bg_far: 'bg/far.png', bg_near: 'bg/near.png',
    },
    audio: { music: 'audio/explore.mp3' },
  };
  const FRAME_W = 64, FRAMES = 6; // player spritesheet layout if you provide one

  // --- physics ---
  const GRAV = 2400, MOVE = 320, AIR = 0.86, JUMP = 820, MAXFALL = 1300;
  const VIEW_TILES_H = 8;

  let room, player, cam = { x: 0, y: 0 }, scale = 1, viewW = 0, viewH = 0;
  let hp = 5, maxhp = 5, abilities = { doubleJump: false }, running = false, t = 0;
  let coyote = 0, buffer = 0, jumps = 0, invuln = 0, anim = 0, facing = 1;

  function resize() { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.imageSmoothingEnabled = true; scale = cv.height / (VIEW_TILES_H * TILE); viewH = VIEW_TILES_H * TILE; viewW = cv.width / scale; }
  window.addEventListener('resize', resize);

  function loadRoom(key, atDoorDir) {
    room = World.parse(key);
    let sx = room.spawn.x, sy = room.spawn.y;
    if (atDoorDir) { const opp = atDoorDir === '>' ? '<' : '>'; const d = room.doors.find(d => d.dir === opp); if (d) { sx = d.x + (opp === '<' ? 1 : -1); sy = d.y; } }
    player = { x: sx * TILE + 9, y: sy * TILE, w: 30, h: 44, vx: 0, vy: 0, onGround: false };
    room.enemies.forEach(e => { e.px = e.x * TILE; e.py = e.y * TILE; e.dir = -1; e.spd = 90; });
    el('room').textContent = room.name;
    updateHUD();
  }
  const solidAt = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return true; return room.grid[ty][tx] > 0; };
  function hitsSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE), y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) return true;
    return false;
  }

  function update(dt) {
    t += dt; anim += dt;
    const p = player;
    const left = Input.isDown('left'), right = Input.isDown('right'), jumpTap = Input.tapped('jump');
    // horizontal
    if (left && !right) { p.vx = -MOVE; facing = -1; } else if (right && !left) { p.vx = MOVE; facing = 1; } else { p.vx *= p.onGround ? 0.6 : AIR; if (Math.abs(p.vx) < 5) p.vx = 0; }
    // jump (coyote + buffer + double-jump)
    if (jumpTap) buffer = 0.12; buffer -= dt;
    coyote = p.onGround ? 0.1 : coyote - dt;
    if (buffer > 0 && (coyote > 0 || (abilities.doubleJump && jumps < 2))) {
      if (coyote > 0) jumps = 1; else jumps++;
      p.vy = -JUMP; buffer = 0; coyote = 0; p.onGround = false;
    }
    // gravity
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    // integrate + collide (x then y)
    let nx = p.x + p.vx * dt;
    if (!hitsSolid(nx, p.y, p.w, p.h)) p.x = nx; else { while (!hitsSolid(p.x + Math.sign(p.vx), p.y, p.w, p.h)) p.x += Math.sign(p.vx); p.vx = 0; }
    let ny = p.y + p.vy * dt; p.onGround = false;
    if (!hitsSolid(p.x, ny, p.w, p.h)) p.y = ny; else { while (!hitsSolid(p.x, p.y + Math.sign(p.vy), p.w, p.h)) p.y += Math.sign(p.vy); if (p.vy > 0) { p.onGround = true; jumps = 0; } p.vy = 0; }

    // pickups
    room.pickups = room.pickups.filter(pk => {
      if (Math.abs((pk.x * TILE + TILE / 2) - (p.x + p.w / 2)) < TILE && Math.abs((pk.y * TILE + TILE / 2) - (p.y + p.h / 2)) < TILE) {
        if (pk.kind === 'doublejump') { abilities.doubleJump = true; toast('Ability gained: DOUBLE JUMP — press jump again midair!'); }
        updateHUD(); return false;
      }
      return true;
    });
    // hazards
    invuln -= dt;
    room.hazards.forEach(hz => { if (invuln <= 0 && aabbTile(hz)) hurt(p.x + p.w / 2 < hz.x * TILE ? -1 : 1); });
    // enemies
    room.enemies.forEach(e => {
      e.px += e.dir * e.spd * dt;
      const footTx = Math.floor((e.px + (e.dir > 0 ? TILE : 0)) / TILE), footTy = Math.floor((e.py + TILE + 2) / TILE);
      if (!solidAt(footTx, footTy) || solidAt(Math.floor((e.px + (e.dir > 0 ? TILE : -1)) / TILE), Math.floor((e.py + TILE / 2) / TILE))) e.dir *= -1;
      if (invuln <= 0 && Math.abs((e.px + TILE / 2) - (p.x + p.w / 2)) < TILE * 0.7 && Math.abs((e.py + TILE / 2) - (p.y + p.h / 2)) < TILE * 0.7) hurt(p.x < e.px ? -1 : 1);
    });
    // doors
    if (Input.tapped('up')) { const d = room.doors.find(d => Math.abs((d.x * TILE + TILE / 2) - (p.x + p.w / 2)) < TILE && Math.abs((d.y * TILE) - p.y) < TILE * 1.2); if (d && room.link[d.dir]) loadRoom(room.link[d.dir], d.dir); }
    // fell out / death
    if (p.y > room.h * TILE + 200) hurt(0, true);

    // camera
    cam.x = clamp(p.x + p.w / 2 - viewW / 2, 0, Math.max(0, room.w * TILE - viewW));
    cam.y = clamp(p.y + p.h / 2 - viewH / 2, 0, Math.max(0, room.h * TILE - viewH));
    Input.clear();
  }
  function aabbTile(tile) { const p = player; return p.x < tile.x * TILE + TILE && p.x + p.w > tile.x * TILE && p.y < tile.y * TILE + TILE && p.y + p.h > tile.y * TILE; }
  function hurt(knockDir, fell) {
    hp -= 1; invuln = 1.0; updateHUD();
    if (!fell) { player.vx = knockDir * 380; player.vy = -360; }
    if (hp <= 0) { hp = maxhp; toast('You fall... and wake at the entrance.'); loadRoom(room.key); }
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // --------------------------- RENDER ---------------------------
  function render() {
    const W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(room.tint, 0.7)); g.addColorStop(1, shade(room.tint, 1.25));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // parallax layers
    room.parallax.forEach((L, i) => drawParallax(L, i, W, H));

    // world transform
    ctx.setTransform(scale, 0, 0, scale, -cam.x * scale, -cam.y * scale);
    drawTiles();
    room.hazards.forEach(drawSpike);
    room.pickups.forEach(drawPickup);
    room.doors.forEach(drawDoor);
    room.enemies.forEach(drawEnemy);
    drawPlayer();

    // lighting / vignette pass (the moody "3D" feel)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const px = (player.x + player.w / 2 - cam.x) * scale, py = (player.y + player.h / 2 - cam.y) * scale;
    const lg = ctx.createRadialGradient(px, py, 40, px, py, Math.max(W, H) * 0.7);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.55, 'rgba(0,0,0,0.12)'); lg.addColorStop(1, 'rgba(0,0,8,0.62)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const wl = ctx.createRadialGradient(px, py - 20, 10, px, py - 20, 260 * scale);
    wl.addColorStop(0, 'rgba(160,200,255,0.18)'); wl.addColorStop(1, 'rgba(160,200,255,0)');
    ctx.fillStyle = wl; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawParallax(L, i, W, H) {
    const off = -(cam.x * L.factor) % 400; ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = L.color;
    const baseY = H * (0.35 + i * 0.12);
    for (let x = off - 400; x < W + 400; x += 400) {
      if (L.kind === 'hills') { ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + 200, baseY, x + 400, H); ctx.fill(); }
      else if (L.kind === 'pillars') { ctx.fillRect(x + 60, baseY, 70, H - baseY); ctx.fillRect(x + 250, baseY + 40, 70, H - baseY); }
      else { ctx.fillRect(x, 0, 400, H); } // sky band (just a flat fill via color)
    }
    ctx.restore();
  }
  function drawTiles() {
    const tImg = Loader.img('tiles');
    const x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + viewW) / TILE), y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + viewH) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) continue;
      const v = room.grid[ty][tx]; if (!v) continue;
      const X = tx * TILE, Y = ty * TILE;
      if (tImg) { ctx.drawImage(tImg, X, Y, TILE, TILE); continue; }
      // beveled placeholder block (reads as chunky 3D)
      const base = v === 2 ? '#6a5a8a' : shade(room.tint, 1.7);
      ctx.fillStyle = base; ctx.fillRect(X, Y, TILE, TILE);
      const top = !solidAt(tx, ty - 1);
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; if (top) ctx.fillRect(X, Y, TILE, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(X, Y + TILE - 6, TILE, 6); ctx.fillRect(X + TILE - 5, Y, 5, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, TILE - 1, TILE - 1);
    }
  }
  function dropShadow(cx, gy, r) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx, gy, r, r * 0.35, 0, 0, 7); ctx.fill(); ctx.restore(); }
  function drawPlayer() {
    const p = player; const sImg = Loader.img('player');
    dropShadow(p.x + p.w / 2, p.y + p.h + 2, p.w * 0.7);
    if (invuln > 0 && Math.floor(t * 20) % 2) return; // blink
    if (sImg) {
      const moving = Math.abs(p.vx) > 10 && p.onGround; const fr = moving ? (1 + Math.floor(anim * 10) % 4) : 0;
      ctx.save(); if (facing < 0) { ctx.translate(p.x + p.w, p.y); ctx.scale(-1, 1); ctx.drawImage(sImg, fr * FRAME_W, 0, FRAME_W, sImg.height, -8, -10, p.w + 16, p.h + 14); } else ctx.drawImage(sImg, fr * FRAME_W, 0, FRAME_W, sImg.height, p.x - 8, p.y - 10, p.w + 16, p.h + 14); ctx.restore();
      return;
    }
    // placeholder hero: shaded capsule + head + face
    const cx = p.x + p.w / 2;
    ctx.fillStyle = '#3a6ea8'; roundRect(p.x, p.y + 12, p.w, p.h - 12, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(p.x + 3, p.y + 14, p.w - 6, 8, 5); ctx.fill();
    ctx.fillStyle = '#e8c0a0'; ctx.beginPath(); ctx.arc(cx, p.y + 10, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(cx + facing * 2 - 2, p.y + 7, 3, 4);
  }
  function drawEnemy(e) { dropShadow(e.px + TILE / 2, e.py + TILE - 2, TILE * 0.4); ctx.fillStyle = '#c0444f'; roundRect(e.px + 8, e.py + 10, TILE - 16, TILE - 14, 8); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.px + TILE / 2 + e.dir * 4, e.py + 24, 3, 0, 7); ctx.fill(); }
  function drawSpike(hz) { const X = hz.x * TILE, Y = hz.y * TILE; ctx.fillStyle = '#9aa6b4'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + i * 12, Y + TILE); ctx.lineTo(X + i * 12 + 6, Y + TILE - 22); ctx.lineTo(X + i * 12 + 12, Y + TILE); ctx.fill(); } }
  function drawPickup(pk) { const X = pk.x * TILE + TILE / 2, Y = pk.y * TILE + TILE / 2 + Math.sin(t * 3) * 4; ctx.save(); ctx.shadowColor = '#7fe0ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#7fe0ff'; ctx.beginPath(); ctx.arc(X, Y, 11, 0, 7); ctx.fill(); ctx.restore(); }
  function drawDoor(d) { const X = d.x * TILE, Y = d.y * TILE; ctx.fillStyle = 'rgba(127,224,255,0.18)'; ctx.fillRect(X, Y - TILE, TILE, TILE * 2); ctx.strokeStyle = 'rgba(127,224,255,0.6)'; ctx.strokeRect(X + 2, Y - TILE + 2, TILE - 4, TILE * 2 - 4); }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = clamp(((n >> 16) & 255) * f, 0, 255) | 0, g = clamp(((n >> 8) & 255) * f, 0, 255) | 0, b = clamp((n & 255) * f, 0, 255) | 0; return 'rgb(' + r + ',' + g + ',' + b + ')'; }

  function updateHUD() { let s = ''; for (let i = 0; i < maxhp; i++) s += `<div class="pip ${i < hp ? '' : 'empty'}"></div>`; el('hp').innerHTML = s; el('abilities').textContent = abilities.doubleJump ? '✦ Double Jump' : ''; }
  let toastT; function toast(msg) { const tEl = el('toast'); tEl.textContent = msg; tEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => tEl.classList.remove('show'), 3000); }

  let last = 0;
  function loop(ts) { if (!running) return; const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; update(dt); render(); requestAnimationFrame(loop); }

  async function start() {
    resize(); await Loader.load(ASSETS); Input.initTouch();
    loadRoom('cavern'); running = true; el('start').style.display = 'none';
    const m = Loader.sound('music'); if (m) { m.loop = true; m.volume = 0.5; m.play().catch(() => {}); }
    last = performance.now(); requestAnimationFrame(loop);
  }
  el('startBtn').onclick = start;
})();
