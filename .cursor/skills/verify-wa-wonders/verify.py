#!/usr/bin/env python3
"""Verification runner for WAWonders. See SKILL.md."""
import json, os, re, subprocess, sys, time
from pathlib import Path
REPO = Path(__file__).resolve().parents[3]
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
failures = []
def check(name, ok, detail=''):
    print(('PASS' if ok else 'FAIL'), name, (':: ' + str(detail))[:400] if detail else '')
    if not ok: failures.append(name)
def run(cmd, **kw):
    kw.setdefault('cwd', REPO)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=900, **kw)
def render(url, markers):
    proc = subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                           '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
                           '--virtual-time-budget=9000', '--window-size=1280,900',
                           '--dump-dom', url], capture_output=True, text=True, timeout=120)
    dom = proc.stdout
    check('render: app boots', all(m in dom for m in markers), dom[:200])
    errs = [l for l in proc.stderr.splitlines() if 'console' in l.lower() and 'error' in l.lower()
            and not re.search(r'dbus|gpu|vulkan|ozone|fontconfig', l, re.I)]
    check('render: no js console errors', not errs, errs[:3])
def serve_and_render(directory, port, markers):
    server = subprocess.Popen([sys.executable, '-m', 'http.server', port, '--bind', '127.0.0.1'], cwd=directory, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.5)
        render('http://127.0.0.1:' + port + '/', markers)
    finally:
        server.terminate()
def main():
    if not (REPO / 'node_modules').is_dir():
        check('npm install', run(['npm', 'install', '--no-audit', '--no-fund']).returncode == 0)
    proc = run(['npx', 'jest'], cwd=REPO)
    tail = re.sub(r'\x1b\[[0-9;]*m', '', proc.stdout + proc.stderr)
    m = re.search(r'Tests:\s+\d+ passed', tail)
    check('jest suite', proc.returncode == 0 and m, tail[-300:])
    proc = run(['npm', 'run', 'build'])
    check('vite build', proc.returncode == 0, (proc.stdout + proc.stderr)[-300:])
    serve_and_render(REPO / 'dist', '4283', ['Western Australia: A Natural Canvas', 'id="map"'])

    print('FAILURES=%d' % len(failures))
    with open(REPO / '.cursor/skills/verify-wa-wonders/evidence.json', 'w') as f:
        json.dump({'repo': 'WAWonders', 'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'failures': failures}, f, indent=2)
    return 1 if failures else 0
if __name__ == '__main__':
    sys.exit(main())
