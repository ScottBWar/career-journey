// =====================================================================
//  Input — keyboard + on-screen touch. Held states + edge-triggered taps.
// =====================================================================
window.Input = (function () {
  const held = {}; // logical: left,right,up,down,jump,act
  const pressed = {}; // edge (consumed by game each frame)
  const KEY = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyJ: 'act', KeyE: 'act', Enter: 'act',
  };
  function down(act) { if (!held[act]) pressed[act] = true; held[act] = true; }
  function up(act) { held[act] = false; }
  window.addEventListener('keydown', e => { const a = KEY[e.code]; if (a) { e.preventDefault(); down(a); } });
  window.addEventListener('keyup', e => { const a = KEY[e.code]; if (a) up(a); });

  function bindTouch(elId, act) {
    const el = document.getElementById(elId); if (!el) return;
    const on = e => { e.preventDefault(); down(act); };
    const off = e => { e.preventDefault(); up(act); };
    el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('mousedown', on);
    el.addEventListener('touchend', off, { passive: false }); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }
  function initTouch() {
    if (!('ontouchstart' in window)) return;
    document.body.classList.add('touch');
    bindTouch('tleft', 'left'); bindTouch('tright', 'right'); bindTouch('tjump', 'jump'); bindTouch('tact', 'up');
  }
  // jump maps to both jump and up so ↑ can also leap
  function isDown(a) { return !!held[a] || (a === 'jump' && !!held.up); }
  function tapped(a) { const v = !!pressed[a] || (a === 'jump' && !!pressed.up); return v; }
  function clear() { for (const k in pressed) pressed[k] = false; }
  return { isDown, tapped, clear, initTouch };
})();
