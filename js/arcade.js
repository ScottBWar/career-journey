// =====================================================================
//  Arcade — two cabinets in the Mall Isle arcade.
//   • 'timing'  — Powder-Keg Timing: stop the sweeping marker on the bullseye.
//   • 'memory'  — Reef Lights: repeat the buoys' flashing sequence (Simon-style).
//  Both pay out in gold, and a big score wins a prize item.
// =====================================================================
window.Arcade = (function () {
  const el = id => document.getElementById(id);
  let onEndCb, raf, mode;

  function start(game, onEnd) {
    onEndCb = onEnd; mode = game;
    el('arcade').classList.add('show');
    if (window.SFX) SFX.play('confirm');
    if (game === 'timing') startTiming(); else startMemory();
  }
  function close() { if (raf) cancelAnimationFrame(raf); raf = null; el('arcade').classList.remove('show'); const cb = onEndCb; onEndCb = null; cb && cb(); }
  function payout(title, lines, gold, prize) {
    Game.state.gold += gold;
    if (prize) { Game.state.inv[prize] = (Game.state.inv[prize] || 0) + 1; }
    Progress.save(Game.state); if (window.SFX) SFX.play('gold');
    el('arcade').innerHTML = `<div class="panel arc-panel"><div class="scr-head"><h2>${title}</h2></div>
      <div class="arc-result">${lines}<br><br>Won <b>⛃ ${gold}</b> gold${prize ? ` and a <b>${Data.ITEM_DEFS[prize].name}</b>!` : '.'}</div>
      <button class="pill" id="arcDone">Collect</button></div>`;
    el('arcDone').onclick = close;
  }

  // ---------- Powder-Keg Timing ----------
  function startTiming() {
    let round = 0, total = 0, pos = 0, dir = 1, speed = 0.018, fired = false, zone = 0.16;
    const ROUNDS = 5;
    el('arcade').innerHTML = `<div class="panel arc-panel"><div class="scr-head"><h2>🎯 Powder-Keg Timing</h2><button class="pill ghost small" id="arcQuit">Quit</button></div>
      <p class="scr-sub">Stop the spark on the bullseye! [Space] or tap. ${ROUNDS} kegs.</p>
      <canvas id="arcCanvas" width="520" height="220"></canvas>
      <div class="arc-hud">Keg <span id="arcRound">1</span>/${ROUNDS} · Score <span id="arcScore">0</span></div></div>`;
    const cv = el('arcCanvas'), c = cv.getContext('2d');
    el('arcQuit').onclick = close;
    const fire = () => {
      if (fired || raf == null) return; fired = true;
      const off = Math.abs(pos - 0.5); let pts, label;
      if (off < zone * 0.34) { pts = 100; label = 'BULLSEYE!'; } else if (off < zone) { pts = 60; label = 'Solid hit'; } else if (off < zone * 1.8) { pts = 25; label = 'Singed'; } else { pts = 0; label = 'Dud'; }
      total += pts; el('arcScore').textContent = total; if (window.SFX) SFX.play(pts >= 60 ? 'crit' : pts > 0 ? 'select' : 'error');
      setTimeout(() => {
        round++; if (round >= ROUNDS) { endTiming(total); return; }
        el('arcRound').textContent = round + 1; pos = 0; dir = 1; speed += 0.006; zone = Math.max(0.09, zone - 0.018); fired = false;
      }, 650);
      drawHit(label);
    };
    Arcade._key = (code) => { if (code === 'Space' || code === 'Enter' || code === 'KeyF') fire(); };
    cv.onclick = fire;
    function drawHit(label) { c.fillStyle = '#fde047'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText(label, cv.width / 2, 40); }
    function loop() {
      if (!fired) { pos += dir * speed; if (pos >= 1) { pos = 1; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; } }
      c.fillStyle = '#1a1426'; c.fillRect(0, 0, cv.width, cv.height);
      const bx = 40, bw = cv.width - 80, by = 130, bh = 26;
      // bar
      c.fillStyle = '#2a2438'; c.fillRect(bx, by, bw, bh);
      // bullseye zone
      const zc = bx + bw * 0.5; const zw = bw * zone;
      c.fillStyle = 'rgba(94,231,170,0.35)'; c.fillRect(zc - zw, by, zw * 2, bh);
      c.fillStyle = '#5eead4'; c.fillRect(zc - bw * zone * 0.34, by, bw * zone * 0.68, bh);
      // marker
      const mx = bx + bw * pos;
      c.fillStyle = '#ff7b3a'; c.fillRect(mx - 3, by - 14, 6, bh + 28);
      c.fillStyle = '#ffd166'; c.beginPath(); c.arc(mx, by - 18, 6, 0, Math.PI * 2); c.fill();
      if (!fired) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '16px sans-serif'; c.textAlign = 'center'; c.fillText('▼ stop it on the green ▼', cv.width / 2, 100); }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }
  function endTiming(total) {
    if (raf) cancelAnimationFrame(raf); raf = null; Arcade._key = null;
    const gold = total; const prize = total >= 360 ? 'megapotion' : null;
    payout('🎯 Time!', `You scored <b>${total}</b> across the kegs!`, gold, prize);
  }

  // ---------- Reef Lights (memory) ----------
  function startMemory() {
    const COLORS = ['#ff5e5e', '#5e8bff', '#5eff8b', '#fde047'];
    let seq = [], step = 0, showing = true, round = 0, gold = 0;
    el('arcade').innerHTML = `<div class="panel arc-panel"><div class="scr-head"><h2>🪼 Reef Lights</h2><button class="pill ghost small" id="arcQuit">Quit</button></div>
      <p class="scr-sub">Watch the buoys flash, then repeat the pattern. It grows each round!</p>
      <div class="arc-buoys" id="arcBuoys">${COLORS.map((col, i) => `<button class="arc-buoy" data-i="${i}" style="--bc:${col}"></button>`).join('')}</div>
      <div class="arc-hud">Round <span id="arcRound">0</span> · Gold <span id="arcScore">0</span></div></div>`;
    el('arcQuit').onclick = close;
    const buoys = [...document.querySelectorAll('.arc-buoy')];
    function flash(i, ok) { const b = buoys[i]; b.classList.add('lit'); if (window.SFX) SFX.play(ok === false ? 'error' : 'select'); setTimeout(() => b.classList.remove('lit'), 320); }
    function nextRound() {
      round++; el('arcRound').textContent = round; seq.push(Math.floor(Math.random() * 4)); step = 0; showing = true;
      let d = 600; seq.forEach((s, k) => setTimeout(() => flash(s), d * (k + 1)));
      setTimeout(() => { showing = false; }, d * (seq.length + 1));
    }
    buoys.forEach(b => b.onclick = () => {
      if (showing || raf === 'done') return; const i = +b.dataset.i; flash(i);
      if (i === seq[step]) { step++; if (step >= seq.length) { gold += round * 12; el('arcScore').textContent = gold; if (window.SFX) SFX.play('confirm'); setTimeout(nextRound, 700); } }
      else { endMemory(gold, round); }
    });
    raf = 'mem'; // sentinel so close() knows a game is live
    setTimeout(nextRound, 600);
  }
  function endMemory(gold, round) {
    raf = 'done'; Arcade._key = null;
    const prize = round >= 7 ? 'elixir' : round >= 5 ? 'phoenix' : null;
    payout('🪼 Lights Out!', `You echoed <b>${round - 1}</b> patterns before the reef went dark.`, gold, prize);
  }

  return { start, _key: null };
})();
