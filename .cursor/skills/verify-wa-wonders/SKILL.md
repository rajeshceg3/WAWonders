# Verify WAWonders
Western Australia: A Natural Canvas (vite + jest + playwright e2e).
## Launch
npm install, then npm run dev or npm run build && npm run preview.
## Doctor
`python3 .cursor/skills/verify-wa-wonders/verify.py`
## Drive
Runs the jest suite, builds with vite, renders the built app in headless Chromium asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-wa-wonders/evidence.json`
## Cleanup
Static server terminated after the render.
## Known boundaries
Render smoke only; e2e suites (playwright/karma) not exercised here.
