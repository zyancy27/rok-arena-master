/**
 * Campaign Pacing Framework
 * 
 * Client-side pacing calculations that mirror the server-side pacing logic
 * in the story orchestrator. Used for UI display and local pacing hints.
 */

export type CampaignLength = 'short' | 'medium' | 'long';
export type PacingPhase = 'early' | 'midgame' | 'late_mid' | 'endgame';

interface PacingConfig {
  maxDays: number;
  earlyUntil: number;
  midUntil: number;
  lateFrom: number;
}

const PACING_CONFIGS: Record<CampaignLength, PacingConfig> = {
  short: { maxDays: 5, earlyUntil: 2, midUntil: 3, lateFrom: 4 },
  medium: { maxDays: 15, earlyUntil: 4, midUntil: 10, lateFrom: 12 },
  long: { maxDays: 40, earlyUntil: 10, midUntil: 28, lateFrom: 35 },
};

export function getPacingPhase(campaignLength: CampaignLength, currentDay: number): PacingPhase {
  const config = PACING_CONFIGS[campaignLength] || PACING_CONFIGS.medium;
  if (currentDay <= config.earlyUntil) return 'early';
  if (currentDay <= config.midUntil) return 'midgame';
  if (currentDay >= config.lateFrom) return 'endgame';
  return 'late_mid';
}

export function getPacingProgress(campaignLength: CampaignLength, currentDay: number): number {
  const config = PACING_CONFIGS[campaignLength] || PACING_CONFIGS.medium;
  return Math.min(100, Math.round((currentDay / config.maxDays) * 100));
}

export function getPacingLabel(phase: PacingPhase): string {
  switch (phase) {
    case 'early': return 'Act I — Establishment';
    case 'midgame': return 'Act II — Complications';
    case 'late_mid': return 'Act II — Rising Stakes';
    case 'endgame': return 'Act III — Climax';
  }
}

/** Estimated time cost for common action types (in time blocks) */
export const ACTION_TIME_COSTS = {
  instant: 0,       // quick look, pick up item, brief exchange
  short: 1,         // conversation, combat encounter, room search
  medium: 2,        // travel, full rest, long negotiation, thorough exploration
  long: 3,          // overnight rest, long-distance travel, major undertaking
} as const;

/** Legacy build method for CampaignSeedBuilder compatibility */
function build(conflictDensity: 'low' | 'medium' | 'high' = 'medium') {
  const pacingCurve = conflictDensity === 'high'
    ? ['immediate hook', 'compounding pressure', 'hard turn', 'counterplay', 'payoff']
    : ['hook', 'exploration', 'complication', 'escalation', 'payoff'];

  return {
    pacingCurve,
    progressionShape: conflictDensity === 'high'
      ? ['sharp rise', 'compressed midpoint', 'volatile finish']
      : ['steady rise', 'midpoint reveal', 'earned resolution'],
  };
}

export const CampaignPacingFramework = {
  build,
  getPacingPhase,
  getPacingProgress,
  getPacingLabel,
  ACTION_TIME_COSTS,
  PACING_CONFIGS,
};
