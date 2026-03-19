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

export function buildEnemyPresentationProfile(input: SpeakerPresentationProfileInput): SpeakerPresentationProfile {
  const visualPressure = derivePressureFromCues(input);
  const pulseBehavior = derivePulseBehavior(input);
  const animationTone = deriveAnimationTone(input);
  const textEmphasis = deriveTextEmphasis(input);
  const overlayBehavior = deriveOverlayBehavior(input);

  return {
    id: `enemy:${visualPressure}:${pulseBehavior}:${textEmphasis}`,
    speakerRole: 'enemy_combatant',
    boxFamily: 'enemy',
    visualPressure,
    pulseBehavior,
    textEmphasis,
    cueFamilyBias: uniq([
      'enemy',
      ...toStringArray(input.identityCues).slice(0, 4),
      ...toStringArray(input.sceneEffectCues).filter((entry) => /enemy:|threat:|impact:|npc-threat:/.test(entry)).slice(0, 4),
    ]),
    animationTone,
    overlayBehavior,
    iconTone: 'enemy',
    surfaceClassName: 'bg-destructive/10 border-destructive/35 text-foreground shadow-sm backdrop-blur-sm',
    iconContainerClassName: 'bg-destructive/15 text-destructive border border-destructive/30',
    labelClassName: 'text-destructive',
    contentClassName: 'text-foreground/95',
  };
}
