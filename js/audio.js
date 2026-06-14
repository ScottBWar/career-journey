// =====================================================================
//  Audio — richer procedural music (layered pads + bass + arp + drums
//  through a reverb) and a small SFX engine. Still 100% synthesized,
//  no audio files, works offline.
// =====================================================================
(function () {
  let ctx = null, master = null, musicBus = null, dry = null, wet = null, conv = null, comp = null;
  let muted = false;

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    // reverb (convolution with a procedurally-generated impulse)
    conv = ctx.createConvolver(); conv.buffer = makeImpulse(2.4, 2.2);
    dry = ctx.createGain(); dry.gain.value = 0.82;
    wet = ctx.createGain(); wet.gain.value = 0.28;
    master.connect(comp);
    comp.connect(dry).connect(ctx.destination);
    comp.connect(conv).connect(wet).connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.9; musicBus.connect(master);
  }
  function makeImpulse(seconds, decay) {
    const rate = (ctx.sampleRate) || 44100; const len = rate * seconds; const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  // a lush voice: two detuned oscillators -> lowpass -> ADSR gain
  function voice(freq, time, dur, o = {}) {
    const { type = 'sawtooth', detune = 6, cutoff = 2200, peak = 0.2, a = 0.01, d = 0.12, s = 0.5, r = 0.2, dest = musicBus } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.6;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o2.type = type; o1.frequency.value = freq; o2.frequency.value = freq; o1.detune.value = -detune; o2.detune.value = detune;
    const sus = peak * s;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.linearRampToValueAtTime(sus, time + a + d);
    g.gain.setValueAtTime(sus, time + Math.max(a + d, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(a + d, dur) + r);
    o1.connect(f); o2.connect(f); f.connect(g).connect(dest);
    o1.start(time); o2.start(time); o1.stop(time + dur + r + 0.05); o2.stop(time + dur + r + 0.05);
  }
  function noise(time, dur, o = {}) {
    const { cutoff = 6000, hp = false, peak = 0.2, dest = musicBus } = o;
    const len = Math.ceil((ctx.sampleRate) * (dur + 0.02)); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = cutoff;
    const g = ctx.createGain(); g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(dest); src.start(time); src.stop(time + dur + 0.02);
  }
  function kick(time, dest = musicBus) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, time); o.frequency.exponentialRampToValueAtTime(45, time + 0.12); g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18); o.connect(g).connect(dest); o.start(time); o.stop(time + 0.2); }
  function snare(time, dest = musicBus) { noise(time, 0.16, { cutoff: 3000, hp: true, peak: 0.18, dest }); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 180; g.gain.setValueAtTime(0.12, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12); o.connect(g).connect(dest); o.start(time); o.stop(time + 0.13); }
  function hat(time, dest = musicBus) { noise(time, 0.04, { cutoff: 9000, hp: true, peak: 0.07, dest }); }

  // ---------------- MUSIC ----------------
  const C = n => 60 + n; // helper offsets not used; chords are raw midi
  const TRACKS = {
    island: { bpm: 100, drums: 'soft', padWave: 'sawtooth', leadWave: 'triangle', cut: 1800,
      bars: [[60,64,67],[55,59,62],[57,60,64],[53,57,60]] },
    sea:    { bpm: 84, drums: 'soft', padWave: 'sawtooth', leadWave: 'sine', cut: 1500,
      bars: [[60,64,67],[59,62,67],[57,60,64],[55,59,62]] },
    town:   { bpm: 132, drums: 'full', padWave: 'square', leadWave: 'square', cut: 2400,
      bars: [[60,64,67],[53,57,60],[55,59,62],[60,64,67]] },
    battle: { bpm: 154, drums: 'full', padWave: 'sawtooth', leadWave: 'square', cut: 2600,
      bars: [[57,60,64],[53,57,60],[60,64,67],[55,59,62]] },
    dungeon:{ bpm: 76, drums: 'none', padWave: 'sawtooth', leadWave: 'triangle', cut: 1100,
      bars: [[57,60,64],[52,55,59],[50,53,57],[57,60,64]] },
    victory:{ bpm: 140, drums: 'full', padWave: 'square', leadWave: 'square', cut: 2600, once: true,
      bars: [[60,64,67],[55,59,67],[60,64,72],[60,64,72]] },
  };

  let current = null, sched = null, nextTime = 0, step = 0, bar = 0, _after = 'island';
  const STEPS = 16; // 16th notes per bar

  function scheduleStep(tk, time) {
    const chord = tk.bars[bar % tk.bars.length];
    const beat = 60 / tk.bpm / 4; // 16th
    // pad chord at bar start
    if (step === 0) chord.forEach(n => voice(midi(n - 12), time, beat * STEPS * 0.95, { type: tk.padWave, peak: 0.07, cutoff: tk.cut, a: 0.08, d: 0.3, s: 0.7, r: 0.6 }));
    // bass on quarters
    if (step % 4 === 0) voice(midi(chord[0] - 24), time, beat * 3.6, { type: 'triangle', peak: 0.16, cutoff: 700, a: 0.005, d: 0.1, s: 0.6, r: 0.15 });
    // arpeggio / lead on eighths
    if (step % 2 === 0) { const n = chord[(step / 2) % chord.length] + (step % 4 === 0 ? 12 : 0); voice(midi(n), time, beat * 1.5, { type: tk.leadWave, peak: 0.11, cutoff: tk.cut + 600, a: 0.005, d: 0.08, s: 0.35, r: 0.18 }); }
    // drums
    if (tk.drums !== 'none') {
      if (step === 0 || step === 8) kick(time);
      if (step === 4 || step === 12) snare(time);
      if (tk.drums === 'full' && step % 2 === 0) hat(time);
      else if (tk.drums === 'soft' && step % 4 === 2) hat(time);
    }
    step++; if (step >= STEPS) { step = 0; bar++; if (tk.once && bar >= tk.bars.length) { current = null; setTimeout(() => play(_after), 150); } }
  }
  function tick() {
    if (!ctx || !current) return; const tk = TRACKS[current]; const beat = 60 / tk.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) { scheduleStep(tk, nextTime); nextTime += beat; }
  }
  function play(name, after) {
    ensure(); if (after) _after = after; if (current === name) return;
    current = name; step = 0; bar = 0; nextTime = ctx.currentTime + 0.06;
    // brief duck for a smoother switch
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0.0001, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.25);
    if (!sched) sched = setInterval(tick, 25);
  }
  function start() { ensure(); if (ctx.state === 'suspended') ctx.resume(); }
  function toggle() { ensure(); muted = !muted; master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05); return muted; }

  window.Music = { play, start, toggle, isMuted: () => muted, context: () => { ensure(); return ctx; }, get _after() { return _after; }, set _after(v) { _after = v; } };

  // ---------------- SFX ----------------
  function sfxBus() { ensure(); return master; }
  function blip(freq, time, dur, type, peak, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(freq, time);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, time + dur);
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak || 0.18, time + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(sfxBus()); o.start(time); o.stop(time + dur + 0.02);
  }
  const SFX = {
    play(name) {
      if (!ctx) return; const t = ctx.currentTime;
      switch (name) {
        case 'select': blip(620, t, 0.06, 'square', 0.12); break;
        case 'confirm': blip(560, t, 0.07, 'square', 0.14); blip(840, t + 0.07, 0.1, 'square', 0.14); break;
        case 'cancel': blip(400, t, 0.12, 'square', 0.12, 200); break;
        case 'hit': noise(t, 0.12, { cutoff: 2400, peak: 0.22, dest: sfxBus() }); blip(160, t, 0.12, 'sawtooth', 0.16, 70); break;
        case 'crit': noise(t, 0.16, { cutoff: 4000, peak: 0.26, dest: sfxBus() }); blip(220, t, 0.16, 'sawtooth', 0.2, 80); blip(900, t, 0.1, 'square', 0.12); break;
        case 'magic': blip(300, t, 0.3, 'triangle', 0.16, 1400); break;
        case 'fire': blip(200, t, 0.3, 'sawtooth', 0.16, 900); noise(t, 0.25, { cutoff: 1800, peak: 0.12, dest: sfxBus() }); break;
        case 'water': blip(900, t, 0.3, 'sine', 0.14, 300); break;
        case 'heal': [659, 784, 988].forEach((f, i) => blip(f, t + i * 0.07, 0.18, 'sine', 0.12)); break;
        case 'ko': blip(300, t, 0.4, 'sawtooth', 0.16, 90); break;
        case 'levelup': [523, 659, 784, 1047].forEach((f, i) => blip(f, t + i * 0.09, 0.16, 'square', 0.14)); break;
        case 'item': blip(700, t, 0.1, 'triangle', 0.14, 1000); break;
        case 'gold': [880, 1175].forEach((f, i) => blip(f, t + i * 0.05, 0.1, 'square', 0.12)); break;
        case 'sail': noise(t, 0.5, { cutoff: 700, peak: 0.08, dest: sfxBus() }); break;
        case 'door': blip(140, t, 0.4, 'sawtooth', 0.16, 200); noise(t, 0.4, { cutoff: 900, peak: 0.1, dest: sfxBus() }); break;
        case 'puzzle': [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, t + i * 0.08, 0.2, 'triangle', 0.13)); break;
        case 'error': blip(220, t, 0.18, 'square', 0.14, 140); break;
      }
    },
  };
  window.SFX = SFX;
})();
