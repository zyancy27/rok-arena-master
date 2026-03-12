/**
 * SpeechManager — manages TTS audio playback.
 * Ensures only one narrator voice plays at a time.
 * Emits boundary events based on audio currentTime for sync.
 */

import { splitNarrationSegments, getNpcVoiceSettings } from '@/lib/audio/npc-voice-pool';

export type NarratorSceneContext =
  | 'exploration' | 'peaceful' | 'danger' | 'combat'
  | 'tragic' | 'victory' | 'npc' | 'whisper' | 'default';

export interface SpeechBoundaryEvent {
  /** Character index in the full text that the narrator has reached */
  charIndex: number;
  /** Fraction of total text spoken (0–1) */
  progress: number;
}

export type BoundaryCallback = (event: SpeechBoundaryEvent) => void;
export type StateCallback = (state: 'playing' | 'paused' | 'stopped') => void;

function detectSceneContext(text: string): NarratorSceneContext {
  const t = text.toLowerCase();
  // Whisper detection — stealth/caution takes priority when no active combat
  const isStealth = /\b(sneak|creep|tiptoe|crouch|stealth|silently|quietly|cautious|carefully|slip past|stay hidden|keep low|move slow|edge closer|peer around|lurk|skulk|inch forward)\b/.test(t);
  const isCombat = /\b(attack|strikes?|slash|punch|dodge|block|parry|combat|fight|clash|lunge|charge|arrow|spell hits)\b/.test(t);
  if (isStealth && !isCombat) return 'whisper';
  if (isCombat) return 'combat';
  if (/\b(victor|triumph|defeat|falls? (to|unconscious)|crumbles|vanquish|won|celebrate)\b/.test(t)) return 'victory';
  if (/\b(danger|threat|rumbl|creep|shadow|lurk|growl|hiss|scream|trembl|stalk|ominous|dread)\b/.test(t)) return 'danger';
  if (/[""\u201C].{8,}[""\u201D]/.test(text)) return 'npc';
  if (/\b(grief|mourn|tears?|weep|sorrow|loss|fallen|death|dying|funeral|sacrifice)\b/.test(t)) return 'tragic';
  if (/\b(gentle|calm|quiet|peace|soft|warm|rest|sleep|dawn|sunset|breeze|serene|safe)\b/.test(t)) return 'peaceful';
  if (/\b(cave|forest|path|corridor|door|passage|tunnel|room|chamber|trail|ruins|discover|explore)\b/.test(t)) return 'exploration';
  return 'default';
}

export class SpeechManager {
  private audio: HTMLAudioElement | null = null;
  private pollTimer: number | null = null;
  private cache = new Map<string, string>();
  private boundaryCallbacks: BoundaryCallback[] = [];
  private stateCallbacks: StateCallback[] = [];
  private currentText = '';
  private estimatedDuration = 0; // ms
  private volume = 0.8;

  /** Characters per second estimate for the narrator voice */
  private static readonly CHARS_PER_SECOND = 14;

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) this.audio.volume = this.volume;
  }

  onBoundary(cb: BoundaryCallback) {
    this.boundaryCallbacks.push(cb);
    return () => { this.boundaryCallbacks = this.boundaryCallbacks.filter(c => c !== cb); };
  }

  onStateChange(cb: StateCallback) {
    this.stateCallbacks.push(cb);
    return () => { this.stateCallbacks = this.stateCallbacks.filter(c => c !== cb); };
  }

  /** Stop any currently playing speech immediately */
  cancelAll() {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    this.currentText = '';
    this.estimatedDuration = 0;
    this.emitState('stopped');
  }

  get isPlaying(): boolean {
    return !!this.audio && !this.audio.paused;
  }

  get isPaused(): boolean {
    return !!this.audio && this.audio.paused && this.audio.currentTime > 0;
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      if (this.pollTimer != null) { clearInterval(this.pollTimer); this.pollTimer = null; }
      this.emitState('paused');
    }
  }

  resume() {
    if (this.audio && this.audio.paused && this.audio.currentTime > 0) {
      this.audio.play().catch(() => {});
      this.startPolling();
      this.emitState('playing');
    }
  }

  /**
   * Speak text from a given character offset.
   * Cancels any existing speech first.
   */
  async speak(
    fullText: string,
    startCharIndex = 0,
    context?: NarratorSceneContext,
  ): Promise<boolean> {
    this.cancelAll();

    const effectiveText = startCharIndex > 0 ? fullText.slice(startCharIndex) : fullText;
    if (!effectiveText.trim()) return false;

    this.currentText = fullText;
    this.estimatedDuration = (effectiveText.length / SpeechManager.CHARS_PER_SECOND) * 1000;

    const ctx = context || detectSceneContext(effectiveText);
    const cacheKey = `${ctx}:${effectiveText.substring(0, 200)}`;
    let audioUrl = this.cache.get(cacheKey);

    if (!audioUrl) {
      try {
        const segments = this.buildTtsSegments(effectiveText, ctx);
        const body = segments ? { segments } : { text: effectiveText, context: ctx };

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrator-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
          },
        );
        if (!response.ok) return false;
        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        this.cache.set(cacheKey, audioUrl);
        if (this.cache.size > 20) {
          const first = this.cache.keys().next().value;
          if (first) { const u = this.cache.get(first); if (u) URL.revokeObjectURL(u); this.cache.delete(first); }
        }
      } catch {
        return false;
      }
    }

    const audio = new Audio(audioUrl);
    audio.volume = this.volume;
    this.audio = audio;

    return new Promise<boolean>((resolve) => {
      audio.onloadedmetadata = () => {
        // Use actual duration if available
        if (audio.duration && isFinite(audio.duration)) {
          this.estimatedDuration = audio.duration * 1000;
        }
      };

      audio.onended = () => {
        this.cleanup();
        resolve(true);
      };

      audio.onerror = () => {
        this.cleanup();
        resolve(false);
      };

      audio.play().then(() => {
        this.emitState('playing');
        this.startPolling();
      }).catch(() => {
        this.cleanup();
        resolve(false);
      });
    });
  }

  /** Get current speech progress as 0–1 */
  getProgress(): number {
    if (!this.audio) return 0;
    const duration = this.audio.duration;
    if (!duration || !isFinite(duration)) return 0;
    return Math.min(this.audio.currentTime / duration, 1);
  }

  /** Get estimated character index based on playback progress */
  getCurrentCharIndex(): number {
    const progress = this.getProgress();
    return Math.floor(progress * this.currentText.length);
  }

  private startPolling() {
    if (this.pollTimer != null) clearInterval(this.pollTimer);
    // Poll at 100ms intervals for sync
    this.pollTimer = window.setInterval(() => {
      if (!this.audio || this.audio.paused) return;
      const progress = this.getProgress();
      const charIndex = Math.floor(progress * this.currentText.length);
      this.emitBoundary({ charIndex, progress });
    }, 100);
  }

  private cleanup() {
    if (this.pollTimer != null) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.audio = null;
    this.currentText = '';
    this.emitState('stopped');
  }

  private emitBoundary(event: SpeechBoundaryEvent) {
    for (const cb of this.boundaryCallbacks) cb(event);
  }

  private emitState(state: 'playing' | 'paused' | 'stopped') {
    for (const cb of this.stateCallbacks) cb(state);
  }

  private buildTtsSegments(text: string, context: NarratorSceneContext) {
    const segments = splitNarrationSegments(text);
    const hasNpc = segments.some(s => s.type === 'npc');
    if (!hasNpc) return null;
    return segments.map(seg => {
      if (seg.type === 'npc' && seg.voiceProfile) {
        return { text: seg.text, voiceId: seg.voiceProfile.voiceId, voiceSettings: getNpcVoiceSettings(seg.voiceProfile.tone) };
      }
      return { text: seg.text, context };
    });
  }

  dispose() {
    this.cancelAll();
    for (const url of this.cache.values()) URL.revokeObjectURL(url);
    this.cache.clear();
    this.boundaryCallbacks = [];
    this.stateCallbacks = [];
  }
}
