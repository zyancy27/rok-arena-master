/**
 * Momentum Meter System
 * 
 * Each character has a Momentum value (0–100).
 * At 100, they enter "Edge State" for 1–2 turns.
 * 
 * Momentum increases from:
 * - Landing clean combo chains
 * - Successfully countering
 * - Creative environmental interactions
 * - Exploiting physics anomalies
 * 
 * Momentum decreases from:
 * - Interrupted mid-action
 * - Glitch misfire
 * - Environmental hazard failure
 * - Psychological break
 */

export interface MomentumState {
  value: number; // 0-100
  edgeStateActive: boolean;
  edgeStateTurnsRemaining: number;
}

export interface MomentumEvent {
  type: 'gain' | 'loss';
  amount: number;
  reason: string;
}

const EDGE_STATE_DURATION = 2; // turns

// Precision bonus while in Edge State (percentage)
export const EDGE_STATE_PRECISION_BONUS = 10;
// Glitch chance reduction while in Edge State (percentage points)
export const EDGE_STATE_GLITCH_REDUCTION = 15;

export function createMomentumState(): MomentumState {
  return {
    value: 0,
    edgeStateActive: false,
    edgeStateTurnsRemaining: 0,
  };
}

/**
 * Detect momentum changes from battle message text
 */
export function detectMomentumEvents(
  message: string,
  isFromUser: boolean,
  hitLanded: boolean | null,
  wasCountered: boolean = false,
  glitchOccurred: boolean = false,
): MomentumEvent[] {
  const events: MomentumEvent[] = [];

  // === GAINS (for the character whose turn it is) ===
  if (isFromUser) {
    // Clean hit landed
    if (hitLanded === true) {
      events.push({ type: 'gain', amount: 12, reason: 'Attack connected' });
    }

    // Combo detection
    if (/combo|chain|follow[- ]?up|barrage|flurry|rapid|successive/i.test(message)) {
      events.push({ type: 'gain', amount: 8, reason: 'Combo chain' });
    }

    // Counter-attack
    if (wasCountered || /counter|parr(y|ied)|deflect|redirect|intercept|retaliat/i.test(message)) {
      events.push({ type: 'gain', amount: 15, reason: 'Successful counter' });
    }

    // Environmental creativity
    if (/terrain|environment|surroundings|debris|rubble|gravity.{0,15}(exploit|use|manipulat)/i.test(message)) {
      events.push({ type: 'gain', amount: 10, reason: 'Environmental play' });
    }

    // Physics exploit
    if (/momentum|inertia|trajectory|centrifugal|leverage|kinetic/i.test(message)) {
      events.push({ type: 'gain', amount: 8, reason: 'Physics exploitation' });
    }
  }

  // === LOSSES ===
  // Interrupted
  if (/interrupt|disrupt|cut.{0,5}off|stopped.{0,5}mid|cancel/i.test(message) && !isFromUser) {
    events.push({ type: 'loss', amount: 20, reason: 'Interrupted' });
  }

  // Glitch misfire
  if (glitchOccurred) {
    events.push({ type: 'loss', amount: 25, reason: 'Glitch misfire' });
  }

  // Environmental hazard failure
  if (/backfire|trap.{0,10}(spring|trigger|caught)|hazard.{0,10}(hit|struck|caught)/i.test(message)) {
    events.push({ type: 'loss', amount: 15, reason: 'Hazard failure' });
  }

  // Psychological break (detected externally, but some text hints)
  if (/panic|terrif|overwhelm|break.{0,5}(down|spirit)|shatter.{0,10}(will|resolve)/i.test(message) && !isFromUser) {
    events.push({ type: 'loss', amount: 30, reason: 'Psychological break' });
  }

  return events;
}

/**
 * Apply momentum events and return updated state
 */
export function applyMomentumEvents(
  state: MomentumState,
  events: MomentumEvent[],
  psychFearLevel: number = 50, // 0-100, influences momentum gain rate
  psychResolveLevel: number = 50,
): MomentumState {
  let newValue = state.value;

  for (const event of events) {
    if (event.type === 'gain') {
      // High resolve increases momentum gain slightly
      const resolveBonus = (psychResolveLevel - 50) / 100; // -0.5 to +0.5
      // High fear decreases gain
      const fearPenalty = (psychFearLevel - 50) / 150; // -0.33 to +0.33
      const modifier = 1 + resolveBonus - fearPenalty;
      newValue += Math.round(event.amount * Math.max(0.5, modifier));
    } else {
      newValue -= event.amount;
    }
  }

  newValue = Math.max(0, Math.min(100, newValue));

  // Check for Edge State activation
  let edgeStateActive = state.edgeStateActive;
  let edgeStateTurnsRemaining = state.edgeStateTurnsRemaining;

  if (newValue >= 100 && !state.edgeStateActive) {
    edgeStateActive = true;
    edgeStateTurnsRemaining = EDGE_STATE_DURATION;
    newValue = 100;
  }

  return {
    value: newValue,
    edgeStateActive,
    edgeStateTurnsRemaining,
  };
}

/**
 * Tick Edge State at end of turn
 */
export function tickEdgeState(state: MomentumState): MomentumState {
  if (!state.edgeStateActive) return state;

  const remaining = state.edgeStateTurnsRemaining - 1;
  if (remaining <= 0) {
    return {
      value: 70, // Drop to 70 after edge state expires
      edgeStateActive: false,
      edgeStateTurnsRemaining: 0,
    };
  }

  return {
    ...state,
    edgeStateTurnsRemaining: remaining,
  };
}

/**
 * Generate AI context string for momentum state
 */
export function getMomentumContext(
  userName: string,
  userMomentum: MomentumState,
  opponentName: string,
  opponentMomentum: MomentumState,
): string {
  const lines: string[] = ['\nMOMENTUM STATE:'];

  const describeState = (name: string, m: MomentumState) => {
    if (m.edgeStateActive) {
      lines.push(`• ${name} is in EDGE STATE (${m.edgeStateTurnsRemaining} turns remaining)! Enhanced precision, reduced glitch chance. Describe their movements as sharp, decisive, almost prescient.`);
    } else if (m.value >= 80) {
      lines.push(`• ${name} has HIGH momentum (${m.value}/100). They're building toward a peak. Describe growing confidence and sharper execution.`);
    } else if (m.value >= 50) {
      lines.push(`• ${name} has moderate momentum (${m.value}/100). They're finding their rhythm.`);
    } else if (m.value >= 20) {
      lines.push(`• ${name} has low momentum (${m.value}/100). They're struggling to find openings.`);
    } else {
      lines.push(`• ${name} has minimal momentum (${m.value}/100). They're on the back foot.`);
    }
  };

  describeState(userName, userMomentum);
  describeState(opponentName, opponentMomentum);

  return lines.join('\n');
}
