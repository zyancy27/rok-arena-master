/**
 * EmotionalMomentumTracker
 *
 * Maintains emotional state across messages per speaker.
 * Emotion builds, decays, or shifts — it does NOT reset every message.
 *
 * The NarratorBrain calls `apply()` on every ExpressionPacket before render.
 * This is an in-memory singleton; state is session-scoped.
 */

import type { EmotionType, ExpressionPacket } from './ExpressionPacket';

interface SpeakerMomentum {
  emotion: EmotionType;
  intensity: number;
  /** Consecutive messages with same emotion — builds momentum */
  streak: number;
  /** Timestamp of last update */
  lastUpdated: number;
}

const DECAY_RATE = 0.08;
const BUILDUP_RATE = 0.12;
const MAX_STREAK_BONUS = 0.3;
const MOMENTUM_TIMEOUT_MS = 120_000; // 2 minutes

const speakerState = new Map<string, SpeakerMomentum>();

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const EmotionalMomentumTracker = {
  /**
   * Apply momentum to an expression packet, mutating and returning it.
   */
  apply(packet: ExpressionPacket): ExpressionPacket {
    const key = packet.speakerId;
    const now = Date.now();
    const prev = speakerState.get(key);

    if (!prev || now - prev.lastUpdated > MOMENTUM_TIMEOUT_MS) {
      // Fresh start or timeout — no momentum
      speakerState.set(key, {
        emotion: packet.emotion.type,
        intensity: packet.emotion.intensity,
        streak: 1,
        lastUpdated: now,
      });
      return packet;
    }

    const sameEmotion = prev.emotion === packet.emotion.type;

    if (sameEmotion) {
      // Build momentum
      const newStreak = prev.streak + 1;
      const streakBonus = Math.min(newStreak * BUILDUP_RATE, MAX_STREAK_BONUS);
      const newIntensity = clamp01(
        (prev.intensity + packet.emotion.intensity) / 2 + streakBonus,
      );

      packet.emotion.intensity = newIntensity;

      // Escalate body language with momentum
      if (packet.emotion.type === 'angry') {
        packet.bodyLanguage.agitation = clamp01(packet.bodyLanguage.agitation + streakBonus * 0.5);
        packet.bodyLanguage.dominance = clamp01(packet.bodyLanguage.dominance + streakBonus * 0.3);
      } else if (packet.emotion.type === 'fearful') {
        packet.bodyLanguage.fear = clamp01(packet.bodyLanguage.fear + streakBonus * 0.6);
        packet.bodyLanguage.stability = clamp01(packet.bodyLanguage.stability - streakBonus * 0.4);
      } else if (packet.emotion.type === 'calm') {
        packet.bodyLanguage.stability = clamp01(packet.bodyLanguage.stability + streakBonus * 0.3);
        packet.bodyLanguage.agitation = clamp01(packet.bodyLanguage.agitation - streakBonus * 0.3);
      }

      speakerState.set(key, {
        emotion: packet.emotion.type,
        intensity: newIntensity,
        streak: newStreak,
        lastUpdated: now,
      });
    } else {
      // Emotion shift — apply decay from previous, reset streak
      const decayedPrevIntensity = clamp01(prev.intensity - DECAY_RATE * prev.streak);
      // Blend the transition — don't snap entirely
      packet.emotion.intensity = clamp01(
        packet.emotion.intensity * 0.7 + decayedPrevIntensity * 0.3,
      );

      speakerState.set(key, {
        emotion: packet.emotion.type,
        intensity: packet.emotion.intensity,
        streak: 1,
        lastUpdated: now,
      });
    }

    return packet;
  },

  /** Reset all momentum (e.g. on scene change) */
  reset() {
    speakerState.clear();
  },

  /** Reset momentum for a specific speaker */
  resetSpeaker(speakerId: string) {
    speakerState.delete(speakerId);
  },

  /** Get current momentum state for debugging */
  getState(speakerId: string): SpeakerMomentum | undefined {
    return speakerState.get(speakerId);
  },
};
