// =====================================================================
//  Portraits — procedurally drawn SNES-style pixel faces for heroes and
//  villains. Portraits.url(key) returns a cached data-URL (pixelated).
// =====================================================================
window.Portraits = (function () {
  const cache = {};
  const SPEC = {
    pirate:    { type: 'pirate',    skin: '#d9a06b', hair: '#7a3b12', bg: '#7a1f1f' },
    swordsman: { type: 'soldier',   skin: '#cf9a78', hair: '#e7d27a', bg: '#2c3a52' },
    healer:    { type: 'priestess', skin: '#d9a06b', hair: '#37c0e0', bg: '#2fae9a' },
    mage:      { type: 'mage',      skin: '#caa37a', hair: '#2a2e52', eye: '#ffe066', bg: '#3a3f6b' },
    blader:    { type: 'wanderer',  skin: '#d9a06b', hair: '#e2622a', bg: '#3f7fae' },
    dragoon:   { type: 'harpooner', skin: '#c89a72', hair: '#8a7a66', bg: '#2d4742' },
    ruffy:     { type: 'rival',     skin: '#e8b48a', hair: '#161616', eye: '#1a1a1a', bg: '#b8342a' },
    simon:     { type: 'hunter',    skin: '#cf9a78', hair: '#5a3a18', eye: '#3a6a9a', bg: '#5a3a14' },
    aladdin:   { type: 'streetrat', skin: '#c08a5a', hair: '#1a1208', eye: '#2a1a10', bg: '#7a1f6a' },
    violca:    { type: 'archer',    skin: '#dcb89a', hair: '#3a2418', eye: '#8a4a6a', bg: '#2a3242' },
    selachoth: { type: 'villain',   skin: '#aebfc8', hair: '#e8eef2', eye: '#ffe08a', bg: '#16181f' },
    vampire:   { type: 'vampire',   skin: '#dfe0e8', hair: '#0a0a12', eye: '#ff2a3a', bg: '#2a0a14' },
    drifter:   { type: 'drifter',   skin: '#c89a72', hair: '#b8b0a0', eye: '#ff5e5e', bg: '#2c3a52' },
    genie:     { type: 'genie',     skin: '#2f8de0', hair: '#0a1a2a', eye: '#fff6c2', bg: '#0a2a4a' },
    skydragon: { type: 'dragon',    skin: '#5a3a6a', eye: '#ff5e3a', bg: '#160a1e' },
    medusa:    { type: 'medusa',    skin: '#cdb89a', hair: '#4a9a5a', eye: '#ffd24a', bg: '#1a3a24' },
    minotaur:  { type: 'minotaur',  skin: '#4a2e1a', eye: '#ff3a1a', bg: '#2a1810' },
    cyclops:   { type: 'cyclops',   skin: '#b08a5a', eye: '#ffffff', bg: '#3a2a18' },
    hydra:     { type: 'hydra',     skin: '#2f6b54', eye: '#ffcf3a', bg: '#08201a' },
    mac:       { type: 'survivor',  skin: '#cf9a78', hair: '#caa86a', eye: '#2a1a10', bg: '#5a6068' },
    sane:      { type: 'wolfgirl',  skin: '#dcb89a', hair: '#2a1810', eye: '#b0302a', bg: '#2f5a32' },
    marvyn:    { type: 'android',   skin: '#b8bcc4', eye: '#9fd0ff', bg: '#3a4048' },
    quijano:   { type: 'knight',    skin: '#cf9a78', hair: '#d8d0c0', eye: '#2a2a1a', bg: '#8a7a44' },
    thething:  { type: 'thing',     skin: '#9a4a5a', eye: '#ffd24a', bg: '#2a0a12' },
    forestgod: { type: 'spirit',    skin: '#dfe8d8', eye: '#9fffd0', bg: '#142a1e' },
    vogon:     { type: 'vogon',     skin: '#5a6a4a', eye: '#caa030', bg: '#2a3320' },
    windmill:  { type: 'windmill',  skin: '#b0a488', eye: '#ff5e3a', bg: '#6a5a36' },
    kraken:    { type: 'kraken',    skin: '#2f6b54', eye: '#ffe08a', bg: '#0a2018' },
    leviathan: { type: 'kraken',    skin: '#2a4a5a', eye: '#7fffd0', bg: '#08161e' },
    angler:    { type: 'kraken',    skin: '#1a2230', eye: '#aef0ff', bg: '#050d16' },
    // elemental mermaids
    ember:  { type: 'mermaid', skin: '#f0c8a8', hair: '#ff7a4a', eye: '#ffd24a', bg: '#5a1f14' },
    nerida: { type: 'mermaid', skin: '#6a4733', hair: '#3fd0e0', eye: '#9be7ff', bg: '#0e3a4a' },
    volta:  { type: 'mermaid', skin: '#f0d0b0', hair: '#ffe04a', eye: '#fff6a0', bg: '#5a4a0a' },
    gaia:   { type: 'mermaid', skin: '#c08652', hair: '#6ec06a', eye: '#cfeeb0', bg: '#1f4a18' },
    nyx:    { type: 'mermaid', skin: '#cfc0d8', hair: '#b06aff', eye: '#e0b3ff', bg: '#2a1840' },
    lumina: { type: 'mermaid', skin: '#f5e8d0', hair: '#fff3c0', eye: '#fffae0', bg: '#4a4636' },
  };
  const S = 16, CELL = 14; // pixel-art fallback (monsters) — 224px output

  function shadeHex(hex, f) { const n = parseInt(hex.slice(1), 16); const cl = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + ((1 << 24) + (cl((n >> 16) & 255) << 16) + (cl((n >> 8) & 255) << 8) + cl(n & 255)).toString(16).slice(1); }

  // smooth anime faces for the people of the world; per-type hair + accessory hooks
  const HUMANOID = { pirate: 1, soldier: 1, priestess: 1, mage: 1, wanderer: 1, harpooner: 1, rival: 1, hunter: 1, streetrat: 1, archer: 1, villain: 1, vampire: 1, drifter: 1, survivor: 1, wolfgirl: 1, knight: 1, genie: 1, mermaid: 1 };
  const STYLE = {
    pirate:    { hair: 'short', hat: 'tricorne', beard: 1 },
    soldier:   { hair: 'spiky' },
    priestess: { hair: 'long', halo: 1, hetero: 1, lashes: 1 },
    mage:      { hat: 'wizard', glow: 1, shadow: 1 },
    wanderer:  { hair: 'spiky', band: '#d83a3a' },
    harpooner: { hair: 'long', beard: 1, patch: 1 },
    rival:     { hair: 'short', straw: 1 },
    hunter:    { hair: 'short', band: '#b03030' },
    streetrat: { hair: 'short', fez: 1 },
    archer:    { hair: 'long', lashes: 1 },
    villain:   { hair: 'long', sharp: 1 },
    vampire:   { hair: 'slick', fang: 1 },
    drifter:   { hair: 'wild', scar: 1 },
    survivor:  { hood: 1, beard: 1 },
    wolfgirl:  { hair: 'wild', paint: 1, lashes: 1 },
    knight:    { helm: 1 },
    genie:     { hair: 'topknot' },
    mermaid:   { hair: 'long', tiara: 1, flower: 1, lashes: 1 },
  };

  // High-res multi-tone PIXEL face (Stardew-style): drawn on a 64x64 logical
  // grid scaled 4x with hard pixel edges. Large almond eyes w/ full soft outline
  // + catchlights, 3-tone skin, layered multi-tone hair, soft silhouette edge,
  // gendered mouths, per-type accessories + source-character flourishes.
  function pixelFace(p, mood) {
    const N = 64, PX = 4, W = N * PX;
    const cv = document.createElement('canvas'); cv.width = cv.height = W; const c = cv.getContext('2d');
    const fill = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x) * PX, Math.round(y) * PX, Math.round(w) * PX, Math.round(h) * PX); };
    const dot = (x, y, col) => fill(x, y, 1, 1, col);
    const sd = shadeHex, cx = 32, S2 = STYLE[p.type] || {}, type = p.type;
    const sk = p.skin || '#e8c0a0', skS = sd(sk, 0.86), skS2 = sd(sk, 0.74), skH = sd(sk, 1.12), skEdge = sd(sk, 0.58);
    const hair = p.hair || '#3a2a1a', hairS = sd(hair, 0.66), hairS2 = sd(hair, 0.44), hairH = sd(hair, 1.34), hairH2 = sd(hair, 1.62);
    const eyec = p.eye || '#6a4a30', bg = p.bg || '#223';
    const cloth = sd(bg, 0.78), clothH = sd(bg, 1.12);
    const fem = !!S2.lashes;
    const eyes = S2.hetero ? ['#3f86d6', '#54b04a'] : [eyec, eyec];   // Marina's Yuna heterochromia
    const lashCol = '#2e1a26';                                        // soft dark-maroon eye outline (not pure black)

    // backdrop — soft vertical gradient
    for (let y = 0; y < N; y++) fill(0, y, N, 1, sd(bg, 1.3 - (y / N) * 0.82));

    // face profile — oval crown, jaw tapering to a soft chin
    const faceTop = 18, faceBot = 55, faceMid = 33, maxHW = 13;
    const hwAt = y => { const span = y < faceMid ? (faceMid - faceTop + 4) : (faceBot - faceMid); const t = (y - faceMid) / span; let hw = Math.sqrt(Math.max(0, 1 - t * t)) * maxHW; if (y > faceMid) hw *= (1 - (y - faceMid) / (faceBot - faceMid) * 0.34); return hw; };

    // BACK HAIR mass (long/wild/slick) — behind the head, flowing to the shoulders
    const longHair = (S2.hair === 'long' || S2.hair === 'wild' || S2.hair === 'slick') && !S2.hood && !S2.helm;
    if (longHair) {
      for (let y = 16; y <= 62; y++) { let hw = 17 - Math.abs(y - 38) * 0.12; if (y > 50) hw -= (y - 50) * 0.7; hw = Math.round(Math.max(0, hw)); if (hw < 1) continue; fill(cx - hw, y, hw * 2, 1, y > 46 ? hairS2 : hairS); }
      fill(cx - 16, 24, 2, 26, hairS2); fill(cx + 14, 24, 2, 26, hairS2);  // depth strands
      fill(cx - 15, 22, 4, 1, hairH); fill(cx + 11, 22, 4, 1, hairH);      // sheen
    }

    // NECK + SHOULDERS
    fill(cx - 4, 52, 8, 5, skS); fill(cx - 5, 54, 10, 1, sd(sk, 0.72));
    for (let y = 57; y < N; y++) { const hw = 13 + (y - 57) * 2.6; fill(cx - hw, y, hw * 2, 1, cloth); }
    fill(cx - 8, 57, 16, 1, clothH);

    // FACE base + soft form shading (light upper-left) + thin colored silhouette edge
    for (let y = faceTop; y <= faceBot; y++) {
      const hw = Math.round(hwAt(y)); if (hw < 1) continue;
      fill(cx - hw, y, hw * 2, 1, sk);
      fill(cx + hw - 1, y, 1, 1, y > faceMid ? skS2 : skS);
      if (y > faceMid + 4) fill(cx + hw - 2, y, 1, 1, skS);
      if (y < faceMid + 2) fill(cx - hw, y, 1, 1, skH);
      dot(cx - hw - 1, y, skEdge); dot(cx + hw, y, skEdge);             // soft outline for separation
    }
    fill(cx - 14, 33, 2, 4, sk); fill(cx + 12, 33, 2, 4, skS);          // ears
    fill(cx - 4, faceBot - 1, 8, 1, skS); fill(cx - 3, faceBot, 6, 1, skS2); // under-chin shadow

    // EYES — large angled almond, iris-dominant, full soft outline (Stardew-style). Villains/vampires get slits.
    const slit = (type === 'villain' || type === 'vampire');
    const eyY = 31, browCol = sd(hair, 0.8);
    [-1, 1].forEach((s, i) => {
      const ex = cx + s * 6, ic = eyes[i], icS = sd(ic, 0.55), icH = sd(ic, 1.5);
      if (slit) {
        fill(ex - 3, eyY + 1, 7, 2, sd(sk, 0.5)); fill(ex - 2, eyY + 1, 5, 2, ic);
        fill(ex - 2, eyY + 1, 5, 1, icH); fill(ex, eyY + 1, 1, 2, '#140f18'); dot(ex - 1, eyY + 1, '#ffffff');
        fill(ex - 3, eyY, 7, 1, sd(eyec, 0.4)); fill(ex - 3, eyY + 3, 7, 1, sd(sk, 0.55));
        fill(ex - 3, eyY - 2, 6, 1, browCol); dot(ex + s * 3, eyY - 3, browCol);
        return;
      }
      dot(ex - 3, eyY, skS); dot(ex + 3, eyY, skS);                     // soft socket crease
      // sclera almond (narrower top & bottom)
      fill(ex - 3, eyY + 1, 7, 3, '#f7f9ff'); fill(ex - 2, eyY, 5, 1, '#f7f9ff'); fill(ex - 2, eyY + 4, 5, 1, '#e7ebf4');
      // iris (5 wide) dominates — only 1px white each side
      fill(ex - 2, eyY + 1, 5, 3, ic); fill(ex - 2, eyY + 3, 5, 1, icS); fill(ex - 2, eyY + 1, 5, 1, icH);
      fill(ex, eyY + 2, 1, 2, '#130e17');                              // pupil
      fill(ex - 2, eyY + 1, 2, 1, '#ffffff'); dot(ex + 1, eyY + 3, 'rgba(255,255,255,0.5)'); // catchlights
      // full soft outline — heavy top lash, light sides + lower lid
      fill(ex - 3, eyY, 7, 1, lashCol); fill(ex + s * 3, eyY, 1, 2, lashCol);
      dot(ex - 3, eyY + 1, lashCol); dot(ex + 3, eyY + 1, lashCol);
      fill(ex - 2, eyY + 5, 5, 1, sd(sk, 0.7));
      if (fem) { dot(ex + s * 4, eyY - 1, lashCol); dot(ex + s * 5, eyY - 2, lashCol); }  // mascara flick
      fill(ex - 3, eyY - 2, 6, 1, browCol); dot(ex + s * 3, eyY - 3, browCol);            // arched brow
      if (S2.sharp) dot(ex - s * 3, eyY - 1, browCol);
    });

    // NOSE — subtle shadow + a bridge highlight
    fill(cx + 1, 41, 1, 2, skS); dot(cx - 1, 40, skH); dot(cx, 43, sd(sk, 0.74));

    // MOUTH — feminine soft lips vs. a quiet line; ruffy gets a huge toothy grin
    const lip = '#c0697b', lipS = '#9a4a5c', lineC = sd(sk, 0.56), my = 46;
    if (type === 'rival' && mood !== 'upset') { fill(cx - 5, my, 10, 1, '#6e3424'); fill(cx - 4, my, 8, 1, '#ffffff'); fill(cx - 5, my + 1, 10, 1, '#6e3424'); }
    else if (mood === 'upset') { fill(cx - 2, my, 4, 1, lineC); dot(cx - 3, my - 1, lineC); dot(cx + 3, my - 1, lineC); }
    else if (mood === 'happy') { if (fem) { fill(cx - 2, my, 5, 1, lip); fill(cx - 1, my + 1, 3, 1, lipS); } else { fill(cx - 3, my, 6, 1, lineC); dot(cx - 4, my - 1, lineC); dot(cx + 3, my - 1, lineC); } }
    else if (mood === 'shy') { fill(cx - 1, my, 3, 1, fem ? lip : lineC); }
    else { if (fem) { fill(cx - 2, my, 4, 1, lip); dot(cx - 1, my + 1, lipS); dot(cx + 1, my + 1, lipS); } else fill(cx - 2, my, 4, 1, lineC); }
    if (S2.fang) { dot(cx - 2, my + 1, '#ffffff'); dot(cx + 2, my + 1, '#ffffff'); }

    // BLUSH / war-paint / scars
    if (mood === 'happy' || mood === 'shy' || fem) { c.fillStyle = 'rgba(255,142,156,0.4)'; c.fillRect((cx - 11) * PX, 40 * PX, 4 * PX, 2 * PX); c.fillRect((cx + 7) * PX, 40 * PX, 4 * PX, 2 * PX); }
    if (S2.paint) { fill(cx - 12, 33, 4, 1, '#b0302a'); fill(cx + 8, 33, 4, 1, '#b0302a'); fill(cx - 12, 38, 4, 1, '#b0302a'); fill(cx + 8, 38, 4, 1, '#b0302a'); } // San war stripes
    if (type === 'rival') { fill(cx - 7, 38, 3, 1, '#b05038'); dot(cx - 7, 39, '#b05038'); } // Luffy scar
    if (S2.scar) { fill(cx + 8, 26, 1, 7, '#9a5a4a'); }

    // FRONT HAIR / FRINGE — layered, multi-tone (highlight streaks + shadow roots/edges)
    if (!S2.hood && !S2.helm && !S2.hat) {
      const ht = S2.hair || 'short';
      if (ht === 'spiky') {
        fill(cx - 15, 22, 30, 5, hair);
        for (let k = -4; k <= 4; k++) { const bx = cx + k * 4, h = 11 - Math.abs(k) * 1.3; fill(bx - 1, 23 - h, 3, h + 2, k % 2 ? hairS : hair); fill(bx - 1, 23 - h, 1, Math.max(2, h - 3), hairH); }
        fill(cx - 10, 22, 14, 1, hairH); dot(cx - 6, 21, hairH2);
      } else if (ht === 'wild') {
        fill(cx - 16, 18, 32, 8, hair);
        for (let k = -5; k <= 5; k++) { const bx = cx + k * 3.4; fill(bx - 1, 13, 3, 7, (k % 2 ? hairS : hair)); fill(bx - 1, 13, 1, 3, hairH); }
        fill(cx - 16, 24, 5, 7, hair); fill(cx + 11, 24, 5, 7, hair); fill(cx - 12, 19, 8, 1, hairH);
      } else if (ht === 'slick') {
        fill(cx - 15, 18, 30, 7, hair); fill(cx - 3, 23, 6, 4, hair);                 // widow's peak
        fill(cx - 12, 20, 9, 1, hairH); fill(cx - 15, 24, 2, 6, hairS2); fill(cx + 13, 24, 2, 6, hairS2);
      } else if (ht === 'topknot') {
        fill(cx - 8, 22, 16, 4, hair); fill(cx - 3, 14, 6, 7, hair); fill(cx - 2, 23, 4, 1, hairH); fill(cx - 2, 15, 2, 4, hairH);
      } else { // short / long — soft parted fringe with sheen
        for (let y = 16; y <= 24; y++) { const hw = Math.round(hwAt(y)) + 1; fill(cx - hw, y, hw * 2, 1, hair); }
        fill(cx - 15, 24, 6, 8, hair); fill(cx + 9, 24, 6, 8, hair);                  // temple sweeps
        fill(cx - 8, 24, 6, 5, hair); fill(cx + 2, 24, 6, 5, hair);                   // inner fringe parted
        fill(cx - 1, 18, 2, 7, hairS);                                               // center part shadow
        fill(cx - 11, 20, 8, 1, hairH); fill(cx - 8, 21, 5, 1, hairH); dot(cx - 9, 22, hairH2); // diagonal sheen
        fill(cx - 14, 25, 1, 6, hairS2); fill(cx + 13, 25, 1, 6, hairS2);            // edge strands
      }
    }

    // ACCESSORIES (64px)
    if (S2.hat === 'tricorne') { for (let y = 11; y <= 19; y++) { const hw = 17 - Math.abs(y - 16); fill(cx - hw, y, hw * 2, 1, '#1d1d1d'); } fill(cx - 18, 17, 36, 4, '#1d1d1d'); fill(cx - 14, 20, 28, 1, '#2a2a2a'); fill(cx - 2, 14, 4, 3, '#f2ead9'); }
    if (S2.hat === 'wizard') { for (let y = 0; y <= 20; y++) { const hw = Math.round(y * 0.85); fill(cx - hw - 1, y, hw * 2 + 2, 1, sd(bg, 0.7)); } fill(cx - 15, 20, 30, 2, '#e0b34a'); dot(cx + 3, 5, '#fff6c2'); }
    if (S2.straw) { for (let y = 12; y <= 18; y++) { const hw = Math.round(18 - Math.abs(y - 15) * 0.6); fill(cx - hw, y, hw * 2, 1, '#e0b96a'); } fill(cx - 19, 18, 38, 1, '#c8a050'); fill(cx - 11, 15, 22, 1, '#b8342a'); }
    if (S2.band) { fill(cx - 15, 25, 30, 2, S2.band); fill(cx - 15, 25, 30, 1, sd(S2.band, 1.3)); }
    if (S2.fez) { fill(cx - 8, 12, 16, 8, '#b03030'); fill(cx - 8, 19, 16, 1, '#caa030'); fill(cx + 7, 12, 2, 7, '#caa030'); }
    if (S2.halo) { fill(cx - 11, 12, 22, 1, '#fff0a0'); dot(cx - 11, 12, sd('#fff0a0', 0.8)); dot(cx + 10, 12, sd('#fff0a0', 0.8)); }
    if (S2.helm) { for (let y = 14; y <= 26; y++) { const hw = 16 - Math.max(0, (y - 22)); fill(cx - hw, y, hw * 2, 1, '#c9cdd6'); } fill(cx - 16, 26, 32, 1, '#caa030'); fill(cx - 1, 18, 2, 11, '#9aa0aa'); }
    if (S2.hood) { for (let y = 13; y <= 30; y++) { const hw = 17 - Math.max(0, (y - 24)); fill(cx - hw, y, hw * 2, 1, cloth); } for (let y = 30; y < N; y++) { fill(cx - 17, y, 4, 1, cloth); fill(cx + 13, y, 4, 1, cloth); } fill(cx - 13, 15, 26, 1, clothH); }
    if (S2.tiara) { fill(cx - 8, 17, 16, 1, '#ffe9b0'); dot(cx, 15, '#fff6e8'); dot(cx - 6, 16, '#ffe9b0'); dot(cx + 6, 16, '#ffe9b0'); }
    if (S2.flower) { fill(cx + 10, 21, 4, 4, '#ff8ab4'); dot(cx + 11, 22, '#ffd24a'); dot(cx + 10, 21, '#ffb0d0'); }
    if (S2.beard) { for (let y = 47; y <= 55; y++) { const hw = Math.round(8 - (y - 47) * 0.7); fill(cx - hw, y, hw * 2, 1, hairS); } fill(cx - 7, 47, 14, 1, hair); }
    if (S2.patch) { fill(cx + 4, 32, 5, 5, '#1a1410'); fill(cx - 3, 30, 14, 1, '#1a1410'); }
    if (type === 'genie') { fill(cx - 3, 50, 6, 5, hairS); fill(cx - 2, 55, 4, 2, hairS); fill(cx - 15, 35, 3, 2, '#caa030'); fill(cx + 12, 35, 3, 2, '#caa030'); } // goatee + gold ear-cuffs

    return cv.toDataURL();
  }

  function draw(key, mood) {
    const p = SPEC[key]; if (!p) return null;
    if (HUMANOID[p.type]) { try { return pixelFace(p, mood); } catch (e) { /* fall through to pixel-grid renderer */ } }
    const cv = document.createElement('canvas'); cv.width = cv.height = S * CELL;
    const c = cv.getContext('2d');
    const px = (x, y, w, h, col) => { if (!col) return; c.fillStyle = col; c.fillRect(x * CELL, y * CELL, w * CELL, h * CELL); };
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r * f | 0)); g = Math.max(0, Math.min(255, g * f | 0)); b = Math.max(0, Math.min(255, b * f | 0)); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };

    // backdrop
    c.fillStyle = p.bg; c.fillRect(0, 0, S * CELL, S * CELL);
    px(0, 0, S, 1, shade(p.bg, 1.3)); px(0, S - 1, S, 1, shade(p.bg, 0.7));

    const skin = p.skin, sk2 = skin ? shade(skin, 0.82) : null;
    // head base (cols 4..11, rows 4..13) with trimmed corners
    if (p.type !== 'kraken' && p.type !== 'dragon' && p.type !== 'hydra' && p.type !== 'minotaur' && p.type !== 'thing' && p.type !== 'spirit' && p.type !== 'windmill') {
      px(4, 4, 8, 10, skin); px(4, 4, 1, 1, p.bg); px(11, 4, 1, 1, p.bg); px(4, 13, 1, 1, p.bg); px(11, 13, 1, 1, p.bg);
      px(4, 8, 1, 4, sk2); px(11, 8, 1, 4, sk2); // cheek shade
    }
    const eye = p.eye || '#1a1a1a';

    switch (p.type) {
      case 'pirate':
        px(3, 2, 10, 2, '#1c1c1c'); px(2, 3, 12, 1, '#1c1c1c'); // hat brim
        px(5, 1, 6, 1, '#1c1c1c'); px(7, 2, 2, 1, '#f2ead9'); // skull
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye); px(8, 7, 3, 2, '#1c1c1c'); // eyepatch
        px(5, 11, 5, 1, '#7a3b12'); px(6, 12, 4, 1, '#7a3b12'); // beard
        px(6, 10, 4, 1, '#9a5a2a'); break;
      case 'soldier':
        // spiky blond hair
        px(4, 2, 8, 3, p.hair); px(3, 3, 1, 2, p.hair); px(12, 3, 1, 2, p.hair);
        px(5, 1, 1, 2, p.hair); px(7, 0, 1, 3, p.hair); px(9, 1, 1, 2, p.hair); px(11, 1, 1, 2, p.hair);
        px(6, 8, 1, 2, '#3aa0d0'); px(9, 8, 1, 2, '#3aa0d0'); px(7, 11, 3, 1, sk2); break;
      case 'priestess':
        px(2, 3, 2, 9, p.hair); px(12, 3, 2, 9, p.hair); px(4, 2, 8, 2, p.hair); // long hair frame
        px(6, 0, 4, 1, '#fff6c2'); // halo
        px(6, 8, 1, 1, '#0a6a8a'); px(9, 8, 1, 1, '#0a6a8a'); px(7, 11, 3, 1, '#c06a7a'); break;
      case 'mage':
        // giant hat hides the face in shadow, glowing eyes
        px(4, 5, 8, 9, '#2a2e52'); // shadowed face
        px(2, 2, 12, 3, p.hair); px(1, 4, 14, 1, p.hair); px(6, 0, 4, 2, p.hair); // floppy hat
        px(2, 4, 12, 1, '#e0b34a'); // band
        px(6, 9, 1, 1, eye); px(9, 9, 1, 1, eye); px(6, 9, 1, 1, eye); break;
      case 'wanderer':
        px(4, 3, 8, 2, p.hair); px(5, 2, 1, 2, p.hair); px(7, 1, 1, 3, p.hair); px(9, 2, 1, 2, p.hair); px(11, 2, 1, 2, p.hair);
        px(4, 5, 8, 1, '#d83a3a'); // headband
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye); px(7, 11, 3, 1, sk2); break;
      case 'dragoon':
        px(3, 3, 10, 3, '#c9d2dc'); px(4, 2, 8, 1, '#c9d2dc'); // helm
        px(3, 3, 1, 2, '#e0b34a'); px(12, 3, 1, 2, '#e0b34a'); // wings
        px(2, 3, 1, 1, '#e0b34a'); px(13, 3, 1, 1, '#e0b34a');
        px(7, 4, 2, 1, '#ff5e5e'); // gem
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye); px(7, 11, 3, 1, sk2); break;
      case 'villain':
        // long silver hair, pale skin, gold slit eyes, menacing
        px(2, 2, 2, 12, p.hair); px(12, 2, 2, 12, p.hair); px(4, 1, 8, 3, p.hair);
        px(5, 4, 2, 2, p.hair); px(9, 4, 2, 2, p.hair); // bangs
        px(6, 8, 1, 2, eye); px(9, 8, 1, 2, eye); // slit eyes
        px(5, 8, 1, 1, shade(eye, 0.6)); px(10, 8, 1, 1, shade(eye, 0.6));
        px(6, 11, 4, 1, '#7a8a92'); // cold grin
        px(3, 12, 1, 2, '#1a1d24'); px(12, 12, 1, 2, '#1a1d24'); break;
      case 'rival':
        px(4, 4, 8, 2, p.hair); px(3, 5, 1, 1, p.hair); px(12, 5, 1, 1, p.hair); // messy black hair under hat
        px(1, 3, 14, 1, '#d8b15a'); px(0, 4, 16, 1, '#caa24a'); // wide straw brim
        px(4, 1, 8, 2, '#e8c878'); px(4, 2, 8, 1, '#c0392c'); px(5, 0, 6, 1, '#e8c878'); // dome + red band
        px(6, 8, 1, 1, '#1a1a1a'); px(9, 8, 1, 1, '#1a1a1a'); // eyes
        px(6, 9, 1, 1, '#c0533a'); // scar under left eye
        px(5, 11, 6, 1, '#3a2018'); px(6, 11, 4, 1, '#ffffff'); // big toothy grin
        break;
      case 'hunter':
        // long brown hair, red headband, steely determined eyes
        px(3, 3, 2, 10, p.hair); px(11, 3, 2, 10, p.hair); px(4, 2, 8, 2, p.hair);
        px(4, 4, 8, 1, '#b03030'); px(4, 5, 8, 1, '#8a2424'); // headband
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye); px(5, 7, 2, 1, '#3a2a2a'); px(9, 7, 2, 1, '#3a2a2a');
        px(7, 11, 3, 1, sk2); px(7, 12, 2, 1, '#8a5a3a'); break;
      case 'vampire':
        // slicked black hair with widow's peak, blood-red eyes, fangs, high collar
        px(3, 2, 10, 3, p.hair); px(2, 3, 1, 3, p.hair); px(13, 3, 1, 3, p.hair);
        px(7, 4, 2, 2, p.hair); // widow's peak
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye); px(6, 8, 1, 1, eye);
        px(5, 8, 1, 1, shade(eye, 0.5)); px(10, 8, 1, 1, shade(eye, 0.5)); // glow
        px(6, 7, 1, 1, p.hair); px(9, 7, 1, 1, p.hair); // sharp brows
        px(6, 11, 4, 1, '#7a2230'); px(7, 12, 1, 1, '#ffffff'); px(8, 12, 1, 1, '#ffffff'); // grin + fangs
        px(2, 12, 3, 2, '#7a1f2f'); px(11, 12, 3, 2, '#7a1f2f'); px(4, 13, 8, 1, '#3a0a18'); break; // cape collar
      case 'drifter':
        // golden visor, wild grey hair, glowing red eyes, a magpie of blades
        px(3, 2, 10, 3, p.hair); px(2, 3, 1, 3, p.hair); px(13, 3, 1, 3, p.hair);
        px(4, 7, 8, 2, '#caa030'); px(4, 7, 8, 1, '#e0c050'); // golden visor band
        px(6, 7, 1, 2, eye); px(9, 7, 1, 2, eye); // glowing eyes through visor
        px(7, 11, 3, 1, sk2); px(7, 12, 2, 1, '#8a5a3a');
        px(2, 12, 1, 3, '#cfd8e4'); px(13, 12, 1, 3, '#cfd8e4'); // crossed blades at shoulders
        px(1, 13, 1, 2, '#caa030'); px(14, 13, 1, 2, '#caa030'); break;
      case 'streetrat':
        // black hair, red fez with gold band + tassel, easy grin
        px(4, 3, 8, 2, p.hair); px(3, 4, 1, 1, p.hair); px(12, 4, 1, 1, p.hair);
        px(4, 1, 8, 2, '#b03030'); px(4, 2, 8, 1, '#caa030'); px(11, 1, 1, 2, '#caa030'); // fez + band + tassel
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye);
        px(6, 11, 5, 1, '#7a4a2a'); px(6, 11, 5, 1, '#fff'); px(6, 12, 5, 1, '#7a4a2a'); break; // toothy grin
      case 'archer':
        // long braided hair swept to one side, edgy half-lidded eyes, smirk
        px(2, 2, 2, 11, p.hair); px(12, 2, 2, 9, p.hair); px(4, 1, 8, 3, p.hair);
        px(2, 11, 1, 4, p.hair); px(1, 12, 1, 3, p.hair); // braid down one side
        px(5, 4, 2, 1, p.hair); px(9, 4, 2, 1, p.hair); // bangs
        px(5, 8, 1, 1, '#3a2a2a'); px(9, 8, 1, 1, '#3a2a2a'); // shadowed lids
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye);
        px(7, 11, 3, 1, '#b06a7a'); px(9, 11, 1, 1, '#9a4a5a'); break; // asymmetric smirk
      case 'genie':
        // blue face (skin already blue), gold brows, white glowing eyes, topknot, goatee
        px(5, 3, 6, 2, p.hair); px(7, 1, 2, 2, p.hair); // hair + topknot
        px(5, 6, 2, 1, '#caa030'); px(9, 6, 2, 1, '#caa030'); // gold brows
        px(5, 8, 2, 1, eye); px(9, 8, 2, 1, eye); px(5, 8, 1, 1, '#fff'); px(10, 8, 1, 1, '#fff'); // glowing eyes
        px(6, 11, 4, 1, '#0a2a4a'); px(6, 12, 4, 1, p.hair); px(7, 13, 2, 1, p.hair); // grin + goatee
        px(2, 8, 2, 1, '#caa030'); px(12, 8, 2, 1, '#caa030'); break; // gold ear-cuffs
      case 'dragon':
        // reptilian: scaled head, snout, horns, glowing eyes, fangs
        px(4, 4, 8, 8, p.skin); px(4, 4, 1, 1, p.bg); px(11, 4, 1, 1, p.bg);
        px(5, 11, 6, 3, p.skin); px(6, 13, 4, 1, p.bg); // long snout
        px(3, 2, 2, 3, '#caa030'); px(11, 2, 2, 3, '#caa030'); // horns
        px(2, 3, 1, 2, '#caa030'); px(13, 3, 1, 2, '#caa030');
        px(5, 7, 2, 2, eye); px(9, 7, 2, 2, eye); px(5, 7, 1, 1, '#fff'); px(9, 7, 1, 1, '#fff'); // slit glowing eyes
        px(5, 6, 2, 1, shade(p.skin, 0.6)); px(9, 6, 2, 1, shade(p.skin, 0.6)); // brow ridges
        px(5, 12, 1, 1, '#fff'); px(7, 13, 1, 1, '#fff'); px(9, 13, 1, 1, '#fff'); px(10, 12, 1, 1, '#fff'); break; // fangs
      case 'medusa':
        // human face haloed by writhing green serpents, gold slit eyes
        for (let i = 0; i < 7; i++) { const hx = 2 + i * 1.7; px(hx | 0, 1 + (i % 2), 1, 2, p.hair); px((hx | 0) - (i % 2), 0, 1, 1, shade(p.hair, 1.3)); }
        px(3, 2, 10, 2, p.hair);
        px(6, 8, 1, 2, eye); px(9, 8, 1, 2, eye); px(5, 8, 1, 1, shade(eye, 0.6)); px(10, 8, 1, 1, shade(eye, 0.6));
        px(6, 11, 4, 1, '#7a4a52'); px(7, 12, 2, 1, '#9a4a5a'); break;
      case 'minotaur':
        // bull head: fur, huge horns, snout, burning eyes
        px(4, 4, 8, 8, p.skin); px(3, 5, 1, 5, p.skin); px(12, 5, 1, 5, p.skin);
        px(1, 3, 3, 2, '#e8e0d0'); px(12, 3, 3, 2, '#e8e0d0'); px(0, 2, 2, 2, '#e8e0d0'); px(14, 2, 2, 2, '#e8e0d0'); // horns
        px(5, 11, 6, 3, shade(p.skin, 1.2)); px(6, 13, 4, 1, '#1a1208'); // snout
        px(6, 12, 1, 1, '#fff'); px(9, 12, 1, 1, '#fff'); // nostrils
        px(5, 7, 2, 2, eye); px(9, 7, 2, 2, eye); px(5, 7, 1, 1, '#fff'); px(9, 7, 1, 1, '#fff'); break;
      case 'cyclops':
        // one huge central eye
        px(4, 5, 8, 8, p.skin); px(4, 5, 1, 1, p.bg); px(11, 5, 1, 1, p.bg);
        px(6, 7, 4, 4, '#ffffff'); px(7, 8, 2, 2, '#3a1a0a'); px(7, 8, 1, 1, '#000'); // big eye + pupil
        px(5, 6, 6, 1, shade(p.skin, 0.6)); // brow
        px(6, 12, 4, 1, '#6a4a2a'); break;
      case 'hydra':
        // three serpent heads on long necks
        [3, 7, 11].forEach((hx, i) => {
          px(hx, 13 - i % 2, 2, 3, p.skin); // neck
          px(hx - 1, 9 - i % 2, 4, 3, p.skin); // head
          px(hx - 1, 12 - i % 2, 4, 1, '#5a0a14'); // maw
          px(hx, 10 - i % 2, 1, 1, eye); px(hx + 2, 10 - i % 2, 1, 1, eye);
        });
        px(2, 2, 12, 1, shade(p.skin, 1.2)); break;
      case 'survivor': // Mac — fur-hood parka, beard, weathered
        px(2, 2, 12, 4, '#d8d0c0'); px(1, 4, 1, 6, '#d8d0c0'); px(14, 4, 1, 6, '#d8d0c0'); // fur hood ruff
        px(5, 1, 6, 2, p.bg); // beanie
        px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye);
        px(5, 11, 6, 3, p.hair); px(6, 12, 4, 1, '#8a6a3a'); break; // big beard
      case 'wolfgirl': // Sané — black hair frame, red war-paint, fierce
        px(2, 2, 2, 12, p.hair); px(12, 2, 2, 12, p.hair); px(4, 1, 8, 3, p.hair);
        px(4, 7, 8, 1, '#b0302a'); px(4, 8, 8, 1, '#8a2420'); // war-paint band across the eyes
        px(6, 8, 1, 1, '#1a1a1a'); px(9, 8, 1, 1, '#1a1a1a');
        px(5, 6, 2, 1, p.hair); px(9, 6, 2, 1, p.hair); // sharp brows
        px(7, 11, 3, 1, '#b06a7a'); break;
      case 'android': // Marvyn — round metal head, sad glowing eyes, antenna
        px(4, 4, 8, 8, p.skin); px(4, 4, 1, 1, p.bg); px(11, 4, 1, 1, p.bg); px(4, 11, 1, 1, p.bg); px(11, 11, 1, 1, p.bg);
        px(7, 1, 2, 2, '#5a6068'); px(7, 0, 2, 1, eye); // antenna
        px(5, 7, 2, 2, eye); px(9, 7, 2, 2, eye); px(5, 7, 1, 1, '#fff'); px(9, 7, 1, 1, '#fff');
        px(6, 11, 4, 1, '#3a4048'); break; // flat frown
      case 'knight': // Quijano — brass basin helm, gaunt face, long beard
        px(4, 2, 8, 3, '#caa030'); px(3, 4, 10, 1, '#caa030'); px(2, 5, 12, 1, '#b8902a'); // basin helm + brim
        px(5, 6, 6, 6, p.skin); px(6, 8, 1, 1, eye); px(9, 8, 1, 1, eye);
        px(5, 11, 6, 3, p.hair); px(6, 13, 4, 1, p.hair); break; // long white beard
      case 'thing': // assimilated horror — mouths, a stray staring eye
        px(3, 3, 10, 10, p.skin); px(3, 3, 1, 1, p.bg); px(12, 3, 1, 1, p.bg);
        px(4, 6, 3, 2, '#2a0508'); px(9, 9, 3, 2, '#2a0508'); px(7, 4, 2, 1, '#2a0508'); // screaming mouths
        px(4, 6, 1, 1, '#fff'); px(6, 6, 1, 1, '#fff'); px(9, 9, 1, 1, '#fff'); px(11, 9, 1, 1, '#fff'); // teeth glints
        px(9, 5, 2, 2, '#e8e0d0'); px(10, 5, 1, 1, eye); // one human eye, wrong
        px(2, 13, 2, 2, shade(p.skin, 0.7)); px(12, 12, 2, 2, shade(p.skin, 0.7)); break; // oozing limbs
      case 'spirit': // Forest God — pale antlered deer-face, glowing eyes
        px(0, 1, 4, 4, '#e8e0c8'); px(12, 1, 4, 4, '#e8e0c8'); px(1, 0, 2, 2, '#e8e0c8'); px(13, 0, 2, 2, '#e8e0c8'); // antlers
        px(5, 4, 6, 7, p.skin); px(6, 11, 4, 3, p.skin); // long pale face
        px(6, 7, 1, 2, eye); px(9, 7, 1, 2, eye); px(5, 7, 1, 1, shade(eye, 0.6)); px(10, 7, 1, 1, shade(eye, 0.6));
        px(7, 13, 2, 1, '#1a2a1e'); px(4, 9, 1, 3, '#1a0a18'); break; // a creep of corruption
      case 'vogon': // bloated bureaucrat
        px(3, 4, 10, 8, p.skin); px(3, 4, 1, 1, p.bg); px(12, 4, 1, 1, p.bg);
        px(2, 8, 2, 4, shade(p.skin, 0.85)); px(12, 8, 2, 4, shade(p.skin, 0.85)); // droopy jowls
        px(5, 7, 2, 1, eye); px(9, 7, 2, 1, eye);
        px(5, 6, 2, 1, shade(p.skin, 0.7)); px(9, 6, 2, 1, shade(p.skin, 0.7)); // heavy brow
        px(5, 11, 6, 1, '#2a0a0a'); break; // grim slot of a mouth
      case 'windmill': // the "giant" — a stone mill with a face & sails
        px(5, 4, 6, 10, p.skin); px(4, 3, 8, 2, '#7a3a2a'); // tower + roof cap
        px(2, 1, 3, 1, '#e8e0d0'); px(11, 1, 3, 1, '#e8e0d0'); px(7, 0, 2, 3, '#6b4423'); px(1, 7, 2, 2, '#e8e0d0'); px(13, 7, 2, 2, '#e8e0d0'); // sail-arms
        px(6, 6, 1, 2, eye); px(9, 6, 1, 2, eye); // window "eyes"
        px(7, 11, 2, 3, '#3a2410'); break; // door "mouth"
      case 'harpooner':
        px(2, 3, 2, 11, p.hair); px(12, 3, 2, 11, p.hair); px(4, 2, 8, 2, p.hair); // long weathered hair
        px(4, 11, 8, 3, p.hair); px(4, 10, 8, 1, shade(p.hair, 1.1)); // big beard
        px(5, 8, 1, 1, '#1a1a1a'); // left eye
        px(8, 7, 3, 2, '#15110c'); px(7, 8, 1, 1, p.hair); px(7, 7, 6, 1, shade(p.bg, 0.7)); // eyepatch + strap
        px(6, 10, 4, 1, '#7a3b2a'); // mouth in beard
        break;
      case 'mermaid':
        px(2, 2, 2, 12, p.hair); px(12, 2, 2, 12, p.hair); px(4, 1, 8, 3, p.hair); // flowing hair
        px(3, 12, 1, 3, p.hair); px(12, 12, 1, 3, p.hair);
        px(7, 2, 2, 1, '#ffffff'); px(6, 3, 4, 1, shade(p.hair, 1.3)); // shell tiara
        px(5, 8, 2, 2, '#ffffff'); px(9, 8, 2, 2, '#ffffff'); // big eyes
        px(6, 8, 1, 2, eye); px(9, 8, 1, 2, eye); px(6, 8, 1, 1, '#1a1a1a'); px(9, 8, 1, 1, '#1a1a1a');
        px(5, 7, 2, 1, '#3a2a2a'); px(9, 7, 2, 1, '#3a2a2a'); // lashes
        // expression
        if (mood === 'happy') { px(6, 11, 4, 1, '#e06a8a'); px(6, 12, 4, 1, '#c0466a'); px(3, 9, 2, 1, '#ff9ab0'); px(11, 9, 2, 1, '#ff9ab0'); }
        else if (mood === 'shy') { px(7, 11, 2, 1, '#e06a8a'); px(3, 9, 2, 1, '#ff9ab0'); px(11, 9, 2, 1, '#ff9ab0'); }
        else if (mood === 'upset') { px(6, 7, 2, 1, '#3a2a2a'); px(9, 7, 2, 1, '#3a2a2a'); px(6, 12, 4, 1, '#9a4a5a'); }
        else px(7, 11, 2, 1, '#e06a8a'); // neutral lips
        px(6, 13, 4, 1, shade(p.hair, 0.8)); break;
      case 'kraken':
        px(3, 3, 10, 10, p.skin); px(3, 3, 1, 1, p.bg); px(12, 3, 1, 1, p.bg); px(3, 12, 1, 1, p.bg); px(12, 12, 1, 1, p.bg);
        px(5, 6, 2, 2, eye); px(9, 6, 2, 2, eye); px(5, 6, 1, 1, '#000'); px(9, 6, 1, 1, '#000');
        // tentacles
        px(2, 13, 1, 2, shade(p.skin, 0.8)); px(5, 13, 1, 3, shade(p.skin, 0.8)); px(8, 13, 1, 3, shade(p.skin, 0.8)); px(11, 13, 1, 2, shade(p.skin, 0.8)); px(13, 13, 1, 2, shade(p.skin, 0.8)); break;
    }
    // SNES-anime polish: soft form-shading over the pixel base (light from upper-left) + a vignette,
    // drawn at full resolution so it adds sub-cell shading/depth without losing the pixel feel
    const W = S * CELL;
    const g1 = c.createRadialGradient(W * 0.34, W * 0.26, W * 0.08, W * 0.34, W * 0.26, W * 0.95);
    g1.addColorStop(0, 'rgba(255,255,255,0.18)'); g1.addColorStop(0.55, 'rgba(255,255,255,0)'); g1.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = g1; c.fillRect(0, 0, W, W);
    const g2 = c.createRadialGradient(W * 0.5, W * 0.46, W * 0.34, W * 0.5, W * 0.5, W * 0.74);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.globalCompositeOperation = 'source-over'; c.fillStyle = g2; c.fillRect(0, 0, W, W);
    c.globalCompositeOperation = 'source-over';
    return cv.toDataURL();
  }

  function url(key, mood) { const ck = key + '|' + (mood || 'neutral'); if (cache[ck] === undefined) cache[ck] = draw(key, mood); return cache[ck]; }
  function has(key) { return !!SPEC[key]; }
  // small <img> element string for inline use
  function img(key, cls, mood) { const u = url(key, mood); return u ? `<img class="portrait ${cls || ''}" src="${u}" alt="">` : ''; }

  return { url, has, img };
})();
