/**
 * Situation Model — Structured Scene Representation
 *
 * Extends ScenarioBrain with a structured "situation object" that
 * replaces flat descriptions with rich, queryable scene data.
 * This is the core data model that all narrative systems reference.
 */

export interface SituationParticipant {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'enemy' | 'creature' | 'faction';
  disposition: 'friendly' | 'neutral' | 'hostile' | 'unknown';
  currentActivity: string;
  zone: string;
}

export interface SituationObject {
  id: string;
  name: string;
  type: 'interactable' | 'cover' | 'hazard' | 'container' | 'tool' | 'decoration' | 'structural';
  description: string;
  zone: string;
  usable: boolean;
}

export interface SituationHazard {
  id: string;
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'lethal';
  zone: string;
  spreading: boolean;
}

export interface StoryThread {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: 'seed' | 'active' | 'escalating' | 'climax';
}

export interface EnvironmentCondition {
  visibility: 'clear' | 'reduced' | 'poor' | 'none';
  lighting: 'bright' | 'dim' | 'dark' | 'pitch_black';
  weather: string | null;
  temperature: 'freezing' | 'cold' | 'mild' | 'warm' | 'hot' | 'extreme';
  noise: 'silent' | 'quiet' | 'moderate' | 'loud' | 'deafening';
}

export interface SituationPressure {
  level: number; // 0-100
  source: string;
  timeConstraint: boolean;
  description: string;
}

export interface Opportunity {
  id: string;
  description: string;
  type: 'tactical' | 'social' | 'exploration' | 'economic' | 'narrative';
  expiresIn: number | null; // turns until gone, null = persistent
}

/**
 * The Situation — a structured snapshot of the current scene.
 * Every narration should be informed by this object.
 */
export interface Situation {
  /** Current location name */
  location: string;
  /** Location description */
  locationDescription: string;
  /** All participants in the scene */
  participants: SituationParticipant[];
  /** Environmental conditions */
  environment: EnvironmentCondition;
  /** Active hazards */
  hazards: SituationHazard[];
  /** Interactable and notable objects */
  objects: SituationObject[];
  /** Current pressure on the scene */
  pressure: SituationPressure;
  /** Available opportunities */
  opportunities: Opportunity[];
  /** Active story threads relevant to this scene */
  storyThreads: StoryThread[];
  /** Current day and time */
  dayCount: number;
  timeOfDay: string;
}

/**
 * Build a narrator-ready situation summary from a Situation object.
 */
export function buildSituationPrompt(situation: Situation): string {
  const sections: string[] = [];

  sections.push(`CURRENT SITUATION: ${situation.location}`);
  sections.push(`${situation.locationDescription}`);
  sections.push(`Time: Day ${situation.dayCount}, ${situation.timeOfDay}. Visibility: ${situation.environment.visibility}. Lighting: ${situation.environment.lighting}.`);

  if (situation.environment.weather) {
    sections.push(`Weather: ${situation.environment.weather}.`);
  }

  if (situation.participants.length > 0) {
    const pLines = situation.participants.map(p =>
      `• ${p.name} (${p.type}, ${p.disposition}): ${p.currentActivity} [${p.zone}]`
    );
    sections.push(`PARTICIPANTS:\n${pLines.join('\n')}`);
  }

  if (situation.hazards.length > 0) {
    const hLines = situation.hazards.map(h =>
      `• ${h.type} (${h.severity}${h.spreading ? ', spreading' : ''}): ${h.description} [${h.zone}]`
    );
    sections.push(`HAZARDS:\n${hLines.join('\n')}`);
  }

  if (situation.objects.length > 0) {
    const oLines = situation.objects.filter(o => o.usable).map(o =>
      `• ${o.name} (${o.type}): ${o.description} [${o.zone}]`
    );
    if (oLines.length > 0) {
      sections.push(`NOTABLE OBJECTS:\n${oLines.join('\n')}`);
    }
  }

  if (situation.pressure.level > 30) {
    sections.push(`PRESSURE (${situation.pressure.level}/100): ${situation.pressure.description}${situation.pressure.timeConstraint ? ' [TIME-CRITICAL]' : ''}`);
  }

  if (situation.opportunities.length > 0) {
    const opLines = situation.opportunities.map(o =>
      `• [${o.type}] ${o.description}${o.expiresIn ? ` (${o.expiresIn} turns)` : ''}`
    );
    sections.push(`OPPORTUNITIES (weave naturally, never list):\n${opLines.join('\n')}`);
  }

  if (situation.storyThreads.length > 0) {
    const tLines = situation.storyThreads.map(t =>
      `• ${t.title} [${t.status}]: ${t.description}`
    );
    sections.push(`ACTIVE STORY THREADS:\n${tLines.join('\n')}`);
  }

  return sections.join('\n');
}

/**
 * Create a default empty situation for a new scene.
 */
export function createDefaultSituation(location: string, dayCount: number, timeOfDay: string): Situation {
  return {
    location,
    locationDescription: '',
    participants: [],
    environment: {
      visibility: 'clear',
      lighting: 'bright',
      weather: null,
      temperature: 'mild',
      noise: 'moderate',
    },
    hazards: [],
    objects: [],
    pressure: { level: 0, source: '', timeConstraint: false, description: '' },
    opportunities: [],
    storyThreads: [],
    dayCount,
    timeOfDay,
  };
}
