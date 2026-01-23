import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface WarpTransitionProps {
  isActive: boolean;
  direction: 'in' | 'out'; // 'in' = zooming into system, 'out' = zooming out to galaxy
  onTransitionEnd?: () => void;
}

export default function WarpTransition({ isActive, direction, onTransitionEnd }: WarpTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'start' | 'peak' | 'end'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('start');
      
      // Peak of the warp effect
      const peakTimer = setTimeout(() => {
        setPhase('peak');
      }, 300);
      
      // Fade out
      const endTimer = setTimeout(() => {
        setPhase('end');
        onTransitionEnd?.();
      }, 600);
      
      // Reset
      const resetTimer = setTimeout(() => {
        setPhase('idle');
      }, 1000);
      
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
      {/* Radial warp lines */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-300",
          phase === 'start' && "opacity-100",
          phase === 'peak' && "opacity-100",
          phase === 'end' && "opacity-0"
        )}
      >
        {/* Star streak lines */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 360;
          const delay = Math.random() * 100;
          return (
            <div
              key={i}
              className={cn(
                "absolute left-1/2 top-1/2 h-[2px] origin-left transition-all",
                direction === 'out' ? "bg-gradient-to-r from-white via-primary/50 to-transparent" : "bg-gradient-to-r from-transparent via-primary/50 to-white"
              )}
              style={{
                transform: `rotate(${angle}deg)`,
                width: phase === 'peak' ? '150vw' : phase === 'start' ? '20vw' : '0',
                opacity: phase === 'end' ? 0 : 0.8,
                transitionDelay: `${delay}ms`,
                transitionDuration: '400ms',
              }}
            />
          );
        })}
      </div>

      {/* Central flash */}
      <div 
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300",
          "bg-gradient-radial from-white via-primary/30 to-transparent",
          phase === 'start' && "w-4 h-4 opacity-100",
          phase === 'peak' && "w-[300vw] h-[300vw] opacity-80",
          phase === 'end' && "w-[400vw] h-[400vw] opacity-0"
        )}
      />

      {/* Vignette overlay */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          "bg-gradient-radial from-transparent via-transparent to-background",
          phase === 'peak' ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Flash overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-white transition-opacity duration-200",
          phase === 'peak' ? "opacity-30" : "opacity-0"
        )}
      />
    </div>
  );
}
