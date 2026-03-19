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

export function buildPlayerPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `player:${visualPressure}:${pulseBehavior}`,
    speakerRole: 'player',
    boxFamily: 'player',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'player',
      ...toStringArray(input.sceneEffectCues).filter((entry) => /pressure:|pulse:|chat:/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'player',
    surfaceClassName: 'bg-primary/12 border-primary/35 text-foreground shadow-sm',
    iconContainerClassName: 'bg-primary/15 text-primary border border-primary/25',
    labelClassName: 'text-primary',
    contentClassName: 'text-foreground/95',
  };
}
