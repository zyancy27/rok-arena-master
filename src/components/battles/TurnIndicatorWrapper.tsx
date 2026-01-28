import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TurnIndicatorWrapperProps {
  children: ReactNode;
  isUserTurn: boolean;
  userColor?: string;
  opponentColor?: string;
  className?: string;
}

/**
 * Wraps battle message areas with a dynamic water drop ripple effect
 * that changes color based on whose turn it is.
 */
export default function TurnIndicatorWrapper({
  children,
  isUserTurn,
  userColor = '#8B5CF6', // Default purple
  opponentColor = '#EF4444', // Default red for opponent
  className,
}: TurnIndicatorWrapperProps) {
  const [rippleKey, setRippleKey] = useState(0);
  const [prevIsUserTurn, setPrevIsUserTurn] = useState(isUserTurn);

  // Trigger ripple animation when turn changes
  useEffect(() => {
    if (prevIsUserTurn !== isUserTurn) {
      setRippleKey(prev => prev + 1);
      setPrevIsUserTurn(isUserTurn);
    }
  }, [isUserTurn, prevIsUserTurn]);

  const activeColor = isUserTurn ? userColor : opponentColor;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg transition-all duration-500',
        className
      )}
      style={{
        '--turn-color': activeColor,
        '--turn-color-soft': `${activeColor}20`,
        '--turn-color-medium': `${activeColor}40`,
      } as React.CSSProperties}
    >
      {/* Water drop ripple effect */}
      <div
        key={rippleKey}
        className="absolute inset-0 pointer-events-none z-0"
        aria-hidden="true"
      >
        {/* Multiple ripple rings for water effect */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ripple-1"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${activeColor}60 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ripple-2"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${activeColor}40 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ripple-3"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${activeColor}20 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Ambient glow border that persists after ripple */}
      <div
        className="absolute inset-0 pointer-events-none z-0 rounded-lg transition-all duration-700"
        style={{
          boxShadow: `inset 0 0 30px ${activeColor}15, 0 0 20px ${activeColor}10`,
          borderColor: `${activeColor}30`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
