/**
 * Cinematic Frame — Brief highlight overlay for dramatic battlefield moments
 */

import { memo, useEffect, useState } from 'react';
import type { CinematicFrame as CinematicFrameType } from '@/lib/narrator-markers';

interface CinematicFrameOverlayProps {
  frame: CinematicFrameType | null;
}

const EMPHASIS_STYLES: Record<string, string> = {
  impact: 'border-red-500/50 bg-red-500/5',
  danger: 'border-amber-500/50 bg-amber-500/5',
  shift: 'border-blue-500/50 bg-blue-500/5',
  reveal: 'border-emerald-500/50 bg-emerald-500/5',
};

const EMPHASIS_ICONS: Record<string, string> = {
  impact: '💥',
  danger: '⚠️',
  shift: '🌀',
  reveal: '🔍',
};

function CinematicFrameOverlayInner({ frame }: CinematicFrameOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (frame) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), frame.duration);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [frame?.id]);

  if (!frame || !visible) return null;

  return (
    <div className={`absolute top-12 left-3 right-3 z-20 rounded-lg border-2 p-2.5 transition-all duration-300 animate-in fade-in zoom-in-95 ${
      EMPHASIS_STYLES[frame.emphasis] || EMPHASIS_STYLES.shift
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{EMPHASIS_ICONS[frame.emphasis] || '⚡'}</span>
        <div>
          <p className="text-xs font-semibold text-foreground">{frame.title}</p>
          <p className="text-[10px] text-muted-foreground">{frame.description}</p>
        </div>
      </div>
    </div>
  );
}

export const CinematicFrameOverlay = memo(CinematicFrameOverlayInner);
