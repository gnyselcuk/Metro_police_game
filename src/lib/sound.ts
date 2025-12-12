class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            // Init on first user interaction usually, but we prepare here
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3; // Master volume
                this.masterGain.connect(this.ctx.destination);
            }
        }
    }

    private ensureContext() {
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playKeystroke() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();

        // Create noise buffer for a "mechanical" click
        const bufferSize = this.ctx.sampleRate * 0.01; // 10ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.01);

        // Add a filter to make it sound less harsh
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    playAlert() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();

        const now = this.ctx.currentTime;

        // Double beep
        [0, 0.15].forEach(offset => {
            const osc = this.ctx!.createOscillator(); // Non-null assertion safe due to check above
            const gain = this.ctx!.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, now + offset);

            gain.gain.setValueAtTime(0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);

            osc.connect(gain);
            if (this.masterGain) {
                gain.connect(this.masterGain);
            }

            osc.start(now + offset);
            osc.stop(now + offset + 0.1);
        });
    }

    playScan() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 1);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    }
    setVolume(volume: number) {
        if (this.masterGain) {
            // Clamp between 0 and 1
            const v = Math.max(0, Math.min(1, volume));
            this.masterGain.gain.setValueAtTime(v, this.ctx?.currentTime || 0);
        }
    }
}

// Singleton instance
export const soundManager = new SoundManager();
