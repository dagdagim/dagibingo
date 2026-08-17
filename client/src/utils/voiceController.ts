import { CalledBall, NUMBER_WORDS } from '@bingo/shared';

class VoiceController {
  private isSpeechAvailable = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private audioCtx: AudioContext | null = null;
  private volume = 0.9;
  private rate = 1.0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isSpeechAvailable = true;
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices(): void {
    if (!this.isSpeechAvailable) return;
    const voices = window.speechSynthesis.getVoices();
    this.selectedVoice =
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setRate(r: number): void {
    this.rate = Math.max(0.7, Math.min(1.4, r));
  }

  public speakBall(ball: CalledBall, customVolume?: number, customRate?: number): void {
    if (!this.isSpeechAvailable) {
      this.playFallbackChime();
      return;
    }

    const targetVolume = customVolume !== undefined ? customVolume : this.volume;
    const targetRate = customRate !== undefined ? customRate : this.rate;

    if (targetVolume <= 0) return;

    try {
      window.speechSynthesis.cancel();

      const word = NUMBER_WORDS[ball.number] || ball.number.toString();
      const textToSpeak = `${ball.letter} ${ball.number}. ${ball.letter}, ${word.toLowerCase()}`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.volume = Math.max(0, Math.min(1, targetVolume));
      utterance.rate = Math.max(0.7, Math.min(1.4, targetRate));
      utterance.pitch = 1.05;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      this.playFallbackChime();
    }
  }

  public speakCustom(text: string, volume?: number): void {
    if (!this.isSpeechAvailable) return;
    const targetVolume = volume !== undefined ? volume : this.volume;
    if (targetVolume <= 0) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = targetVolume;
      utterance.rate = this.rate;
      if (this.selectedVoice) utterance.voice = this.selectedVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore
    }
  }

  public playFallbackChime(): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch {
      // Audio context not allowed before user interaction
    }
  }
}

export const voiceController = new VoiceController();
