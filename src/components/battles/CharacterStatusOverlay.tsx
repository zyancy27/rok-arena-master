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
  /** Active field effects to suppress redundant status overlays */
  suppressedTypes?: string[];
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
const FlameIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.83 2.77-8.17 5.19-11.12.66-.8 1.93-.34 1.93.7v4.42c0 1.1.9 2 2 2s2-.9 2-2V3.58c0-1.04 1.27-1.5 1.93-.7C18.23 5.83 21 10.17 21 14c0 4.97-4.03 9-9 9z"/>
  </svg>
);

// Snowflake for frozen
const SnowflakeIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
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

// Cloud for aerial
const CloudIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
    <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
  </svg>
);

// Blood drop for bleeding
const BloodDrop = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/>
  </svg>
);

// Effect-specific overlays
const EffectOverlay = memo(({ effect }: { effect: CharacterStatusEffect }) => {
  const intensityMultiplier = effect.intensity === 'severe' ? 1.5 : effect.intensity === 'moderate' ? 1 : 0.6;
  
  switch (effect.type) {
    case 'paralyzed':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 animate-[pulse_0.3s_ease-in-out_infinite]" />
        </div>
      );

    case 'blinded':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 animate-[pulse_2s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,${0.3 * intensityMultiplier}) 80%)`,
            }}
          />
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
          <div className="absolute inset-0 bg-blue-500/10 animate-[pulse_3s_ease-in-out_infinite]" />
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
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-blue-400/30 to-transparent animate-[wave_2s_ease-in-out_infinite]" />
        </div>
      );

    case 'burning':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/15 via-transparent to-red-500/10 animate-[pulse_0.5s_ease-in-out_infinite]" />
          {[...Array(Math.floor(5 * intensityMultiplier))].map((_, i) => (
            <FlameIcon
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
          {/* Fire border glow for severe burning */}
          {effect.intensity === 'severe' && (
            <div 
              className="absolute inset-0 animate-[flicker_0.3s_ease-in-out_infinite]"
              style={{
                boxShadow: 'inset 0 0 15px hsl(25 90% 50% / 0.5), inset 0 0 30px hsl(15 90% 40% / 0.3)',
              }}
            />
          )}
        </div>
      );

    case 'frozen':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-cyan-300/10" />
          <div className="absolute inset-0 border-2 border-cyan-300/30 rounded" />
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <SnowflakeIcon
              key={i}
              className="absolute w-4 h-4 text-cyan-300/60 animate-[spin_4s_linear_infinite]"
              style={{
                left: `${15 + (i * 22)}%`,
                top: `${15 + (i % 2) * 50}%`,
                animationDuration: `${4 + i}s`,
              }}
            />
          ))}
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
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-purple-500/10 animate-[pulse_2s_ease-in-out_infinite]" />
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/30 via-purple-500/30 to-green-500/30 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      );

    case 'stunned':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-[1px] animate-[pulse_1s_ease-in-out_infinite]" />
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
          <div className="absolute inset-0 border-4 border-dashed border-gray-400/30 rounded animate-[pulse_2s_ease-in-out_infinite]" />
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
          <div className="absolute inset-0 bg-gradient-to-t from-gray-500/20 to-transparent" />
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
          <div className="absolute inset-0 bg-gray-900/20 animate-[pulse_3s_ease-in-out_infinite]" />
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

    // === NEW STATUS EFFECTS ===

    case 'aerial':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Sky-blue tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 to-transparent" />
          {/* Drifting clouds */}
          {[...Array(Math.floor(3 * intensityMultiplier))].map((_, i) => (
            <CloudIcon
              key={i}
              className="absolute w-12 h-8 text-white/30 animate-[cloudDrift_8s_linear_infinite]"
              style={{
                top: `${15 + (i * 25)}%`,
                left: `-15%`,
                animationDelay: `${i * 2.5}s`,
                animationDuration: `${7 + i * 2}s`,
              }}
            />
          ))}
          {/* Gentle floating motion indicator */}
          <div className="absolute inset-0 animate-[gentleFloat_3s_ease-in-out_infinite]" />
        </div>
      );

    case 'smokescreen':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Swirling smoke layers */}
          <div 
            className="absolute inset-0 battlefield-smoke-drift"
            style={{
              background: `radial-gradient(ellipse at center, 
                hsl(0 0% 40% / ${0.3 * intensityMultiplier}) 0%, 
                hsl(0 0% 30% / ${0.2 * intensityMultiplier}) 60%,
                transparent 100%)`,
            }}
          />
          <div 
            className="absolute inset-0 battlefield-smoke-drift-reverse"
            style={{
              background: `radial-gradient(ellipse at 70% 30%, 
                hsl(0 0% 35% / ${0.25 * intensityMultiplier}) 0%, 
                transparent 60%)`,
            }}
          />
          {effect.intensity === 'severe' && (
            <div className="absolute inset-0" style={{ backdropFilter: 'blur(1px)' }} />
          )}
        </div>
      );

    case 'bleeding':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Blood drips from edges */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <BloodDrop
              key={i}
              className="absolute w-3 h-4 text-red-600/60 animate-[drip_2.5s_ease-in_infinite]"
              style={{
                left: `${10 + (i * 22)}%`,
                top: '-8px',
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
          {/* Blood stain at bottom edges */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-2 animate-[pulse_2s_ease-in-out_infinite]"
            style={{
              background: `linear-gradient(to top, 
                hsl(0 70% 30% / ${0.4 * intensityMultiplier}), 
                transparent)`,
            }}
          />
          {/* Red edge glow */}
          <div 
            className="absolute inset-0"
            style={{
              boxShadow: `inset 0 0 ${effect.intensity === 'severe' ? '15px' : '8px'} hsl(0 70% 40% / 0.3)`,
            }}
          />
        </div>
      );

    case 'electrified':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Pulsing electric glow */}
          <div 
            className="absolute inset-0 battlefield-electric-pulse"
            style={{
              boxShadow: `inset 0 0 20px hsl(200 100% 60% / 0.4), 
                          inset 0 0 40px hsl(180 100% 70% / 0.2)`,
            }}
          />
          {/* Spark flashes */}
          {[...Array(Math.floor(5 * intensityMultiplier))].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-300/80 animate-[sparkFlash_0.3s_ease-out_infinite]"
              style={{
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 80 + 10}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${0.2 + Math.random() * 0.3}s`,
              }}
            />
          ))}
          {/* Electric arc lines */}
          <div className="absolute inset-0 battlefield-electric-arcs opacity-40" />
        </div>
      );

    case 'magnetized':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Glitch/jitter effect via CSS */}
          <div className="absolute inset-0 animate-[jitter_0.1s_linear_infinite]">
            {/* Static noise overlay */}
            <div 
              className="absolute inset-0 animate-[staticNoise_0.15s_steps(4)_infinite]"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  hsl(200 80% 60% / ${0.05 * intensityMultiplier}) 2px,
                  hsl(200 80% 60% / ${0.05 * intensityMultiplier}) 4px
                )`,
              }}
            />
          </div>
          {/* Magnetic field lines */}
          <div 
            className="absolute inset-0"
            style={{
              boxShadow: `inset 0 0 10px hsl(200 60% 50% / 0.2)`,
            }}
          />
          {/* Intermittent scanlines */}
          <div 
            className="absolute inset-0 opacity-30 animate-[pulse_0.5s_ease-in-out_infinite]"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent 3px,
                hsl(200 100% 70% / 0.1) 3px,
                hsl(200 100% 70% / 0.1) 4px
              )`,
            }}
          />
        </div>
      );

    case 'cosmicVacuum':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Swirling vortex gradient */}
          <div 
            className="absolute inset-0 animate-[cosmicSpin_6s_linear_infinite]"
            style={{
              background: `conic-gradient(
                from 0deg at 50% 50%,
                transparent 0deg,
                hsl(270 50% 10% / ${0.4 * intensityMultiplier}) 90deg,
                transparent 180deg,
                hsl(270 50% 10% / ${0.3 * intensityMultiplier}) 270deg,
                transparent 360deg
              )`,
            }}
          />
          {/* Dark center pull */}
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, 
                hsl(270 30% 5% / ${0.5 * intensityMultiplier}) 0%, 
                transparent 60%)`,
            }}
          />
          {/* Particle specs being pulled in */}
          {[...Array(Math.floor(4 * intensityMultiplier))].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-purple-300/60 animate-[cosmicPull_2s_ease-in_infinite]"
              style={{
                left: `${[10, 85, 20, 75][i % 4]}%`,
                top: `${[15, 80, 70, 25][i % 4]}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
          {/* Slight scale effect to imply suction */}
          {effect.intensity === 'severe' && (
            <div className="absolute inset-0 animate-[cosmicShrink_3s_ease-in-out_infinite]" />
          )}
        </div>
      );

    default:
      return null;
  }
});

EffectOverlay.displayName = 'EffectOverlay';

export const CharacterStatusOverlay = memo(({ effects, className, suppressedTypes = [] }: CharacterStatusOverlayProps) => {
  const activeEffects = useMemo(() => {
    const now = Date.now();
    return effects
      .filter(effect => now - effect.startTime < effect.duration)
      .filter(effect => !suppressedTypes.includes(effect.type));
  }, [effects, suppressedTypes]);

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
