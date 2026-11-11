/* Mirror of the biome scenes in src/audio.js for offline preview. */
import { makeCtx, windNoise, lapping, rustle, birdChirps, insects, whistleWind, bloops, rumble } from './soundscape-layers.js';
const SEED = 2890;
export default {
  defaultScene: 'coastal',
  layers: {
    shoreLap: { seconds: 10, seed: SEED + 1, render: (c) => lapping(c, { gain: 0.42, period: 2.9, depth: 0.55, seed: SEED + 1 }) },
    coastWind: { seconds: 10, seed: SEED + 2, render: (c) => windNoise(c, { color: 0.03, gustDepth: 0.55, base: 0.4, seed: SEED + 2 }) },
    gulls: { seconds: 10, seed: SEED + 3, render: (c) => birdChirps(c, { count: 4, fLo: 1100, fHi: 2000, durLo: 0.2, durHi: 0.45, gain: 0.16, minGap: 1.5, syllables: 2, seed: SEED + 3 }) },
    desertWind: { seconds: 10, seed: SEED + 4, render: (c) => windNoise(c, { color: 0.03, gustDepth: 0.62, base: 0.44, seed: SEED + 4 }) },
    rockWhistle: { seconds: 10, seed: SEED + 5, render: (c) => whistleWind(c, { fMin: 360, fMax: 1150, gain: 0.26, seed: SEED + 5 }) },
    heatShimmer: { seconds: 10, seed: SEED + 6, render: (c) => insects(c, { f: 5500, pulseHz: 30, gain: 0.035, q: 26, seed: SEED + 6 }) },
    canopyWind: { seconds: 10, seed: SEED + 7, render: (c) => windNoise(c, { color: 0.014, gustDepth: 0.5, base: 0.44, seed: SEED + 7 }) },
    leafRustle: { seconds: 10, seed: SEED + 8, render: (c) => rustle(c, { gain: 0.15, seed: SEED + 8 }) },
    forestBirds: { seconds: 10, seed: SEED + 9, render: (c) => birdChirps(c, { count: 9, fLo: 2100, fHi: 3500, gain: 0.22, trill: 15, syllables: 2, minGap: 0.8, seed: SEED + 9 }) },
    stoneAir: { seconds: 10, seed: SEED + 10, render: (c) => windNoise(c, { color: 0.005, gustDepth: 0.3, base: 0.35, seed: SEED + 10 }) },
    stoneDrips: { seconds: 10, seed: SEED + 11, render: (c) => bloops(c, { count: 10, fLo: 950, fHi: 1800, gain: 0.1, seed: SEED + 11 }) },
    stoneRumble: { seconds: 10, seed: SEED + 12, render: (c) => rumble(c, { gain: 0.14, swellSec: 9, seed: SEED + 12 }) },
  },
  scenes: {
    coastal: [['shoreLap', 0.9], ['coastWind', 0.7], ['gulls', 0.7]].map(([layer, gain]) => ({ layer, gain })),
    desert: [['desertWind', 0.9], ['rockWhistle', 0.5], ['heatShimmer', 0.8]].map(([layer, gain]) => ({ layer, gain })),
    forest: [['canopyWind', 0.85], ['leafRustle', 0.9], ['forestBirds', 0.85]].map(([layer, gain]) => ({ layer, gain })),
    stone: [['stoneAir', 0.85], ['stoneDrips', 0.9], ['stoneRumble', 0.7]].map(([layer, gain]) => ({ layer, gain })),
  },
};
