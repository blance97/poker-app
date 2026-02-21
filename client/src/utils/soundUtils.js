// client/src/utils/soundUtils.js
// Procedural sound engine using Web Audio API — no external files needed

class SoundEngine {
    constructor() {
        this._ctx = null;
        this.muted = false;
        this.volume = 0.6;
    }

    _getCtx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
        return this._ctx;
    }

    toggle() {
        this.muted = !this.muted;
        return this.muted;
    }

    // White noise burst — card deal "shhk"
    playCardDeal() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const len = Math.floor(ctx.sampleRate * 0.07);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const gain = ctx.createGain();
            gain.gain.value = this.volume * 0.35;
            src.connect(gain);
            gain.connect(ctx.destination);
            src.start();
        } catch (_) {}
    }

    // Short metallic clink — chip placed
    playChip() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.09);
            gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.13);
        } catch (_) {}
    }

    // Ascending major arpeggio — you win!
    playWin() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.11;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
            });
        } catch (_) {}
    }

    // Descending triangle — fold
    playFold() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.22);
        } catch (_) {}
    }

    // Soft noise tap — check / knock on table
    playCheck() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const len = Math.floor(ctx.sampleRate * 0.035);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 8);
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const gain = ctx.createGain();
            gain.gain.value = this.volume * 0.3;
            src.connect(gain);
            gain.connect(ctx.destination);
            src.start();
        } catch (_) {}
    }

    // Rising sine — raise / bet
    playRaise() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch (_) {}
    }

    // Double ping — your turn alert
    playYourTurn() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            [880, 1100].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.13;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(this.volume * 0.4, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
                osc.start(t);
                osc.stop(t + 0.28);
            });
        } catch (_) {}
    }

    // Low sawtooth chord — all in
    playAllIn() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            [220, 277, 330].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.04;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(this.volume * 0.18, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
                osc.start(t);
                osc.stop(t + 0.55);
            });
        } catch (_) {}
    }

    // Ascending triangle scale — blinds increase
    playBlindsUp() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            [440, 550, 660, 880].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.1;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t);
                osc.stop(t + 0.35);
            });
        } catch (_) {}
    }

    // Ticking urgency — last 10 seconds of timer
    playTick() {
        if (this.muted) return;
        try {
            const ctx = this._getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(this.volume * 0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.05);
        } catch (_) {}
    }
}

export const soundEngine = new SoundEngine();
