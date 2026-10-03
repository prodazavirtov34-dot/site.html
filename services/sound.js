// Procedural sound effects using Web Audio API + Speech Synthesis for voiceover
// 100% reliable, zero external mp3 dependencies

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.voiceoverEnabled = false;
    this.volume = 0.5;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Crisp mechanical tick sound when wheel peg passes arrow
  playTick(frequency = 600) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency + (Math.random() * 80 - 40), now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // AudioContext silenced
    }
  }

  // Soft blip when participant joins list / gets extra ticket
  playJoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // AudioContext silenced
    }
  }

  // Triumphant winner fanfare
  playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 }, // C5
      { f: 659.25, t: 0.15, d: 0.15 }, // E5
      { f: 783.99, t: 0.30, d: 0.18 }, // G5
      { f: 1046.50, t: 0.48, d: 0.45 }, // C6
    ];

    try {
      const startTime = this.ctx.currentTime + 0.02;

      notes.forEach(({ f, t, d }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime + t);

        gain.gain.setValueAtTime(0, startTime + t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, startTime + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + t + d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime + t);
        osc.stop(startTime + t + d);
      });
    } catch {
      // AudioContext silenced
    }
  }

  // Voiceover: Announce winner with browser Speech Synthesis (Озвучка)
  speakWinner(winnerName) {
    if (!this.enabled || !this.voiceoverEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // Wait for fanfare to finish before voice starts
      setTimeout(() => {
        window.speechSynthesis.cancel();
        const text = `Победитель — ${winnerName}!`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 1.05;
        utterance.volume = this.volume;

        // Try to pick Russian voice
        const voices = window.speechSynthesis.getVoices();
        const ruVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ru'));
        if (ruVoice) {
          utterance.voice = ruVoice;
        }

        window.speechSynthesis.speak(utterance);
      }, 700);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (val) this.init();
  }

  setVoiceoverEnabled(val) {
    this.voiceoverEnabled = !!val;
  }
}

export const sound = new SoundFX();
