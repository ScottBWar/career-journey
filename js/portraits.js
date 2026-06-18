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
    selachoth: { type: 'villain',   skin: '#aebfc8', hair: '#e8eef2', eye: '#ffe08a', bg: '#16181f' },
    vampire:   { type: 'vampire',   skin: '#dfe0e8', hair: '#0a0a12', eye: '#ff2a3a', bg: '#2a0a14' },
    drifter:   { type: 'drifter',   skin: '#c89a72', hair: '#b8b0a0', eye: '#ff5e5e', bg: '#2c3a52' },
    kraken:    { type: 'kraken',    skin: '#2f6b54', eye: '#ffe08a', bg: '#0a2018' },
    leviathan: { type: 'kraken',    skin: '#2a4a5a', eye: '#7fffd0', bg: '#08161e' },
    angler:    { type: 'kraken',    skin: '#1a2230', eye: '#aef0ff', bg: '#050d16' },
    // elemental mermaids
    ember:  { type: 'mermaid', skin: '#f0c8a8', hair: '#ff7a4a', eye: '#ffd24a', bg: '#5a1f14' },
    nerida: { type: 'mermaid', skin: '#dfe6e0', hair: '#3fd0e0', eye: '#9be7ff', bg: '#0e3a4a' },
    volta:  { type: 'mermaid', skin: '#f0d0b0', hair: '#ffe04a', eye: '#fff6a0', bg: '#5a4a0a' },
    gaia:   { type: 'mermaid', skin: '#e8c8a0', hair: '#6ec06a', eye: '#cfeeb0', bg: '#1f4a18' },
    nyx:    { type: 'mermaid', skin: '#cfc0d8', hair: '#b06aff', eye: '#e0b3ff', bg: '#2a1840' },
    lumina: { type: 'mermaid', skin: '#f5e8d0', hair: '#fff3c0', eye: '#fffae0', bg: '#4a4636' },
  };
  const S = 16, CELL = 8;

  function draw(key, mood) {
    const p = SPEC[key]; if (!p) return null;
    const cv = document.createElement('canvas'); cv.width = cv.height = S * CELL;
    const c = cv.getContext('2d');
    const px = (x, y, w, h, col) => { if (!col) return; c.fillStyle = col; c.fillRect(x * CELL, y * CELL, w * CELL, h * CELL); };
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r * f | 0)); g = Math.max(0, Math.min(255, g * f | 0)); b = Math.max(0, Math.min(255, b * f | 0)); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };

    // backdrop
    c.fillStyle = p.bg; c.fillRect(0, 0, S * CELL, S * CELL);
    px(0, 0, S, 1, shade(p.bg, 1.3)); px(0, S - 1, S, 1, shade(p.bg, 0.7));

    const skin = p.skin, sk2 = skin ? shade(skin, 0.82) : null;
    // head base (cols 4..11, rows 4..13) with trimmed corners
    if (p.type !== 'kraken') {
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
    return cv.toDataURL();
  }

  function url(key, mood) { const ck = key + '|' + (mood || 'neutral'); if (cache[ck] === undefined) cache[ck] = draw(key, mood); return cache[ck]; }
  function has(key) { return !!SPEC[key]; }
  // small <img> element string for inline use
  function img(key, cls, mood) { const u = url(key, mood); return u ? `<img class="portrait ${cls || ''}" src="${u}" alt="">` : ''; }

  return { url, has, img };
})();
