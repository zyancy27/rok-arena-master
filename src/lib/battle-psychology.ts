/**
 * Psychological Combat Layer
 * 
 * Hidden stats: Confidence, Fear, Resolve, Rage
 * These influence: risk chance, accuracy, momentum gain rate, environmental resistance
 * 
 * Players never see numeric values — only subtle visual cues.
 */

export interface PsychologicalState {
  confidence: number; // 0-100
  fear: number;       // 0-100
  resolve: number;    // 0-100
  rage: number;       // 0-100
}

export type PsychEvent =
  | 'critically_hit'
  | 'outplayed'
  | 'surrounded'
  | 'dominating'
  | 'hit_landed'
  | 'hit_received'
  | 'dodge_success'
  | 'dodge_fail'
  | 'combo_chain'
  | 'interrupted'
  | 'ally_down'
  | 'edge_state_entered'
  | 'risk_occurred'
  | 'overcharge_success'
  | 'overcharge_fail';

export function createPsychologicalState(): PsychologicalState {
  return {
    confidence: 50,
    fear: 20,
    resolve: 50,
    rage: 20,
  };
}

/**
 * Apply a psychological event and return updated state
 */
export function applyPsychEvent(
  state: PsychologicalState,
  event: PsychEvent,
): PsychologicalState {
  const s = { ...state };

  switch (event) {
    case 'critically_hit':
      s.confidence = Math.max(0, s.confidence - 15);
      s.fear = Math.min(100, s.fear + 20);
      s.rage = Math.min(100, s.rage + 10);
      break;
    case 'outplayed':
      s.confidence = Math.max(0, s.confidence - 10);
      s.fear = Math.min(100, s.fear + 8);
      s.resolve = Math.min(100, s.resolve + 5); // Determination
      break;
    case 'surrounded':
      s.fear = Math.min(100, s.fear + 15);
      s.resolve = Math.min(100, s.resolve + 5);
      break;
    case 'dominating':
      s.confidence = Math.min(100, s.confidence + 15);
      s.fear = Math.max(0, s.fear - 10);
      s.rage = Math.max(0, s.rage - 5);
      break;
    case 'hit_landed':
      s.confidence = Math.min(100, s.confidence + 8);
      s.fear = Math.max(0, s.fear - 3);
      break;
    case 'hit_received':
      s.confidence = Math.max(0, s.confidence - 5);
      s.fear = Math.min(100, s.fear + 5);
      s.rage = Math.min(100, s.rage + 8);
      break;
    case 'dodge_success':
      s.confidence = Math.min(100, s.confidence + 10);
      s.resolve = Math.min(100, s.resolve + 5);
      break;
    case 'dodge_fail':
      s.confidence = Math.max(0, s.confidence - 8);
      s.fear = Math.min(100, s.fear + 5);
      break;
    case 'combo_chain':
      s.confidence = Math.min(100, s.confidence + 12);
      s.rage = Math.min(100, s.rage + 5);
      break;
    case 'interrupted':
      s.confidence = Math.max(0, s.confidence - 12);
      s.rage = Math.min(100, s.rage + 15);
      break;
    case 'edge_state_entered':
      s.confidence = Math.min(100, s.confidence + 20);
      s.fear = Math.max(0, s.fear - 15);
      break;
    case 'risk_occurred':
      s.confidence = Math.max(0, s.confidence - 10);
      s.fear = Math.min(100, s.fear + 10);
      break;
    case 'overcharge_success':
      s.confidence = Math.min(100, s.confidence + 15);
      s.rage = Math.min(100, s.rage + 10);
      break;
    case 'overcharge_fail':
      s.confidence = Math.max(0, s.confidence - 15);
      s.fear = Math.min(100, s.fear + 12);
      s.rage = Math.min(100, s.rage + 8);
      break;
  }

  return s;
}

/**
 * Detect psychological events from message text
 */
export function detectPsychEvents(
  message: string,
  isFromOpponent: boolean,
): PsychEvent[] {
  const events: PsychEvent[] = [];

  if (isFromOpponent) {
    if (/critical|devastating|crushing|massive.{0,10}(blow|hit|strike|damage)/i.test(message)) {
      events.push('critically_hit');
    }
    if (/outplay|outsmart|outmaneuver|read.{0,10}(move|attack|pattern)|anticipat/i.test(message)) {
      events.push('outplayed');
    }
    if (/surround|encircle|trap|corner|no.{0,5}escape|closing.{0,5}in/i.test(message)) {
      events.push('surrounded');
    }
    if (/hit|strike|punch|slash|blast|slam/i.test(message)) {
      events.push('hit_received');
    }
  } else {
    if (/dominat|overwhelm|relentless|unstoppable|can't.{0,5}keep.{0,5}up/i.test(message)) {
      events.push('dominating');
    }
    if (/combo|chain|follow.{0,3}up|barrage|flurry/i.test(message)) {
      events.push('combo_chain');
    }
  }

  if (/interrupt|disrupt|cancel|cut.{0,5}off/i.test(message) && isFromOpponent) {
    events.push('interrupted');
  }

  return events;
}

/**
 * Get risk chance modifier from psychological state
 * Returns a multiplier (1.0 = normal, >1 = increased, <1 = decreased)
 */
export function getRiskChanceModifier(state: PsychologicalState): number {
  // High Fear → increased risk
  const fearFactor = state.fear / 100; // 0-1
  // High Resolve → reduced risk
  const resolveFactor = state.resolve / 100; // 0-1
  // High Rage → slightly increased risk (loss of control)
  const rageFactor = state.rage / 200; // 0-0.5

  return 1 + (fearFactor * 0.5) - (resolveFactor * 0.3) + rageFactor;
}

/**
 * Get accuracy modifier from psychological state
 * Returns bonus/penalty percentage
 */
export function getAccuracyModifier(state: PsychologicalState): number {
  // High Confidence → better accuracy
  const confidenceBonus = (state.confidence - 50) * 0.1; // -5 to +5
  // High Fear → worse accuracy
  const fearPenalty = (state.fear - 30) * 0.08; // varies
  // High Rage → mixed (more power, less precision)
  const rageEffect = state.rage > 70 ? -2 : 0;

  return Math.round(confidenceBonus - fearPenalty + rageEffect);
}

/**
 * Get the dominant psychological "cue" for visual display
 * Returns at most one cue to show subtle visual hints
 */
export type PsychCue = 'focused' | 'shaken' | 'enraged' | 'resolute' | 'confident' | null;

export function getDominantPsychCue(state: PsychologicalState): PsychCue {
  if (state.rage >= 75) return 'enraged';
  if (state.fear >= 70) return 'shaken';
  if (state.resolve >= 75) return 'resolute';
  if (state.confidence >= 75) return 'confident';
  if (state.confidence >= 60 && state.fear < 30) return 'focused';
  return null;
}

/**
 * Generate AI context for psychological states
 */
export function getPsychologyContext(
  userName: string,
  userPsych: PsychologicalState,
  opponentName: string,
  opponentPsych: PsychologicalState,
): string {
  const lines: string[] = ['\nPSYCHOLOGICAL STATE (hidden from player, affects behavior):'];

  const describePsych = (name: string, p: PsychologicalState) => {
    const cue = getDominantPsychCue(p);
    switch (cue) {
      case 'enraged':
        lines.push(`• ${name}: ENRAGED — wild, powerful but imprecise. Subtle visual: reddish aura flicker.`);
        break;
      case 'shaken':
        lines.push(`• ${name}: SHAKEN — hesitant, flinching, second-guessing. Subtle: slight tremor in stance.`);
        break;
      case 'resolute':
        lines.push(`• ${name}: RESOLUTE — unbreakable will, absorbing punishment. Subtle: steady, grounded stance.`);
        break;
      case 'confident':
        lines.push(`• ${name}: CONFIDENT — sharp timing, bold moves. Subtle: relaxed posture, slight smirk.`);
        break;
      case 'focused':
        lines.push(`• ${name}: FOCUSED — calm, measured, efficient. Subtle: controlled breathing, narrowed eyes.`);
        break;
      default:
        lines.push(`• ${name}: Neutral psychological state.`);
    }
  };

  describePsych(userName, userPsych);
  describePsych(opponentName, opponentPsych);

  return lines.join('\n');
}
