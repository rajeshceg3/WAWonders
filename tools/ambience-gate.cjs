const pp = require('puppeteer-core');
const { spawn } = require('child_process');
(async () => {
  const s = spawn('python3', ['-m', 'http.server', '8850'], { cwd: 'dist', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 500));
  const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844 });
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto('http://127.0.0.1:8850', { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForSelector('#audio-toggle', { timeout: 15000 });
  await p.click('#audio-toggle'); // unmute
  // open a location through the app's own path
  const r1 = await p.evaluate(() => {
    const app = document.querySelector('#app')?.__app || window.app;
    return null;
  });
  // find a clickable location list item
  const state = await p.evaluate(async () => {
    const sm = window.__soundscape;
    if (!sm) return { engine: false };
    const out = { engine: true, ctxState: sm.ctx?.state, scenes: {} };
    for (const biome of ['coastal', 'desert', 'forest', 'stone']) {
      sm.currentBiome = null;
      sm.setBiome(biome);
      await new Promise(r => setTimeout(r, 300));
      out.scenes[biome] = { sources: sm.ambientOscillators.length, gain: +sm.ambientGain.gain.value.toFixed(3) };
      await new Promise(r => setTimeout(r, 1200));
    }
    return out;
  });
  await p.screenshot({ path: '/tmp/waw-390.png' });
  console.log(JSON.stringify({ state, errors }, null, 1));
  await b.close(); s.kill();
})();
