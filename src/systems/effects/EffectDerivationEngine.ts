import type { GeneratedRuntimePackets } from '@/systems/types/PipelineTypes';
import type { GeneratedSceneEffectState } from '@/systems/generated/GeneratedSceneEffectState';
import { AudioEffectDeriver } from './AudioEffectDeriver';
import { ChatEffectDeriver } from './ChatEffectDeriver';
import { VisualEffectDeriver } from './VisualEffectDeriver';

export const EffectDerivationEngine = {
  derive(packets: GeneratedRuntimePackets): GeneratedSceneEffectState {
    const visualLayers = VisualEffectDeriver.derive(packets);
    const audioLayers = AudioEffectDeriver.derive(packets);
    const chatBehaviors = ChatEffectDeriver.derive(packets);

    return {
      blueprintId: packets.effectState?.blueprintId,
      visualLayers,
      audioLayers,
      chatBehaviors,
      statusOverlays: [...new Set(packets.effectState?.statusOverlays || packets.sceneState?.narrationToneFlags || [])],
      environmentPersistence: [...new Set(packets.effectState?.environmentPersistence || packets.sceneState?.environmentalPressure || [])],
      burstImpacts: [...new Set(packets.effectState?.burstImpacts || packets.sceneState?.effectTags || [])],
      backgroundBehavior: [...new Set(packets.effectState?.backgroundBehavior || visualLayers)],
      overlayPersistence: [...new Set(packets.effectState?.overlayPersistence || packets.effectState?.environmentPersistence || [])],
      pulsePatterns: [...new Set(packets.effectState?.pulsePatterns || chatBehaviors.filter((entry) => /pulse|impact|social/.test(entry)))],
      impactBursts: [...new Set(packets.effectState?.impactBursts || packets.effectState?.burstImpacts || [])],
      motionTexture: [...new Set(packets.effectState?.motionTexture || visualLayers.filter((entry) => /intensity|visual/.test(entry)))],
      soundCueFamilies: [...new Set(packets.effectState?.soundCueFamilies || audioLayers)],
      textEmphasisStyle: [...new Set(packets.effectState?.textEmphasisStyle || chatBehaviors)],
      narratorHighlightFlavor: [...new Set(packets.effectState?.narratorHighlightFlavor || packets.sceneState?.narrationToneFlags || [])],
      tags: [...new Set(packets.effectState?.tags || packets.sceneState?.effectTags || [])],
      metadata: {
        packets,
      },
    };
  },
};
