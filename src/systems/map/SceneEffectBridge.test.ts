import { describe, expect, it } from 'vitest';
import { SceneEffectBridge } from '@/systems/map/SceneEffectBridge';
import type { ContextPacket, GeneratedRuntimePackets, ResolvedActionPacket } from '@/systems/types/PipelineTypes';

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
    pressureIdentity: ['relentless'],
    movementIdentity: ['decisive'],
    signaturePatternIdentity: ['press advantage'],
    narrationBias: ['kinetic description bias'],
    effectBias: ['effect:relentless'],
    environmentalFit: ['ruins'],
    rolePosture: ['guarded'],
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
    environmentalIdentity: ['ruins', 'broken terrain'],
    socialToneIdentity: ['sparse', 'collapsed'],
    travelPressureIdentity: ['restricted paths'],
    hazardPosture: ['fire', 'burning lanes'],
    visualEffectProfile: ['visual:fire'],
    audioPressureProfile: ['audio:ashfall'],
    volatilityProfile: ['ashfall', 'fire'],
    factionDensityProfile: ['raiders', 'localized faction field'],
    tags: ['ruins'],
  },
  encounter: {
    situationType: 'ambush',
    tacticalPressure: ['killbox'],
    threatComposition: ['raiders'],
    environmentalConflicts: ['burning chokepoint'],
    stakes: ['survival'],
    escalationVectors: ['collapse'],
    recommendedEffectTags: ['embers'],
    tags: ['combat'],
  },
  npcIdentity: {
    name: 'Captain Vey',
    role: 'hunter',
    personalityCluster: ['hardline'],
    motivations: ['eliminate target'],
    fearProfile: ['failure'],
    loyaltyProfile: ['crew'],
    factionAlignment: ['raiders'],
    powerStyle: ['aggressive'],
    socialPosture: ['hostile'],
    combatPressureStyle: ['overwhelm'],
    relationshipPosture: ['predatory'],
    rolePosture: ['hunter'],
    threatPosture: ['dominant threat posture'],
    emotionalDefault: ['anger'],
    factionPosture: ['raiders'],
    interactionStyle: ['minimal interaction'],
    pressureStyle: ['overwhelm'],
    dangerStyle: ['volatile danger style'],
    memoryPosture: ['grudge memory posture'],
    narrationBias: ['sharp narration bias'],
    effectBias: ['effect:impact_burst'],
    tags: ['enemy'],
  },
  sceneState: {
    scenePressure: 'high',
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
    backgroundBehavior: ['background:surge'],
    overlayPersistence: ['smoke veil'],
    pulsePatterns: ['pulse:high'],
    impactBursts: ['ember-burst'],
    motionTexture: ['motion:locked'],
    soundCueFamilies: ['cue:high'],
    textEmphasisStyle: ['chat-impact-heavy'],
    narratorHighlightFlavor: ['tone:critical'],
    tags: ['embers'],
  },
};

const context: ContextPacket = {
  mode: 'battle',
  actor: { name: 'Hero' } as any,
  targets: [{ name: 'Bandit', kind: 'enemy' } as any],
  primaryTarget: { name: 'Bandit', kind: 'enemy' } as any,
  zone: 'Ash Ruins',
  environmentTags: ['ruins'],
  activeHazards: ['fire'],
  worldState: null,
  relationshipContext: { entries: [], summary: [] },
  memoryContext: { entries: [], summary: [] },
  narratorSceneContext: 'combat',
  sceneState: { ...generatedPackets.sceneState },
  generated: generatedPackets,
  metadata: {},
};

const resolvedAction: ResolvedActionPacket = {
  rawText: 'Rush them',
  intent: {} as any,
  intentDebug: {} as any,
  legacyMoveIntent: {} as any,
  confidence: 1,
  actorContext: { name: 'Hero' } as any,
  actionResult: { success: false } as any,
  structuredAction: 'rush',
  context,
} as ResolvedActionPacket;

describe('SceneEffectBridge', () => {
  it('builds effect tags from canonical generated packets on context', () => {
    const packet = SceneEffectBridge.build(context, resolvedAction, { summary: 'The bandits surge forward.' });

    expect(packet.zoneShiftTags).toContain('friction:locked');
    expect(packet.hazardPulseTags).toContain('world-hazard:fire');
    expect(packet.enemyPresenceTags).toContain('tactical:killbox');
    expect(packet.environmentalPressureTags).toContain('effect:ember-burst');
    expect(packet.generated).toEqual(generatedPackets);
  });
});
