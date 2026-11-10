# Western Australia guide

A 21-place map and catalog. The guide keeps search, keyboard-accessible place details, light/dark UI, optional audio and an explicit Start/Stop tour. Places reopens a dismissed panel; Reset restores the overview.

## Run and verify

```
npm ci
npm test -- --runInBand
npm run build
npx playwright install chromium
npm run test:e2e
```

To use a locally installed Chrome: `CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`. To verify a deployed path: `BASE_URL=https://example.invalid/path/ npm run test:e2e`.

Vite uses relative build assets so the same build works at the Vercel root and the GitHub Pages project path. The Pages workflow publishes `dist`, not the unbuilt source entry. CI runs unit/integration coverage, high-severity dependency checks, build and browser tests. Images under verification/current are captured by the browser gate and uploaded as CI artifacts.

## Map and content

Leaflet and MarkerCluster are bundled dependencies, not remote CDN scripts. OpenStreetMap standard tiles need no paid API key. Attribution stays visible. Browser caching/referrers are retained; no offline or prefetch feature is offered. The tile service is best-effort under https://operations.osmfoundation.org/policies/tiles/ . Automated traversal stubs tile responses instead of sweeping the public map service.

Unsourced stock photos and fabricated biome temperatures have been removed. General inherited place descriptions are not live park, road, weather or wildlife advice. Two concrete corrections have official links in their details:

- Ningaloo is Australia's largest fringing reef, not a verified global-largest claim: https://www.australiascoralcoast.com/see-do/marine-parks/ningaloo-reef
- Albany's former whaling station ceased operations in 1978: https://discoverybay.com.au/blog/historic-whaling-station/whaling-history/

## Quality evidence, 11 November 2026

Real Chromium, not a physical iPhone: 320/390/1440px, normal/reduced motion, all 21 details in dark/light UI, keyboard selection, search/no matches, close/reopen, opt-in audio/off, explicit tour/stop, Reset and overflow checks. Existing five browser tests and 27 unit/integration tests pass.

84 actual glyph-core/backdrop samples across list, header and detail text: lowest 5.836:1. App labels are at least 14px; map-provider labels and compact licence attribution are separate. `verification/ui-contrast-results.json` records measurements. Audio is opt-in and functionally checked; subjective listening remains unverified. Production runtime dependency audit is clean; development tooling retains low/moderate advisories, no high/critical after the dependency update.
