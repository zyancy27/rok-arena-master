/**
 * Character Identity Discovery Engine
 *
 * Observes behavioral patterns to understand who a character is BECOMING
 * through play. Detects emerging tendencies without forcing outcomes.
 *
 * This is NOT a destiny system. Tendencies are evolving observations
 * that the narrator may reflect subtly. They can shift, contradict,
 * or disappear as the character changes.
 *
 * Core philosophy: the world creates situations → the player responds →
 * the system observes → the narrator reflects over time.
 */

// ── Tendencies ──────────────────────────────────────────────────

export type CharacterTendency =
  | 'protective'
  | 'curious'
  | 'cautious'
  | 'reckless'
  | 'compassionate'
  | 'cold'
  | 'stubborn'
  | 'prideful'
  | 'loyal'
  | 'self_sacrificing'
  | 'opportunistic'
  | 'diplomatic'
  | 'analytical'
  | 'instinctive'
  | 'defiant';

export interface TendencyObservation {
  tendency: CharacterTendency;
  /** Running confidence 0–100. Not a score — just how many signals support this. */
  confidence: number;
  /** Number of distinct behavioral events observed */
  observationCount: number;
  /** Last turn this tendency was reinforced */
  lastObserved: number;
  /** First turn this tendency appeared */
  firstObserved: number;
  /** Representative examples (kept small) */
  examples: string[];
}

export interface DiscoveryProfile {
  characterId: string;
  tendencies: TendencyObservation[];
  /** Top 1-3 tendencies with high confidence (not locked — can change) */
  emergingIdentity: CharacterTendency[];
  /** Patterns the narrator has already reflected on (to avoid repetition) */
  reflectedTendencies: { tendency: CharacterTendency; turn: number }[];
  /** Total behavioral observations processed */
  totalObservations: number;
  lastUpdateTurn: number;
}

// ── Observation Sources ─────────────────────────────────────────

export type ObservationSource =
  | 'dialogue'
  | 'moral_decision'
  | 'pressure_response'
  | 'treatment_of_others'
  | 'protection_choice'
  | 'avoidance_pattern'
  | 'priority_action'
  | 'problem_solving'
  | 'combat_behavior'
  | 'exploration_choice';

export interface BehavioralObservation {
  source: ObservationSource;
  content: string;
  turnNumber: number;
  /** Optional context about what was happening */
  situationContext?: string;
}

// ── Narrator Reflection ─────────────────────────────────────────

export interface IdentityReflection {
  tendency: CharacterTendency;
  text: string;
  /** Only show when confidence is above this */
  minConfidence: number;
}

// ── Constants ───────────────────────────────────────────────────

const BASE_INCREMENT = 5;
const DECAY_PER_CYCLE = 0.4;
const EMERGING_THRESHOLD = 30;
const REFLECTION_THRESHOLD = 40;
const MAX_EMERGING = 3;
const REFLECTION_COOLDOWN = 15; // min turns between reflecting same tendency
const MAX_EXAMPLES = 3;

// ── Detection Patterns ──────────────────────────────────────────

const TENDENCY_PATTERNS: Record<CharacterTendency, RegExp[]> = {
  protective: [/protect/i, /shield/i, /defend/i, /guard/i, /keep.*safe/i, /stand between/i, /cover them/i, /watch over/i],
  curious: [/investigate/i, /examine/i, /look.*closer/i, /wonder/i, /explore/i, /what.*is.*that/i, /search/i, /inspect/i],
  cautious: [/careful/i, /wait/i, /observe/i, /assess/i, /hold back/i, /check.*first/i, /slowly/i, /listen.*before/i],
  reckless: [/rush/i, /charge/i, /without.*think/i, /leap/i, /just.*go/i, /reckless/i, /dive.*in/i, /head.*first/i],
  compassionate: [/help/i, /heal/i, /comfort/i, /care/i, /share/i, /kind/i, /gentle/i, /mercy/i, /forgive/i],
  cold: [/ignore/i, /doesn.*matter/i, /irrelevant/i, /walk.*past/i, /leave.*them/i, /not.*problem/i, /waste.*time/i],
  stubborn: [/refuse/i, /won.*t/i, /insist/i, /no.*matter.*what/i, /stand.*ground/i, /my.*way/i, /not.*changing/i],
  prideful: [/pride/i, /honor/i, /reputation/i, /beneath.*me/i, /worthy/i, /prove/i, /best/i, /stronger/i],
  loyal: [/promise/i, /oath/i, /side/i, /follow/i, /never.*leave/i, /together/i, /trust/i, /with.*you/i],
  self_sacrificing: [/sacrifice/i, /take.*hit/i, /instead.*of.*me/i, /save.*them/i, /my.*life.*for/i, /give.*everything/i],
  opportunistic: [/take.*chance/i, /advantage/i, /opportunity/i, /profit/i, /benefit/i, /useful/i, /leverage/i],
  diplomatic: [/negotiate/i, /talk.*through/i, /compromise/i, /peace/i, /agreement/i, /understand.*both/i, /reason.*with/i],
  analytical: [/analyze/i, /pattern/i, /logic/i, /calculate/i, /strategy/i, /deduce/i, /think.*through/i],
  instinctive: [/feel/i, /instinct/i, /gut/i, /sense/i, /know.*somehow/i, /react/i, /impulse/i],
  defiant: [/defy/i, /resist/i, /rebel/i, /fight.*back/i, /never.*surrender/i, /won.*t.*bow/i, /challenge/i],
};

// Source-based tendency boosters
const SOURCE_TENDENCY_AFFINITY: Partial<Record<ObservationSource, CharacterTendency[]>> = {
  moral_decision: ['compassionate', 'cold', 'self_sacrificing', 'opportunistic'],
  pressure_response: ['cautious', 'reckless', 'defiant', 'stubborn'],
  treatment_of_others: ['compassionate', 'cold', 'loyal', 'diplomatic'],
  protection_choice: ['protective', 'self_sacrificing', 'cold'],
  avoidance_pattern: ['cautious', 'cold', 'opportunistic'],
  priority_action: ['protective', 'curious', 'prideful', 'loyal'],
  problem_solving: ['analytical', 'instinctive', 'diplomatic', 'reckless'],
  combat_behavior: ['reckless', 'cautious', 'protective', 'defiant'],
};

// ── Narrator Reflection Templates ───────────────────────────────

const REFLECTION_TEMPLATES: Record<CharacterTendency, string[]> = {
  protective: [
    'You have never been one to turn away from danger when others are involved.',
    'Putting yourself between harm and the vulnerable has become instinct.',
    'Others have noticed — you always step forward when someone is at risk.',
  ],
  curious: [
    'You keep noticing the same thing about yourself — you always look closer.',
    'The unknown pulls at you like gravity. You can never leave a mystery alone.',
    'Where others see walls, you see doors waiting to be opened.',
  ],
  cautious: [
    'Careful hesitation has become a familiar instinct for you.',
    'You always pause before acting. Some might call it wisdom. Some might call it fear.',
    'You check every shadow, weigh every option. It has kept you alive this long.',
  ],
  reckless: [
    'You act before thinking. Sometimes it costs you. Sometimes it saves everyone.',
    'Planning has never been your approach. You trust the moment.',
    'Others hesitate. You are already moving.',
  ],
  compassionate: [
    'Kindness is not weakness — and the way you carry it proves that.',
    'You cannot help it. When someone is hurting, you respond.',
    'The world is harsh. You keep choosing to be gentle anyway.',
  ],
  cold: [
    'Emotion has never been your guide. You see things clearly because of it.',
    'Others find your detachment unsettling. You find their sentiment exhausting.',
    'You make the hard choices others cannot. That is your strength.',
  ],
  stubborn: [
    'Your resolve is a force of nature. Nothing bends you.',
    'When you decide, the world adjusts. Not the other way around.',
    'Stubbornness or conviction? Perhaps there is no difference for you.',
  ],
  prideful: [
    'Pride drives you forward. It also makes you blind sometimes.',
    'You carry yourself as though the world should meet your standard.',
    'Your sense of worth is unyielding. It inspires some and alienates others.',
  ],
  loyal: [
    'You keep your promises. Always. It is what defines you.',
    'Loyalty is not just a word for you. It is something you feel in your bones.',
    'You stand by the people you choose. No matter the cost.',
  ],
  self_sacrificing: [
    'You give more than you keep. It is beautiful and terrifying.',
    'Others see your willingness to suffer for them. It changes how they look at you.',
    'You always choose others over yourself. One day, someone might ask you why.',
  ],
  opportunistic: [
    'You see angles others miss. Every situation has leverage, and you find it.',
    'Survival of the clever. That has always been your way.',
    'You take what the world offers. No apologies.',
  ],
  diplomatic: [
    'Words are your first weapon. Violence is a last resort.',
    'You find the path between opposing forces. It is a rare skill.',
    'People lower their guard around you. Your calm is disarming.',
  ],
  analytical: [
    'You read situations like others read books. Every detail matters.',
    'Intuition is just pattern recognition. And you are very good at patterns.',
    'Before you act, you understand. That is your edge.',
  ],
  instinctive: [
    'You move before you think. And somehow, it works.',
    'Logic catches up to where your instincts already are.',
    'You trust what you feel. The world has rewarded that trust so far.',
  ],
  defiant: [
    'You do not kneel. You never have. It is more than habit — it is identity.',
    'Authority means nothing to you unless it is earned.',
    'The world pushes. You push back. Every single time.',
  ],
};

// ── Engine Functions ────────────────────────────────────────────

export function createDiscoveryProfile(characterId: string): DiscoveryProfile {
  return {
    characterId,
    tendencies: [],
    emergingIdentity: [],
    reflectedTendencies: [],
    totalObservations: 0,
    lastUpdateTurn: 0,
  };
}

/** Process a behavioral observation and update the profile. */
export function observeBehavior(
  profile: DiscoveryProfile,
  observation: BehavioralObservation,
): DiscoveryProfile {
  const content = observation.content.toLowerCase();
  const updatedTendencies = [...profile.tendencies];
  let anyMatch = false;

  for (const [tendency, patterns] of Object.entries(TENDENCY_PATTERNS) as [CharacterTendency, RegExp[]][]) {
    const matched = patterns.some(p => p.test(content));
    if (!matched) continue;

    anyMatch = true;
    const existing = updatedTendencies.find(t => t.tendency === tendency);

    // Source affinity bonus
    const sourceAffinity = SOURCE_TENDENCY_AFFINITY[observation.source];
    const bonus = sourceAffinity?.includes(tendency) ? 2 : 0;
    const increment = BASE_INCREMENT + bonus;

    if (existing) {
      existing.confidence = Math.min(100, existing.confidence + increment);
      existing.observationCount += 1;
      existing.lastObserved = observation.turnNumber;
      if (existing.examples.length < MAX_EXAMPLES && observation.content.length <= 100) {
        existing.examples.push(observation.content.slice(0, 80));
      }
    } else {
      updatedTendencies.push({
        tendency,
        confidence: increment,
        observationCount: 1,
        lastObserved: observation.turnNumber,
        firstObserved: observation.turnNumber,
        examples: observation.content.length <= 100 ? [observation.content.slice(0, 80)] : [],
      });
    }
  }

  // Recalculate emerging identity
  const sorted = [...updatedTendencies].sort((a, b) => b.confidence - a.confidence);
  const emerging = sorted
    .filter(t => t.confidence >= EMERGING_THRESHOLD)
    .slice(0, MAX_EMERGING)
    .map(t => t.tendency);

  return {
    ...profile,
    tendencies: updatedTendencies,
    emergingIdentity: emerging,
    totalObservations: profile.totalObservations + (anyMatch ? 1 : 0),
    lastUpdateTurn: observation.turnNumber,
  };
}

/** Apply passive decay — tendencies fade if not reinforced. */
export function decayTendencies(profile: DiscoveryProfile): DiscoveryProfile {
  const tendencies = profile.tendencies
    .map(t => ({ ...t, confidence: Math.max(0, t.confidence - DECAY_PER_CYCLE) }))
    .filter(t => t.confidence > 0 || t.observationCount >= 5); // keep well-established ones

  const sorted = [...tendencies].sort((a, b) => b.confidence - a.confidence);
  const emerging = sorted
    .filter(t => t.confidence >= EMERGING_THRESHOLD)
    .slice(0, MAX_EMERGING)
    .map(t => t.tendency);

  return { ...profile, tendencies, emergingIdentity: emerging };
}

/** Check if the narrator should reflect on a character tendency. */
export function shouldReflect(
  profile: DiscoveryProfile,
  currentTurn: number,
): boolean {
  if (profile.emergingIdentity.length === 0) return false;

  // Find a tendency that hasn't been reflected recently
  const candidate = profile.emergingIdentity.find(tendency => {
    const obs = profile.tendencies.find(t => t.tendency === tendency);
    if (!obs || obs.confidence < REFLECTION_THRESHOLD) return false;

    const lastReflected = profile.reflectedTendencies.find(r => r.tendency === tendency);
    if (lastReflected && currentTurn - lastReflected.turn < REFLECTION_COOLDOWN) return false;

    return true;
  });

  if (!candidate) return false;
  return Math.random() < 0.12; // ~12% chance when eligible
}

/** Generate a narrator reflection line about the character's emerging identity. */
export function generateReflection(
  profile: DiscoveryProfile,
  currentTurn: number,
): { profile: DiscoveryProfile; reflection: IdentityReflection } | null {
  // Find best unreflected tendency
  for (const tendency of profile.emergingIdentity) {
    const obs = profile.tendencies.find(t => t.tendency === tendency);
    if (!obs || obs.confidence < REFLECTION_THRESHOLD) continue;

    const lastReflected = profile.reflectedTendencies.find(r => r.tendency === tendency);
    if (lastReflected && currentTurn - lastReflected.turn < REFLECTION_COOLDOWN) continue;

    const templates = REFLECTION_TEMPLATES[tendency];
    if (!templates || templates.length === 0) continue;

    const text = templates[Math.floor(Math.random() * templates.length)];
    const reflection: IdentityReflection = {
      tendency,
      text,
      minConfidence: REFLECTION_THRESHOLD,
    };

    const updatedProfile: DiscoveryProfile = {
      ...profile,
      reflectedTendencies: [
        ...profile.reflectedTendencies.filter(r => r.tendency !== tendency),
        { tendency, turn: currentTurn },
      ],
    };

    return { profile: updatedProfile, reflection };
  }

  return null;
}

/** Build narrator context from the discovery profile. */
export function buildDiscoveryNarratorContext(profile: DiscoveryProfile): string {
  if (profile.emergingIdentity.length === 0 && profile.totalObservations < 5) return '';

  const parts: string[] = [];

  if (profile.emergingIdentity.length > 0) {
    parts.push(`CHARACTER TENDENCIES (observed, not assigned):`);
    for (const tendency of profile.emergingIdentity) {
      const obs = profile.tendencies.find(t => t.tendency === tendency);
      if (obs) {
        parts.push(`- ${tendency.replace(/_/g, ' ')}: observed ${obs.observationCount} times (confidence: ${Math.round(obs.confidence)}%)`);
      }
    }
    parts.push('These are behavioral patterns, not fixed traits. They can shift based on future actions.');
    parts.push('Reflect them subtly in narration — do NOT announce them directly or force outcomes.');
  }

  // Add weaker emerging patterns
  const emerging = profile.tendencies
    .filter(t => t.confidence >= 15 && !profile.emergingIdentity.includes(t.tendency))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  if (emerging.length > 0) {
    parts.push(`Weaker patterns forming: ${emerging.map(t => t.tendency.replace(/_/g, ' ')).join(', ')}`);
  }

  return parts.join('\n');
}

/** Build a persistence summary. */
export function buildDiscoverySummary(profile: DiscoveryProfile): string {
  if (profile.totalObservations === 0) return '';
  const top = profile.tendencies
    .filter(t => t.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(t => `${t.tendency}:${Math.round(t.confidence)}`)
    .join(' | ');
  return `Identity discovery (${profile.totalObservations} observations): ${top}`;
}
