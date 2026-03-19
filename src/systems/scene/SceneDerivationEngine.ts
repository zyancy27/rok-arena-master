import type { GeneratedSceneState } from '@/systems/generated/GeneratedSceneState';
import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import { SceneEffectTagGenerator } from './SceneEffectTagGenerator';
import { SceneHazardProfileGenerator } from './SceneHazardProfileGenerator';
import { ScenePressureGenerator } from './ScenePressureGenerator';

export interface SceneDerivationOptions {
  activeHazards?: string[];
  environmentTags?: string[];
  worldTickTags?: string[];
  narratorMetadata?: Record<string, unknown> | null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

function deriveVisualIntensity(tags: string[]): GeneratedSceneState['visualIntensity'] {
  const joined = tags.join(' ');
  if (/(critical|explosive|volatile|catastrophic|surge_overlay)/.test(joined)) return 'volatile';
  if (/(combat|hazard|mystic|charged|pressure|storm|escalation)/.test(joined)) return 'elevated';
  if (/(stealth|quiet|subtle|guarded|muted_pulse)/.test(joined)) return 'subtle';
  return 'grounded';
}

function deriveNpcSocialReadiness(tags: string[]): GeneratedSceneState['npcSocialReadiness'] {
  const joined = tags.join(' ');
  if (/(hostile|predatory|ambush|killbox|berserker)/.test(joined)) return 'hostile';
  if (/(guarded|authority|watchful|checkpoint|tense)/.test(joined)) return 'tense';
  if (/(cautious|merchant|measured|formal|civilian)/.test(joined)) return 'guarded';
  return 'open';
}

export const SceneDerivationEngine = {
  derive(packets: GeneratedRuntimePackets, options: SceneDerivationOptions = {}): GeneratedSceneState {
    const actor = packets.actorIdentity;
    const npc = packets.npcIdentity;
    const world = packets.worldState;
    const encounter = packets.encounter;
    const existingScene = packets.sceneState;
    const narratorValues = options.narratorMetadata ? Object.values(options.narratorMetadata).map((value) => String(value)) : [];

    const tags = uniq([
      ...toStringArray(actor?.tags),
      ...toStringArray(actor?.socialIdentity),
      ...toStringArray(actor?.expressionIdentity),
      ...toStringArray(actor?.narrativeTone),
      ...toStringArray(actor?.pressureStyle),
      ...toStringArray(npc?.tags),
      ...toStringArray(npc?.socialPosture),
      ...toStringArray(npc?.powerStyle),
      ...toStringArray(npc?.combatPressureStyle),
      ...toStringArray(npc?.relationshipPosture),
      ...toStringArray(world?.tags),
      ...toStringArray(world?.hazardFamilies),
      ...toStringArray(world?.travelPressure),
      ...toStringArray(world?.culturalFlavor),
      ...toStringArray(world?.factionPresence),
      ...toStringArray(encounter?.tags),
      ...toStringArray(encounter?.tacticalPressure),
      ...toStringArray(encounter?.environmentalConflicts),
      ...toStringArray(encounter?.stakes),
      ...toStringArray(encounter?.recommendedEffectTags),
      ...toStringArray(existingScene?.effectTags),
      ...toStringArray(existingScene?.chatPresentationTags),
      ...toStringArray(existingScene?.environmentalPressure),
      ...toStringArray(existingScene?.narrationToneFlags),
      ...(options.environmentTags || []),
      ...(options.activeHazards || []),
      ...(options.worldTickTags || []),
      ...narratorValues,
    ]);

    const pressure = existingScene?.scenePressure ?? ScenePressureGenerator.generate({ tags });
    const hazard = SceneHazardProfileGenerator.generate(tags);
    const effectTags = uniq([
      ...toStringArray(existingScene?.effectTags),
      ...SceneEffectTagGenerator.generate(tags),
      ...toStringArray(encounter?.recommendedEffectTags),
      ...(options.worldTickTags || []).map((tag) => `world:${tag}`),
    ]);
    const npcSocialReadiness = existingScene?.npcSocialReadiness ?? deriveNpcSocialReadiness(tags);
    const visualIntensity = existingScene?.visualIntensity ?? deriveVisualIntensity(tags);
    const environmentalPressure = uniq([
      ...toStringArray(existingScene?.environmentalPressure),
      ...toStringArray(world?.travelPressure),
      ...toStringArray(world?.dangerLogic),
      ...toStringArray(encounter?.environmentalConflicts),
      ...(options.worldTickTags || []).filter((tag) => /escalat|destabil|shift|maneuver|regroup/.test(tag)),
    ]);
    const emotionalTone = uniq([
      ...toStringArray(existingScene?.emotionalTone),
      ...toStringArray(actor?.narrativeTone).slice(0, 2),
      ...toStringArray(encounter?.stakes).slice(0, 2),
      ...toStringArray(world?.culturalFlavor).slice(0, 1),
      pressure === 'critical' ? 'urgent danger' : null,
      pressure === 'high' ? 'rising strain' : null,
      visualIntensity === 'subtle' ? 'held restraint' : null,
      /mystic|ritual|charged/.test(tags.join(' ')) ? 'charged wonder' : null,
    ]);
    const narrationToneFlags = uniq([
      ...toStringArray(existingScene?.narrationToneFlags),
      `tone:${pressure}`,
      `tone:${npcSocialReadiness}`,
      visualIntensity === 'volatile' ? 'tone:kinetic' : visualIntensity === 'subtle' ? 'tone:hushed' : 'tone:grounded',
      /mystic|ritual|charged/.test(tags.join(' ')) ? 'tone:charged' : null,
    ]);
    const chatPresentationTags = uniq([
      ...toStringArray(existingScene?.chatPresentationTags),
      ...toStringArray(actor?.expressionIdentity).map((entry) => `chat:${entry}`),
      npcSocialReadiness === 'hostile' ? 'chat-impact-heavy' : null,
      npcSocialReadiness === 'guarded' || npcSocialReadiness === 'tense' ? 'chat-tight-pacing' : null,
      visualIntensity === 'subtle' ? 'chat-muted-emphasis' : 'chat-cinematic-emphasis',
    ]);

    return {
      blueprintIds: existingScene?.blueprintIds,
      scenePressure: pressure,
      emotionalTone,
      visualIntensity,
      hazardDensity: existingScene?.hazardDensity ?? hazard.hazardDensity,
      movementFriction: existingScene?.movementFriction ?? hazard.movementFriction,
      combatVolatility: existingScene?.combatVolatility ?? hazard.combatVolatility,
      npcSocialReadiness,
      narrationToneFlags,
      effectTags,
      chatPresentationTags,
      environmentalPressure,
      metadata: {
        ...(existingScene?.metadata || {}),
        derivation: {
          tags,
          worldTickTags: options.worldTickTags || [],
        },
      },
    };
  },
};
