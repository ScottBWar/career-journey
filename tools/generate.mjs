// =====================================================================
//  generate.mjs — generate game art via fal.ai and save into mv/assets.
//  Usage:  FAL_KEY=xxxxx node tools/generate.mjs
//  Optional: FAL_MODEL (default fal-ai/flux/dev)
//  Requires Node 18+ (built-in fetch) and network access to fal.run.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('✖ Set FAL_KEY (export FAL_KEY=...) — get one at fal.ai'); process.exit(1); }
const MODEL = process.env.FAL_MODEL || 'fal-ai/flux/dev';
const STYLE = 'painterly fantasy game art, cohesive moody palette, dramatic rim lighting, HD-2D';

const JOBS = [
  { file: 'mv/assets/bg/sky.png',  size: 'landscape_16_9', prompt: `${STYLE}, distant night sky over a drowned coast, soft gradient, stars, seamless` },
  { file: 'mv/assets/bg/far.png',  size: 'landscape_16_9', prompt: `${STYLE}, silhouette of jagged sea cliffs and ruined towers, single mid-blue tone, transparent-friendly` },
  { file: 'mv/assets/bg/near.png', size: 'landscape_16_9', prompt: `${STYLE}, foreground broken pillars and hanging vines silhouette, darker tone` },
  { file: 'mv/assets/sprites/tiles.png', size: 'square_hd', prompt: `${STYLE}, single seamless mossy wet stone tile, top-down lit, 48px game tile` },
];

async function gen(prompt, size) {
  const r = await fetch('https://fal.run/' + MODEL, {
    method: 'POST',
    headers: { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: size, num_images: 1 }),
  });
  if (!r.ok) throw new Error(`fal ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const url = j.images?.[0]?.url || j.image?.url;
  if (!url) throw new Error('no image in response: ' + JSON.stringify(j).slice(0, 200));
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return buf;
}

for (const job of JOBS) {
  try {
    process.stdout.write(`• ${job.file} ... `);
    const buf = await gen(job.prompt, job.size);
    fs.mkdirSync(path.dirname(job.file), { recursive: true });
    fs.writeFileSync(job.file, buf);
    console.log('saved (' + buf.length + ' bytes)');
  } catch (e) { console.log('FAILED:', e.message); }
}
console.log('Done. Reload mv/index.html to see the new art.');
