// =====================================================================
//  Coliseum — Paegina's endgame gauntlet. Pick a league, then fight its
//  waves back-to-back with NO healing between rounds (HP/MP carry over).
//  Clear every wave for the prize; retire early for partial gold. Reuses
//  the full battle engine + every enemy/boss in the game.
// =====================================================================
window.Coliseum = (function () {
  const el = id => document.getElementById(id);
  let onEndCb = null, cleared = 0, curLeague = null;

  function open(onEnd) { onEndCb = onEnd; renderSelect(); }
  function root() { return el('coliseum'); }
  function done() { root().classList.remove('show'); const cb = onEndCb; onEndCb = null; cb && cb(); }

  function renderSelect() {
    const r = root(); r.classList.add('show');
    const st = Game.state.coliseum || (Game.state.coliseum = {});
    let cards = '';
    Data.COLISEUM.forEach(lg => {
      const locked = lg.need && !st[lg.need];
      const won = !!st[lg.key];
      const reward = rewardText(lg.reward);
      cards += `<button class="col-league${locked ? ' locked' : ''}" data-key="${lg.key}" ${locked ? 'disabled' : ''}>
        <div class="col-lg-top"><b>${lg.name}</b>${won ? '<span class="col-clear">✓ Cleared</span>' : ''}</div>
        <div class="col-lg-sub">${lg.blurb}</div>
        <div class="col-lg-waves">${lg.waves.length} rounds · prize: ${reward}</div>
        ${locked ? `<div class="col-lg-lock">🔒 Win the ${nameOf(lg.need)} first</div>` : ''}
      </button>`;
    });
    r.innerHTML = `<div class="panel col-panel">
      <div class="scr-head"><h2>🏛️ The Coliseum of Paegina</h2><button class="pill ghost small" id="colClose">Leave</button></div>
      <p class="scr-sub">No healing between rounds — bring potions. Retire any round to bank partial gold; clear them all for the prize.</p>
      <div class="col-leagues">${cards}</div></div>`;
    el('colClose').onclick = done;
    [...r.querySelectorAll('.col-league:not(.locked)')].forEach(b => b.onclick = () => startLeague(b.dataset.key));
    if (window.SFX) SFX.play('confirm');
  }
  function nameOf(key) { const l = Data.COLISEUM.find(x => x.key === key); return l ? l.name : key; }
  function rewardText(rw) {
    const bits = [];
    if (rw.gold) bits.push('⛃ ' + rw.gold);
    if (rw.pearls) bits.push('🦪 ' + rw.pearls);
    if (rw.shell && Data.SHELLS[rw.shell]) bits.push('🐚 ' + Data.SHELLS[rw.shell].name);
    if (rw.accessory && Data.ACCESSORIES[rw.accessory]) bits.push('💍 ' + Data.ACCESSORIES[rw.accessory].name);
    if (rw.items) Object.keys(rw.items).forEach(k => bits.push((Data.ITEM_DEFS[k] || {}).name + ' ×' + rw.items[k]));
    return bits.join(', ') || 'glory';
  }

  function startLeague(key) {
    curLeague = Data.COLISEUM.find(l => l.key === key); if (!curLeague) return;
    cleared = 0; root().classList.remove('show');
    runWave();
  }
  function runWave() {
    const wave = curLeague.waves[cleared];
    const boss = wave.length === 1 && Data.ENEMIES[wave[0]] && Data.ENEMIES[wave[0]].boss;
    Game.startBattle(wave.slice(), { boss: !!boss, coliseum: true, music: 'paegina' }, (res) => {
      Game.resumeIsland();   // restore a live scene behind our overlay (battle scene is disposed)
      if (res.won) { cleared++; if (cleared >= curLeague.waves.length) finishLeague(); else interlude(); }
      else defeat();
    });
  }
  function interlude() {
    const r = root(); r.classList.add('show');
    const next = curLeague.waves[cleared];
    const preview = next.map(k => (Data.ENEMIES[k] || {}).name || k).join(', ');
    r.innerHTML = `<div class="panel col-panel col-mid">
      <h2>Round ${cleared} cleared!</h2>
      <p class="scr-sub">Next: round ${cleared + 1} of ${curLeague.waves.length} — <b>${preview}</b>.<br>Your HP and MP carry over. No healing.</p>
      <div class="col-acts">
        <button class="pill" id="colNext">Fight on ⚔️</button>
        <button class="pill ghost" id="colRetire">Retire (+⛃ ${cleared * 60})</button>
      </div></div>`;
    el('colNext').onclick = () => { r.classList.remove('show'); runWave(); };
    el('colRetire').onclick = () => retire();
    if (window.SFX) SFX.play('confirm');
  }
  function retire() {
    const bank = cleared * 60; Game.state.gold += bank; Progress.fullHeal(Game.state); Progress.save(Game.state);
    banner('🏳️ Retired', `You leave the sands with your winnings — <b>⛃ ${bank} gold</b> for ${cleared} round${cleared > 1 ? 's' : ''}. The crew is patched up.`);
  }
  function defeat() {
    Progress.fullHeal(Game.state); Progress.save(Game.state);
    banner('Defeated', `The crowd roars as you fall on round ${cleared + 1}. You\'re carried to the infirmary and healed — come back stronger.`);
  }
  function finishLeague() {
    const rw = curLeague.reward; const st = Game.state.coliseum;
    st[curLeague.key] = true;
    if (rw.gold) Game.state.gold += rw.gold;
    if (rw.pearls) Game.state.pearls = (Game.state.pearls || 0) + rw.pearls;
    if (rw.shell) Progress.addShell(Game.state, rw.shell);
    if (rw.accessory) Progress.buyAccessory(Game.state, rw.accessory);
    if (rw.items) Object.keys(rw.items).forEach(k => Game.state.inv[k] = (Game.state.inv[k] || 0) + rw.items[k]);
    Progress.fullHeal(Game.state); Progress.save(Game.state);
    if (window.SFX) SFX.play('levelup');
    banner('🏆 Champion of the ' + curLeague.name + '!', `The Coliseum erupts. You win: <b>${rewardText(rw)}</b>.<br>Your crew is fully restored.`);
  }
  function banner(title, html) {
    const r = root(); r.classList.add('show');
    r.innerHTML = `<div class="panel col-panel col-mid"><h2>${title}</h2><p class="col-result">${html}</p><button class="pill" id="colDone">Continue</button></div>`;
    el('colDone').onclick = () => { renderSelect(); }; // back to league select
  }

  return { open };
})();
