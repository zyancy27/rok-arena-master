/**
 * ExpressionPacket
 *
 * The core data structure that turns every chat message into a multi-layered
 * character expression. Produced by the NarratorBrain (via ExpressionDeriver)
 * and consumed by the CSS engine + render layer.
 *
 * NPCs never produce their own packets — the NarratorBrain is the sole authority.
 */

/* ── Emotion ── */

export type EmotionType =
  | 'neutral'
  | 'angry'
  | 'fearful'
  | 'calm'
  | 'joyful'
  | 'sorrowful'
  | 'disgusted'
  | 'surprised'
  | 'contemptuous'
  | 'curious'
  | 'determined'
  | 'desperate';

export interface EmotionState {
  type: EmotionType;
  /** 0–1 intensity scalar */
  intensity: number;
}

/* ── Body Language ── */

export interface BodyLanguageState {
  /** 0–1: how rushed / time-pressured */
  urgency: number;
  /** 0–1: composure / groundedness */
  stability: number;
  /** 0–1: nervous energy */
  agitation: number;
  /** 0–1: authority / assertiveness */
  dominance: number;
  /** 0–1: terror / dread */
  fear: number;
}

/* ── Vocal Style ── */

export type VocalTone =
  | 'neutral'
  | 'whisper'
  | 'shout'
  | 'growl'
  | 'sarcastic'
  | 'cold'
  | 'warm'
  | 'pleading'
  | 'commanding';

export interface VocalStyle {
  tone: VocalTone;
  /** 0–1: delivery speed */
  pacing: number;
  /** 0–1: crisp / cutting enunciation */
  sharpness: number;
  /** 0–1: stumbling / pausing */
  hesitation: number;
}

/* ── Physical State ── */

export interface PhysicalState {
  /** 0–1 */
  injured: number;
  /** 0–1 */
  tired: number;
  /** 0–1 — dizzy, off-balance, disoriented */
  unstable: number;
}

/* ── Presence ── */

export interface PresenceState {
  /** 0–1: visual authority */
  dominance: number;
  /** 0–1: how "heavy" / impactful this message feels */
  weight: number;
  /** 0–1: how focused the speaker's attention is */
  attention: number;
}

/* ── Environment Influence ── */

export type BiomeTag =
  | 'forest'
  | 'desert'
  | 'tundra'
  | 'volcanic'
  | 'urban'
  | 'void'
  | 'aquatic'
  | 'cavern'
  | 'cosmic'
  | 'ruins';

export interface EnvironmentInfluence {
  biome: BiomeTag;
  /** 0–1: scene tension */
  tension: number;
  /** descriptive tag — e.g. "eerie", "serene", "oppressive" */
  atmosphere: string;
}

/* ── Deception ── */

export interface DeceptionLayer {
  /** Whether the speaker is being deceptive */
  active: boolean;
  /** 0–1: how severe the lie */
  severity: number;
}

/* ── Attention ── */

export interface AttentionTarget {
  /** id of the entity the speaker is focused on */
  targetId: string | null;
  /** descriptive focus — e.g. "hostile", "protective", "dismissive" */
  focusType: string;
}

/* ── Full Packet ── */

export interface ExpressionPacket {
  speakerId: string;
  speakerRole: 'narrator' | 'npc' | 'player' | 'system' | 'party_ally' | 'enemy_combatant';

  emotion: EmotionState;
  bodyLanguage: BodyLanguageState;
  vocalStyle: VocalStyle;
  physicalState: PhysicalState;
  presence: PresenceState;
  environmentInfluence: EnvironmentInfluence;
  deception: DeceptionLayer;
  attentionTarget: AttentionTarget;

  /** The raw text content — for downstream rendering */
  text: string;
}

/* ── Defaults ── */

export const DEFAULT_EXPRESSION: Omit<ExpressionPacket, 'speakerId' | 'speakerRole' | 'text'> = {
  emotion: { type: 'neutral', intensity: 0.3 },
  bodyLanguage: { urgency: 0.2, stability: 0.8, agitation: 0.1, dominance: 0.5, fear: 0 },
  vocalStyle: { tone: 'neutral', pacing: 0.5, sharpness: 0.3, hesitation: 0 },
  physicalState: { injured: 0, tired: 0, unstable: 0 },
  presence: { dominance: 0.5, weight: 0.5, attention: 0.7 },
  environmentInfluence: { biome: 'cosmic', tension: 0.3, atmosphere: 'neutral' },
  deception: { active: false, severity: 0 },
  attentionTarget: { targetId: null, focusType: 'general' },
};
