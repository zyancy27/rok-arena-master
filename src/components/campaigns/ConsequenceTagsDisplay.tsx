/**
 * Consequence Tags Display
 *
 * Small post-message state tags like:
 * - Noise +1
 * - Suspicion Raised
 * - Reputation +1
 * - Stress +1
 * - Position Improved
 *
 * Used inline after campaign messages to show mechanical consequences.
 */

import { Badge } from '@/components/ui/badge';

export interface ConsequenceTag {
  label: string;
  variant: 'positive' | 'negative' | 'neutral';
}

interface ConsequenceTagsDisplayProps {
  tags: ConsequenceTag[];
}

const VARIANT_CLASSES: Record<string, string> = {
  positive: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
  negative: 'border-red-500/30 text-red-400 bg-red-500/5',
  neutral: 'border-muted-foreground/20 text-muted-foreground bg-muted/5',
};

export default function ConsequenceTagsDisplay({ tags }: ConsequenceTagsDisplayProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center text-[10px] px-1.5 py-0 rounded-full border ${VARIANT_CLASSES[tag.variant] || VARIANT_CLASSES.neutral}`}
        >
          {tag.variant === 'positive' && '↑ '}
          {tag.variant === 'negative' && '↓ '}
          {tag.label}
        </span>
      ))}
    </div>
  );
}
