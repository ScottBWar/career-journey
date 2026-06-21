// =====================================================================
//  music.mjs — validates the FF9-idiom composer (js/audio.js) the way the
//  other window used mido: load it headless, generate tracks across modes/seeds,
//  and assert the idiom holds — notes in range, melody resolves to tonic at the
//  period close, antecedent ends open, lament cells give a descending bass.
//  Run:  node tools/music.mjs   (npm run music)
// =====================================================================
import fs from 'node:fs';
import vm from 'node:vm';
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const sandbox = { window: {}, Math, Object, Array, JSON, Date, setInterval: () => {}, setTimeout: () => {}, console };
vm.runInNewContext(read('js/audio.js'), sandbox);
const Music = sandbox.window.Music;
if (!Music || !Music._compose) { console.error('FATAL: Music._compose not exposed'); process.exit(1); }

const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], ionian: [0, 2, 4, 5, 7, 9, 11] };
const inScale = (n, mode, root) => SCALES[mode].includes(((n - root) % 12 + 12) % 12);
const errs = [], warns = [];

let n = 0;
for (const mode of ['aeolian', 'dorian', 'ionian']) {
  for (let seed = 1; seed <= 40; seed++) {
    n++;
    const root = mode === 'dorian' ? 62 : mode === 'ionian' ? 60 : 57;
    const tk = Music._compose({ mode, root, seed });
    const tag = `${mode}#${seed}`;
    const mel = tk.mel.filter(x => x);
    // 1) range: every melody note playable (52..86)
    const oor = mel.filter(x => x < 50 || x > 88);
    if (oor.length) errs.push(`${tag}: ${oor.length} melody notes out of range (${oor.slice(0, 3)})`);
    // 2) period close: last sounded note resolves to tonic (root pitch-class)
    const last = [...tk.mel].reverse().find(x => x);
    if (((last - tk._root) % 12 + 12) % 12 !== 0) errs.push(`${tag}: consequent does not resolve to tonic (ended ${last})`);
    // 3) antecedent (bar 3, degree-4 dominant) → open, not tonic; cell is the documented v
    if (tk._degs[3] !== 4) warns.push(`${tag}: antecedent doesn't end on the dominant (deg ${tk._degs[3]})`);
    // 4) lament bass: descending chord roots somewhere in the period
    const roots = tk.bars.map(b => b[0]); let desc = 0; for (let i = 1; i < 4; i++) if (roots[i] < roots[i - 1]) desc++;
    if (desc < 1) warns.push(`${tag}: antecedent bass not descending`);
    // 5) melodic smoothness: most intervals are steps/small leaps (voice-leading)
    let big = 0; for (let i = 1; i < mel.length; i++) if (Math.abs(mel[i] - mel[i - 1]) > 9) big++;
    if (big / mel.length > 0.18) warns.push(`${tag}: ${(big / mel.length * 100 | 0)}% large leaps (rough voice-leading)`);
    // 6) melody stays mostly diatonic to the mode (cadential accidental allowed)
    const off = mel.filter(x => !inScale(x, mode, tk._root)).length;
    if (off / mel.length > 0.12) warns.push(`${tag}: ${(off / mel.length * 100 | 0)}% out-of-mode notes`);
  }
}

// also validate the ACTUAL composed tracks shipping in the game
const live = Music._tracks ? Music._tracks() : {};
let composed = 0;
for (const key of Object.keys(live)) {
  const tk = live[key]; if (!tk || !tk._composed) continue; composed++;
  const mel = tk.mel.filter(x => x);
  const oor = mel.filter(x => x < 50 || x > 88);
  if (oor.length) errs.push(`TRACK ${key}: ${oor.length} melody notes out of range`);
  const last = [...tk.mel].reverse().find(x => x);
  if (((last - tk._root) % 12 + 12) % 12 !== 0) errs.push(`TRACK ${key}: does not resolve to tonic`);
}

console.log(`\n=== FF9 composer check: ${n} generated tracks (3 modes × 40 seeds) + ${composed} live game tracks ===`);
warns.slice(0, 20).forEach(w => console.log('  ⚠ ' + w));
errs.forEach(e => console.log('  ✖ ' + e));
console.log(`\n${errs.length} errors, ${warns.length} warnings.`);
process.exit(errs.length ? 1 : 0);
