/**
 * Adaptive AI Behavior Learning Engine
 *
 * Tracks player patterns across turns and adjusts opponent strategy every 2–3 turns.
 *
 * Tracked dimensions:
 *  - Aggression frequency (offensive vs defensive moves)
 *  - Defense timing (early / reactive / none)
 *  - Element / power usage preferences
 *  - Risk tolerance (overcharge frequency, reckless moves)
 *  - Combo tendency (chain attacks vs single big hits)
 *  - Predictability score (how repetitive the player is)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerPattern {
  /** Number of clearly offensive actions */
  offensiveActions: number;
  /** Number of clearly defensive actions */
  defensiveActions: number;
  /** Number of neutral / tactical actions */
  neutralActions: number;
  /** Count of overcharge uses */
  overchargeUses: number;
  /** Count of concentration (dodge) uses */
  concentrationUses: number;
  /** Keyword buckets for element / power usage */
  elementUsage: Record<string, number>;
  /** Recent action keywords (ring buffer of last 8) */
  recentKeywords: string[];
  /** Total turns tracked */
  totalTurns: number;
  /** Number of combo-style chains detected */
  comboAttempts: number;
  /** Number of environmental interactions */
  environmentPlays: number;
}

export interface AdaptiveStrategy {
  /** 0 = fully defensive, 100 = fully aggressive */
  aggressionBias: number;
  /** Which elements to favour in counter-play */
  counterElements: string[];
  /** Short tactical instruction injected into AI prompt */
  tacticalDirective: string;
  /** Difficulty modifier: 0.8 (easier) → 1.3 (harder) */
  difficultyScale: number;
  /** Whether the AI should try to bait the player */
  useBait: boolean;
  /** Whether the AI should punish predictability */
  exploitPredictability: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADAPTATION_INTERVAL = 3; // re-evaluate every N turns

const ELEMENT_PATTERNS: Record<string, RegExp> = {
  fire: /\b(fire|flame|burn|blaze|inferno|ignite|lava|heat|scorch)\w*/i,
  ice: /\b(ice|freeze|frost|cold|chill|blizzard|glacial|cryo)\w*/i,
  lightning: /\b(lightning|thunder|electric|shock|volt|spark|storm)\w*/i,
  psychic: /\b(psychic|mental|mind|telekinesis|telepathy|brain|thought)\w*/i,
  physical: /\b(punch|kick|slam|strike|smash|grapple|throw|headbutt|elbow)\w*/i,
  energy: /\b(energy|beam|blast|ray|ki|chakra|aura|mana|nen)\w*/i,
  dark: /\b(dark|shadow|void|death|necro|curse|corrupt)\w*/i,
  nature: /\b(nature|earth|plant|vine|root|quake|terrain|rock)\w*/i,
};

const OFFENSIVE_PATTERNS =
  /\b(attack|strike|slash|blast|charge|rush|punch|kick|smash|destroy|unleash|fire|launch|throw|hurl|barrage)\w*/i;
const DEFENSIVE_PATTERNS =
  /\b(defend|block|dodge|shield|parry|evade|guard|retreat|heal|recover|absorb|counter|deflect)\w*/i;
const COMBO_PATTERNS =
  /\b(combo|chain|follow[- ]?up|flurry|rapid|successive|barrage|then|and then|immediately)\w*/i;
const ENVIRONMENT_PATTERNS =
  /\b(terrain|environment|surroundings|debris|rubble|pillar|wall|tree|building|gravity|leverage)\w*/i;

// ─── Core API ─────────────────────────────────────────────────────────────────

export function createPlayerPattern(): PlayerPattern {
  return {
    offensiveActions: 0,
    defensiveActions: 0,
    neutralActions: 0,
    overchargeUses: 0,
    concentrationUses: 0,
    elementUsage: {},
    recentKeywords: [],
    totalTurns: 0,
    comboAttempts: 0,
    environmentPlays: 0,
  };
}

/**
 * Record a player's action text and update the pattern tracker.
 */
export function recordPlayerAction(
  pattern: PlayerPattern,
  actionText: string,
  usedOvercharge: boolean,
  usedConcentration: boolean,
): PlayerPattern {
  const next = { ...pattern };
  next.totalTurns += 1;

  // Classify action intent
  const isOffensive = OFFENSIVE_PATTERNS.test(actionText);
  const isDefensive = DEFENSIVE_PATTERNS.test(actionText);
  if (isOffensive && !isDefensive) next.offensiveActions += 1;
  else if (isDefensive && !isOffensive) next.defensiveActions += 1;
  else if (isOffensive && isDefensive) {
    next.offensiveActions += 0.5;
    next.defensiveActions += 0.5;
  } else next.neutralActions += 1;

  // Track overcharge / concentration
  if (usedOvercharge) next.overchargeUses += 1;
  if (usedConcentration) next.concentrationUses += 1;

  // Combo detection
  if (COMBO_PATTERNS.test(actionText)) next.comboAttempts += 1;

  // Environment usage
  if (ENVIRONMENT_PATTERNS.test(actionText)) next.environmentPlays += 1;

  // Element tracking
  const newElementUsage = { ...next.elementUsage };
  for (const [element, regex] of Object.entries(ELEMENT_PATTERNS)) {
    if (regex.test(actionText)) {
      newElementUsage[element] = (newElementUsage[element] || 0) + 1;
    }
  }
  next.elementUsage = newElementUsage;

  // Recent keywords (keep last 8)
  const words = actionText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);
  next.recentKeywords = [...next.recentKeywords, ...words].slice(-8);

  return next;
}

/**
 * Derive the current adaptive strategy from the tracked pattern.
 * Called every ADAPTATION_INTERVAL turns.
 */
export function deriveStrategy(pattern: PlayerPattern): AdaptiveStrategy {
  const total = pattern.offensiveActions + pattern.defensiveActions + pattern.neutralActions || 1;

  // ── Aggression ratio ──
  const aggressionRatio = pattern.offensiveActions / total;
  const defenseRatio = pattern.defensiveActions / total;

  // Counter: if player is aggressive, AI becomes more defensive/counter-heavy and vice-versa
  const aggressionBias = Math.round(
    aggressionRatio > 0.6
      ? 30 + Math.random() * 15 // player aggressive → AI defensive
      : defenseRatio > 0.5
        ? 70 + Math.random() * 15 // player defensive → AI aggressive
        : 45 + Math.random() * 20, // balanced → balanced-ish
  );

  // ── Counter-elements ──
  const sortedElements = Object.entries(pattern.elementUsage)
    .sort((a, b) => b[1] - a[1]);
  const topElements = sortedElements.slice(0, 2).map(([el]) => el);
  const counterElements = topElements.map(elementCounter);

  // ── Risk tolerance ──
  const riskRatio = pattern.overchargeUses / (pattern.totalTurns || 1);
  const isRiskTaker = riskRatio > 0.3;

  // ── Predictability ──
  const uniqueKeywords = new Set(pattern.recentKeywords).size;
  const predictabilityScore = 1 - uniqueKeywords / Math.max(pattern.recentKeywords.length, 1);
  const exploitPredictability = predictabilityScore > 0.5 && pattern.totalTurns >= 4;

  // ── Difficulty scaling ──
  // Ramp slightly if player is dominating (lots of offense, combos)
  const dominanceSignal =
    aggressionRatio * 0.4 +
    (pattern.comboAttempts / (pattern.totalTurns || 1)) * 0.3 +
    (pattern.environmentPlays / (pattern.totalTurns || 1)) * 0.3;
  const difficultyScale = Math.min(1.3, Math.max(0.8, 0.9 + dominanceSignal * 0.4));

  // ── Bait ──
  const useBait = isRiskTaker || aggressionRatio > 0.65;

  // ── Tactical directive ──
  const directive = buildDirective({
    aggressionRatio,
    defenseRatio,
    counterElements,
    isRiskTaker,
    exploitPredictability,
    useBait,
    comboHeavy: pattern.comboAttempts / (pattern.totalTurns || 1) > 0.3,
    environmentHeavy: pattern.environmentPlays / (pattern.totalTurns || 1) > 0.25,
    concentrationHeavy: pattern.concentrationUses / (pattern.totalTurns || 1) > 0.4,
  });

  return {
    aggressionBias,
    counterElements,
    tacticalDirective: directive,
    difficultyScale,
    useBait,
    exploitPredictability,
  };
}

/**
 * Check whether it's time to re-evaluate strategy.
 */
export function shouldAdapt(turnNumber: number): boolean {
  return turnNumber > 1 && turnNumber % ADAPTATION_INTERVAL === 0;
}

/**
 * Generate AI context string to inject into prompt.
 */
export function getAdaptiveAIContext(
  strategy: AdaptiveStrategy | null,
  opponentName: string,
): string {
  if (!strategy) return '';
  return [
    '\nADAPTIVE AI STRATEGY:',
    `• ${opponentName} has analyzed the player's fighting style and is adapting.`,
    strategy.tacticalDirective,
    strategy.exploitPredictability
      ? `• ${opponentName} notices the player is being PREDICTABLE — exploit patterns and punish repetition.`
      : '',
    strategy.useBait
      ? `• ${opponentName} should use BAIT tactics — feign openings to draw reckless attacks, then counter hard.`
      : '',
    `• Difficulty intensity: ${(strategy.difficultyScale * 100).toFixed(0)}%`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elementCounter(element: string): string {
  const counters: Record<string, string> = {
    fire: 'ice',
    ice: 'fire',
    lightning: 'nature',
    psychic: 'physical',
    physical: 'energy',
    energy: 'dark',
    dark: 'lightning',
    nature: 'ice',
  };
  return counters[element] || 'physical';
}

function buildDirective(params: {
  aggressionRatio: number;
  defenseRatio: number;
  counterElements: string[];
  isRiskTaker: boolean;
  exploitPredictability: boolean;
  useBait: boolean;
  comboHeavy: boolean;
  environmentHeavy: boolean;
  concentrationHeavy: boolean;
}): string {
  const lines: string[] = [];

  // Counter aggression style
  if (params.aggressionRatio > 0.6) {
    lines.push(
      `• The player favors AGGRESSION (${(params.aggressionRatio * 100).toFixed(0)}% offensive). Use counter-attacks, parries, and punish overextension.`,
    );
  } else if (params.defenseRatio > 0.5) {
    lines.push(
      `• The player is DEFENSIVE (${(params.defenseRatio * 100).toFixed(0)}% defensive). Apply relentless pressure, feints, and guard-breaking attacks.`,
    );
  } else {
    lines.push('• The player uses a BALANCED approach. Vary tactics unpredictably.');
  }

  // Counter elements
  if (params.counterElements.length > 0) {
    lines.push(
      `• Player relies heavily on ${params.counterElements.map((e) => e.toUpperCase()).join(' and ')} attacks. Counter with ${params.counterElements.map(elementCounter).join(' and ')} techniques.`,
    );
  }

  // Combo counter
  if (params.comboHeavy) {
    lines.push(
      '• Player chains combos frequently. Interrupt mid-combo with disruptive attacks or create distance.',
    );
  }

  // Environment counter
  if (params.environmentHeavy) {
    lines.push(
      '• Player exploits the environment often. Destroy terrain advantages or use the environment first.',
    );
  }

  // Risk-taker counter
  if (params.isRiskTaker) {
    lines.push(
      '• Player takes high risks (overcharge). Bait overcharge moments and punish the glitch window.',
    );
  }

  // Concentration-heavy counter
  if (params.concentrationHeavy) {
    lines.push(
      '• Player relies on concentration dodges. Use multi-hit attacks or feints to waste their concentration uses.',
    );
  }

  return lines.join('\n');
}
