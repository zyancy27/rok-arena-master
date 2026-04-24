/**
 * Danger Taxonomy — the structured layer that wraps `EmergencyBlueprint`.
 *
 * The original blueprint file uses a physics-flavored `category` (e.g.
 * `seismic-tectonic`, `volcanic-thermal`). The user wants the system to
 * organise emergencies by *human-meaningful* danger families:
 * natural / urban / industrial / transport / criminal / terrorist /
 * political / military / environmental / biological / technological /
 * public-systems / mass-panic / survival / supernatural / sci-fi.
 *
 * Rather than rewrite 230+ existing entries, this module provides:
 *   • a parallel `DangerFamily` enum (16 families)
 *   • `Groundedness` (grounded | speculative | exotic)
 *   • `ObjectiveType` / `EscalationPath` / `CombatFrame` / `EnemyPressure`
 *   • inference helpers that read an existing blueprint's category+tags+concept
 *     and derive these fields when not explicitly authored.
 *
 * New blueprints (in `emergencyBlueprintsExtended.ts`) author them directly.
 *
 * Pure / dependency-free — loads in Deno (edge fn) and the browser.
 */

import type {
  EmergencyBlueprint,
  DangerCategory,
} from './emergencyBlueprints';

// ── Sixteen human-meaningful families ──────────────────────────────────────
export type DangerFamily =
  | 'natural-disaster'
  | 'urban-infrastructure-failure'
  | 'industrial-accident'
  | 'transportation-crisis'
  | 'criminal-incident'
  | 'terrorist-sabotage'
  | 'political-civil-unrest'
  | 'military-conflict'
  | 'environmental-collapse'
  | 'biological-hazard'
  | 'technological-malfunction'
  | 'public-systems-failure'
  | 'mass-panic-event'
  | 'survival-breakdown'
  | 'supernatural-paranormal'
  | 'scifi-advanced-systems';

/** How real this scenario is. Generator strongly biases to `grounded`. */
export type Groundedness = 'grounded' | 'speculative' | 'exotic';

/** What the players are trying to *do* in the emergency. */
export type ObjectiveType =
  | 'rescue'
  | 'containment'
  | 'evacuation-escort'
  | 'defensive-hold'
  | 'extraction'
  | 'neutralization'
  | 'recon-in-chaos'
  | 'cascade-interruption'
  | 'civilian-protection'
  | 'infrastructure-preservation'
  | 'survival-under-collapse'
  | 'competing-faction-objective';

/** How the disaster gets WORSE if untouched. */
export type EscalationPathTag =
  | 'spreading-fire'
  | 'panic-crush'
  | 'toxic-spread'
  | 'aftershocks'
  | 'structural-cascade'
  | 'communication-blackout'
  | 'enemy-reinforcement'
  | 'containment-rupture'
  | 'flood-progression'
  | 'weather-deterioration'
  | 'public-order-collapse'
  | 'resource-exhaustion';

/** How the emergency reshapes combat. */
export type CombatFrameTag =
  | 'shifting-hazard-zones'
  | 'timed-pressure'
  | 'civilian-presence-constraint'
  | 'changing-terrain'
  | 'scarce-resources'
  | 'rescue-priorities'
  | 'unstable-objectives'
  | 'cover-degradation'
  | 'verticality-collapse'
  | 'sightline-occlusion'
  | 'mobility-restriction'
  | 'environmental-weaponization';

/** What KIND of opposition the emergency surfaces (PvE) or pressure (PvP). */
export type EnemyPressureType =
  | 'no-enemy'                 // pure rescue / disaster
  | 'looters-opportunists'
  | 'panicked-mob'
  | 'armed-criminals'
  | 'organized-militants'
  | 'corrupt-security'
  | 'hostile-wildlife'
  | 'feral-infected'
  | 'rogue-machines'
  | 'rival-responders'
  | 'cult-fanatics'
  | 'state-forces';

// ── Optional authored fields (new catalog entries set these directly) ──────
export interface DangerTaxonomyFields {
  family?: DangerFamily;
  groundedness?: Groundedness;
  objectives?: ObjectiveType[];        // weighted-pick eligible
  escalationPath?: EscalationPathTag[];
  combatFrame?: CombatFrameTag[];
  enemyPressure?: EnemyPressureType[];
  /** Free-form imagery tags used by similarity check (smoke, neon, blood, ash …) */
  dominantImagery?: string[];
}

// ── Inference: legacy blueprints → derived family + groundedness ───────────
const CATEGORY_TO_FAMILY: Record<DangerCategory, DangerFamily> = {
  'natural-disaster':       'natural-disaster',
  'fire-conflagration':     'natural-disaster',
  'water-flooding':         'natural-disaster',
  'atmospheric-storm':      'natural-disaster',
  'seismic-tectonic':       'natural-disaster',
  'volcanic-thermal':       'natural-disaster',
  'cryogenic-arctic':       'natural-disaster',
  'wilderness-survival':    'survival-breakdown',
  'urban-collapse':         'urban-infrastructure-failure',
  'infrastructure-failure': 'urban-infrastructure-failure',
  'subterranean-cavern':    'urban-infrastructure-failure',
  'industrial-meltdown':    'industrial-accident',
  'mechanical-runaway':     'industrial-accident',
  'energy-overload':        'industrial-accident',
  'chemical-radiological':  'industrial-accident',
  'transport-crisis':       'transportation-crisis',
  'maritime-deepwater':     'transportation-crisis',
  'crowd-panic':            'mass-panic-event',
  'biological-outbreak':    'biological-hazard',
  'military-ordnance':      'military-conflict',
  'orbital-aerospace':      'scifi-advanced-systems',
  'sci-fi-advanced':        'scifi-advanced-systems',
  'planetary-extreme':      'scifi-advanced-systems',
  'mythic-cosmic':          'supernatural-paranormal',
};

const EXOTIC_FAMILIES: DangerFamily[] = [
  'supernatural-paranormal',
  'scifi-advanced-systems',
];
const SPECULATIVE_RARITY_FAMILIES: DangerFamily[] = [
  'technological-malfunction', // edge: cyber/AI failure can be either
];

export function inferFamily(b: EmergencyBlueprint & DangerTaxonomyFields): DangerFamily {
  if (b.family) return b.family;
  return CATEGORY_TO_FAMILY[b.category] ?? 'natural-disaster';
}

export function inferGroundedness(
  b: EmergencyBlueprint & DangerTaxonomyFields,
): Groundedness {
  if (b.groundedness) return b.groundedness;
  if (b.rarity === 'mythic') return 'exotic';
  if (b.rarity === 'extreme') return 'speculative';
  const fam = inferFamily(b);
  if (EXOTIC_FAMILIES.includes(fam)) {
    return b.rarity === 'advanced' ? 'speculative' : 'exotic';
  }
  if (SPECULATIVE_RARITY_FAMILIES.includes(fam) && b.rarity === 'advanced') {
    return 'speculative';
  }
  return 'grounded';
}

// ── Default objective inference per family (used when not authored) ────────
const FAMILY_DEFAULT_OBJECTIVES: Record<DangerFamily, ObjectiveType[]> = {
  'natural-disaster':              ['rescue', 'evacuation-escort', 'survival-under-collapse', 'civilian-protection'],
  'urban-infrastructure-failure':  ['rescue', 'cascade-interruption', 'infrastructure-preservation', 'evacuation-escort'],
  'industrial-accident':           ['containment', 'cascade-interruption', 'extraction', 'rescue'],
  'transportation-crisis':         ['rescue', 'extraction', 'evacuation-escort', 'civilian-protection'],
  'criminal-incident':             ['neutralization', 'civilian-protection', 'rescue', 'recon-in-chaos'],
  'terrorist-sabotage':            ['neutralization', 'cascade-interruption', 'civilian-protection', 'containment'],
  'political-civil-unrest':        ['evacuation-escort', 'civilian-protection', 'recon-in-chaos', 'defensive-hold'],
  'military-conflict':             ['extraction', 'defensive-hold', 'rescue', 'recon-in-chaos'],
  'environmental-collapse':        ['survival-under-collapse', 'evacuation-escort', 'civilian-protection', 'rescue'],
  'biological-hazard':             ['containment', 'rescue', 'evacuation-escort', 'recon-in-chaos'],
  'technological-malfunction':     ['cascade-interruption', 'extraction', 'civilian-protection', 'recon-in-chaos'],
  'public-systems-failure':        ['rescue', 'civilian-protection', 'cascade-interruption', 'infrastructure-preservation'],
  'mass-panic-event':              ['civilian-protection', 'evacuation-escort', 'rescue', 'recon-in-chaos'],
  'survival-breakdown':            ['survival-under-collapse', 'rescue', 'evacuation-escort', 'extraction'],
  'supernatural-paranormal':       ['containment', 'neutralization', 'survival-under-collapse', 'recon-in-chaos'],
  'scifi-advanced-systems':        ['cascade-interruption', 'extraction', 'containment', 'survival-under-collapse'],
};

const FAMILY_DEFAULT_ENEMY_PRESSURE: Record<DangerFamily, EnemyPressureType[]> = {
  'natural-disaster':              ['no-enemy', 'panicked-mob'],
  'urban-infrastructure-failure':  ['no-enemy', 'panicked-mob', 'looters-opportunists'],
  'industrial-accident':           ['no-enemy', 'rogue-machines'],
  'transportation-crisis':         ['no-enemy', 'panicked-mob'],
  'criminal-incident':             ['armed-criminals', 'looters-opportunists'],
  'terrorist-sabotage':            ['organized-militants', 'cult-fanatics'],
  'political-civil-unrest':        ['panicked-mob', 'corrupt-security', 'state-forces'],
  'military-conflict':             ['organized-militants', 'state-forces'],
  'environmental-collapse':        ['no-enemy', 'panicked-mob'],
  'biological-hazard':             ['feral-infected', 'panicked-mob'],
  'technological-malfunction':     ['rogue-machines', 'no-enemy'],
  'public-systems-failure':        ['no-enemy', 'looters-opportunists', 'panicked-mob'],
  'mass-panic-event':              ['panicked-mob', 'looters-opportunists'],
  'survival-breakdown':            ['hostile-wildlife', 'no-enemy'],
  'supernatural-paranormal':       ['cult-fanatics', 'no-enemy'],
  'scifi-advanced-systems':        ['rogue-machines', 'no-enemy'],
};

const FAMILY_DEFAULT_ESCALATION: Record<DangerFamily, EscalationPathTag[]> = {
  'natural-disaster':              ['weather-deterioration', 'flood-progression', 'aftershocks', 'spreading-fire'],
  'urban-infrastructure-failure':  ['structural-cascade', 'panic-crush', 'communication-blackout'],
  'industrial-accident':           ['containment-rupture', 'spreading-fire', 'toxic-spread'],
  'transportation-crisis':         ['spreading-fire', 'structural-cascade', 'panic-crush'],
  'criminal-incident':             ['enemy-reinforcement', 'panic-crush', 'public-order-collapse'],
  'terrorist-sabotage':            ['enemy-reinforcement', 'structural-cascade', 'panic-crush', 'spreading-fire'],
  'political-civil-unrest':        ['public-order-collapse', 'panic-crush', 'enemy-reinforcement', 'communication-blackout'],
  'military-conflict':             ['enemy-reinforcement', 'communication-blackout', 'resource-exhaustion'],
  'environmental-collapse':        ['weather-deterioration', 'resource-exhaustion', 'toxic-spread'],
  'biological-hazard':             ['toxic-spread', 'containment-rupture', 'panic-crush'],
  'technological-malfunction':     ['communication-blackout', 'containment-rupture', 'public-order-collapse'],
  'public-systems-failure':        ['public-order-collapse', 'communication-blackout', 'resource-exhaustion'],
  'mass-panic-event':              ['panic-crush', 'public-order-collapse', 'enemy-reinforcement'],
  'survival-breakdown':            ['resource-exhaustion', 'weather-deterioration', 'enemy-reinforcement'],
  'supernatural-paranormal':       ['containment-rupture', 'toxic-spread'],
  'scifi-advanced-systems':        ['containment-rupture', 'communication-blackout', 'structural-cascade'],
};

const FAMILY_DEFAULT_COMBAT_FRAME: Record<DangerFamily, CombatFrameTag[]> = {
  'natural-disaster':              ['shifting-hazard-zones', 'changing-terrain', 'mobility-restriction', 'timed-pressure'],
  'urban-infrastructure-failure':  ['verticality-collapse', 'cover-degradation', 'civilian-presence-constraint', 'unstable-objectives'],
  'industrial-accident':           ['environmental-weaponization', 'shifting-hazard-zones', 'timed-pressure', 'scarce-resources'],
  'transportation-crisis':         ['mobility-restriction', 'rescue-priorities', 'sightline-occlusion', 'timed-pressure'],
  'criminal-incident':             ['civilian-presence-constraint', 'sightline-occlusion', 'cover-degradation', 'rescue-priorities'],
  'terrorist-sabotage':            ['timed-pressure', 'civilian-presence-constraint', 'environmental-weaponization', 'unstable-objectives'],
  'political-civil-unrest':        ['civilian-presence-constraint', 'mobility-restriction', 'sightline-occlusion', 'unstable-objectives'],
  'military-conflict':             ['cover-degradation', 'sightline-occlusion', 'shifting-hazard-zones', 'scarce-resources'],
  'environmental-collapse':        ['changing-terrain', 'scarce-resources', 'mobility-restriction'],
  'biological-hazard':             ['shifting-hazard-zones', 'civilian-presence-constraint', 'scarce-resources'],
  'technological-malfunction':     ['environmental-weaponization', 'sightline-occlusion', 'unstable-objectives'],
  'public-systems-failure':        ['scarce-resources', 'civilian-presence-constraint', 'sightline-occlusion'],
  'mass-panic-event':              ['civilian-presence-constraint', 'sightline-occlusion', 'mobility-restriction', 'rescue-priorities'],
  'survival-breakdown':            ['scarce-resources', 'mobility-restriction', 'changing-terrain'],
  'supernatural-paranormal':       ['environmental-weaponization', 'shifting-hazard-zones'],
  'scifi-advanced-systems':        ['environmental-weaponization', 'unstable-objectives', 'changing-terrain'],
};

export function inferObjectives(b: EmergencyBlueprint & DangerTaxonomyFields): ObjectiveType[] {
  if (b.objectives && b.objectives.length) return b.objectives;
  return FAMILY_DEFAULT_OBJECTIVES[inferFamily(b)] ?? ['rescue', 'survival-under-collapse'];
}

export function inferEnemyPressure(b: EmergencyBlueprint & DangerTaxonomyFields): EnemyPressureType[] {
  if (b.enemyPressure && b.enemyPressure.length) return b.enemyPressure;
  return FAMILY_DEFAULT_ENEMY_PRESSURE[inferFamily(b)] ?? ['no-enemy'];
}

export function inferEscalation(b: EmergencyBlueprint & DangerTaxonomyFields): EscalationPathTag[] {
  if (b.escalationPath && b.escalationPath.length) return b.escalationPath;
  return FAMILY_DEFAULT_ESCALATION[inferFamily(b)] ?? ['structural-cascade'];
}

export function inferCombatFrame(b: EmergencyBlueprint & DangerTaxonomyFields): CombatFrameTag[] {
  if (b.combatFrame && b.combatFrame.length) return b.combatFrame;
  return FAMILY_DEFAULT_COMBAT_FRAME[inferFamily(b)] ?? ['shifting-hazard-zones'];
}

/** Lightweight imagery extraction for the similarity validator. */
export function inferImagery(b: EmergencyBlueprint & DangerTaxonomyFields): string[] {
  if (b.dominantImagery && b.dominantImagery.length) return b.dominantImagery;
  // pull a few salient nouns from tags
  const IMAGERY_KEYWORDS = new Set([
    'fire','smoke','flood','water','ice','snow','rubble','debris','glass',
    'rock','metal','blood','neon','dust','ash','toxin','radiation','vacuum',
    'wind','storm','crowd','urban','wilderness','industrial','vehicle',
    'tunnel','bridge','tower','reactor','dam','rail','ship','aircraft',
    'oil','chemical','electric','riot','siege','hostage','bomb','gunfire',
  ]);
  return b.tags.filter((t) => IMAGERY_KEYWORDS.has(t.toLowerCase()));
}
