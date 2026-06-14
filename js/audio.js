// =====================================================================
//  Music — procedural chiptune (no audio files, pure Web Audio).
//  Tracks: world / town / battle / victory. Starts on first user gesture.
// =====================================================================
window.Music = (function () {
  let ctx = null, master = null, lookahead = null;
  let current = null, nextNoteTime = 0, step = 0, muted = false, started = false;
  const STEP_LOOKAHEAD = 0.12;

  const NAMES = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  const midi = (name, oct) => 12 * (oct + 1) + NAMES[name];
  const freq = (m) => (m <= 0 ? 0 : 440 * Math.pow(2, (m - 69) / 12));
  const n = (name, oct) => midi(name, oct);

  // pattern arrays are 8th notes; 0 = rest
  const TRACKS = {
    world: { bpm: 96, leadWave: 'triangle', bassWave: 'sine', gain: 0.5,
      bass: [n('C',2),0,n('G',2),0, n('A',1),0,n('E',2),0, n('F',1),0,n('C',2),0, n('G',1),0,n('G',2),0],
      lead: [n('E',4),0,n('G',4),n('C',5), 0,n('A',4),0,n('G',4), n('F',4),0,n('A',4),n('C',5), 0,n('B',4),0,0] },
    town: { bpm: 124, leadWave: 'square', bassWave: 'triangle', gain: 0.45,
      bass: [n('G',2),0,n('G',2),0, n('D',2),0,n('D',2),0, n('E',2),0,n('E',2),0, n('C',2),0,n('D',2),0],
      lead: [n('G',4),n('A',4),n('B',4),n('D',5), n('B',4),0,n('A',4),0, n('C',5),n('B',4),n('A',4),n('G',4), n('A',4),0,n('D',5),0] },
    battle: { bpm: 150, leadWave: 'square', bassWave: 'sawtooth', gain: 0.5,
      bass: [n('A',1),n('A',1),n('A',2),n('A',1), n('F',1),n('F',1),n('F',2),n('F',1), n('G',1),n('G',1),n('G',2),n('G',1), n('E',1),n('E',1),n('E',2),n('E',2)],
      lead: [n('A',4),n('C',5),n('E',5),n('C',5), n('F',4),n('A',4),n('C',5),n('A',4), n('G',4),n('B',4),n('D',5),n('B',4), n('E',5),n('D',5),n('C',5),n('B',4)] },
    victory: { bpm: 140, leadWave: 'square', bassWave: 'triangle', gain: 0.55, once: true,
      bass: [n('C',2),n('C',2),n('G',2),n('C',2), n('C',2),0,0,0],
      lead: [n('C',5),n('C',5),n('C',5),n('G',4), n('C',5),0,0,0] },
  };

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }

  function voice(f, time, dur, type, vol) {
    if (!f) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(master);
    o.start(time); o.stop(time + dur + 0.03);
  }

  function scheduleStep(time) {
    const tk = TRACKS[current]; if (!tk) return;
    const len = tk.lead.length;
    const b = tk.bass[step % len], l = tk.lead[step % len];
    const beat = 60 / tk.bpm / 2;
    voice(freq(b), time, beat * 1.6, tk.bassWave, 0.16 * tk.gain);
    voice(freq(l), time, beat * 0.9, tk.leadWave, 0.20 * tk.gain);
    if (step % 2 === 0) voice(freq(b > 0 ? b + 12 : 0), time, beat * 0.5, 'sine', 0.05 * tk.gain);
    step++;
    if (tk.once && step >= len) { setTimeout(() => play(window.Music._after || 'world'), 200); current = null; }
  }

  function tick() {
    if (!ctx || !current) return;
    const tk = TRACKS[current]; const beat = 60 / tk.bpm / 2;
    while (nextNoteTime < ctx.currentTime + STEP_LOOKAHEAD) {
      scheduleStep(nextNoteTime);
      nextNoteTime += beat;
    }
  }

  function play(name, after) {
    ensure();
    if (after) window.Music._after = after;
    if (current === name) return;
    current = name; step = 0; nextNoteTime = ctx.currentTime + 0.05;
    if (!lookahead) lookahead = setInterval(tick, 25);
  }

  function start() { // call on first gesture to satisfy autoplay policy
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
    started = true;
  }

  function toggle() {
    ensure();
    muted = !muted;
    master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
    return muted;
  }

  return { play, start, toggle, isMuted: () => muted, _after: 'world' };
})();
