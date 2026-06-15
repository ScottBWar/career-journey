// =====================================================================
//  Loader — loads images/audio from a manifest. If a file is missing,
//  it resolves to null and the engine draws a procedural placeholder.
//  This is the seam where your greeter art / fal-generated assets drop in.
// =====================================================================
window.Loader = (function () {
  const images = {}, sounds = {};
  function loadImage(key, src) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => { images[key] = img; res(); };
      img.onerror = () => { images[key] = null; res(); };
      img.src = src;
    });
  }
  function loadAudio(key, src) {
    return new Promise(res => {
      const a = new Audio();
      a.oncanplaythrough = () => { sounds[key] = a; res(); };
      a.onerror = () => { sounds[key] = null; res(); };
      a.src = src; a.load();
      setTimeout(() => { if (sounds[key] === undefined) { sounds[key] = a; res(); } }, 2500);
    });
  }
  async function load(manifest) {
    const base = manifest.base || '';
    const tasks = [];
    for (const [k, src] of Object.entries(manifest.images || {})) tasks.push(loadImage(k, base + src));
    for (const [k, src] of Object.entries(manifest.audio || {})) tasks.push(loadAudio(k, base + src));
    await Promise.all(tasks);
  }
  return { load, img: k => images[k] || null, sound: k => sounds[k] || null, has: k => !!images[k] };
})();
