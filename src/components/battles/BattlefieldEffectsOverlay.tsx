import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ActiveBattlefieldEffect,
  isEffectActive,
  BattlefieldEffectType,
  FIELD_EFFECT_PRIORITY,
} from '@/lib/battlefield-effects';

interface BattlefieldEffectsOverlayProps {
  effects: ActiveBattlefieldEffect[];
  className?: string;
}

/**
 * Renders visual overlays for active battlefield effects
 * Effects are sorted by priority so higher-priority ones render on top
 */
export default function BattlefieldEffectsOverlay({
  effects,
  className,
}: BattlefieldEffectsOverlayProps) {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    if (effects.length === 0) return;
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, [effects.length]);
  
  const activeEffects = useMemo(
    () => effects
      .filter(isEffectActive)
      .sort((a, b) => (FIELD_EFFECT_PRIORITY[a.type] || 0) - (FIELD_EFFECT_PRIORITY[b.type] || 0)),
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
  
  const intensityOpacity = { low: 0.3, medium: 0.5, high: 0.7 };
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
    case 'fire': return <FireEffect intensity={intensity} />;
    case 'ice': return <IceEffect intensity={intensity} />;
    case 'smoke': return <SmokeEffect intensity={intensity} />;
    case 'flash': return <FlashEffect intensity={intensity} />;
    case 'storm': return <StormEffect intensity={intensity} />;
    case 'darkness': return <DarknessEffect intensity={intensity} />;
    case 'poison': return <PoisonEffect intensity={intensity} />;
    case 'electric': return <ElectricEffect intensity={intensity} />;
    case 'sand': return <SandEffect intensity={intensity} />;
    case 'water': return <WaterEffect intensity={intensity} />;
    case 'inferno': return <InfernoEffect intensity={intensity} />;
    case 'flooded': return <FloodedEffect intensity={intensity} />;
    case 'gravity': return <GravityEffect intensity={intensity} />;
    case 'blackhole': return <BlackHoleEffect intensity={intensity} />;
    default: return null;
  }
}

// === EXISTING EFFECTS ===

function FireEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0 animate-pulse" style={{ background: `linear-gradient(to top, hsl(15 90% 50% / 0.6) 0%, hsl(30 90% 50% / 0.4) 30%, hsl(45 90% 50% / 0.2) 60%, transparent 100%)` }} />
      <div className="absolute inset-0 battlefield-fire-particles" />
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 ${intensity === 'high' ? '60px' : '30px'} hsl(25 90% 50% / 0.5)` }} />
    </>
  );
}

function IceEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 20%, hsl(200 80% 80% / 0.2) 50%, hsl(200 90% 90% / 0.4) 100%)` }} />
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 ${intensity === 'high' ? '40px' : '20px'} hsl(200 80% 85% / 0.6)`, borderRadius: 'inherit' }} />
      <div className="absolute inset-0 battlefield-frost-pattern" />
    </>
  );
}

function SmokeEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0 battlefield-smoke-drift" style={{ background: `linear-gradient(135deg, hsl(0 0% 30% / 0.5) 0%, hsl(0 0% 40% / 0.3) 50%, hsl(0 0% 35% / 0.4) 100%)` }} />
      <div className="absolute inset-0 battlefield-smoke-drift-reverse" style={{ background: `linear-gradient(225deg, hsl(0 0% 25% / 0.4) 0%, transparent 50%, hsl(0 0% 30% / 0.3) 100%)` }} />
      <div className="absolute inset-0" style={{ backdropFilter: intensity === 'high' ? 'blur(2px)' : 'blur(1px)' }} />
    </>
  );
}

function FlashEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <div className="absolute inset-0 battlefield-flash-pulse" style={{ background: intensity === 'high' ? 'hsl(60 100% 95% / 0.9)' : 'hsl(60 80% 90% / 0.6)' }} />
  );
}

function StormEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, hsl(220 30% 20% / 0.5) 0%, hsl(220 20% 30% / 0.3) 50%, transparent 100%)` }} />
      <div className="absolute inset-0 battlefield-rain" />
      {intensity === 'high' && <div className="absolute inset-0 battlefield-lightning" />}
    </>
  );
}

function DarknessEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, hsl(270 30% 5% / ${intensity === 'high' ? '0.7' : '0.4'}) 0%, hsl(270 40% 3% / ${intensity === 'high' ? '0.9' : '0.6'}) 100%)` }} />
  );
}

function PoisonEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0 battlefield-poison-drift" style={{ background: `linear-gradient(to top, hsl(120 60% 30% / 0.5) 0%, hsl(100 50% 40% / 0.3) 50%, transparent 100%)` }} />
      <div className="absolute inset-0 battlefield-poison-bubbles" />
    </>
  );
}

function ElectricEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0 battlefield-electric-pulse" style={{ boxShadow: `inset 0 0 30px hsl(200 100% 60% / 0.5), inset 0 0 60px hsl(180 100% 70% / 0.3)` }} />
      <div className="absolute inset-0 battlefield-electric-arcs" />
    </>
  );
}

function SandEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0 battlefield-sand-drift" style={{ background: `linear-gradient(135deg, hsl(35 60% 50% / 0.4) 0%, hsl(40 50% 60% / 0.3) 50%, hsl(35 55% 45% / 0.4) 100%)` }} />
      <div className="absolute inset-0 battlefield-sand-particles" />
    </>
  );
}

function WaterEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, hsl(200 70% 40% / 0.5) 0%, hsl(200 60% 50% / 0.3) 50%, transparent 100%)` }} />
      <div className="absolute inset-0 battlefield-water-caustics" />
      {intensity === 'high' && <div className="absolute inset-0" style={{ backdropFilter: 'blur(1px)' }} />}
    </>
  );
}

// === NEW FIELD-WIDE EFFECTS ===

function InfernoEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Orange tint / heat glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, 
            hsl(30 100% 50% / 0.15) 0%, 
            hsl(15 100% 40% / 0.1) 50%,
            transparent 100%)`,
        }}
      />
      {/* Heat distortion - animated blur wave */}
      <div 
        className="absolute inset-0 animate-[heatWave_3s_ease-in-out_infinite]"
        style={{ backdropFilter: intensity === 'high' ? 'blur(1px)' : 'blur(0.5px)' }}
      />
      {/* Ember particles rising */}
      <div className="absolute inset-0 battlefield-fire-particles" />
      {/* Intense fire gradient from bottom */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: `linear-gradient(to top, 
            hsl(15 100% 45% / 0.5) 0%, 
            hsl(30 100% 50% / 0.3) 20%, 
            hsl(45 100% 55% / 0.15) 40%, 
            transparent 70%)`,
        }}
      />
      {/* Edge glow */}
      <div 
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${intensity === 'high' ? '80px' : '40px'} hsl(20 100% 45% / 0.4)`,
        }}
      />
    </>
  );
}

function FloodedEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Water at bottom with wave motion */}
      <div 
        className="absolute bottom-0 left-0 right-0 animate-[wave_2s_ease-in-out_infinite]"
        style={{
          height: intensity === 'high' ? '30%' : '15%',
          background: `linear-gradient(to top, 
            hsl(200 70% 40% / 0.6) 0%, 
            hsl(200 60% 50% / 0.3) 60%,
            transparent 100%)`,
        }}
      />
      {/* Wave crests */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300/40 to-transparent animate-[wave_1.5s_ease-in-out_infinite]"
        style={{ bottom: intensity === 'high' ? '30%' : '15%' }}
      />
      {/* Water caustics */}
      <div className="absolute inset-0 battlefield-water-caustics opacity-50" />
      {/* Subtle blue tint overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, 
            hsl(200 60% 50% / 0.1) 0%, 
            transparent 50%)`,
        }}
      />
      {/* Bubbles at edges */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 battlefield-poison-bubbles" style={{ filter: 'hue-rotate(180deg)' }} />
    </>
  );
}

function GravityEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Radial darkening toward center - pull effect */}
      <div 
        className="absolute inset-0 animate-[gravityPulse_4s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle at center, 
            hsl(270 20% 10% / 0.3) 0%, 
            transparent 70%)`,
        }}
      />
      {/* Downward shadow to indicate heaviness */}
      <div 
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 ${intensity === 'high' ? '20px' : '10px'} 30px hsl(0 0% 0% / 0.3)`,
        }}
      />
      {/* Gravity lines pulling inward */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute w-[1px] bg-gradient-to-b from-transparent via-purple-400/20 to-transparent animate-[gravityLine_3s_ease-in-out_infinite]"
          style={{
            height: '100%',
            left: `${20 + i * 20}%`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </>
  );
}

function BlackHoleEffect({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  return (
    <>
      {/* Rotating conic gradient - swirl effect */}
      <div 
        className="absolute inset-0 animate-[cosmicSpin_8s_linear_infinite]"
        style={{
          background: `conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            hsl(270 40% 8% / 0.6) 60deg,
            transparent 120deg,
            hsl(270 40% 8% / 0.5) 180deg,
            transparent 240deg,
            hsl(270 40% 8% / 0.4) 300deg,
            transparent 360deg
          )`,
        }}
      />
      {/* Black center */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, 
            hsl(0 0% 0% / ${intensity === 'high' ? '0.8' : '0.5'}) 0%, 
            hsl(270 30% 5% / 0.3) 30%,
            transparent 60%)`,
        }}
      />
      {/* Particle specs spiraling inward */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-300/50 animate-[cosmicPull_3s_ease-in_infinite]"
          style={{
            left: `${[5, 90, 15, 80, 50, 50][i]}%`,
            top: `${[10, 85, 75, 20, 5, 90][i]}%`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      {/* Purple/violet edge glow */}
      <div 
        className="absolute inset-0 animate-[pulse_2s_ease-in-out_infinite]"
        style={{
          boxShadow: `inset 0 0 ${intensity === 'high' ? '50px' : '25px'} hsl(270 60% 30% / 0.4)`,
        }}
      />
    </>
  );
}
