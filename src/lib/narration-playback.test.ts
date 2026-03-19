import { describe, expect, it } from 'vitest';
import { buildNarrationPlaybackOptions, getNarratorPlaybackMetadata } from '@/lib/narration-playback';

const generatedSource = {
  generatedPackets: {
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
      chatBehaviors: ['impact-burst'],
      statusOverlays: ['tone:critical'],
      environmentPersistence: ['smoke veil'],
      burstImpacts: ['ember-burst'],
      tags: ['embers'],
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
      tags: ['enemy'],
    },
  },
};

describe('narration-playback', () => {
  it('derives playback directly from canonical generated packets', () => {
    const playback = getNarratorPlaybackMetadata(generatedSource);
    const options = buildNarrationPlaybackOptions(generatedSource);

    expect(playback?.context).toBe('combat');
    expect(playback?.soundCue).toBe('combat_surge');
    expect(options?.animationTag).toBe('attack_anim');
    expect(options?.voiceSettings?.speed).toBeGreaterThan(1);
  });
});
