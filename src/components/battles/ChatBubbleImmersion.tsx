/**
 * Chat Bubble Immersion Layer
 * 
 * Applies per-message visual effects based on character traits and message content:
 * - Character aura (behind bubble)
 * - Emotional text effects
 * - Dimensional glitch
 * - Skill mastery visuals
 * - Environmental reactions
 * - Physical impact effects
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  detectCharacterAura,
  detectEmotion,
  detectGlitchAbility,
  shouldTriggerGlitch,
  detectEnvironmentalReaction,
  detectSkillMastery,
  detectImpact,
  type CharacterAura,
  type GlitchEffect,
} from '@/lib/immersion-engine';

interface CharacterTraits {
  powers: string | null;
  abilities: string | null;
  personality: string | null;
  weaponsItems?: string | null;
  skillStat?: number | null;
}

interface ChatBubbleImmersionProps {
  messageText: string;
  messageRole: 'user' | 'ai' | 'narrator' | 'system';
  characterTraits?: CharacterTraits;
  isInUniverse: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function ChatBubbleImmersion({
  messageText,
  messageRole,
  characterTraits,
  isInUniverse,
  children,
  className,
}: ChatBubbleImmersionProps) {
  // Only apply immersion to in-universe character messages
  const shouldApply = isInUniverse && (messageRole === 'user' || messageRole === 'ai');

  const aura = useMemo(() => {
    if (!shouldApply || !characterTraits) return null;
    return detectCharacterAura(characterTraits.powers, characterTraits.abilities, characterTraits.personality);
  }, [shouldApply, characterTraits?.powers, characterTraits?.abilities, characterTraits?.personality]);

  const emotion = useMemo(() => {
    if (!shouldApply) return null;
    return detectEmotion(messageText);
  }, [shouldApply, messageText]);

  const glitch = useMemo(() => {
    if (!shouldApply || !characterTraits) return null;
    return detectGlitchAbility(characterTraits.powers, characterTraits.abilities);
  }, [shouldApply, characterTraits?.powers, characterTraits?.abilities]);

  const glitchActive = useMemo(() => shouldTriggerGlitch(glitch), [glitch, messageText]);

  const impact = useMemo(() => {
    if (!shouldApply) return null;
    return detectImpact(messageText);
  }, [shouldApply, messageText]);

  const envReaction = useMemo(() => {
    if (!shouldApply) return null;
    return detectEnvironmentalReaction(messageText);
  }, [shouldApply, messageText]);

  const skillVisual = useMemo(() => {
    if (!shouldApply || !characterTraits) return null;
    return detectSkillMastery(characterTraits.skillStat, messageText);
  }, [shouldApply, characterTraits?.skillStat, messageText]);

  if (!shouldApply) return <>{children}</>;

  return (
    <div className={cn('relative', className)}>
      {/* Character Aura Layer — behind bubble */}
      {aura && <AuraOverlay aura={aura} />}
      
      {/* Main content with effects applied */}
      <div className={cn(
        'relative z-10',
        emotion?.cssClass,
        glitchActive && glitch?.cssClass,
        impact?.cssClass,
        envReaction?.cssClass,
        skillVisual?.cssClass,
      )}>
        {children}
      </div>
      
      {/* Environmental reaction particles */}
      {envReaction && <ReactionParticles type={envReaction.particleType ?? 'dust'} duration={envReaction.duration} />}
      
      {/* Impact shockwave */}
      {impact && (impact.screenShake || impact.shockwave) && <ImpactOverlay impact={impact} />}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function AuraOverlay({ aura }: { aura: CharacterAura }) {
  return (
    <div
      className={cn(
        'absolute inset-0 -m-1 rounded-lg opacity-30 blur-sm pointer-events-none z-0 transition-opacity duration-1000',
        aura.cssClass,
      )}
      style={{
        background: `radial-gradient(ellipse at center, ${aura.particleColor}33, transparent 70%)`,
      }}
      aria-hidden
    />
  );
}

function ReactionParticles({ type, duration }: { type: string; duration: number }) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg',
        `env-react-${type}`,
      )}
      style={{
        animationDuration: `${duration}ms`,
        animationFillMode: 'forwards',
      }}
      aria-hidden
    />
  );
}

function ImpactOverlay({ impact }: { impact: { level: string; screenShake: boolean; shockwave: boolean; cracks: boolean } }) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg',
        impact.screenShake && 'animate-impact-shake',
        impact.shockwave && 'animate-impact-shockwave',
        impact.cracks && 'impact-cracks',
      )}
      aria-hidden
    />
  );
}
