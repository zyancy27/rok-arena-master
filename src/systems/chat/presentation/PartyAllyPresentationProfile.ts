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

export function buildPartyAllyPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `ally:${visualPressure}:${pulseBehavior}:${textEmphasis}`,
    speakerRole: 'party_ally',
    boxFamily: 'ally',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'ally',
      ...toStringArray(input.identityCues).slice(0, 4),
      ...toStringArray(input.sceneEffectCues).filter((entry) => /ally|friend|relation:|tone:/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'ally',
    surfaceClassName: 'bg-secondary/60 border-secondary text-secondary-foreground shadow-sm backdrop-blur-sm',
    iconContainerClassName: 'bg-secondary text-secondary-foreground border border-border/40',
    labelClassName: 'text-secondary-foreground',
    contentClassName: 'text-secondary-foreground/90',
  };
}
