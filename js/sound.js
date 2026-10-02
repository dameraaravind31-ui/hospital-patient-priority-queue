/**
 * sound.js
 * Synthesizes hospital audio chimes and cues using standard Web Audio API.
 * No external audio files or dependencies required.
 */

class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
  }

  _initContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound(enable = null) {
    if (enable !== null) {
      this.enabled = enable;
    } else {
      this.enabled = !this.enabled;
    }
    return this.enabled;
  }

  /**
   * Classic hospital 2-tone announcement chime:
   * Tone 1 (F5 = 698.46 Hz) -> Tone 2 (C5 = 523.25 Hz)
   */
  playCallChime() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Tone 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.28); // C5
      gain2.gain.setValueAtTime(0.001, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.33);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.28);
      osc2.stop(now + 0.85);
    } catch (e) {
      console.warn("Audio chime prevented by browser autoplay policy:", e);
    }
  }

  /**
   * Alert tone for Priority 5 Critical patient arrival:
   * Pulsing urgent medical ping
   */
  playCriticalAlert() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      [0, 0.15, 0.3].forEach((offset) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now + offset); // A5
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } catch (e) {
      console.warn("Audio alert error:", e);
    }
  }

  /**
   * Soft affirmative tone when treatment is completed
   */
  playSuccessTone() {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); // A5
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Audio success tone error:", e);
    }
  }
}

// Global sound manager
window.soundEffects = new SoundEffects();
