// =====================================================================
//  World — room data as ASCII maps + parallax layer definitions.
//  Symbols: # solid · . empty · P spawn · > door-next · < door-prev
//           * double-jump pickup · ^ spike hazard · e patroller · = platform
//  Edit these maps freely; the engine parses them on load.
// =====================================================================
window.World = (function () {
  const TILE = 48;

  // each room: { name, tint, parallax:[{color, factor, kind}], rows:[...] }
  const ROOMS = {
    cavern: {
      name: 'Tidefall Cavern', tint: '#1a2540',
      parallax: [
        { color: '#0a1230', factor: 0.05, kind: 'sky' },
        { color: '#152a52', factor: 0.2, kind: 'hills' },
        { color: '#23406e', factor: 0.45, kind: 'pillars' },
      ],
      rows: [
        '############################',
        '#..........................#',
        '#..........................#',
        '#.....P....................#',
        '#####............*.........#',
        '#...#.........#####.........',
        '#...#......................>',
        '#...#####.......^^^.........',
        '#.......................#####',
        '#..........e...............#',
        '############################',
      ],
    },
    grotto: {
      name: 'Sunken Grotto', tint: '#13283a',
      parallax: [
        { color: '#07161e', factor: 0.05, kind: 'sky' },
        { color: '#103040', factor: 0.2, kind: 'hills' },
        { color: '#1c5066', factor: 0.45, kind: 'pillars' },
      ],
      rows: [
        '############################',
        '<..........................#',
        '#..........................#',
        '#............#####.........#',
        '#......e.....#...#.........#',
        '#####........#...#.....*...#',
        '#............#...#....######',
        '#.......^^^..#...#..........#',
        '#####........#...#..........#',
        '#............#...#....e.....#',
        '############################',
      ],
    },
  };
  // door links: roomKey -> { '>': nextRoom, '<': prevRoom }
  const LINKS = { cavern: { '>': 'grotto' }, grotto: { '<': 'cavern' } };

  function parse(key) {
    const r = ROOMS[key]; const grid = []; let spawn = { x: 2, y: 2 }; const doors = []; const pickups = []; const hazards = []; const enemies = [];
    r.rows.forEach((row, y) => {
      const line = [];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        let solid = (ch === '#' || ch === '=');
        line.push(solid ? (ch === '=' ? 2 : 1) : 0);
        if (ch === 'P') spawn = { x, y };
        else if (ch === '>' || ch === '<') doors.push({ x, y, dir: ch });
        else if (ch === '*') pickups.push({ x, y, kind: 'doublejump' });
        else if (ch === '^') hazards.push({ x, y });
        else if (ch === 'e') enemies.push({ x, y });
      }
      grid.push(line);
    });
    return { key, name: r.name, tint: r.tint, parallax: r.parallax, grid, w: r.rows[0].length, h: r.rows.length, spawn, doors, pickups, hazards, enemies, link: LINKS[key] || {} };
  }
  return { TILE, parse, ROOMS };
})();
