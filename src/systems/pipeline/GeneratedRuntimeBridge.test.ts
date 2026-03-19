import { describe, expect, it } from 'vitest';
import { attachGeneratedToContext, buildGeneratedRuntimeMetadata, deriveNarratorSceneContext, getGeneratedRuntimePackets } from '@/systems/pipeline/GeneratedRuntimeBridge';
import type { ContextPacket, GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';

function createContext(): ContextPacket {
  return {
    mode: 'campaign',
    actor: {
      characterId: 'hero-1',
      name: 'Hero',
      tier: 5,
      stamina: 80,
      energy: 70,
      equippedItems: [],
      statusEffects: [],
      powers: [],
      abilities: [],
      stats: {
        stat_strength: 70,
        stat_speed: 60,
        stat_durability: 55,
        stat_stamina: 65,
        stat_skill: 62,
        stat_battle_iq: 58,
        stat_power: 75,
        stat_intelligence: 50,
        stat_luck: 45,
      },
      derivedCombatBias: 'balanced',
      derivedThreatProfile: [],
    } as any,
    targets: [],
    primaryTarget: null,
    zone: 'Ash Ruins',
    environmentTags: ['ruins'],
    activeHazards: ['fire'],
    worldState: null,
    relationshipContext: { entries: [], summary: [] },
    memoryContext: { entries: [], summary: [] },
    narratorSceneContext: 'default',
    sceneState: {},
    metadata: {},
  };
}

const generatedPackets: GeneratedRuntimePackets = {
  actorIdentity: {
    name: 'Hero',
    combatIdentity: ['duelist'],
    socialIdentity: ['guarded'],
    expressionIdentity: ['controlled'],
    movementStyle: ['decisive'],
    narrativeTone: ['grim focus'],
    dangerProfile: ['high-risk'],
    pressureStyle: ['relentless'],
    signatureBehaviorPatterns: ['press advantage'],
    tags: ['combat'],
    traits: ['fighter'],
  },
  worldState: {
    regionType: 'ruins',
    terrainLogic: ['broken terrain'],
    dangerLogic: ['burning lanes'],
    socialDensity: 'sparse',
    economicTone: 'collapsed',
    weatherPressure: ['ashfall'],
    travelPressure: ['restricted paths'],
    hazardFamilies: ['fire'],
    pointsOfInterest: ['collapsed gate'],
    factionPresence: ['raiders'],
    culturalFlavor: ['siege scars'],
    tags: ['ruins'],
  },
  encounter: {
    situationType: 'ambush',
    tacticalPressure: ['killbox', 'overwhelming'],
    threatComposition: ['raiders'],
    environmentalConflicts: ['burning chokepoint'],
    stakes: ['survival'],
    escalationVectors: ['collapse'],
    recommendedEffectTags: ['embers'],
    tags: ['combat', 'hazard'],
  },
  sceneState: {
    scenePressure: 'critical',
    emotionalTone: ['panic'],
    visualIntensity: 'volatile',
    hazardDensity: 'dense',
    movementFriction: 'locked',
    combatVolatility: 'explosive',
    npcSocialReadiness: 'hostile',
    narrationToneFlags: ['tone:critical'],
    effectTags: ['embers'],
    chatPresentationTags: ['chat-impact-heavy'],
    environmentalPressure: ['environment pushes every choice'],
  },
  effectState: {
    visualLayers: ['heat-shimmer'],
    audioLayers: ['combat-surge'],
    chatBehaviors: ['impact-pulse'],
    statusOverlays: ['tone:critical'],
    environmentPersistence: ['smoke veil'],
    burstImpacts: ['ember-burst'],
    tags: ['embers'],
  },
};

describe('GeneratedRuntimeBridge', () => {
  it('attaches canonical generated packets onto context and derives scene state', () => {
    const context = createContext();
    attachGeneratedToContext(context, generatedPackets);

    expect(context.generated?.sceneState?.scenePressure).toBe('critical');
    expect(context.sceneState.scenePressure).toBe('critical');
    expect(context.sceneState.visualLayers).toContain('heat-shimmer');
    expect(context.narratorSceneContext).toBe('combat');
    expect(context.metadata?.generatedPackets).toEqual(generatedPackets);
  });

  it('extracts canonical generated packets from generated metadata', () => {
    const metadata = buildGeneratedRuntimeMetadata(generatedPackets);
    const extracted = getGeneratedRuntimePackets(metadata);

    expect(extracted.sceneState?.combatVolatility).toBe('explosive');
    expect(extracted.effectState?.audioLayers).toContain('combat-surge');
  });

  it('derives narrator context from generated scene state', () => {
    expect(deriveNarratorSceneContext(generatedPackets.sceneState, 'default')).toBe('combat');
  });
});
