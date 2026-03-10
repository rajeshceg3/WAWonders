export class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = true; // Start muted, let user opt-in
        this.masterGain = null;
        this.ambientOscillators = [];
        this.ambientGain = null;
        this.currentBiome = null;
        this.noiseNode = null;
    }

    init() {
        if (this.ctx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

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

    playHoverSound() {
        if (this.isMuted || !this.ctx) return;

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
        gain.connect(this.masterGain);

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

        if (biome === 'coastal') {
            this.startOceanAmbience();
        } else if (biome === 'desert') {
            this.startWindAmbience();
        } else if (biome === 'forest') {
            this.startForestAmbience();
        }
    }

    startOceanAmbience() {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // Brown noise for ocean roar
        this.noiseNode = this._createNoise();

        // Lowpass filter to muffle it like waves
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        // Modulate the filter frequency to simulate waves crashing
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Slow wave (10 seconds per cycle)

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        this.noiseNode.connect(filter);
        filter.connect(this.ambientGain);

        this.noiseNode.start(t);
        lfo.start(t);

        this.ambientOscillators.push(this.noiseNode, lfo);

        // Fade in
        this.ambientGain.gain.cancelScheduledValues(t);
        this.ambientGain.gain.setValueAtTime(0, t);
        this.ambientGain.gain.linearRampToValueAtTime(0.15, t + 2);
    }

    startWindAmbience() {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        this.noiseNode = this._createNoise();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;

        // Modulate wind
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 800;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        this.noiseNode.connect(filter);
        filter.connect(this.ambientGain);

        this.noiseNode.start(t);
        lfo.start(t);

        this.ambientOscillators.push(this.noiseNode, lfo);

        this.ambientGain.gain.cancelScheduledValues(t);
        this.ambientGain.gain.setValueAtTime(0, t);
        this.ambientGain.gain.linearRampToValueAtTime(0.1, t + 2);
    }

    startForestAmbience() {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // Soft rustling noise
        this.noiseNode = this._createNoise();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;

        this.noiseNode.connect(filter);
        filter.connect(this.ambientGain);

        this.noiseNode.start(t);
        this.ambientOscillators.push(this.noiseNode);

        this.ambientGain.gain.cancelScheduledValues(t);
        this.ambientGain.gain.setValueAtTime(0, t);
        this.ambientGain.gain.linearRampToValueAtTime(0.05, t + 2);

        // Procedural bird chirps could be added here, but keeping it simple for now
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
