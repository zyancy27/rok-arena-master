import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Scale, Heart } from 'lucide-react';

interface MatchupWarningProps {
  playerTier: number;
  opponentTier: number;
  playerName: string;
  opponentName: string;
}

export default function MatchupWarning({
  playerTier,
  opponentTier,
  playerName,
  opponentName,
}: MatchupWarningProps) {
  const tierGap = Math.abs(playerTier - opponentTier);
  
  if (tierGap < 2) return null;

  const isPlayerStronger = playerTier > opponentTier;
  const weakerName = isPlayerStronger ? opponentName : playerName;
  const strongerName = isPlayerStronger ? playerName : opponentName;
  const weakerTier = isPlayerStronger ? opponentTier : playerTier;
  const strongerTier = isPlayerStronger ? playerTier : opponentTier;

  return (
    <Alert className="bg-purple-500/10 border-purple-500/30">
      <Scale className="h-4 w-4 text-purple-400" />
      <AlertTitle className="text-purple-300 flex items-center gap-2">
        Uneven Matchup
        <span className="text-xs font-normal text-muted-foreground">
          ({tierGap} tier difference)
        </span>
      </AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          <span className="text-purple-300">{weakerName}</span> (Tier {weakerTier}) vs{' '}
          <span className="text-purple-300">{strongerName}</span> (Tier {strongerTier})
        </p>
        
        <div className="bg-background/30 p-3 rounded-lg space-y-2">
          <p className="flex items-start gap-2">
            <Heart className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-foreground">Remember:</strong> The goal isn't always to defeat your opponent—it's to see how your character <em>adapts</em> to challenging situations.
            </span>
          </p>
          
          <p className="text-muted-foreground">
            Sometimes your character bites off more than they can chew. Your goal is to show just how <span className="text-purple-300">creative</span>, cool (or uncool!) your character can be in these moments. This builds organic, dynamic stories.
          </p>
        </div>
        
        <p className="flex items-center gap-2 text-xs text-muted-foreground italic">
          <Info className="w-3 h-3" />
          Don't take a "loss" too seriously. The best stories come from adversity!
        </p>
      </AlertDescription>
    </Alert>
  );
}
