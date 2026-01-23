import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getTierName } from '@/lib/game-constants';

interface TierWarningProps {
  attackerTier: number;
  defenderTier: number;
  attackerName: string;
  defenderName: string;
}

export default function TierWarning({ 
  attackerTier, 
  defenderTier, 
  attackerName, 
  defenderName 
}: TierWarningProps) {
  const tierDiff = Math.abs(attackerTier - defenderTier);
  
  if (tierDiff === 0) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-400">Fair Match</AlertTitle>
        <AlertDescription className="text-green-300/80">
          Both characters are {getTierName(attackerTier)} (Tier {attackerTier}). This should be an evenly matched battle!
        </AlertDescription>
      </Alert>
    );
  }
  
  if (tierDiff === 1) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <Info className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-400">Slight Tier Difference</AlertTitle>
        <AlertDescription className="text-yellow-300/80">
          <strong>{attackerName}</strong> ({getTierName(attackerTier)}) vs <strong>{defenderName}</strong> ({getTierName(defenderTier)}).
          The higher tier has an advantage, but skill can overcome!
        </AlertDescription>
      </Alert>
    );
  }
  
  if (tierDiff <= 3) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertTitle className="text-orange-400">Significant Tier Gap</AlertTitle>
        <AlertDescription className="text-orange-300/80">
          <strong>{attackerName}</strong> (Tier {attackerTier}: {getTierName(attackerTier)}) vs <strong>{defenderName}</strong> (Tier {defenderTier}: {getTierName(defenderTier)}).
          The {attackerTier > defenderTier ? 'challenger' : 'defender'} has a notable power advantage. Consider the R.O.K. tier hierarchy!
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Extreme Tier Mismatch</AlertTitle>
      <AlertDescription>
        <strong>{attackerName}</strong> (Tier {attackerTier}: {getTierName(attackerTier)}) vs <strong>{defenderName}</strong> (Tier {defenderTier}: {getTierName(defenderTier)}).
        This is a {tierDiff}-tier gap! According to R.O.K. rules, higher tiers can freely annihilate lower tiers. Proceed only if you understand the consequences.
      </AlertDescription>
    </Alert>
  );
}
