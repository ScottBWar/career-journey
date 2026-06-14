// =====================================================================
//  Render — shared "graphics glow-up" applied to every scene: a real
//  gradient skybox + a post-processing pipeline (ACES tone mapping,
//  bloom, sharpen, vignette, FXAA/MSAA) and SSAO on High. No assets.
//  Everything is wrapped defensively so a GPU quirk can't break the game.
// =====================================================================
window.Render = (function () {
  let quality = 'high';
  try { quality = localStorage.getItem('bb_quality') || 'high'; } catch (e) {}
  const high = () => quality === 'high';

  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); const r = A.map((v, i) => Math.round(v + (B[i] - v) * t)); return '#' + r.map(v => v.toString(16).padStart(2, '0')).join(''); }
  function shade(h, f) { const r = hexToRgb(h).map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + r.map(v => v.toString(16).padStart(2, '0')).join(''); }

  function sky(scene, top, horizon) {
    top = top || '#2a4a8a'; horizon = horizon || '#cfeaf5';
    const dt = new BABYLON.DynamicTexture('sky', { width: 8, height: 256 }, scene, false);
    const c = dt.getContext(); const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(0.5, mix(top, horizon, 0.55)); g.addColorStop(0.82, horizon); g.addColorStop(1, shade(horizon, 0.82));
    c.fillStyle = g; c.fillRect(0, 0, 8, 256); dt.update();
    const m = new BABYLON.StandardMaterial('skyM', scene); m.backFaceCulling = false; m.disableLighting = true;
    m.emissiveTexture = dt; m.diffuseColor = new BABYLON.Color3(0, 0, 0); m.specularColor = new BABYLON.Color3(0, 0, 0);
    const dome = BABYLON.MeshBuilder.CreateSphere('skybox', { diameter: 1400, segments: 40, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
    dome.material = m; dome.infiniteDistance = true; dome.isPickable = false; dome.applyFog = false;
    const [r, g2, b] = hexToRgb(horizon); scene.clearColor = new BABYLON.Color4(r / 255, g2 / 255, b / 255, 1);
    if (scene.fogMode !== BABYLON.Scene.FOGMODE_NONE) scene.fogColor = BABYLON.Color3.FromHexString(horizon);
    return dome;
  }

  function pipeline(scene, camera) {
    const p = new BABYLON.DefaultRenderingPipeline('glow', true, scene, [camera]);
    p.fxaaEnabled = true;
    try { p.samples = high() ? 4 : 1; } catch (e) {}
    p.bloomEnabled = true; p.bloomThreshold = 0.78; p.bloomWeight = 0.32; p.bloomScale = 0.5; p.bloomKernel = 48;
    p.sharpenEnabled = high(); if (p.sharpen) { p.sharpen.edgeAmount = 0.25; p.sharpen.colorAmount = 1; }
    const ip = p.imageProcessing;
    if (ip) {
      ip.toneMappingEnabled = true;
      try { ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES; } catch (e) {}
      ip.exposure = 1.08; ip.contrast = 1.16;
      ip.vignetteEnabled = true; ip.vignetteWeight = 1.4; ip.vignetteColor = new BABYLON.Color4(0, 0, 0.04, 0); ip.vignetteCameraFov = 0.9;
    }
    return p;
  }

  function ssao(scene, camera) {
    const s = new BABYLON.SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.75, blurRatio: 1 }, [camera]);
    s.totalStrength = 1.1; s.radius = 1.4; s.base = 0.25; s.samples = 16; s.maxZ = 220; s.minZAspect = 0.3;
    try { s.expensiveBlur = true; } catch (e) {}
    return s;
  }

  let _flareURL = null;
  function flareTex() {
    if (_flareURL) return _flareURL;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); return _flareURL = cv.toDataURL();
  }
  function lensFlare(scene, sun) {
    if (!sun) return;
    const dir = sun.direction.clone(); dir.normalize();
    const emitter = BABYLON.MeshBuilder.CreateSphere('sunE', { diameter: 4 }, scene); emitter.position = dir.scale(-260); emitter.isVisible = false; emitter.isPickable = false;
    const sys = new BABYLON.LensFlareSystem('lf', emitter, scene); const u = flareTex();
    new BABYLON.LensFlare(0.28, 0, new BABYLON.Color3(1, 0.97, 0.9), u, sys);
    new BABYLON.LensFlare(0.13, 0.3, new BABYLON.Color3(1, 0.85, 0.6), u, sys);
    new BABYLON.LensFlare(0.07, 0.55, new BABYLON.Color3(0.6, 0.8, 1), u, sys);
    new BABYLON.LensFlare(0.11, 0.85, new BABYLON.Color3(1, 0.75, 0.55), u, sys);
    new BABYLON.LensFlare(0.05, 1.1, new BABYLON.Color3(0.8, 0.9, 1), u, sys);
  }

  // apply everything to a freshly-built scene
  function setup(scene, camera, opts) {
    opts = opts || {};
    try { sky(scene, opts.skyTop, opts.skyHorizon); } catch (e) { console.warn('sky', e); }
    try { pipeline(scene, camera); } catch (e) { console.warn('pipeline', e); }
    if (high()) { try { ssao(scene, camera); } catch (e) { console.warn('ssao', e); } }
    if (opts.sun) { try { lensFlare(scene, opts.sun); } catch (e) { console.warn('flare', e); } }
  }

  function setQuality(q) { quality = q; try { localStorage.setItem('bb_quality', q); } catch (e) {} }
  function toggle() { setQuality(high() ? 'low' : 'high'); return quality; }

  return { setup, sky, setQuality, toggle, isHigh: high, quality: () => quality };
})();
