// =====================================================================
//  screenshot.mjs — render the game headlessly and save a PNG so Claude
//  can SEE it and iterate. The game is Canvas 2D, so no WebGL/GPU needed.
//  Setup once:  npm i -D playwright && npx playwright install chromium
//  Usage:       node tools/screenshot.mjs [outPath]
// =====================================================================
import path from 'node:path';
import { chromium } from 'playwright';

const out = process.argv[2] || 'mv/shot.png';
const url = 'file://' + path.resolve('mv/index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.goto(url);
await page.click('#startBtn').catch(() => {});
await page.waitForTimeout(1600);          // let a few frames render
await page.screenshot({ path: out });
await browser.close();
console.log('Saved', out);
if (errs.length) { console.log('Page errors:'); errs.forEach(e => console.log('  ', e)); }
