/**
 * EnvironmentBeatBubble
 *
 * Renders environment/world beats distinctly from narrator prose and NPC dialogue.
 * Uses a muted, atmospheric style — no speaker icon, no label, just environment text.
 */

import { Wind } from 'lucide-react';
import ChatBoxTheme from '@/components/battles/ChatBoxTheme';
import type { EnvironmentTag } from '@/lib/theme-engine';

interface EnvironmentBeatBubbleProps {
  content: string;
  tags?: EnvironmentTag[];
  location?: string | null;
  beatType?: 'environment' | 'consequence' | 'hook';
}

export default function EnvironmentBeatBubble({
  content,
  tags,
  location,
  beatType = 'environment',
}: EnvironmentBeatBubbleProps) {
  const isConsequence = beatType === 'consequence';
  const isHook = beatType === 'hook';

  return (
    <ChatBoxTheme location={location} tags={tags} className="mx-2 rounded-lg">
      <div className={[
        'px-3 py-2.5 rounded-lg border-l-2',
        isConsequence
          ? 'bg-destructive/5 border-destructive/30 text-destructive-foreground/80'
          : isHook
            ? 'bg-accent/8 border-accent/40 text-accent-foreground/80'
            : 'bg-muted/40 border-muted-foreground/20 text-muted-foreground',
      ].join(' ')}>
        <div className="flex items-start gap-2">
          <Wind className={[
            'w-3.5 h-3.5 mt-0.5 shrink-0',
            isConsequence ? 'text-destructive/50' : isHook ? 'text-accent/60' : 'text-muted-foreground/50',
          ].join(' ')} />
          <p className="text-xs leading-relaxed italic whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </ChatBoxTheme>
  );
}
