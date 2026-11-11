const pp = require('puppeteer-core');
const { spawn } = require('child_process');
(async () => {
  const s = spawn('python3', ['-m', 'http.server', '8850'], { cwd: 'dist', stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 500));
  const b = await pp.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844 });
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto('http://127.0.0.1:8850', { waitUntil: 'networkidle2', timeout: 30000 });
  await p.waitForSelector('#audio-toggle', { timeout: 15000 });
  const before = await p.evaluate(() => ({ muted: document.querySelector('.audio-icon-muted')?.offsetParent !== null }));
  await p.click('#audio-toggle');
  await new Promise(r => setTimeout(r, 1500));
  const on = await p.evaluate(() => {
    const app = window.app || null;
    return {
      unmutedIcon: document.querySelector('.audio-icon-unmuted')?.offsetParent !== null,
    };
  });
  // navigate the tour to a different biome: find next/prev tour buttons
  const toured = await p.evaluate(() => !!document.querySelector('#tour-next, [data-tour-next], .tour-next'));
  await p.click('#audio-toggle');
  await new Promise(r => setTimeout(r, 800));
  const off = await p.evaluate(() => ({ mutedIconBack: document.querySelector('.audio-icon-muted')?.offsetParent !== null }));
  console.log(JSON.stringify({ before, on, toured, off, errors }, null, 1));
  await b.close(); s.kill();
})();
