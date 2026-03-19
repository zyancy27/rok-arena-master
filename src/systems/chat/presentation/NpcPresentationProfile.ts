import {
  deriveAnimationTone,
  deriveOverlayBehavior,
  derivePressureFromCues,
  derivePulseBehavior,
  deriveTextEmphasis,
  type SpeakerPresentationProfile,
  type SpeakerPresentationProfileInput,
  uniq,
  toStringArray,
} from './SpeakerPresentationProfile';

export function buildNpcPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `npc:${visualPressure}:${pulseBehavior}:${textEmphasis}`,
    speakerRole: 'npc',
    boxFamily: 'npc',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'npc',
      ...toStringArray(input.identityCues).slice(0, 4),
      ...toStringArray(input.sceneEffectCues).filter((entry) => /chat:|npc-|tone:|pressure:/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'npc',
    surfaceClassName: 'bg-accent/10 border-accent/35 text-foreground shadow-sm backdrop-blur-sm',
    iconContainerClassName: 'bg-accent/15 text-accent-foreground border border-accent/25',
    labelClassName: 'text-accent-foreground',
    contentClassName: 'text-foreground/90',
  };
}
