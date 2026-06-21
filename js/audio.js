// =====================================================================
//  Audio — richer procedural music (layered pads + bass + arp + drums
//  through a reverb) and a small SFX engine. Still 100% synthesized,
//  no audio files, works offline.
// =====================================================================
(function () {
  let ctx = null, master = null, musicBus = null, dry = null, wet = null, conv = null, comp = null;
  let padBus = null, delaySend = null, tapeFilter = null; // production chain: tonal sub-bus, echo send, lo-fi tape lowpass
  let sfxGain = null;                       // dedicated SFX bus so SFX volume is independent of music
  let muted = false, musicVol = 0.9, sfxVol = 1;

  // soft-clip curve for analog-ish saturation/warmth (de-MIDIs the raw oscillators)
  function makeSatCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    sfxGain = ctx.createGain(); sfxGain.gain.value = sfxVol; sfxGain.connect(master); // SFX → its own gain → master
    // reverb (convolution with a procedurally-generated impulse)
    conv = ctx.createConvolver(); conv.buffer = makeImpulse(3.2, 2.5);
    dry = ctx.createGain(); dry.gain.value = 0.86;
    wet = ctx.createGain(); wet.gain.value = 0.24;          // concert-hall sheen, not a wash
    master.connect(comp);
    comp.connect(dry).connect(ctx.destination);
    comp.connect(conv).connect(wet).connect(ctx.destination);
    // music bus → light gloss → open air → master (clean & bright, like a sampled orchestra)
    musicBus = ctx.createGain(); musicBus.gain.value = 0.92;
    const sat = ctx.createWaveShaper(); sat.curve = makeSatCurve(1.3); sat.oversample = '2x'; // gentle gloss, not lo-fi grit
    tapeFilter = ctx.createBiquadFilter(); tapeFilter.type = 'lowpass'; tapeFilter.frequency.value = 9000; tapeFilter.Q.value = 0.4; // open — air & clarity
    musicBus.connect(sat); sat.connect(tapeFilter); tapeFilter.connect(master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1; const lfoG = ctx.createGain(); lfoG.gain.value = 120; lfo.connect(lfoG); lfoG.connect(tapeFilter.frequency); lfo.start(); // barely-there breathing
    // tonal sub-bus (pads/keys/bass/lead) — ducked by the kick for that sidechain "pump"
    padBus = ctx.createGain(); padBus.gain.value = 1.0; padBus.connect(musicBus);
    // tape echo send (mainly the lead)
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.26; const fb = ctx.createGain(); fb.gain.value = 0.34;
    delaySend = ctx.createGain(); delaySend.gain.value = 0.5; delaySend.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(musicBus);
  }
  // sidechain duck — the kick momentarily pushes the tonal bus down, then it swells back
  function pump(time) { if (!padBus) return; const g = padBus.gain; g.cancelScheduledValues(time); g.setValueAtTime(0.82, time); g.linearRampToValueAtTime(1.0, time + 0.16); }
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
  // ---------------- ORCHESTRAL VOICES ----------------
  // lush string section: 3 detuned saws, slow bow attack, gentle vibrato, long release
  function strings(freq, time, dur, o = {}) {
    const { peak = 0.05, cutoff = 2600, dest = padBus, a = 0.18, r = 0.9, echo = 0 } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.5;
    f.frequency.setValueAtTime(cutoff * 0.8, time); f.frequency.linearRampToValueAtTime(cutoff, time + a + 0.3);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = freq * 0.006; vib.connect(vg);
    const oscs = [-6, 6].map(d => { const x = ctx.createOscillator(); x.type = 'sawtooth'; x.frequency.value = freq; x.detune.value = d; vg.connect(x.detune); x.connect(f); return x; });
    const hold = Math.max(a, dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.setValueAtTime(peak, time + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, time + hold + r);
    f.connect(g).connect(dest);
    if (echo && delaySend) { const eg = ctx.createGain(); eg.gain.value = echo; g.connect(eg); eg.connect(delaySend); }
    const end = time + hold + r + 0.05; vib.start(time); oscs.forEach(x => x.start(time)); vib.stop(end); oscs.forEach(x => x.stop(end));
  }
  // french horn / brass: saw+square through a swelling filter, warm body
  function brass(freq, time, dur, o = {}) {
    const { peak = 0.08, cutoff = 1900, dest = padBus, a = 0.05, r = 0.3, echo = 0 } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(cutoff * 0.5, time); f.frequency.linearRampToValueAtTime(cutoff * 1.4, time + a + 0.06); f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff), time + a + 0.3);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq; o1.detune.value = -4;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = freq; o2.detune.value = 4; const o2g = ctx.createGain(); o2g.gain.value = 0.4;
    const hold = Math.max(a, dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.setValueAtTime(peak * 0.85, time + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, time + hold + r);
    o1.connect(f); o2.connect(o2g).connect(f); f.connect(g).connect(dest);
    if (echo && delaySend) { const eg = ctx.createGain(); eg.gain.value = echo; g.connect(eg); eg.connect(delaySend); }
    const end = time + hold + r + 0.05; o1.start(time); o2.start(time); o1.stop(end); o2.stop(end);
  }
  // harp / celesta pluck: bright triangle+octave, fast attack, long shimmering decay
  function harp(freq, time, dur, o = {}) {
    const { peak = 0.09, cutoff = 4200, dest = padBus, echo = 0.2 } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.3;
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2; const o2g = ctx.createGain(); o2g.gain.value = 0.25;
    const ring = Math.max(dur, 0.6) + 0.4;
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak, time + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, time + ring);
    o1.connect(f); o2.connect(o2g).connect(f); f.connect(g).connect(dest);
    if (echo && delaySend) { const eg = ctx.createGain(); eg.gain.value = echo; g.connect(eg); eg.connect(delaySend); }
    o1.start(time); o2.start(time); o1.stop(time + ring + 0.05); o2.stop(time + ring + 0.05);
  }
  // flute / woodwind lead: pure sine body + soft octave + breath + gentle vibrato
  function flute(freq, time, dur, o = {}) {
    const { peak = 0.08, dest = padBus, a = 0.05, r = 0.25, echo = 0.25 } = o;
    const g = ctx.createGain();
    const body = ctx.createOscillator(); body.type = 'sine'; body.frequency.value = freq;
    const oct = ctx.createOscillator(); oct.type = 'sine'; oct.frequency.value = freq * 2; const og = ctx.createGain(); og.gain.value = 0.08;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = freq * 0.008; vib.connect(vg); vg.connect(body.frequency);
    const hold = Math.max(a, dur);
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak, time + a); g.gain.setValueAtTime(peak, time + hold); g.gain.exponentialRampToValueAtTime(0.0001, time + hold + r);
    body.connect(g); oct.connect(og).connect(g); g.connect(dest);
    if (echo && delaySend) { const eg = ctx.createGain(); eg.gain.value = echo; g.connect(eg); eg.connect(delaySend); }
    const end = time + hold + r + 0.05; vib.start(time); body.start(time); oct.start(time); vib.stop(end); body.stop(end); oct.stop(end);
  }
  // pizzicato string: short round pluck
  function pizz(freq, time, dur, o = {}) {
    const { peak = 0.16, dest = padBus } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 1;
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
    g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.4, dur * 0.6 + 0.12));
    o1.connect(f).connect(g).connect(dest); o1.start(time); o1.stop(time + 0.45);
  }
  // low strings (cello/contrabass): sustained, warm, woody
  function cello(freq, time, dur, o = {}) {
    const { peak = 0.18, dest = padBus, a = 0.06, r = 0.4 } = o;
    const g = ctx.createGain(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.6;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq; o1.detune.value = -5;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = 5;
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak, time + a); g.gain.setValueAtTime(peak * 0.9, time + Math.max(a, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, time + dur + r);
    o1.connect(f); o2.connect(f); f.connect(g).connect(dest);
    const end = time + dur + r + 0.05; o1.start(time); o2.start(time); o1.stop(end); o2.stop(end);
  }
  // ---- orchestral percussion ----
  function timpani(time, freq, dest = musicBus, o = {}) {
    const { peak = 0.5 } = o; pump(time);
    const oo = ctx.createOscillator(), g = ctx.createGain(); oo.type = 'sine';
    oo.frequency.setValueAtTime(freq * 1.4, time); oo.frequency.exponentialRampToValueAtTime(Math.max(30, freq), time + 0.12);
    g.gain.setValueAtTime(peak, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    oo.connect(g).connect(dest); oo.start(time); oo.stop(time + 0.55);
    noise(time, 0.04, { cutoff: 1200, peak: peak * 0.18, dest });
  }
  function cymbalSwell(time, dur, dest = musicBus, o = {}) {
    const { peak = 0.1 } = o;
    const len = Math.ceil(ctx.sampleRate * (dur + 0.1)); const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak, time + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.1);
    s.connect(f).connect(g).connect(dest); s.start(time); s.stop(time + dur + 0.12);
  }
  function crash(time, dest = musicBus, o = {}) { const { peak = 0.16 } = o; noise(time, 0.6, { cutoff: 8000, hp: true, peak, dest }); }

  // ---- drums: snare/hat retained for orchestral percussion (timpani/cymbals live above) ----
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
    // FF9 is clean concert audio — no vinyl crackle bed. Kept as a no-op so callers don't change.
    return;
  }

  // ---------------- MUSIC ----------------
  // Trip-hop beds: dusty boom-bap drums, deep sub bass, Rhodes comping, vinyl
  // crackle, lush reverb and sparse, melancholy leads — all in A-minor-ish keys.
  // One entry per 16th step (0 = rest). keys[]=Rhodes hits, stabs[]=dark stabs,
  // bassP[]=sub-bass pattern, mel[]=lead (loops on its own length). swing lays
  // the off-beats back for that head-nod feel.
  const _ = 0, K = 1;

  // ============================================================
  //  FF9-IDIOM PROCEDURAL COMPOSER
  //  Encodes Romantic-era constraints (Uematsu's idiom) rather than randomness:
  //  modal harmony (Aeolian/Dorian/Ionian) · descending LAMENT bass · balanced
  //  antecedent/consequent 8-bar PERIODS (question ends open, answer resolves to
  //  tonic) · ARCH-contour melody snapped to chord tones with stepwise passing
  //  notes & voice-leading (nearest pitch, leaps penalised) · the harmonic-minor
  //  leading tone raised ONLY at the cadential dominant · arpeggiated comp.
  //  Output is a normal TRACK so the orchestral scheduler plays it live.
  // ============================================================
  const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], ionian: [0, 2, 4, 5, 7, 9, 11] };
  function mulberry(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function sdeg(mode, root, d) { const sc = SCALES[mode] || SCALES.aeolian; return root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); }
  function clampNote(n, lo, hi) { lo = lo || 52; hi = hi || 86; while (n < lo) n += 12; while (n > hi) n -= 12; return n; }
  // antecedent cells end 'open' on the dominant (degree 4); consequent cells resolve home to i (0)
  const PROG_ANTE = { lament: [0, 6, 5, 4], vamp: [0, 5, 6, 4], rise: [0, 3, 5, 4] };  // lament = descending i–VII–VI–v
  const PROG_CONS = { fall: [5, 6, 3, 0], plagal: [3, 4, 5, 0], turn: [5, 4, 3, 0] };
  function composeMelody(mode, root, degs, rnd) {
    const STEPS = 16, BARS = degs.length, mel = new Array(STEPS * BARS).fill(0);
    const lead = root + 12, arch = [0, 2, 4, 5, 5, 4, 2, 1];   // a sung arch: rise through the period, settle at the close
    // work entirely in scale-DEGREE space so every note is diatonic; convert to MIDI only at the end
    let pd = 2;  // previous melody degree (relative to lead), start on the third
    const noteFor = d => clampNote(sdeg(mode, lead, d));
    const chordTone = (rd, lift) => {  // nearest chord tone to where we are (voice-leading), with an octave lift on the arch peak
      let best = pd, bd = 1e9;
      [rd, rd + 2, rd + 4, rd + 7].forEach(t => [-7, 0, 7].forEach(oc => { const cand = t + oc + (lift ? 7 : 0); const leap = Math.abs(cand - pd); const cost = leap + (leap > 4 ? 22 : 0); if (cost < bd) { bd = cost; best = cand; } }));
      pd = best; return noteFor(best);
    };
    const stepTone = (dir) => { pd += dir; return noteFor(pd); };   // a diatonic neighbour — always in mode
    for (let b = 0; b < BARS; b++) { const d = degs[b], i0 = b * STEPS, lift = arch[b % arch.length] > 3;
      mel[i0 + 0] = chordTone(d, lift);
      if (rnd() < 0.6) mel[i0 + 4] = stepTone(rnd() < 0.5 ? 1 : -1);
      if (rnd() < 0.8) mel[i0 + 8] = chordTone(d, lift);
      if (rnd() < 0.45) mel[i0 + 12] = stepTone(rnd() < 0.5 ? 1 : -1);
      if (rnd() < 0.3) mel[i0 + 14] = chordTone(d, false);
    }
    // PERIOD cadences: antecedent (bar 3) ends open (deg 5 or 2); consequent (last bar) resolves to tonic
    for (let s = 3 * STEPS + 1; s < 4 * STEPS; s++) mel[s] = 0;
    pd = rnd() < 0.5 ? 4 : 1; mel[3 * STEPS + 0] = noteFor(pd);
    for (let s = (BARS - 1) * STEPS + 1; s < BARS * STEPS; s++) mel[s] = 0;
    pd = 0; mel[(BARS - 1) * STEPS + 0] = noteFor(pd);
    return mel;
  }
  function compose(o) {
    o = o || {}; const mode = o.mode || 'aeolian', root = o.root || 57, rnd = mulberry(o.seed || 1);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const degs = pick(Object.values(PROG_ANTE)).concat(pick(Object.values(PROG_CONS)));
    const bars = degs.map(d => [sdeg(mode, root, d), sdeg(mode, root, d + 2), sdeg(mode, root, d + 4), sdeg(mode, root, d + 7)]);
    if (degs[3] === 4 && mode !== 'ionian') { bars[3] = bars[3].slice(); bars[3][1] += 1; }   // raise the leading tone at the cadence (v→V)
    return {
      bpm: o.bpm || 84, drums: o.drums || 'triphop', swing: o.swing != null ? o.swing : 0.16, cut: o.cut || 2400, choir: !!o.choir,
      comp: o.comp || 'harp', leadInst: o.leadInst || 'flute', bassInst: o.bassInst || 'cello',
      bars, keys: [K, _, _, K, _, _, K, _, K, _, _, K, _, _, K, _], bassP: [0, _, _, _, _, _, _, 7, 0, _, _, _, _, _, _, _],
      keyPeak: o.keyPeak || 0.05, bassPeak: o.bassPeak || 0.28, bassLen: o.bassLen || 3,
      leadADSR: o.leadADSR || { a: 0.05, d: 0.25, s: 0.6, r: 0.7 }, leadDur: o.leadDur || 1.9, leadPeak: o.leadPeak || 0.1,
      mel: composeMelody(mode, root, degs, rnd), harm: o.harm, _composed: true, _degs: degs, _mode: mode, _root: root,
    };
  }

  const TRACKS = {
    // sunny field theme — warm C-major (I–vi–IV–V) with a singable, breathing melody
    // sunny field theme — Dorian (hopeful adventure), composed in the FF9 idiom
    island: compose({ seed: 7, mode: 'dorian', root: 62, bpm: 86, drums: 'triphop', choir: true, leadInst: 'flute', comp: 'harp', bassInst: 'pizz', cut: 2600, leadDur: 1.7, leadPeak: 0.1 }),

    // open, hopeful sailing — airy Dorian, a long composed flute line over the swell
    sea: compose({ seed: 3, mode: 'dorian', root: 57, bpm: 78, drums: 'sparse', choir: true, leadInst: 'flute', comp: 'harp', bassInst: 'cello', cut: 2200, leadDur: 2.6, leadPeak: 0.09, leadADSR: { a: 0.06, d: 0.3, s: 0.7, r: 0.9 } }),

    // warm market town — Dorian, gently lilting harp + flute
    town: compose({ seed: 5, mode: 'dorian', root: 60, bpm: 90, drums: 'triphop', leadInst: 'flute', comp: 'harp', bassInst: 'pizz', cut: 2100, leadDur: 1.5, leadPeak: 0.09 }),

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
    // upbeat & kawaii — bright bouncy major-key twinkle for the mermaid dates
    date: { bpm: 110, drums: 'triphop', swing: 0.12, padWave: 'triangle', leadWave: 'square', cut: 2300,
      bars: [[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]],
      keys: [K,_,K,_, K,_,K,_, K,_,K,_, K,_,K,K], keyLen: 0.9, keyPeak: 0.07,
      bassP: [0,_,0,_, 0,_,7,_, 0,_,0,_, 7,_,7,_], bassPeak: 0.3, bassLen: 1.1,
      leadADSR: { a: 0.01, d: 0.1, s: 0.3, r: 0.3 }, leadDur: 0.45, leadPeak: 0.08,
      mel: [79,_,76,_, 79,_,84,_, 81,_,79,_, 76,_,_,_,  77,_,76,_, 77,_,81,_, 79,_,77,_, 76,_,74,_,
            72,_,76,_, 79,_,83,_, 81,_,79,_, 76,_,_,_,  74,_,77,_, 79,_,74,_, 72,_,_,_, _,_,_,_] },

    // the Coliseum of Paegina — trip-hop bed under a plucked, Phrygian lyre
    paegina: { bpm: 88, drums: 'triphop', swing: 0.16, padWave: 'triangle', leadWave: 'triangle', cut: 1900,
      bars: [[57,60,64,67],[58,62,65,69],[53,57,60,65],[55,58,62,67]],
      keys: [_,_,K,_, K,_,_,K, _,_,K,_, K,_,K,_], keyLen: 1.5, keyPeak: 0.06,
      bassP: [0,_,_,_, 0,_,7,_, 0,_,_,_, 7,_,5,_], bassPeak: 0.32,
      // fast lyre arpeggios in A-Phrygian (A Bb C D E F G)
      leadADSR: { a: 0.004, d: 0.16, s: 0.1, r: 0.16 }, leadDur: 0.9, leadPeak: 0.07,
      mel: [57,60,64, 69,67,65, 64,_, 60,64,67, 72,_,67,_, _,  58,62,65, 69,65,62, 58,_, 57,60,64, 67,64,60, 57,_,_,_] },

    // sparse, dripping dungeon dread — low Aeolian lament
    dungeon: compose({ seed: 9, mode: 'aeolian', root: 50, bpm: 68, drums: 'soft', leadInst: 'flute', comp: 'harp', bassInst: 'cello', cut: 1200, leadDur: 3, leadPeak: 0.07, bassLen: 5 }),

    // atmospheric build — Aeolian, choir-lit
    intro: compose({ seed: 11, mode: 'aeolian', root: 57, bpm: 80, drums: 'sparse', choir: true, leadInst: 'flute', comp: 'harp', bassInst: 'cello', cut: 1800, leadDur: 2.4, leadPeak: 0.08 }),

    // a warm, satisfying lift — still dusty
    victory: { bpm: 94, drums: 'triphop', swing: 0.16, padWave: 'triangle', leadWave: 'triangle', cut: 2100, once: true,
      bars: [[60,64,67,71],[57,60,64,67],[62,65,69,72],[60,64,67,72]],
      keys: [K,_,K,_, K,_,_,_, K,_,K,_, K,_,_,_], keyLen: 1.6, keyPeak: 0.085,
      bassP: [0,_,_,_, 0,_,_,_, 0,_,_,_, 0,_,_,_], bassPeak: 0.32,
      mel: [72,_,76,_, 79,_,_,_, 77,_,76,_, _,_,_,_,  72,_,76,_, 79,_,84,_, 83,_,_,_, _,_,_,_], leadPeak: 0.09 },

    // cinematic cutscene bed — slow, emotional, drumless Aeolian lament, strings + flute
    cutscene: compose({ seed: 4, mode: 'aeolian', root: 57, bpm: 72, drums: 'none', choir: true, leadInst: 'flute', comp: 'harp', bassInst: 'cello', cut: 1600, leadDur: 3, leadPeak: 0.075, bassLen: 5, leadADSR: { a: 0.07, d: 0.3, s: 0.65, r: 1.0 } }),

    // a bright CALL TO ADVENTURE — Ionian (major), the horizon is calling
    adventure: compose({ seed: 6, mode: 'ionian', root: 60, bpm: 92, drums: 'triphop', choir: true, leadInst: 'flute', comp: 'harp', bassInst: 'pizz', cut: 2300, leadDur: 1.5, leadPeak: 0.1 }),

    // ===== CHARACTER MEET THEMES — each riffs on its source material =====
    // Ruffy — One Piece "We Are!": fast, brassy, sunlit adventure
    theme_ruffy: { bpm: 146, drums: 'heavy', swing: 0.05, padWave: 'sawtooth', leadWave: 'square', cut: 2300, choir: true,
      bars: [[62,66,69,73],[57,61,64,68],[59,62,66,69],[55,59,62,66]],
      keys: [K,_,K,_, K,_,K,_, K,_,K,_, K,_,K,_], keyLen: 0.6, keyPeak: 0.085,
      bassP: [0,_,_,_, 0,_,7,_, 0,_,_,_, 0,_,7,_], bassPeak: 0.38, bassLen: 1.3,
      leadADSR: { a: 0.01, d: 0.12, s: 0.4, r: 0.3 }, leadDur: 0.7, leadPeak: 0.1,
      mel: [74,_,76,_, 78,_,_,_, 76,_,74,_, 73,_,_,_,  69,_,73,_, 74,_,_,_, 76,_,78,_, 81,_,_,_] },
    // Simon — Castlevania "Vampire Killer": galloping gothic minor
    theme_simon: { bpm: 132, drums: 'heavy', swing: 0.02, padWave: 'sawtooth', leadWave: 'square', cut: 2100,
      bars: [[57,60,64,67],[53,57,60,65],[55,59,62,67],[52,55,59,64]],
      keys: [K,_,K,K, _,K,_,K, K,_,K,K, _,K,_,K], keyLen: 0.5, keyPeak: 0.075,
      bassP: [0,_,0,_, 0,_,0,_, 0,_,0,_, 0,_,0,_], bassPeak: 0.36, bassLen: 0.9,
      leadADSR: { a: 0.01, d: 0.08, s: 0.35, r: 0.25 }, leadDur: 0.5, leadPeak: 0.1,
      mel: [69,_,71,_, 72,_,71,_, 69,_,68,_, 69,_,_,_,  67,_,69,_, 71,_,69,_, 67,_,65,_, 64,_,_,_] },
    // Aladdin — "Arabian Nights": swaying, exotic, snake-charmer lead
    theme_aladdin: { bpm: 100, drums: 'triphop', swing: 0.18, padWave: 'triangle', leadWave: 'triangle', cut: 1800, choir: true,
      bars: [[52,56,59,63],[53,57,60,65],[52,56,59,63],[48,52,55,60]],
      keys: [_,_,K,_, K,_,_,K, _,_,K,_, K,_,K,_], keyLen: 1.4, keyPeak: 0.07,
      bassP: [0,_,_,_, _,_,7,_, 0,_,_,_, 5,_,_,_], bassPeak: 0.3,
      leadDur: 1.2, leadPeak: 0.085,
      mel: [59,_,60,_, 59,_,56,_, 53,_,52,_, _,_,_,_,  56,_,59,_, 60,_,63,_, 60,_,59,_, 56,_,_,_] },
    // Violca — dragon-rider: soaring cinematic minor with choir
    theme_violca: { bpm: 96, drums: 'heavy', swing: 0.06, padWave: 'sawtooth', leadWave: 'triangle', cut: 2000, choir: true,
      bars: [[50,53,57,62],[46,50,53,58],[53,57,60,65],[48,52,55,60]],
      keys: [K,_,_,_, K,_,_,_, K,_,_,_, K,_,_,_], keyLen: 1.8, keyPeak: 0.085,
      bassP: [0,_,_,_, 0,_,_,_, 0,_,_,_, 0,_,_,_], bassPeak: 0.36, bassLen: 3,
      leadADSR: { a: 0.04, d: 0.2, s: 0.6, r: 0.6 }, leadDur: 1.6, leadPeak: 0.09,
      mel: [62,_,_,_, 65,_,_,_, 69,_,67,_, 65,_,_,_,  62,_,_,_, 60,_,_,_, 62,_,65,_, 69,_,_,_] },
    // Mac — The Thing (Morricone): a cold, sparse, dread heartbeat
    theme_mac: { bpm: 62, drums: 'sparse', swing: 0.1, padWave: 'sine', leadWave: 'sine', cut: 900,
      bars: [[45,48,52,55],[45,48,52,55],[44,47,51,54],[45,48,52,55]],
      keys: [K,_,_,_, _,_,_,_, K,_,_,_, _,_,_,_], keyLen: 4, keyPeak: 0.05,
      bassP: [0,_,_,0, _,_,_,_, 0,_,_,0, _,_,_,_], bassPeak: 0.34, bassLen: 1.1,
      leadDur: 2, leadPeak: 0.05,
      mel: [_,_,_,_, _,_,_,_, 52,_,_,_, _,_,51,_,  _,_,_,_, _,_,_,_, 48,_,_,_, _,_,_,_] },
    // Sané — Princess Mononoke (Hisaishi): gentle, pastoral, hopeful
    theme_sane: { bpm: 78, drums: 'soft', swing: 0.16, padWave: 'sine', leadWave: 'sine', cut: 1500, choir: true,
      bars: [[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]],
      keys: [K,_,_,_, _,_,K,_, K,_,_,_, _,_,K,_], keyLen: 2.6, keyPeak: 0.06,
      bassP: [0,_,_,_, _,_,_,_, 0,_,_,_, _,_,_,_], bassPeak: 0.26,
      leadADSR: { a: 0.06, d: 0.3, s: 0.6, r: 0.8 }, leadDur: 2.2, leadPeak: 0.075,
      mel: [72,_,_,_, 71,_,69,_, 67,_,_,_, _,_,_,_,  69,_,_,_, 67,_,64,_, 62,_,_,_, _,_,_,_] },
    // Marvyn — Hitchhiker's Guide: quirky, melancholy lounge jazz
    theme_marvyn: { bpm: 86, drums: 'triphop', swing: 0.24, padWave: 'triangle', leadWave: 'triangle', cut: 1700, choir: true,
      bars: [[50,53,57,60],[55,59,62,65],[48,52,55,59],[57,61,64,67]],
      keys: [_,_,K,_, _,K,_,_, _,_,K,_, _,K,_,_], keyLen: 1.6, keyPeak: 0.065,
      bassP: [0,_,_,_, 5,_,_,_, 0,_,_,_, 7,_,_,_], bassPeak: 0.3,
      leadDur: 1, leadPeak: 0.07,
      mel: [_,_,65,_, 64,_,62,_, _,_,60,_, _,_,_,_,  _,_,59,_, 60,_,62,_, 64,_,_,_, _,_,_,_] },
    // Quijano — Don Quixote: a proud, slightly absurd Spanish flamenco fanfare
    theme_quijano: { bpm: 112, drums: 'heavy', swing: 0.08, padWave: 'sawtooth', leadWave: 'square', cut: 1900,
      bars: [[52,55,59,64],[53,57,60,65],[52,55,59,64],[48,52,55,60]],
      keys: [K,_,K,K, _,K,K,_, K,_,K,K, _,K,K,_], keyLen: 0.5, keyPeak: 0.07,
      bassP: [0,_,_,_, 5,_,_,_, 0,_,_,_, _,_,_,_], bassPeak: 0.34, bassLen: 1,
      leadADSR: { a: 0.01, d: 0.1, s: 0.4, r: 0.3 }, leadDur: 0.8, leadPeak: 0.09,
      mel: [64,_,_,_, 64,_,63,_, 60,_,_,_, _,_,_,_,  59,_,60,_, 63,_,64,_, 64,_,_,_, _,_,_,_] },

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

  // pick orchestral instrumentation for a track (cached). heavy=battle/boss colours.
  function inst(tk) {
    const heavy = tk.drums === 'heavy';
    return {
      comp: tk.comp || (heavy ? 'staccato' : 'harp'),                       // harp arpeggios / staccato strings
      lead: tk.leadInst || (heavy ? 'brass' : 'flute'),                     // flute melody / brass calls
      bass: tk.bassInst || (heavy || tk.drums === 'triphop' ? 'pizz' : 'cello'),
      perc: tk.perc || (!tk.drums || tk.drums === 'none' ? 'none' : (heavy ? 'epic' : 'light')),
    };
  }
  // orchestral percussion: cinematic timpani + cymbals (epic) or a soft field pulse (light)
  function drumStep(tk, step, time, beat, sw, perc) {
    if (!perc || perc === 'none') return;
    const chord = tk.bars[bar % tk.bars.length]; const root = midi(chord[0] - 24);
    if (perc === 'epic') {
      if (step === 0) { timpani(time, root, musicBus, { peak: 0.5 }); if (bar === 0) crash(time, musicBus, { peak: 0.2 }); }
      if (step === 8) timpani(time, midi(chord[0] - 24 + 7), musicBus, { peak: 0.4 });
      if (step === 4 || step === 12) snare(time, musicBus, { peak: 0.16 });
      if (step === 14) snare(time + sw, musicBus, { peak: 0.1 });
      if (step % 2 === 0) hat(time, musicBus, { peak: 0.03 });
    } else { // light — soft timpani heartbeat + brushed shaker, no boom-bap
      if (step === 0) timpani(time, root, musicBus, { peak: 0.26 });
      if (step === 8) timpani(time, root, musicBus, { peak: 0.16 });
      if (step % 4 === 2) hat(time + sw, musicBus, { peak: 0.02 });
      if (bar % 4 === 3 && step === 12) cymbalSwell(time, beat * 4, musicBus, { peak: 0.05 }); // lift into the next phrase
    }
  }
  function scheduleStep(tk, time) {
    const chord = tk.bars[bar % tk.bars.length];
    const beat = 60 / tk.bpm / 4;                                   // 16th-note duration
    const sw = (step % 2 === 1) ? beat * (tk.swing != null ? tk.swing : 0.18) : 0; // lay back the off-beats
    const t = time + sw;
    const ins = tk._ins || (tk._ins = inst(tk));
    const intro = bar === 0 && !tk.once;                            // first bar = swelling intro (lighter); fanfares hit at once
    // sustained string-section bed — sits UNDER the melody (kept low so it never muds)
    if (step === 0) chord.forEach(n => strings(midi(n - 12), time, beat * STEPS, { peak: 0.02, cutoff: tk.cut + 400, a: intro ? 1.1 : 0.6, r: 1.4 }));
    // high strings / choir shimmer an octave up — a faint halo
    if (tk.choir && step === 0) chord.forEach(n => strings(midi(n + 12), time, beat * STEPS, { peak: 0.012, cutoff: 3200, a: intro ? 1.3 : 0.9, r: 1.6 }));
    const hum = () => (Math.random() - 0.5) * 0.014;   // micro-timing so it's not robotic
    const vel = () => 0.82 + Math.random() * 0.36;      // velocity variation
    // comping — harp arpeggio (rolled) / pizzicato / staccato strings
    if (tk.keys && tk.keys[step]) chord.forEach((n, i) => {
      const f = midi(n + (tk.keysOct || 0)), pk = (tk.keyPeak || 0.07) * vel(), ct = tk.cut + 600;
      if (ins.comp === 'harp') harp(f, t + hum() + i * 0.022, beat * (tk.keyLen || 3), { peak: pk * 0.8, cutoff: ct + 1300 });
      else if (ins.comp === 'pizz') pizz(f, t + hum(), beat, { peak: pk * 1.1 });
      else strings(f, t + hum(), beat * 0.8, { peak: pk * 0.6, cutoff: ct, a: 0.02, r: 0.18 });   // staccato
    });
    // brass stabs (battle/boss)
    if (tk.stabs && tk.stabs[step]) chord.forEach(n => brass(midi(n), t + hum(), beat * 1.4, { peak: 0.05, cutoff: 1700, a: 0.03, r: 0.3 }));
    // bass — pizzicato / cello, with a little sub weight underneath
    const bp = tk.bassP[step];
    if (bp !== _) {
      const bf = midi(chord[0] - 24 + bp), bpk = tk.bassPeak || 0.3, bl = beat * (tk.bassLen || 3.4);
      if (ins.bass === 'pizz') { pizz(bf, t, bl, { peak: bpk * 0.7 }); subBass(bf, t, bl, { peak: bpk * 0.45 }); }
      else if (ins.bass === 'cello') { cello(bf, t, bl, { peak: bpk * 0.7 }); subBass(bf, t, bl, { peak: bpk * 0.4 }); }
      else subBass(bf, t, bl, { peak: bpk });
    }
    // lead — flute / brass / harp (loops on its own length)
    const note = tk.mel[gstep % tk.mel.length];
    if (note && !intro) {
      const la = tk.leadADSR || { a: 0.04, d: 0.2, s: 0.5, r: 0.45 }, lf = midi(note), lpk = (tk.leadPeak || 0.08) * vel() * 1.5, ld = beat * (tk.leadDur || 2.0); // melody sits clearly on top
      if (ins.lead === 'flute') flute(lf, t + hum(), ld, { peak: lpk, a: la.a, r: la.r, echo: 0.2 });
      else if (ins.lead === 'brass') brass(lf, t + hum(), ld, { peak: lpk * 0.85, cutoff: tk.cut + 300, a: la.a, r: la.r, echo: 0.16 });
      else if (ins.lead === 'harp') harp(lf, t + hum(), ld, { peak: lpk * 1.1, echo: 0.25 });
      else voice(lf, t + hum(), ld, { type: tk.leadWave, peak: lpk, cutoff: tk.cut + 500, a: la.a, d: la.d, s: la.s, r: la.r, echo: 0.3 });
    }
    // harmony counter-line — strings under a brass lead, horns under a flute lead
    if (tk.harm && !intro) { const hn = tk.harm[gstep % tk.harm.length]; if (hn) {
      if (ins.lead === 'brass') strings(midi(hn), t, beat * 2, { peak: tk.harmPeak || 0.05, cutoff: tk.cut, a: 0.06, r: 0.5 });
      else brass(midi(hn), t, beat * 1.6, { peak: tk.harmPeak || 0.05, cutoff: tk.cut, a: 0.04, r: 0.4 });
    } }
    // percussion (held back during the intro bar)
    drumStep(tk, step, time, beat, sw, intro ? (ins.perc === 'epic' ? 'light' : 'none') : ins.perc);
    step++; gstep++; if (step >= STEPS) { step = 0; bar++; if (tk.once && bar >= tk.bars.length) { current = null; setTimeout(() => play(_after), 150); } }
  }
  function tick() {
    if (!ctx || !current) return; const tk = TRACKS[current]; const beat = 60 / tk.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) { scheduleStep(tk, nextTime); nextTime += beat; }
  }
  function play(name, after) {
    ensure(); startTexture(); if (after) _after = after; if (current === name) return;
    current = name; step = 0; bar = 0; gstep = 0; nextTime = ctx.currentTime + 0.06;
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0.0001, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(musicVol, ctx.currentTime + 0.25);
    if (!sched) sched = setInterval(tick, 25);
  }
  function start() { ensure(); if (ctx.state === 'suspended') ctx.resume(); }
  function toggle() { ensure(); muted = !muted; master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05); return muted; }

  function setMusicVolume(v) { musicVol = Math.max(0, Math.min(1, v)); if (musicBus && current) musicBus.gain.setTargetAtTime(musicVol, ctx.currentTime, 0.05); }
  function setSfxVolume(v) { sfxVol = Math.max(0, Math.min(1, v)); if (sfxGain) sfxGain.gain.setTargetAtTime(sfxVol, ctx.currentTime, 0.05); }
  window.Music = { play, start, toggle, battleTheme, bossTheme, setMusicVolume, setSfxVolume, getMusicVolume: () => musicVol, getSfxVolume: () => sfxVol, isMuted: () => muted, context: () => { ensure(); return ctx; }, _compose: compose, _tracks: () => TRACKS, get _after() { return _after; }, set _after(v) { _after = v; } };

  // ---------------- SFX ----------------
  function sfxBus() { ensure(); return sfxGain || master; }
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
