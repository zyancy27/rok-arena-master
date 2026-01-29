/**
 * Character Status Overlay Component
 * Displays visual effects in the chat input area based on character status effects
 */

import { memo, useMemo } from 'react';
import type { CharacterStatusEffect, CharacterStatusType } from '@/lib/character-status-effects';
import { cn } from '@/lib/utils';

interface CharacterStatusOverlayProps {
  effects: CharacterStatusEffect[];
  className?: string;
}

// Lightning bolt SVG for paralysis
const LightningBolt = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

// Water drop/bubble for submerged
const WaterBubble = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn("absolute rounded-full bg-blue-400/30 border border-blue-400/50", className)} style={style} />
);

// Flame for burning
const Flame = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.83 2.77-8.17 5.19-11.12.66-.8 1.93-.34 1.93.7v4.42c0 1.1.9 2 2 2s2-.9 2-2V3.58c0-1.04 1.27-1.5 1.93-.7C18.23 5.83 21 10.17 21 14c0 4.97-4.03 9-9 9z"/>
  </svg>
);

// Snowflake for frozen
const Snowflake = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.79 13.95l-1.41-1.41 1.41-1.41-1.41-1.41-1.42 1.41-2.12-2.12 2.12-2.12-1.41-1.41-2.12 2.12-1.41-1.42V3.05h-2v3.13L9.61 4.77 8.2 6.18l2.12 2.12-2.12 2.12-1.41-1.41-1.42 1.41 1.42 1.41-1.42 1.41 1.42 1.42 1.41-1.42 2.12 2.12-2.12 2.12 1.41 1.42 2.12-2.12 1.41 1.41v3.13h2v-3.13l1.41 1.41 1.41-1.41-2.12-2.12 2.12-2.12 1.42 1.42 1.41-1.42z"/>
  </svg>
);

// Poison drop
const PoisonDrop = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/>
  </svg>
);

// Spiral for stunned/dizzy
const DizzySpiral = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" strokeLinecap="round"/>
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

// Chain link for restrained
const ChainLink = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z"/>
  </svg>
);

// Effect-specific overlays
const EffectOverlay = memo(({ effect }: { effect: CharacterStatusEffect }) => {
  const intensityMultiplier = effect.intensity === 'severe' ? 1.5 : effect.intensity === 'moderate' ? 1 : 0.6;
  
  switch (effect.type) {
    case 'paralyzed':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Lightning bolts scattered around */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <LightningBolt
              key={i}
              className={cn(
                "absolute w-4 h-4 text-yellow-400/70 animate-pulse",
                i % 2 === 0 ? "animate-[pulse_0.5s_ease-in-out_infinite]" : "animate-[pulse_0.7s_ease-in-out_infinite_0.2s]"
              )}
              style={{
                left: `${15 + (i * 20)}%`,
                top: `${20 + (i % 3) * 25}%`,
                transform: `rotate(${-15 + i * 30}deg) scale(${0.8 + (i % 2) * 0.4})`,
              }}
            />
          ))}
          {/* Electric crackling effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 animate-[pulse_0.3s_ease-in-out_infinite]" />
        </div>
      );

    case 'blinded':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Dark vignette effect */}
          <div 
            className="absolute inset-0 animate-[pulse_2s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,${0.3 * intensityMultiplier}) 80%)`,
            }}
          />
          {/* Floating dark spots */}
          {[...Array(Math.floor(3 * intensityMultiplier))].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-black/30 animate-[float_3s_ease-in-out_infinite]"
              style={{
                width: `${30 + i * 15}px`,
                height: `${30 + i * 15}px`,
                left: `${10 + i * 30}%`,
                top: `${20 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      );

    case 'submerged':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Water tint */}
          <div className="absolute inset-0 bg-blue-500/10 animate-[pulse_3s_ease-in-out_infinite]" />
          {/* Rising bubbles */}
          {[...Array(Math.floor(6 * intensityMultiplier))].map((_, i) => (
            <WaterBubble
              key={i}
              className="animate-[rise_2s_ease-in-out_infinite]"
              style={{
                width: `${8 + (i % 3) * 6}px`,
                height: `${8 + (i % 3) * 6}px`,
                left: `${10 + (i * 15)}%`,
                bottom: `-10px`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 3) * 0.5}s`,
              }}
            />
          ))}
          {/* Water wave at bottom */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-blue-400/30 to-transparent animate-[wave_2s_ease-in-out_infinite]"
          />
        </div>
      );

    case 'burning':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Fire glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/15 via-transparent to-red-500/10 animate-[pulse_0.5s_ease-in-out_infinite]" />
          {/* Rising flames at bottom */}
          {[...Array(Math.floor(5 * intensityMultiplier))].map((_, i) => (
            <Flame
              key={i}
              className="absolute w-5 h-5 text-orange-500/60 animate-[flicker_0.5s_ease-in-out_infinite]"
              style={{
                left: `${5 + (i * 18)}%`,
                bottom: '0px',
                animationDelay: `${i * 0.1}s`,
                transform: `scale(${0.7 + (i % 3) * 0.3})`,
              }}
            />
          ))}
        </div>
      );

    case 'frozen':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Ice tint */}
          <div className="absolute inset-0 bg-cyan-300/10" />
          {/* Frost border */}
          <div className="absolute inset-0 border-2 border-cyan-300/30 rounded" />
          {/* Snowflakes */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <Snowflake
              key={i}
              className="absolute w-4 h-4 text-cyan-300/60 animate-[spin_4s_linear_infinite]"
              style={{
                left: `${15 + (i * 22)}%`,
                top: `${15 + (i % 2) * 50}%`,
                animationDuration: `${4 + i}s`,
              }}
            />
          ))}
          {/* Ice crack lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="10%" y1="20%" x2="30%" y2="45%" stroke="cyan" strokeWidth="1"/>
            <line x1="30%" y1="45%" x2="25%" y2="80%" stroke="cyan" strokeWidth="1"/>
            <line x1="70%" y1="10%" x2="85%" y2="40%" stroke="cyan" strokeWidth="1"/>
          </svg>
        </div>
      );

    case 'poisoned':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Toxic green tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-purple-500/10 animate-[pulse_2s_ease-in-out_infinite]" />
          {/* Poison drops */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <PoisonDrop
              key={i}
              className="absolute w-4 h-4 text-green-500/50 animate-[drip_2s_ease-in-out_infinite]"
              style={{
                left: `${15 + (i * 20)}%`,
                top: '-10px',
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
          {/* Toxic veins */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/30 via-purple-500/30 to-green-500/30 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      );

    case 'stunned':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Dizzy spiral blur */}
          <div className="absolute inset-0 backdrop-blur-[1px] animate-[pulse_1s_ease-in-out_infinite]" />
          {/* Spinning stars/spirals */}
          {[...Array(Math.floor(3 * intensityMultiplier))].map((_, i) => (
            <DizzySpiral
              key={i}
              className="absolute w-5 h-5 text-yellow-400/50 animate-[spin_2s_linear_infinite]"
              style={{
                left: `${20 + (i * 25)}%`,
                top: `${30 + (i % 2) * 20}%`,
                animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              }}
            />
          ))}
        </div>
      );

    case 'restrained':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Chain overlay */}
          <div className="absolute inset-0 border-4 border-dashed border-gray-400/30 rounded animate-[pulse_2s_ease-in-out_infinite]" />
          {/* Chain links */}
          {[...Array(Math.floor(3 * intensityMultiplier))].map((_, i) => (
            <ChainLink
              key={i}
              className="absolute w-5 h-5 text-gray-400/50 animate-[shake_0.5s_ease-in-out_infinite]"
              style={{
                left: `${20 + (i * 25)}%`,
                top: `${25 + (i % 2) * 40}%`,
                transform: `rotate(${45 * i}deg)`,
              }}
            />
          ))}
        </div>
      );

    case 'slowed':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Heavy fog/blur at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-500/20 to-transparent" />
          {/* Slow motion lines */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute h-[2px] bg-gray-400/30 animate-[slideRight_3s_linear_infinite]"
              style={{
                width: '30%',
                left: '-30%',
                top: `${30 + i * 20}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      );

    case 'exhausted':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Fading/dim overlay */}
          <div className="absolute inset-0 bg-gray-900/20 animate-[pulse_3s_ease-in-out_infinite]" />
          {/* Downward dripping energy */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 bg-gradient-to-b from-purple-400/40 to-transparent animate-[drip_2s_ease-in-out_infinite]"
              style={{
                height: '20px',
                left: `${15 + (i * 20)}%`,
                top: '0',
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
});

EffectOverlay.displayName = 'EffectOverlay';

export const CharacterStatusOverlay = memo(({ effects, className }: CharacterStatusOverlayProps) => {
  // Filter to only active effects
  const activeEffects = useMemo(() => {
    const now = Date.now();
    return effects.filter(effect => now - effect.startTime < effect.duration);
  }, [effects]);

  if (activeEffects.length === 0) {
    return null;
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-md", className)}>
      {activeEffects.map((effect, index) => (
        <EffectOverlay key={`${effect.type}-${index}`} effect={effect} />
      ))}
    </div>
  );
});

CharacterStatusOverlay.displayName = 'CharacterStatusOverlay';
