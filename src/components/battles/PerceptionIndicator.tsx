import { Badge } from '@/components/ui/badge';
import type { PerceptionResult, PerceptionLevel, ProcessingLevel } from '@/lib/battle-perception';

const PERCEPTION_STYLES: Record<PerceptionLevel, string> = {
  detected: 'text-green-400 border-green-400/40',
  partial: 'text-yellow-400 border-yellow-400/40',
  undetected: 'text-red-400 border-red-400/40',
};

const PROCESSING_STYLES: Record<ProcessingLevel, string> = {
  understood: 'text-green-400',
  misread: 'text-yellow-400',
  delayed: 'text-red-400',
};

interface PerceptionIndicatorProps {
  result: PerceptionResult;
}

export default function PerceptionIndicator({ result }: PerceptionIndicatorProps) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] gap-1 px-1.5 py-0 ${PERCEPTION_STYLES[result.perception]}`}
    >
      {result.label}
    </Badge>
  );
}
