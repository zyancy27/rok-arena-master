import { Badge } from '@/components/ui/badge';
import type { HitDetectionResult } from '@/lib/battle-hit-detection';

interface HitDetectionBadgeProps {
  result: HitDetectionResult;
}

export default function HitDetectionBadge({ result }: HitDetectionBadgeProps) {
  if (!result.shouldTriggerHitCheck) return null;

  return (
    <Badge
      variant="outline"
      className="text-[10px] gap-1 px-1.5 py-0 text-orange-400 border-orange-400/40"
    >
      🎯 Hit Check → {result.intent === 'grapple' ? 'Grapple' : result.isRanged ? 'Ranged' : 'Melee'}
    </Badge>
  );
}
