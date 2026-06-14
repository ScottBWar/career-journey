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
  // Each track has a hand-written melody + bassline over a chord progression.
  // mel/bassP: one entry per 16th step (0 = rest). mel loops independently of bars.
  const _ = 0;
  const TRACKS = {
    island: { bpm: 106, drums: 'soft', padWave: 'sawtooth', leadWave: 'triangle', cut: 2000,
      bars: [[60,64,67],[55,59,62],[57,60,64],[53,57,60]],
      bassP: [0,_,7,_, 0,_,7,_, 0,_,7,_, 0,_,5,7],
      mel: [64,_,_,67, 72,_,71,_, 69,_,67,_, 64,_,_,_,  62,_,64,_, 67,_,_,69, 71,_,72,_, 67,_,_,_] },
    sea: { bpm: 90, drums: 'soft', padWave: 'sawtooth', leadWave: 'sine', cut: 1600,
      bars: [[60,64,67],[52,55,59],[53,57,60],[55,59,62]],
      bassP: [0,_,_,_, 0,_,_,7, 0,_,_,_, 7,_,_,_],
      mel: [67,_,_,_, 72,_,_,71, 67,_,64,_, _,_,_,_,  64,_,67,_, 72,_,74,_, 71,_,67,_, 69,_,_,_] },
    town: { bpm: 136, drums: 'full', padWave: 'square', leadWave: 'square', cut: 2600,
      bars: [[60,64,67],[53,57,60],[55,59,62],[60,64,67]],
      bassP: [0,_,0,7, 0,_,0,7, 0,_,0,7, 0,7,5,7],
      mel: [72,_,72,74, 76,_,74,72, 77,_,76,74, 72,_,_,_,  74,_,76,_, 79,_,77,76, 74,_,72,74, 71,_,_,_] },
    battle: { bpm: 158, drums: 'full', padWave: 'sawtooth', leadWave: 'square', cut: 2800, horns: true,
      bars: [[57,60,64],[53,57,60],[60,64,67],[55,59,62]],
      bassP: [0,0,12,0, 0,0,12,0, 0,0,12,0, 0,7,0,7],
      mel: [69,_,72,_, 76,_,72,69, 65,_,69,_, 72,_,69,65,  67,_,71,_, 74,_,71,67, 76,_,79,76, 74,72,71,_] },
    dungeon: { bpm: 80, drums: 'none', padWave: 'sawtooth', leadWave: 'triangle', cut: 1100,
      bars: [[57,60,64],[52,55,59],[50,53,57],[57,60,64]],
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,_, _,_,_,_],
      mel: [57,_,_,_, _,_,60,_, 59,_,_,_, _,_,_,_,  55,_,_,57, _,_,_,_, 59,_,60,_, 57,_,_,_] },
    victory: { bpm: 146, drums: 'full', padWave: 'square', leadWave: 'square', cut: 2800, once: true, horns: true,
      bars: [[60,64,67],[55,59,67],[60,64,72],[60,64,72]],
      bassP: [0,_,7,_, 0,_,_,_, 0,_,0,_, 0,_,_,_],
      mel: [72,76,79,84, _,79,84,_, 83,_,84,_, _,_,_,_,  72,76,79,84, _,84,_,_, 84,_,_,_, _,_,_,_] },
  };

  let current = null, sched = null, nextTime = 0, step = 0, bar = 0, gstep = 0, _after = 'island';
  const STEPS = 16;

  function scheduleStep(tk, time) {
    const chord = tk.bars[bar % tk.bars.length];
    const beat = 60 / tk.bpm / 4;
    // pad chord at bar start
    if (step === 0) chord.forEach(n => voice(midi(n - 12), time, beat * STEPS * 0.95, { type: tk.padWave, peak: 0.05, cutoff: tk.cut, a: 0.12, d: 0.4, s: 0.75, r: 0.7 }));
    // brass horn stabs (FF battle flavor)
    if (tk.horns && (step === 0 || step === 6 || step === 8 || step === 12)) chord.forEach(n => voice(midi(n), time, beat * 2.6, { type: 'sawtooth', detune: 11, peak: 0.08, cutoff: 1700, a: 0.03, d: 0.16, s: 0.66, r: 0.28 }));
    // bassline from pattern
    const bp = tk.bassP[step]; if (bp !== _) voice(midi(chord[0] - 24 + bp), time, beat * 1.8, { type: 'triangle', peak: 0.18, cutoff: 760, a: 0.005, d: 0.12, s: 0.6, r: 0.18 });
    // melody (loops on its own length for variety)
    const note = tk.mel[gstep % tk.mel.length];
    if (note) {
      voice(midi(note), time, beat * 1.7, { type: tk.leadWave, peak: 0.13, cutoff: tk.cut + 800, a: 0.006, d: 0.1, s: 0.42, r: 0.22 });
      voice(midi(note + 12), time, beat * 0.8, { type: 'sine', peak: 0.028, cutoff: 4200, a: 0.005, d: 0.06, s: 0.2, r: 0.12 });
    }
    // drums
    if (tk.drums !== 'none') {
      if (step === 0 || step === 8) kick(time);
      if (step === 4 || step === 12) snare(time);
      if (tk.drums === 'full' && step % 2 === 0) hat(time);
      else if (tk.drums === 'soft' && step % 4 === 2) hat(time);
    }
    step++; gstep++; if (step >= STEPS) { step = 0; bar++; if (tk.once && bar >= tk.bars.length) { current = null; setTimeout(() => play(_after), 150); } }
  }
  function tick() {
    if (!ctx || !current) return; const tk = TRACKS[current]; const beat = 60 / tk.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) { scheduleStep(tk, nextTime); nextTime += beat; }
  }
  function play(name, after) {
    ensure(); if (after) _after = after; if (current === name) return;
    current = name; step = 0; bar = 0; gstep = 0; nextTime = ctx.currentTime + 0.06;
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
