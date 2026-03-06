/**
 * Ambient Overlay
 * 
 * Renders subtle cosmetic environmental elements:
 * - Ambient creatures (birds, bats, fish, etc.)
 * - Whisper messages
 * - Ambient sound visualizations (wind streaks, rain drops, etc.)
 * - Narrator curiosity moments
 * 
 * All effects are purely atmospheric and never interrupt readability.
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  selectAmbientCreatures,
  getAmbientSoundVisual,
  type AmbientCreature,
  type AmbientSoundVisual,
} from '@/lib/immersion-engine';

interface AmbientOverlayProps {
  environmentTags: string[];
  isActive: boolean;
  className?: string;
}

export default function AmbientOverlay({
  environmentTags,
  isActive,
  className,
}: AmbientOverlayProps) {
  const creatures = useMemo(() => selectAmbientCreatures(environmentTags), [environmentTags]);
  const soundVisual = useMemo(() => getAmbientSoundVisual(environmentTags), [environmentTags]);
  const [activeCreature, setActiveCreature] = useState<AmbientCreature | null>(null);

  // Occasionally show a creature
  useEffect(() => {
    if (!isActive || creatures.length === 0) return;
    
    const interval = setInterval(() => {
      if (Math.random() < 0.15) {
        const creature = creatures[Math.floor(Math.random() * creatures.length)];
        setActiveCreature(creature);
        setTimeout(() => setActiveCreature(null), 4000);
      }
    }, 12000);
    
    return () => clearInterval(interval);
  }, [isActive, creatures]);

  if (!isActive) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-5 overflow-hidden', className)} aria-hidden>
      {/* Ambient sound visualization */}
      {soundVisual && <SoundVisualLayer type={soundVisual} />}
      
      {/* Ambient creature */}
      {activeCreature && (
        <CreatureAnimation creature={activeCreature} />
      )}
    </div>
  );
}

// ── Sound Visualization ─────────────────────────────────────────

function SoundVisualLayer({ type }: { type: AmbientSoundVisual }) {
  if (!type) return null;
  
  return (
    <div className={cn('absolute inset-0', `ambient-sound-${type}`)} />
  );
}

// ── Creature Animation ──────────────────────────────────────────

function CreatureAnimation({ creature }: { creature: AmbientCreature }) {
  return (
    <div className={cn('absolute ambient-creature', `creature-${creature.animation}`)}>
      <span className="text-sm opacity-40 select-none">{creature.emoji}</span>
    </div>
  );
}

// ── Whisper Display Component ───────────────────────────────────

export function WhisperMessage({ message }: { message: string }) {
  return (
    <div className="flex justify-center my-3 animate-fade-in">
      <div className="bg-muted/20 backdrop-blur-sm border border-border/30 rounded-full px-6 py-2 max-w-md">
        <p className="text-xs text-muted-foreground italic text-center whisper-text">
          {message}
        </p>
      </div>
    </div>
  );
}

// ── Narrator Curiosity Display ──────────────────────────────────

export function NarratorCuriosityMoment({ message }: { message: string }) {
  return (
    <div className="flex justify-center my-2 animate-fade-in">
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg px-4 py-2 max-w-sm">
        <p className="text-xs text-purple-400/70 italic text-center">
          {message}
        </p>
      </div>
    </div>
  );
}
