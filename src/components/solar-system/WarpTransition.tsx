import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WarpTransitionProps {
  isActive: boolean;
  direction: 'in' | 'out';
  onTransitionEnd?: () => void;
}

export default function WarpTransition({ isActive, direction, onTransitionEnd }: WarpTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'start' | 'peak' | 'end'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('start');
      
      // Peak of the warp effect - slower transition
      const peakTimer = setTimeout(() => {
        setPhase('peak');
      }, 500);
      
      // Fade out - longer duration
      const endTimer = setTimeout(() => {
        setPhase('end');
        onTransitionEnd?.();
      }, 1000);
      
      // Reset - give more time to fade
      const resetTimer = setTimeout(() => {
        setPhase('idle');
      }, 1800);
      
      return () => {
        clearTimeout(peakTimer);
        clearTimeout(endTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [isActive, onTransitionEnd]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Soft radial glow */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-700 ease-in-out",
          phase === 'start' && "opacity-60",
          phase === 'peak' && "opacity-80",
          phase === 'end' && "opacity-0"
        )}
      >
        {/* Fewer, softer star streak lines */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 360;
          const delay = Math.random() * 150;
          return (
            <div
              key={i}
              className={cn(
                "absolute left-1/2 top-1/2 h-[1px] origin-left transition-all ease-out",
                direction === 'out' 
                  ? "bg-gradient-to-r from-white/60 via-primary/20 to-transparent" 
                  : "bg-gradient-to-r from-transparent via-primary/20 to-white/60"
              )}
              style={{
                transform: `rotate(${angle}deg)`,
                width: phase === 'peak' ? '120vw' : phase === 'start' ? '10vw' : '0',
                opacity: phase === 'end' ? 0 : 0.5,
                transitionDelay: `${delay}ms`,
                transitionDuration: '700ms',
              }}
            />
          );
        })}
      </div>

      {/* Soft central glow instead of harsh flash */}
      <div 
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700 ease-in-out",
          "bg-gradient-radial from-white/40 via-primary/10 to-transparent blur-xl",
          phase === 'start' && "w-32 h-32 opacity-60",
          phase === 'peak' && "w-[200vw] h-[200vw] opacity-50",
          phase === 'end' && "w-[250vw] h-[250vw] opacity-0"
        )}
      />

      {/* Subtle vignette overlay */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-1000 ease-in-out",
          "bg-gradient-radial from-transparent via-background/20 to-background/60",
          phase === 'peak' ? "opacity-80" : "opacity-0"
        )}
      />

      {/* Very subtle white overlay instead of harsh flash */}
      <div 
        className={cn(
          "absolute inset-0 bg-white/5 transition-opacity duration-500 ease-in-out",
          phase === 'peak' ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}