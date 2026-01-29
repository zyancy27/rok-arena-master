import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Swords, Clock } from 'lucide-react';

interface TurnIndicatorProps {
  isUserTurn: boolean;
  userName: string;
  opponentName: string;
  userColor?: string;
  opponentColor?: string;
  className?: string;
}

/**
 * Visual banner showing whose turn it is in battle
 */
export default function TurnIndicator({
  isUserTurn,
  userName,
  opponentName,
  userColor = '#8B5CF6',
  opponentColor = '#EF4444',
  className,
}: TurnIndicatorProps) {
  const activeName = isUserTurn ? userName : opponentName;
  const activeColor = isUserTurn ? userColor : opponentColor;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg p-3 transition-all duration-500',
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${activeColor}15 0%, ${activeColor}05 100%)`,
        borderColor: `${activeColor}40`,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* Animated glow effect */}
      <div
        className="absolute inset-0 opacity-30 animate-pulse"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${activeColor}30 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse"
            style={{ backgroundColor: `${activeColor}20` }}
          >
            <Swords
              className="w-5 h-5"
              style={{ color: activeColor }}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Current Turn
            </p>
            <p
              className="font-bold text-lg"
              style={{ color: activeColor }}
            >
              {activeName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUserTurn ? (
            <Badge
              className="animate-bounce-subtle"
              style={{
                backgroundColor: `${activeColor}20`,
                color: activeColor,
                borderColor: `${activeColor}40`,
              }}
            >
              Your Move!
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="flex items-center gap-1"
              style={{ borderColor: `${activeColor}40`, color: activeColor }}
            >
              <Clock className="w-3 h-3" />
              Waiting...
            </Badge>
          )}
        </div>
      </div>

      {/* Turn transition indicator dots */}
      <div className="flex justify-center gap-2 mt-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            isUserTurn ? 'scale-125' : 'scale-75 opacity-50'
          )}
          style={{ backgroundColor: userColor }}
        />
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            !isUserTurn ? 'scale-125' : 'scale-75 opacity-50'
          )}
          style={{ backgroundColor: opponentColor }}
        />
      </div>
    </div>
  );
}
