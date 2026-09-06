import { getPlatformOS } from './platformHelper';

let ExpoSpeech: any = null;
try {
  ExpoSpeech = require('expo-speech');
} catch (e) {
  // Graceful fallback
}

export interface VoiceConfig {
  isMuted: boolean;
  rate: number; // 0.85 to 1.2
  pitch: number; // 1.05 - 1.15 for pleasant female voice
  language: string; // 'en-IN' or 'en-US'
  cooldownMs: number; // minimum time between non-priority repeated utterances
}

export class VoiceNavigationService {
  private config: VoiceConfig = {
    isMuted: false,
    rate: 0.95,
    pitch: 1.12, // Pleasant, friendly female tone
    language: 'en-IN',
    cooldownMs: 5000,
  };

  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private isSpeaking: boolean = false;

  public setMuted(muted: boolean): void {
    this.config.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public isMuted(): boolean {
    return this.config.isMuted;
  }

  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Speak a navigation instruction with smart queue and anti-repetition filter
   */
  public async speak(text: string, isPriority: boolean = false): Promise<void> {
    if (this.config.isMuted || !text || text.trim() === '') return;

    const now = Date.now();
    const isDuplicate = this.lastSpokenText === text && now - this.lastSpokenTime < this.config.cooldownMs;

    if (isDuplicate && !isPriority) {
      return; // Skip duplicate repetitive chatter
    }

    if (isPriority) {
      this.stop(); // Priority immediately interrupts previous utterance
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;
    this.isSpeaking = true;

    const os = getPlatformOS();
    if (os === 'web') {
      this.speakWeb(text);
    } else if (os !== 'node' && ExpoSpeech) {
      try {
        ExpoSpeech.speak(text, {
          language: this.config.language,
          pitch: this.config.pitch,
          rate: this.config.rate,
          onDone: () => {
            this.isSpeaking = false;
          },
          onError: () => {
            this.isSpeaking = false;
          },
        });
      } catch (e) {
        this.isSpeaking = false;
      }
    } else {
      this.isSpeaking = false;
    }
  }

  private speakWeb(text: string): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.config.rate;
        utterance.pitch = this.config.pitch;
        utterance.lang = this.config.language;

        // Attempt to pick a natural female voice if available in the browser
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(
          v => (v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('google uk english female') ||
                v.name.toLowerCase().includes('veena') ||
                v.name.toLowerCase().includes('siri'))
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        utterance.onend = () => {
          this.isSpeaking = false;
        };
        utterance.onerror = () => {
          this.isSpeaking = false;
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      this.isSpeaking = false;
    }
  }

  public stop(): void {
    this.isSpeaking = false;
    const os = getPlatformOS();
    if (os === 'web') {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    } else if (os !== 'node' && ExpoSpeech) {
      try {
        ExpoSpeech.stop();
      } catch (e) {}
    }
  }
}

export const voiceNavigationService = new VoiceNavigationService();
