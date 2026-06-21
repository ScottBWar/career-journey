// =====================================================================
//  Sampler — optional REAL instrument samples for the music (the "soundfont"
//  half of FF9 timbre). Loads FluidR3_GM samples from the MIT-licensed MIDI.js
//  soundfont CDN as base64 (script tags → no CORS), decodes them to AudioBuffers,
//  and plays them pitched. Wired into the music voices, which fall back to the
//  synth instantly if a voice isn't loaded — so this can NEVER break audio.
//
//  ⚠ UNVERIFIED FROM THE DEV SIDE: needs the player online + the CDN reachable.
//  If it fails (offline / blocked / decode error), every voice silently uses the
//  synth, exactly as before. Toggle via Music.setSamples(false).
// =====================================================================
window.Sampler = (function () {
  // try several mirrors/formats and lock onto whichever the browser can actually reach
  const BASES = [
    'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/',
    'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
    'https://cdn.jsdelivr.net/gh/paulrosen/midi-js-soundfonts@master/FluidR3_GM/',
  ];
  const FMTS = ['-ogg.js', '-mp3.js'];
  let workingBase = null, workingFmt = null;
  // engine voice  ->  GM soundfont instrument (only the articulated parts that
  // benefit + stay short; long pads/percussion remain synth)
  const INSTR = { strings: 'string_ensemble_1', flute: 'flute', harp: 'orchestral_harp', cello: 'cello', pizz: 'pizzicato_strings', brass: 'french_horn' };
  const PCS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  let ctx = null, enabled = true, started = false;
  const buffers = {}, ready = {};

  function nameToMidi(n) { const m = /^([A-G][b#]?)(-?\d)$/.exec(n); if (!m) return null; const pc = PCS[m[1]]; if (pc == null) return null; return pc + (parseInt(m[2], 10) + 1) * 12; }

  function tryUrl(url) {
    return new Promise(res => {
      window.MIDI = window.MIDI || {}; window.MIDI.Soundfont = window.MIDI.Soundfont || {};
      const s = document.createElement('script'); s.src = url;
      s.onload = () => res(true); s.onerror = () => { s.remove(); res(false); };
      document.head.appendChild(s);
    });
  }
  async function loadScript(name) {
    if (workingBase) return tryUrl(workingBase + name + workingFmt);   // reuse the mirror that already worked
    for (const b of BASES) for (const f of FMTS) { if (await tryUrl(b + name + f)) { workingBase = b; workingFmt = f; try { console.info('[sampler] using ' + b + ' (' + f + ')'); } catch (e) {} return true; } }
    return false;
  }
  async function decode(voice, name) {
    const sf = window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[name]; if (!sf) return;
    const list = []; const keys = Object.keys(sf);
    // decode every other sampled note (pitch-shift fills the gaps) — keeps decode work modest
    for (let i = 0; i < keys.length; i += 2) {
      const nn = keys[i], midi = nameToMidi(nn); if (midi == null) continue;
      try {
        const b64 = sf[nn].split(',')[1]; const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const buf = await new Promise((ok, no) => ctx.decodeAudioData(bytes.buffer, ok, no));
        list.push({ midi, buf });
      } catch (e) { /* skip a bad sample */ }
    }
    if (list.length) { list.sort((a, b) => a.midi - b.midi); buffers[voice] = list; ready[voice] = true; }
    try { console.info('[sampler] ' + voice + ' (' + name + '): ' + (list.length ? list.length + ' samples ✓' : 'FAILED — using synth')); } catch (e) {}
  }
  async function init(audioCtx) {
    if (started || !enabled) return; started = true; ctx = audioCtx;
    for (const voice in INSTR) { try { const ok = await loadScript(INSTR[voice]); if (ok) await decode(voice, INSTR[voice]); else console.info('[sampler] ' + voice + ' script failed to load'); } catch (e) {} }
    try { console.info('[sampler] ready voices: ' + Object.keys(ready).join(', ') || '(none — all synth)'); } catch (e) {}
  }
  // play a sampled note; returns false if this voice isn't available (caller then uses synth)
  function play(voice, freq, time, dur, o) {
    if (!enabled || !ready[voice] || !ctx) return false;
    o = o || {}; const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const arr = buffers[voice]; let best = arr[0]; for (const s of arr) if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s;
    try {
      const src = ctx.createBufferSource(); src.buffer = best.buf; src.playbackRate.value = Math.pow(2, (midi - best.midi) / 12);
      if (o.loop && best.buf.duration > 0.4) { src.loop = true; src.loopStart = best.buf.duration * 0.35; src.loopEnd = best.buf.duration * 0.95; } // sustain long pad/cello notes
      const g = ctx.createGain(); const peak = o.peak || 0.3, a = o.a != null ? o.a : 0.01, r = o.r != null ? o.r : Math.min(0.5, dur * 0.3 + 0.12), hold = Math.max(a, dur);
      g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(peak, time + a); g.gain.setValueAtTime(peak, time + hold); g.gain.exponentialRampToValueAtTime(0.0001, time + hold + r);
      src.connect(g).connect(o.dest || ctx.destination); src.start(time); src.stop(time + hold + r + 0.1);
      return true;
    } catch (e) { return false; }
  }
  return { init, play, isReady: v => !!ready[v], setEnabled: v => { enabled = v; }, enabled: () => enabled, anyReady: () => Object.keys(ready).length > 0 };
})();
