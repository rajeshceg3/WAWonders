import {
    makeCtx, windNoise, lapping, rustle, birdChirps, insects, whistleWind, bloops, rumble,
} from './soundscape-layers.js';

/* Place-true ambience layers, synthesized (no samples, no voice). */
const SEED = 2890;
const LAYER_DEFS = {
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
};

const BIOME_SCENES = {
    coastal: [['shoreLap', 0.9], ['coastWind', 0.7], ['gulls', 0.7]],
    desert: [['desertWind', 0.9], ['rockWhistle', 0.5], ['heatShimmer', 0.8]],
    forest: [['canopyWind', 0.85], ['leafRustle', 0.9], ['forestBirds', 0.85]],
    stone: [['stoneAir', 0.85], ['stoneDrips', 0.9], ['stoneRumble', 0.7]],
};

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = true; // Start muted, let user opt-in
        this.masterGain = null;
        this.ambientOscillators = [];
        this.ambientGain = null;
        this.currentBiome = null;
        this.noiseNode = null;
        this.pannerNode = null;
    }

    init() {
        if (this.ctx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            // Add spatial audio support if available
            if (this.ctx.createStereoPanner) {
                this.pannerNode = this.ctx.createStereoPanner();
                this.pannerNode.connect(this.masterGain);
            }

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.connect(this.masterGain);
            this.ambientGain.gain.value = 0; // start silent

            this.updateMuteState();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (!this.ctx && !this.isMuted) {
            this.init();
        }

        if (this.ctx) {
            // Resume context if it was suspended (browser policy)
            if (!this.isMuted && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.updateMuteState();
        }

        return this.isMuted;
    }

    updateMuteState() {
        if (this.masterGain) {
            // Smoothly change volume to avoid clicks
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime, 0.1);
        }
    }

    setPan(x) {
        if (this.pannerNode) {
            // Clamping x to [-1, 1] range to avoid pan errors
            const panValue = Math.max(-1, Math.min(1, x));
            this.pannerNode.pan.setTargetAtTime(panValue, this.ctx.currentTime, 0.1);
        }
    }

    playHoverSound(x = 0) {
        if (this.isMuted || !this.ctx) return;

        this.setPan(x);

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        // Connect to spatial audio panner if it exists
        if (this.pannerNode) {
            gain.connect(this.pannerNode);
        } else {
            gain.connect(this.masterGain);
        }

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playClickSound() {
        if (this.isMuted || !this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    _createNoise() {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        return noise;
    }

    setBiome(biome) {
        if (this.isMuted || !this.ctx) return;
        if (this.currentBiome === biome) return;
        this.currentBiome = biome;

        this.stopAmbience();

        this.startLayeredAmbience(biome);
    }

    /* Play a biome's layered scene: looped synthesized buffers, each with its
     * own gain, faded in through ambientGain. All layers are seamless loops. */
    startLayeredAmbience(biome) {
        if (!this.ctx) return;
        const scene = BIOME_SCENES[biome];
        if (!scene) return;

        const t = this.ctx.currentTime;
        const sr = this.ctx.sampleRate;

        scene.forEach(([id, layerGain]) => {
            const def = LAYER_DEFS[id];
            const c = makeCtx(sr, def.seconds, def.seed);
            const out = def.render(c) || c;
            const buffer = this.ctx.createBuffer(2, out.L.length, sr);
            buffer.getChannelData(0).set(out.L);
            buffer.getChannelData(1).set(out.R);

            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            src.loop = true;
            const g = this.ctx.createGain();
            g.gain.value = layerGain;
            src.connect(g);
            g.connect(this.ambientGain);
            src.start(t);
            this.ambientOscillators.push(src);
        });

        this.ambientGain.gain.cancelScheduledValues(t);
        this.ambientGain.gain.setValueAtTime(0, t);
        this.ambientGain.gain.linearRampToValueAtTime(0.5, t + 2);
    }




    playFlySound() {
        if (this.isMuted || !this.ctx) return;

        const t = this.ctx.currentTime;

        // Use short burst of bandpass filtered noise for a "whoosh" effect
        const noiseNode = this._createNoise();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.0;

        // Sweep frequency up then down
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(1500, t + 0.75);
        filter.frequency.exponentialRampToValueAtTime(400, t + 1.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.75); // Peak volume in middle of flight
        gain.gain.linearRampToValueAtTime(0, t + 1.5);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noiseNode.start(t);
        noiseNode.stop(t + 1.5);
    }

    stopAmbience() {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        this.ambientGain.gain.cancelScheduledValues(t);
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t);
        this.ambientGain.gain.linearRampToValueAtTime(0, t + 1);

        const nodesToStop = [...this.ambientOscillators];
        this.ambientOscillators = [];

        setTimeout(() => {
            nodesToStop.forEach(node => {
                try {
                    node.stop();
                    node.disconnect();
                } catch(e) {}
            });
        }, 1100);
    }
}
