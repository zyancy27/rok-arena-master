import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ActiveBattlefieldEffect,
  isEffectActive,
  BattlefieldEffectType,
} from '@/lib/battlefield-effects';

interface BattlefieldEffectsOverlayProps {
  effects: ActiveBattlefieldEffect[];
  className?: string;
}

/**
 * Renders visual overlays for active battlefield effects
 */
export default function BattlefieldEffectsOverlay({
  effects,
  className,
}: BattlefieldEffectsOverlayProps) {
  const [, forceUpdate] = useState(0);
  
  // Force re-render periodically to clean up expired effects
  useEffect(() => {
    if (effects.length === 0) return;
    
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [effects.length]);
  
  const activeEffects = useMemo(
    () => effects.filter(isEffectActive),
    [effects, forceUpdate]
  );
  
  if (activeEffects.length === 0) return null;
  
  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-0', className)}>
      {activeEffects.map((effect, index) => (
        <EffectLayer key={`${effect.type}-${effect.startTime}-${index}`} effect={effect} />
      ))}
    </div>
  );
}

interface EffectLayerProps {
  effect: ActiveBattlefieldEffect;
}

function EffectLayer({ effect }: EffectLayerProps) {
  const [opacity, setOpacity] = useState(0);
  
  // Fade in on mount, fade out when effect expires
  useEffect(() => {
    const fadeInTimer = setTimeout(() => setOpacity(1), 50);
    
    const remaining = effect.duration - (Date.now() - effect.startTime);
    const fadeOutStart = Math.max(remaining - 2000, 0);
    
    const fadeOutTimer = setTimeout(() => setOpacity(0), fadeOutStart);
    
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, [effect]);
  
  const intensityOpacity = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
  };
  
  const baseOpacity = intensityOpacity[effect.intensity] * opacity;
  
  return (
    <div
      className="absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: baseOpacity }}
    >
      {renderEffectContent(effect.type, effect.intensity)}
    </div>
  );
}

function renderEffectContent(type: BattlefieldEffectType, intensity: 'low' | 'medium' | 'high') {
  switch (type) {
    case 'fire':
      return <FireEffect intensity={intensity} />;
    case 'ice':
      return <IceEffect intensity={intensity} />;
    case 'smoke':
      return <SmokeEffect intensity={intensity} />;
    case 'flash':
      return <FlashEffect intensity={intensity} />;
    case 'storm':
      return <StormEffect intensity={intensity} />;
    case 'darkness':
      return <DarknessEffect intensity={intensity} />;
    case 'poison':
      return <PoisonEffect intensity={intensity} />;
    case 'electric':
      return <ElectricEffect intensity={intensity} />;
    case 'sand':
      return <SandEffect intensity={intensity} />;
    case 'water':
      return <WaterEffect intensity={intensity} />;
    default:
      return null;
  }
}

// Individual effect components

function FireEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Radial fire gradient from bottom */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `linear-gradient(to top, 
            hsl(15 90% 50% / 0.6) 0%, 
            hsl(30 90% 50% / 0.4) 30%, 
            hsl(45 90% 50% / 0.2) 60%, 
            transparent 100%)`,
        }}
      />
      {/* Fire particles */}
      <div className="absolute inset-0 battlefield-fire-particles" />
      {/* Edge glow */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${intensity === 'high' ? '60px' : '30px'} hsl(25 90% 50% / 0.5)`,
        }}
      />
    </>
  );
}

function IceEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Frost overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, 
            transparent 20%,
            hsl(200 80% 80% / 0.2) 50%,
            hsl(200 90% 90% / 0.4) 100%)`,
        }}
      />
      {/* Ice crystals border */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${intensity === 'high' ? '40px' : '20px'} hsl(200 80% 85% / 0.6)`,
          borderRadius: 'inherit',
        }}
      />
      {/* Frost texture */}
      <div className="absolute inset-0 battlefield-frost-pattern" />
    </>
  );
}

function SmokeEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Smoke layers */}
      <div
        className="absolute inset-0 battlefield-smoke-drift"
        style={{
          background: `linear-gradient(135deg, 
            hsl(0 0% 30% / 0.5) 0%, 
            hsl(0 0% 40% / 0.3) 50%,
            hsl(0 0% 35% / 0.4) 100%)`,
        }}
      />
      <div
        className="absolute inset-0 battlefield-smoke-drift-reverse"
        style={{
          background: `linear-gradient(225deg, 
            hsl(0 0% 25% / 0.4) 0%, 
            transparent 50%,
            hsl(0 0% 30% / 0.3) 100%)`,
        }}
      />
      {/* Blur effect */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: intensity === 'high' ? 'blur(2px)' : 'blur(1px)',
        }}
      />
    </>
  );
}

function FlashEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <div
      className="absolute inset-0 battlefield-flash-pulse"
      style={{
        background: intensity === 'high'
          ? 'hsl(60 100% 95% / 0.9)'
          : 'hsl(60 80% 90% / 0.6)',
      }}
    />
  );
}

function StormEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Dark storm clouds */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, 
            hsl(220 30% 20% / 0.5) 0%, 
            hsl(220 20% 30% / 0.3) 50%,
            transparent 100%)`,
        }}
      />
      {/* Rain streaks */}
      <div className="absolute inset-0 battlefield-rain" />
      {/* Lightning flashes */}
      {intensity === 'high' && (
        <div className="absolute inset-0 battlefield-lightning" />
      )}
    </>
  );
}

function DarknessEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(ellipse at center, 
          hsl(270 30% 5% / ${intensity === 'high' ? '0.7' : '0.4'}) 0%, 
          hsl(270 40% 3% / ${intensity === 'high' ? '0.9' : '0.6'}) 100%)`,
      }}
    />
  );
}

function PoisonEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Toxic mist */}
      <div
        className="absolute inset-0 battlefield-poison-drift"
        style={{
          background: `linear-gradient(to top, 
            hsl(120 60% 30% / 0.5) 0%, 
            hsl(100 50% 40% / 0.3) 50%,
            transparent 100%)`,
        }}
      />
      {/* Bubble particles */}
      <div className="absolute inset-0 battlefield-poison-bubbles" />
    </>
  );
}

function ElectricEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Electric glow */}
      <div
        className="absolute inset-0 battlefield-electric-pulse"
        style={{
          boxShadow: `inset 0 0 30px hsl(200 100% 60% / 0.5), 
                      inset 0 0 60px hsl(180 100% 70% / 0.3)`,
        }}
      />
      {/* Arc effects */}
      <div className="absolute inset-0 battlefield-electric-arcs" />
    </>
  );
}

function SandEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Sand haze */}
      <div
        className="absolute inset-0 battlefield-sand-drift"
        style={{
          background: `linear-gradient(135deg, 
            hsl(35 60% 50% / 0.4) 0%, 
            hsl(40 50% 60% / 0.3) 50%,
            hsl(35 55% 45% / 0.4) 100%)`,
        }}
      />
      {/* Sand particles */}
      <div className="absolute inset-0 battlefield-sand-particles" />
    </>
  );
}

function WaterEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Water overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, 
            hsl(200 70% 40% / 0.5) 0%, 
            hsl(200 60% 50% / 0.3) 50%,
            transparent 100%)`,
        }}
      />
      {/* Water caustics */}
      <div className="absolute inset-0 battlefield-water-caustics" />
      {/* Underwater blur */}
      {intensity === 'high' && (
        <div
          className="absolute inset-0"
          style={{ backdropFilter: 'blur(1px)' }}
        />
      )}
    </>
  );
}
