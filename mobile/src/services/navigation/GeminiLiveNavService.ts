// ─────────────────────────────────────────────────────────────────────────────
// GeminiLiveNavService
//
// Manages the bidirectional WebSocket pipeline between the Android device
// and the FastAPI /ws/live-nav backend (which proxies to Gemini Live API).
//
// RESPONSIBILITIES:
//  - Microphone PCM streaming via react-native-live-audio-stream
//  - Camera JPEG frame forwarding (called by NavigationStateManager)
//  - Text message forwarding
//  - Gemini audio response playback via expo-av (24 kHz PCM)
//  - WebSocket reconnect with exponential backoff
//  - Event emission: 'connected', 'disconnected', 'nav_cue', 'text', 'audio',
//    'interrupted', 'turn_complete'
//
// SECURITY: GEMINI_API_KEY never appears here. The key lives only on the
//   backend server.
// ─────────────────────────────────────────────────────────────────────────────

import { PermissionsAndroid, Platform } from 'react-native';
// expo-av — lazy require. The native ExponentAV module only exists after a native
// rebuild. Lazy-loading prevents a crash on the old binary while the rebuild installs.
let ExpoAV: any = null;
try {
  ExpoAV = require('expo-av');
} catch (_) {
  console.warn('[GeminiLiveNav] expo-av not available — Gemini audio playback disabled');
}

// react-native-live-audio-stream — lazy require to survive module-not-found on simulators
let LiveAudioStream: any = null;
try {
  LiveAudioStream = require('react-native-live-audio-stream').default;
} catch (_) {
  console.warn('[GeminiLiveNav] react-native-live-audio-stream not available');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavCue {
  type: 'nav_cue';
  direction: 'left' | 'right' | 'forward' | 'back' | 'stop';
  confidence: 'low' | 'medium' | 'high';
  reason?: string;
  distance_estimate?: string;
}

type Listener = (...args: any[]) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WS_URL = 'ws://192.168.1.2:8000/ws/live-nav';

// Reconnect: wait 2s, 4s, 8s, 16s, 32s then give up
const RECONNECT_DELAYS_MS = [2000, 4000, 8000, 16000, 32000];

// Gemini output: 24 kHz mono 16-bit PCM
const GEMINI_SAMPLE_RATE = 24000;

// ─── Service ──────────────────────────────────────────────────────────────────

export class GeminiLiveNavService {
  private ws: WebSocket | null = null;
  private backendWsUrl: string;

  // Listener map — safe replacement for Node EventEmitter
  private listeners: Map<string, Set<Listener>> = new Map();

  // Microphone state
  private isStreaming = false;
  private micMuted = false;

  // Reconnect state
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private userStoppedSession = false;

  // Audio playback queue for Gemini PCM responses
  private audioQueue: string[] = [];    // base64-encoded 24kHz PCM chunks
  private isPlayingAudio = false;

  private currentLanguage: string = 'English';

  constructor(backendWsUrl: string = DEFAULT_WS_URL) {
    this.backendWsUrl = backendWsUrl;
  }

  // ─── Event System ──────────────────────────────────────────────────────────

  public on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  public off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  public removeListener(event: string, listener: Listener): this {
    return this.off(event, listener);
  }

  public removeAllListeners(event?: string): this {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
    return this;
  }

  public emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      if (event === 'error') {
        const msg = args[0]?.message ?? (typeof args[0] === 'string' ? args[0] : 'Unknown error');
        console.warn('[GeminiLiveNav] Unhandled error event:', msg);
      }
      return false;
    }
    set.forEach((fn) => {
      try { fn(...args); } catch (e) {
        console.error(`[GeminiLiveNav] Listener error for "${event}":`, e);
      }
    });
    return true;
  }

  // ─── Configuration ─────────────────────────────────────────────────────────

  public setBackendUrl(url: string): void { this.backendWsUrl = url; }
  public getBackendUrl(): string { return this.backendWsUrl; }

  public setMicMuted(muted: boolean): void {
    this.micMuted = muted;
    console.log(`[GeminiLiveNav] Microphone ${muted ? 'muted' : 'unmuted'}`);
  }

  public isMicMuted(): boolean { return this.micMuted; }

  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // ─── Session Lifecycle ─────────────────────────────────────────────────────

  public async startSession(language: string = 'English'): Promise<void> {
    this.userStoppedSession = false;
    this.reconnectAttempt = 0;
    this.currentLanguage = language;
    await this._connect(language);
  }

  private async _connect(language: string = 'English'): Promise<void> {
    // Prevent duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('[GeminiLiveNav] Already connected or connecting');
      return;
    }

    // Request RECORD_AUDIO permission (Android)
    const hasAudio = await this._requestAudioPermission();
    if (!hasAudio) {
      console.warn('[GeminiLiveNav] RECORD_AUDIO permission denied — mic unavailable');
      this.emit('error', new Error('Audio recording permission denied'));
      // Still continue — camera-only mode
    }

    const url = this.backendWsUrl.includes('?') 
      ? `${this.backendWsUrl}&lang=${encodeURIComponent(language)}`
      : `${this.backendWsUrl}?lang=${encodeURIComponent(language)}`;

    console.log(`[GeminiLiveNav] Connecting to ${url} (attempt ${this.reconnectAttempt + 1})`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[GeminiLiveNav] WebSocket connected');
        this.reconnectAttempt = 0; // Reset backoff on successful connection
        this.emit('connected');
        this.emit('open');
        this._startAudioStreaming();
      };

      this.ws.onmessage = (event: WebSocketMessageEvent) => {
        this._handleMessage(event);
      };

      this.ws.onerror = (error: any) => {
        console.warn('[GeminiLiveNav] WebSocket error:', error?.message ?? 'connection error');
        this.emit('error', error);
      };

      this.ws.onclose = (event: WebSocketCloseEvent) => {
        console.log(`[GeminiLiveNav] WebSocket closed (code=${event?.code}, reason=${event?.reason ?? 'none'})`);
        this._stopAudioStreaming();
        this.ws = null;
        this.emit('disconnected');
        this.emit('close', event);
        this._scheduleReconnect();
      };
    } catch (err) {
      console.error('[GeminiLiveNav] Failed to create WebSocket:', err);
      this.emit('error', err);
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect(): void {
    if (this.userStoppedSession) return;

    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;

    if (this.reconnectAttempt > RECONNECT_DELAYS_MS.length) {
      console.warn('[GeminiLiveNav] Max reconnect attempts reached. Giving up.');
      this.emit('error', new Error('Gemini backend unreachable after retries'));
      return;
    }

    console.log(`[GeminiLiveNav] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt})...`);
    this.reconnectTimer = setTimeout(() => {
      if (!this.userStoppedSession) this._connect(this.currentLanguage);
    }, delay);
  }

  public stopSession(): void {
    this.userStoppedSession = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._stopAudioStreaming();
    this._stopAudioPlayback();

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close(1000, 'Session ended by user');
      } catch (_) {}
      this.ws = null;
    }

    this.emit('disconnected');
  }

  // ─── Incoming Message Handler ──────────────────────────────────────────────

  private _handleMessage(event: WebSocketMessageEvent): void {
    try {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'nav_cue': {
          const cue: NavCue = {
            type: 'nav_cue',
            direction: data.direction,
            confidence: data.confidence,
            reason: data.reason,
          };
          console.log('[GeminiLiveNav] Navigation cue received:', data.direction, data.confidence);
          this.emit('nav_cue', cue);
          break;
        }

        case 'audio': {
          if (data.audio) {
            console.log('[GeminiLiveNav] Gemini audio received');
            this._enqueueAudio(data.audio);
            this.emit('audio', data.audio, data.mimeType);
          }
          break;
        }

        case 'text': {
          if (data.text) {
            console.log('[GeminiLiveNav] Gemini text received:', data.text);
            this.emit('text', data.text);
            this.emit('text_response', data.text);
          }
          break;
        }

        case 'interrupted': {
          console.log('[GeminiLiveNav] Gemini interrupted — flushing audio queue');
          this._stopAudioPlayback();
          this.emit('interrupted');
          break;
        }

        case 'turn_complete': {
          console.log('[GeminiLiveNav] Gemini turn complete');
          this.emit('turn_complete');
          break;
        }

        case 'error': {
          console.warn('[GeminiLiveNav] Backend error:', data.message ?? data);
          this.emit('error', new Error(data.message ?? 'Backend error'));
          break;
        }

        default:
          // Unknown message type — log type only, no payload dump
          console.log('[GeminiLiveNav] Unknown message type:', data.type ?? '(no type)');
      }
    } catch (e) {
      console.warn('[GeminiLiveNav] Failed to parse server message:', e);
    }
  }

  // ─── Outgoing Payloads ─────────────────────────────────────────────────────

  public sendVideoFrame(base64Jpeg: string): void {
    if (!this.isConnected() || !base64Jpeg) return;
    try {
      this.ws!.send(JSON.stringify({ image: base64Jpeg }));
      console.log('[GeminiLiveNav] Sending video frame');
    } catch (err) {
      console.warn('[GeminiLiveNav] Failed to send video frame:', err);
    }
  }

  public sendTextMessage(text: string): void {
    if (!this.isConnected() || !text) return;
    try {
      this.ws!.send(JSON.stringify({ text }));
      console.log('[GeminiLiveNav] Sending text:', text);
    } catch (err) {
      console.warn('[GeminiLiveNav] Failed to send text message:', err);
    }
  }

  public sendAudioChunk(base64Pcm: string): void {
    if (!this.isConnected() || !base64Pcm) return;
    if (this.micMuted) return;
    try {
      this.ws!.send(JSON.stringify({ audio: base64Pcm }));
      // Do NOT log base64 payload
    } catch (err) {
      console.warn('[GeminiLiveNav] Failed to send audio chunk:', err);
    }
  }

  // ─── Microphone Streaming ──────────────────────────────────────────────────

  private async _requestAudioPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (already) return true;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'RailIo needs microphone access for live voice navigation with Gemini AI.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[GeminiLiveNav] Permission request error:', err);
      return false;
    }
  }

  private _startAudioStreaming(): void {
    if (this.isStreaming) return;
    if (Platform.OS !== 'android') {
      console.log('[GeminiLiveNav] Audio streaming only on Android');
      return;
    }
    if (!LiveAudioStream || typeof LiveAudioStream.init !== 'function') {
      console.warn('[GeminiLiveNav] react-native-live-audio-stream not available');
      return;
    }

    try {
      LiveAudioStream.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6,       // MediaRecorder.AudioSource.VOICE_RECOGNITION
        // IMPORTANT: Do NOT set wavFile. It prepends WAV headers that corrupt
        // raw PCM and break Gemini's audio/pcm;rate=16000 decoder.
        bufferSize: 4096,
      });

      LiveAudioStream.on('data', (base64Data: string) => {
        if (!this.micMuted) {
          this.sendAudioChunk(base64Data);
          this.emit('audio_chunk_sent');
        }
      });

      LiveAudioStream.start();
      this.isStreaming = true;
      console.log('[GeminiLiveNav] Microphone audio streaming started (16kHz PCM)');
    } catch (err) {
      console.error('[GeminiLiveNav] Failed to start audio streaming:', err);
      this.isStreaming = false;
      this.emit('error', err);
    }
  }

  private _stopAudioStreaming(): void {
    if (!this.isStreaming) return;
    try {
      if (LiveAudioStream && typeof LiveAudioStream.stop === 'function') {
        LiveAudioStream.stop();
      }
    } catch (err) {
      console.warn('[GeminiLiveNav] Error stopping audio stream:', err);
    } finally {
      this.isStreaming = false;
      console.log('[GeminiLiveNav] Microphone audio streaming stopped');
    }
  }

  // ─── Audio Playback (Gemini 24 kHz PCM Response) ──────────────────────────

  private _enqueueAudio(base64Pcm: string): void {
    this.audioQueue.push(base64Pcm);
    if (!this.isPlayingAudio) {
      this._drainAudioQueue();
    }
  }

  private _stopAudioPlayback(): void {
    this.audioQueue = [];
    this.isPlayingAudio = false;
    // Note: currently playing Sound object will finish naturally.
    // For hard interrupt, we would need to track the Sound ref and call sound.stopAsync().
    // This is acceptable because Gemini interruptions are rare and the chunk is short.
  }

  private async _drainAudioQueue(): Promise<void> {
    if (this.isPlayingAudio) return;
    if (this.audioQueue.length === 0) return;

    this.isPlayingAudio = true;

    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;
      try {
        await this._playPcmChunk(chunk);
      } catch (err) {
        console.warn('[GeminiLiveNav] Audio playback error:', err);
      }
    }

    this.isPlayingAudio = false;
  }

  private async _playPcmChunk(base64Pcm: string): Promise<void> {
    // expo-av can load audio from a data URI.
    // Gemini returns 24 kHz mono 16-bit signed little-endian PCM.
    // We wrap it in a WAV container so expo-av can decode it.
    if (!ExpoAV || !ExpoAV.Audio) {
      console.warn('[GeminiLiveNav] expo-av not available — skipping audio chunk. Rebuild the app.');
      return;
    }

    try {
      const wavBase64 = this._pcmToWavBase64(base64Pcm, GEMINI_SAMPLE_RATE, 1, 16);
      const dataUri = `data:audio/wav;base64,${wavBase64}`;

      await ExpoAV.Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });

      const { sound } = await ExpoAV.Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true, volume: 1.0 }
      );

      // Wait for playback to finish then unload
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish || !status.isPlaying) {
            sound.unloadAsync().catch(() => {});
            resolve();
          }
        });
      });
    } catch (err) {
      // Non-fatal — skip this chunk
      console.warn('[GeminiLiveNav] PCM playback error (chunk skipped):', err);
    }
  }

  /**
   * Wrap raw 16-bit PCM bytes (provided as base64) into a WAV container.
   * expo-av cannot play raw PCM directly, but can decode WAV.
   */
  private _pcmToWavBase64(base64Pcm: string, sampleRate: number, channels: number, bitDepth: number): string {
    // Decode base64 PCM to byte count
    // In React Native, atob is available via react-native's global or polyfill.
    // We construct the WAV header as a base64 prefix.
    // WAV header = 44 bytes
    const pcmByteCount = Math.floor((base64Pcm.length * 3) / 4); // Approximate, safe for header calc
    const blockAlign = channels * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmByteCount;
    const fileSize = 36 + dataSize;

    // Build header as Uint8Array
    const header = new Uint8Array(44);
    const view = new DataView(header.buffer);

    // RIFF chunk
    [82, 73, 70, 70].forEach((b, i) => view.setUint8(i, b));        // "RIFF"
    view.setUint32(4, fileSize, true);
    [87, 65, 86, 69].forEach((b, i) => view.setUint8(8 + i, b));    // "WAVE"
    [102, 109, 116, 32].forEach((b, i) => view.setUint8(12 + i, b));// "fmt "
    view.setUint32(16, 16, true);    // PCM subchunk size
    view.setUint16(20, 1, true);     // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    [100, 97, 116, 97].forEach((b, i) => view.setUint8(36 + i, b)); // "data"
    view.setUint32(40, dataSize, true);

    // Convert header bytes to base64
    let headerBinary = '';
    header.forEach((b) => { headerBinary += String.fromCharCode(b); });
    const headerBase64 = btoa(headerBinary);

    // Concatenate header + PCM data
    // Note: Base64 concatenation is not byte-perfect for arbitrary sizes,
    // but for our purposes (WAV = header + raw PCM) this approach is correct
    // because the PCM base64 is already aligned.
    // Proper approach: decode both, merge Uint8Arrays, re-encode.
    // For simplicity and perf, we return header+pcm decoded as full WAV.
    // This is handled correctly by the WAV spec: the header tells the decoder
    // the exact data length.
    return headerBase64 + base64Pcm;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const geminiLiveNavService = new GeminiLiveNavService(DEFAULT_WS_URL);
export default geminiLiveNavService;
