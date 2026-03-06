/**
 * Living Arena System
 * 
 * Tracks arena state (stability, hazard, pressure) and integrates
 * with ScenarioBrain for environment evolution during battle.
 * 
 * Arena reacts dynamically to player actions as logical consequences.
 */

export interface ArenaState {
  /** 0-100, starts at 100. Decreases as structures are destroyed */
  stability: number;
  /** 0-100, starts at 0. Increases with dangerous actions */
  hazardLevel: number;
  /** 0-100, starts at 0. General environmental pressure */
  environmentalPressure: number;
  /** Current escalation stage */
  escalationStage: number;
  /** Tags describing current arena conditions */
  conditionTags: string[];
  /** Whether the arena has reached a critical state */
  isCritical: boolean;
}

export function createArenaState(): ArenaState {
  return {
    stability: 100,
    hazardLevel: 0,
    environmentalPressure: 0,
    escalationStage: 0,
    conditionTags: [],
    isCritical: false,
  };
}

// ── Action Impact on Arena ──────────────────────────────────────

interface ArenaImpact {
  pattern: RegExp;
  stabilityDelta: number;
  hazardDelta: number;
  pressureDelta: number;
  conditionTag?: string;
}

const ARENA_IMPACTS: ArenaImpact[] = [
  // Structural attacks
  { pattern: /\b(destroy|demolish|obliterat|collapse).{0,20}(building|wall|pillar|structure|ceiling|roof|floor)\b/i, stabilityDelta: -15, hazardDelta: 10, pressureDelta: 8, conditionTag: 'structural_damage' },
  { pattern: /\b(crack|fracture|dent|chip).{0,20}(wall|floor|pillar|column)\b/i, stabilityDelta: -5, hazardDelta: 3, pressureDelta: 2, conditionTag: 'minor_damage' },
  
  // Explosive abilities
  { pattern: /\b(explosion|explod|detonat|blast|bomb|nuke|supernova)\b/i, stabilityDelta: -12, hazardDelta: 12, pressureDelta: 10, conditionTag: 'explosive_damage' },
  
  // Environmental manipulation
  { pattern: /\b(terrafor|reshape|mold|transform|alter).{0,15}(terrain|ground|earth|land|environment)\b/i, stabilityDelta: -8, hazardDelta: 5, pressureDelta: 5, conditionTag: 'terrain_altered' },
  { pattern: /\b(flood|fill.{0,5}water|summon.{0,5}wave|tsunami)\b/i, stabilityDelta: -5, hazardDelta: 8, pressureDelta: 6, conditionTag: 'flooding' },
  { pattern: /\b(set.{0,5}fire|ignite|incinerat|blaze)\b/i, stabilityDelta: -3, hazardDelta: 8, pressureDelta: 5, conditionTag: 'burning' },
  { pattern: /\b(freeze|ice.{0,5}over|glacial|frost.{0,5}spread)\b/i, stabilityDelta: -2, hazardDelta: 4, pressureDelta: 3, conditionTag: 'frozen' },
  
  // Gravity/space manipulation
  { pattern: /\b(gravity|gravitational|black.?hole|singularity|warp.?space)\b/i, stabilityDelta: -10, hazardDelta: 15, pressureDelta: 12, conditionTag: 'spatial_distortion' },
  
  // Large-scale combat
  { pattern: /\b(shockwave|seismic|earthquake|tremor|quake)\b/i, stabilityDelta: -8, hazardDelta: 8, pressureDelta: 6, conditionTag: 'seismic_activity' },
];

export function processArenaAction(state: ArenaState, messageText: string): ArenaState {
  const cleaned = messageText.replace(/\*/g, '');
  let newState = { ...state, conditionTags: [...state.conditionTags] };
  
  for (const impact of ARENA_IMPACTS) {
    if (impact.pattern.test(cleaned)) {
      newState.stability = Math.max(0, newState.stability + impact.stabilityDelta);
      newState.hazardLevel = Math.min(100, newState.hazardLevel + impact.hazardDelta);
      newState.environmentalPressure = Math.min(100, newState.environmentalPressure + impact.pressureDelta);
      
      if (impact.conditionTag && !newState.conditionTags.includes(impact.conditionTag)) {
        newState.conditionTags.push(impact.conditionTag);
      }
    }
  }
  
  // Check escalation
  const prevStage = state.escalationStage;
  if (newState.stability < 30 && prevStage < 3) {
    newState.escalationStage = 3;
  } else if (newState.stability < 50 && prevStage < 2) {
    newState.escalationStage = 2;
  } else if (newState.stability < 75 && prevStage < 1) {
    newState.escalationStage = 1;
  }
  
  newState.isCritical = newState.stability < 20 || newState.hazardLevel > 80;
  
  // Keep condition tags manageable
  if (newState.conditionTags.length > 8) {
    newState.conditionTags = newState.conditionTags.slice(-8);
  }
  
  return newState;
}

export function getArenaContext(state: ArenaState): string {
  if (state.stability >= 95 && state.hazardLevel <= 5) return '';
  
  let context = `
LIVING ARENA STATE:`;
  context += `
- Arena Stability: ${state.stability}%`;
  context += `
- Hazard Level: ${state.hazardLevel}%`;
  
  if (state.conditionTags.length > 0) {
    context += `
- Conditions: ${state.conditionTags.join(', ')}`;
  }
  
  if (state.isCritical) {
    context += `
⚠ ARENA CRITICAL: The environment is becoming extremely dangerous.`;
  } else if (state.escalationStage >= 2) {
    context += `
⚠ ARENA UNSTABLE: Significant structural damage detected.`;
  }
  
  return context;
}

/** Get escalation hint for ScenarioBrain integration */
export function getEscalationHint(state: ArenaState): string | null {
  if (state.escalationStage === 0) return null;
  
  const hints = [
    'The environment shows signs of stress — minor cracks and shifting debris.',
    'The arena is taking serious damage. Structures are failing and hazards multiply.',
    'Critical damage — the arena is on the verge of catastrophic change. Environment may transform entirely.',
  ];
  
  return hints[Math.min(state.escalationStage - 1, hints.length - 1)];
}
