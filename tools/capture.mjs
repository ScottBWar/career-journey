// =====================================================================
//  capture.mjs — run on YOUR machine (it has a browser); gives Claude eyes.
//
//  It serves the repo, opens game.html in headless Chromium, drives the game
//  into every important state via the exposed Game.* API, screenshots each,
//  records JS errors + a game-state snapshot, writes a structured REPORT, and
//  (by default) commits + pushes captures/ so Claude can read them.
//
//  One-time setup:   npm install && npx playwright install chromium
//  Each run:         npm run capture        (or: node tools/capture.mjs)
//  Skip the push:    CAPTURE_NO_PUSH=1 npm run capture
// =====================================================================
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'captures', 'latest');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

// each state: drive the game with a snippet, then wait for the scene to settle
const STATES = [
  { name: '01_overworld_tidehaven', drive: `Game.toIsland('tidehaven', false)`, wait: 1100 },
  { name: '02_overworld_paegina',   drive: `Game.toIsland('paegina', false)`,   wait: 1100 },
  { name: '03_overworld_duskmoor',  drive: `Game.toIsland('duskmoor', false)`,  wait: 1100 },
  { name: '04_sea',                 drive: `Game.toSea()`,                       wait: 1100 },
  { name: '05_town_tidehaven',      drive: `Game.enterTown('tidehaven')`,        wait: 1100 },
  { name: '06_town_argo_greek',     drive: `Game.enterTown('argo')`,             wait: 1100 },
  { name: '07_town_bazaar',         drive: `Game.enterTown('bazaar')`,           wait: 1100 },
  { name: '08_dungeon_tidecave',    drive: `Game.toDungeon('tide_cave')`,        wait: 1100 },
  { name: '09_dungeon_castle',      drive: `Game.toDungeon('vampire_keep')`,     wait: 1100 },
  { name: '10_battle_mobs',         drive: `Game.toIsland('tidehaven', false); Game.startBattle(['shark','crab','jelly'], {})`, wait: 1900 },
  { name: '11_battle_boss_kraken',  drive: `Game.startBattle(['kraken'], { boss: true })`,           wait: 1900 },
  { name: '12_battle_greek_medusa', drive: `Game.startBattle(['medusa'], { boss: true, music: 'paegina' })`, wait: 1900 },
  { name: '13_cutscene_council',    drive: `Game.toIsland('tidehaven', false); Game.startCutscene('mermaidCouncil')`, wait: 1500 },
  { name: '14_cutscene_opening',    drive: `Cutscene.play(Data.STORY.opening, null, { set: 'cliff_dawn', music: 'adventure' })`, wait: 1600 },
  { name: '15_menu_gear',           drive: `Game.toIsland('tidehaven', false); Game.openGear()`,     wait: 900 },
  { name: '16_menu_skills',         drive: `Game.toIsland('tidehaven', false); Game.openSkills()`, wait: 900 },
  { name: '17_coliseum',            drive: `Game.toIsland('paegina', false); Game.openColiseum()`,   wait: 1000 },

  // --- new-feature framing: walk the player to the content the default cams miss ---
  { name: '18_overworld_pots',  drive: `Game.toIsland('tidehaven', false); (function(){var p=World._debug.cuttable('pot')||World._debug.cuttable('grass'); if(p)World._debug.warp(p.x, p.z-3, 0);})()`, wait: 900 },
  { name: '19_overworld_swing', drive: `Game.toIsland('tidehaven', false); (function(){var p=World._debug.cuttable('pot')||World._debug.cuttable('grass'); if(p)World._debug.warp(p.x, p.z-2.2, 0); World._debug.swing();})()`, wait: 140 },
  { name: '20_dungeon_traps',   drive: `Game.toDungeon('crash_site'); setTimeout(function(){window.__reset&&window.__reset(); var h=Dungeon._debug.hazard()||Dungeon._debug.alcove(); if(h)Dungeon._debug.warp(h.x<0?h.x+4.5:h.x-4.5, h.z);},700)`, wait: 1700 },
  { name: '21_dungeon_alcove',  drive: `Game.toDungeon('spirit_wood'); setTimeout(function(){window.__reset&&window.__reset(); var a=Dungeon._debug.alcove()||Dungeon._debug.hazard(); if(a)Dungeon._debug.warp(a.x<0?a.x+3.6:a.x-3.6, a.z);},700)`, wait: 1700 },

  // --- model gallery: clean, well-lit, close-up rows so models can be critiqued in detail ---
  { name: '22_gallery_party1',  drive: `__gallery({party:['pirate','swordsman','healer','dragoon','mage']})`,    wait: 600 },
  { name: '23_gallery_party2',  drive: `__gallery({party:['ruffy','simon','aladdin','violca']})`,               wait: 600 },
  { name: '24_gallery_party3',  drive: `__gallery({party:['mac','sane','marvyn','quijano']})`,                  wait: 600 },
  { name: '25_gallery_mobs',    drive: `__gallery({enemy:['shark','jelly','octo','crab','gull','golem']})`,     wait: 600 },
  { name: '26_gallery_bosses',  drive: `__gallery({enemy:['kraken','selachoth','medusa','minotaur']})`,         wait: 600 },
  { name: '27_gallery_bosses2', drive: `__gallery({enemy:['thething','forestgod','vogon','windmill']})`,        wait: 600 },
  { name: '28_gallery_dunmobs', drive: `__gallery({enemy:['thingspawn','kodama','boarspirit','vogonclerk','sentry','mutton','windvane']})`, wait: 600 },
  { name: '29_battle_ruffy',    drive: `Game.toSea(); Game.startBattle(['ruffy_duel'], { boss: true })`, wait: 1900 },
  { name: '30_battle_omega',    drive: `Game.startBattle(['selachoth_omega'], { boss: true })`, wait: 2000 },
  { name: '31_gallery_omega',   drive: `__gallery({enemy:['selachoth','selachoth_omega']})`, wait: 600 },
  { name: '32_battle_sentinel', drive: `Game.startBattle(['sentinel'], { boss: true, music: 'assault' })`, wait: 2000 },
  { name: '33_cutscene_reactor', drive: `Cutscene.play(Data.STORY.reactorRaid, null, { music: 'assault' })`, wait: 1600 },
];

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/game.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r(server)));
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });

  // collect every console message + uncaught error, tagged with the current state
  let curState = 'boot'; const consoleErrors = [], pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ state: curState, text: m.text() }); });
  page.on('pageerror', e => pageErrors.push({ state: curState, text: String(e && e.stack || e) }));

  const report = { runAt: new Date().toISOString(), states: [], consoleErrors, pageErrors, snapshot: null };
  try {
    await page.goto(`http://localhost:${port}/game.html`, { waitUntil: 'networkidle', timeout: 30000 });
    // a clean Continue boots straight into the world (no 22s intro crawl)
    await page.click('#startContinue', { timeout: 8000 }).catch(() => page.click('#startNew').catch(() => {}));
    await page.waitForFunction(() => window.Game && Game.scene && Game.engine, { timeout: 20000 });
    await page.waitForTimeout(1200);
    // a reset that closes any lingering overlay/cutscene so each state is captured clean
    await page.evaluate(() => {
      window.__reset = function () {
        try {
          Game.dialogueOpen = false; Game._advanceDlg = null; document.body.classList.remove('cine-on');
          ['gear', 'skills', 'partyScr', 'shop', 'shipyard', 'coliseum', 'observatory', 'arcade', 'cine', 'pause', 'bestiary', 'legend', 'dialogue', 'date', 'shellHunt'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.remove('show'); });
          Game.gearOpen = Game.skillsOpen = Game.partyOpen = Game.shipyardOpen = Game.shopOpen = Game.pauseOpen = Game.bestiaryOpen = Game.legendOpen = Game.datingOpen = false;
        } catch (e) {}
      };

      // model gallery — a clean, brightly lit row of models for detailed inspection.
      // arg: { party:[keys] } or { enemy:[keys] }. Models face the camera on a neutral stage.
      window.__galleryScene = null;
      window.__gallery = function (spec) {
        const B = BABYLON, MBd = B.MeshBuilder;
        if (window.__galleryScene) { try { window.__galleryScene.dispose(); } catch (e) {} }
        const scene = new B.Scene(Game.engine);
        scene.clearColor = new B.Color4(0.10, 0.12, 0.17, 1);
        Models.use(scene);
        const hemi = new B.HemisphericLight('h', new B.Vector3(0.2, 1, 0.15), scene); hemi.intensity = 0.85; hemi.groundColor = new B.Color3(0.22, 0.24, 0.3);
        const sun = new B.DirectionalLight('s', new B.Vector3(-0.4, -1, 0.3), scene); sun.intensity = 1.5; sun.specular = new B.Color3(1, 1, 1);
        const rim = new B.PointLight('rim', new B.Vector3(0, 5, -7), scene); rim.intensity = 0.6; rim.diffuse = new B.Color3(0.6, 0.72, 1);
        const items = (spec.party || []).map(k => ({ kind: 'party', key: k })).concat((spec.enemy || []).map(k => ({ kind: 'enemy', key: k })));
        const n = items.length, sp = 4.6, x0 = -(n - 1) * sp / 2;
        items.forEach((it, i) => {
          let m = null;
          try {
            if (it.kind === 'enemy') m = Models.enemy(it.key);
            else { const md = (window.Progress && Progress.def(it.key) && Progress.def(it.key).model) || it.key; m = Models[md] ? Models[md]() : null; }
          } catch (e) { m = null; }
          if (!m || !m.node) return;
          m.node.position.set(x0 + i * sp, 0, 0);
          m.node.rotation.y = 0; // party fronts face +Z (toward camera below)
        });
        const stage = MBd.CreateGround('stage', { width: n * sp + 8, height: 16 }, scene); const sm = new B.StandardMaterial('sm', scene); sm.diffuseColor = new B.Color3(0.16, 0.18, 0.23); sm.specularColor = new B.Color3(0.05, 0.05, 0.05); stage.material = sm;
        const cam = new B.UniversalCamera('gcam', new B.Vector3(x0 * 0.18, 4.0, (n * sp) * 0.55 + 8.5), scene); cam.setTarget(new B.Vector3(0, 1.7, 0)); cam.fov = 0.7;
        window.__galleryScene = scene; Game.scene = scene;
        try { if (window.Render && Render.outline) Render.outline(scene); } catch (e) {}
      };
    });

    for (const s of STATES) {
      curState = s.name;
      const before = consoleErrors.length + pageErrors.length;
      let drove = true;
      try { await page.evaluate('window.__reset && window.__reset(); ' + s.drive); } catch (e) { drove = false; pageErrors.push({ state: s.name, text: 'drive failed: ' + e.message }); }
      await page.waitForTimeout(s.wait);
      await page.screenshot({ path: path.join(OUT, s.name + '.png') });
      const errs = (consoleErrors.length + pageErrors.length) - before;
      report.states.push({ name: s.name, drove, newErrors: errs, screenshot: s.name + '.png' });
      process.stdout.write(`• ${s.name} ${drove ? '✓' : '✗ drive'} ${errs ? '(' + errs + ' errors!)' : ''}\n`);
    }
    report.snapshot = await page.evaluate(() => {
      try {
        const st = Game.state; const d = k => { const p = st.party.find(x => x.key === k); return p ? p.level : '-'; };
        return { gold: st.gold, pearls: st.pearls, active: st.active, levels: st.party.map(p => p.key + ':' + p.level),
          krakenDown: st.prog && st.prog.krakenDown, islandsVisited: Object.keys(st.islands || {}) };
      } catch (e) { return { error: String(e) }; }
    }).catch(() => null);
  } catch (e) {
    report.fatal = String(e && e.stack || e);
    process.stdout.write('FATAL: ' + report.fatal + '\n');
  }

  await browser.close(); server.close();

  // ---- write structured report ----
  fs.writeFileSync(path.join(OUT, 'REPORT.json'), JSON.stringify(report, null, 2));
  const allErr = report.consoleErrors.concat(report.pageErrors);
  let md = `# Capture report — ${report.runAt}\n\n`;
  if (report.fatal) md += `## ⛔ FATAL\n\`\`\`\n${report.fatal}\n\`\`\`\n\n`;
  md += `## JS errors: ${allErr.length}\n` + (allErr.length ? allErr.map(e => `- **${e.state}**: ${e.text}`).join('\n') : '_none — no runtime errors caught_') + '\n\n';
  md += `## States captured (${report.states.length})\n` + report.states.map(s => `- ${s.newErrors ? '⚠️' : '✅'} \`${s.name}.png\`${s.drove ? '' : ' (drive failed)'}${s.newErrors ? ` — ${s.newErrors} new error(s)` : ''}`).join('\n') + '\n\n';
  md += `## Game-state snapshot\n\`\`\`json\n${JSON.stringify(report.snapshot, null, 2)}\n\`\`\`\n\n`;
  md += `## For Claude — what to do with this\n` +
        `1. Open any state above marked ⚠️ first (those threw JS errors — highest priority).\n` +
        `2. Then eyeball each PNG for: clipping/floating props, jammed layout, wrong colors/theme, off-camera framing, illegible UI, models overlapping.\n` +
        `3. Cross-check the snapshot looks sane (levels, gold, flags).\n` +
        `4. File concrete fixes per screenshot.\n`;
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), md);
  process.stdout.write(`\nWrote ${report.states.length} screenshots + REPORT.md to captures/latest/  (${allErr.length} JS errors)\n`);

  // ---- auto-commit + push so Claude can read it, unless told not to ----
  if (!process.env.CAPTURE_NO_PUSH) {
    try {
      execSync('git add captures', { cwd: ROOT, stdio: 'ignore' });
      execSync(`git commit -m "chore(capture): screenshots @ ${report.runAt} (${allErr.length} errors)"`, { cwd: ROOT, stdio: 'ignore' });
      execSync('git push', { cwd: ROOT, stdio: 'inherit' });
      process.stdout.write('Pushed captures/ — tell Claude "new captures are up".\n');
    } catch (e) { process.stdout.write('(git push skipped — commit/push manually, or set CAPTURE_NO_PUSH=1)\n'); }
  }
  process.exit(report.fatal ? 1 : 0);
})();
