// =====================================================================
//  Audio — richer procedural music (layered pads + bass + arp + drums
//  through a reverb) and a small SFX engine. Still 100% synthesized,
//  no audio files, works offline.
// =====================================================================
(function () {
  let ctx = null, master = null, musicBus = null, dry = null, wet = null, conv = null, comp = null;
  let padBus = null, delaySend = null, tapeFilter = null; // production chain: tonal sub-bus, echo send, lo-fi tape lowpass
  let muted = false;

  // soft-clip curve for analog-ish saturation/warmth (de-MIDIs the raw oscillators)
  function makeSatCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    // reverb (convolution with a procedurally-generated impulse)
    conv = ctx.createConvolver(); conv.buffer = makeImpulse(3.2, 2.5);
    dry = ctx.createGain(); dry.gain.value = 0.8;
    wet = ctx.createGain(); wet.gain.value = 0.36;
    master.connect(comp);
    comp.connect(dry).connect(ctx.destination);
    comp.connect(conv).connect(wet).connect(ctx.destination);
    // music bus → saturation → wobbling tape lowpass → master (warm, dusty, not clean-MIDI)
    musicBus = ctx.createGain(); musicBus.gain.value = 0.9;
    const sat = ctx.createWaveShaper(); sat.curve = makeSatCurve(2.4); sat.oversample = '2x';
    tapeFilter = ctx.createBiquadFilter(); tapeFilter.type = 'lowpass'; tapeFilter.frequency.value = 3300; tapeFilter.Q.value = 0.5;
    musicBus.connect(sat); sat.connect(tapeFilter); tapeFilter.connect(master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.16; const lfoG = ctx.createGain(); lfoG.gain.value = 650; lfo.connect(lfoG); lfoG.connect(tapeFilter.frequency); lfo.start(); // slow tape wobble
    // tonal sub-bus (pads/keys/bass/lead) — ducked by the kick for that sidechain "pump"
    padBus = ctx.createGain(); padBus.gain.value = 1.0; padBus.connect(musicBus);
    // tape echo send (mainly the lead)
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.26; const fb = ctx.createGain(); fb.gain.value = 0.34;
    delaySend = ctx.createGain(); delaySend.gain.value = 0.5; delaySend.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(musicBus);
  }
  // sidechain duck — the kick momentarily pushes the tonal bus down, then it swells back
  function pump(time) { if (!padBus) return; const g = padBus.gain; g.cancelScheduledValues(time); g.setValueAtTime(0.52, time); g.linearRampToValueAtTime(1.0, time + 0.18); }
  function makeImpulse(seconds, decay) {
    const rate = (ctx.sampleRate) || 44100; const len = rate * seconds; const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  // a lush voice: two detuned oscillators -> lowpass (with movement) -> ADSR gain
  function voice(freq, time, dur, o = {}) {
    const { type = 'sawtooth', detune = 6, cutoff = 2200, peak = 0.2, a = 0.01, d = 0.12, s = 0.5, r = 0.2, dest = padBus, echo = 0 } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.9;
    // filter envelope: opens on attack, settles down — gives notes movement instead of a static buzz
    f.frequency.setValueAtTime(cutoff * 1.6, time); f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.75), time + a + d + 0.05);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o2.type = type; o1.frequency.value = freq; o2.frequency.value = freq; o1.detune.value = -detune; o2.detune.value = detune;
    o1.detune.linearRampToValueAtTime(-detune - 4, time + dur); o2.detune.linearRampToValueAtTime(detune + 4, time + dur); // slow analog drift
    const sus = peak * s;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.linearRampToValueAtTime(sus, time + a + d);
    g.gain.setValueAtTime(sus, time + Math.max(a + d, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(a + d, dur) + r);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(dest || padBus);
    if (echo && delaySend) { const eg = ctx.createGain(); eg.gain.value = echo; g.connect(eg); eg.connect(delaySend); }
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
  // ---- trip-hop instrument voices ----
  // warm electric piano (Rhodes-ish): sine body + octave shimmer + a bell "tine"
  function epiano(freq, time, dur, o = {}) {
    const { peak = 0.08, cutoff = 2200, dest = padBus } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.4;
    const body = ctx.createOscillator(); body.type = 'sine'; body.frequency.value = freq;
    const oct = ctx.createOscillator(); oct.type = 'sine'; oct.frequency.value = freq * 2; const og = ctx.createGain();
    const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = freq * 6.5; const tg = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.008);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.3), time + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.2);
    og.gain.setValueAtTime(peak * 0.45, time); og.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    tg.gain.setValueAtTime(peak * 0.5, time); tg.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    body.connect(f); oct.connect(og).connect(f); tine.connect(tg).connect(f); f.connect(g).connect(dest);
    [body, oct, tine].forEach(x => { x.start(time); x.stop(time + dur + 0.25); });
  }
  // deep round sub bass
  function subBass(freq, time, dur, o = {}) {
    const { peak = 0.3, dest = padBus } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 0.8;
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq; const o2g = ctx.createGain(); o2g.gain.value = 0.16;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.025);
    g.gain.setValueAtTime(peak, time + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.1);
    o1.connect(f); o2.connect(o2g).connect(f); f.connect(g).connect(dest);
    o1.start(time); o2.start(time); o1.stop(time + dur + 0.12); o2.stop(time + dur + 0.12);
  }
  // ---- drums: dusty, downtempo, head-nodding ----
  function kick(time, dest = musicBus, o = {}) {
    const { peak = 0.6 } = o; pump(time); const oo = ctx.createOscillator(), g = ctx.createGain();
    oo.frequency.setValueAtTime(120, time); oo.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
    oo.connect(g).connect(dest); oo.start(time); oo.stop(time + 0.32);
    noise(time, 0.014, { cutoff: 2400, hp: true, peak: 0.12, dest }); // beater click
  }
  function snare(time, dest = musicBus, o = {}) {
    const { peak = 0.2 } = o;
    noise(time, 0.012, { cutoff: 1800, hp: false, peak: peak * 0.6, dest });  // attack crack
    noise(time, 0.20, { cutoff: 2600, hp: true, peak: peak * 0.9, dest });    // reverberant body
    const oo = ctx.createOscillator(), g = ctx.createGain(); oo.type = 'triangle';
    oo.frequency.setValueAtTime(195, time); oo.frequency.exponentialRampToValueAtTime(135, time + 0.1);
    g.gain.setValueAtTime(peak * 0.55, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    oo.connect(g).connect(dest); oo.start(time); oo.stop(time + 0.18);
  }
  function hat(time, dest = musicBus, o = {}) { const { peak = 0.05, open = false } = o; noise(time, open ? 0.16 : 0.03, { cutoff: 9500, hp: true, peak, dest }); }

  // ---- vinyl crackle bed (loops continuously under the music) ----
  let crackleNode = null;
  function startTexture() {
    if (crackleNode || !ctx) return;
    const rate = ctx.sampleRate, buf = ctx.createBuffer(1, Math.floor(rate * 4), rate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { let v = (Math.random() * 2 - 1) * 0.008; if (Math.random() < 0.0004) v += (Math.random() * 2 - 1) * 0.28; d[i] = v; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 5000;
    const g = ctx.createGain(); g.gain.value = 0.55;
    src.connect(f).connect(g).connect(musicBus); src.start(); crackleNode = src;
  }

  // ---------------- MUSIC ----------------
  // Trip-hop beds: dusty boom-bap drums, deep sub bass, Rhodes comping, vinyl
  // crackle, lush reverb and sparse, melancholy leads — all in A-minor-ish keys.
  // One entry per 16th step (0 = rest). keys[]=Rhodes hits, stabs[]=dark stabs,
  // bassP[]=sub-bass pattern, mel[]=lead (loops on its own length). swing lays
  // the off-beats back for that head-nod feel.
  const _ = 0, K = 1;
  const TRACKS = {
    // mellow head-nod exploration
    island: { bpm: 84, drums: 'triphop', swing: 0.18, padWave: 'triangle', leadWave: 'sine', cut: 1700,
      bars: [[57,60,64,67],[53,57,60,64],[50,53,57,60],[52,55,59,62]],
      keys: [_,_,K,_, _,K,_,_, _,_,K,_, _,K,_,K], keyLen: 2.4, keyPeak: 0.07,
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,7, _,_,_,_], bassPeak: 0.3,
      mel: [_,_,_,_, 64,_,_,_, 67,_,_,_, _,_,62,_,  _,_,_,_, 60,_,_,_, 59,_,_,_, _,_,_,_], leadPeak: 0.08 },

    // dreamy open water
    sea: { bpm: 76, drums: 'sparse', swing: 0.2, padWave: 'sine', leadWave: 'sine', cut: 1400,
      bars: [[57,60,64,67],[52,55,59,62],[50,53,57,60],[55,59,62,65]],
      keys: [_,_,_,_, _,K,_,_, _,_,_,_, _,K,_,_], keyLen: 3.4, keyPeak: 0.06,
      bassP: [0,_,_,_, _,_,_,_, _,_,_,_, 0,_,_,_], bassPeak: 0.28,
      mel: [67,_,_,_, _,_,_,_, 64,_,_,_, _,_,_,_,  62,_,_,_, 64,_,_,_, 60,_,_,_, _,_,_,_], leadPeak: 0.07 },

    // warmer jazzy groove
    town: { bpm: 90, drums: 'triphop', swing: 0.16, padWave: 'triangle', leadWave: 'triangle', cut: 1900,
      bars: [[57,60,64,67],[50,53,57,60],[55,59,62,65],[52,55,59,62]],
      keys: [_,_,K,_, K,_,_,K, _,_,K,_, K,_,K,_], keyLen: 1.8, keyPeak: 0.075,
      bassP: [0,_,_,_, 7,_,_,_, 0,_,_,5, 7,_,_,_], bassPeak: 0.3,
      mel: [_,_,72,_, _,_,71,_, 67,_,_,_, _,_,_,_,  _,_,69,_, 67,_,_,_, 64,_,_,_, _,_,_,_], leadPeak: 0.07 },

    // downtempo but driving — tense trip-hop battle (8-bar hook with a counter-melody)
    battle: { bpm: 96, drums: 'heavy', swing: 0.1, padWave: 'sawtooth', leadWave: 'square', cut: 2000,
      bars: [[57,60,64,67],[53,57,60,64],[60,64,67,72],[55,59,62,67],[57,60,64,67],[53,57,60,64],[52,56,59,64],[55,59,62,67]],
      keys: [K,_,_,K, _,K,_,_, K,_,_,K, _,K,_,K], keyLen: 1.2, keyPeak: 0.055,
      stabs: [K,_,_,_, _,_,K,_, _,_,K,_, _,K,_,_],
      bassP: [0,_,0,7, 12,_,7,_, 0,_,0,7, 5,_,7,_], bassPeak: 0.34, bassLen: 1.3,
      leadADSR: { a: 0.005, d: 0.14, s: 0.25, r: 0.18 }, leadDur: 1.1, leadPeak: 0.085,
      mel: [69,_,72,_, 76,74,72,_, 69,_,67,_, 72,_,_,_,  65,_,69,_, 72,71,69,_, 67,_,64,_, 67,69,67,_,
            64,_,67,_, 72,_,71,_, 69,_,72,76, 74,_,72,_,  71,_,67,_, 69,_,71,72, 74,_,76,_, 72,71,69,_],
      harm: [_,_,_,_, 64,_,60,_, _,_,_,_, 64,_,_,_,  _,_,_,_, 60,_,57,_, _,_,_,_, 60,_,_,_], harmWave: 'triangle', harmPeak: 0.05 },

    // cinematic dread — bigger, more menacing boss theme (8-bar descent + choir + stabs)
    boss: { bpm: 88, drums: 'heavy', swing: 0.08, padWave: 'sawtooth', leadWave: 'square', cut: 1900, choir: true,
      bars: [[57,60,64,67],[56,59,63,66],[53,56,60,63],[52,56,59,63],[57,60,64,67],[55,58,62,65],[53,56,60,63],[52,55,59,62]],
      keys: [K,_,_,_, _,_,K,_, K,_,_,_, _,K,_,_], keyLen: 1.6, keyPeak: 0.07,
      stabs: [K,_,_,_, K,_,_,_, K,_,_,_, K,_,K,_],
      bassP: [0,_,_,0, 0,_,_,7, 0,_,_,0, 0,_,7,5], bassPeak: 0.38, bassLen: 1.9,
      leadADSR: { a: 0.01, d: 0.2, s: 0.4, r: 0.4 }, leadPeak: 0.09,
      mel: [57,_,_,60, 64,_,63,_, 60,_,59,_, 57,_,_,_,  56,_,_,59, 63,_,62,_, 59,_,56,_, 52,_,_,_,
            64,_,63,_, 60,_,_,_, 59,_,56,_, 57,_,_,_,  63,_,62,_, 59,_,_,_, 56,_,52,_, 57,_,_,_],
      harm: [_,_,_,_, 60,_,_,_, _,_,_,_, 52,_,_,_,  _,_,_,_, 59,_,_,_, _,_,_,_, 56,_,_,_], harmPeak: 0.055 },

    // intimate, sensual
    date: { bpm: 70, drums: 'soft', swing: 0.22, padWave: 'sine', leadWave: 'sine', cut: 1500, choir: true,
      bars: [[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62]],
      keys: [_,_,K,_, _,_,_,_, _,_,K,_, _,_,K,_], keyLen: 3.4, keyPeak: 0.07,
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,_, _,_,_,_], bassPeak: 0.26,
      mel: [_,_,_,_, 71,_,_,_, 72,_,_,_, _,_,69,_,  _,_,_,_, 67,_,_,_, 69,_,_,_, _,_,_,_], leadPeak: 0.07 },

    // the Coliseum of Paegina — trip-hop bed under a plucked, Phrygian lyre
    paegina: { bpm: 88, drums: 'triphop', swing: 0.16, padWave: 'triangle', leadWave: 'triangle', cut: 1900,
      bars: [[57,60,64,67],[58,62,65,69],[53,57,60,65],[55,58,62,67]],
      keys: [_,_,K,_, K,_,_,K, _,_,K,_, K,_,K,_], keyLen: 1.5, keyPeak: 0.06,
      bassP: [0,_,_,_, 0,_,7,_, 0,_,_,_, 7,_,5,_], bassPeak: 0.32,
      // fast lyre arpeggios in A-Phrygian (A Bb C D E F G)
      leadADSR: { a: 0.004, d: 0.16, s: 0.1, r: 0.16 }, leadDur: 0.9, leadPeak: 0.07,
      mel: [57,60,64, 69,67,65, 64,_, 60,64,67, 72,_,67,_, _,  58,62,65, 69,65,62, 58,_, 57,60,64, 67,64,60, 57,_,_,_] },

    // sparse, dripping ambience
    dungeon: { bpm: 68, drums: 'soft', swing: 0.2, padWave: 'sawtooth', leadWave: 'sine', cut: 1000,
      bars: [[57,60,64],[52,55,59],[50,53,57],[51,55,58]],
      keys: [_,_,_,_, _,_,K,_, _,_,_,_, _,_,_,_], keyLen: 3.0, keyPeak: 0.05,
      bassP: [0,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_], bassPeak: 0.3, bassLen: 5,
      mel: [57,_,_,_, _,_,_,_, _,_,60,_, _,_,_,_,  56,_,_,_, _,_,_,_, 59,_,_,_, _,_,_,_], leadPeak: 0.06 },

    // atmospheric build
    intro: { bpm: 80, drums: 'sparse', swing: 0.18, padWave: 'sawtooth', leadWave: 'sine', cut: 1500, choir: true,
      bars: [[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62]],
      keys: [_,_,K,_, _,K,_,_, _,_,K,_, _,K,_,_], keyLen: 2.4, keyPeak: 0.07,
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,_, _,_,_,_], bassPeak: 0.28,
      mel: [64,_,67,_, 72,_,_,_, 71,_,67,_, _,_,_,_,  62,_,65,_, 69,_,_,_, 67,_,64,_, _,_,_,_], leadPeak: 0.08 },

    // a warm, satisfying lift — still dusty
    victory: { bpm: 94, drums: 'triphop', swing: 0.16, padWave: 'triangle', leadWave: 'triangle', cut: 2100, once: true,
      bars: [[60,64,67,71],[57,60,64,67],[62,65,69,72],[60,64,67,72]],
      keys: [K,_,K,_, K,_,_,_, K,_,K,_, K,_,_,_], keyLen: 1.6, keyPeak: 0.085,
      bassP: [0,_,_,_, 0,_,_,_, 0,_,_,_, 0,_,_,_], bassPeak: 0.32,
      mel: [72,_,76,_, 79,_,_,_, 77,_,76,_, _,_,_,_,  72,_,76,_, 79,_,84,_, 83,_,_,_, _,_,_,_], leadPeak: 0.09 },

    // ---- cinematic cutscene bed: slow, emotional, drumless, swelling strings/choir ----
    cutscene: { bpm: 72, drums: 'none', swing: 0.2, padWave: 'sine', leadWave: 'triangle', cut: 1500, choir: true,
      bars: [[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62],[50,53,57,60],[55,59,62,65],[53,57,60,64],[52,56,59,64]],
      keys: [_,_,K,_, _,_,_,_, _,_,K,_, _,_,_,_], keyLen: 3.4, keyPeak: 0.055,
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,_, _,_,_,_], bassPeak: 0.24, bassLen: 5,
      leadADSR: { a: 0.06, d: 0.3, s: 0.6, r: 0.9 }, leadDur: 3, leadPeak: 0.07,
      mel: [_,_,_,_, 64,_,_,_, 67,_,_,_, _,_,62,_,  _,_,_,_, 60,_,_,_, 59,_,_,_, _,_,_,_,  _,_,_,_, 67,_,_,_, 72,_,71,_, 67,_,_,_,  _,_,_,_, 64,_,_,_, 62,_,60,_, _,_,_,_] },

    // ---- a bright, anthemic CALL TO ADVENTURE — major key, the horizon is calling ----
    adventure: { bpm: 92, drums: 'triphop', swing: 0.14, padWave: 'triangle', leadWave: 'triangle', cut: 2200, choir: true,
      bars: [[60,64,67,72],[55,59,62,67],[57,60,64,69],[53,57,60,64], [60,64,67,72],[62,65,69,74],[59,62,67,71],[55,59,62,67]],
      keys: [K,_,_,K, _,K,_,_, K,_,_,K, _,K,_,_], keyLen: 1.8, keyPeak: 0.08,
      bassP: [0,_,_,_, 0,_,_,_, 0,_,_,_, 0,_,_,_], bassPeak: 0.34, bassLen: 3,
      leadADSR: { a: 0.02, d: 0.18, s: 0.5, r: 0.5 }, leadDur: 1.4, leadPeak: 0.095,
      mel: [67,_,72,_, 76,_,_,79, 76,_,72,_, 74,_,_,_,  67,_,71,_, 74,_,_,79, 77,_,74,_, 71,_,_,_,
            72,_,76,_, 79,_,_,84, 83,_,79,_, 76,_,_,_,  74,_,77,_, 79,_,84,_, 86,_,_,_, _,_,_,_] },

    // ---- ASSAULT: the prologue raid theme — fast, urgent, driving (FF7 "Bombing Mission" energy) ----
    assault: { bpm: 148, drums: 'heavy', swing: 0.04, padWave: 'sawtooth', leadWave: 'square', cut: 2300, choir: true,
      bars: [[45,48,52,55],[45,48,52,55],[43,46,50,53],[44,47,51,54], [45,48,52,55],[50,53,57,60],[48,51,55,58],[43,46,50,53]],
      keys: [K,_,K,K, _,K,_,K, K,_,K,K, _,K,_,K], keyLen: 0.7, keyPeak: 0.09,
      bassP: [0,_,0,_, 0,_,0,_, 0,_,0,_, 0,_,0,_], bassPeak: 0.4, bassLen: 1.4,
      leadADSR: { a: 0.01, d: 0.1, s: 0.4, r: 0.3 }, leadDur: 0.7, leadPeak: 0.1,
      mel: [57,_,57,_, 60,_,57,_, 55,_,55,_, 57,_,55,_,  53,_,53,_, 55,_,57,_, 60,_,62,_, 64,_,_,_,
            64,_,62,_, 60,_,57,_, 55,_,57,_, 60,_,62,_,  64,_,67,_, 64,_,60,_, 57,_,55,_, 53,_,_,_] },

    // ---- battle theme B: aggressive D-minor drive ----
    battle2: { bpm: 100, drums: 'heavy', swing: 0.08, padWave: 'sawtooth', leadWave: 'square', cut: 2100,
      bars: [[50,53,57,60],[55,58,62,65],[48,52,55,60],[50,53,57,62],[50,53,57,60],[57,60,64,67],[55,58,62,65],[50,53,57,60]],
      keys: [K,_,K,_, _,K,_,K, K,_,K,_, _,K,_,_], keyLen: 1.0, keyPeak: 0.055,
      stabs: [K,_,_,K, _,_,K,_, K,_,_,K, _,_,K,_],
      bassP: [0,_,0,_, 7,_,0,_, 0,_,0,7, 12,_,7,_], bassPeak: 0.34, bassLen: 1.1,
      leadADSR: { a: 0.004, d: 0.12, s: 0.2, r: 0.16 }, leadDur: 1.0, leadPeak: 0.085,
      mel: [62,_,65,_, 69,_,67,65, 62,_,60,_, 62,_,_,_,  57,_,60,_, 65,_,64,62, 60,_,57,_, 62,_,_,_,
            69,_,67,_, 65,_,62,_, 60,_,62,65, 67,_,_,_,  65,_,62,_, 60,_,_,_, 62,_,65,_, 62,60,57,_],
      harm: [_,_,_,_, 62,_,_,_, _,_,_,_, 57,_,_,_], harmPeak: 0.05, harmWave: 'triangle' },

    // ---- battle theme C: groovy E-minor head-nodder ----
    battle3: { bpm: 90, drums: 'triphop', swing: 0.18, padWave: 'triangle', leadWave: 'square', cut: 1900,
      bars: [[52,55,59,62],[48,52,55,59],[57,60,64,67],[50,54,57,62],[52,55,59,62],[48,52,55,59],[55,59,62,66],[52,55,59,62]],
      keys: [_,_,K,_, K,_,_,K, _,_,K,_, K,_,K,_], keyLen: 1.3, keyPeak: 0.06,
      stabs: [K,_,_,_, _,_,K,_, _,_,_,_, _,K,_,_],
      bassP: [0,_,_,7, 0,_,0,_, _,_,7,_, 0,_,5,_], bassPeak: 0.33, bassLen: 1.4,
      leadADSR: { a: 0.006, d: 0.16, s: 0.28, r: 0.2 }, leadDur: 1.1, leadPeak: 0.08,
      mel: [64,_,_,67, 71,_,67,_, 64,_,62,_, _,_,_,_,  59,_,62,_, 67,_,_,_, 64,_,59,_, 62,_,_,_,
            67,_,71,_, 74,_,71,67, 64,_,67,_, _,_,_,_,  62,_,59,_, 64,_,67,_, 71,_,67,_, 64,62,59,_],
      harm: [_,_,_,_, 59,_,_,_, _,_,_,_, 55,_,_,_], harmPeak: 0.045, harmWave: 'triangle' },

    // ---- boss theme B: frantic, descending-chromatic dread ----
    boss2: { bpm: 96, drums: 'heavy', swing: 0.06, padWave: 'sawtooth', leadWave: 'square', cut: 1950, choir: true,
      bars: [[57,60,63,68],[56,59,62,67],[55,58,61,66],[54,57,60,65],[57,60,63,68],[53,56,59,64],[52,55,58,63],[51,54,57,62]],
      keys: [K,_,_,K, _,K,_,_, K,_,_,K, _,K,_,_], keyLen: 1.2, keyPeak: 0.06,
      stabs: [K,_,K,_, K,_,K,_, K,_,K,_, K,_,K,_],
      bassP: [0,_,0,_, 0,_,0,_, 0,_,0,_, 0,_,7,_], bassPeak: 0.38, bassLen: 1.0,
      leadADSR: { a: 0.005, d: 0.14, s: 0.3, r: 0.2 }, leadPeak: 0.09,
      mel: [69,_,68,_, 67,_,_,_, 68,_,69,_, 68,_,67,_,  66,_,65,_, 64,_,_,_, 63,_,62,_, 63,_,_,_,
            72,_,71,_, 68,_,_,_, 69,_,67,_, 68,_,_,_,  66,_,63,_, 64,_,_,_, 62,_,59,_, 57,_,_,_],
      harm: [_,_,_,_, 60,_,_,_, _,_,_,_, 57,_,_,_], harmPeak: 0.05 },
  };
  let battleIdx = 0; const BATTLE_THEMES = ['battle', 'battle2', 'battle3'];
  function battleTheme() { const tk = BATTLE_THEMES[battleIdx % BATTLE_THEMES.length]; battleIdx++; return tk; }
  let bossIdx = 0; const BOSS_THEMES = ['boss', 'boss2'];
  function bossTheme() { const tk = BOSS_THEMES[bossIdx % BOSS_THEMES.length]; bossIdx++; return tk; }

  let current = null, sched = null, nextTime = 0, step = 0, bar = 0, gstep = 0, _after = 'island';
  const STEPS = 16;

  function drumStep(tk, step, time, beat, sw) {
    const d = tk.drums; if (!d || d === 'none') return;
    // swung hats
    if (d !== 'sparse') { if (step % 2 === 0) hat(time, musicBus, { peak: 0.05 }); else hat(time + sw, musicBus, { peak: 0.035 }); }
    else if (step === 2 || step === 10) hat(time, musicBus, { peak: 0.04 });
    // boom-bap kick + backbeat snare (beats 2 & 4 = steps 4 & 12)
    if (d === 'triphop' || d === 'heavy') {
      if (step === 0 || step === 10) kick(time);
      if (d === 'heavy' && step === 7) kick(time, musicBus, { peak: 0.4 });
      if (step === 4 || step === 12) snare(time);
      if (step === 14) snare(time + sw, musicBus, { peak: 0.08 });          // ghost note
      if (step === 14) hat(time + sw, musicBus, { open: true, peak: 0.05 }); // open-hat lift
    } else if (d === 'soft') {
      if (step === 0) kick(time, musicBus, { peak: 0.42 });
      if (step === 8) snare(time, musicBus, { peak: 0.12 });
    }
  }
  function scheduleStep(tk, time) {
    const chord = tk.bars[bar % tk.bars.length];
    const beat = 60 / tk.bpm / 4;                                   // 16th-note duration
    const sw = (step % 2 === 1) ? beat * (tk.swing != null ? tk.swing : 0.18) : 0; // lay back the off-beats
    const t = time + sw;
    // slow chord wash at bar start
    if (step === 0) chord.forEach(n => voice(midi(n - 12), time, beat * STEPS, { type: tk.padWave, peak: 0.035, cutoff: tk.cut, a: 0.5, d: 0.8, s: 0.8, r: 1.2 }));
    // breathy choir/atmos pad (boss/date/intro)
    if (tk.choir && step === 0) chord.forEach(n => voice(midi(n + 12), time, beat * STEPS, { type: 'sine', detune: 7, peak: 0.04, cutoff: 3000, a: 0.8, d: 0.9, s: 0.85, r: 1.4 }));
    const hum = () => (Math.random() - 0.5) * 0.014;   // micro-timing so it's not robotic
    const vel = () => 0.82 + Math.random() * 0.36;      // velocity variation
    // electric-piano comping — the trip-hop heart
    if (tk.keys && tk.keys[step]) chord.forEach(n => epiano(midi(n + (tk.keysOct || 0)), t + hum(), beat * (tk.keyLen || 3), { peak: (tk.keyPeak || 0.07) * vel(), cutoff: tk.cut + 600 }));
    // dark filtered stabs (battle/boss)
    if (tk.stabs && tk.stabs[step]) chord.forEach(n => voice(midi(n), t + hum(), beat * 1.6, { type: 'sawtooth', detune: 10, peak: 0.06, cutoff: 1300, a: 0.02, d: 0.18, s: 0.4, r: 0.3 }));
    // deep sub bass
    const bp = tk.bassP[step]; if (bp !== _) subBass(midi(chord[0] - 24 + bp), t, beat * (tk.bassLen || 3.4), { peak: tk.bassPeak || 0.3 });
    // sparse, reverbed lead (loops on its own length); leadADSR lets a track pluck (lyre) instead of sustain
    const note = tk.mel[gstep % tk.mel.length];
    if (note) { const la = tk.leadADSR || { a: 0.02, d: 0.2, s: 0.4, r: 0.45 }; voice(midi(note), t + hum(), beat * (tk.leadDur || 2.0), { type: tk.leadWave, peak: (tk.leadPeak || 0.08) * vel(), cutoff: tk.cut + 500, a: la.a, d: la.d, s: la.s, r: la.r, echo: 0.32 }); }
    // optional counter-melody / harmony line (fuller, more interesting battle themes)
    if (tk.harm) { const hn = tk.harm[gstep % tk.harm.length]; if (hn) voice(midi(hn), t, beat * 1.5, { type: tk.harmWave || tk.leadWave, peak: tk.harmPeak || 0.05, cutoff: tk.cut + 200, a: 0.02, d: 0.18, s: 0.32, r: 0.4 }); }
    // drums
    drumStep(tk, step, time, beat, sw);
    step++; gstep++; if (step >= STEPS) { step = 0; bar++; if (tk.once && bar >= tk.bars.length) { current = null; setTimeout(() => play(_after), 150); } }
  }
  function tick() {
    if (!ctx || !current) return; const tk = TRACKS[current]; const beat = 60 / tk.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) { scheduleStep(tk, nextTime); nextTime += beat; }
  }
  function play(name, after) {
    ensure(); startTexture(); if (after) _after = after; if (current === name) return;
    current = name; step = 0; bar = 0; gstep = 0; nextTime = ctx.currentTime + 0.06;
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0.0001, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.25);
    if (!sched) sched = setInterval(tick, 25);
  }
  function start() { ensure(); if (ctx.state === 'suspended') ctx.resume(); }
  function toggle() { ensure(); muted = !muted; master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05); return muted; }

  window.Music = { play, start, toggle, battleTheme, bossTheme, isMuted: () => muted, context: () => { ensure(); return ctx; }, get _after() { return _after; }, set _after(v) { _after = v; } };

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
        case 'slash': noise(t, 0.14, { cutoff: 6000, hp: true, peak: 0.2, dest: sfxBus() }); blip(520, t, 0.1, 'square', 0.1, 180); break;        // whoosh of a blade
        case 'thunder': blip(120, t, 0.3, 'sawtooth', 0.24, 60); noise(t, 0.22, { cutoff: 5000, hp: true, peak: 0.22, dest: sfxBus() }); blip(1400, t, 0.06, 'square', 0.14); break; // crack + boom
        case 'earth': blip(90, t, 0.35, 'sine', 0.28, 40); noise(t, 0.3, { cutoff: 600, peak: 0.18, dest: sfxBus() }); break;                    // low rumble/thud
        case 'holy': [784, 988, 1319, 1568].forEach((f, i) => blip(f, t + i * 0.05, 0.3, 'sine', 0.1)); break;                                   // radiant chime
        case 'dark': blip(300, t, 0.5, 'sawtooth', 0.18, 60); blip(150, t + 0.05, 0.45, 'triangle', 0.14, 50); break;                            // descending void
        case 'smash': noise(t, 0.18, { cutoff: 3200, peak: 0.26, dest: sfxBus() }); blip(240, t, 0.12, 'square', 0.16, 90); blip(520, t, 0.06, 'triangle', 0.1); break; // pot shatter
        case 'cut': noise(t, 0.1, { cutoff: 7000, hp: true, peak: 0.14, dest: sfxBus() }); break;                                                // grass snip
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
