// =====================================================================
//  ShellHunt — a quick reflex minigame. Shells surface on the beach; tap
//  them before they burrow. Your haul becomes seashell-materia + pearls.
// =====================================================================
window.ShellHunt = (function () {
  const el = id => document.getElementById(id);
  let onEndCb, score, timeLeft, spawnTimer, tickTimer, cells, active, running;
  const SHELLS = ['🐚', '🦪', '🐚', '🌀', '🐚'];
  const DURATION = 22;

  function start(onEnd) {
    onEndCb = onEnd; score = 0; timeLeft = DURATION; running = true; active = new Set();
    const root = el('shellHunt'); root.classList.add('show');
    root.innerHTML = `<div class="panel sh-panel">
      <div class="sh-head"><h2>🐚 Shell Hunt</h2><div class="sh-hud"><span id="shScore">0</span> caught · <span id="shTime">${DURATION}</span>s</div></div>
      <div class="sh-grid" id="shGrid"></div>
      <div class="sh-foot">Tap the shells before they burrow!</div></div>`;
    const grid = el('shGrid'); cells = [];
    for (let i = 0; i < 12; i++) { const c = document.createElement('div'); c.className = 'sh-cell'; grid.appendChild(c); cells.push(c); }
    if (window.SFX) SFX.play('confirm');
    scheduleSpawn();
    tickTimer = setInterval(() => { timeLeft--; el('shTime').textContent = timeLeft; if (timeLeft <= 0) finish(); }, 1000);
  }

  function scheduleSpawn() {
    if (!running) return;
    const delay = Math.max(420, 1000 - (DURATION - timeLeft) * 28);
    spawnTimer = setTimeout(() => { spawn(); scheduleSpawn(); }, delay);
  }
  function spawn() {
    const free = cells.filter(c => !active.has(c)); if (!free.length) return;
    const c = free[Math.floor(Math.random() * free.length)]; active.add(c);
    const b = document.createElement('button'); b.className = 'sh-shell'; b.textContent = SHELLS[Math.floor(Math.random() * SHELLS.length)];
    const life = 700 + Math.random() * 500;
    const rm = () => { if (b.parentNode) b.parentNode.removeChild(b); active.delete(c); };
    b.onclick = () => { if (!running) return; score++; el('shScore').textContent = score; if (window.SFX) SFX.play('gold'); b.classList.add('caught'); clearTimeout(to); setTimeout(rm, 90); active.delete(c); };
    c.appendChild(b); const to = setTimeout(rm, life);
  }

  function finish() {
    running = false; clearTimeout(spawnTimer); clearInterval(tickTimer);
    const shellsWon = Math.max(1, Math.floor(score / 5));
    const pearls = score;
    const names = [];
    for (let i = 0; i < shellsWon; i++) { const key = Data.SHELL_HUNT.pool[Math.floor(Math.random() * Data.SHELL_HUNT.pool.length)]; Progress.addShell(Game.state, key); names.push(Data.SHELLS[key].name); }
    Game.state.pearls += pearls; Progress.save(Game.state);
    if (window.SFX) SFX.play('puzzle');
    const root = el('shellHunt');
    root.innerHTML = `<div class="panel sh-panel"><div class="sh-head"><h2>Haul!</h2></div>
      <div class="sh-result">You caught <b>${score}</b> shells!<br>Earned <b>${pearls}</b> 🦪 pearls and ${shellsWon} seashell${shellsWon>1?'s':''}:<br>${names.map(n => '🐚 ' + n).join('<br>')}</div>
      <button class="pill" id="shDone">Collect</button></div>`;
    el('shDone').onclick = () => { root.classList.remove('show'); onEndCb && onEndCb(); };
  }

  return { start };
})();
